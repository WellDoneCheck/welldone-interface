# SkyWell V4.2 — 設計模式規範 (Design Patterns · Premium Edition)

> 本文件為 `DESIGNS.md` 的升級版 (v2)，以 `design-refs/landing.png` 第一頁 Hero 為「旗艦基準 (North Star)」——**白天暖陽航照 × 雜誌級巨型襯線排版 × 大量留白**，將全站質感推向「高級編輯室 (Premium Editorial)」風格。
>
> **本文件已取代 DESIGNS.md，成為唯一現行規範。DESIGNS.md 僅作歷史對照，不再實作依據。**
>
> v2 核心修訂 (依視覺檢討結論)：
> 1. **明暗基調統一** — 登入後頁面不再出現深黑 SaaS 後台底，全站對齊 Landing 的白天攝影感（暖米白 + 暖灰）
> 2. **單一品牌色 + 語意色** — Teal `#62A4A7` 為唯一品牌色（萃取自 Landing 素材）；未驗證 = 琥珀（待處理）、不是井 = 暖紅（否定）；**粉紅全面移除**
> 3. **卡片留白化** — 白底、淺灰 1px 描邊、直角、內距留白；狀態以右上角**小標籤 (chip)** 呈現，不再整卡高飽和填色
> 4. v2 保留 v1 的結構與頁面，疊加質感層：光影、字距、髮絲線、動態、留白

---

## 0. v1 → v2 變更總覽 (Changelog)

| # | 升級 | v1 (現況) | v2 (升級後) |
|---|---|---|---|
| 1 | 明暗 | 登入後深黑底 `#2C322F` | **暖米白 `#F7F6F1`**（白天攝影感，前後零斷層） |
| 2 | 品牌色 | teal + 任意深淺變體 | **唯一 teal `#62A4A7`**（深階 `#3F7A7E` 僅供小字/hover） |
| 3 | 語意色 | 粉紅（未驗證）、珊瑚粉（不是井） | **琥珀 `#D9A441`（待處理）、暖紅 `#BC5646`（否定）**，粉紅廢除 |
| 4 | 卡片 | 深灰卡 + 純色塊 | 白底、1px 淺暖灰邊、**直角**、留白 20px、狀態 chip |
| 5 | 正文字色 | 米白（深底上） | 深墨綠黑 `#2C322F`（暖空白上），對比 14:1 (AAA) |
| 6 | 髮絲線 | 金色點綴 | **青碧髮絲線**（teal 20–35% 透明）、暖灰髮絲線 — 單一走色 |
| 7 | 動態 | 未定義 | 完整動態系統：Ken Burns 慢推、錯開上浮進場、expo 緩動 |
| 8 | 照片處理 | 全版壓暗 | 照片保留白天亮度，僅疊 Soft-light 顆粒 + 底部融入暖底漸層 |
| 9 | 幾何 | 部分圓角元件 | **全站一律直角 90°**：卡片、按鈕、輸入框、chip、面板、導航，沒有任何圓角活口 |
| 10 | 狀態標籤 | 圓角膠囊 | **圖例色塊**：小方塊色塊 + 1px 描邊，如地籍圖圖例般回應測量調性 |
| 11 | 導航 | 浮動玻璃膠囊 | **滿版直角列 + 底部 1px hairline**（保留 backdrop-blur 白霧） |
| 12 | 統計面板 | 圓角卡包色塊欄 | **白底 + 1px 暖灰豎線切分四欄**（色塊欄取消，數字直接展現） |

---

## 1. 設計語言 v2 (Visual DNA)

### 核心概念：Sunlit Editorial — 暖陽田野編輯室

以 landing.png Hero 為原型：使用者從未登入到登入後，全程像是**在博物館「航拍特展」裡閱讀每一頁插圖**，而非操作一台機器。

