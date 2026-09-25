import CheckPage from '../components/CheckPage';
import { findRecord, getLatestRecord } from '../data/mapRecords';

export const metadata = {
  title: '水井檢查 — SkyWell',
  description: '比對多期空拍影像，判定是否為水井',
};

// /check?record=<id> checks that well; without it (or with an unknown id) the latest one is shown
export default async function CheckRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { record: recordParam } = await searchParams;
  const record = findRecord(typeof recordParam === 'string' ? recordParam : undefined) ?? getLatestRecord();

  return <CheckPage record={record} />;
}
