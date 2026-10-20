import { notFound } from 'next/navigation';
import PageLoading from '../../components/PageLoading';
import WellLoader from '../../components/WellLoader';

// Development-only preview of the loading screens: /dev/loading (page loading), /dev/loading?progress=45 (home intro)
export default async function LoadingPreview({ searchParams }: { searchParams: Promise<{ progress?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { progress } = await searchParams;
  if (progress === undefined) return <PageLoading />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,#34403B_0%,#2C322F_45%,#1F2422_100%)]">
      <WellLoader label="載入影像" progress={Number(progress)} />
    </div>
  );
}
