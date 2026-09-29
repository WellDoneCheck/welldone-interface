import type { ExportWell } from '../data/exportWells';
import { toCsv } from './csv';

const HEADER = ['編號', '緯度', '經度', '拍攝時間', '驗證狀態', '判定結果'];
const VERDICT_LABELS = { well: '是井', 'not-well': '不是井' } as const;

function toRow(well: ExportWell): string[] {
  return [
    well.id,
    well.latitude.toFixed(3),
    well.longitude.toFixed(3),
    well.capturedAt,
    well.verdict ? '已驗證' : '未驗證',
    well.verdict ? VERDICT_LABELS[well.verdict] : '',
  ];
}

export function buildWellsCsv(wells: ExportWell[]): string {
  return toCsv([HEADER, ...wells.map(toRow)]);
}
