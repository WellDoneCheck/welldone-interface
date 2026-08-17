'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Scan, History, Map,
  User, UserRoundPen, Menu, PanelLeftOpen,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: '首頁', href: '/dashboard' },
  { icon: Scan, label: '水井辨識', href: '/well' },
  { icon: History, label: '辨識紀錄', href: '/records' },
  { icon: Map, label: '地圖檢視', href: '/map' },
  { icon: UserRoundPen, label: '用戶管理', href: '/users', adminOnly: true },
];
const account = true;

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={`flex flex-col h-full bg-white dark:bg-[#151e2b] dark:border-r dark:border-[#1a2838] shadow-[2px_0_12px_rgba(0,0,0,0.05)] dark:shadow-[3px_0_16px_rgba(0,0,0,0.125)] z-10 ${
        collapsed ? 'w-[72px] min-w-[72px]' : 'w-1/6'
      }`}
    >
      <div className={collapsed ? 'pt-6 px-3 pb-5' : 'pt-6 px-6 pb-5'}>
        {!collapsed && (
          <div className="text-lg font-bold bg-linear-to-b dark:bg-linear-to-r from-blue-500 dark:from-emerald-500 to-cyan-500 dark:to-emerald-600 bg-clip-text text-transparent">
            AI水井辨識系統
          </div>
        )}
      </div>
      <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[rgba(26,40,56,0.25)]" />

      <div className="flex flex-col gap-1 py-4 px-3">
        {navItems
          .filter((item) => !item.adminOnly || account)
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : ''}
                className={`flex items-center gap-3 h-[42px] rounded-[10px] transition-all duration-200 no-underline ${
                  collapsed ? 'justify-center px-3' : 'px-4'
                } ${
                  isActive
                    ? 'bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 shadow-[0_2px_8px_rgba(59,130,246,0.19)] dark:shadow-[0_2px_8px_rgba(16,185,129,0.19)]'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700/20'
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-white' : 'text-slate-500 dark:text-[#b0bfd0]'}
                />
                {!collapsed && (
                  <span
                    className={
                      isActive
                        ? 'text-base font-semibold text-white'
                        : 'text-base font-normal text-slate-500 dark:text-[#b0bfd0]'
                    }
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
      </div>

      <div className="flex-1" />

      <div className={`flex items-center relative z-[1] ${collapsed ? 'flex-col gap-1' : 'gap-3'}`}>
        <Link
          href="/settings"
          className={`flex items-center gap-3 py-3.5 mx-3 mb-3 rounded-[10px] bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] no-underline w-[70%] ${
            collapsed ? 'justify-center px-0' : 'px-5'
          }`}
        >
          <User className="w-5 h-5 text-slate-600 dark:text-[#b0bfd0]" />
          {!collapsed && <span className="text-sm text-slate-600 dark:text-[#b0bfd0]">王小明</span>}
        </Link>
        <button
          className="w-10 h-10 mx-3 mb-3 rounded-[10px] bg-slate-100 dark:bg-white/[0.06] border-0 cursor-pointer flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all duration-150 shrink-0 hover:bg-white/10 hover:text-slate-200"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展開側欄' : '收起側欄'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </nav>
  );
}
