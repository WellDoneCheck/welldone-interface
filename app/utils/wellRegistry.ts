// An imported map's legal well register and its comparison with the wells recognised in it, worked out by the backend
// (Backend-SPEC §4.6): the register is imported (replacing the one before), matched with a tolerance, then read back.
import { api, ApiError, uploadFile } from './api';
import type { GeoPoint, WellComparison } from './wellComparison';
import type { Verdict } from './wells';

// The register's file, as the backend kept it (GET source); only the fields the site uses
export interface RegistrySource {
  file_name: string;
  imported: number;
  skipped: number;
}

interface CmpWell {
  id: number;
  code: string;
  latitude: number;
  longitude: number;
  verdict: Verdict | null;
  to_register: boolean;
}

interface CmpRegistry {
  id: number;
  well_id: string;
  latitude: number;
  longitude: number;
}

// GET comparison
export interface Comparison {
  tolerance_m: number;
  matched: { well: CmpWell; registry: CmpRegistry; distance_m: number }[];
  unregistered: { well: CmpWell; nearest_registry: CmpRegistry | null; distance_m: number | null }[];
  missing: { registry: CmpRegistry; nearest_well: CmpWell | null; distance_m: number | null }[];
}

// The comparison as the page shows it: wells by their code, legal wells by the register's own numbers; plus, by code,
// each compared well's backend id (to put it on the to-register list) and those already on it
export interface RegistryResult {
  source: RegistrySource;
  // metres, as matched last
  tolerance: number;
  comparison: WellComparison;
  wellIds: Record<string, number>;
  toRegister: Set<string>;
}

const wellPoint = (well: CmpWell): GeoPoint => ({ id: well.code, latitude: well.latitude, longitude: well.longitude });
const registryPoint = (registry: CmpRegistry): GeoPoint => ({ id: registry.well_id, latitude: registry.latitude, longitude: registry.longitude });
const nearest = (point: GeoPoint | null, distance: number | null) => (point && distance !== null ? { point, distance } : null);

export function toWellComparison(comparison: Comparison): WellComparison {
  return {
    matched: comparison.matched.map((m) => ({ detected: wellPoint(m.well), legal: registryPoint(m.registry), distance: m.distance_m })),
    unregistered: comparison.unregistered.map((u) => ({
      detected: wellPoint(u.well),
      nearestLegal: nearest(u.nearest_registry && registryPoint(u.nearest_registry), u.distance_m),
    })),
    missing: comparison.missing.map((m) => ({
      legal: registryPoint(m.registry),
      nearestDetected: nearest(m.nearest_well && wellPoint(m.nearest_well), m.distance_m),
    })),
  };
}

function toResult(source: RegistrySource, comparison: Comparison): RegistryResult {
  const wells = [...comparison.matched, ...comparison.unregistered].map((entry) => entry.well);
  return {
    source,
    tolerance: comparison.tolerance_m,
    comparison: toWellComparison(comparison),
    wellIds: Object.fromEntries(wells.map((well) => [well.code, well.id])),
    toRegister: new Set(wells.filter((well) => well.to_register).map((well) => well.code)),
  };
}

const registry = (taskId: string) => `/tasks/${encodeURIComponent(taskId)}/well-registry`;

// Matches the register with this tolerance (metres) and reads the result back
export async function matchRegistry(taskId: string, source: RegistrySource, tolerance: number): Promise<RegistryResult> {
  await api(`${registry(taskId)}/match`, { method: 'POST', body: { tolerance } });
  return toResult(source, await api<Comparison>(`${registry(taskId)}/comparison`));
}

const isStatus = (error: unknown, status: number) => error instanceof ApiError && error.status === status;

// The map's register as it was left, compared again with this tolerance if it had not been (null: none imported yet)
export async function loadRegistry(taskId: string, tolerance: number): Promise<RegistryResult | null> {
  let source: RegistrySource;
  try {
    source = await api<RegistrySource>(`${registry(taskId)}/source`);
  } catch (error) {
    if (isStatus(error, 404)) return null;
    throw error;
  }
  try {
    return toResult(source, await api<Comparison>(`${registry(taskId)}/comparison`));
  } catch (error) {
    if (isStatus(error, 409)) return matchRegistry(taskId, source, tolerance);
    throw error;
  }
}

// Replaces the map's register with this CSV, then compares it (an import clears the comparison before)
export async function importRegistry(taskId: string, file: File, tolerance: number): Promise<RegistryResult> {
  const imported = await uploadFile<{ imported: number; skipped: number }>(`${registry(taskId)}/import`, file, () => {});
  return matchRegistry(taskId, { file_name: file.name, imported: imported.imported, skipped: imported.skipped }, tolerance);
}

// Puts a suspected unregistered well on the to-register list, or takes it off
export const setToRegister = (wellId: number, toRegister: boolean) => api(`/wells/${wellId}/to-register`, { method: 'PATCH', body: { toRegister } });
