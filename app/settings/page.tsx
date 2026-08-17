'use client';
import { usePathname , useRouter} from 'next/navigation';
import { User, Lock, EyeOff, ShieldAlert, Shield, LogOut } from 'lucide-react';

const iconBg: Record<string, string> = {
  blue: 'bg-[#eef3ff] dark:bg-[#0d2926]',
  amber: 'bg-amber-100 dark:bg-[#2c2612]',
  green: 'bg-emerald-50 dark:bg-[#0a2520]',
};
const iconColor: Record<string, string> = {
  blue: 'text-blue-500 dark:text-emerald-500',
  amber: 'text-amber-600',
  green: 'text-green-500 dark:text-emerald-500',
};

export default function Settings() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    router.push('/');
  }
  return (
    <>
      <div className="text-[22px] font-bold text-slate-800 dark:text-[#e2e8f0]">帳號設定</div>
      <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[#293d55]" />

      <div className="flex gap-6 flex-1">
        <div className="h-min w-1/2 bg-white dark:bg-[#151e2b] dark:border dark:border-[rgba(41,61,85,0.25)] rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)] py-8 px-9 flex flex-col gap-6">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${iconBg.blue}`}>
                <User size={16} className={iconColor.blue} />
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-[#e2e8f0]">用戶資訊</span>
            </div>
            <span className="text-sm font-semibold text-slate-600 dark:text-[#f1f5f9]">用戶名稱</span>
            <div className="h-[46px] bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] rounded-xl flex items-center px-4">
              <span className="text-[15px] font-normal text-slate-600 dark:text-[#b0bfd0]">大學長</span>
            </div>
            <span className="text-sm font-semibold text-slate-600 dark:text-[#f1f5f9]">用戶帳號</span>
            <div className="h-[46px] bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] rounded-xl flex items-center px-4">
              <span className="text-[15px] font-normal text-slate-600 dark:text-[#b0bfd0]">DaxueZhang</span>
            </div>
          </div>
          <div className="h-px bg-[rgba(226,232,240,0.25)] dark:bg-[rgba(61,80,104,0.376)]" />
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${iconBg.amber}`}>
                <Lock size={16} className={iconColor.amber} />
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-[#e2e8f0]">修改密碼</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-[#b0bfd0] w-[100px] shrink-0">原始密碼：</span>
              <div className="flex-1 h-[46px] bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] rounded-xl flex items-center justify-end px-4 relative">
                <input type="password" placeholder="" className="absolute left-4 top-0 bottom-0 right-10 bg-transparent border-0 outline-none text-[15px] text-slate-600 dark:text-[#f1f5f9]" />
                <EyeOff size={18} className="text-slate-400 dark:text-slate-500 cursor-pointer" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-[#b0bfd0] w-[100px] shrink-0">新密碼 ：</span>
              <div className="flex-1 h-[46px] bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] rounded-xl flex items-center justify-end px-4 relative">
                <input type="password" placeholder="" className="absolute left-4 top-0 bottom-0 right-10 bg-transparent border-0 outline-none text-[15px] text-slate-600 dark:text-[#f1f5f9]" />
                <EyeOff size={18} className="text-slate-400 dark:text-slate-500 cursor-pointer" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-[#b0bfd0] w-[100px] shrink-0">確認密碼：</span>
              <div className="flex-1 h-[46px] bg-slate-50 dark:bg-[#131c2b] border border-slate-200 dark:border-[#293d55] rounded-xl flex items-center justify-end px-4 relative">
                <input type="password" placeholder="" className="absolute left-4 top-0 bottom-0 right-10 bg-transparent border-0 outline-none text-[15px] text-slate-600 dark:text-[#f1f5f9]" />
                <EyeOff size={18} className="text-slate-400 dark:text-slate-500 cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="flex-1 h-[50px] bg-white dark:bg-[#151e2b] border-[1.5px] border-slate-200 dark:border-[#293d55] rounded-[14px] text-[15px] font-semibold text-slate-500 dark:text-[#b0bfd0] cursor-pointer transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-[#1c2d42]">取消</button>
            <button className="flex-1 h-[50px] border-0 rounded-[14px] bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 shadow-[0_4px_12px_rgba(59,130,246,0.19)] dark:shadow-[0_4px_14px_rgba(16,185,129,0.19)] text-base font-semibold text-white cursor-pointer transition-all duration-200 hover:brightness-[1.2]">確認修改</button>
          </div>
        </div>

        <div className="w-1/2 flex flex-col gap-4">
          <div className="bg-amber-50 dark:bg-[#1f2612] border border-[rgba(254,240,138,0.376)] dark:border-[rgba(254,240,138,0.25)] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.125)] py-6 px-7 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-amber-100 dark:bg-[#2c2612]">
                <ShieldAlert size={18} className="text-amber-600" />
              </div>
              <span className="text-base font-bold text-amber-800 dark:text-amber-400">密碼安全建議</span>
            </div>
            <div className="h-px bg-[rgba(254,240,138,0.25)]" />
            {[
              '密碼長度建議至少 8 個字元',
              '包含大小寫英文字母、數字及特殊符號',
              '避免使用與帳號相同的密碼',
              '定期更換密碼以確保帳號安全',
              '不要與他人共用密碼',
              '請記好自己的帳密，若忘記密碼請找管理員恢復預設',
            ].map((text, i) => (
              <div className="flex items-start gap-2.5" key={i}>
                <div className="w-[22px] h-[22px] min-w-[22px] rounded-md bg-amber-100 dark:bg-[#2c2612] flex items-center justify-center text-[11px] font-bold text-amber-600 dark:text-amber-400">{i + 1}</div>
                <span className="text-[13px] font-normal text-amber-700 dark:text-amber-300 leading-[1.5]">{text}</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#151e2b] border border-slate-200 dark:border-[#293d55] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.125)] py-5 px-6 flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${iconBg.green}`}>
                <Shield size={16} className={iconColor.green} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">帳號安全狀態</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#131c2b] rounded-[10px] py-2.5 px-3.5">
              <div className="w-3 h-3 rounded-[6px] shrink-0 bg-green-500 dark:bg-emerald-500" />
              <span className="text-[13px] font-normal text-slate-600 dark:text-[#b0bfd0]">密碼強度：強</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#131c2b] rounded-[10px] py-2.5 px-3.5">
              <div className="w-3 h-3 rounded-[6px] shrink-0 bg-green-500 dark:bg-emerald-500" />
              <span className="text-[13px] font-normal text-slate-600 dark:text-[#b0bfd0]">上次登入：2026/03/14 14:32</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#131c2b] rounded-[10px] py-2.5 px-3.5">
              <div className="w-3 h-3 rounded-[6px] shrink-0 bg-amber-500" />
              <span className="text-[13px] font-normal text-amber-600 dark:text-amber-400">密碼已 30 天未更換</span>
            </div>
          </div>
          <button
            className="flex items-center justify-center gap-2 mx-3 mb-3 py-2.5 px-5 rounded-[10px] border border-slate-200 dark:border-[#293d55] bg-white dark:bg-[#151e2b] cursor-pointer text-sm text-red-500 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-[#221414]"
            onClick={handleLogout}
          >
              <LogOut size={18} />
              <span>登出</span>
            </button>
        </div>
      </div>
    </>
  );
}
