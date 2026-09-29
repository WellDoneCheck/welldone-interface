import type { ManagedUser, UserRole } from '../data/users';

export type RoleFilter = UserRole | 'all';

const ACCOUNT_PATTERN = /^[a-z0-9._-]{3,32}$/;

// Users of the chosen role whose account or name contains the query (ignoring case and surrounding spaces)
export function filterUsers(users: ManagedUser[], query: string, role: RoleFilter): ManagedUser[] {
  const needle = query.trim().toLowerCase();
  return users.filter(
    (user) =>
      (role === 'all' || user.role === role) &&
      (!needle || user.account.toLowerCase().includes(needle) || user.name.toLowerCase().includes(needle)),
  );
}

export function countRoles(users: ManagedUser[]): Record<RoleFilter, number> {
  const admin = users.filter((user) => user.role === 'admin').length;
  return { all: users.length, admin, user: users.length - admin };
}

// The only admin can be neither deleted nor made a regular user, or nobody could manage users any more
export function isLastAdmin(users: ManagedUser[], account: string): boolean {
  const user = users.find((candidate) => candidate.account === account);
  return user?.role === 'admin' && countRoles(users).admin === 1;
}

// Why a new account name cannot be used, or null if it can
export function accountError(account: string, users: ManagedUser[]): string | null {
  const value = account.trim();
  if (!value) return '請輸入帳號';
  if (!ACCOUNT_PATTERN.test(value)) return '帳號需為 3–32 個小寫英文、數字或 . _ -';
  if (users.some((user) => user.account === value)) return '這個帳號已經存在';
  return null;
}

export const MIN_PASSWORD_LENGTH = 8;

// Why a new password cannot be set, or null if it can (same rule as the change-password page: 8+ characters,
// letters and digits mixed)
export function passwordError(password: string, confirmation: string): string | null {
  if (!password) return '請輸入新密碼';
  if (password.length < MIN_PASSWORD_LENGTH) return `密碼至少 ${MIN_PASSWORD_LENGTH} 碼`;
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return '密碼需同時包含英文字母與數字';
  if (password !== confirmation) return '兩次輸入的密碼不一致';
  return null;
}