| 原則 | v2 定義 |
|---|---|
| 攝影為主，UI 為輔 | 影像永遠是主角。UI 只做「畫框與註腳」：細線、小字、留白 |
| 雜誌式排版 | 巨型襯線標題可壓圖、可出血；輔以英文眉標 (kicker)、章節編號 (01/02)、直排中文等編輯室語法 |
| 明暗連貫 | 全站基底 = 暖米白（天空與稻田的亮度）；**任何登入後頁面不得深黑底**；Landing 中段的深色節奏帶（`#2C322F`）屬品牌敘事保留，僅限 Landing |
| 一個品牌色 | Teal `#62A4A7` 全站唯一；teal 只出現在主行動、勾選、劃線、強調 |
| 語意色收斂 | Teal = 肯定（是井／已驗證／主行動）；琥珀 = 待處理（未驗證／待確認）；暖紅 = 否定（不是井／辨識錯誤）。**不帶語意的裝飾色（粉紅、珊瑚、紫）一律禁止** |
| 奢華的克制 | 彩色使用遵守「一個品牌色＋三個語意色」；其餘交給暖白、暖灰、深墨綠黑 |
| 時間感 | 所有動畫緩慢而穩定 (400–700ms、expo 緩動)，像鏡頭推移，不像介面跳動 |
| 直角的堅持 | **全站一律直角 90°**：卡片、按鈕、輸入框、chip、面板、導航條全部無圓角——直角在此脈絡 = 相紙裁切、測量儀器的精準感；幾何形狀只以「方框 × 留白 × 髮絲線」構成 |
| 圖例式狀態 | 狀態標籤 = **小方塊色塊 + 1px 描邊**（圖例色塊），像地籍圖說上的註記，而非行銷 App 的圓角膠囊 |
| 儀器面板 | Nav 為**滿版直角列 + 底部 1px hairline**（保留白霧 blur），像測量儀器的銘牌與分割線 |

---

## 2. 色彩系統 v2 (Color Tokens)

### 2.1 主色票 — 亮底版

| Token | Hex | 用途 |
|---|---|---|
| `color/bg-paper` | `#F7F6F1` | **頁面主底·暖米白**（呼應天空與稻田亮度；全站基底） |
| `color/bg-sunlit` | `#FBF9F4` | **更亮漂白底**：淨白區塊、卡片容器微層次 |
| `color/surface` | `#FFFFFF` | 卡片、面板、Map 頁底 |
| `color/surface-muted` | `#F1EFE9` | **暖灰次級面**：輸入框底、表格斑馬紋 |
| `color/ink` | `#2C322F` | **深墨綠黑主文字**（沿用 Landing「精準/快速」字色） |
| `color/ink-soft` | `#6F7468` | **暖灰輔助文字**：座標、時間、說明、metadata |
| `color/brand` | `#62A4A7` | **★唯一品牌青碧**（萃取自 Landing：Logo 方塊、登入鈕、「是井」、已驗證數字） |
| `color/brand-ink` | `#3F7A7E` | teal 深階：小字、連結、focus；**禁止當新品牌色** |
| `color/mint` | `#D1E6E7` | teal 淺階：次按鈕底、輸入框 |
| `color/amber` | `#D9A441` | **語意琥珀**：未驗證／待確認（待處理） |
| `color/amber-ink` | `#8A611C` | 琥珀深階：chip 文字、描邊 |
| `color/amber-soft` | `#F8EBD1` | 琥珀淺底：小進度條、裝飾線 |
| `color/red` | `#BC5646` | **語意暖紅**（burnt，非粉紅）：不是井、辨識錯誤、刪除 |
| `color/red-ink` | `#98412F` | 暖紅深階：chip 文字、描邊按鈕文字 |
| `color/red-soft` | `#F7E5DF` | 暖紅淺底：小進度條、裝飾線 |
| `color/white` | `#FFFFFF` | 純白：Hero 主標文字（見 §7）、圖釘白芯 |

### 2.2 語意色速查（硬規則 T 表）

