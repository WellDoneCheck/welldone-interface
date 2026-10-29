'use client';

import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import AccountSubPage from './AccountSubPage';
import type { Role } from '../utils/session';
import {
  accountError,
  assignableRoles,
  canCreateUsers,
  canManage,
  countRoles,
  filterUsers,
  ROLE_LABELS,
  type ManagedUser,
  type RoleFilter,
} from '../utils/users';
import { changeRole, createUser, deleteUser, fetchUsers, resetPassword } from '../utils/usersApi';

// Wider than the other account pages: the account panel widens for this page (see LoginPanel)
const CONTENT_WIDTH = 1100;
const COLUMNS = 'grid items-center gap-x-[20px]';
// The size an fs-<px> text is shown at (as in globals.css): it stops shrinking at --min-text, while the columns go on
const fs = (px: number) => `max(${px}px, var(--min-text, 0px))`;
// The role column fits the role picker (editing: three labels of three characters), the actions column the row's
// buttons and a confirmation (resetting a password), at whatever size their text is shown
const ROLE_COLUMN = `calc(9 * ${fs(20)} + 52px)`;
const ACTIONS_COLUMN = `max(290px, calc(8 * ${fs(22)} + 92px), calc(7 * ${fs(18)} + 4 * ${fs(22)} + 64px))`;
const GRID: CSSProperties = { gridTemplateColumns: `minmax(0, 1fr) ${ROLE_COLUMN} 140px 140px ${ACTIONS_COLUMN}` };
const ROW_HEIGHT = 96;
const VISIBLE_ROWS = 8;
// How long the confirmation above the list stays after an action
const NOTICE_MS = 4000;

const FILTERS: { role: RoleFilter; label: string }[] = [
  { role: 'all', label: '全部' },
  { role: 'admin', label: ROLE_LABELS.admin },
  { role: 'operator', label: ROLE_LABELS.operator },
  { role: 'viewer', label: ROLE_LABELS.viewer },
];

type RowAction = 'edit' | 'password' | 'delete';
type RowMode = { account: string; kind: RowAction } | null;
type Notice = { tone: 'success' | 'error'; text: string } | null;

const isAdminRole = (role: Role) => role === 'root' || role === 'admin';
const displayName = (user: ManagedUser) => user.name || user.account;

/* ─── Small parts ───────────────────────────────────────────────── */

function Avatar({ user }: { user: ManagedUser }) {
  const style = isAdminRole(user.role) ? 'bg-[#62A4A7] text-white' : 'bg-[#D1E6E7] text-[#3F7A7E]';
  return <span className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center fs-28 font-bold ${style}`}>{displayName(user)[0]}</span>;
}

function RolePill({ role }: { role: Role }) {
  const style = isAdminRole(role) ? 'bg-[#62A4A7] text-white' : 'bg-[#D1E6E7] text-[#3F7A7E]';
  return <span className={`inline-flex h-[40px] items-center px-[16px] fs-22 font-bold ${style}`}>{ROLE_LABELS[role]}</span>;
}

function RolePicker({ roles, value, onChange }: { roles: Role[]; value: Role; onChange: (role: Role) => void }) {
  return (
    <span className="inline-flex border-2 border-[#62A4A7]">
      {roles.map((role) => (
        <button
          key={role}
          type="button"
          aria-pressed={value === role}
          onClick={() => onChange(role)}
          className={`h-[40px] whitespace-nowrap px-[8px] fs-20 font-bold transition-colors ${value === role ? 'bg-[#62A4A7] text-white' : 'text-[#3F7A7E] hover:bg-[#D1E6E7]/60'}`}
        >
          {ROLE_LABELS[role]}
        </button>
      ))}
    </span>
  );
}

function TextButton({ children, tone = 'plain', disabled, title, onClick }: { children: ReactNode; tone?: 'plain' | 'primary' | 'danger'; disabled?: boolean; title?: string; onClick: () => void }) {
  const tones = {
    plain: 'text-[#3F7A7E] hover:bg-[#D1E6E7]/60',
    primary: 'bg-[#62A4A7] text-white hover:bg-[#54999D]',
    danger: 'text-[#98412F] hover:bg-[#F7E5DF]',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`h-[44px] shrink-0 whitespace-nowrap px-[14px] fs-22 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function DateTime({ value }: { value: string }) {
  const [date, time] = value.split(' ');
  return (
    <span className="flex flex-col">
      <span className="fs-22 font-bold text-[#2C322F]">{date.replaceAll('-', '/')}</span>
      <span className="fs-18 font-normal text-[#6F7468]">{time}</span>
    </span>
  );
}

/* ─── Toolbar ───────────────────────────────────────────────────── */

function RoleTabs({ counts, value, onChange }: { counts: Record<RoleFilter, number>; value: RoleFilter; onChange: (role: RoleFilter) => void }) {
  return (
    <div className="flex">
      {FILTERS.map(({ role, label }) => {
        const active = role === value;
        return (
          <button
            key={role}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(role)}
            className={`flex h-[64px] items-baseline gap-[10px] border-b-[4px] px-[22px] transition-colors ${
              active ? 'border-[#62A4A7] text-[#2C322F]' : 'border-transparent text-[#6F7468] hover:text-[#2C322F]'
            }`}
          >
            <span className="fs-26 font-bold">{label}</span>
            <span className={`fs-24 font-bold ${active ? 'text-[#3F7A7E]' : ''}`}>{counts[role]}</span>
          </button>
        );
      })}
    </div>
  );
}

