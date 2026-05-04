'use client';
import { useRouter } from 'next/navigation';
import { MapPin, Timer, Target, Layers, List, X, Check } from 'lucide-react';

export default function Recognition() {
    const router = useRouter();
    return (
        <>
            <div className="page-title">比對辨識結果</div>
            <hr className="title-divider" />
            <div className="rs stats-row">
                <div className=" stat-card-rs">
                    <div className="stat-icon-wrap blue">
                        <MapPin size={20} className="stat-icon"/>
                    </div>
                    <div className="stat-text">
                        <span className="stat-label">座標位置</span>
                        <span className="stat-value">N 23.456782<br />E 120.345672</span>
                    </div>
                </div>
                <div className="stat-card-rs">
                    <div className="stat-icon-wrap green">
                        <Timer size={20} className="stat-icon" />
                    </div>
                    <div className=" stat-text">
                        <span className="stat-label">辨識時間</span>
                        <span className="stat-value">2024/12/15 14:32:08</span>
                    </div>
                </div>
                <div className="stat-card-rs">
                    <div className="stat-icon-wrap amber">
                        <Target size={20} className="stat-icon"/>
                    </div>
                    <div className="stat-text">
                        <span className="stat-label">辨識信心度</span>
                        <span className="stat-value">92.7%</span>
                    </div>
                </div>

                    {/* 圖片資訊 */}
                <div className="stat-card-rs">
                    <div className="stat-icon-wrap red">
                        <Layers size={20} className="stat-icon"/>
                    </div>
                    <div className="stat-text">
                        <span className="stat-label">圖片資訊</span>
                        <span className="stat-value">DRONE_00045.jpg</span>
                    </div>
                </div>

                    {/* 水井類型 */}
                <div className="stat-card-rs">
                    <div className="stat-icon-wrap purple">
                        <List size={20} className="stat-icon" />
                    </div>
                    <div className="stat-text">
                        <span className="stat-label">水井類型</span>
                        <span className="stat-value">圓井</span>
                    </div>
                </div>
            </div>
            <div className="images">
                <div className="images-row">
                    <div className="image-card">
                        <div className="image-card-title">原圖</div>
                        <div className="image-placeholder" />
                    </div>
                    <div className="image-card">
                        <div className="image-card-title">辨識結果</div>
                        <div className="image-placeholder" />
                    </div>
                </div>
            </div>
            <div className="actions-row">
                <div className="actions-panel">
                    <button className="btn-action btn-reject" > {/*onClick={() => router.push('/well')}*/}
                        <X size={16} />
                        <span>辨識錯誤</span>
                    </button>
                    <button className="btn-action btn-confirm" onClick={() => router.push('/well/export')}> {/**/}
                        <Check size={16} />
                        <span>辨識正確</span>
                    </button>
                </div>
            </div>
        </>
    );
}