| 語意 | 色組 | 出現位置 |
|---|---|---|
| 肯定／已登記 | Teal | 是井鈕、已驗證數字與 chip、已登記圖釘、主按鈕 |
| 待處理／未驗證 | Amber | 未驗證數字與 chip、待確認標籤、未登記圖釘 |
| 否定／不是井 | Red | 不是井鈕（描邊型）、辨識錯誤 chip、刪除操作 |

- ❌ **禁止**：亮粉、珊瑚粉、紫羅蘭、螢光綠等 Landing 未出現的裝飾色（沒有語意、不是品牌色的顏色不得進場）
- ❌ 禁止在 Login 之後的頁面使用深黑全版底（Landing 關鍵字區除外）

### 2.3 透明度與玻璃

| Token | 值 | 用途 |
|---|---|---|
| `glass/70` | `rgba(255,255,255,0.7)` + `blur(14px)` | TopNav、Map 資訊面板 |
| `overlay/mist-35` | `rgba(255,255,255,0.35)` | 三層圖片堆疊的中景層 |
| `overlay/mist-60` | `rgba(255,255,255,0.6)` | 三層圖片堆疊的後景層（日光遞進） |
| `overlay/photo-tint` | `rgba(44,50,47,0.18)` | Hero/Check 照片上文字對比特（柔和不壓夜） |
| `hairline` | `1px solid rgba(229,226,217,0.9)` | **淺暖灰髮絲線**：卡片描邊、分隔線 |

### 2.4 漸層 v2（該穩的地方必須穩）

```css
/* Hero 文字側柔化（白天版：不壓黑，僅輕柔收邊） */
--gradient-photo: linear-gradient(90deg,
  rgba(44,50,47,0.28) 0%, rgba(44,50,47,0.12) 45%, rgba(44,50,47,0) 78%);

/* 照片底部融入暖底（消除「圖片切邊」，取代 v1 的黑色 fade） */
--gradient-paper-fade: linear-gradient(180deg,
  rgba(247,246,241,0) 0%, rgba(247,246,241,0.94) 90%);

/* 頁面光照地層：亮白 → 暖米白 → 暖灰，淺色系的地層感 */
--gradient-paper-strata: linear-gradient(180deg,
  #FBF9F4 0%, #F7F6F1 55%, #F1EFE9 100%);

/* Login 右側暖米白面板 — 照片漸出自然混合 */
--gradient-login: linear-gradient(90deg,
  rgba(247,246,241,0) 0%, rgba(247,246,241,0.92) 18%, #F7F6F1 100%);

/* 主按鈕青碧微漸層（同組 teal，增加暖陽立體感） */
--gradient-primary: linear-gradient(135deg, #6DAEB1 0%, #54999D 100%);

/* 輪播白霧漸出（表達還有更多卡片） */
--gradient-fade: linear-gradient(90deg,
  rgba(247,246,241,0) 0%, rgba(247,246,241,1) 62%);
```

---

## 3. 字體系統 v2 (Typography)

### 3.1 字體家族

| 角色 | 字體 | v2 說明 |
|---|---|---|
| 中文展示/標題 | **Noto Serif TC** (Black 900 / Bold 700 / Medium 500 / Regular 400) | 全站唯一字體家族 |
| 中文內文 | **Noto Serif TC** Medium 500 / Regular 400 | **統一改用 Noto Serif**（原 Noto Sans TC 不再用於 UI） |
| 英文眉標/點綴 | **Noto Serif TC** Italic（Serif Italic 斜體） | 用於 kicker、章節編號、座標等註腳級英文 |

### 3.2 字距規則 (v2 最大變更)

| 對象 | letter-spacing | line-height |
|---|---|---|
| 中文巨型標 (≥96px) | `+0.04em` | 1.15 |
| 中文大標 (40–64px) | `+0.06em` | 1.3 |
| 導航連結 (32px) | `+0.08em` | 1 |
| 英文眉標 kicker (13–16px) | `+0.28em` 全大寫 | 1.6 |
| 卡片 metadata (16px) | `+0.05em` | 1.6 |
| 內文 | `+0.02em` | 1.8 |

> CJK 字體放巨大時預設字距會擠在一起，`+0.04~0.06em` 是「高級感」最便宜的來源。

