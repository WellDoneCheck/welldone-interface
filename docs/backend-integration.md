# 前後端串接

網站直接從瀏覽器呼叫後端（well-back），規格以 `Backend-SPEC.md` 為準。這份文件記錄前端怎麼接、接了哪些 API、
哪些還是模擬資料。

## 設定

```bash
# .env.local（不進版控）；NEXT_PUBLIC_* 在 build 時寫進程式，改了要重新啟動 dev server／重新 build
NEXT_PUBLIC_API_URL=http://localhost:3000
```

後端的 `ALLOWED_ORIGINS` 要包含前端的網址（CORS），`BACKEND_URL` 是後端回給前端的圖磚網址（見 `docs/map-tiles.md`）。

## 共用的基礎（`app/utils/`）

| 檔案 | 做什麼 |
| --- | --- |
| `session.ts` | token 存在 `localStorage`（`skywell:token`），解出 `sub / username / role / isDefaultPassword / exp`；過期視同登出 |
| `api.ts` | `api()`：帶 `Authorization: Bearer`、JSON 進出；錯誤丟 `ApiError(status, message)`（`message` 可能是字串陣列，合成一行）；401 就登出（改密碼例外）。`uploadFile()`：XHR 上傳（要進度）。`fileUrl()`：`<img>`／下載用的 `?token=` 網址 |
| `components/useBackend.ts` | 頁面讀資料的 hook：同一個 key 再回來時先顯示上次的結果、背景重讀，所以頁面轉場照舊 |
| `components/LoadNotice.tsx` | 讀取中（載入畫面）、沒登入（登入按鈕）、失敗（錯誤訊息與「前往上傳頁面」） |

## 已接的 API

| 畫面 | API | 前端位置 |
| --- | --- | --- |
| 登入、改密碼（預設密碼強制改） | `POST /auth/login`、`PATCH /users/me/password`（改完重新登入） | `auth.ts`、`LoginPanel`、`ChangePasswordPage` |
| 帳號管理 | `GET/POST /users`、`PATCH /users/:id/role`、`PATCH /users/:id/reset-password`、`DELETE /users/:id` | `usersApi.ts`、`UserManagementPage` |
| 影像匯入 | `GET /tasks`、`GET /tasks/:id/progress`（`no-store` 輪詢，見 §5 #1）、分片上傳（見 §6）、`PATCH /tasks/:id/name`、`DELETE /tasks/:id`、`POST /tasks/:id/ai/retry`（「重試辨識」：辨識停下且還有失敗或沒跑到的小圖時，不帶 body 全部重試） | `useTaskRecords`、`UploadPage`、`chunkedUpload.ts` |
| 地圖檢視 | `GET /tasks`（`?record=` 或最新完成的）、`GET /wells?taskId=`、`GET /tasks/:id/tiles/tilejson` 與圖磚、`GET /wells/:id/image` | `routeRecords.ts` 的 `loadMapView`、`MapPage`、`TileMap` |
| 地圖上的小圖進度：切圖中已切好的直接顯示影像、旁邊還沒切到的標灰色；切完標出還沒辨識完的（辨識中閃動、失敗、等待辨識）；切完自動載入影像 | `GET /tasks/:id`（`split_status`）、`GET /tasks/:id/tiles/cut`（格線、已切好與空白的小圖、整張影像範圍、已切好部分的圖磚網址；後端新增）、`GET /tasks/:id/tiles/cut/{z}/{x}/{y}.png`（後端新增）、`GET /tasks/:id/ai/progress`，每 5 秒直到辨識結束；每多辨識完小圖就重讀 `GET /wells?taskId=`，地圖的圖釘與左下角的數字跟著更新；切完讀 `tilejson` | `tileProgress.ts`、`useTileProgressLayer`、`useRecognisedWells`、`useCutImagery`、`MapPage` 的圖例 |
| 地圖名稱改名（地圖、檢查、比對頁） | `PATCH /tasks/:id/name`（空白＝回到預設名稱） | `RecordName` |
| 水井檢查 | `GET /wells/code/:code`、`GET /tasks/:id`、`GET /wells/:id/timeline`（每期的照片用 `/wells/:id/image`）、`PATCH /wells/:id/verdict` | `loadCheckView`、`CheckPage`、`TimelineCompare` |
| 資料匯出 | 同地圖檢視的水井（`/export?record=`，沒有就最新完成的）、`PATCH /wells/:id/verdict`；勾選的水井 CSV 由前端產生 | `ExportPage` |
| 合法井比對 | `GET /tasks/:id/well-registry/source`、`POST …/import`、`POST …/match`（放開滑桿時送）、`GET …/comparison`、`PATCH /wells/:id/to-register` | `wellRegistry.ts`、`ComparePage` |
| 導覽列「上次造訪」 | `GET /me/last-visits`、`PUT /me/last-visits/:page` | `lastVisit.ts` |
| 監控總覽 | `GET /monitor/stats`（數字、準確率、30 天趨勢）；辨識任務是 `GET /tasks` 與進度（同影像匯入，改名 `PATCH /tasks/:id/name`）；地圖面板是最新完成地圖的水井與影像 | `monitorStats.ts`、`useMonitorStats`、`monitorLive.ts` 的 `liveTask`、`MonitorPage` |
| 首頁準確率與水井數 | `GET /monitor/stats`（讀一次） | `FloatingGrid` |
| AI 助理 Skyhi | `POST /copilot/ask`：後端從題庫找最相似的題目回答（不接 LLM），或查水井編號、經緯度、年份與地區；回答下方的按鈕連到站內頁面（點了收起助理；「前往匯出頁」「前往合法井比對」這類沒指定地圖的按鈕只在地圖、匯出、比對頁顯示，帶上目前的 `?record=`；已經在那一頁的按鈕不顯示，見 `actionsForPage`），沒把握時給建議題目（點了就送出）；呼叫失敗時把錯誤寫在回覆裡。輸入框上方的常見問題每次打開助理時向 `GET /copilot/suggestions` 要（帶目前路徑，地圖頁另帶 `?record=`），後端依頁面挑題型並帶入地圖所在的鄉鎮、年份；拿到前或連不上時顯示固定的三題。規格見 well-back `docs/COPILOT.md` | `utils/copilot.ts`、`useCopilotChat`、`CopilotWidget` |

