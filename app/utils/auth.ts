// Logging in and changing one's own password (Backend-SPEC §2).
import { api } from './api';
import { startSession, type Session } from './session';

// Logs in and keeps the token; throws ApiError (401 帳號或密碼錯誤) when the account or password is wrong
export async function logIn(username: string, password: string): Promise<Session | null> {
  const { access_token } = await api<{ access_token: string }>('/auth/login', { method: 'POST', body: { username, password } });
  return startSession(access_token);
}

// The token still says the old password was the default one (§2.6), so logs in again with the new password.
// A wrong current password is a 401 that keeps the user logged in.
export async function changePassword(username: string, currentPassword: string, newPassword: string): Promise<void> {
  await api('/users/me/password', { method: 'PATCH', body: { currentPassword, newPassword }, keepSessionOn401: true });
  await logIn(username, newPassword);
}
