'use client';
import { useRouter } from 'next/navigation';
import { MapPin, Timer, Target, Layers, List, X, Check } from 'lucide-react';

const recognitionData = {
    coordinates: 'N 23.456782, E 120.345672',
    time: '2024/12/15 14:32:08',
    confidence: '92.7%',
    image: 'DRONE_00045.jpg',
    wellType: '圓井',
};

const iconWrapBg: Record<string, string> = {
  blue: 'bg-[#eef3ff] dark:bg-[#0c1a3d]',
  green: 'bg-emerald-50 dark:bg-[#0a2520]',
  amber: 'bg-amber-100 dark:bg-[#221c0a]',
  red: 'bg-red-50 dark:bg-[#221414]',
  purple: 'bg-[#f0f2ff] dark:bg-[#1c1535]',
};
const iconWrapColor: Record<string, string> = {
  blue: 'text-blue-500 dark:text-[#60a5fa]',
  green: 'text-green-500 dark:text-emerald-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
  purple: 'text-[#4643f0] dark:text-violet-500',
};

export default function Recognition() {
    const router = useRouter();
    const stats: { label: string; value: string; color: keyof typeof iconWrapBg; icon: typeof MapPin }[] = [
      { label: '座標位置', value: recognitionData.coordinates, color: 'blue', icon: MapPin },
      { label: '辨識時間', value: recognitionData.time, color: 'green', icon: Timer },
      { label: '辨識信心度', value: recognitionData.confidence, color: 'amber', icon: Target },
      { label: '圖片資訊', value: recognitionData.image, color: 'red', icon: Layers },
      { label: '水井類型', value: recognitionData.wellType, color: 'purple', icon: List },
    ];
    return (
        <>
            <div className="text-[22px] font-bold text-slate-800 dark:text-[#e2e8f0]">比對辨識結果</div>
            <hr className="border-0 border-b border-[rgba(0,0,0,0.125)] dark:border-[#293d55]" />
            <div className="flex gap-5 w-full">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div className="w-1/5 flex-1 flex items-center gap-2.5 p-[13px] bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.145)]" key={stat.label}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconWrapBg[stat.color]}`}>
                            <Icon size={20} className={iconWrapColor[stat.color]} />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[13px] font-normal text-slate-500 dark:text-[#b0bfd0]">{stat.label}</span>
                            <span className="text-[13.5px] font-semibold text-slate-800 dark:text-[#e2e8f0]">{stat.value}</span>
                        </div>
                    </div>
                  );
                })}
            </div>

            <div className="h-full flex justify-center">
                <div className="flex gap-5 w-auto items-center">
                    <div className="flex-1 h-full bg-white dark:bg-[#151e2b] dark:border dark:border-[#293d55] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.063)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.145)] p-[15px] flex flex-col items-center gap-2.5">
                        <div className="text-base font-semibold text-slate-700 dark:text-slate-300 self-center">原圖</div>
                        <div className="h-full aspect-square bg-slate-100 dark:bg-[#131c2b] dark:border dark:border-[rgba(41,61,85,0.25)] rounded-xl" />
                    </div>
                    <div className="flex-1 h-full bg-white dark:bg-[#151e2b] dark:border dark:border-[#293d55] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.063)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.145)] p-[15px] flex flex-col items-center gap-2.5">
                        <div className="text-base font-semibold text-slate-700 dark:text-slate-300 self-center">辨識結果</div>
                        <div className="h-full aspect-square bg-slate-100 dark:bg-[#131c2b] dark:border dark:border-[rgba(41,61,85,0.25)] rounded-xl" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end w-full">
                <div className="flex gap-3.5 w-[400px] h-10">
                    <button className="flex-1 h-full border-0 rounded-xl text-[15px] font-bold text-white cursor-pointer flex items-center justify-center gap-2 transition-[filter] duration-200 bg-linear-to-b from-red-500 dark:from-red-500 to-red-600 dark:to-red-700 shadow-[0_3px_10px_rgba(239,68,68,0.25)] dark:shadow-[0_3px_10px_rgba(239,68,68,0.19)] hover:brightness-[1.05]">
                        <X size={16} />
                        <span>辨識錯誤</span>
                    </button>
                    <button
                      className="flex-1 h-full border-0 rounded-xl text-[15px] font-bold text-white cursor-pointer flex items-center justify-center gap-2 transition-[filter] duration-200 bg-linear-to-b from-green-500 dark:from-emerald-500 to-green-600 dark:to-emerald-600 shadow-[0_3px_10px_rgba(34,197,94,0.25)] dark:shadow-[0_3px_10px_rgba(16,185,129,0.25)] hover:brightness-[1.05]"
                      onClick={() => router.push('/well/export')}
                    >
                        <Check size={16} />
                        <span>辨識正確</span>
                    </button>
                </div>
            </div>
        </>
    );
}
