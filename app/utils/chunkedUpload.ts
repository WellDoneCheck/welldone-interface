// Resumable chunked upload (backend §分片上傳): a file is split into fixed-size chunks sent one at a time
// (POST /tasks/upload/chunk); chunks the server already holds are skipped (GET …/status), so an upload broken off
// part way resumes instead of starting over. Once every chunk is in, the parts are merged into one task
// (POST …/complete). The backend caps a single chunk at 50 MiB.
import { ApiError, api, uploadChunk } from './api';
import type { Task } from './tasks';

// 16 MiB: well under the backend's 50 MiB chunk limit, few enough requests for a multi-GB image
export const CHUNK_SIZE = 16 * 1024 * 1024;
// a chunk that keeps failing is given up on after this many tries, waiting a little longer before each retry
const CHUNK_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Whether a failed request is worth retrying: a network error (status 0), a server error (5xx), or a 408/429 is
// transient; a client error (e.g. 400 bad chunk, 401 expired token, 413 too large) would fail the same way, so it is
// given up at once. A non-ApiError (unexpected) is retried, in case it was a passing glitch.
export function retryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  if (error.status === 0 || error.status === 408 || error.status === 429) return true;
  return error.status >= 500;
}

// GET /tasks/upload/status/:uploadId
export interface UploadStatus {
  uploadId: string;
  filename: string;
  totalChunks: number;
  // indices (0-based) the server already has
  uploadedChunks: number[];
  completed: boolean;
}

// How many chunks a file of this size splits into (at least one, even for an empty file)
export function chunkCount(totalSize: number, chunkSize = CHUNK_SIZE): number {
  return Math.max(1, Math.ceil(totalSize / chunkSize));
}

// The [start, end) byte range of chunk `index`, clamped to the file's end
export function chunkRange(index: number, totalSize: number, chunkSize = CHUNK_SIZE): [number, number] {
  const start = Math.min(index * chunkSize, totalSize);
  return [start, Math.min(start + chunkSize, totalSize)];
}

// The size in bytes of chunk `index`
export function chunkBytes(index: number, totalSize: number, chunkSize = CHUNK_SIZE): number {
  const [start, end] = chunkRange(index, totalSize, chunkSize);
  return end - start;
}

// The chunk indices still to send, given the ones the server already has (for resuming)
export function remainingChunks(totalChunks: number, uploadedChunks: number[]): number[] {
  const have = new Set(uploadedChunks);
  const todo: number[] = [];
  for (let index = 0; index < totalChunks; index += 1) {
    if (!have.has(index)) todo.push(index);
  }
  return todo;
}

// The bytes already on the server, from the chunks it holds
export function sentBytes(uploadedChunks: number[], totalSize: number, chunkSize = CHUNK_SIZE): number {
  return uploadedChunks.reduce((sum, index) => sum + chunkBytes(index, totalSize, chunkSize), 0);
}

interface UploadHandlers {
  // the uploadId as soon as it is known, so a later retry can resume the same upload
  onUploadId?: (uploadId: string) => void;
  // the file's total bytes sent so far (server-held chunks plus the one in flight)
  onProgress: (sent: number) => void;
  // every chunk is in; the backend is now merging them into the final file (the bytes are all sent, so progress sits
  // at 100% while this runs — the UI shows it as merging rather than still uploading)
  onMerging?: () => void;
}

// Sends one chunk, retrying a few times before giving up (the server keeps the chunks it did receive)
async function sendChunk(uploadId: string, index: number, chunk: Blob, totalChunks: number, onLoaded: (loaded: number) => void): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await uploadChunk('/tasks/upload/chunk', chunk, { uploadId, chunkIndex: index, totalChunks }, onLoaded);
      return;
    } catch (error) {
      if (attempt >= CHUNK_RETRIES || !retryable(error)) throw error;
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
}

// Uploads a file in chunks, resuming `resumeId` if one is given, and returns the task the backend creates.
export async function uploadInChunks(file: File, handlers: UploadHandlers, resumeId?: string, chunkSize = CHUNK_SIZE): Promise<Task> {
  const totalChunks = chunkCount(file.size, chunkSize);

  const uploadId = resumeId ?? (await api<{ uploadId: string }>('/tasks/upload/init', {
    method: 'POST',
    body: { filename: file.name, totalSize: file.size, chunkSize },
  })).uploadId;
  handlers.onUploadId?.(uploadId);

  const status = await api<UploadStatus>(`/tasks/upload/status/${uploadId}`);
  const todo = remainingChunks(totalChunks, status.uploadedChunks);

  let done = sentBytes(status.uploadedChunks, file.size, chunkSize);
  handlers.onProgress(done);
  for (const index of todo) {
    const [start, end] = chunkRange(index, file.size, chunkSize);
    const base = done;
    await sendChunk(uploadId, index, file.slice(start, end), totalChunks, (loaded) => handlers.onProgress(base + loaded));
    done += end - start;
    handlers.onProgress(done);
  }

  handlers.onMerging?.();
  return api<Task>('/tasks/upload/complete', { method: 'POST', body: { uploadId, totalChunks } });
}
