'use client';
import Link from 'next/link';
import ImportModal from '@/components/ImportModal';
import { useState } from 'react';

import {
  Plus, ClipboardList, Target, ImageIcon, ShieldCheck,
  Folder, CircleCheck, Loader, Upload, History, Map, Settings
} from 'lucide-react';

const leastData = [
 {time: '2026/03/15  14:32:10', source: 'Batch-2026-03', result: '已辨識', status: 'success'},
 {time: '2026/03/14  09:15:42', source: 'Survey-北區', result: '辨識中', status: 'processing'},
 {time: '2026/03/12  16:48:05', source: 'Batch-2026-02', result: '已辨識', status: 'success'},
];

const statCards = [
  { label: '今日任務', value: '24', icon: ClipboardList, color: 'blue', change: '較昨日 +3', changeColor: 'text-green-500 dark:text-emerald-500' },
  { label: '辨識正確率', value: '97.8%', icon: Target, color: 'green', change: '提升 0.3%', changeColor: 'text-green-500 dark:text-emerald-500' },
  { label: '總辨識圖片', value: '1,286', icon: ImageIcon, color: 'purple', change: '本週新增 358', changeColor: 'text-blue-500 dark:text-emerald-500' },
  { label: '待確認任務', value: '2', icon: ShieldCheck, color: 'amber', change: '需要雙重確認', changeColor: 'text-amber-600 dark:text-amber-400' },
];

const statIconBg: Record<string, string> = {
  blue: 'bg-[#eef3ff] dark:bg-[#0d2926]',
  green: 'bg-emerald-50 dark:bg-[#0a2520]',
  purple: 'bg-violet-50 dark:bg-[#1c1535]',
  amber: 'bg-amber-100 dark:bg-[#221c0a]',
};

const statIconColor: Record<string, string> = {
  blue: 'text-blue-500 dark:text-emerald-500',
  green: 'text-green-500 dark:text-emerald-500',
  purple: 'text-violet-500',
  amber: 'text-amber-500',
};

