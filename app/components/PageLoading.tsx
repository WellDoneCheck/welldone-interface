import WellLoader from './WellLoader';

// Full-page loading screen: what a page's static HTML shows until its script has read the address and rendered it
export default function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,#34403B_0%,#2C322F_45%,#1F2422_100%)]">
      <WellLoader />
    </div>
  );
}
