'use client';
import "../globals.css";
import Link from 'next/link';
import ImportModal from '@/components/ImportModal';
import { useState } from 'react';

import {
  Plus, ClipboardList, Target, ImageIcon, ShieldCheck,
  Folder, CircleCheck, Loader, Eye,
  Upload, History, Map, Settings
} from 'lucide-react';

const leastData = [
 {time: '2026/03/15  14:32:10', source: 'Batch-2026-03', result: '已辨識', status: 'success'},
 {time: '2026/03/14  09:15:42', source: 'Survey-北區', result: '辨識中', status: 'processing'},
 {time: '2026/03/12  16:48:05', source: 'Batch-2026-02', result: '已辨識', status: 'success'},
];

export default function Dashboard() {
  const [showImport, setShowImport] = useState(false);
    return (
      <>
        <div className="welcome-row">
          <div className="welcome-left">
            <h1 className="welcome-title">歡迎回來，王小明</h1>
            <p className="welcome-sub">以下是您的系統使用概況</p>
          </div>
          <button className="quick-btn" onClick={() => setShowImport(true)}>
            <Plus className="btn-icon"/>
            <span>開始辨識</span>
          </button>
        </div>
        <hr className="title-divider" />

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">今日任務</span>
              <div className="stat-icon-bg blue">
                <ClipboardList className="stat-icon" />
              </div>
            </div>
            <div className="stat-value">24</div>
            <div className="stat-change">
              <span className="green">較昨日 +3</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">辨識正確率</span>
              <div className="stat-icon-bg green">
                <Target className="stat-icon" />
              </div>
            </div>
            <div className="stat-value">97.8%</div>
            <div className="stat-change">
              <span className="green">提升 0.3%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">總辨識圖片</span>
              <div className="stat-icon-bg purple">
                <ImageIcon className="stat-icon" />
              </div>
            </div>
            <div className="stat-value">1,286</div>
            <div className="stat-change">
              <span className="blue">本週新增 358</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">待確認任務</span>
              <div className="stat-icon-bg amber">
                <ShieldCheck className="stat-icon" />
              </div>
            </div>
            <div className="stat-value">2</div>
            <div className="stat-change">
              <span className="amber">需要雙重確認</span>
            </div>
          </div>
        </div>

        <div className="bottom-row">

          <div className="recent-records">
            <div className="records-header">
              <span className="records-title">最近辨識紀錄</span>
              <div className="records-badge">
                <div className="badge-dot"></div>
                <span>{leastData.length} 筆紀錄</span>
              </div>
            </div>

            {/* <!-- Column Header --> */}
            <div className="col-header">
              <span className="col-time">辨識時間</span>
              <span className="col-source">圖片來源</span>
              <span className="col-result">辨識結果</span>
              <span className="col-action">查看</span>
            </div>

            {leastData.map((item, index) => (
                <div key={index} className="record-row">
                  <div className="cell-time">{item.time}</div>
                  <div className="cell-source">
                    <div className="source-badge">
                      <Folder className="source-icon" />
                      <span>{item.source}</span>
                    </div>
                  </div>
                  <div className="cell-result">
                    <div className={`result-badge ${item.status}`}>
                      {item.status === 'success' ? (
                        <CircleCheck className="result-icon" />
                      ) : (
                        <Loader className="result-icon" />
                      )}
                      <span>{item.result}</span>
                    </div>
                  </div>  
                  <div className="cell-action">
                    {item.status === 'success' ? (
                      <Link href="/review" className="view-btn">
                        <Eye className="view-icon" />
                        <span>查看</span>
                      </Link>
                    ) : (
                      <span className="dash">—</span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="quick-actions">
            <span className="qa-title">快速操作</span>

            <a className="qa-item primary" onClick={() => setShowImport(true)}>
              <Upload className="qa-icon" />
              <span>上傳圖片辨識</span>
            </a>
            <Link className="qa-item secondary" href="/history">
              <History className="qa-icon" />
              <span>查看辨識紀錄</span>
            </Link  >
            <Link className="qa-item secondary" href="/map">
              <Map className="qa-icon" />
              <span>開啟地圖檢視</span>
            </Link  >
            <Link className="qa-item secondary" href="/settings">
              <Settings className="qa-icon" />
              <span>帳號設定</span>
            </Link>
          </div>
        </div>
        {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      </>
    );
}
    