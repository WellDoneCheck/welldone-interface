'use client';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();

  function handleLogin() {
    router.push('/dashboard');
  }
    return (
        <>
            <div className="w-[580px] min-w-[580px] h-screen bg-linear-to-br dark:bg-linear-to-tl from-cyan-500 dark:from-emerald-500 to-blue-500 dark:to-emerald-600 flex flex-col justify-center items-center px-[60px] gap-6">
                <div className="text-white text-[42px] font-bold text-center">AI水井辨識系統</div>
                <div className="text-white/80 dark:text-[#e2e8f0] text-xl font-normal text-center">智慧辨識，精準定位</div>
            </div>
            <div className="flex-1 h-screen bg-white dark:bg-[#151e2b] flex flex-col justify-center items-center">
                <div className="w-[400px] flex flex-col gap-6">
                <div className="text-[#1f2d3d] dark:text-[#f1f5f9] text-[32px] font-bold">用戶登入</div>
                <div className="text-[#6b7a90] dark:text-[#b0bfd0] text-base font-normal -mt-4">若忘記帳號或密碼請找管理員</div>

                <div className="flex flex-col gap-5">
                    <label className="text-[#475569] dark:text-[#f1f5f9] text-sm font-semibold">帳號</label>
                    <input
                      type="text"
                      className="w-full h-12 bg-slate-50 dark:bg-[#131c2b] border border-[#c9d6ff] dark:border-[rgba(41,61,85,0.5)] rounded-[10px] px-4 text-base text-[#1f2d3d] dark:text-[#f1f5f9] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#a0aec0] dark:placeholder:text-[#b0bfd0] placeholder:font-normal focus:border-blue-500 dark:focus:border-[rgba(16,185,129,0.5)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                      placeholder="請輸入帳號"
                    />

                    <label className="text-[#475569] dark:text-[#f1f5f9] text-sm font-semibold">密碼</label>
                    <input
                      type="password"
                      className="w-full h-12 bg-slate-50 dark:bg-[#131c2b] border border-[#c9d6ff] dark:border-[rgba(41,61,85,0.5)] rounded-[10px] px-4 text-base text-[#1f2d3d] dark:text-[#f1f5f9] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#a0aec0] dark:placeholder:text-[#b0bfd0] placeholder:font-normal focus:border-blue-500 dark:focus:border-[rgba(16,185,129,0.5)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                      placeholder="請輸入密碼"
                    />
                </div>

                <button
                  className="w-full h-12 bg-blue-500 dark:bg-linear-to-b dark:from-emerald-500 dark:to-emerald-600 border-0 rounded-[10px] text-white text-lg font-bold cursor-pointer transition-[background-color,transform] duration-200 shadow-none hover:bg-blue-600 active:scale-[0.98]"
                  onClick={handleLogin}
                >
                    登入
                </button>
                </div>
            </div>
        </>
    );
}