權限照後端四種角色（root / admin / operator / viewer）：檢視者看不到上傳、改名、驗證、刪除；
operator 只能刪自己上傳的地圖；只有 root 能建帳號。

## 還是模擬資料

- 監控總覽的服務狀態與事件（`app/data/monitor.ts`、`utils/monitorLive.ts`）；登入後不顯示關於模擬批次的事件。
- 沒登入時：監控的數字與辨識任務、首頁的準確率與水井數（後端只回應登入的使用者）。
- 地圖卡片背面的 3D 模型、各頁的背景照片。

## 已知限制

- 監控頁對任何人開放，但後端只回應登入的使用者：沒登入時地圖面板沒有影像與水井、數字是模擬的。
- 信賴度（`confidence`）的範圍後端沒寫明；≤ 1 視為 0–1 換成百分比（`confidencePercent`）。
- 改過中文名稱的地圖，後端的 CSV／圖磚 ZIP 匯出會失敗（§5 #4）；網站的 CSV 由前端產生，不受影響。
- 後端連不上 AI 服務一段時間就把辨識標成失敗，但 AI 可能還在跑、繼續回傳結果。上傳頁（與監控的任務）在最後一次回傳後 3 分鐘內仍顯示「正在辨識中」並繼續更新；地圖頁只要還有小圖沒辨識完就繼續更新。這段期間後端不再記錄哪張小圖正在辨識，地圖上沒有「辨識中」的格子。
- 後端只要「最後送去 AI 的小圖」做完就把任務標成完成（例如只重試 1 張），其他從沒送出的小圖還在；有 `pendingCount` 時上傳頁顯示「辨識未完成（N 張未辨識）」並提供「重試辨識」。
- 辨識的總張數：後端的 `ai.totalCount` 在舊任務只算已開始的小圖；有 `pendingCount`（辨識結束或被標失敗後）時改用 已完成＋失敗＋沒跑到。
- 切圖時看不出「正在切」哪一張：切圖服務切好才寫檔、也不回報正在切哪張；灰色只畫在已切好小圖上下左右相鄰、還沒處理的格子：哪格有影像要等切圖服務處理到才知道，所以這只是近似，可能有幾格之後是空白、也可能漏掉幾格還沒切的。空白格靠切圖服務的 `build.log`（`tile (X,Y) empty`），它的格式變了就認不出來。
- 切圖服務在整張影像找不到資料時一張小圖都不切（沒有 `merged.vrt`），後端仍把辨識標成完成：上傳頁顯示「影像沒有資料」；`tilejson` 與圖磚回 404，地圖頁就不顯示影像，也不會去要圖磚。地圖頁沒指定地圖時挑的「最新完成」仍可能是這種任務（`GET /tasks` 看不出小圖張數）。
- 切圖中影像每多切一張就換新網址重讀，畫面會閃一下。不用 `metadata`：它列整個網格（含空白）、舊任務的位置是錯的、`status` 也不會更新。
- 監控的辨識任務沒有預估剩餘時間與找到幾口井（後端沒有提供），以小圖張數當影像張數。
- 驗證結果在同一個分頁內會立刻反映到各頁（`wellVerdicts.ts`）；別人改的要重新開頁才看得到。

## 分片上傳

影像以分片方式送上後端，`chunkedUpload.ts` 負責編排，`UploadPage` 一次送一個檔：

1. `POST /tasks/upload/init`：`{ filename, totalSize, chunkSize }` → `{ uploadId }`；分片總數 `totalChunks = ceil(totalSize / chunkSize)` 由後端算，前端用 16 MiB 一片（後端單片上限 50 MiB、單檔上限 20 GiB）。
2. `GET /tasks/upload/status/:uploadId` → `{ totalChunks, uploadedChunks: number[], completed }`；**續傳**靠 `uploadedChunks` 跳過伺服器已有的分片。
3. `POST /tasks/upload/chunk`（multipart：`file`、`uploadId`、`chunkIndex`、`totalChunks`）逐片送；用 XHR 取真實 `loaded` 位元組，`UploadPage` 據此算整體進度、真實速度與剩餘時間。單片失敗重試 3 次（後端會保留已收到的分片）。
4. `POST /tasks/upload/complete`：`{ uploadId, totalChunks }` → 合併分片、建立 `Task`（與 `GET /tasks` 同型別）。

- 上傳開始時左面板的放置區與檔案清單收合，中央顯示整體進度（`UploadProgress`）；全部完成後停留 `DONE_PAUSE` 再展開。
- `GET /tasks/upload/active`（所有人的進行中分片上傳：`filename`、`totalSize`、`progress`、`uploadedById`、`startedAt`；不含 `uploadId`）目前前端尚未使用。
- 續傳只在同一分頁內有效：失敗的檔保留 `uploadId`，重試時從 `status` 接續。跨頁面重整無法自動續傳（瀏覽器無法重讀檔案，需重新選檔）。
