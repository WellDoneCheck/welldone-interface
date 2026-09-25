import MapPage from '../components/MapPage';
import { findRecord, getLatestRecord } from '../data/mapRecords';

export const metadata = {
  title: '地圖檢視 — SkyWell',
  description: '檢視水井辨識位置與空拍影像',
};

// /map?record=<id> shows that imported map; without it (or with an unknown id) the latest map is shown
export default async function MapRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { record: recordParam } = await searchParams;
  const requested = findRecord(typeof recordParam === 'string' ? recordParam : undefined);
  const record = requested ?? getLatestRecord();

  return <MapPage key={record.id} record={record} openCardOnArrival={requested !== undefined} />;
}