// label: what is searched, as its placeholder and for screen readers
export function SearchBox({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-[60px] w-[380px] items-center gap-[12px] bg-[#EEF3F1] px-[18px] focus-within:shadow-[var(--shadow-focus)]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6F7468" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent fs-24 font-normal text-[#2C322F] outline-none placeholder:text-[#8A8E86]"
      />
    </label>
  );
}

/* ─── Add user ──────────────────────────────────────────────────── */

interface AddUserFormProps {
  users: ManagedUser[];
  roles: Role[];
  onAdd: (account: string, name: string, role: Role) => Promise<void>;
  onCancel: () => void;
}

// The new account gets the default password, to be changed on its first login
function AddUserForm({ users, roles, onAdd, onCancel }: AddUserFormProps) {
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = accountError(account, users) ?? (name.trim() ? null : '請輸入姓名');
    if (problem || submitting) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    try {
      await onAdd(account.trim(), name.trim(), role);
    } catch (failure) {
      setError((failure as Error).message);
      setSubmitting(false);
    }
  };

  const field = 'h-[56px] min-w-0 bg-white px-[16px] fs-24 font-normal text-[#2C322F] outline-none shadow-[inset_0_0_0_2px_#D1E6E7] focus:shadow-[inset_0_0_0_2px_#62A4A7]';

  return (
    <form onSubmit={submit} className="mt-[24px] flex flex-col gap-[14px] bg-[#EEF3F1] px-[24px] py-[20px]">
      <span className="fs-24 font-bold text-[#2C322F]">新增使用者</span>
      <div className="flex items-center gap-[14px]">
        <input autoFocus value={account} onChange={(event) => setAccount(event.target.value)} placeholder="帳號，例如 lin.xiaoming" aria-label="帳號" className={`${field} flex-[3]`} />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="姓名" aria-label="姓名" className={`${field} flex-[2]`} />
        <RolePicker roles={roles} value={role} onChange={setRole} />
      </div>
      <div className="flex items-center justify-between gap-[14px]">
        <span role="alert" className="fs-20 font-bold text-[#98412F]">{error}</span>
        <span className="flex gap-[8px]">
          <TextButton onClick={onCancel}>取消</TextButton>
          <button type="submit" disabled={submitting} className="h-[44px] bg-[#62A4A7] px-[20px] fs-22 font-bold text-white transition-colors hover:bg-[#54999D] disabled:cursor-wait disabled:opacity-60">
            {submitting ? '建立中…' : '建立'}
          </button>
        </span>
      </div>
    </form>
  );
}

/* ─── User row ──────────────────────────────────────────────────── */

