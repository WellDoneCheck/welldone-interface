'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type UserRole = 'admin' | 'user' | null;

export interface UserInfo {
  name: string;
  role: UserRole;
}

type View = 'login' | 'user' | 'password' | 'users';

interface LoginPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  userInfo?: UserInfo | null;
  onLogin?: (user: UserInfo) => void;
  onLogout?: () => void;
}

interface Toast {
  id: number;
  type: 'error' | 'success';
  message: string;
}

let toastId = 0;

export default function LoginPanel({ isOpen, onClose, isLoggedIn = false, userInfo = null, onLogin, onLogout }: LoginPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [view, setView] = useState<View>('login');
  const [isTransitioning, setIsTransitioning] = useState(false);

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
      if (e.key === 'Escape' && isOpen) {
        if (view === 'password' || view === 'users') {
          navigateBack();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, view]);

  // Reset when panel closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setAccount('');
        setPassword('');
        setAccountError('');
        setPasswordError('');
        setView('login');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Sync view with login state
  useEffect(() => {
    if (!isOpen) return;
    if (isLoggedIn && view === 'login') {
      switchView('user');
    } else if (!isLoggedIn && (view === 'user' || view === 'password' || view === 'users')) {
      switchView('login');
    }
  }, [isLoggedIn, isOpen]);

  const switchView = useCallback((next: View) => {
    if (next === view) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setView(next);
      setIsTransitioning(false);
    }, 180);
  }, [view]);

  const navigateBack = useCallback(() => {
    if (view === 'password' || view === 'users') {
      switchView('user');
    } else {
      onClose();
    }
  }, [view, switchView, onClose]);

  const panelMaxW = (view === 'password' || view === 'users') ? 'max-w-[900px]' : 'max-w-[60%]';

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
    const simulatedUser: UserInfo = {
      name: account,
      role: account === 'admin' ? 'admin' : 'user',
    };
    onLogin?.(simulatedUser);
  };

  const handleLogout = () => {
    onLogout?.();
    setAccount('');
    setPassword('');
  };

  const subPageTitle = view === 'password' ? '修改密碼' : '用戶管理';

  const contentOpacity = isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0';

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* ===== Single Panel ===== */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-[61] h-full w-full transition-all duration-500 ease-[cubic-bezier(0.2,1,0.36,1)] [clip-path:polygon(20%_0,100%_0,100%_100%,0_100%)] ${
          isOpen
            ? `translate-x-0 ${panelMaxW}`
            : `translate-x-full ${panelMaxW}`
        }`}
        style={{ background: 'var(--gradient-paper-strata)', boxShadow: 'var(--shadow-float)' }}
      >
        {/* Left edge shadow */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/5 to-transparent" />

        {/* Close / Back button */}
        {(view === 'login' || view === 'user') ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-10 z-10 flex h-10 w-10 items-center justify-center text-[#6F7468] hover:bg-black/5 transition-colors"
            aria-label="關閉登入"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={navigateBack}
            className="absolute top-6 right-10 z-10 flex h-10 w-10 items-center justify-center text-[#6F7468] hover:bg-black/5 transition-colors"
            aria-label="返回"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Content wrapper with crossfade transition */}
        <div className="flex h-full flex-col items-center justify-center pl-32 pr-12" style={{ paddingLeft: 'max(5rem, 15%)' }}>
          <div className={`w-full flex flex-col items-center transition-all duration-200 ease-in-out ${contentOpacity}`}>

            {/* ===== Login Form ===== */}
            {view === 'login' && (
              <div className="w-full max-w-sm flex flex-col items-center">
                <h2
                  className="mb-2 text-center text-4xl font-black tracking-wide transition-all duration-500 delay-100 opacity-100 translate-y-0"
                  style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
                >
                  <span className="text-[#62A4A7]">Sky</span>
                  <span className="text-[#2C322F]">Well</span>
                </h2>
                <p
                  className="mb-6 text-sm italic uppercase tracking-[0.28em]"
                  style={{ color: 'var(--brand)', fontFamily: 'var(--font-noto-serif-tc), serif' }}
                >
                  Member Sign In
                </p>
                {/*<h2
                  className="mb-10 text-center text-4xl font-black tracking-[0.06em] text-[#2C322F] transition-all duration-500 delay-100 opacity-100 translate-y-0"
                  style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
                >
                  登入
                </h2>*/}

                <form
                  className="w-full space-y-6"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  {/* Account */}
                  <div className="transition-all duration-500 delay-200 opacity-100 translate-y-0">
                    <label
                      className="mb-3 block text-xs uppercase tracking-[0.28em]"
                      style={{ color: 'var(--brand)' }}
                    >
                      Account
                    </label>
                    <input
                      type="text"
                      placeholder="Account"
                      value={account}
                      onChange={(e) => {
                        setAccount(e.target.value);
                        if (accountError) setAccountError('');
                      }}
                      className={`w-full border bg-[#F1EFE9] px-4 py-3 text-sm text-[#2C322F] placeholder-[#6F7468] outline-none transition-all duration-300 ${
                        accountError
                          ? 'border-[#BC5646] text-[#98412F]'
                          : 'border-[rgba(229,226,217,0.9)] focus:border-[#62A4A7] focus:bg-white focus:shadow-[0_0_0_3px_rgba(98,164,167,0.25)] focus:-translate-y-0.5'
                      }`}
                    />
                    {accountError && (
                      <p className="mt-1.5 text-xs text-[#98412F]">{accountError}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="transition-all duration-500 delay-300 opacity-100 translate-y-0">
                    <label
                      className="mb-3 block text-xs uppercase tracking-[0.28em]"
                      style={{ color: 'var(--brand)' }}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      className={`w-full border bg-[#F1EFE9] px-4 py-3 text-sm text-[#2C322F] placeholder-[#6F7468] outline-none transition-all duration-300 ${
                        passwordError
                          ? 'border-[#BC5646] text-[#98412F]'
                          : 'border-[rgba(229,226,217,0.9)] focus:border-[#62A4A7] focus:bg-white focus:shadow-[0_0_0_3px_rgba(98,164,167,0.25)] focus:-translate-y-0.5'
                      }`}
                    />
                    {passwordError && (
                      <p className="mt-1.5 text-xs text-[#98412F]">{passwordError}</p>
                    )}
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center gap-2 pt-1 transition-all duration-500 delay-[400ms] opacity-100 translate-y-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#62A4A7]"
                      />
                      <span className="text-sm font-bold text-[#2C322F]">保持登入</span>
                    </label>
                  </div>

                  {/* Submit */}
                  <div className="transition-all duration-500 delay-500 opacity-100 translate-y-0">
                    <button
                      type="submit"
                      className="w-full py-3 text-base font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_28px_-8px_rgba(98,164,167,0.35)] active:scale-[0.98]"
                      style={{ background: 'var(--gradient-primary)', transitionTimingFunction: 'var(--ease-expo)' }}
                    >
                      登入
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ===== Post-login User Panel ===== */}
            {view === 'user' && (
              <div className="w-full max-w-sm space-y-8">
                {/* Avatar + User name */}
                <div className="flex flex-col items-center gap-4">
                  <div className="h-20 w-20 bg-[#D1E6E7] flex items-center justify-center">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3F7A7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h2
                      className="text-2xl font-black text-[#2C322F]"
                      style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
                    >
                      {userInfo?.name}
                    </h2>
                    <span
                      className="mt-2 inline-block border px-3 py-1 text-xs font-semibold"
                      style={{
                        background: 'rgba(255,255,255,0.85)',
                        borderColor: 'rgba(98,164,167,0.6)',
                        color: 'var(--brand-ink)',
                      }}
                    >
                      {userInfo?.role === 'admin' ? '管理員' : '一般用戶'}
                    </span>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => switchView('password')}
                    className="group relative flex w-full items-center gap-4 border border-[rgba(229,226,217,0.9)] bg-white px-5 py-4 text-left transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(58,63,58,0.1),0_4px_12px_rgba(58,63,58,0.04)] active:scale-[0.99]"
                  >
                    <span className="absolute left-0 top-0 h-full w-1 bg-[#62A4A7] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="flex h-10 w-10 items-center justify-center bg-[#D1E6E7]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F7A7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-[#2C322F]">修改密碼</span>
                      <span className="text-xs text-[#6F7468]">更新您的登入密碼</span>
                    </div>
                    <svg className="ml-auto text-[#6F7468]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {userInfo?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => switchView('users')}
                      className="group relative flex w-full items-center gap-4 border border-[rgba(229,226,217,0.9)] bg-white px-5 py-4 text-left transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(58,63,58,0.1),0_4px_12px_rgba(58,63,58,0.04)] active:scale-[0.99]"
                    >
                      <span className="absolute left-0 top-0 h-full w-1 bg-[#62A4A7] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="flex h-10 w-10 items-center justify-center bg-[#D1E6E7]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F7A7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-[#2C322F]">用戶管理</span>
                        <span className="text-xs text-[#6F7468]">管理所有註冊用戶</span>
                      </div>
                      <svg className="ml-auto text-[#6F7468]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}

                  <div className="border-t border-[rgba(229,226,217,0.9)] pt-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 border-2 px-5 py-3 text-sm font-bold transition-all duration-300 active:scale-[0.98]"
                      style={{ borderColor: 'var(--red)', color: 'var(--red-ink)', background: '#fff' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      登出
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== Password Change ===== */}
            {view === 'password' && (
              <div className="w-full max-w-sm">
                {/* Back arrow + title */}
                <div className="mb-10 flex items-center gap-3 opacity-100 translate-y-0">
                  <button
                    type="button"
                    onClick={navigateBack}
                    className="flex h-10 w-10 items-center justify-center bg-[#F1EFE9] text-[#6F7468] hover:bg-[#E5E1D7] transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <h2
                    className="text-3xl font-black tracking-[0.06em] text-[#2C322F]"
                    style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
                  >
                    {subPageTitle}
                  </h2>
                </div>

                <div className="space-y-5">
                  {[
                    { label: '目前密碼', placeholder: 'Current password', delay: '100ms' },
                    { label: '新密碼', placeholder: 'New password', delay: '200ms' },
                    { label: '確認新密碼', placeholder: 'Confirm new password', delay: '300ms' },
                  ].map((field) => (
                    <div
                      key={field.label}
                      className="transition-all duration-400 opacity-100 translate-y-0"
                      style={{ transitionDelay: field.delay }}
                    >
                      <label className="mb-3 block text-sm font-bold text-[#2C322F]">{field.label}</label>
                      <input
                        type="password"
                        placeholder={field.placeholder}
                        className="w-full border border-[rgba(229,226,217,0.9)] bg-[#F1EFE9] px-4 py-3 text-sm text-[#2C322F] placeholder-[#6F7468] outline-none transition-all duration-300 focus:border-[#62A4A7] focus:bg-white focus:shadow-[0_0_0_3px_rgba(98,164,167,0.25)] focus:-translate-y-0.5"
                      />
                    </div>
                  ))}
                  <div
                    className="transition-all duration-400 opacity-100 translate-y-0"
                    style={{ transitionDelay: '400ms' }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        addToast('success', '密碼已更新！');
                        setTimeout(() => navigateBack(), 800);
                      }}
                      className="w-full py-3 text-base font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_28px_-8px_rgba(98,164,167,0.35)] active:scale-[0.98]"
                      style={{ background: 'var(--gradient-primary)', transitionTimingFunction: 'var(--ease-expo)' }}
                    >
                      確認修改
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== User Management (admin only) ===== */}
            {view === 'users' && (
              <div className="w-full max-w-sm">
                {/* Back arrow + title */}
                <div className="mb-10 flex items-center gap-3 opacity-100 translate-y-0">
                  <button
                    type="button"
                    onClick={navigateBack}
                    className="flex h-10 w-10 items-center justify-center bg-[#F1EFE9] text-[#6F7468] hover:bg-[#E5E1D7] transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <h2
                    className="text-3xl font-black tracking-[0.06em] text-[#2C322F]"
                    style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
                  >
                    {subPageTitle}
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'admin', role: '管理員', color: '#62A4A7', delay: '100ms' },
                    { name: 'user01', role: '一般用戶', color: '#62A4A7', delay: '200ms' },
                    { name: 'user02', role: '一般用戶', color: '#62A4A7', delay: '300ms' },
                    { name: 'user03', role: '一般用戶', color: '#62A4A7', delay: '400ms' },
                  ].map((user) => (
                    <div
                      key={user.name}
                      className="flex items-center gap-4 border border-[rgba(229,226,217,0.9)] bg-white px-5 py-4 transition-all duration-400 hover:shadow-[0_12px_32px_-8px_rgba(58,63,58,0.1),0_4px_12px_rgba(58,63,58,0.04)] opacity-100 translate-y-0"
                      style={{ transitionDelay: user.delay }}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center"
                        style={{ backgroundColor: '#D1E6E7' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3F7A7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-[#2C322F]">{user.name}</span>
                        <span className="text-xs text-[#6F7468]">{user.role}</span>
                      </div>
                      <span
                        className="border px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          background: 'rgba(255,255,255,0.85)',
                          borderColor: 'rgba(98,164,167,0.6)',
                          color: 'var(--brand-ink)',
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed top-20 right-6 z-[70] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 border px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 animate-[slideInRight_0.3s_ease-out] ${
              toast.type === 'error'
                ? 'bg-[#F7E5DF] text-[#98412F] border-[#BC5646]'
                : 'bg-[#D1E6E7] text-[#3F7A7E] border-[#62A4A7]'
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