### 3.3 字級表 (沿用 v1 §3.2，新增以下)

| Token | 字體 | 字重 | 字號 | 用途 |
|---|---|---|---|---|
| `kicker` | Serif Italic | 500 | 14 | 英文眉標 |
| `folio` | Sans | 400 | 12 | 頁腳註腳 (`+0.2em` 大寫) |
| `index` | Serif Black | 900 | 128 | 半透明章節編號 |

### 3.4 編輯室語法 (Editorial Devices) — 新增

| 裝置 | 規格 |
|---|---|
| ① Kicker 眉標 | 48×1px 青碧線（20% 透明）+ 14px teal 英文大寫 (`+0.28em`) + 16px 深炭中文 (`+0.3em`)，三者水平排列、間距 16px |
| ② 章節編號 | Noto Serif Black 128px，`color/ink` 於 **8% 透明度**，絕對定位於區塊角落（如右上、左下） |
| ③ 直排中文 | `writing-mode: vertical-rl`，`+0.4em` 字距，用於區塊右緣裝飾（如「精準定位」「航拍紀錄」） |
| ④ 註腳列 Folio | 頂部 1px 暖灰髮絲線 + 左右 12px 英文大寫小字（地點/座標），仿雜誌頁腳 |

---

## 4. 質感與光影 (Texture & Light) — v2 新章

### 4.1 紙張顆粒 (Paper Grain)

暖底與照片統一疊一層全域顆粒（呼應紙張與底片）：

```css
.grain::after {
  content: "";
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,..."); /* feTurbulence fractalNoise */
  opacity: 0.035;              /* 3–3.5%，不可察覺但消除數位感 */
  mix-blend-mode: multiply;    /* 暖底用 multiply（紙感），照片用 soft-light（底片感） */
  pointer-events: none;
}
```

### 4.2 圖片調色配方 (Sunlit Grade)

任何航照進入頁面，依序疊加：

1. 原圖 (`object-fit: cover`) — **保白天亮度，不壓暗**
2. `--gradient-photo` — 僅文字側輕柔收邊（Hero/Check）
3. `--gradient-paper-fade` — 底部融入暖底，消除切邊
4. grain — 紙張顆粒（soft-light 3%）

### 4.3 毛玻璃 (Glass)

| 對象 | 規格 |
|---|---|
| 滾動後 TopNav | `rgba(251,249,244,0.7)` + `backdrop-filter: blur(14px) saturate(1.1)` + 底部 1px 暖灰髮絲線 |
| 地圖資訊浮層 | `rgba(255,255,255,0.7)` + `blur(20px)`，地圖若隱若現 |

---

## 5. 效果 v2 (Effects)

| Token | 值 | 說明 |
|---|---|---|
| `shadow/card` | `0 12px 32px -8px rgba(58,63,58,0.10), 0 4px 12px rgba(58,63,58,0.04)` | 暖灰軟影（**禁用純黑硬影、禁 8px 8px 偏移**） |
| `shadow/float` | `0 20px 50px -12px rgba(98,164,167,0.18)` | 統計面板、浮動面板（青碧色調） |
| `shadow/brand-glow` | `0 8px 28px -8px rgba(98,164,167,0.35)` | 主按鈕 hover 青碧光暈 |
| `border/hairline` | `1px solid rgba(229,226,217,0.9)` | 卡片淺灰描邊、分隔線 |
| `border/brand-line` | `1px solid rgba(98,164,167,0.35)` | 青碧髮絲線（kicker、hover 底線） |
| `shadow/focus` | `0 0 0 3px rgba(98,164,167,0.25)` | 輸入框 focus 柔光圈 |

---

## 6. 元件模式 v2 (Component Patterns)

結構沿用 v1 §6，以下僅列升級差異。

### 6.1 TopNav v2

