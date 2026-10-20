import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComparisonCsv, compareWells, distanceMeters } from '../app/utils/wellComparison.ts';

// 0.0001° of latitude is about 11.1 m
const point = (id, latitude, longitude = 120.5) => ({ id, latitude, longitude });

test('measures distance in metres', () => {
  assert.equal(Math.round(distanceMeters(point('a', 23.5), point('b', 23.5001))), 11);
});

test('pairs a detection with a legal well within the tolerance', () => {
  const result = compareWells([point('D1', 23.5)], [point('L1', 23.5001)], 15);
  assert.equal(result.matched.length, 1);
  assert.equal(result.matched[0].legal.id, 'L1');
  assert.deepEqual([result.unregistered.length, result.missing.length], [0, 0]);
});

test('leaves both unmatched outside the tolerance and reports the nearest on the other side', () => {
  const result = compareWells([point('D1', 23.5)], [point('L1', 23.5004)], 15);
  assert.equal(result.matched.length, 0);
  assert.equal(result.unregistered[0].nearestLegal.point.id, 'L1');
  assert.equal(Math.round(result.unregistered[0].nearestLegal.distance), 44);
  assert.equal(result.missing[0].nearestDetected.point.id, 'D1');
});

test('pairs one to one, closest pair first', () => {
  const detected = [point('D1', 23.5), point('D2', 23.50005)];
  const result = compareWells(detected, [point('L1', 23.50006)], 15);
  assert.equal(result.matched.length, 1);
  assert.equal(result.matched[0].detected.id, 'D2');
  assert.equal(result.unregistered[0].detected.id, 'D1');
});

test('reports no nearest well when the other side is empty', () => {
  const result = compareWells([point('D1', 23.5)], [], 15);
  assert.equal(result.unregistered[0].nearestLegal, null);
});

test('writes every category to the CSV', () => {
  const result = compareWells([point('D1', 23.5), point('D2', 23.6)], [point('L1', 23.5001), point('L2', 23.7)], 15);
  const lines = buildComparisonCsv(result).replace(/^﻿/, '').split('\r\n');
  assert.deepEqual(lines.slice(1).map((line) => line.split(',')[0]), ['合法已辨識', '疑似未登記', '清冊未辨識']);
  assert.equal(lines[0], '類別,辨識編號,辨識緯度,辨識經度,合法井編號,合法井緯度,合法井經度,距離(公尺),登記處理');
  assert.equal(lines[1], '合法已辨識,D1,23.5,120.5,L1,23.5001,120.5,11,');
});

test('marks suspected unregistered wells picked for registration', () => {
  const result = compareWells([point('D1', 23.5), point('D2', 23.6)], [], 15);
  const lines = buildComparisonCsv(result, new Set(['D2'])).replace(/^\uFEFF/, '').split('\r\n');
  assert.deepEqual(lines.slice(1).map((line) => line.split(',').at(-1)), ['', '待登記']);
});
