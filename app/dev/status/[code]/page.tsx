import { forbidden, notFound, unauthorized } from 'next/navigation';

// Development-only preview of the status pages: /dev/status/404, /401, /403, /500. A 404 in production.
export default async function StatusPreview({ params }: { params: Promise<{ code: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { code } = await params;
  if (code === '401') unauthorized();
  if (code === '403') forbidden();
  if (code === '500') throw new Error('狀態頁預覽用的錯誤');
  notFound();
}
