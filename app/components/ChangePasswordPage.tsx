import Image from 'next/image';
import AccountSubPage from './AccountSubPage';
import TextField from './TextField';

interface ChangePasswordPageProps {
  onSubmit: () => void;
}

export default function ChangePasswordPage({ onSubmit }: ChangePasswordPageProps) {
  return (
    <AccountSubPage title="修改密碼" description="更新您的登入密碼" width={644}>
      <Image src="/admin/divider-wide.svg" alt="" width={642} height={1} className="mt-6 h-px w-full" />

      <div className="mt-[9px]">
        <TextField className="mt-[23px]" label="目前密碼" type="password" placeholder="Current password" />
        <TextField
          className="mt-[23px]"
          label="新密碼"
          type="password"
          placeholder="New password"
          hint="至少 8 碼，建議混合英文字母與數字"
        />
        <TextField className="mt-[23px]" label="確認新密碼" type="password" placeholder="Confirm new password" />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        className="mt-[58px] h-[83px] w-[247px] self-end bg-[#62A4A7] fs-32 text-[#F7F6F1] transition-all duration-300 hover:shadow-[var(--shadow-brand-glow)] active:scale-[0.98]"
      >
        儲存變更
      </button>
    </AccountSubPage>
  );
}
