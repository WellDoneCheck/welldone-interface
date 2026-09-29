import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountError, countRoles, filterUsers, isLastAdmin, passwordError } from '../app/utils/users.ts';

const user = (account, name, role) => ({ account, name, role, registeredAt: '2023-01-01 00:00', lastActiveAt: null });
const USERS = [user('chen.chihyuan', '陳志遠', 'admin'), user('wu.jiaming', '吳家銘', 'user'), user('lin.meihua', '林美華', 'user')];

test('filters by role', () => {
  assert.deepEqual(filterUsers(USERS, '', 'user').map((u) => u.account), ['wu.jiaming', 'lin.meihua']);
  assert.equal(filterUsers(USERS, '', 'all').length, 3);
});

test('searches account and name, ignoring case and surrounding spaces', () => {
  assert.deepEqual(filterUsers(USERS, '  WU ', 'all').map((u) => u.account), ['wu.jiaming']);
  assert.deepEqual(filterUsers(USERS, '美華', 'all').map((u) => u.account), ['lin.meihua']);
  assert.deepEqual(filterUsers(USERS, 'wu', 'admin'), []);
});

test('counts users per role', () => {
  assert.deepEqual(countRoles(USERS), { all: 3, admin: 1, user: 2 });
});

test('protects the only admin', () => {
  assert.equal(isLastAdmin(USERS, 'chen.chihyuan'), true);
  assert.equal(isLastAdmin(USERS, 'wu.jiaming'), false);
  const twoAdmins = [...USERS, user('huang.yating', '黃雅婷', 'admin')];
  assert.equal(isLastAdmin(twoAdmins, 'chen.chihyuan'), false);
});

test('checks new account names', () => {
  assert.equal(accountError('  ', USERS), '請輸入帳號');
  assert.match(accountError('Wu Jia', USERS), /小寫英文/);
  assert.match(accountError('ab', USERS), /3–32/);
  assert.equal(accountError('wu.jiaming', USERS), '這個帳號已經存在');
  assert.equal(accountError(' new.user ', USERS), null);
});

test('checks a new password and its confirmation', () => {
  assert.equal(passwordError('', ''), '請輸入新密碼');
  assert.equal(passwordError('abc123', 'abc123'), '密碼至少 8 碼');
  assert.equal(passwordError('abcdefgh', 'abcdefgh'), '密碼需同時包含英文字母與數字');
  assert.equal(passwordError('12345678', '12345678'), '密碼需同時包含英文字母與數字');
  assert.equal(passwordError('well2026ok', 'well2026oK'), '兩次輸入的密碼不一致');
  assert.equal(passwordError('well2026ok', 'well2026ok'), null);
});
