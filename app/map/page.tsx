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
            <div className="content-row">
                {/* Map Area */}
                <div className="map-area">
                    <img className="map-bg" src="https://images.unsplash.com/photo-1540632227694-bd0593e0464b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3NzMxMzI1OTV8&ixlib=rb-4.1.0&q=80&w=1080" alt="Map" />

                    {/* Region Nav */}
                    <div className="region-nav">
                        {regions.map((region) => (
                            <button
                                key={region}
                                className={`region-btn ${activeRegion === region ? 'active' : ''}`}
                                onClick={() => setActiveRegion(region)}
                            >
                                {region}
                            </button>
                        ))}
                    </div>

                    {/* Map Pin */}
                    <div className="map-pin">
                        <MapPin className='map-pin-icon' fill="#ef4444" stroke="none" />
                    </div>

                    {/* Zoom Controls */}
                    <div className="zoom-controls">
                    <button className="zoom-btn">
                        <Plus size={18} />
                    </button>
                    <div className="zoom-divider" />
                    <button className="zoom-btn">
                        <Minus size={18} />
                    </button>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="info-panel">
                    {/* Image Preview Card */}
                    <div className="info-card">
                    <div className="info-card-title">選取圖片</div>
                    <div className="img-placeholder">
                        <ImageIcon size={36} />
                    </div>
                    <div className="img-filename">{recognitionData.image}</div>
                    {/* <div className="checkbox-row">
                        <div className="checkbox">
                        <Check size={12} />
                        </div>
                        <span className="checkbox-label">顯示原圖</span>
                    </div> */}
                    </div>

                    {/* Coordinates Card */}
                    <div className="info-card gap-12">
                    <div className="info-card-title">座標資訊</div>
                    <div className="info-row">
                        <div className="info-icon-bg blue">
                        <Navigation size={14} />
                        </div>
                        <span className="info-value">N : {recognitionData.coordinates.split(', ')[0].split(' ')[1]}</span>
                    </div>
                    <div className="info-row">
                        <div className="info-icon-bg blue">
                        <Navigation size={14} />
                        </div>
                        <span className="info-value">E : {recognitionData.coordinates.split(', ')[1].split(' ')[1]}</span>
                    </div>
                    </div>

                    {/* Well Type Card */}
                    <div className="info-card gap-12">
                    <div className="info-card-title">辨識結果</div>
                    <div className="info-row">
                        <div className="info-icon-bg green">
                        <Droplets size={14} />
                        </div>
                        <span className="info-value">{recognitionData.wellType}</span>
                    </div>
                    <div className="info-row">
                        <div className="status-badge">
                        <div className="status-dot" />
                            <span className="status-text">已辨識</span>
                        </div>
                    </div>
                    </div>

                    <div className="panel-spacer" />

                    {/* Locate Button */}
                    <button className="locate-btn">
                    <Crosshair size={18} />
                    <span>定位至地圖</span>
                    </button>
                </div>
            </div>
        </>
    );
}