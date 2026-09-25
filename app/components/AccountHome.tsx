import Image from 'next/image';
import type { UserInfo } from './LoginPanel';
import { SERIF_FONT } from './AccountSubPage';

interface AccountHomeProps {
  userInfo: UserInfo | null;
  onOpenPassword: () => void;
  onOpenUsers: () => void;
  onLogout: () => void;
}

interface MenuButtonProps {
  icon: string;
  iconWidth: number;
  iconHeight: number;
  title: string;
  description: string;
  onClick: () => void;
}

function MenuButton({ icon, iconWidth, iconHeight, title, description, onClick }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[94px] w-full items-center gap-6 border-2 border-[#D1E6E7] bg-white pl-[23px] pr-[5px] text-left transition-all duration-300 hover:shadow-[var(--shadow-card)] active:scale-[0.99]"
      style={SERIF_FONT}
    >
      <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center bg-[#D1E6E7]">
        <Image src={icon} alt="" width={iconWidth} height={iconHeight} />
      </span>
      <span className="flex flex-1 flex-col font-black">
        <span className="fs-27 leading-[34px] text-black">{title}</span>
        <span className="fs-20 leading-7 text-black/50">{description}</span>
      </span>
      <Image src="/admin/icon-chevron-circle.svg" alt="" width={45} height={45} />
    </button>
  );
}

export default function AccountHome({ userInfo, onOpenPassword, onOpenUsers, onLogout }: AccountHomeProps) {
  const isAdmin = userInfo?.role === 'admin';

  return (
    <div className="flex w-full max-w-[calc(491px*var(--col))] flex-col items-center">
      <div className="flex h-[190px] w-[190px] items-center justify-center bg-[#D1E6E7]">
        <Image src="/admin/icon-user.svg" alt="" width={80} height={80} />
      </div>

      <h2 className="mt-[14px] fs-48 font-black leading-[65px] text-[#2C322F]" style={SERIF_FONT}>
        {userInfo?.name}
      </h2>
      <span
        className="mt-[14px] flex h-[50px] w-[115px] items-center justify-center border border-[#D1E6E7] bg-white fs-24 font-black text-[#62A4A7]"
        style={SERIF_FONT}
      >
        {isAdmin ? '管理員' : '一般用戶'}
      </span>

      <div className="mt-[63px] flex w-full flex-col gap-[33px]">
        <MenuButton
          icon="/admin/icon-password-reset.svg"
          iconWidth={42}
          iconHeight={48}
          title="修改密碼"
          description="更新您的登入密碼"
          onClick={onOpenPassword}
        />
        {isAdmin && (
          <MenuButton
            icon="/admin/icon-users.svg"
            iconWidth={42}
            iconHeight={35}
            title="用戶管理"
            description="管理所有註冊用戶"
            onClick={onOpenUsers}
          />
        )}
      </div>

      <Image src="/admin/divider.svg" alt="" width={489} height={1} className="mt-9 h-px w-full" />

      <button
        type="button"
        onClick={onLogout}
        className="mt-[27px] flex h-[94px] w-full items-center justify-center gap-[10px] border-2 border-[#98412F] bg-white fs-27 font-black text-[#98412F] transition-all duration-300 active:scale-[0.99]"
        style={SERIF_FONT}
      >
        <Image src="/admin/icon-logout.svg" alt="" width={32} height={32} />
        登出
      </button>
    </div>
  );
}