interface UserRowProps {
  user: ManagedUser;
  mode: 'view' | RowAction;
  // the roles the viewer may give; null when they may not manage this user at all
  roles: Role[] | null;
  busy: boolean;
  onMode: (kind: RowAction | null) => void;
  onRoleChange: (role: Role) => void;
  onPasswordReset: () => void;
  onDelete: () => void;
}

// Asked before resetting a password or deleting, in place of the row's buttons
function Confirm({ question, action, busy, onCancel, onConfirm }: { question: string; action: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <span className="whitespace-nowrap fs-18 font-bold text-[#98412F]">{question}</span>
      <TextButton onClick={onCancel}>取消</TextButton>
      <button type="button" disabled={busy} onClick={onConfirm} className="h-[44px] shrink-0 whitespace-nowrap bg-[#BC5646] px-[14px] fs-22 font-bold text-white transition-colors hover:bg-[#A84A3B] disabled:cursor-wait disabled:opacity-60">
        {action}
      </button>
    </>
  );
}

function UserRow({ user, mode, roles, busy, onMode, onRoleChange, onPasswordReset, onDelete }: UserRowProps) {
  const [draftRole, setDraftRole] = useState(user.role);
  const background = mode === 'delete' || mode === 'password' ? 'bg-[#F7E5DF]/60' : 'hover:bg-white';

  return (
    <div className={`group relative border-b border-[#ECE9E0] transition-colors duration-200 ${background}`}>
      <span className="absolute inset-y-0 left-0 w-[4px] origin-center scale-y-0 bg-[#62A4A7] transition-transform duration-300 group-hover:scale-y-100" />
      <div className={`${COLUMNS} px-[16px]`} style={{ ...GRID, minHeight: ROW_HEIGHT }}>
        <div className="flex min-w-0 items-center gap-[16px]">
          <Avatar user={user} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate fs-30 font-bold text-[#2C322F]">{displayName(user)}</span>
            <span className="truncate fs-20 font-normal text-[#6F7468]">{user.account}</span>
          </span>
        </div>

        <div>{mode === 'edit' && roles ? <RolePicker roles={roles} value={draftRole} onChange={setDraftRole} /> : <RolePill role={user.role} />}</div>
        <div><DateTime value={user.registeredAt} /></div>
        <div>{user.lastActiveAt ? <DateTime value={user.lastActiveAt} /> : <span className="fs-22 font-bold text-[#8A8E86]">尚未登入</span>}</div>

        {/* only accounts the viewer may manage get buttons: root's is managed by nobody, admins' only by root */}
        <div className="flex items-center justify-end gap-[4px]">
          {roles && mode === 'view' && (
            <>
              <TextButton onClick={() => onMode('edit')}>編輯</TextButton>
              <TextButton onClick={() => onMode('password')}>重設密碼</TextButton>
              <TextButton tone="danger" onClick={() => onMode('delete')}>刪除</TextButton>
            </>
          )}
          {mode === 'edit' && (
            <>
              <TextButton onClick={() => onMode(null)}>取消</TextButton>
              <TextButton tone="primary" disabled={busy || draftRole === user.role} onClick={() => onRoleChange(draftRole)}>
                儲存
              </TextButton>
            </>
          )}
          {mode === 'password' && <Confirm question="改回預設密碼？" action="重設" busy={busy} onCancel={() => onMode(null)} onConfirm={onPasswordReset} />}
          {mode === 'delete' && <Confirm question="確定刪除？" action="刪除" busy={busy} onCancel={() => onMode(null)} onConfirm={onDelete} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

function AddUserButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[64px] shrink-0 items-center gap-[10px] bg-[#62A4A7] px-[26px] fs-26 font-bold text-[#F7F6F1] transition-all duration-300 hover:shadow-[var(--shadow-brand-glow)] active:scale-[0.98]"
    >
      <span className="fs-30 leading-none">＋</span>
      新增使用者
    </button>
  );
}

// The accounts from the backend; every change is saved there, then shown here. `actor` is the viewer's role, which
// decides who they may manage.
export default function UserManagementPage({ actor }: { actor: Role }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [adding, setAdding] = useState(false);
  const [rowMode, setRowMode] = useState<RowMode>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    fetchUsers().then(setUsers, (error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const list = users ?? [];
  const shown = filterUsers(list, query, roleFilter);
  const counts = countRoles(list);

  // Runs a change on the backend; on success applies it to the list and confirms it, on failure says why
  const run = async (change: () => Promise<(current: ManagedUser[]) => ManagedUser[]>, success: string) => {
    setBusy(true);
    try {
      const apply = await change();
      setUsers((current) => apply(current ?? []));
      setNotice({ tone: 'success', text: success });
      setRowMode(null);
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const addUser = async (account: string, name: string, role: Role) => {
    const user = await createUser(account, name, role);
    setUsers((current) => [user, ...(current ?? [])]);
    setAdding(false);
    setNotice({ tone: 'success', text: `已建立 ${name}（${account}），首次登入需修改預設密碼` });
  };

  const emptyText = loadError ?? (users === null ? '載入中…' : '找不到符合的使用者');

  return (
    <AccountSubPage
      title="用戶管理"
      description="新增帳號、調整角色或移除不再使用的帳號"
      width={CONTENT_WIDTH}
      action={canCreateUsers(actor) ? <AddUserButton onClick={() => setAdding(true)} /> : undefined}
    >
      <div className="mt-[28px] flex items-end justify-between gap-[20px] border-b-2 border-[#ECE9E0]">
        <RoleTabs counts={counts} value={roleFilter} onChange={setRoleFilter} />
        <div className="pb-[12px]">
          <SearchBox value={query} label="搜尋帳號或姓名" onChange={setQuery} />
        </div>
      </div>

      {adding && (
        <AddUserForm users={list} roles={assignableRoles(actor)} onCancel={() => setAdding(false)} onAdd={addUser} />
      )}

      <p
        aria-live="polite"
        className={`mt-[14px] flex h-[48px] items-center gap-[10px] px-[16px] fs-22 font-bold transition-opacity duration-300 ${
          !notice ? 'opacity-0' : notice.tone === 'success' ? 'bg-[#D1E6E7] text-[#3F7A7E] opacity-100' : 'bg-[#F7E5DF] text-[#98412F] opacity-100'
        }`}
      >
        {notice && <>{notice.tone === 'success' ? '✓' : '!'} {notice.text}</>}
      </p>

      <div className={`${COLUMNS} mt-[6px] px-[16px] pb-[10px] fs-20 font-bold text-[#8A8E86]`} style={GRID}>
        <span>使用者</span>
        <span>角色</span>
        <span>註冊日期</span>
        <span>最近登入</span>
        <span />
      </div>

      <div className="overflow-y-auto border-t border-[#ECE9E0] [scrollbar-width:thin]" style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}>
        {shown.length === 0 && <p className="py-[48px] text-center fs-24 font-bold text-[#8A8E86]">{emptyText}</p>}
        {shown.map((user) => (
          <UserRow
            key={`${user.account}-${rowMode?.account === user.account ? rowMode.kind : 'view'}`}
            user={user}
            mode={rowMode?.account === user.account ? rowMode.kind : 'view'}
            roles={canManage(actor, user.role) ? assignableRoles(actor) : null}
            busy={busy}
            onMode={(kind) => setRowMode(kind ? { account: user.account, kind } : null)}
            onRoleChange={(role) =>
              run(async () => {
                const changed = await changeRole(user.id, role);
                return (current) => current.map((candidate) => (candidate.id === user.id ? changed : candidate));
              }, `已將 ${displayName(user)} 改為${ROLE_LABELS[role]}`)
            }
            onPasswordReset={() =>
              run(async () => {
                await resetPassword(user.id);
                return (current) => current;
              }, `已將 ${displayName(user)}（${user.account}）的密碼改回預設密碼，下次登入需修改`)
            }
            onDelete={() =>
              run(async () => {
                await deleteUser(user.id);
                return (current) => current.filter((candidate) => candidate.id !== user.id);
              }, `已刪除 ${displayName(user)}（${user.account}）`)
            }
          />
        ))}
      </div>

      <p className="mt-[14px] px-[16px] fs-20 font-bold text-[#8A8E86]">
        顯示 {shown.length} / 共 {list.length} 位使用者
      </p>
    </AccountSubPage>
  );
}
