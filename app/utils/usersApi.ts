// The user management page's calls to /users (Backend-SPEC §4.1)
import { api } from './api';
import type { Role } from './session';
import { toManagedUser, type ApiUser, type ManagedUser } from './users';

export async function fetchUsers(): Promise<ManagedUser[]> {
  return (await api<ApiUser[]>('/users')).map(toManagedUser);
}

// The password the admin gives is a temporary one: it has to be changed on first login
export async function createUser(account: string, name: string, role: Role, password: string): Promise<ManagedUser> {
  return toManagedUser(await api<ApiUser>('/users', { method: 'POST', body: { username: account, name, role, password } }));
}

export async function changeRole(id: string, role: Role): Promise<ManagedUser> {
  return toManagedUser(await api<ApiUser>(`/users/${id}/role`, { method: 'PATCH', body: { role } }));
}

// A new password the admin gives, temporary as well: it has to be changed on the next login
export async function setUserPassword(id: string, password: string): Promise<void> {
  await api(`/users/${id}/password`, { method: 'PATCH', body: { password } });
}

export async function deleteUser(id: string): Promise<void> {
  await api(`/users/${id}`, { method: 'DELETE' });
}
