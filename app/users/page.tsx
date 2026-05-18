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
        <div className="page-title">用戶管理</div>
        <hr className="title-divider" />
        <div className="tab-row">
        {tabs.map((tab) => (
            <div
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab(tab)}
            style={{ cursor: 'pointer' }}
            >
            {tab}
            </div>
        ))}
        </div>

        {/* 根據選中的 tab 顯示不同內容 */}
        {activeTab === '用戶列表' && (
            <div className="user-card">
                <div className="info">
                    <span className="info-title">現有用戶列表</span>
                    <span className="info-note">預設密碼皆為：abcde12345</span>
                </div>
                <div className="list-spacer"></div>

                <div className="table-header">
                    <div className="th-cell">用戶名稱</div>
                    <div className="th-cell">用戶帳號</div>
                    <div className="th-action">操作</div>
                </div>

                <div>
                    {users.map((user, index) => (
                        <div key={index} className="table-row">
                            <div className="td-cell">{user.name}</div>
                            <div className="td-cell">{user.account}</div>
                            <div className="td-action">
                                <button className="btn-reset">重設密碼</button>
                                <button className="btn-delete">刪除用戶</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === '新增用戶' && (
            <div className='add'>
                <div className="info-bar">
                    <Info size={18} />
                    <span>預設密碼皆為：abcde12345</span>
                </div>

                <div className="action-row">
                    <button className="btn-csv-import" onClick={handleImportCsv}>
                        <FileUp size={18} />
                        <span>匯入 CSV 檔案</span>
                    </button>
                </div>

                <div className="content-row">
                    {/* Single User Form */}
                    <div className="form-card">
                        <div className="form-header">
                            <div className="form-icon-bg">
                                <User size={22} />
                            </div>
                            <div className="form-title-col">
                                <div className="form-title">個人帳號</div>
                                <div className="form-subtitle">輸入新用戶的基本資料</div>
                            </div>
                        </div>
                        <div className="field-group">
                            <label className="field-label">用戶名稱</label>
                            <div className="field-input">
                                <User size={16} />
                                <input type="text" placeholder="請輸入用戶名稱" />
                            </div>
                            <span className="field-hint">請輸入實際姓名</span>
                        </div>
                        <div className="field-group">
                            <label className="field-label">用戶帳號</label>
                            <div className="field-input">
                                <IdCard size={16} />
                                <input type="text" placeholder="請輸入用戶帳號" />
                            </div>
                            <span className="field-hint">帳號將用於系統登入</span>
                        </div>
                        <div className="btn-row">
                            <button className="btn-cancel">取消</button>
                            <button className="btn-add">新增帳號</button>
                        </div>
                    </div>

                    <div className="csv-card">
                        <div className="csv-title-row">
                            <div className="csv-icon-bg">
                            <Table size={18} />
                            </div>
                            <div className="csv-title">CSV匯入資料預覽</div>
                            <div className="csv-badge">
                            <div className="csv-badge-dot" />
                            <span>{csvData.length} 筆資料</span>
                            </div>
                        </div>
                        {csvData.length === 0 ? (
                            <>
                            {/* 匯入前 */}
                            <div className="csv-sub">匯入 CSV 檔案以批次新增用戶帳號</div>
                            <div className="csv-footer">
                                <button className="btn-disabled" disabled>
                                <Upload size={16} />
                                <span>尚無資料可匯入</span>
                                </button>
                            </div>
                            <div className="empty-state">
                                <div className="empty-icon-circle">
                                <FileSpreadsheet size={32} />
                                </div>
                                <div className="empty-title">尚未匯入資料</div>
                                <div className="empty-desc">請點擊上方「匯入CSV」按鈕選擇檔案</div>
                            </div>
                            </>
                        ) : (
                            <>
                            {/* 匯入後 */}
                            <div className="csv-sub">預覽匯入的用戶資料，確認無誤後點擊批次匯入</div>
                            <div className="table-wrapper">
                                <div className="table-header">
                                <div className="table-cell">用戶名稱</div>
                                <div className="table-cell">用戶帳號</div>
                                </div>
                                {csvData.map((row, i) => (
                                <div className={`table-row ${i < csvData.length - 1 ? 'bordered' : ''} ${i % 2 === 1 ? 'alt' : ''}`} key={i}>
                                    <div className="table-cell">{row.name}</div>
                                    <div className="table-cell">{row.account}</div>
                                </div>
                                ))}
                            </div>
                            <div className="csv-footer">
                                <button className="btn-batch" onClick={handleBatchImport}>
                                <Upload size={16} />
                                <span>批次匯入帳號</span>
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