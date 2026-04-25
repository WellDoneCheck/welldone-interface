'use client';
import "../globals.css";
import { usePathname , useRouter} from 'next/navigation';
import { User, Lock, EyeOff, ShieldAlert, Shield, LogOut } from 'lucide-react';

export default function Settings() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    router.push('/');
  }
  return (
    <>
      <div className="page-title">帳號設定</div>
      <hr className="title-divider" />
      
      <div className="content-row">
        <div className="password-card">
          <div className="user-info-section">
            <div className="section-header">
              <div className="icon-bg blue">
                <User size={16} />
              </div>
              <span className="section-title">用戶資訊</span>
            </div>
            <span className="field-label">用戶名稱</span>
            <div className="field-display"><span>大學長</span></div>
            <span className="field-label">用戶帳號</span>
            <div className="field-display"><span>DaxueZhang</span></div>
          </div>
          <div className="card-divider" />
          <div className="pw-section">
            <div className="section-header">
              <div className="icon-bg amber">
                <Lock size={16} />
              </div>
              <span className="section-title">修改密碼</span>
            </div>
            <div className="pw-row">
              <span className="pw-label">原始密碼：</span>
              <div className="pw-input">
                <input type="password" placeholder="" />
                <EyeOff size={18} />
              </div>
            </div>
            <div className="pw-row">
              <span className="pw-label">新密碼 ：</span>
              <div className="pw-input">
                <input type="password" placeholder="" />
                <EyeOff size={18} />
              </div>
            </div>
            <div className="pw-row">
              <span className="pw-label">確認密碼：</span>
              <div className="pw-input">
                <input type="password" placeholder="" />
                <EyeOff size={18} />
              </div>
            </div>
          </div>
          <div className="btn-row">
            <button className="btn-cancel">取消</button>
            <button className="btn-confirm">確認修改</button>
          </div>
        </div>

        <div className="right-column">
          <div className="tips-card">
            <div className="section-header">
              <div className="icon-bg-lg">
                <ShieldAlert size={18} />
              </div>
              <span className="section-title">密碼安全建議</span>
            </div>
            <div className="tips-divider" />
            <div className="tip-row">
              <div className="tip-num">1</div>
              <span className="tip-text">密碼長度建議至少 8 個字元</span>
            </div>
            <div className="tip-row">
              <div className="tip-num">2</div>
              <span className="tip-text">包含大小寫英文字母、數字及特殊符號</span>
            </div>
            <div className="tip-row">
              <div className="tip-num">3</div>
              <span className="tip-text">避免使用與帳號相同的密碼</span>
            </div>
            <div className="tip-row">
              <div className="tip-num">4</div>
              <span className="tip-text">定期更換密碼以確保帳號安全</span>
            </div>
            <div className="tip-row">
              <div className="tip-num">5</div>
              <span className="tip-text">不要與他人共用密碼</span>
            </div>
            <div className="tip-row">
              <div className="tip-num">6</div>
              <span className="tip-text">請記好自己的帳密，若忘記密碼請找管理員恢復預設</span>
            </div>
          </div>

          <div className="status-card">
            <div className="section-header">
              <div className="icon-bg green">
                <Shield size={16} />
              </div>
              <span className="section-title">帳號安全狀態</span>
            </div>
            <div className="status-row">
              <div className="status-dot green" />
              <span className="status-text">密碼強度：強</span>
            </div>
            <div className="status-row">
              <div className="status-dot green" />
              <span className="status-text">上次登入：2026/03/14 14:32</span>
            </div>
            <div className="status-row">
              <div className="status-dot amber" />
              <span className="status-text amber">密碼已 30 天未更換</span>
            </div>            
          </div>
          <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>登出</span>
            </button>
        </div>
      </div>
    </>
  );
}