// Who is logged in: the backend's JWT, kept in localStorage so a reload stays logged in, and what it says about the
// user. The token is a snapshot taken at login (Backend-SPEC §2.2): role and isDefaultPassword only change by logging
// in again. It lasts 8 hours and there is no logout API; logging out is forgetting the token.
// Where storage is missing or blocked, the session lasts until the page is reloaded.

export type Role = 'root' | 'admin' | 'operator' | 'viewer';

export interface Session {
  token: string;
  userId: string;
  username: string;
  role: Role;
  isDefaultPassword: boolean;
  // epoch ms
  expiresAt: number;
}

interface TokenPayload {
  sub: string;
  username: string;
  role: Role;
  isDefaultPassword: boolean;
  exp: number;
}

const STORAGE_KEY = 'skywell:token';

let session: Session | null | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function decodePayload(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as TokenPayload;
  } catch {
    return null;
  }
}

// What the token says, or null if it is malformed or has expired
export function decodeSession(token: string, now = Date.now()): Session | null {
  const payload = decodePayload(token);
  if (!payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return null;
  return {
    token,
    userId: payload.sub,
    username: payload.username,
    role: payload.role,
    isDefaultPassword: payload.isDefaultPassword,
    expiresAt: payload.exp * 1000,
  };
}

function load(now: number): Session | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    return token ? decodeSession(token, now) : null;
  } catch {
    return null;
  }
}

// The current session, or null when logged out or the token has expired
export function getSession(now = Date.now()): Session | null {
  session ??= load(now);
  if (session && session.expiresAt <= now) clearSession();
  return session;
}

// The server knows no session: pages render logged out there, then the browser fills in the user
export const getServerSession = (): Session | null => null;

export function startSession(token: string, now = Date.now()): Session | null {
  session = decodeSession(token, now);
  try {
    if (session) localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // storage blocked: the session lasts until the page is reloaded
  }
  notify();
  return session;
}

export function clearSession(): void {
  session = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: nothing was saved
  }
  notify();
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
