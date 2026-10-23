import type { MapWell } from './wells';
import { toCsv } from './csv';

const HEADER = ['編號', '緯度', '經度', '拍攝時間', '驗證狀態', '判定結果'];
const VERDICT_LABELS = { well: '是井', 'not-well': '不是井' } as const;

function toRow(well: MapWell): string[] {
  return [
    well.id,
    well.latitude.toFixed(3),
    well.longitude.toFixed(3),
    well.timestamp,
    well.verdict ? '已驗證' : '未驗證',
    well.verdict ? VERDICT_LABELS[well.verdict] : '',
  ];
}

export function buildWellsCsv(wells: MapWell[]): string {
  return toCsv([HEADER, ...wells.map(toRow)]);
}
