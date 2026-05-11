'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard,
  Scan,
  History,
  Map,
  User,
  UserRoundPen,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: '首頁',href: '/dashboard'},
  { icon: Scan, label: '水井辨識',href: '/well'},
  { icon: History, label: '辨識紀錄',href: '/records' },
  { icon: Map, label: '地圖檢視',href: '/map'},
  { icon: UserRoundPen, label: '用戶管理',href: '/users', adminOnly: true },
];
const account = true;

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="sidebar">
      <div className="logo-area">
        <div className="logo-text">AI水井辨識系統</div>
      </div>
      <hr className="sidebar-divider" />

      <div className="nav-group">
        {navItems
        .filter((item) => !item.adminOnly || account)
        .map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/'); // 自動比對
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon size={20} /></span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="spacer" />

      <Link href="/settings" className="account-bar" style={{ textDecoration: 'none' }}>
        <User className="w-5 h-5 text-slate-600" />
        <span className="text-sm text-slate-600">王小明</span>
      </Link>
      
    </nav>
  );
}
