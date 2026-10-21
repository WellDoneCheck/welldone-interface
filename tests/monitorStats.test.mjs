import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accuracyText, confidencePercent, monitorFigures, wellMarker } from '../app/utils/monitorStats.ts';

const well = { id: 'SW-2026-A001', wellId: 1, latitude: 23.8, longitude: 120.4, coordinates: '23.80000, 120.40000', timestamp: '', recordId: 't', verdict: null, confidence: 0.873 };

test("logged in, the backend's figures are shown", () => {
  const stats = { wells: { verified: 3, pending: 2, rejected: 1 }, accuracy: null, verifiedThisWeek: 1, trend: { firstDay: '2026-09-21', counts: [] } };
  assert.equal(monitorFigures(stats, { verified: 0, pending: 0, rejected: 0 }), stats);
});

test('logged out, the simulated figures stand in, with the live simulated totals', () => {
  const totals = { verified: 9, pending: 8, rejected: 7 };
  const figures = monitorFigures(null, totals);
  assert.equal(figures.wells, totals);
  assert.equal(figures.trend.counts.length, 30);
});

test('confidence reads as a % whether it comes as 0–1 or 0–100', () => {
  assert.equal(confidencePercent(0.873), 87.3);
  assert.equal(confidencePercent(94.25), 94.3);
  assert.equal(confidencePercent(null), null);
});

test("a marker's colour follows the well's verdict", () => {
  assert.equal(wellMarker(well, null).status, 'pending');
  assert.equal(wellMarker(well, 'well').status, 'verified');
  assert.equal(wellMarker(well, 'not-well').status, 'rejected');
  assert.equal(wellMarker(well, null).recordId, 'SW-2026-A001');
});

test('the accuracy shows with at most one decimal, or a dash while none is verified', () => {
  assert.equal(accuracyText(97.333), '97.3');
  assert.equal(accuracyText(100), '100');
  assert.equal(accuracyText(null), '—');
});
