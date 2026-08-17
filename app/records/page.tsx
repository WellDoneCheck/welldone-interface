'use client';
import { Download } from 'lucide-react';

const records = [
  { date: '2026/02/15 21:26:55', registered: 5, unregistered: 3 },
  { date: '2026/02/14 14:32:10', registered: 8, unregistered: 2 },
  { date: '2026/02/13 09:15:42', registered: 12, unregistered: 0 },
];
export default function Records() {
    return (
        <>
            <div className="text-[22px] font-bold text-slate-800 dark:text-[#e2e8f0]">辨識紀錄</div>
            <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[#293d55]"/>
            <div className="bg-white dark:bg-[#151e2b] dark:border dark:border-[rgba(41,61,85,0.25)] rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)] p-7 flex flex-col gap-5 overflow-y-auto">
                {records.map((record, i) => (
                    <div className="flex items-center py-4 px-5 bg-[#f4f7ff] dark:bg-[#111d28] rounded-[10px] border border-slate-200 dark:border-[rgba(30,58,48,0.5)] transition-colors duration-150 hover:bg-[#eef2ff]" key={i}>
                        <div className={`w-3 h-3 rounded-[6px] shrink-0 ${record.unregistered > 0 ? 'bg-red-500' : 'bg-green-500 dark:bg-emerald-500'}`} />
                        <div className="flex items-center gap-4 px-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-800 dark:text-[#e2e8f0] whitespace-nowrap">{record.date}</span>
                        <span className="text-sm font-normal text-slate-500 dark:text-[#b0bfd0] whitespace-nowrap">
                            已登記：{record.registered}個 | 未登記：{record.unregistered}個
                        </span>
                        </div>
                        <button className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-yellow-400 border-0 cursor-pointer transition-all duration-200 shrink-0 hover:bg-yellow-500">
                        <Download size={14} className="text-black" />
                        <span className="text-black text-[13px] font-medium">匯出壓縮資料夾</span>
                        </button>
                    </div>
                    ))}
            </div>
        </>
    );
}
