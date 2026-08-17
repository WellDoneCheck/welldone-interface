'use client';

import {
  X, FolderOpen, ChevronDown, Upload,
  Play, ImageIcon, FileText, TriangleAlert,
} from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
}

export default function ImportModal({ onClose }: ImportModalProps) {
  return (
    <div className="fixed inset-0 w-full h-full bg-black/[0.376] z-[100] flex justify-center pt-[60px]" onClick={onClose}>
      <div className="w-[620px] h-auto bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.19)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-[30px] flex flex-col gap-5 self-start" onClick={(e) => e.stopPropagation()}>

        {/* Steps Section */}
        <div className="flex flex-col">

          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-slate-800 dark:text-[#e2e8f0]">資料匯入</span>
            <button className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#1c2d42] border-0 cursor-pointer flex items-center justify-center" onClick={onClose}>
              <X size={18} className="text-slate-500 dark:text-[#b0bfd0]" />
            </button>
          </div>
          <p className="text-sm font-normal text-[#6b7a90] dark:text-[#b0bfd0]">請依照流程選擇圖像資料與合法座標檔案</p>
          <div className="h-px bg-slate-200 dark:bg-[#293d55]" style={{ margin: '8px 0' }} />

          {/* Step 1 */}
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

          {/* Step 2 */}
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
                <Upload size={14} className="text-amber-500" />
                <span className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">匯入合法座標檔案</span>
              </button>
              <span className="text-[11px] font-normal text-slate-400 dark:text-[#b0bfd0]">找不到需要的檔案時，可自行上傳座標檔</span>
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-[5px] px-5 pb-0">
            <button className="flex items-center justify-center gap-2 h-[46px] w-full bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 rounded-xl border-0 cursor-pointer shadow-[0_3px_10px_rgba(59,130,246,0.19)] dark:shadow-[0_3px_10px_rgba(16,185,129,0.19)] text-[15px] font-bold text-white transition-opacity duration-200 hover:opacity-90">
              <Play size={16} className="text-white" />
              <span>開始辨識</span>
            </button>
          </div>
        </div>

        {/* Guide Section */}
        <div className="flex gap-2.5 items-center">
          <div className="flex flex-1 h-full flex-col items-start gap-1.5 py-3 px-3.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-[#f8faff] dark:bg-[#0c1117] border-l-[3px] border-blue-500 dark:border-[#60a5fa]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#eef3ff] dark:bg-[#0c1a3d]">
              <ImageIcon className="w-5 h-5 text-blue-500 dark:text-[#60a5fa]" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">支援圖片格式</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-[#b0bfd0]">TIFF檔</span>
          </div>
          <div className="flex flex-1 h-full flex-col items-start gap-1.5 py-3 px-3.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-green-50 dark:bg-[#0b2318] border-l-[3px] border-green-500 dark:border-emerald-500">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-[#0a2520]">
              <FileText className="w-5 h-5 text-green-500 dark:text-emerald-500" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">座標檔案格式</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-[#b0bfd0]">TFW檔</span>
          </div>
          <div className="flex flex-1 h-full flex-col items-start gap-1.5 py-3 px-3.5 rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-amber-50 dark:bg-[#1a1e0a] border-l-[3px] border-amber-500 dark:border-amber-400">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-[#221c0a]">
              <TriangleAlert className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">注意事項</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-[#b0bfd0]">
              資料夾內須同時有圖片和座標檔<br />且對應的檔名必須相同
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
