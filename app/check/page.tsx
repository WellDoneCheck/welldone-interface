import CheckFromAddress from '../components/CheckFromAddress';

export const metadata = {
  title: '水井檢查 — SkyWell',
  description: '比對多期空拍影像，判定是否為水井',
};

// Static, so it is prefetched whole and opens at once; the well comes from the address in the browser
// (the loading screen in the root layout only shows on a direct page load, until the page's script runs)
export default function CheckRoute() {
  return <CheckFromAddress />;
}
