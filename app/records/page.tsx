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
            <div className="page-title">辨識紀錄</div>
            <hr className="title-divider"/>
            <div className="records-card">
                {records.map((record, i) => (
                    <div className="record-row" key={i}>
                        <div className={`status-dot dot-${record.unregistered > 0 ? 'red' : 'green'}`} />
                        <div className="record-info">
                        <span className="record-date">{record.date}</span>
                        <span className="record-detail">
                            已登記：{record.registered}個 | 未登記：{record.unregistered}個
                        </span>
                        </div>
                        <button className="btn-export">
                        <Download size={14} />
                        <span>匯出壓縮資料夾</span>
                        </button>
                    </div>
                    ))}
            </div>
        </>
    );
}