| 狀態 | 規格 |
|---|---|
| 頂部 (未滾動) | 透明浮於航照；連結深炭 32px `+0.08em`；或直接 `glass/70` 底（**直角條**） |
| 滾動後 | 毛玻璃 (§4.3) + 底部暖灰髮絲線；高度 70→64px 微縮 |
| 連結 hover | 不出現底色；文字下方浮出 24×1px 青碧線 (300ms) |
| 當前頁指示 | 連結左側 6×6px `color/brand` 小方塊（呼應 Logo） |
| 登入鈕 | 200×70 青碧實心**直角**；hover 加 `shadow/brand-glow` |

> 全域規則：**TopNav、卡片、按鈕、輸入框、chip、面板、圖疊一律直角，`border-radius: 0`，沒有活口**。

### 6.2 按鈕 v2

| 變體 | 規格 |
|---|---|
| Primary（青碧實心） | `gradient-primary` 底 + 白字，**直角**；hover `scale(1.02)` + `shadow/brand-glow`，400ms expo |
| Secondary（mint 實心） | `color/mint` 底 + ink 字，**直角** — 中性操作（匯入 CSV） |
| Ghost（新增） | 透明底 + 1px `color/brand/25` 髮絲框 + `color/brand-ink` 字；hover 框與字轉 `color/brand`——奢華感來自「只有線變色」 |
| **否定鈕（不是井／辨識錯誤）** | **白底 + 2px `color/red` 描邊 + `color/red-ink` 字**（否定用描邊型，不用滿版紅） |
| 巨型 CTA (371×108) | `gradient-primary`、**直角**；右側圖釘改為 → 箭頭，hover 時箭頭右移 6px |

### 6.3 水井卡片 v2 — 留白、直角、chip

```
┌────────────────────────────┐
│ [航照縮圖 400×400, 直角]        [已驗證 chip] ← 右上角 |
│                            │
├────────────────────────────┤
│  SW-2023-A01      ← 32px Bold ink  │
│  ⊕ 23.456, 120.123 ← 16px ink-soft │
│  🕐 2023-10-11 14:30               │
└────────────────────────────┘
```

- 卡片底 `color/surface`（白）、1px `border/hairline`、**直角**、內距 20px（**留白充足**）
- 圖片區 400×400 正方形 cover，**直角**；圖片與 metadata 區以 1px 暖灰髮絲線分隔
- **metadata 區（圖片下方的白底區）**：井號 32px Bold `color/ink` → 座標/時間 16px `color/ink-soft`（icon 30×30 teal/墨水灰）
- **狀態 chip（圖片右上角，疊於圖上）**：chip 為 **白玻璃底 `rgba(255,255,255,0.85)` + 語意色字**（在綠田航照上才可讀）：
  - `mint` 底 + `color/brand-ink` 字 + ✓ → 「已驗證」
  - `amber-soft` 底 + `color/amber-ink` 字 + 圓點 → 「未驗證」
  - `red-soft` 底 + `color/red-ink` 字 + ✕ → 「辨識錯誤」
- hover：整卡 `translateY(-6px)`、圖片 `scale(1.05)` 700ms、井號下浮現 32×1px 青碧線
- 輪播漸出：以 `gradient-fade` **白霧**覆蓋右側（非黑色）

### 6.4 表單輸入框 v2 (Login)

| 屬性 | v1 | v2 |
|---|---|---|
| 底 | `color/mint` 實心 | `color/surface-muted`（暖灰次級面） |
| 描邊 | 無 | 1px `border/hairline`（**直角**） |
| 焦點態 | 無 | `shadow/focus` 青碧柔光圈 + 框體上浮 `translateY(-2px)` |
| 標籤 | (無) | 新增 12px 英文小標 `ACCOUNT / PASSWORD`，青碧 `+0.28em`，置於框上方 12px |

### 6.5 統計面板 v2 — 白底數字 + chip

- 容器：`color/surface` 白底、**直角**、`shadow/float`；四欄以 1px 暖灰豎線分隔（非色塊硬切）
- **數字規則（不套色塊底）**：
  - 「已驗證」128px 大數字 = `color/brand`（唯一 teal）
  - 「未驗證」128px 大數字 = `color/amber`
  - 附各自語意 chip（白玻璃底 + 語意色字／描邊：mint 系 teal、amber 系、red 系）
