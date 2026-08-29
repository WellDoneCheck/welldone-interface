'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface LoginPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Toast {
  id: number;
  type: 'error' | 'success';
  message: string;
}

let toastId = 0;

export default function LoginPanel({ isOpen, onClose }: LoginPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: 'error' | 'success', message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setAccount('');
        setPassword('');
        setAccountError('');
        setPasswordError('');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validate = (): boolean => {
    let valid = true;
    if (!account.trim()) {
      setAccountError('請輸入帳號');
      valid = false;
    } else {
      setAccountError('');
    }
    if (!password) {
      setPasswordError('請輸入密碼');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('error', '請填寫所有欄位');
      return;
    }
    // Simulate login
    addToast('success', '登入成功！');
    setTimeout(() => onClose(), 1000);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-in trapezoid panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-[61] h-full w-full max-w-[700px] bg-[#F5F3EE] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [clip-path:polygon(20%_0,100%_0,100%_100%,0_100%)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-8 z-10 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 transition-colors"
          aria-label="關閉登入"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Form content (added left padding to offset the trapezoid slope) */}
        <div className="flex h-full flex-col items-center justify-center pl-16 pr-12">
          <h2
            className={`mb-10 text-4xl font-black tracking-wide transition-all duration-500 delay-100 ${
              isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
          >
            <span className="text-[#68B9A5]">Sky</span>
            <span className="text-gray-900">Wall</span>
          </h2>
          <h2
            className={`mb-10 text-4xl font-black tracking-wide text-gray-900 transition-all duration-500 delay-100 ${
              isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
          >
            登入
          </h2>

          <form
            className="w-full max-w-sm space-y-6"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Account */}
            <div
              className={`transition-all duration-500 delay-200 ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <label className="mb-2 block text-sm font-bold text-gray-800">帳號</label>
              <input
                type="text"
                placeholder="Account"
                value={account}
                onChange={(e) => {
                  setAccount(e.target.value);
                  if (accountError) setAccountError('');
                }}
                className={`w-full rounded-md border-0 bg-[#D4EBE6] px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition-shadow ${
                  accountError
                    ? 'ring-2 ring-red-400 focus:ring-red-400'
                    : 'focus:ring-2 focus:ring-[#68B9A5]/50'
                }`}
              />
              {accountError && (
                <p className="mt-1.5 text-xs text-red-500">{accountError}</p>
              )}
            </div>

            {/* Password */}
            <div
              className={`transition-all duration-500 delay-300 ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <label className="mb-2 block text-sm font-bold text-gray-800">密碼</label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                className={`w-full rounded-md border-0 bg-[#D4EBE6] px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition-shadow ${
                  passwordError
                    ? 'ring-2 ring-red-400 focus:ring-red-400'
                    : 'focus:ring-2 focus:ring-[#68B9A5]/50'
                }`}
              />
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-500">{passwordError}</p>
              )}
            </div>

            {/* Remember me */}
            <div
              className={`flex items-center gap-2 pt-1 transition-all duration-500 delay-[400ms] ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-[#68B9A5]"
                />
                <span className="text-sm font-bold text-gray-800">保持登入</span>
              </label>
            </div>

            {/* Submit */}
            <div
              className={`transition-all duration-500 delay-500 ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <button
                type="submit"
                className="w-full rounded-md bg-[#68B9A5] py-3 text-base font-bold text-white shadow-md transition-all duration-200 hover:bg-[#5aa897] hover:shadow-lg active:scale-[0.98]"
              >
                登入
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed top-20 right-6 z-[70] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 animate-[slideInRight_0.3s_ease-out] ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-2 shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}