export default function Dashboard() {
  const [showImport, setShowImport] = useState(false);
    return (
      <>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f8fafc]">歡迎回來，王小明</h1>
            <p className="text-sm text-slate-400 dark:text-[#b0bfd0]">以下是您的系統使用概況</p>
          </div>
          <button
            className="flex items-center gap-2 h-[42px] w-[122px] justify-center px-5 bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 rounded-xl border-0 cursor-pointer shadow-[0_3px_10px_rgba(59,130,246,0.19)] dark:shadow-[0_3px_10px_rgba(16,185,129,0.19)] text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
            onClick={() => setShowImport(true)}
          >
            <Plus className="w-[18px] h-[18px] text-white" />
            <span>開始辨識</span>
          </button>
        </div>
        <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[#293d55]" />

        <div className="flex gap-5">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="flex-1 bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-2xl px-6 py-5 flex flex-col gap-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)]"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-slate-500 dark:text-[#b0bfd0]">{card.label}</span>
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${statIconBg[card.color]}`}>
                    <Icon className={`w-[18px] h-[18px] ${statIconColor[card.color]}`} />
                  </div>
                </div>
                <div className="text-[28px] font-bold text-slate-800 dark:text-[#e2e8f0]">{card.value}</div>
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] ${card.changeColor}`}>{card.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-5 flex-1 min-h-0">

          <div className="flex-1 bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-2xl p-6 flex flex-col gap-4 shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)] overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-800 dark:text-[#e2e8f0]">最近辨識紀錄</span>
              <div className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-[#eef3ff] dark:bg-[#0d2926]">
                <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-emerald-500" />
                <span className="text-xs font-semibold text-blue-500 dark:text-emerald-500">{leastData.length} 筆紀錄</span>
              </div>
            </div>

            {/* <!-- Column Header --> */}
            <div className="flex items-center py-2 px-3 bg-slate-50 dark:bg-[#131c2b] rounded-lg justify-between w-full">
              <span className="w-[120px] text-xs font-semibold text-slate-400 dark:text-[#b0bfd0] text-center">辨識時間</span>
              <span className="w-auto text-xs font-semibold text-slate-400 dark:text-[#b0bfd0] text-center">圖片來源</span>
              <span className="w-[120px] text-xs font-semibold text-slate-400 dark:text-[#b0bfd0] text-center">辨識結果</span>
            </div>

            {leastData.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 px-4 bg-white dark:bg-[#151e2b] rounded-[10px] border border-slate-100 dark:border-[#263a50]">
                  <div className="w-auto text-xs font-semibold text-slate-800 dark:text-[#e2e8f0]">{item.time}</div>
                  <div className="w-[150px] flex items-center">
                    <div className="flex items-center gap-1 py-1 px-2.5 bg-slate-50 dark:bg-[#131c2b] rounded-lg">
                      <Folder className="w-3.5 h-3.5 text-slate-500 dark:text-[#b0bfd0]" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-[#b0bfd0]">{item.source}</span>
                    </div>
                  </div>
                  <div className="w-[90px] flex items-center">
                    <div
                      className={`flex items-center gap-1 py-1 px-2.5 rounded-xl ${
                        item.status === 'success'
                          ? 'bg-emerald-50 dark:bg-[#0a2520]'
                          : 'bg-orange-50 dark:bg-[#221c0a]'
                      }`}
                    >
                      {item.status === 'success' ? (
                        <CircleCheck className="w-3 h-3 text-green-500 dark:text-emerald-500" />
                      ) : (
                        <Loader className="w-3 h-3 text-orange-600 dark:text-orange-500" />
                      )}
                      <span
                        className={`text-[11px] font-semibold ${
                          item.status === 'success'
                            ? 'text-green-600 dark:text-[#34d399]'
                            : 'text-orange-600 dark:text-[#fdba74]'
                        }`}
                      >
                        {item.result}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="w-[300px] min-w-[300px] bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-2xl p-6 flex flex-col gap-4 shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)]">
            <span className="text-[17px] font-extrabold text-slate-800 dark:text-[#e2e8f0] tracking-[0.5px]">快速操作</span>

            <a
              className="flex items-center gap-3 h-12 px-4 rounded-xl cursor-pointer transition-all duration-200 no-underline hover:opacity-85 bg-[#eef3ff] dark:bg-[#0d2926] border-l-[3px] border-blue-500 dark:border-emerald-500"
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-[18px] h-[18px] text-blue-500 dark:text-emerald-500" />
              <span className="text-sm font-semibold text-blue-500 dark:text-emerald-500">上傳圖片辨識</span>
            </a>
            <Link
              className="flex items-center gap-3 h-12 px-4 rounded-xl cursor-pointer transition-all duration-200 no-underline hover:opacity-85 bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55]"
              href="/records"
            >
              <History className="w-[18px] h-[18px] text-slate-500 dark:text-[#b0bfd0]" />
              <span className="text-sm font-normal text-slate-600 dark:text-[#b0bfd0]">查看辨識紀錄</span>
            </Link>
            <Link
              className="flex items-center gap-3 h-12 px-4 rounded-xl cursor-pointer transition-all duration-200 no-underline hover:opacity-85 bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55]"
              href="/map"
            >
              <Map className="w-[18px] h-[18px] text-slate-500 dark:text-[#b0bfd0]" />
              <span className="text-sm font-normal text-slate-600 dark:text-[#b0bfd0]">開啟地圖檢視</span>
            </Link>
            <Link
              className="flex items-center gap-3 h-12 px-4 rounded-xl cursor-pointer transition-all duration-200 no-underline hover:opacity-85 bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55]"
              href="/settings"
            >
              <Settings className="w-[18px] h-[18px] text-slate-500 dark:text-[#b0bfd0]" />
              <span className="text-sm font-normal text-slate-600 dark:text-[#b0bfd0]">帳號設定</span>
            </Link>
          </div>
        </div>
        {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      </>
    );
}
