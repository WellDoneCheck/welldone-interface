'use client';

import { useState } from 'react';

import {
  Info, FileUp, User, IdCard, Table, Upload,
  FileSpreadsheet,
} from 'lucide-react';

const tabs = ['用戶列表', '新增用戶'];
const users = [
    { name: '王小明', account: 'WangXiaoMing' },
    { name: '李小華', account: 'LiXiaoHua' },
    { name: '張大同', account: 'ZhangDaTong' },
];

const mockCsvData = [
  { name: '水利署', account: 'DavidGuang' },
  { name: '許大伯', account: 'FolkartMaster' },
];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('用戶列表');

  const [csvData, setCsvData] = useState<{ name: string; account: string }[]>([]);

  function handleImportCsv() {
    // 之後換成真正的檔案讀取邏輯
    setCsvData(mockCsvData);
  }

  function handleBatchImport() {
    // 之後接 API 送出資料
    alert('匯入成功！');
    setCsvData([]);
  }
  return (
    <>
        <div className="text-[22px] font-bold text-slate-800 dark:text-[#e2e8f0]">用戶管理</div>
        <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[#293d55]" />
        <div className="flex w-full border-b border-slate-200 dark:border-[#293d55]">
        {tabs.map((tab) => (
            <div
            key={tab}
            className={`py-2.5 px-6 text-sm cursor-pointer transition-all duration-200 ${
              activeTab === tab
                ? 'text-blue-500 dark:text-emerald-500 font-normal border-b-2 border-blue-500 dark:border-emerald-500 -mb-px'
                : 'text-slate-400 dark:text-[#b0bfd0] font-semibold'
            }`}
            onClick={() => setActiveTab(tab)}
            >
            {tab}
            </div>
        ))}
        </div>

        {/* 根據選中的 tab 顯示不同內容 */}
        {activeTab === '用戶列表' && (
            <div className="bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.145)] py-6 px-8 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-800 dark:text-[#e2e8f0]">現有用戶列表</span>
                    <span className="text-base font-bold text-[#5f6875] dark:text-[#b0bfd0]">預設密碼皆為：abcde12345</span>
                </div>
                <div className="h-4"></div>

                <div className="flex items-center h-11 px-5 bg-[#eef3ff] dark:bg-[#0d2926] rounded-t-[10px]">
                    <div className="flex-1 text-sm font-bold text-blue-500 dark:text-emerald-500">用戶名稱</div>
                    <div className="flex-1 text-sm font-bold text-blue-500 dark:text-emerald-500">用戶帳號</div>
                    <div className="w-[160px] text-sm font-bold text-blue-500 dark:text-emerald-500 text-center">操作</div>
                </div>

                <div>
                    {users.map((user, index) => (
                        <div key={index} className="flex items-center h-12 px-5 border-b border-slate-200 dark:border-[#293d55] last:border-b-0 hover:bg-slate-100 dark:hover:bg-[#131c2b]">
                            <div className="flex-1 text-sm font-normal text-slate-800 dark:text-[#e2e8f0]">{user.name}</div>
                            <div className="flex-1 text-sm font-normal text-slate-800 dark:text-[#e2e8f0]">{user.account}</div>
                            <div className="w-[160px] flex justify-center gap-3">
                                <button className="py-[5px] px-3 rounded-md bg-orange-50 dark:bg-[#221c0a] border border-[rgba(245,158,11,0.25)] dark:border-[rgba(251,191,36,0.375)] text-xs font-semibold text-amber-600 dark:text-amber-400 cursor-pointer transition-all duration-200 hover:bg-amber-100 dark:hover:bg-[#2c2612]">重設密碼</button>
                                <button className="py-[5px] px-3 rounded-md bg-red-100 dark:bg-[#220a0a] border border-[rgba(239,68,68,0.25)] dark:border-[rgba(251,36,36,0.375)] text-xs font-semibold text-[#d90606] dark:text-[#fb2424] cursor-pointer transition-all duration-200 hover:bg-[#fac9c9] dark:hover:bg-[#2c1212]">刪除用戶</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === '新增用戶' && (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2.5 py-2.5 px-4 bg-amber-50 dark:bg-[#1a1e0a] border border-amber-100 dark:border-[#3d3518] rounded-[10px]">
                    <Info size={18} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-400">預設密碼皆為：abcde12345</span>
                </div>

                <div className="flex justify-end">
                    <button className="flex items-center gap-2 py-3 px-6 rounded-xl border-0 bg-linear-to-b from-green-500 to-green-600 shadow-[0_4px_12px_rgba(34,197,94,0.19)] cursor-pointer transition-all duration-200 hover:brightness-[1.05]" onClick={handleImportCsv}>
                        <FileUp size={18} className="text-white" />
                        <span className="text-white text-sm font-semibold">匯入 CSV 檔案</span>
                    </button>
                </div>

                <div className="flex gap-6 flex-1">
                    {/* Single User Form */}
                    <div className="w-[45%] bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)] py-7 px-8 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#ebf5ff] dark:bg-[#0e2920] flex items-center justify-center shrink-0">
                                <User size={22} className="text-blue-500 dark:text-emerald-500" />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <div className="text-[22px] font-bold text-slate-800 dark:text-[#e2e8f0]">個人帳號</div>
                                <div className="text-[13px] font-normal text-slate-400 dark:text-[#b0bfd0] mt-0">輸入新用戶的基本資料</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-600 dark:text-[#f1f5f9]">用戶名稱</label>
                            <div className="flex items-center gap-2.5 h-11 bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] rounded-lg px-3.5">
                                <User size={16} className="text-slate-400 dark:text-[#8899ad] shrink-0" />
                                <input type="text" placeholder="請輸入用戶名稱" className="flex-1 border-0 outline-none bg-transparent text-sm text-slate-800 dark:text-[#e2e8f0] placeholder:text-slate-400 placeholder:font-normal" />
                            </div>
                            <span className="text-xs font-normal text-slate-400 dark:text-[#b0bfd0]">請輸入實際姓名</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-600 dark:text-[#f1f5f9]">用戶帳號</label>
                            <div className="flex items-center gap-2.5 h-11 bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] rounded-lg px-3.5">
                                <IdCard size={16} className="text-slate-400 dark:text-[#8899ad] shrink-0" />
                                <input type="text" placeholder="請輸入用戶帳號" className="flex-1 border-0 outline-none bg-transparent text-sm text-slate-800 dark:text-[#e2e8f0] placeholder:text-slate-400 placeholder:font-normal" />
                            </div>
                            <span className="text-xs font-normal text-slate-400 dark:text-[#b0bfd0]">帳號將用於系統登入</span>
                        </div>
                        <div className="flex gap-4">
                            <button className="flex-1 h-[50px] bg-white dark:bg-[#151e2b] border-[1.5px] border-slate-200 dark:border-[#293d55] rounded-[14px] text-[15px] font-semibold text-slate-500 dark:text-[#b0bfd0] cursor-pointer transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-[#1c2d42]">取消</button>
                            <button className="flex-1 h-12 border-0 rounded-[10px] bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 shadow-[0_3px_10px_rgba(59,130,246,0.19)] dark:shadow-[0_3px_10px_rgba(16,185,129,0.19)] text-base font-bold text-white cursor-pointer transition-all duration-200 hover:brightness-[1.05]">新增帳號</button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)] py-7 px-8 flex flex-col gap-2.5 justify-start">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-[10px] bg-emerald-50 dark:bg-[#0a2520] flex items-center justify-center shrink-0">
                            <Table size={18} className="text-green-500 dark:text-emerald-500" />
                            </div>
                            <div className="text-lg font-bold text-slate-800 dark:text-[#e2e8f0]">CSV匯入資料預覽</div>
                            <div className={`flex items-center gap-1 py-1 px-3 rounded-full ${csvData.length === 0 ? 'bg-slate-100 dark:bg-[#1c2d42]' : 'bg-emerald-50 dark:bg-[#0a2520]'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${csvData.length === 0 ? 'bg-slate-400 dark:bg-[#8899ad]' : 'bg-green-500 dark:bg-emerald-500'}`} />
                            <span className={`text-[11px] font-semibold ${csvData.length === 0 ? 'text-slate-400 dark:text-[#b0bfd0]' : 'text-green-600 dark:text-[#059669]'}`}>{csvData.length} 筆資料</span>
                            </div>
                        </div>
                        {csvData.length === 0 ? (
                            <>
                            {/* 匯入前 */}
                            <div className="text-xs font-normal text-slate-400 dark:text-[#b0bfd0]">匯入 CSV 檔案以批次新增用戶帳號</div>
                            <div className="w-full pt-4">
                                <button className="w-full h-11 border-0 rounded-xl bg-slate-200 dark:bg-[#293d55] flex items-center justify-center gap-1.5 cursor-not-allowed" disabled>
                                <Upload size={16} className="text-slate-400 dark:text-[#8899ad]" />
                                <span className="text-slate-400 dark:text-[#b0bfd0] text-sm font-semibold">尚無資料可匯入</span>
                                </button>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-4 py-8 px-6 w-full">
                                <div className="w-[72px] h-[72px] rounded-full bg-slate-100 dark:bg-[#1c2d42] flex items-center justify-center">
                                <FileSpreadsheet size={32} className="text-slate-400 dark:text-[#8899ad]" />
                                </div>
                                <div className="text-base font-semibold text-slate-600 dark:text-[#b0bfd0]">尚未匯入資料</div>
                                <div className="text-[13px] text-slate-400 dark:text-[#b0bfd0]">請點擊上方「匯入CSV」按鈕選擇檔案</div>
                            </div>
                            </>
                        ) : (
                            <>
                            {/* 匯入後 */}
                            <div className="text-xs font-normal text-slate-400 dark:text-[#b0bfd0]">預覽匯入的用戶資料，確認無誤後點擊批次匯入</div>
                            <div className="border border-slate-200 dark:border-[rgba(41,61,85,0.375)] rounded-xl overflow-hidden">
                                <div className="flex h-11 bg-slate-100 dark:bg-[#131c2b] px-4">
                                <div className="flex-1 flex items-center text-[13px] font-semibold text-slate-600 dark:text-[#b0bfd0]">用戶名稱</div>
                                <div className="flex-1 flex items-center text-[13px] font-semibold text-slate-600 dark:text-[#b0bfd0]">用戶帳號</div>
                                </div>
                                {csvData.map((row, i) => (
                                <div
                                  className={`flex h-11 px-4 ${i < csvData.length - 1 ? 'border-b border-slate-200 dark:border-[#293d55]' : ''} ${i % 2 === 1 ? 'bg-slate-50 dark:bg-[#131c2b]' : ''}`}
                                  key={i}
                                >
                                    <div className="flex-1 flex items-center text-[13px] font-normal text-slate-800 dark:text-[#e2e8f0]">{row.name}</div>
                                    <div className="flex-1 flex items-center text-[13px] font-normal text-slate-800 dark:text-[#e2e8f0]">{row.account}</div>
                                </div>
                                ))}
                            </div>
                            <div className="w-full pt-4">
                                <button className="w-full h-11 border-0 rounded-xl bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 shadow-[0_3px_10px_rgba(59,130,246,0.19)] dark:shadow-[0_3px_12px_rgba(16,185,129,0.19)] flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:brightness-[1.05]" onClick={handleBatchImport}>
                                <Upload size={16} className="text-white" />
                                <span className="text-white text-sm font-semibold">批次匯入帳號</span>
                                </button>
                            </div>
                            </>
                        )}
                    </div>

                </div>
            </div>
        )}
    </>
  );
}
