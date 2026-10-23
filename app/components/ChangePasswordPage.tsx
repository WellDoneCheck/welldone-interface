import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import AccountSubPage from './AccountSubPage';
import TextField from './TextField';
import { ApiError } from '../utils/api';
import { changePassword } from '../utils/auth';
import { MIN_PASSWORD_LENGTH, passwordError } from '../utils/users';

interface ChangePasswordPageProps {
  username: string;
  // still on the default password: it has to be changed before the site can be used
  firstLogin: boolean;
  onChanged: () => void;
}

export default function ChangePasswordPage({ username, firstLogin, onChanged }: ChangePasswordPageProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentError, setCurrentError] = useState('');
  const [nextError, setNextError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = passwordError(next, confirmation);
    setCurrentError(current ? '' : '請輸入目前密碼');
    setNextError(problem ?? '');
    if (!current || problem || submitting) return;

    setSubmitting(true);
    try {
      await changePassword(username, current, next);
      onChanged();
    } catch (error) {
      // a 401 here is a wrong current password, not an expired login
      if (error instanceof ApiError && error.status === 401) setCurrentError('目前密碼錯誤');
      else setNextError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountSubPage
      title="修改密碼"
      description={firstLogin ? '首次登入，請先將預設密碼改為您自己的密碼' : '更新您的登入密碼'}
      width={644}
    >
      <Image src="/admin/divider-wide.svg" alt="" width={642} height={1} className="mt-6 h-px w-full" />

      <form className="flex flex-col" onSubmit={submit} noValidate>
        <div className="mt-[9px]">
          <TextField
            className="mt-[23px]"
            label="目前密碼"
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={current}
            error={currentError}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <TextField
            className="mt-[23px]"
            label="新密碼"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            hint={`至少 ${MIN_PASSWORD_LENGTH} 碼，需同時包含英文字母與數字`}
            value={next}
            error={nextError}
            onChange={(e) => setNext(e.target.value)}
          />
          <TextField
            className="mt-[23px]"
            label="確認新密碼"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-[58px] h-[83px] w-[247px] self-end bg-[#62A4A7] fs-32 text-[#F7F6F1] transition-all duration-300 hover:shadow-[var(--shadow-brand-glow)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? '儲存中…' : '儲存變更'}
        </button>
      </form>
    </AccountSubPage>
  );
}
