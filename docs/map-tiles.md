# 地圖圖磚：後端圖磚 + MapLibre

地圖檢視、合法井比對、監控總覽（地圖面板）顯示的是**每張匯入地圖自己的空拍圖磚**，由後端提供
（Backend-SPEC §4.4），疊在國土測繪中心電子地圖上。可以拖曳、縮放，水井圖釘依經緯度標在地圖上。

```
匯入的 TIFF ──splitter 切圖──▶ 後端 GET /tasks/:taskId/tiles/tilejson、/:z/:x/:y.png
        │
        ▼
MapLibre GL（app/components/TileMap.tsx）
```

- 地圖頁先讀 `tilejson`（`app/utils/tileServer.ts` 的 `fetchImagery`），拿到圖磚網址、範圍（`bounds`）與縮放範圍。
  還沒切完圖的地圖讀不到（404），只顯示電子地圖，畫面框在整個台灣。
- 影像圖磚經網站自己的 `/backend/*` 轉給後端（`next.config.ts` 的 rewrites，轉到 `NEXT_PUBLIC_API_URL`）：
  `TileMap` 用 `throughSite` 把 tilejson 圖磚網址的 origin 換成網站的 `/backend`。同 origin 的請求帶 token header
  不必先送 CORS 預檢（OPTIONS）；直接打後端時每張圖磚都要多一次預檢，縮小地圖時新露出的區域要等加倍的請求排隊。
- 影像圖磚要 WebP 而不是 tilejson 給的 PNG（`asWebp` 把網址的 `{y}.png` 換成 `{y}.webp`，後端兩種都產生）：
  一張約 PNG 的九分之一大，實測 60 張從 9.6 MB、1.55 秒降到 1.1 MB、1.18 秒；WebP 有透明，影像外仍是透明的。
- 圖磚要帶登入的 token：`TileMap` 的 `transformRequest` 呼叫 `authorizeTile`，只對網站的 `/backend/` 下的網址
  加 `Authorization` header，電子地圖不帶。
- 換到另一張地圖時，共用的地圖不重建，只換掉 `imagery` 圖層與平移範圍（`showImagery`）。
- 監控頁的地圖面板用最新一張辨識完成的地圖；沒登入時讀不到圖磚，只有電子地圖。

MapLibre 的 web worker（`maplibre-gl-worker.mjs` 與它引用的 `maplibre-gl-shared.mjs`）不會被打包進網站，
改由 `app/maplibre-worker/[file]/route.ts` 直接從已安裝的套件提供，`TileMap` 以 `setWorkerUrl` 指過去；
升級 maplibre-gl 不用另外複製檔案。

## 底圖

匯入地圖的影像以外，是國土測繪中心通用版電子地圖（EMAP）的公開 WMTS
（`https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}`，注意列 `{y}` 在行 `{x}` 前面），
畫在空拍圖層下面。它最多到 zoom 20，更近時放大 zoom 20 的圖磚。網址設定在 `app/utils/tileServer.ts`。
依政府資料開放授權條款需標示來源「© 內政部國土測繪中心」（已寫在圖磚來源的 attribution）。

## 地圖頁與比對頁共用一張地圖

`/map` 與 `/compare` 放在路由群組 `app/(survey)/` 裡，由它的 layout（`app/components/SurveyMap.tsx`）放一張共用的地圖。
在這兩頁之間切換時 layout 不會重新掛載，地圖不必重建（WebGL、shader、樣式、圖磚），只會平移縮放到新頁的範圍；
各頁用 `useSurveyMap(...)` 告訴它要框的範圍與點擊行為，自己的 pin／標記（icon layer）離開時會自動從地圖拿掉。
離開群組（檢查頁、上傳頁）時地圖跟著卸載，所以推近到水井、縮回上傳列的轉場不受影響。

## 地圖頁與比對頁共用一張地圖

`/map` 與 `/compare` 放在路由群組 `app/(survey)/` 裡，由它的 layout（`app/components/SurveyMap.tsx`）放一張共用的地圖。
在這兩頁之間切換時 layout 不會重新掛載，地圖不必重建（WebGL、shader、樣式、圖磚），只會平移縮放到新頁的範圍；
各頁用 `useSurveyMap(...)` 告訴它影像、要框的範圍與點擊行為，自己的 pin／標記（icon layer）離開時會自動從地圖拿掉。
離開群組（檢查頁、上傳頁）時地圖跟著卸載，所以推近到水井、縮回上傳列的轉場不受影響。

## 效能

  讓一整個畫面的圖磚同時產生（實測一個畫面 12 張：zoom 17 從 3.6 秒降到 0.6 秒）。
- 拖曳時，圖釘／標記整層跟著平移（CSS transform，不重排版、不重繪），地圖停下或縮放時才重新計算位置
  （`useMapLayer`）；只有必須連到固定位置的東西（地圖頁的引線、監控頁縮放按鈕狀態）才每一幀更新（`useMapProject`）。

