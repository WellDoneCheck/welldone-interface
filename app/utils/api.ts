// Calls to the backend (Backend-SPEC.md), straight from the browser: its address is NEXT_PUBLIC_API_URL, and the
// logged in user's token goes with every call. A 401 means the token is missing or has expired, so the user is logged
// out, except where the call says otherwise (changing the password answers 401 to a wrong current password).
import { clearSession, getSession } from './session';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const NETWORK_ERROR = '無法連線到伺服器';
const STALL_ERROR = '連線逾時，請重試';
// a send that puts no more bytes on the wire for this long has stalled (a dead connection may never fire onerror)
const UPLOAD_STALL_MS = 30000;
// A success that is not JSON (e.g. a web page) comes from something other than the backend
const NOT_BACKEND_ERROR = `伺服器回應的不是 API 資料，請確認 NEXT_PUBLIC_API_URL（${API_URL}）指向後端`;

export class ApiError extends Error {
  // the HTTP status; 0 when the backend could not be reached
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  // sent as JSON, or as is when it is a form (file uploads)
  body?: unknown;
  cache?: RequestCache;
  keepSessionOn401?: boolean;
}

// The backend's error message: a string, or a list of them when validation fails (§1.1)
export function errorMessage(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join('、');
  return typeof message === 'string' && message ? message : fallback;
}

const NOT_JSON = Symbol('not JSON');

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return NOT_JSON;
  }
}

function buildRequest({ method = 'GET', body, cache }: ApiOptions): RequestInit {
  const headers: Record<string, string> = {};
  const token = getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  return { method, headers, cache, body: body === undefined || isForm ? (body as FormData | undefined) : JSON.stringify(body) };
}

// The answer's JSON (undefined when it has none, e.g. 204); throws ApiError when the call failed
function readAnswer<T>(status: number, text: string, keepSessionOn401 = false): T {
  const body = parseJson(text);
  const ok = status >= 200 && status < 300;
  if (ok && body === NOT_JSON) throw new ApiError(status, NOT_BACKEND_ERROR);
  if (ok) return body as T;
  if (status === 401 && !keepSessionOn401) clearSession();
  throw new ApiError(status, errorMessage(body, `請求失敗（${status}）`));
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_URL + path, buildRequest(options));
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }
  return readAnswer<T>(response.status, await response.text(), options.keepSessionOn401);
}

// Posts a form, reporting how much of it has gone up: the percent (0–100) and the real bytes sent so far and in total,
// as the browser puts them on the wire. XMLHttpRequest, as fetch cannot report upload progress.
function sendForm<T>(path: string, form: FormData, onProgress?: (percent: number, loaded: number, total: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', API_URL + path);
    const token = getSession()?.token;
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);

    // abort a send that stalls, and surface it as a reachable-but-stalled error; the watch is dropped once the body is
    // fully on the wire, so a slow (but still progressing) upload or a server that takes a while to answer is not cut off
    let stall: ReturnType<typeof setTimeout> | undefined;
    const watchStall = () => {
      clearTimeout(stall);
      stall = setTimeout(() => request.abort(), UPLOAD_STALL_MS);
    };
    const stopStall = () => clearTimeout(stall);

    request.upload.onprogress = (event) => {
      watchStall();
      if (onProgress && event.lengthComputable) onProgress((event.loaded / event.total) * 100, event.loaded, event.total);
    };
    request.upload.onloadend = stopStall;
    request.onload = () => {
      stopStall();
      try {
        resolve(readAnswer<T>(request.status, request.responseText));
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => {
      stopStall();
      reject(new ApiError(0, NETWORK_ERROR));
    };
    request.onabort = () => {
      stopStall();
      reject(new ApiError(0, STALL_ERROR));
    };
    watchStall();
    request.send(form);
  });
}

// Sends a whole file as the form field `file` in one request.
export function uploadFile<T>(path: string, file: File, onProgress: (percent: number, loaded: number, total: number) => void): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  return sendForm<T>(path, form, onProgress);
}

// Sends one chunk of a resumable upload (§ chunked upload), reporting the bytes of this chunk sent so far.
export function uploadChunk(path: string, chunk: Blob, fields: { uploadId: string; chunkIndex: number; totalChunks: number }, onLoaded: (loaded: number) => void): Promise<void> {
  const form = new FormData();
  form.append('file', chunk);
  form.append('uploadId', fields.uploadId);
  form.append('chunkIndex', String(fields.chunkIndex));
  form.append('totalChunks', String(fields.totalChunks));
  return sendForm<void>(path, form, (_percent, loaded) => onLoaded(loaded));
}

// The full address of a backend file with the token in it, for <img> and download links that cannot send headers (§2.3)
export function fileUrl(path: string): string {
  const token = getSession()?.token;
  if (!token) return API_URL + path;
  const separator = path.includes('?') ? '&' : '?';
  return `${API_URL}${path}${separator}token=${encodeURIComponent(token)}`;
}
