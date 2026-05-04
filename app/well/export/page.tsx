'use client';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';

const gridItems = [
  { label: 'DRONE_00045.jpg' },
  { label: 'DRONE_00046.jpg' },
  { label: 'DRONE_00047.jpg' },
  { label: 'DRONE_00048.jpg' },
  { label: 'DRONE_00049.jpg' },
  { label: 'DRONE_00050.jpg' },
];

export default function Export() {
    const router = useRouter();
    return (
        <>
            <div className="page-title">資料匯出</div>
            <hr className="title-divider"></hr>
            <div className="top-bar">
                <button className="btn-export">
                    <Download size={18} />
                    <span>匯出壓縮資料夾</span>
                </button>
                <div className="stats-info">
                    <div className="stat-items">
                        <div className="stat-dot dot-red" />
                        <span>未登記：5 口</span>
                    </div>
                    <div className="stat-items">
                        <div className="stat-dot dot-green" />
                        <span>已登記：5 口</span>
                    </div>
                </div>
            </div>

            <div className="grid-card">
                <div className="grid-card-title">資料夾中所有的未登記水井座標</div>
                <div className="image-grid">
                    {gridItems.map((item, i) => (
                    <div className="grid-item" key={i}>
                        <div className="grid-thumb" />
                        <span className="grid-label">{item.label}</span>
                    </div>
                    ))}
                </div>
            </div>
            <div className="grid-card">
                <div className="grid-card-title">資料夾中所有的已登記水井座標</div>
                <div className="image-grid">
                    {gridItems.map((item, i) => (
                    <div className="grid-item" key={i}>
                        <div className="grid-thumb" />
                        <span className="grid-label">{item.label}</span>
                    </div>
                    ))}
                </div>
            </div>
            <div className="grid-card">
                <div className="grid-card-title">辨識錯誤的圖片</div>
                <div className="image-grid">
                    {gridItems.map((item, i) => (
                    <div className="grid-item" key={i}>
                        <div className="grid-thumb" />
                        <span className="grid-label">{item.label}</span>
                    </div>
                    ))}
                </div>
            </div>
        </>
    );
}