// Wells recognised by the AI, listed on the export page.
// Placeholder data until wells come from the backend.

export type WellVerdict = 'well' | 'not-well';

export interface ExportWell {
  id: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  // null until someone has verified the recognition
  verdict: WellVerdict | null;
}

const VERIFIED_COUNT = 100;
const PENDING_COUNT = 5;

// Wells are scattered over a ~5 km square on a 0.001° (~100 m) grid
const GRID_STEP = 0.001;
const GRID_CELLS = 50;

// Deterministic pseudo-random number in [0, 1) so the placeholder layout is the same on server and client
function scatter(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Grid cell of every well; a well landing on a taken cell moves north to the next free one
const CELLS = (() => {
  const taken = new Set<string>();
  return Array.from({ length: VERIFIED_COUNT + PENDING_COUNT }, (_, index) => {
    let row = Math.floor(scatter(index, 1) * GRID_CELLS);
    const column = Math.floor(scatter(index, 2) * GRID_CELLS);
    while (taken.has(`${row},${column}`)) row = (row + 1) % GRID_CELLS;
    taken.add(`${row},${column}`);
    return { row, column };
  });
})();

function buildWell(index: number, verdict: WellVerdict | null): ExportWell {
  const day = String((index % 28) + 1).padStart(2, '0');
  return {
    id: `SW-2023-A${String(index + 1).padStart(3, '0')}`,
    latitude: Number((23.456 + CELLS[index].row * GRID_STEP).toFixed(3)),
    longitude: Number((120.123 + CELLS[index].column * GRID_STEP).toFixed(3)),
    capturedAt: `2023-10-${day} 14:30`,
    verdict,
  };
}

// Every ninth verified well turned out not to be a well
export const EXPORT_WELLS: ExportWell[] = [
  ...Array.from({ length: VERIFIED_COUNT }, (_, index) => buildWell(index, index % 9 === 3 ? 'not-well' : 'well')),
  ...Array.from({ length: PENDING_COUNT }, (_, index) => buildWell(VERIFIED_COUNT + index, null)),
];

export function findExportWell(id: string | undefined): ExportWell | undefined {
  return EXPORT_WELLS.find((well) => well.id === id);
}

export function formatCoordinates(well: ExportWell): string {
  return `${well.latitude.toFixed(3)}, ${well.longitude.toFixed(3)}`;
}
