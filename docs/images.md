# 大張照片：預先轉好的 WebP，不經過即時優化

空拍背景、比對影像、匯出卡片等大張照片放在 `public/` 的 `.webp` 檔，`<Image>` 一律加上 `unoptimized`，
由伺服器直接提供檔案，不經過 Next 的即時圖片優化（`/_next/image`）。

| 檔案 | 用在 |
| --- | --- |
| `aerial-bg.webp` | 狀態頁與匯出頁的空拍背景（地圖、比對、上傳、監控改用實際圖磚，見 `map-tiles.md`） |
| `landing_page/hero-still.webp` | 首頁動畫第 421 幀之後的靜態背景（影片最後一幀去掉 pin），地圖縮小時也是這張 |
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

## 首頁捲動動畫

原始檔放在 `assets/landing_page/`（不在 `public/`，不會部署出去）：`landing.mp4`（1920×1080、60fps、496 幀）、`2.png`（最後一幀去掉 pin）、`pin.png`。

| 檔案 | 內容 |
| --- | --- |
| `landing_page/map_frames/frame_0001～0420.webp` | 清晰幀，1600×900 q92，捲到附近才載入 |
| `landing_page/map_frames_light/frame_0001～0420.webp` | 替身幀，1280×720 q70，載入畫面時全部載完，清晰幀還沒解碼好時先頂上 |
| `landing_page/hero-still.webp` | 第 421 幀之後的靜態背景（`2.png` 轉 q90） |
| `landing_page/pin.webp` | 停在水井上的 pin（`pin.png` 轉 q90，透明度無損） |

第 421 幀之後鏡頭幾乎不動，所以不再用幀，改成靜態背景加上單獨的 pin（位置、收起動畫見 `app/utils/heroStill.ts`）。
幀數仍以整支影片的 496 幀計算捲動長度（`app/page.tsx` 的 `totalFrames`）。

重新產生幀：

```bash
mkdir -p /tmp/frames && ffmpeg -i assets/landing_page/landing.mp4 -fps_mode passthrough -start_number 1 -frames:v 420 /tmp/frames/frame_%04d.png
for f in /tmp/frames/*.png; do
  n=$(basename "$f" .png)
  cwebp -quiet -q 92 -m 6 -resize 1600 900 "$f" -o "public/landing_page/map_frames/$n.webp"
  cwebp -quiet -q 70 -m 6 -resize 1280 720 "$f" -o "public/landing_page/map_frames_light/$n.webp"
done
cwebp -q 90 -m 6 assets/landing_page/2.png -o public/landing_page/hero-still.webp
cwebp -q 90 -alpha_q 100 -m 6 assets/landing_page/pin.png -o public/landing_page/pin.webp
```
