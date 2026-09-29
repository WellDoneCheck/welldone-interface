'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import AccountSubPage from './AccountSubPage';
import { INITIAL_USERS, type ManagedUser, type UserRole } from '../data/users';
import { accountError, countRoles, filterUsers, isLastAdmin, MIN_PASSWORD_LENGTH, passwordError, type RoleFilter } from '../utils/users';

// Wider than the other account pages: the account panel widens for this page (see LoginPanel)
const CONTENT_WIDTH = 1100;
const COLUMNS = 'grid grid-cols-[minmax(0,1fr)_180px_160px_160px_290px] items-center gap-x-[20px]';
const ROW_HEIGHT = 96;
const VISIBLE_ROWS = 8;
// How long the confirmation above the list stays after an action
const NOTICE_MS = 4000;

const ROLE_LABELS: Record<UserRole, string> = { admin: '管理員', user: '使用者' };
const FILTERS: { role: RoleFilter; label: string }[] = [
  { role: 'all', label: '全部' },
  { role: 'admin', label: '管理員' },
  { role: 'user', label: '使用者' },
];

type RowAction = 'edit' | 'password' | 'delete';
type RowMode = { account: string; kind: RowAction } | null;

/* ─── Small parts ───────────────────────────────────────────────── */

function Avatar({ user }: { user: ManagedUser }) {
  const style = user.role === 'admin' ? 'bg-[#62A4A7] text-white' : 'bg-[#D1E6E7] text-[#3F7A7E]';
  return <span className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center fs-28 font-bold ${style}`}>{user.name[0]}</span>;
}

function RolePill({ role }: { role: UserRole }) {
  const style = role === 'admin' ? 'bg-[#62A4A7] text-white' : 'bg-[#D1E6E7] text-[#3F7A7E]';
  return <span className={`inline-flex h-[40px] items-center px-[16px] fs-22 font-bold ${style}`}>{ROLE_LABELS[role]}</span>;
}

function RolePicker({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <span className="inline-flex border-2 border-[#62A4A7]">
      {(['admin', 'user'] as const).map((role) => (
        <button
          key={role}
          type="button"
          aria-pressed={value === role}
          onClick={() => onChange(role)}
          className={`h-[40px] whitespace-nowrap px-[10px] fs-20 font-bold transition-colors ${value === role ? 'bg-[#62A4A7] text-white' : 'text-[#3F7A7E] hover:bg-[#D1E6E7]/60'}`}
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
      className={`h-[44px] px-[14px] fs-22 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${tones[tone]}`}
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

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-[60px] w-[380px] items-center gap-[12px] bg-[#EEF3F1] px-[18px] focus-within:shadow-[var(--shadow-focus)]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6F7468" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜尋帳號或姓名"
        aria-label="搜尋帳號或姓名"
        className="min-w-0 flex-1 bg-transparent fs-24 font-normal text-[#2C322F] outline-none placeholder:text-[#8A8E86]"
      />
    </label>
  );
}

/* ─── Add user ──────────────────────────────────────────────────── */

function AddUserForm({ users, onAdd, onCancel }: { users: ManagedUser[]; onAdd: (user: ManagedUser) => void; onCancel: () => void }) {
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = accountError(account, users) ?? (name.trim() ? null : '請輸入姓名');
    if (problem) {
      setError(problem);
      return;
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const registeredAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    onAdd({ account: account.trim(), name: name.trim(), role, registeredAt, lastActiveAt: null });
  };

  const field = 'h-[56px] min-w-0 bg-white px-[16px] fs-24 font-normal text-[#2C322F] outline-none shadow-[inset_0_0_0_2px_#D1E6E7] focus:shadow-[inset_0_0_0_2px_#62A4A7]';

  return (
    <form onSubmit={submit} className="mt-[24px] flex flex-col gap-[14px] bg-[#EEF3F1] px-[24px] py-[20px]">
      <span className="fs-24 font-bold text-[#2C322F]">新增使用者</span>
      <div className="flex items-center gap-[14px]">
        <input autoFocus value={account} onChange={(event) => setAccount(event.target.value)} placeholder="帳號，例如 lin.xiaoming" aria-label="帳號" className={`${field} flex-[3]`} />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="姓名" aria-label="姓名" className={`${field} flex-[2]`} />
        <RolePicker value={role} onChange={setRole} />
      </div>
      <div className="flex items-center justify-between gap-[14px]">
        <span role="alert" className="fs-20 font-bold text-[#98412F]">{error}</span>
        <span className="flex gap-[8px]">
          <TextButton onClick={onCancel}>取消</TextButton>
          <button type="submit" className="h-[44px] bg-[#62A4A7] px-[20px] fs-22 font-bold text-white transition-colors hover:bg-[#54999D]">
            建立
          </button>
        </span>
      </div>
    </form>
  );
}

/* ─── User row ──────────────────────────────────────────────────── */

// An admin sets a new password for the user; it is typed twice and checked like on the change-password page
function PasswordResetForm({ user, onCancel, onSave }: { user: ManagedUser; onCancel: () => void; onSave: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = passwordError(password, confirmation);
    if (problem) setError(problem);
    else onSave();
  };

  const field = 'h-[52px] min-w-0 flex-1 bg-white px-[16px] fs-22 font-normal text-[#2C322F] outline-none shadow-[inset_0_0_0_2px_#D1E6E7] focus:shadow-[inset_0_0_0_2px_#62A4A7]';

  return (
    <form onSubmit={submit} className="flex flex-col gap-[10px] border-t border-dashed border-[#D1E6E7] pb-[18px] pl-[88px] pr-[16px] pt-[14px]">
      <span className="fs-22 font-bold text-[#2C322F]">
        重設 {user.name} 的密碼
        <span className="ml-[12px] fs-18 font-normal text-[#6F7468]">至少 {MIN_PASSWORD_LENGTH} 碼，需同時包含英文字母與數字</span>
      </span>
      <div className="flex items-center gap-[12px]">
        <input autoFocus type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="新密碼" aria-label="新密碼" className={field} />
        <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="再次輸入新密碼" aria-label="再次輸入新密碼" className={field} />
        <TextButton onClick={onCancel}>取消</TextButton>
        <button type="submit" className="h-[44px] shrink-0 bg-[#62A4A7] px-[18px] fs-22 font-bold text-white transition-colors hover:bg-[#54999D]">
          儲存密碼
        </button>
      </div>
      <span role="alert" className="min-h-[26px] fs-20 font-bold text-[#98412F]">{error}</span>
    </form>
  );
}

interface UserRowProps {
  user: ManagedUser;
  mode: 'view' | RowAction;
  locked: boolean;
  onMode: (kind: RowAction | null) => void;
  onRoleChange: (role: UserRole) => void;
  onPasswordReset: () => void;
  onDelete: () => void;
}

function UserRow({ user, mode, locked, onMode, onRoleChange, onPasswordReset, onDelete }: UserRowProps) {
  const [draftRole, setDraftRole] = useState(user.role);
  const lockReason = '系統至少需要一位管理員';
  const background = mode === 'delete' ? 'bg-[#F7E5DF]/60' : mode === 'password' ? 'bg-white' : 'hover:bg-white';

  return (
    <div className={`group relative border-b border-[#ECE9E0] transition-colors duration-200 ${background}`}>
      <span className="absolute inset-y-0 left-0 w-[4px] origin-center scale-y-0 bg-[#62A4A7] transition-transform duration-300 group-hover:scale-y-100" />
      <div className={`${COLUMNS} px-[16px]`} style={{ minHeight: ROW_HEIGHT }}>
        <div className="flex min-w-0 items-center gap-[16px]">
          <Avatar user={user} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate fs-30 font-bold text-[#2C322F]">{user.name}</span>
            <span className="truncate fs-20 font-normal text-[#6F7468]">{user.account}</span>
          </span>
        </div>

        <div>{mode === 'edit' ? <RolePicker value={draftRole} onChange={setDraftRole} /> : <RolePill role={user.role} />}</div>
        <div><DateTime value={user.registeredAt} /></div>
        <div>{user.lastActiveAt ? <DateTime value={user.lastActiveAt} /> : <span className="fs-22 font-bold text-[#8A8E86]">尚未登入</span>}</div>

        <div className="flex items-center justify-end gap-[4px]">
          {(mode === 'view' || mode === 'password') && (
            <>
              <TextButton onClick={() => onMode('edit')}>編輯</TextButton>
              <TextButton onClick={() => onMode(mode === 'password' ? null : 'password')}>重設密碼</TextButton>
              <TextButton tone="danger" disabled={locked} title={locked ? lockReason : undefined} onClick={() => onMode('delete')}>
                刪除
              </TextButton>
            </>
          )}
          {mode === 'edit' && (
            <>
              <TextButton onClick={() => onMode(null)}>取消</TextButton>
              <TextButton
                tone="primary"
                disabled={locked && draftRole !== 'admin'}
                title={locked && draftRole !== 'admin' ? lockReason : undefined}
                onClick={() => onRoleChange(draftRole)}
              >
                儲存
              </TextButton>
            </>
          )}
          {mode === 'delete' && (
            <>
              <span className="fs-20 font-bold text-[#98412F]">確定刪除？</span>
              <TextButton onClick={() => onMode(null)}>取消</TextButton>
              <button type="button" onClick={onDelete} className="h-[44px] bg-[#BC5646] px-[14px] fs-22 font-bold text-white transition-colors hover:bg-[#A84A3B]">
                刪除
              </button>
            </>
          )}
        </div>
      </div>
      {mode === 'password' && <PasswordResetForm user={user} onCancel={() => onMode(null)} onSave={onPasswordReset} />}
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

// Changes stay on this page until users are stored on the backend
export default function UserManagementPage() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [adding, setAdding] = useState(false);
  const [rowMode, setRowMode] = useState<RowMode>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const shown = filterUsers(users, query, roleFilter);
  const counts = countRoles(users);

  const updateUser = (account: string, change: Partial<ManagedUser>) =>
    setUsers((current) => current.map((user) => (user.account === account ? { ...user, ...change } : user)));

  return (
    <AccountSubPage
      title="用戶管理"
      description="新增帳號、調整角色或移除不再使用的帳號"
      width={CONTENT_WIDTH}
      action={<AddUserButton onClick={() => setAdding(true)} />}
    >
      <div className="mt-[28px] flex items-end justify-between gap-[20px] border-b-2 border-[#ECE9E0]">
        <RoleTabs counts={counts} value={roleFilter} onChange={setRoleFilter} />
        <div className="pb-[12px]">
          <SearchBox value={query} onChange={setQuery} />
        </div>
      </div>

      {adding && (
        <AddUserForm
          users={users}
          onCancel={() => setAdding(false)}
          onAdd={(user) => {
            setUsers((current) => [user, ...current]);
            setAdding(false);
          }}
        />
      )}

      <p aria-live="polite" className={`mt-[14px] flex h-[48px] items-center gap-[10px] px-[16px] fs-22 font-bold transition-opacity duration-300 ${notice ? 'bg-[#D1E6E7] text-[#3F7A7E] opacity-100' : 'opacity-0'}`}>
        {notice && <>✓ {notice}</>}
      </p>

      <div className={`${COLUMNS} mt-[6px] px-[16px] pb-[10px] fs-20 font-bold text-[#8A8E86]`}>
        <span>使用者</span>
        <span>角色</span>
        <span>註冊日期</span>
        <span>最近登入</span>
        <span />
      </div>

      <div className="overflow-y-auto border-t border-[#ECE9E0] [scrollbar-width:thin]" style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}>
        {shown.length === 0 && <p className="py-[48px] text-center fs-24 font-bold text-[#8A8E86]">找不到符合的使用者</p>}
        {shown.map((user) => (
          <UserRow
            key={`${user.account}-${rowMode?.account === user.account ? rowMode.kind : 'view'}`}
            user={user}
            mode={rowMode?.account === user.account ? rowMode.kind : 'view'}
            locked={isLastAdmin(users, user.account)}
            onMode={(kind) => setRowMode(kind ? { account: user.account, kind } : null)}
            onPasswordReset={() => {
              setNotice(`已重設 ${user.name}（${user.account}）的密碼`);
              setRowMode(null);
            }}
            onRoleChange={(role) => {
              updateUser(user.account, { role });
              setRowMode(null);
            }}
            onDelete={() => {
              setUsers((current) => current.filter((candidate) => candidate.account !== user.account));
              setRowMode(null);
            }}
          />
        ))}
      </div>

      <p className="mt-[14px] px-[16px] fs-20 font-bold text-[#8A8E86]">
        顯示 {shown.length} / 共 {users.length} 位使用者
      </p>
    </AccountSubPage>
  );
}
