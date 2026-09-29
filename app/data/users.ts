// Registered users shown on the admin user management page.
// Placeholder data until users come from the backend.

export type UserRole = 'admin' | 'user';

export interface ManagedUser {
  account: string;
  name: string;
  role: UserRole;
  // 'YYYY-MM-DD HH:mm'
  registeredAt: string;
  // null if the user has never signed in
  lastActiveAt: string | null;
}

export const INITIAL_USERS: ManagedUser[] = [
  { account: 'chen.chihyuan', name: '陳志遠', role: 'admin', registeredAt: '2022-12-21 10:20', lastActiveAt: '2026-09-28 16:42' },
  { account: 'huang.yating', name: '黃雅婷', role: 'admin', registeredAt: '2023-01-09 09:05', lastActiveAt: '2026-09-27 11:18' },
  { account: 'wu.jiaming', name: '吳家銘', role: 'user', registeredAt: '2023-02-14 14:32', lastActiveAt: '2026-09-28 09:03' },
  { account: 'lin.meihua', name: '林美華', role: 'user', registeredAt: '2023-03-02 08:47', lastActiveAt: '2026-09-25 17:26' },
  { account: 'tsai.chengen', name: '蔡承恩', role: 'user', registeredAt: '2023-04-18 13:10', lastActiveAt: '2026-09-20 10:55' },
  { account: 'lee.shuhui', name: '李淑惠', role: 'user', registeredAt: '2023-06-06 10:00', lastActiveAt: '2026-09-12 15:30' },
  { account: 'chang.weijie', name: '張偉傑', role: 'user', registeredAt: '2023-08-21 16:25', lastActiveAt: '2026-08-30 08:14' },
  { account: 'wang.xinyi', name: '王欣怡', role: 'user', registeredAt: '2024-01-15 11:40', lastActiveAt: '2026-09-26 13:02' },
  { account: 'hsu.zhihao', name: '許志豪', role: 'user', registeredAt: '2024-05-03 09:58', lastActiveAt: null },
  { account: 'kuo.peiyu', name: '郭佩妤', role: 'user', registeredAt: '2025-02-11 15:12', lastActiveAt: '2026-07-19 16:48' },
];