- 右側三個匯出橫條：Export CSV ×2（中性描邊鈕）+ Export Folder（teal 主按鈕 + 資料夾圖示 84×84）；hover 左側浮出 4px `color/brand` 豎條

### 6.6 分割驗證鈕 v2（不是井 / 是井）

兩顆**直角**按鈕並排（間距 12px）：
- 左：「不是井」**白底 + 2px `color/red` 描邊 + `color/red-ink` 字**（否定描邊型）
- 右：「是井」`gradient-primary` 底 + 白字；hover 加 `shadow/brand-glow`

### 6.7 區塊標題列 v2

```
■ 已驗證的水井                                    全選 ○
```

- 左：58×58 青碧方塊 + 64px Black 深炭標題；標題後延伸 24×1px 青碧線
- 右：「全選」36px Black + 46×46 空心圓（`color/brand` 3px 描邊）

### 6.8 三層圖片堆疊 v2（Check 頁）— 日光遞進

- 前 640×640 清晰；中 `overlay/mist-35`；後 `overlay/mist-60`（原黑霧改**白霧**，陽光從後往前漸清）
- 每層 1px 白描邊 + **直角**，x 依序 960/1080/1191

---

## 7. 旗艦規格：Hero（以 landing.png 第一屏為準）

結構 (自上而下)：

1. **TopNav** — `glass/70` 直角條浮於最頂 (§6.1)
2. **Kicker 眉標** — 青碧線 + `AERIAL INTELLIGENCE` + 「航拍智慧辨識」(§3.4-①)
3. **巨型主標** — 「AI水井辨識系統」Noto Serif Black 240px (RWD 收斂至 64–120px)，**純白 `#FFFFFF` 實心字**（不挖空、不填 teal/綠），疊 `gradient-photo` + 輕微 drop-shadow 確保在白天航照上可讀；字距 `+0.04em`、行高 1.05、左距 96px
4. **副標一行** — 20px Sans，`rgba(44,50,47,0.72)`（深炭 72%，白天版），如「以航拍影像，讀懂每一口井的位置」
5. **CTA 組** — 巨型 CTA「登入使用 →」(371×108 青碧) + Ghost「了解更多」並排，間距 24px
6. **右緣直排裝飾** — 「精準・快速」直排青碧小字，絕對定位右側 (§3.4-③)
7. **底部捲動提示** — 12px `SCROLL` 大寫 + 1px × 48px 垂直青碧線，置中於 hero 底部 40px

光影：航照保白天亮度 + §4.2 配方（柔邊 / 底融 / 顆粒）。

---

## 8. 動態系統 (Motion) — v2 新章

| Token | 值 | 用途 |
|---|---|---|
| `ease/expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | 全站預設緩動 (快出慢收，鏡頭感) |
| `dur/fast` | 300ms | hover 青碧線、icon 位移 |
| `dur/base` | 400ms | 按鈕、浮層 |
| `dur/slow` | 700ms | 卡片浮起、圖片 scale |
| `dur/cine` | 1200ms | 進場揭示 |

進場編排 (每個區塊進入 viewport 時)：

- 圖片：`opacity 0 → 1` + `scale 1.06 → 1` (1200ms expo)
- 標題：`translateY(24px)` + `opacity 0 → 1` (700ms)
- 眉標青碧線：`scaleX 0 → 1` (transform-origin: left，600ms)
- 同區塊元素依序 delay `+80ms` (錯開上浮)

環境動畫：

- Hero 航照 **Ken Burns**：`scale 1.0 → 1.08`，20s 無限緩推
- 捲動視差：背景圖 `translateY` = scroll × 0.15 (僅 Landing/Login)

---

## 9. 版面節奏 v2 (Layout Rhythm)

| 項目 | v1 | v2 |
|---|---|---|
| 頁邊距 | 80px | 80px (桌機) / 24px (手機) |
| 區塊垂直間距 | 未規範 | 160–240px (Hero 後第一區 240px，其餘 160px) |
| 內容最大欄寬 | — | 文字欄 720px；卡片柵 1760px |
| 卡片間距 | 65px | 64px (維持 8 的倍數) |
| 不明暗翻臉 | — | 登入後頁面底 = `color/bg-paper`，禁止深黑底；Landing 關鍵字區 `#2C322F` 為唯一深底段落 |
| 不對稱排版 | 「精準/快速」已用 | 擴及所有區塊：標題左右交錯、圖文 7:5 或 5:7 非對稱欄 |

