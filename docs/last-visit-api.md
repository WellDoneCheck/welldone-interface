# 導覽列「上次造訪」：資料表與 API 規格

導覽列的「地圖檢視」「水井檢查」會帶使用者回到**自己上次看的地圖記錄／上次檢查的水井**；
沒有造訪記錄，或記錄已過期，就不顯示該項。

後端已依本規格實作（`GET /me/last-visits`、`PUT /me/last-visits/:page`，Backend-SPEC §4.7），
前端在 `app/utils/lastVisit.ts` 呼叫：登入時讀一次，之後每次造訪寫回並先記在記憶體；測試在 `tests/lastVisit.test.mjs`。

## 規則

| 項目 | 規則 |
| --- | --- |
| 記錄單位 | 每位使用者 × 每個頁面（`map`、`check`）各一筆，只記最後一次 |
| 何時寫入 | 開啟地圖記錄、在地圖上切換到另一個圖釘、進入水井檢查頁時 |
| 有效期限 | 最後一次造訪後 **12 小時**；再次造訪會重新計時 |
| 過期處理 | 讀取時直接視為沒有記錄，不需要排程；可每天清一次舊資料（見下方） |
| 登出 | 前端不顯示這兩項；伺服器端資料保留，下次登入仍在期限內就會出現 |
| 記錄失效 | 記錄已被刪除或使用者沒有權限時，伺服器不回傳該筆，導覽列就不會指向失效頁面 |

## 資料表 `user_last_visits`

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `user_id` | 使用者主鍵 | 外鍵，對應使用者 |
| `page` | 文字，`map` 或 `check` | 哪個頁面 |
| `record_id` | 文字 | 地圖記錄或水井編號，例如 `SW-2023-A01` |
| `visited_at` | 時間（含時區） | 最後一次造訪時間，由伺服器寫入 |

- 主鍵：`(user_id, page)`，每人每頁只有一筆，寫入時覆蓋（upsert）。
- 每位使用者最多兩筆，不需要其他索引。

每日清理（可選，只是讓資料表保持乾淨，不影響功能）：

```sql
DELETE FROM user_last_visits WHERE visited_at < now() - interval '12 hours';
```

## API

皆需登入，以目前登入的使用者為對象，不接受指定其他使用者。

### `GET /api/me/last-visits`

登入後讀取一次。只回傳**未過期、記錄仍存在且有權限**的項目，沒有的頁面不出現在回應中。

```json
{
  "map": { "recordId": "SW-2023-A01", "visitedAt": "2026-09-30T08:00:00Z" },
  "check": { "recordId": "SW-2022-A02", "visitedAt": "2026-09-30T08:05:00Z" }
}
```

### `PUT /api/me/last-visits/{page}`

`page` 為 `map` 或 `check`。造訪時呼叫，伺服器以自己的時間寫入 `visited_at`。

```json
{ "recordId": "SW-2023-A01" }
```

- 成功：`204 No Content`
- `page` 不合法或 `recordId` 不存在：`400`；未登入：`401`

## 前端接上 API 的方式

`app/utils/lastVisit.ts` 對外只有這幾個函式，其他程式（`Navbar`、`MapPage`、`CheckPage`、`SiteChrome`）不需要改：

| 函式 | 改成 |
| --- | --- |
| `setVisitAccount(帳號)` | 登入時呼叫 `GET /api/me/last-visits`，結果放進記憶體並通知導覽列；登出時清空 |
| `rememberVisit(頁面, 記錄編號)` | 先更新記憶體（導覽列立即更新），再呼叫 `PUT`；失敗不影響畫面 |
| `lastVisitHref(頁面)` | 從記憶體讀取，並照樣檢查 12 小時期限 |
| `subscribeToVisits` | 不變 |

`localStorage` 可保留作為暫存，讓重新整理後導覽列能在 API 回應前先顯示。

## 負擔評估

- 資料量：每位使用者最多 2 筆，100 位使用者約 200 筆。
- 寫入：只在開啟地圖記錄、切換圖釘、進入水井檢查時各一次，為單筆 upsert。
- 讀取：每次登入一次；同一分頁內切換頁面不再呼叫。
