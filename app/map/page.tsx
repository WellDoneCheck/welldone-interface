'use client';
import {
  Plus, Minus, MapPin, ImageIcon, Check,
  Navigation, Droplets, Crosshair,
} from 'lucide-react';
import { useState } from 'react';

const regions = ['北', '中', '南', '東'];

const recognitionData = {
    coordinates: 'N 23.456782, E 120.345672',
    time: '2024/12/15 14:32:08',
    image: 'DRONE_00045.jpg',
    wellType: '圓井',
};

export default function Map() {
        const [activeRegion, setActiveRegion] = useState('北');
    return (
        <>
            <div className="flex gap-6 flex-1">
                {/* Map Area */}
                <div className="w-full h-auto flex-1 rounded-[14px] border border-slate-200 dark:border-[#293d55] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.125)] overflow-hidden relative bg-slate-200">
                    <img className="w-full h-full object-cover block" src="https://images.unsplash.com/photo-1540632227694-bd0593e0464b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3NzMxMzI1OTV8&ixlib=rb-4.1.0&q=80&w=1080" alt="Map" />

                    {/* Region Nav */}
                    <div className="absolute top-4 left-4 flex flex-col bg-white dark:bg-[#151e2b] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.125)] overflow-hidden">
                        {regions.map((region) => (
                            <button
                                key={region}
                                className={`w-12 h-11 flex items-center justify-center text-base cursor-pointer border-0 transition-all duration-200 ${
                                  activeRegion === region
                                    ? 'bg-blue-500 dark:bg-emerald-500 text-white font-bold'
                                    : 'bg-transparent text-slate-600 dark:text-[#e2e8f0] font-semibold hover:bg-slate-100 dark:hover:bg-[#1c2d42]'
                                }`}
                                onClick={() => setActiveRegion(region)}
                            >
                                {region}
                            </button>
                        ))}
                    </div>

                    {/* Map Pin */}
                    <div className="absolute top-[36%] left-[44%]">
                        <MapPin className='w-8 h-8' fill="#ef4444" stroke="none" />
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute top-[210px] left-4 flex flex-col bg-white dark:bg-[#151e2b] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
                    <button className="w-10 h-10 flex items-center justify-center border-0 bg-transparent cursor-pointer transition-all duration-200 hover:bg-slate-100 dark:hover:bg-[#1c2d42]">
                        <Plus size={18} className="text-slate-600 dark:text-[#e2e8f0]" />
                    </button>
                    <div className="h-px bg-slate-200 dark:bg-[#293d55]" />
                    <button className="w-10 h-10 flex items-center justify-center border-0 bg-transparent cursor-pointer transition-all duration-200 hover:bg-slate-100 dark:hover:bg-[#1c2d42]">
                        <Minus size={18} className="text-slate-600 dark:text-[#e2e8f0]" />
                    </button>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="w-[330px] flex flex-col gap-4 h-full overflow-y-auto">
                    {/* Image Preview Card */}
                    <div className="bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.125)] p-[18px] flex flex-col gap-3.5">
                    <div className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">選取圖片</div>
                    <div className="w-full h-[180px] bg-slate-100 dark:bg-[#1c2d42] rounded-[10px] flex items-center justify-center">
                        <ImageIcon size={36} className="text-slate-300 dark:text-[#3d5168]" />
                    </div>
                    <div className="text-[13px] font-normal text-slate-600 dark:text-[#e2e8f0]">{recognitionData.image}</div>
                    </div>

                    {/* Coordinates Card */}
                    <div className="bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.125)] p-[18px] flex flex-col gap-3">
                    <div className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">座標資訊</div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 min-w-7 rounded-md flex items-center justify-center bg-[#eef3ff] dark:bg-[#0d2926]">
                        <Navigation size={14} className="text-blue-500 dark:text-emerald-500" />
                        </div>
                        <span className="text-[13px] font-normal text-slate-600 dark:text-[#e2e8f0]">N : {recognitionData.coordinates.split(', ')[0].split(' ')[1]}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 min-w-7 rounded-md flex items-center justify-center bg-[#eef3ff] dark:bg-[#0d2926]">
                        <Navigation size={14} className="text-blue-500 dark:text-emerald-500" />
                        </div>
                        <span className="text-[13px] font-normal text-slate-600 dark:text-[#e2e8f0]">E : {recognitionData.coordinates.split(', ')[1].split(' ')[1]}</span>
                    </div>
                    </div>

                    {/* Well Type Card */}
                    <div className="bg-white dark:bg-[#151e2b] dark:border dark:border-[#1e3248] rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.125)] p-[18px] flex flex-col gap-3">
                    <div className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">辨識結果</div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 min-w-7 rounded-md flex items-center justify-center bg-emerald-50 dark:bg-[#0a2520]">
                        <Droplets size={14} className="text-green-500 dark:text-emerald-500" />
                        </div>
                        <span className="text-[13px] font-normal text-slate-600 dark:text-[#e2e8f0]">{recognitionData.wellType}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-[#0a2520] rounded-full py-1.5 px-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-emerald-500" />
                            <span className="text-xs font-semibold text-green-600 dark:text-[#34d399]">已辨識</span>
                        </div>
                    </div>
                    </div>

                    <div className="flex-1" />

                    {/* Locate Button */}
                    <button className="flex items-center justify-center gap-2 w-full h-auto bg-linear-to-b from-blue-500 dark:from-emerald-500 to-blue-600 dark:to-emerald-600 rounded-xl border-0 cursor-pointer shadow-[0_3px_10px_rgba(59,130,246,0.19)] dark:shadow-[0_4px_12px_rgba(16,185,129,0.19)] transition-opacity duration-200 py-2.5 hover:opacity-90">
                    <Crosshair size={18} className="text-white" />
                    <span className="text-white text-sm font-bold">定位至地圖</span>
                    </button>
                </div>
            </div>
        </>
    );
}
