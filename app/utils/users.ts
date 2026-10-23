// Accounts on the user management page, and who may do what to them (Backend-SPEC §3, §4.1): only root creates
// accounts; root and admin manage the others, but only root manages admins, and nobody manages root.
import type { Role } from './session';
import { taipeiDateTime } from './taipeiTime';

// An account as the backend sends it (GET /users)
export interface ApiUser {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  is_default_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagedUser {
  id: string;
  account: string;
  // '' when the account has no display name
  name: string;
  role: Role;
  // 'YYYY-MM-DD HH:mm', Taipei time
  registeredAt: string;
  // null if the user has never signed in
  lastActiveAt: string | null;
}

export function toManagedUser(user: ApiUser): ManagedUser {
  return {
    id: user.id,
    account: user.username,
    name: user.name ?? '',
    role: user.role,
    registeredAt: taipeiDateTime(user.created_at),
    lastActiveAt: user.last_login_at ? taipeiDateTime(user.last_login_at) : null,
  };
}

export const ROLE_LABELS: Record<Role, string> = { root: '最高管理員', admin: '管理員', operator: '操作員', viewer: '檢視者' };

// The tabs above the list; root counts as an admin there
export type RoleFilter = Exclude<Role, 'root'> | 'all';

const matchesRole = (role: Role, filter: RoleFilter) => filter === 'all' || role === filter || (filter === 'admin' && role === 'root');

// Users of the chosen role whose account or name contains the query (ignoring case and surrounding spaces)
export function filterUsers(users: ManagedUser[], query: string, filter: RoleFilter): ManagedUser[] {
  const needle = query.trim().toLowerCase();
  return users.filter(
    (user) =>
      matchesRole(user.role, filter) &&
      (!needle || user.account.toLowerCase().includes(needle) || user.name.toLowerCase().includes(needle)),
  );
}

export function countRoles(users: ManagedUser[]): Record<RoleFilter, number> {
  const count = (filter: RoleFilter) => users.filter((user) => matchesRole(user.role, filter)).length;
  return { all: users.length, admin: count('admin'), operator: count('operator'), viewer: count('viewer') };
}

export const canManageUsers = (actor: Role) => actor === 'root' || actor === 'admin';
export const canCreateUsers = (actor: Role) => actor === 'root';

// Whether the actor may change the target's role, reset their password or delete them
export function canManage(actor: Role, target: Role): boolean {
  if (target === 'root') return false;
  if (target === 'admin') return actor === 'root';
  return canManageUsers(actor);
}

// The roles the actor may give someone (nobody can make a root)
export function assignableRoles(actor: Role): Role[] {
  return actor === 'root' ? ['admin', 'operator', 'viewer'] : ['operator', 'viewer'];
}

const ACCOUNT_PATTERN = /^[a-z0-9._-]{3,32}$/;

// Why a new account name cannot be used, or null if it can
export function accountError(account: string, users: ManagedUser[]): string | null {
  const value = account.trim();
  if (!value) return '請輸入帳號';
  if (!ACCOUNT_PATTERN.test(value)) return '帳號需為 3–32 個小寫英文、數字或 . _ -';
  if (users.some((user) => user.account === value)) return '這個帳號已經存在';
  return null;
}

export const MIN_PASSWORD_LENGTH = 8;

// Why a new password cannot be set, or null if it can (the backend's rule: 8+ characters, letters and digits mixed)
export function passwordError(password: string, confirmation: string): string | null {
  if (!password) return '請輸入新密碼';
  if (password.length < MIN_PASSWORD_LENGTH) return `密碼至少 ${MIN_PASSWORD_LENGTH} 碼`;
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return '密碼需同時包含英文字母與數字';
  if (password !== confirmation) return '兩次輸入的密碼不一致';
  return null;
}
