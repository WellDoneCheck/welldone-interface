// The user management page's calls to /users (Backend-SPEC §4.1)
import { api } from './api';
import type { Role } from './session';
import { toManagedUser, type ApiUser, type ManagedUser } from './users';

export async function fetchUsers(): Promise<ManagedUser[]> {
  return (await api<ApiUser[]>('/users')).map(toManagedUser);
}

// Without a password the account gets the default one (changeme), to be changed on first login
export async function createUser(account: string, name: string, role: Role): Promise<ManagedUser> {
  return toManagedUser(await api<ApiUser>('/users', { method: 'POST', body: { username: account, name, role } }));
}

export async function changeRole(id: string, role: Role): Promise<ManagedUser> {
  return toManagedUser(await api<ApiUser>(`/users/${id}/role`, { method: 'PATCH', body: { role } }));
}

// Back to the default password (changeme)
export async function resetPassword(id: string): Promise<void> {
  await api(`/users/${id}/reset-password`, { method: 'PATCH' });
}

export async function deleteUser(id: string): Promise<void> {
  await api(`/users/${id}`, { method: 'DELETE' });
}
