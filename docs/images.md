# 大張照片：預先轉好的 WebP，不經過即時優化

空拍背景、比對影像、匯出卡片等大張照片放在 `public/` 的 `.webp` 檔，`<Image>` 一律加上 `unoptimized`，
由伺服器直接提供檔案，不經過 Next 的即時圖片優化（`/_next/image`）。

| 檔案 | 用在 |
| --- | --- |
| `aerial-bg.webp` | 狀態頁與匯出頁的空拍背景，首頁動畫縮小後的底圖（地圖、比對、上傳、監控改用實際圖磚，見 `map-tiles.md`） |
| `aerial-tile.webp` | 檢查頁背景、比對影像與底片條、地圖卡片照片 |
| `export/well-tile.webp` | 匯出頁的水井卡片 |
| `map/ground-photo.webp` | 地圖卡片的立體圖（示意） |
| `upload/record-bg.webp` | 影像匯入頁的地圖紀錄列 |

## 為什麼

即時優化第一次遇到某個尺寸時，要在伺服器上重新縮放、編碼：`aerial-bg` 約 0.7～0.9 秒、`aerial-tile` 約 0.17 秒
（開發模式與正式版相同；每種螢幕寬度各算一次，重新部署或清快取後又要重來）。
React 在換頁轉場開始前會等新頁面的圖片載入，所以使用者看到的是「點了之後停住，過一下才開始動」。

直接提供預先轉好的檔案就沒有這段等待；每張圖只有一個網址，各頁共用同一份瀏覽器快取。

## 換圖時

把新的原檔轉成 WebP（畫質 82，寬度維持原檔，全螢幕背景約 1600～2000px 即可）後覆蓋同名 `.webp`：

```bash
magick 原檔.png -quality 82 -define webp:method=6 public/aerial-bg.webp
```

小圖示（`/export/icon-*.png` 等）維持一般的 `<Image>`，交給即時優化即可。
