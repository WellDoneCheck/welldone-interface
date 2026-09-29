import MapFromAddress from '../components/MapFromAddress';

export const metadata = {
  title: '地圖檢視 — SkyWell',
  description: '檢視水井辨識位置與空拍影像',
};

// Static, so it is prefetched whole and opens at once; the well comes from the address in the browser
// (the loading screen in the root layout only shows on a direct page load, until the page's script runs)
export default function MapRoute() {
  return <MapFromAddress />;
}
