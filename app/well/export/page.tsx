'use client';
import { Download } from 'lucide-react';

const gridItems = [
  { label: 'DRONE_00045.jpg' },
  { label: 'DRONE_00046.jpg' },
  { label: 'DRONE_00047.jpg' },
  { label: 'DRONE_00048.jpg' },
  { label: 'DRONE_00049.jpg' },
  { label: 'DRONE_00050.jpg' },
];

function GridCard({ title }: { title: string }) {
  return (
    <div className="bg-white dark:bg-[#151e2b] dark:border dark:border-[rgba(41,61,85,0.25)] rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)] p-6 flex flex-col gap-4">
      <div className="text-xl font-bold text-slate-800 dark:text-[#e2e8f0]">{title}</div>
      <div className="flex gap-6 py-3 px-4 flex-wrap">
        {gridItems.map((item, i) => (
        <div className="flex flex-col items-center gap-2" key={i}>
            <div className="w-[120px] h-[120px] bg-slate-200 dark:bg-[#1c2d42] dark:border dark:border-[rgba(41,61,85,0.376)] rounded-lg" />
            <span className="text-[11px] font-normal text-slate-500 dark:text-[#b0bfd0]">{item.label}</span>
        </div>
        ))}
      </div>
    </div>
  );
}

export default function Export() {
    return (
        <>
            <div className="text-[22px] font-bold text-slate-800 dark:text-[#e2e8f0]">資料匯出</div>
            <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[#293d55]"></hr>
            <div className="flex items-center justify-end gap-[30px] w-full">
                <button className="flex items-center gap-2 py-2.5 px-5 rounded-[10px] bg-linear-to-b from-amber-500 to-amber-600 shadow-[0_3px_10px_rgba(245,158,11,0.19)] border-0 cursor-pointer transition-[filter] duration-200 hover:brightness-[1.05]">
                    <Download size={18} className="text-white" />
                    <span className="text-sm font-semibold text-white">匯出壓縮資料夾</span>
                </button>
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[13px] font-normal text-slate-500">未登記：5 口</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[13px] font-normal text-slate-500">已登記：5 口</span>
                    </div>
                </div>
            </div>

            <GridCard title="資料夾中所有的未登記水井座標" />
            <GridCard title="資料夾中所有的已登記水井座標" />
            <GridCard title="辨識錯誤的圖片" />
        </>
    );
}
