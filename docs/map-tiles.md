# 地圖圖磚：titiler + MapLibre

地圖檢視、合法井比對、影像匯入（背景）、監控總覽（背景與地圖面板）顯示的是**實際的空拍圖磚**，
不再是固定的一張照片。可以拖曳、縮放，水井圖釘依經緯度標在地圖上。

```
splitter 切好的 COG 圖磚（EPSG:3857，5000×5000 px）
        │  merged.vrt 把 154 張拼成一張
        ▼
titiler（Docker `well-titiler`，http://localhost:8080）── /cog/tiles/WebMercatorQuad/{z}/{x}/{y}.webp?tilesize=512
        │
        ▼
MapLibre GL（app/components/TileMap.tsx）
```

## 啟動

```bash
docker compose up -d
```

- `TILES_DIR`：splitter 的輸出資料夾（底下每個任務一個資料夾），唯讀掛進容器的 `/data`。
  預設是 `../00/splitter/shared/data/tiles`（splitter 與本專案放在同一層目錄時）；放在別處就先設定：
  ```bash
  TILES_DIR=/path/to/splitter/shared/data/tiles docker compose up -d
  ```
- 網站預設向 `http://localhost:8080` 要圖磚；titiler 在別的位址時，設定 `NEXT_PUBLIC_TITILER_URL` 後重新啟動 dev server。
- 主機的 8080 埠與 splitter 的 docker-compose 相同，兩者不能在同一台機器同時跑；要同時跑就改其中一個的對外埠（例如 `"8081:80"`，並設定 `NEXT_PUBLIC_TITILER_URL=http://localhost:8081`）。

確認 titiler 有讀到影像：

```bash
curl "http://localhost:8080/cog/info?url=/data/673f2606-0a27-4ca0-8285-13e300e8eaa3/merged.vrt"
```

titiler 沒有啟動時，頁面照常運作，只是地圖區塊是深色底、沒有影像。

MapLibre 的 web worker（`maplibre-gl-worker.mjs` 與它引用的 `maplibre-gl-shared.mjs`）不會被打包進網站，
改由 `app/maplibre-worker/[file]/route.ts` 直接從已安裝的套件提供，`TileMap` 以 `setWorkerUrl` 指過去；
升級 maplibre-gl 不用另外複製檔案。

## 目前的影像

| 項目 | 值 |
| --- | --- |
| 任務 | `673f2606-0a27-4ca0-8285-13e300e8eaa3`（彰化溪州高鐵沿線） |
| 範圍 | 約 120.4457–120.4848°E、23.8201–23.8410°N（4.3 × 2.6 km） |
| 解析度 | 2.47 cm／像素（約 zoom 22） |
| 涵蓋 | 36 × 21 格中的 154 格，西南往東北的帶狀區域 |

影像資訊與有影像的格子寫在 `app/data/xizhouImagery.ts`；換任務時改這個檔案的任務編號、格網原點與
`IMAGED_COLUMNS`（可用 `ls tiles/` 的檔名 `tile_<x 像素>_<y 像素>.tif` 換算）。

## 測試資料

水井圖釘目前是**示意資料**，位置在 `app/data/testWellSites.ts`：分散在帶狀區域內（避開邊緣格、彼此相距 100 m 以上），
不是辨識結果。

- 地圖紀錄 12 筆（`MAP_WELL_SITES`）→ 地圖頁、監控頁的圖釘
- 辨識水井 105 口（`DETECTED_WELL_SITES`）→ 匯出頁、比對頁

合法井比對的測試 CSV（`tests/fixtures/legal-wells/`、`public/compare/legal-wells-sample.csv`）也一起搬進了這個範圍：
靠近某口辨識水井的，維持與它的相對位置（公尺）；其餘放在格子角落附近，距離所有辨識水井 60 m 以上。
所以比對結果與 `docs/legal-well-compare-test-files.md` 列的數字相同。

## 底圖

調查範圍（空拍圖磚）以外，是國土測繪中心通用版電子地圖（EMAP）的公開 WMTS
（`https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}`，注意列 `{y}` 在行 `{x}` 前面），
畫在空拍圖層下面。它最多到 zoom 20，更近時放大 zoom 20 的圖磚。網址設定在 `app/utils/tileServer.ts`。
依政府資料開放授權條款需標示來源「© 內政部國土測繪中心」（已寫在圖磚來源的 attribution）。

## 地圖頁與比對頁共用一張地圖

`/map` 與 `/compare` 放在路由群組 `app/(survey)/` 裡，由它的 layout（`app/components/SurveyMap.tsx`）放一張共用的地圖。
在這兩頁之間切換時 layout 不會重新掛載，地圖不必重建（WebGL、shader、樣式、圖磚），只會平移縮放到新頁的範圍；
各頁用 `useSurveyMap(...)` 告訴它要框的範圍與點擊行為，自己的 pin／標記（icon layer）離開時會自動從地圖拿掉。
離開群組（檢查頁、上傳頁）時地圖跟著卸載，所以推近到水井、縮回上傳列的轉場不受影響。

## 效能

- titiler 官方映像預設只開 1 個 worker，所有圖磚排隊一張一張做；`docker-compose.yml` 設 `WEB_CONCURRENCY=8`
  讓一整個畫面的圖磚同時產生（實測一個畫面 12 張：zoom 17 從 3.6 秒降到 0.6 秒）。
- 拖曳時，圖釘／標記整層跟著平移（CSS transform，不重排版、不重繪），地圖停下或縮放時才重新計算位置
  （`useMapLayer`）；只有必須連到固定位置的東西（地圖頁的引線、監控頁縮放按鈕狀態）才每一幀更新（`useMapProject`）。

- 圖磚用 512 px（`tilesize=512`）的 WebP：請求數是 256 px 的四分之一，帶狀區域外透明。
- 瀏覽器會快取圖磚一天（`TITILER_API_CACHECONTROL`）。
- 第一次看到某一區時，titiler 要讀好幾張來源 COG 才組得出一張圖磚，會稍慢；之後就快了。
