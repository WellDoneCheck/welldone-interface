'use client';
import Link from 'next/link';
import {
  CircleCheck, FolderOpen, ChevronDown, Upload,
  Play, ImageIcon, FileText, TriangleAlert,
} from 'lucide-react';

const tasks = [
  {
    time: '2026/03/13　23:55:30',
    status: 'done',
    confirm: 'pending',
  },
  {
    time: '2026/03/13　23:55:30',
    status: 'processing',
    progress: 70,
    confirm: 'processing',
  },
  {
    time: '2026/03/13　23:55:30',
    status: 'done',
    confirm: 'pending',
  },
];

const badgeStyles: Record<string, { wrap: string; dot: string }> = {
  green: { wrap: 'bg-emerald-50 dark:bg-[#0a2520] text-green-600 dark:text-[#34d399]', dot: 'bg-green-500 dark:bg-emerald-500' },
  amber: { wrap: 'bg-amber-100 dark:bg-[#221c0a] text-amber-600 dark:text-amber-400', dot: 'bg-amber-500 dark:bg-[#f59e0b]' },
  gray: { wrap: 'bg-slate-100 dark:bg-[#1c2d42] text-slate-500 dark:text-[#b0bfd0]', dot: 'bg-slate-400 dark:bg-[#8899ad]' },
};

