'use client';

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import Image from 'next/image';
import AccountHome from './AccountHome';
import LoginForm from './LoginForm';
import ChangePasswordPage from './ChangePasswordPage';
import UserManagementPage from './UserManagementPage';
import { useFitScale, type FitStage } from './useFitScale';

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

// Panel content is laid out for the 1920×1080 Figma frame. Boxes, icons, spacing and text all shrink
// by PANEL_SIZE_RATIO (Figma's sizes are large for typical screens), while widths and edge margins
// stay at the Figma proportions of the panel: they use `calc(<figma px> * var(--col))`.
// PANEL_MIN_TEXT_PX is the smallest text size shown.
const PANEL_SIZE_RATIO = 0.7;
const PANEL_MIN_TEXT_PX = 12;
const PANEL_STAGE: FitStage = {
  width: 1920 / PANEL_SIZE_RATIO,
  height: 1080 / PANEL_SIZE_RATIO,
  marginX: 0,
  marginY: 0,
  minViewportWidth: 0,
};

// Slanted left edge shared by every panel view (Figma: 118px slant on a 1004px-wide panel)
const PANEL_CLIP = 'polygon(11.74% 0, 100% 0, 100% 100%, 0 100%)';

export default function LoginPanel({ isOpen, onClose, isLoggedIn = false, userInfo = null, onLogin, onLogout }: LoginPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scale = useFitScale(PANEL_STAGE);
  const panelContentStyle = {
    zoom: scale,
    '--col': 1 / PANEL_SIZE_RATIO,
    '--min-text': `${PANEL_MIN_TEXT_PX / scale}px`,
  } as CSSProperties;
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

  const isAccountSubPage = view === 'password' || view === 'users';
  const panelMaxW = view === 'login' ? 'max-w-[52.3%]' : 'max-w-[48.6%]';
  const contentPadding = view === 'login'
    ? { paddingLeft: '23.3%', paddingRight: '15.4%' }
    : { paddingLeft: '11.74%', paddingRight: '3.2%' };

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
        className={`fixed top-0 right-0 z-[61] h-full w-full transition-all duration-500 ease-[cubic-bezier(0.2,1,0.36,1)] ${
          isOpen
            ? `translate-x-0 ${panelMaxW}`
            : `translate-x-full ${panelMaxW}`
        }`}
        style={{
          background: 'var(--bg-paper)',
          boxShadow: 'var(--shadow-float)',
          clipPath: PANEL_CLIP,
        }}
      >
        {/* Left edge shadow */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/5 to-transparent" />

        {/* Close / Back button */}
        <button
          type="button"
          onClick={navigateBack}
          className="absolute top-[calc(84px*var(--col))] right-[calc(81px*var(--col))] z-10 flex h-[30px] w-[30px] items-center justify-center hover:opacity-60 transition-opacity"
          style={panelContentStyle}
          aria-label={isAccountSubPage ? '返回' : '關閉登入'}
        >
          <Image src="/admin/icon-close.svg" alt="" width={30} height={30} />
        </button>

        {/* Content wrapper with crossfade transition */}
        <div
          className="flex h-full flex-col items-center justify-center overflow-y-auto pr-12"
          style={contentPadding}
        >
          <div className={`w-full flex flex-col items-center transition-all duration-200 ease-in-out ${contentOpacity}`} style={panelContentStyle}>

            {/* ===== Login Form ===== */}
            {view === 'login' && (
              <LoginForm
                account={account}
                password={password}
                accountError={accountError}
                passwordError={passwordError}
                onAccountChange={(value) => {
                  setAccount(value);
                  if (accountError) setAccountError('');
                }}
                onPasswordChange={(value) => {
                  setPassword(value);
                  if (passwordError) setPasswordError('');
                }}
                onSubmit={handleSubmit}
              />
            )}

            {/* ===== Post-login Account Home ===== */}
            {view === 'user' && (
              <AccountHome
                userInfo={userInfo}
                onOpenPassword={() => switchView('password')}
                onOpenUsers={() => switchView('users')}
                onLogout={handleLogout}
              />
            )}

            {/* ===== Password Change ===== */}
            {view === 'password' && (
              <ChangePasswordPage
                onSubmit={() => {
                  addToast('success', '密碼已更新！');
                  setTimeout(() => navigateBack(), 800);
                }}
              />
            )}

            {/* ===== User Management (admin only) ===== */}
            {view === 'users' && <UserManagementPage />}

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