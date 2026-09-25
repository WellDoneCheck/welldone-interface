import AccountSubPage from './AccountSubPage';

type Role = 'admin' | 'user';

interface UserRow {
  account: string;
  role: Role;
}

const REGISTERED_DATE = '2022年12月21日';
const REGISTERED_TIME = '10:20:20';

const USERS: UserRow[] = [
  { account: 'chen.chihyuan', role: 'admin' },
  { account: 'wu.jiaming', role: 'user' },
  { account: 'lin.meihua', role: 'user' },
  { account: 'wu.jiaming', role: 'user' },
  { account: 'wu.jiaming', role: 'user' },
  { account: 'wu.jiaming', role: 'user' },
  { account: 'wu.jiaming', role: 'user' },
];

const COLUMNS = 'grid grid-cols-[32%_18%_30%_20%]';
const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 7;

function HeaderCell({ children }: { children?: string }) {
  return (
    <div className="flex h-[52px] items-center border-b border-[#E4E1D7] px-4 fs-24 font-medium text-[#6F7468]">
      {children}
    </div>
  );
}

function Avatar({ account, role }: { account: string; role: Role }) {
  const style = role === 'admin' ? 'bg-[#62A4A7] text-white' : 'bg-[#D1E6E7] text-[#3F7A7E]';
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center fs-20 font-bold uppercase ${style}`}>
      {account[0]}
    </span>
  );
}

function RoleTag({ role }: { role: Role }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`flex h-[31px] w-[85px] items-center justify-center bg-[#D1E6E7] fs-16 ${
        isAdmin ? 'font-bold text-[#3F7A7E]' : 'font-normal text-[#6F7468]'
      }`}
    >
      {isAdmin ? '管理員' : '使用者'}
    </span>
  );
}

function ActionButton({ label, color }: { label: string; color: string }) {
  return (
    <button
      type="button"
      className="border bg-transparent px-3 py-1 fs-14 font-semibold leading-5 transition-colors duration-200 hover:bg-white"
      style={{ borderColor: color, color, fontFamily: 'var(--font-geist-sans), sans-serif' }}
    >
      {label}
    </button>
  );
}

function UserTableRow({ user }: { user: UserRow }) {
  return (
    <div
      className={`${COLUMNS} group relative items-center border-b border-[#F1EFE9] transition-colors duration-300 hover:bg-white`}
      style={{ height: ROW_HEIGHT }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px] origin-center scale-y-0 bg-[#62A4A7] transition-transform duration-300 group-hover:scale-y-100" />
      <div className="flex items-center gap-3 px-4 fs-22 font-normal text-[#2C322F]">
        <Avatar account={user.account} role={user.role} />
        <span className="truncate">{user.account}</span>
      </div>
      <div className="px-4">
        <RoleTag role={user.role} />
      </div>
      <div className="flex flex-col px-4 font-normal">
        <span className="fs-17 leading-6 text-[#2C322F]">{REGISTERED_DATE}</span>
        <span className="fs-14 leading-5 text-[#6F7468]">{REGISTERED_TIME}</span>
      </div>
      <div className="flex gap-2 px-4">
        <ActionButton label="編輯" color="#3F7A7E" />
        <ActionButton label="刪除" color="#98412F" />
      </div>
    </div>
  );
}

function AddUserButton() {
  return (
    <button
      type="button"
      className="flex h-12 shrink-0 items-center gap-2 bg-[#62A4A7] px-5 fs-20 text-[#F7F6F1] transition-all duration-300 hover:shadow-[var(--shadow-brand-glow)] active:scale-[0.98]"
    >
      <span className="fs-24 leading-none">＋</span>
      新增使用者
    </button>
  );
}

export default function UserManagementPage() {
  return (
    <AccountSubPage title="用戶管理" description="管理所有註冊用戶" width={656} action={<AddUserButton />}>
      <div className="mt-[35px]">
        <div className={COLUMNS}>
          <HeaderCell>帳號</HeaderCell>
          <HeaderCell>角色</HeaderCell>
          <HeaderCell>註冊日期</HeaderCell>
          <HeaderCell />
        </div>
        <div className="overflow-y-auto [scrollbar-width:thin]" style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}>
          {USERS.map((user, index) => (
            <UserTableRow key={`${user.account}-${index}`} user={user} />
          ))}
        </div>
        <p className="mt-4 px-4 fs-16 font-normal text-[#6F7468]">共 {USERS.length} 位用戶</p>
      </div>
    </AccountSubPage>
  );
}
