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
    <nav className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="logo-area">
        {!collapsed && <div className="logo-text">AI水井辨識系統</div>}
      </div>
      <hr className="sidebar-divider" />

      <div className="nav-group">
        {navItems
          .filter((item) => !item.adminOnly || account)
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <span className="nav-icon"><Icon size={20} /></span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            );
          })}
      </div>

      <div className="spacer" />

      <div className="v-bottom">
        <Link href="/settings" className="account-bar" style={{ textDecoration: 'none' }}>
          <User className="acc-icon" />
          {!collapsed && <span>王小明</span>}
        </Link>
        <button
          className="v-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展開側欄' : '收起側欄'}
        >
          {collapsed ? <PanelLeftOpen className="acc-icon" /> : <Menu className="acc-icon" />}
        </button>
      </div>
    </nav>
  );
}