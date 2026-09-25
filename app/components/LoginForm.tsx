import type { FormEvent } from 'react';
import { SERIF_FONT } from './AccountSubPage';
import TextField from './TextField';

interface LoginFormProps {
  account: string;
  password: string;
  accountError: string;
  passwordError: string;
  onAccountChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function LoginForm({
  account,
  password,
  accountError,
  passwordError,
  onAccountChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    // pb-[30px]: Figma sits the form 15px above the panel's vertical center
    <div className="flex w-full max-w-[calc(615px*var(--col))] flex-col items-center pb-[30px] font-black" style={SERIF_FONT}>
      <h2 className="fs-64 font-bold leading-[normal]">
        <span className="text-[#62A4A7]">Sky</span>
        <span className="text-[#2C322F]">Well</span>
      </h2>
      <p className="mt-[21px] flex h-[43px] items-center fs-32 font-semibold text-[#62A4A7]">
        <span className="inline-block -skew-x-20 scale-y-94 whitespace-nowrap">MEMBER SIGN IN</span>
      </p>

      <form className="mt-[35px] w-full" onSubmit={onSubmit} noValidate>
        <TextField
          label="帳號"
          type="text"
          placeholder="Account"
          value={account}
          error={accountError}
          onChange={(e) => onAccountChange(e.target.value)}
        />
        <TextField
          label="密碼"
          type="password"
          placeholder="Password"
          value={password}
          error={passwordError}
          className="mt-[27px]"
          onChange={(e) => onPasswordChange(e.target.value)}
        />

        <label className="mt-[39px] flex w-fit cursor-pointer items-center gap-5 fs-24 text-[#2C322F]">
          保持登入
          <input type="checkbox" defaultChecked className="peer sr-only" />
          <span className="h-9 w-9 border-2 border-[#62A4A7] bg-white transition-colors peer-checked:bg-[#62A4A7] peer-focus-visible:shadow-[var(--shadow-focus)]" />
        </label>

        <button
          type="submit"
          className="mt-[37px] h-[94px] w-full bg-[#62A4A7] fs-32 text-[#2C322F] transition-all duration-300 hover:shadow-[var(--shadow-brand-glow)] active:scale-[0.98]"
        >
          登入
        </button>
      </form>
    </div>
  );
}