---

## 10. 頁面規格 v2 (Page Deltas)

| 頁面 | v2 升級重點 |
|---|---|
| Landing `#7:61` | Hero 依 §7 重建；「精準」「快速」120px 深炭字各配 kicker (`PRECISION` / `SPEED`) 與半透明章節編號 01/02；航照帶之間以 `gradient-paper-fade` 無縫銜接暖底；關鍵字區 `#2C322F` 深底色帶為**全站唯一深底**（品牌敘事保留） |
| Login `#67:520` | 右欄深底改 `gradient-paper-strata`（暖白層地）；「登入」64px 上方加 kicker `MEMBER SIGN IN`；輸入框依 §6.4（暖灰次級面）；submit `gradient-primary`；照片與暖白以 `gradient-login` 漸出混合 |
| Map `#33:68` | 資訊浮層毛玻璃 (§4.3)；**圖釘：已登記 = `color/brand` 青碧、未登記 = `color/amber` 琥珀**；面板 640×640 圖底部 64px 漸融，井號壓於其上 |
| Check `#62:438` | 井號 96px 加 `+0.04em` 字距與 kicker `VERIFYING`；三層圖片堆疊改**白霧日光遞進** (§6.8)；分割鈕依 §6.6（不是井=紅描邊／是井=teal） |
| Export `#69:561` | 統計面板依 §6.5（白底數字彩 chip）；區塊標題列青碧小方塊 + 標題後青碧線延伸；卡片依 §6.3（白卡 + 狀態 chip，無整卡色塊） |
| Dashboard / Records / Settings / Users / Import | v1 未出圖；實作時沿用本文件 tokens，並遵守 §1 原則、§2.2 語意速查與 §12 檢查清單 |

---

## 11. 實作速查 (Cheat Sheet v2)

