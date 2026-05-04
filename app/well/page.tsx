'use client';
import Link from 'next/link';
import {
  CircleCheck, FolderOpen, ChevronDown, Upload,
  Play, ImageIcon, FileText, TriangleAlert,
} from 'lucide-react';

const tasks = [
  {
    time: '2026/03/13　23:55:30',
    status: 'done',
    confirm: 'pending',
  },
  {
    time: '2026/03/13　23:55:30',
    status: 'processing',
    progress: 70,
    confirm: 'processing',
  },
  {
    time: '2026/03/13　23:55:30',
    status: 'done',
    confirm: 'pending',
  },
];

export default function Well() {
  return (
    <>
        <div className="page-header">
            <div className="page-title">水井辨識</div>
        </div>
        <hr className="title-divider"></hr>

        <div className="main-row">
            {/* Left: Work Status */}
            <div className="work-status">
            <div className="ws-header">
                <span className="ws-title">工作狀態</span>
                <div className="ws-badge">
                <div className="ws-badge-dot" />
                <span>{tasks.length} 項任務</span>
                </div>
            </div>

            <div className="col-header">
                <span className="col-name">任務名稱</span>
                <span className="col-status">辨識進度</span>
                <span className="col-confirm">雙重確認</span>
                <span className="col-action">操作</span>
            </div>

            {tasks.map((task, i) => (
                <div className="task-row" key={i}>
                <div className="task-name"><span>{task.time}</span></div>

                <div className="task-status">
                    {task.status === 'done' ? (
                    <div className="badge badge-green"><div className="badge-dot" />已完成</div>
                    ) : (
                    <div className="progress-wrap">
                        <div className="progress-bg">
                        <div className="progress-fill" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="progress-pct">{task.progress}%</span>
                    </div>
                    )}
                </div>

                <div className="task-confirm">
                    {task.confirm === 'pending' ? (
                    <div className="badge badge-amber"><div className="badge-dot" />待確認</div>
                    ) : (
                    <div className="badge badge-gray"><div className="badge-dot" />辨識中</div>
                    )}
                </div>

                <div className="task-action">
                    {task.status === 'done' && task.confirm === 'pending' ? (
                    <Link href="/well/recognition" className="btn-confirm-task">
                        <CircleCheck size={14} />
                        <span>雙重確認</span>
                    </Link>
                    ) : (
                    <span className="dash-text">—</span>
                    )}
                </div>
                </div>
            ))}</div>

            <div className="right-col">
                <div className="steps-card">
                    <div className="step step-1">
                        <div className="step-num active">1</div>
                        <div className="step-content">
                        <span className="step-label">選擇圖片來源</span>
                        <button className="s1-btn">
                            <FolderOpen size={16} className="s1-icon" />
                            <span>選擇圖片資料夾或壓縮檔</span>
                        </button>
                        </div>
                    </div>
                    <div className="step-divider" />
                    <div className="step step-2">
                        <div className="step-num inactive">2</div>
                        <div className="step-content gap8">
                        <span className="step-label">選擇合法座標檔案</span>
                        <div className="s2-dropdown">
                            <span>選擇合法座標檔案</span>
                            <ChevronDown size={14} className="dd-icon" />
                        </div>
                        <div className="or-row">
                            <div className="or-line" />
                            <span className="or-text">或</span>
                            <div className="or-line" />
                        </div>
                        <button className="s2-import-btn">
                            <Upload size={14} className="s2-icon" />
                            <span>匯入合法座標檔案</span>
                        </button>
                        <span className="s2-hint">找不到需要的檔案時，可自行上傳座標檔</span>
                        </div>
                    </div>
                    <div className="btn-area">
                        <button className="start-btn">
                            <Play size={16} className="start-icon" />
                            <span>開始辨識</span>
                        </button>
                    </div>
                </div>
                <div className="guides">
                    <div className="guide-card-guide blue">
                        <div className="guide-icon-bg blue">
                            <ImageIcon className='guide-icon-img' />
                        </div>
                        <div>
                            <div className="guide-title">支援圖片格式</div>
                            <div className="guide-desc">TIFF 格式</div>
                        </div>
                    </div>
                    <div className="guide-card-guide green">
                        <div className="guide-icon-bg green">
                            <FileText className='guide-icon-img'/>
                        </div>
                        <div>
                            <div className="guide-title">座標檔案格式</div>
                            <div className="guide-desc">TFW 格式</div>
                        </div>
                    </div>
                    <div className="guide-card-guide amber">
                        <div className="guide-icon-bg amber">
                            <TriangleAlert className='guide-icon-img' />
                        </div>
                        <div>
                            <div className="guide-title">注意事項</div>
                            <div className="guide-desc">資料夾內必須同時有圖片和座標檔，且對應的檔名必須相同</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>        
    </>
  );
}