export default function Well() {
  return (
    <>
        <div className="flex flex-col gap-2">
            <div className="text-[22px] font-bold text-slate-800 dark:text-[#e2e8f0]">水井辨識</div>
        </div>
        <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[#293d55]"></hr>

        <div className="flex flex-1 min-h-0 w-full justify-between">
            {/* Left: Work Status */}
            <div className="w-[56%] bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)] p-5 flex flex-col gap-[15px] h-auto overflow-y-auto">
            <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-800 dark:text-[#e2e8f0]">工作狀態</span>
                <div className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-[#eef3ff] dark:bg-[#0d2926]">
                <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-emerald-500" />
                <span className="text-xs font-semibold text-blue-500 dark:text-emerald-500">{tasks.length} 項任務</span>
                </div>
            </div>

            <div className="flex items-center py-2 px-3 bg-slate-50 dark:bg-[#131c2b] rounded-lg justify-around w-full">
                <span className="w-auto text-xs font-semibold text-slate-400 dark:text-[#b0bfd0] text-center">任務名稱</span>
                <span className="w-auto text-xs font-semibold text-slate-400 dark:text-[#b0bfd0] text-center">辨識進度</span>
                <span className="w-auto text-xs font-semibold text-slate-400 dark:text-[#b0bfd0] text-center">雙重確認</span>
                <span className="w-auto text-xs font-semibold text-slate-400 dark:text-[#b0bfd0] text-center">操作</span>
            </div>

            {tasks.map((task, i) => (
                <div className="flex items-center justify-between py-3.5 px-3 rounded-[10px] bg-white dark:bg-[#151e2b] border border-slate-100 dark:border-[#263a50]" key={i}>
                <div className="w-[175px] pl-2.5"><span className="text-xs font-semibold text-slate-800 dark:text-[#e2e8f0]">{task.time}</span></div>

                <div className="w-[130px] flex items-center gap-1.5">
                    {task.status === 'done' ? (
                    <div className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-semibold ${badgeStyles.green.wrap}`}>
                      <div className={`w-2 h-2 rounded-full ${badgeStyles.green.dot}`} />已完成
                    </div>
                    ) : (
                    <div className="w-full flex items-center gap-1.5">
                        <div className="w-[60px] h-1.5 bg-slate-200 dark:bg-[#293d55] rounded-full overflow-hidden">
                        <div className="h-1.5 bg-blue-500 dark:bg-emerald-500 rounded-full" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-blue-500 dark:text-emerald-500">{task.progress}%</span>
                    </div>
                    )}
                </div>

                <div className="w-[100px] flex items-center">
                    {task.confirm === 'pending' ? (
                    <div className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-semibold ${badgeStyles.amber.wrap}`}>
                      <div className={`w-2 h-2 rounded-full ${badgeStyles.amber.dot}`} />待確認
                    </div>
                    ) : (
                    <div className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-semibold ${badgeStyles.gray.wrap}`}>
                      <div className={`w-2 h-2 rounded-full ${badgeStyles.gray.dot}`} />辨識中
                    </div>
                    )}
                </div>

                <div className="w-1/5 flex justify-center">
                    {task.status === 'done' && task.confirm === 'pending' ? (
                    <Link href="/well/recognition" className="flex items-center gap-1.5 py-[7px] px-2.5 rounded-lg bg-blue-500 border-0 cursor-pointer transition-[filter] duration-200 no-underline hover:brightness-[1.05]">
                        <CircleCheck size={14} className="text-white" />
                        <span className="text-xs font-semibold text-white">雙重確認</span>
                    </Link>
                    ) : (
                    <span className="text-[13px] text-slate-300 dark:text-[#8899ad]">—</span>
                    )}
                </div>
                </div>
            ))}</div>

            <div className="w-[42%] flex flex-col gap-[15px_10px] h-auto">
                <div className="bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[14px] h-auto shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.145)] p-[15px]">
                    <div className="flex gap-3 py-[15px] px-5">
                        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 bg-blue-500 dark:bg-emerald-500 text-white">1</div>
                        <div className="flex-1 flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">選擇圖片來源</span>
                        <button className="flex items-center gap-2 h-10 px-3.5 bg-[#eef3ff] dark:bg-[#0d2926] rounded-[10px] border-0 cursor-pointer">
                            <FolderOpen size={16} className="text-blue-500 dark:text-emerald-500" />
                            <span className="text-[13px] font-normal text-blue-500 dark:text-emerald-500">選擇圖片資料夾或壓縮檔</span>
                        </button>
                        </div>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-[#293d55]" />
                    <div className="flex gap-3 py-[15px] px-5">
                        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 bg-slate-200 dark:bg-[#293d55] text-slate-500 dark:text-[#b0bfd0]">2</div>
                        <div className="flex-1 flex flex-col gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">選擇合法座標檔案</span>
                        <div className="flex items-center justify-between h-10 px-3.5 bg-white dark:bg-[#151e2b] border border-slate-300 dark:border-[#293d55] rounded-[10px] cursor-pointer">
                            <span className="text-[13px] font-normal text-slate-400 dark:text-[#b0bfd0]">選擇合法座標檔案</span>
                            <ChevronDown size={14} className="text-slate-400 dark:text-[#8899ad]" />
                        </div>
                        <div className="flex items-center gap-2 py-0.5">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs text-slate-400">或</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        <button className="flex items-center gap-2 h-10 px-3.5 bg-white dark:bg-[#151e2b] border border-amber-500 dark:border-amber-400 rounded-[10px] cursor-pointer">
                            <Upload size={14} className="text-amber-500 dark:text-amber-500" />
                            <span className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">匯入合法座標檔案</span>
                        </button>
                        <span className="text-[11px] font-normal text-slate-400 dark:text-[#b0bfd0]">找不到需要的檔案時，可自行上傳座標檔</span>
                        </div>
                    </div>
                    <div className="pt-[5px] px-5 pb-0">
                        <button className="flex items-center justify-center gap-2 h-[46px] w-full bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 rounded-xl border-0 cursor-pointer shadow-[0_3px_10px_rgba(59,130,246,0.19)] dark:shadow-[0_3px_10px_rgba(16,185,129,0.19)] text-[15px] font-bold text-white transition-opacity duration-200 hover:opacity-90">
                            <Play size={16} className="text-white" />
                            <span>開始辨識</span>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-2.5">
                    <div className="flex flex-1 items-center gap-3 py-2.5 px-[15px] rounded-xl shadow-[0_3px_12px_rgba(0,0,0,0.04)] bg-[#f8faff] dark:bg-[#0c1117] border-l-[3px] border-blue-500 dark:border-[#60a5fa]">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#eef3ff] dark:bg-[#0c1a3d]">
                            <ImageIcon size={25} className='text-blue-500 dark:text-[#60a5fa]' />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">支援圖片格式</div>
                            <div className="text-[13px] text-slate-500 dark:text-[#b0bfd0] leading-[1.5]">TIFF 格式</div>
                        </div>
                    </div>
                    <div className="flex flex-1 items-center gap-3 py-2.5 px-[15px] rounded-xl shadow-[0_3px_12px_rgba(0,0,0,0.04)] bg-green-50 dark:bg-[#0b2318] border-l-[3px] border-green-500 dark:border-emerald-500">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-[#0a2520]">
                            <FileText size={25} className='text-green-500 dark:text-emerald-500' />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">座標檔案格式</div>
                            <div className="text-[13px] text-slate-500 dark:text-[#b0bfd0] leading-[1.5]">TFW 格式</div>
                        </div>
                    </div>
                    <div className="flex flex-1 items-center gap-3 py-2.5 px-[15px] rounded-xl shadow-[0_3px_12px_rgba(0,0,0,0.04)] bg-amber-50 dark:bg-[#1a1e0a] border-l-[3px] border-amber-500 dark:border-amber-400">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-100 dark:bg-[#221c0a]">
                            <TriangleAlert size={25} className='text-amber-500' />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">注意事項</div>
                            <div className="text-[13px] text-slate-500 dark:text-[#b0bfd0] leading-[1.5]">資料夾內必須同時有圖片和座標檔，且對應的檔名必須相同</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
}
