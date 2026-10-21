import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountError,
  assignableRoles,
  canCreateUsers,
  canManage,
  canManageUsers,
  countRoles,
  filterUsers,
  passwordError,
  toManagedUser,
} from '../app/utils/users.ts';

const user = (account, name, role) => ({ id: account, account, name, role, registeredAt: '2023-01-01 00:00', lastActiveAt: null });
const USERS = [
  user('root', '', 'root'),
  user('chen.chihyuan', '陳志遠', 'admin'),
  user('wu.jiaming', '吳家銘', 'operator'),
  user('lin.meihua', '林美華', 'viewer'),
];

test('an account from the backend shows its times in Taipei time', () => {
  const apiUser = {
    id: 'uuid',
    username: 'chen.chihyuan',
    name: null,
    role: 'admin',
    is_default_password: false,
    last_login_at: '2026-10-13T08:00:00.000Z',
    created_at: '2022-12-21T02:20:00.000Z',
    updated_at: '2026-10-13T08:00:00.000Z',
  };
  assert.deepEqual(toManagedUser(apiUser), {
    id: 'uuid',
    account: 'chen.chihyuan',
    name: '',
    role: 'admin',
    registeredAt: '2022-12-21 10:20',
    lastActiveAt: '2026-10-13 16:00',
  });
  assert.equal(toManagedUser({ ...apiUser, last_login_at: null }).lastActiveAt, null);
});

test('filters by role, root counting as an admin', () => {
  assert.deepEqual(filterUsers(USERS, '', 'admin').map((u) => u.account), ['root', 'chen.chihyuan']);
  assert.deepEqual(filterUsers(USERS, '', 'viewer').map((u) => u.account), ['lin.meihua']);
  assert.equal(filterUsers(USERS, '', 'all').length, 4);
});

test('searches account and name, ignoring case and surrounding spaces', () => {
  assert.deepEqual(filterUsers(USERS, '  WU ', 'all').map((u) => u.account), ['wu.jiaming']);
  assert.deepEqual(filterUsers(USERS, '美華', 'all').map((u) => u.account), ['lin.meihua']);
  assert.deepEqual(filterUsers(USERS, 'wu', 'admin'), []);
});

test('counts users per role tab', () => {
  assert.deepEqual(countRoles(USERS), { all: 4, admin: 2, operator: 1, viewer: 1 });
});

test('only root creates accounts; root and admin manage them', () => {
  assert.equal(canCreateUsers('root'), true);
  assert.equal(canCreateUsers('admin'), false);
  assert.equal(canManageUsers('admin'), true);
  assert.equal(canManageUsers('operator'), false);
  assert.equal(canManageUsers('viewer'), false);
});

test('nobody manages root, only root manages admins', () => {
  assert.equal(canManage('root', 'root'), false);
  assert.equal(canManage('admin', 'root'), false);
  assert.equal(canManage('root', 'admin'), true);
  assert.equal(canManage('admin', 'admin'), false);
  assert.equal(canManage('admin', 'operator'), true);
  assert.equal(canManage('admin', 'viewer'), true);
  assert.equal(canManage('operator', 'viewer'), false);
});

test('only root can make someone an admin, and nobody a root', () => {
  assert.deepEqual(assignableRoles('root'), ['admin', 'operator', 'viewer']);
  assert.deepEqual(assignableRoles('admin'), ['operator', 'viewer']);
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
