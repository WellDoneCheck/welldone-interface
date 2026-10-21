// Calls to the backend (Backend-SPEC.md), straight from the browser: its address is NEXT_PUBLIC_API_URL, and the
// logged in user's token goes with every call. A 401 means the token is missing or has expired, so the user is logged
// out, except where the call says otherwise (changing the password answers 401 to a wrong current password).
import { clearSession, getSession } from './session';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const NETWORK_ERROR = '無法連線到伺服器';
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

// Sends a file as the form field `file`, reporting how much of it has gone (0–100). XMLHttpRequest, as fetch cannot
// report upload progress.
export function uploadFile<T>(path: string, file: File, onProgress: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', API_URL + path);
    const token = getSession()?.token;
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress((event.loaded / event.total) * 100);
    request.onload = () => {
      try {
        resolve(readAnswer<T>(request.status, request.responseText));
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(new ApiError(0, NETWORK_ERROR));
    const form = new FormData();
    form.append('file', file);
    request.send(form);
  });
}

// The full address of a backend file with the token in it, for <img> and download links that cannot send headers (§2.3)
export function fileUrl(path: string): string {
  const token = getSession()?.token;
  if (!token) return API_URL + path;
  const separator = path.includes('?') ? '&' : '?';
  return `${API_URL}${path}${separator}token=${encodeURIComponent(token)}`;
}
