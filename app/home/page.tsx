'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scan, MapPin, History, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  return (
    <>
        <div className="flex flex-col h-screen w-full">
            <header className="w-full h-16 bg-white dark:bg-[#151e2b] flex items-center justify-between px-12 shadow-[0_1px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.125)] shrink-0 z-10">
                <div className="text-[22px] font-bold bg-linear-to-b from-blue-500 dark:from-emerald-500 to-cyan-500 bg-clip-text text-transparent">AI水井辨識系統</div>
                <div className="flex items-center gap-[30px]">
                <a className="text-sm font-normal text-slate-500 dark:text-[#b0bfd0] no-underline cursor-pointer hover:text-blue-500 dark:hover:text-emerald-500" href="#">關於系統</a>
                <a className="text-sm font-normal text-slate-500 dark:text-[#b0bfd0] no-underline cursor-pointer hover:text-blue-500 dark:hover:text-emerald-500" href="#">聯絡我們</a>
                <button
                  className="bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 text-white text-sm font-semibold py-2 px-5 rounded-lg border-0 cursor-pointer transition-opacity duration-200 dark:shadow-[0_2px_8px_rgba(16,185,129,0.19)] hover:opacity-90"
                  onClick={() => router.push('/login')}
                >
                    登入
                </button>
                </div>
            </header>

            <section className="flex-1 flex items-center justify-center gap-20 px-20 bg-linear-to-b from-[#f8faff] via-[#eef3ff] to-[#e0ecff] dark:from-[#111827] dark:via-[#172033] dark:to-[#1e293b]">
                <div className="flex flex-col gap-6 w-1/2">
                <div className="inline-flex self-start py-1.5 px-4 bg-[#eef3ff] dark:bg-[#0d2926] rounded-full border border-[rgba(59,130,246,0.19)] dark:border-[rgba(16,185,129,0.19)]">
                  <span className="text-[13px] font-semibold text-blue-500 dark:text-emerald-500">AI 智慧辨識技術</span>
                </div>
                <h1 className="text-[40px] font-bold text-slate-900 dark:text-[#f8fafc] leading-[1.3]">快速辨識水井位置</h1>
                <p className="text-base font-normal text-slate-500 dark:text-[#b0bfd0] leading-[1.7] max-w-[460px]">
                    運用先進的人工智慧影像辨識技術，快速分析空拍圖像，自動定位並標記水井座標，提升水資源管理效率。
                </p>
                <div className="flex items-center gap-4">
                    <Link href="/login">
                        <button className="py-3.5 px-8 bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 rounded-[10px] border-0 cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.25)] dark:shadow-[0_4px_12px_rgba(16,185,129,0.25)] text-base font-bold text-white transition-opacity duration-200 hover:opacity-90">立即登入使用</button>
                    </Link>
                    <button className="py-3.5 px-8 bg-white dark:bg-[#151e2b] rounded-[10px] border border-slate-200 dark:border-[rgba(41,61,85,0.5)] cursor-pointer text-base font-semibold text-slate-600 dark:text-[#b0bfd0] transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-[#1c2d42]">了解更多</button>
                </div>
                </div>
                <div className="w-[420px] h-[380px] bg-white dark:bg-[#151e2b] dark:border dark:border-[rgba(16,185,129,0.08)] rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.145)] flex flex-col items-center justify-center gap-5">
                <div>
                    <Scan size={64} className="text-blue-500" />
                </div>
                <div className="text-lg font-bold text-slate-700 dark:text-slate-300">AI 影像辨識</div>
                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[28px] font-bold text-blue-500 dark:text-emerald-500">80.9%</div>
                        <div className="text-[13px] font-normal text-slate-500 dark:text-[#b0bfd0]">辨識準確率</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[28px] font-bold text-cyan-500 dark:text-cyan-400">&lt; 10s</div>
                        <div className="text-[13px] font-normal text-slate-500 dark:text-[#b0bfd0]">平均處理時間</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[28px] font-bold text-green-500 dark:text-emerald-500">5000+</div>
                        <div className="text-[13px] font-normal text-slate-500 dark:text-[#b0bfd0]">已辨識圖片</div>
                    </div>
                </div>
                </div>
            </section>

            <footer className="w-full h-[100px] bg-white dark:bg-[#151e2b] border-t border-slate-100 dark:border-[#1e3a30] flex items-center justify-around px-20 shrink-0">
                <div className="flex items-center gap-3">
                <Scan size={24} className="text-blue-500" />
                <span className="text-sm font-semibold text-slate-600 dark:text-[#b0bfd0]">AI 自動辨識水井</span>
                </div>
                <div className="flex items-center gap-3">
                <MapPin size={24} className="text-cyan-500" />
                <span className="text-sm font-semibold text-slate-600 dark:text-[#b0bfd0]">精準座標定位</span>
                </div>
                <div className="flex items-center gap-3">
                <History size={24} className="text-green-500" />
                <span className="text-sm font-semibold text-slate-600 dark:text-[#b0bfd0]">完整辨識紀錄</span>
                </div>
                <div className="flex items-center gap-3">
                <ShieldCheck size={24} className="text-violet-500" />
                <span className="text-sm font-semibold text-slate-600 dark:text-[#b0bfd0]">安全帳號管理</span>
                </div>
            </footer>
            </div>
    </>
  );
}
