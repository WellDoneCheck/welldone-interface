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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>

        {/* Steps Section */}
        <div className="steps-section">

          {/* Header */}
          <div className="modal-header-row">
            <span className="modal-title">資料匯入</span>
            <button className="close-btn" onClick={onClose}>
              <X size={18} className="close-icon" />
            </button>
          </div>
          <p className="modal-subtitle">請依照流程選擇圖像資料與合法座標檔案</p>
          <div className="modal-divider" style={{ margin: '8px 0' }} />

          {/* Step 1 */}
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

          {/* Step 2 */}
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

          {/* Start Button */}
          <div className="btn-area">
            <button className="start-btn">
              <Play size={16} className="start-icon" />
              <span>開始辨識</span>
            </button>
          </div>
        </div>

        {/* Guide Section */}
        <div className="guide-section">
          <div className="guide-card card-blue">
            <div className="guide-icon-bg blue">
              <ImageIcon className="guide-icon" />
            </div>
            <span className="guide-card-title">支援圖片格式</span>
            <span className="guide-card-desc">TIFF檔</span>
          </div>
          <div className="guide-card card-green">
            <div className="guide-icon-bg green">
              <FileText className="guide-icon" />
            </div>
            <span className="guide-card-title">座標檔案格式</span>
            <span className="guide-card-desc">TFW檔</span>
          </div>
          <div className="guide-card card-amber">
            <div className="guide-icon-bg amber">
              <TriangleAlert className="guide-icon" />
            </div>
            <span className="guide-card-title">注意事項</span>
            <span className="guide-card-desc">
              資料夾內須同時有圖片和座標檔<br />且對應的檔名必須相同
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}