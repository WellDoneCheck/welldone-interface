'use client';

import Link from 'next/link';
import '../globals.css';
import { useRouter } from 'next/navigation';
import { Scan, MapPin, History, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  return (
    <>
        <div className="home-container">
            <header className="top-nav">
                <div className="nav-logo">AI水井辨識系統</div>
                <div className="nav-right">
                <a className="nav-link" href="#">關於系統</a>
                <a className="nav-link" href="#">聯絡我們</a>
                <button className="nav-login-btn" onClick={() => router.push('/login')}>
                    登入
                </button>
                </div>
            </header>

            <section className="hero-section">
                <div className="hero-left">
                <div className="hero-tag"><span>AI 智慧辨識技術</span></div>
                <h1 className="hero-title">快速辨識水井位置</h1>
                <p className="hero-desc">
                    運用先進的人工智慧影像辨識技術，快速分析空拍圖像，自動定位並標記水井座標，提升水資源管理效率。
                </p>
                <div className="hero-btns">
                    <Link href="/login">
                        <button className="btn-login">立即登入使用</button>
                    </Link>
                    <button className="btn-learn">了解更多</button>
                </div>
                </div>
                <div className="hero-right">
                <div className="illust-icon">
                    <Scan size={64} style={{ stroke: '#3b82f6' }} />
                </div>
                <div className="illust-label">AI 影像辨識</div>
                <div className="stats-row">
                    <div className="stat-item">
                        <div className="stat-num blue">80.9%</div>
                        <div className="stat-label">辨識準確率</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-num cyan">&lt; 10s</div>
                        <div className="stat-label">平均處理時間</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-num green">5000+</div>
                        <div className="stat-label">已辨識圖片</div>
                    </div>
                </div>
                </div>
            </section>

            <footer className="features-bar">
                <div className="feature-item">
                <Scan size={24} style={{ stroke: '#3b82f6' }} />
                <span>AI 自動辨識水井</span>
                </div>
                <div className="feature-item">
                <MapPin size={24} style={{ stroke: '#06b6d4' }} />
                <span>精準座標定位</span>
                </div>
                <div className="feature-item">
                <History size={24} style={{ stroke: '#22c55e' }} />
                <span>完整辨識紀錄</span>
                </div>
                <div className="feature-item">
                <ShieldCheck size={24} style={{ stroke: '#8b5cf6' }} />
                <span>安全帳號管理</span>
                </div>
            </footer>
            </div>
    </>
  );
}