'use client';
import { useRouter } from 'next/navigation';
import "../globals.css";

export default function Login() {
  const router = useRouter();

  function handleLogin() {
    router.push('/dashboard');
  }
    return (
        <>
            <div className="left-branding">
                <div className="brand-title">AI水井辨識系統</div>
                <div className="brand-desc">智慧辨識，精準定位</div>
            </div>
            <div className="right-form">
                <div className="form-card">
                <div className="form-title">用戶登入</div>
                <div className="form-subtitle">若忘記帳號或密碼請找管理員</div>

                <div className="fields">
                    <label className="field-label">帳號</label>
                    <input type="text" className="field-input" placeholder="請輸入帳號"/>

                    <label className="field-label">密碼</label>
                    <input type="password" className="field-input" placeholder="請輸入密碼"/>
                </div>

                <button className="login-btn" onClick={handleLogin}>
                    登入
                </button>
                </div>
            </div>
        </>
    );
}