```css
:root {
/* Colors — 單一品牌色 + 語意色 */
--bg-paper: #F7F6F1;        /* 暖米白（全站基底） */
--bg-sunlit: #FBF9F4;       /* 亮白微層次 */
--surface: #FFFFFF;         /* 卡片/面板 */
--surface-muted: #F1EFE9;   /* 暖灰次級面 */
--ink: #2C322F;             /* 主文字 */
--ink-soft: #6F7468;        /* 輔助文字 */
--brand: #62A4A7;           /* ★唯一 teal — 萃取自 Landing */
--brand-ink: #3F7A7E;       /* teal 深階（小字/hover） */
--mint: #D1E6E7;            /* teal 淺階（chip/次按鈕底） */
--amber: #D9A441;           /* 未驗證/待處理 */
--amber-ink: #8A611C;
--amber-soft: #F8EBD1;
--red: #BC5646;             /* 不是井/辨識錯誤/刪除 */
--red-ink: #98412F;
--red-soft: #F7E5DF;
--white: #FFFFFF;           /* Hero 主標、圖釘白芯 */

/* 幾何 — 全站直角，border-radius: 0 */
--radius: 0;

  /* Lines */
  --hairline: 1px solid rgba(229,226,217,0.9);      /* 淺暖灰 */
  --brand-line: 1px solid rgba(98,164,167,0.35);    /* 青碧 */

  /* Shadows — 禁純黑硬影、禁 8px 8px 偏移 */
  --shadow-card: 0 12px 32px -8px rgba(58,63,58,.10), 0 4px 12px rgba(58,63,58,.04);
  --shadow-float: 0 20px 50px -12px rgba(98,164,167,.18);
  --shadow-brand-glow: 0 8px 28px -8px rgba(98,164,167,.35);

  /* Gradients */
  --gradient-photo: linear-gradient(90deg, rgba(44,50,47,.28) 0%, rgba(44,50,47,.12) 45%, rgba(44,50,47,0) 78%);
  --gradient-paper-fade: linear-gradient(180deg, rgba(247,246,241,0) 0%, rgba(247,246,241,.94) 90%);
  --gradient-paper-strata: linear-gradient(180deg, #FBF9F4 0%, #F7F6F1 55%, #F1EFE9 100%);
  --gradient-primary: linear-gradient(135deg, #6DAEB1 0%, #54999D 100%);
  --gradient-fade: linear-gradient(90deg, rgba(247,246,241,0) 0%, rgba(247,246,241,1) 62%);
  --glass: rgba(251,249,244,.7);

  /* Motion */
  --ease-expo: cubic-bezier(0.22, 1, 0.36, 1);
}

/* Typography — 全站統一 Noto Serif */
body       { font-family: 'Noto Serif TC', serif; letter-spacing: 0.02em; line-height: 1.8; }
h1, .display { font-family: 'Noto Serif TC', serif; font-weight: 900; letter-spacing: 0.04em; }
h2, .heading { font-family: 'Noto Serif TC', serif; font-weight: 700; letter-spacing: 0.06em; }
.kicker    { font-style: italic;
             font-size: 14px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--brand); }

/* 狀態 chip — 白底色標籤（直角），疊於圖片右上角 */
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 0;  /* 全站直角 */
  background: rgba(255,255,255,0.85);    /* 白玻璃底 */
  font: 700 14px/1 'Noto Serif TC';
}
.chip--verified { color: var(--brand-ink); border: 1px solid var(--brand-ink); }
.chip--pending  { color: var(--amber-ink); border: 1px solid var(--amber-ink); }
.chip--error    { color: var(--red-ink);   border: 1px solid var(--red-ink); }
```

---

## 12. 驗收清單 (Premium Checklist)

實作完成後逐頁自檢：

- [ ] **明暗連貫** — 登入後所有頁面底為暖米白，無深黑 SaaS 後台斷層
- [ ] **單一品牌色** — teal 只准 `#62A4A7`（深階 `#3F7A7E` 僅小字/hover）；無第二個 teal hex；Hero 主標是**純白字**（非 teal、非挖空填色）
- [ ] **語意色守則** — 未驗證 = 琥珀、不是井/辨識錯誤 = 暖紅；**全站無粉紅／珊瑚／無語意裝飾色**
- [ ] **全站直角** — 卡片、按鈕、輸入框、chip、面板、導航、圖疊 `border-radius: 0`，無活口
- [ ] **全站字體** — 一律 Noto Serif TC（含內文、按鈕、chip、表格），未混用 Noto Sans
- [ ] 每張航照都有 §4.2 處理（白天亮度 + 柔邊 / 底融 / 顆粒），底部無生硬切邊
- [ ] 中文大標字距 ≥ `+0.04em`，無「字黏在一起」感
- [ ] 卡片 = 白底 + 1px 淺灰描邊 + 直角 + 留白 20px；狀態 chip 置於**圖片右上角（白玻璃底 + 語意色字）**，metadata 區在下方白底，無高飽和色塊鋪滿卡片
- [ ] 彩色使用只有四組：teal / amber / red / 暖灰黑（`ink`）
- [ ] 無任何 `8px 8px` 硬偏移陰影；陰影帶暖灰或青碧色調
- [ ] 所有互動動畫使用 `--ease-expo`，時長 300–700ms
- [ ] 該透明的透明（玻璃導航、白霧漸出、chip 白玻璃底）；該漸層的漸層（photo 柔邊、paper strata、gradient-primary、白霧 fade）
- [ ] Hero 有 kicker、直排裝飾、捲動提示三者至少其二