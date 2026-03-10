# Outo Traveling App — 專案交接 Prompt (v2.6.0)

> 請在新的 Cowork 聊天室開頭貼上以下內容，讓 AI 立即了解專案全貌。

---

## 一、專案概述

你正在協助開發「Outo Traveling App」，一個專為半自助旅行者設計的越南旅遊行動網頁應用（Mobile-first Web App）。目標是整合行程、天氣、地圖、攻略、匯率、記帳等功能於一體，以簡潔明瞭的 UI/UX 讓使用者輕鬆上手。

- **目前版本**：v2.12.0
- **設計風格**：iOS 17/18 風格，輕量簡潔
- **技術棧**：原生 HTML/CSS/JS + Vite 5.4.0（ES Module bundler）
- **資料來源**：Google Sheets（透過 PapaParse CSV 解析）
- **部署方式**：GitHub → Vercel 自動部署
- **GitHub Repo**：`skycookie0109-ux/outo-traveling-app`（main 分支）
- **Vercel 專案**：`outo-traveling-app-ver1`
  - Team ID：`team_o3qxVg1H0GtJXyQ49xWyNEVp`
  - Project ID：`prj_gye4JGPd5kgv4SUbNa4Ncj5CLyUU`
- **PWA**：已啟用 Service Worker（Network First 策略）
  - CACHE_NAME：`outo-v2.6`
- **深色模式**：已於 v2.3 移除

---

## 二、專案架構

```
v2.6.0-current/
├── index.html              # 主頁面（所有 HTML 結構）
├── package.json            # Vite 設定，版本號 2.6.0
├── vite.config.js          # Vite 開發/打包設定
├── .gitignore
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker (Network First)
│   └── icons/              # PWA 圖標 (192px, 512px)
└── src/
    ├── main.js             # App 入口點，引入所有模組與樣式
    ├── modules/            # 18 個 JS 模組
    │   ├── eventbus.js     # 發布/訂閱事件系統
    │   ├── store.js        # 全域狀態管理
    │   ├── config.js       # API Key、Sheet ID、圖片常量
    │   ├── data.js         # Google Sheets 資料載入
    │   ├── ui.js           # UI 渲染 + 左滑完成手勢
    │   ├── templates.js    # HTML 模板（timelineRow、weatherCard Grid 2×2 + [☁ 描述] pill 標籤 等）
    │   ├── actions.js      # 使用者操作（開啟詳情、完成標記、票券輪播、QR 放大、掃描驗票、本地 QR 生成等）
    │   ├── settings.js     # 設定面板 + 長按保護
    │   ├── weather.js      # 天氣 API（Open-Meteo）+ 穿搭建議 + 降雨分級 + FA 圖示 + 逐時結果卡片 + 24H 溫度趨勢圖（首頁天氣卡已移除儀表板點擊）
    │   ├── map.js          # Google Maps 整合
    │   ├── rec.js          # 攻略推薦系統
    │   ├── currency.js     # 匯率轉換
    │   ├── finance.js      # 記帳功能
    │   ├── note.js         # 筆記功能
    │   ├── info.js         # 資訊面板
    │   ├── image.js        # 圖片處理
    │   ├── language.js     # 翻譯功能
    │   └── utils.js        # 工具函式
    └── styles/             # 14 個 CSS 檔案
        ├── main.css        # 入口 CSS（@import 所有其他）
        ├── base.css        # 設計 Token（CSS 變數）
        ├── header.css      # 頂部導航 + 日期 tab
        ├── timeline.css    # 時間軸 + 行程卡 + 左滑手勢
        ├── weather.css     # 天氣卡 Grid 2×2 佈局 + [☁ 描述] pill 標籤 + 溫度加大 + 降雨進度條 + 儀表板 + 滑桿美化 + 逐時卡片 + 趨勢圖 + 圖示動畫
        ├── map.css         # 地圖相關
        ├── currency.css    # [v2.9] 匯率轉換（漸層基準區 + 結果清單 + 幣別選擇器）
        ├── rec.css         # 攻略推薦（左色條 + 漸層icon + 副標 + inline ribbon 脈動光暈）
        ├── ticket.css      # 票券樣式（carousel 輪播 + QR 放大 overlay + 桌面版箭頭 + 指示器 + 掃描器 overlay）
        ├── finance.css     # 記帳
        ├── info.css        # 資訊
        ├── fab.css         # 浮動按鈕
        ├── modals.css      # 彈窗/面板
        └── responsive.css  # 響應式（僅 layout，平板+ 攻略兩欄）
```

---

## 三、核心技術架構

### 3.1 EventBus 事件系統
模組之間透過 EventBus 溝通，主要事件：
- `APP:DAY_CHANGED` — 切換天數時觸發（會重新渲染 tabs、timeline、天氣、地圖）
- `DATA:READY` — Google Sheets 資料載入完成
- `UI:OPEN_DETAIL` — 開啟行程詳情面板

### 3.2 全域 App 物件
因為 HTML 有大量 `onclick="App.Actions.xxx()"` 直接呼叫，所以需要 `window.App` 掛載所有模組。

### 3.3 localStorage 使用
- `done_{dayId}_{idx}` — 行程完成標記
- `ticket_used_{ticketId}` — 票券已使用狀態（v2.12 新增）

### 3.4 行程完成標記機制（v2.5 最新）
- 兩種觸發方式：勾選按鈕（✓ checkbox）+ 左滑手勢（swipe-to-complete）
- `toggleComplete()` 使用**直接 DOM 操作**（classList.toggle），不觸發 `APP:DAY_CHANGED`
- 左滑手勢：事件委派在 `#timeline-content`，70px 門檻，三次方阻尼曲線
- 視覺效果：刪除線 + 半透明（opacity: 0.6）+ 綠色圓點 + 綠色勾選圖示

### 3.5 Service Worker 快取策略
- 本地資源（HTML/JS/CSS）：Network First（確保部署後立即更新）
- CDN 資源（字體等）：Cache First
- 圖片（Unsplash）：Cache First
- API（Google Sheets、Open-Meteo 等）：完全跳過快取

---

## 四、重要設計 Token（base.css）

- `--accent`: #ff9800（橘色，選中日期 tab）
- `--primary`: #0891b2（青色，主要品牌色）
- `--success`: #10b981（綠色，完成狀態）
- `--bg-body`: #f0f8ff + radial-gradient 點點背景

---

## 五、重要開發規則（必遵守）

### 5.1 版本標記格式
所有程式碼中的版本標記統一使用 `[v2.x]` 格式（小寫 v + 數字），例如 `[v2.5]`。

### 5.2 響應式同步修正
修改時要確認手機和平板都能正常顯示。`responsive.css` 只有 layout 調整。

### 5.3 每次修改後都要附上教學
完成修改後，請說明：改了什麼、涉及哪些檔案、使用者需要注意什麼。

### 5.4 Local 與 GitHub 同步規則（必遵守）
**每次執行修正、優化、編輯程式碼等步驟時，Local 端及 GitHub 端必須同步更新，包含程式碼及說明文件。** 具體流程：
1. 修改 Local 端程式碼（直接透過 Edit/Write 工具）
2. 同步修改 GitHub 端程式碼（透過 github.dev 瀏覽器編輯 或 GitHub API）
3. 在 github.dev 提交 commit 並推送
4. 確認 Vercel 自動部署成功（狀態為 READY）
5. 更新本文件（專案交接 Prompt）中的版本歷程與相關說明

> **重要**：不可只改 Local 或只改 GitHub，必須兩端都完成才算完成一個修改任務。

### 5.5 確認再執行
使用者非常重視「理解正確後才動手」。執行前應先完整複述理解，確認後再動手。

### 5.6 版本升級 Checklist
每次升版時，以下檔案的版本標記必須全部更新，不可遺漏：

| 檔案 | 需更新位置 |
|------|-----------|
| `package.json` | `"version"` 欄位 |
| `public/sw.js` | `CACHE_NAME` 常量 + 檔頭註解 `[v2.x]` |
| `src/main.js` | 檔頭註解 `(v2.x)` + changelog 新增一行 `[v2.x]` |
| 被修改的模組 `.js` | 對應功能的 `[v2.x]` 註解標記 |
| `src/modules/templates.js` | 若模板有變動，更新對應 `[v2.x]` |
| 本文件（交接 Prompt） | 版本號、CACHE_NAME、資料夾名稱、版本歷程表 |

### 5.7 票券模組架構與注意事項（v2.11）

**資料流**：
```
Google Sheets「Tickets」分頁 → data.js fetchSheet("Tickets") → Store.tickets → rec.js 查詢顯示 → actions.js 輪播渲染
```

**Store.tickets 結構**：`{ recKey: [{ name, ticketId }] }` — 以 Recs Key 為鍵，陣列中每個物件代表一張票

**Tickets Google Sheets 格式**（一行一人）：

| A (RecKey) | B (MemberName) | C (TicketID) | D (Note) |
|---|---|---|---|
| ba_na_hill | 王小明 | TK-BANA-001 | 成人票 |
| ba_na_hill | 李小花 | TK-BANA-002 | 成人票 |

**票券輪播機制**：
- `_renderCarousel()` 一次渲染所有卡片，使用 CSS `scroll-snap-type: x mandatory` 實現觸控滑動
- `.carousel-wrapper` 限制 `max-width: 440px` 讓桌面版也呈現「一張為主 + 旁邊露出」的效果
- 首張置中：雙層 `requestAnimationFrame` 確保 DOM layout 完成後，以 wrapper 實際寬度計算 `paddingLeft/Right`
- `event.stopPropagation()` 僅加在 `.carousel-wrapper`，其餘區域（overlay / modal / content-area）點擊皆可關閉票券

**QR 放大模式**：
- `zoomQR(idx)` 建立全螢幕白底 overlay（z-index: 30000），包含所有票券 QR 的 scroll-snap 輪播
- 使用 Wake Lock API 防止螢幕休眠（`navigator.wakeLock.request('screen')`），關閉時釋放
- 桌面版同時支援滑鼠拖曳（`_initQRDrag()`）

**桌面版專屬功能**（透過 CSS `@media (hover: hover) and (pointer: fine)` 偵測）：
- 左右箭頭按鈕（hover 容器時 opacity 0.7 顯示）
- 鍵盤方向鍵 ← → 切換票券、Esc 關閉 QR 放大
- 滑鼠拖曳：mousedown → mousemove 改 scrollLeft → mouseup snap 回最近卡片

**QR Code 本地生成（v2.12）**：
- 使用 `qrcode-generator` npm 套件（~30KB），完全取代外部 `api.qrserver.com` API
- `generateQRDataURL(text, cellSize)` 回傳 base64 data URL，直接設為 `<img src>`
- 票券卡片用 cellSize=3（小圖），QR 放大模式用 cellSize=6（大圖）

**掃描驗票功能（v2.12，測試版）**：
- 使用 `html5-qrcode` CDN 庫（~80KB），首次使用時動態載入
- `openScanner()` 建立全螢幕掃描 overlay（z-index: 35000），啟動後鏡頭自動偵測 QR Code
- 掃描成功後，解析 QR 內容（格式 `ticketId | spotName`），自動將該票標記為已使用
- 已使用狀態存入 `localStorage`（key: `ticket_used_{ticketId}`），關閉/重啟 App 後仍保留
- 「重置所有驗票紀錄」按鈕可清除所有 `ticket_used_*` localStorage（僅測試版使用）
- 正式版將移除此功能

**品牌 Loading 畫面（v2.12）**：
- 採用 A1 方案：深綠底色 `#1b3a2a` + cream 色 Playfair Display 字體 `outo` + 金色太陽 SVG 旋轉動畫
- 太陽尺寸與 Logo 原始比例一致（約文字高度的 55%）
- 三圓點脈動 loading 指示器（金色 `#f0a500`）

**注意事項**：
- 修改票券 HTML 結構時，確保 `event.stopPropagation()` 只在 `carousel-wrapper` 上，不要加在 `ticket-content-area` 或 `ticketModal`，否則會導致點擊背景無法關閉
- `_initDrag()` 拖曳時會暫停 `scroll-behavior: smooth` 以避免與手動 `scrollLeft` 設定衝突，mouseup 後才恢復
- QR 放大的 Wake Lock 在 `_closeQR()` 和 `closeTicket()` 兩處都會釋放，確保不會遺漏
- `qrcode-generator` 是 npm 依賴（已加入 package.json），Vite 會自動打包；`html5-qrcode` 是 CDN 動態載入（不影響打包體積）
- 掃描功能需要 HTTPS 環境才能存取相機（Vercel 部署即為 HTTPS）

---

## 六、版本歷程

| 版本 | 說明 |
|------|------|
| v1.0 | 模組化重構（18 JS + 14 CSS + Vite） |
| v2.0 | 新增 PWA + 深色模式 + 行程完成標記 |
| v2.2.0 | PWA + 深色模式更新 |
| v2.2.1 | 深色模式色調修正 |
| v2.2.2 | 深色模式全面修正 + toggleComplete DOM 直接操作 + 長按保護 |
| v2.3.0 | 移除深色模式 + 清理遺留檔案 |
| v2.4.0 | iOS 17/18 風格 UI/UX 全面翻新（11 phases）+ 天氣儀表板重設計 |
| v2.5.0 | 左滑完成手勢 + 勾選修復 + 動畫優化 + 快取策略更新 |
| v2.6.0 | 天氣強化：穿搭建議 + 降雨分級 + FA 圖示升級 + 溫度漸層條 + 降雨進度條 + Modal 滑桿美化 + 逐時結果卡片 + 24H 趨勢圖 + 圖示動畫 + 卡片微互動 + 進場動畫 + reduced-motion 支援 |
| v2.7.0 | 記帳分類標籤（6 類）+ 刪除確認機制 / 常用詞分類標籤列 + 翻譯卡片美化 |
| v2.8.0 | 地圖毛玻璃 Popup 卡片 + 路線段膠囊標籤升級 |
| v2.8.1 | Popup 桌面版對比修正（頂部漸層色條 + 雙層陰影 + 灰外框線）|
| v2.9.0 | 匯率模組重構：方案D 漸層基準區 + 下拉切換 + 緊湊結果清單 + CSS 外部化 + 多幣別支援；天氣卡優化：移除天氣儀表板點擊 + Grid 2×2 佈局 + 圖示併入描述標籤 [☁ 多雲] + 溫度加大平衡視覺 |
| v2.10.0 | 攻略推薦優化：左側 3.5px 分類漸層色條 + icon 漸層背景 + 分類副標（Sheets Subtitle 欄）+ ribbon 圓角膠囊化 |
| v2.10.1 | 攻略 UI 修正：平板+ responsive 三欄→兩欄佈局 + ribbon 改 inline（跟在店名旁）+ 實色紅底白字 + 脈動光暈動畫（2.5s 呼吸循環） |
| v2.11.0 | 票券模組全面重構：橫向滑動卡片輪播（Apple Wallet 風格）+ QR Code 放大掃描模式（含 Wake Lock + 左右滑動切換）+ 桌面版箭頭導覽 + 鍵盤方向鍵 + 滑鼠拖曳 + Tickets 獨立 Google Sheets 分頁（一行一人管理）+ 流水序號取代具名 |
| v2.12.0 | QR Code 本地生成（qrcode-generator，取代外部 API）+ 掃描驗票功能（html5-qrcode 相機掃描，測試版）+ 票券已使用 localStorage 持久化 + Outo 品牌 Loading 畫面（A1 方案：深綠底色 + cream outo 字 + 金色太陽旋轉） ← **目前** |

---

## 七、下一步開發計畫

1. **v2.6.0 天氣資訊強化**（全部完成 ✅）
   - ~~Step 1：穿搭建議 + 儀表板卡片重設計~~ ✅
   - ~~Step 2：溫度漸層條 + 降雨進度條~~ ✅
   - ~~Step 3：Modal 滑桿美化 + 逐時結果卡片 + 24H 趨勢圖~~ ✅
   - ~~Step 4：圖示動畫 + 卡片微互動 + 進場動畫 + reduced-motion~~ ✅
2. **v2.7.0 記帳 + 語言助手優化**（全部完成 ✅）
   - ~~項目 6a：消費分類標籤（6 類：餐飲/交通/住宿/購物/門票/其他）~~ ✅
   - ~~項目 6b：刪除確認機制（兩步點擊 + 3 秒逾時）~~ ✅
   - ~~項目 7a：常用詞分類標籤列（依 icon 自動歸類 5 組）~~ ✅
   - ~~項目 7b：翻譯結果卡片美化（漸層背景 + 朗讀/複製按鈕）~~ ✅
3. **v2.8.0 地圖體驗優化**（全部完成 ✅）
   - ~~方向 A：毛玻璃 Popup 卡片（無圖片、編號徽章、分隔線、導航按鈕）~~ ✅
   - ~~方向 B：路線段膠囊標籤升級（漸層背景、圖示、時間/距離分離顯示）~~ ✅
4. **v2.8.1 Popup 桌面版對比修正**（全部完成 ✅）
   - ~~方案 C：頂部 3.5px 主題漸層色條 + 雙層加深陰影 + 淺灰外框線~~ ✅
5. **v2.9.0 匯率模組重構**（全部完成 ✅）
   - ~~方案D：漸層基準區 + 下拉幣別切換 + 緊湊結果清單~~ ✅
   - ~~CSS 外部化（新建 currency.css，移除所有 inline style）~~ ✅
   - ~~快速金額按鈕（100/500/1,000/5,000/10,000）~~ ✅
   - ~~千分位數字格式化 + 即時匯率更新時間顯示~~ ✅
   - ~~支援多幣別動態清單（可擴充至 6+ 幣別）~~ ✅
   - ~~天氣卡：移除首頁天氣卡點擊開啟儀表板功能（各景點卡片內已有天氣詳情）~~ ✅
   - ~~天氣卡：Grid 2×2 佈局（左上：地名+描述、右上：溫度、左下：狀態+穿搭、右下：降雨）~~ ✅
   - ~~天氣卡：圖示併入描述標籤 [☁ 多雲] pill 配色 + 溫度加大(1.15rem)平衡左右視覺~~ ✅
6. **v2.10.0 攻略推薦模組優化**（全部完成 ✅）
   - ~~卡片左側 3.5px 分類漸層色條（美食橘/購物藍/按摩紫/景點綠）~~ ✅
   - ~~圖示背景改為 135° 漸層圓角（34px→36px）~~ ✅
   - ~~分類副標：Google Sheets 新增 Subtitle 欄 + 前端 fallback 預設值~~ ✅
   - ~~ribbon 改為圓角膠囊（淡紅底 + 紅字 + 圓角全滿）~~ ✅
7. **v2.10.1 攻略 UI 修正**（全部完成 ✅）
   - ~~平板以上 responsive 佈局從三欄改為兩欄（避免卡片過窄 UI 擠壓）~~ ✅
   - ~~ribbon 從絕對定位右上角改為 inline 跟在店名旁（解決與導航按鈕重疊）~~ ✅
   - ~~ribbon 樣式升級：淡粉底→實色紅底白字 + 脈動光暈動畫（2.5s 呼吸循環，4px↔20px）~~ ✅
8. **v2.11.0 票券模組優化**（全部完成 ✅）
   - ~~ticket.css 全面重寫：漸層 header + 頂部 3.5px 亮條 + 微光紋理 + 緊湊 padding~~ ✅
   - ~~狀態獨立成薄橫幅（淡綠底 + 脈動圓點 + 「有效憑證 · 未使用」）~~ ✅
   - ~~QR 掃碼區加淡灰底色圓角，與資訊區形成兩個視覺層次~~ ✅
   - ~~底部操作按鈕列（分享 + 標記已使用），支援 Web Share API~~ ✅
   - ~~多人票券資料格式：獨立 Tickets 分頁（RecKey / MemberName / TicketID / Note），取代舊 TicketInfo 欄位~~ ✅
   - ~~data.js 新增 Tickets 分頁載入 + Store.tickets 結構（{ recKey: [{name, ticketId}] }）~~ ✅
   - ~~rec.js 改為從 Store.tickets 查詢票券，不再依賴 Recs I 欄~~ ✅
   - ~~橫向滑動卡片輪播（取代舊 pager）：CSS scroll-snap + touch 原生滑動 + carousel-wrapper max-width: 440px 限制可視區~~ ✅
   - ~~流水序號取代具名：顯示 #1/4、#2/4 而非成員姓名，方便匿名管理~~ ✅
   - ~~首張票券置中修復：雙層 requestAnimationFrame + 基於 wrapper 寬度計算 padding~~ ✅
   - ~~QR Code 放大掃描模式：點擊 QR 區域 → 全螢幕白底 overlay + 260px 大 QR + Wake Lock 防螢幕休眠 + 亮度提示~~ ✅
   - ~~QR 放大模式支援左右滑動切換：scroll-snap 輪播 + 圓點指示器 + 序號標示 + 桌面滑鼠拖曳~~ ✅
   - ~~桌面版箭頭導覽：hover 時顯示左右箭頭（CSS `@media (hover: hover) and (pointer: fine)` 偵測），第一張隱藏左箭頭、最後一張隱藏右箭頭~~ ✅
   - ~~鍵盤方向鍵支援：← → 切換票券、Esc 關閉 QR 放大~~ ✅
   - ~~桌面滑鼠拖曳修復：拖曳時暫停 scroll-behavior: smooth 避免衝突 + 防止拖曳後誤觸 QR zoom~~ ✅
   - ~~點擊背景關閉修復：stopPropagation 從 ticket-content-area 移至 carousel-wrapper，ticketModal 填滿 overlay（height: 100%），上下左右空白處皆可關閉~~ ✅
   - ~~移除多餘關閉按鈕（pass-close-btn），點擊背景即可關閉，UI 更簡潔~~ ✅
9. **v2.12.0 QR 本地生成 + 掃描驗票 + 品牌 Loading**（全部完成 ✅）
   - ~~QR Code 本地生成：npm 安裝 `qrcode-generator`，`generateQRDataURL()` 完全取代 `api.qrserver.com` 外部 API 呼叫~~ ✅
   - ~~掃描驗票功能（測試版）：CDN 動態載入 `html5-qrcode`，`openScanner()` 全螢幕相機掃描 → 自動辨識 ticketId → localStorage 標記已使用~~ ✅
   - ~~票券操作列新增「掃描驗票」金色按鈕（方案 A：與分享/標記並排）~~ ✅
   - ~~掃描結果畫面：成功（綠色 ✓）/ 已使用（黃色 ⚠）/ 無法辨識（紅色 ✗）三種狀態~~ ✅
   - ~~「重置所有驗票紀錄」按鈕（清除所有 ticket_used_* localStorage，測試版專用）~~ ✅
   - ~~票券已使用 localStorage 持久化：開啟票券時自動恢復「已使用」視覺狀態~~ ✅
   - ~~Outo 品牌 Loading 畫面（A1 方案）：深綠 #1b3a2a 底 + Playfair Display cream #f5f0e0 「outo」+ 金色太陽 SVG 12s 旋轉 + 三圓點脈動指示器~~ ✅
   - ~~package.json 新增 `qrcode-generator` 依賴~~ ✅

---

## 八、開發工作流程（AI 助手必讀）

### 8.1 分工模式
開發任務採 AI + 使用者協作分工，流程如下：

```
【AI 負責】
① 確認理解需求 → ② 修改 Local 程式碼 → ③ 更新版本標記（若涉及升版）→ ④ 更新交接文件

【使用者負責】
⑤ 將修改好的檔案手動上傳至 GitHub（拖拉上傳或貼上）

【AI 接手驗證】
⑥ 確認 Vercel 部署狀態為 READY → ⑦ 線上驗收（截圖 + Console 檢查）→ ⑧ 回報完成摘要
```

> **為什麼不由 AI 自動同步 GitHub？**
> VM 環境無法 `git push`，而透過 github.dev 瀏覽器注入 base64 chunks 的方式容易出現 UTF-8 編碼錯誤、耗時且浪費 token。使用者手動上傳只需幾秒，遠比自動化更高效可靠。

### 8.2 GitHub 上傳方式（使用者操作）
- **推薦**：GitHub 網頁 → 進入對應資料夾 → 「Add file」→「Upload files」→ 拖入修改過的檔案 → Commit
- **小量修改**：直接在 GitHub 網頁編輯器中修改（適合改幾行的情況）
- AI 完成 Local 修改後，會列出所有需要上傳的檔案清單及路徑

### 8.3 版本管理（Git Tags / Releases）

自 v2.8.1 起，版本管理改用 **GitHub Releases + Git Tags**，不再為每個版本複製整個資料夾。

**核心觀念**：
- 本地只維護**一個工作資料夾**，所有修改都在這個資料夾內進行
- 資料夾名稱與實際版本號無關 — 真正的版本號看 `package.json` 和 GitHub Release tag
- 建議將資料夾命名為 `current`（不綁定版本號），避免每次升版都要改名
- 舊版本資料夾（`v1.0-modular-restructure`、`v2.0-pwa-darkmode` 等）可以清理掉，因為 GitHub Releases 已能回溯任何歷史版本

**升版流程**：
1. AI 完成程式修改 + 驗收通過
2. AI 更新版本標記（見下方清單）
3. 使用者上傳修改檔案至 GitHub
4. AI 透過瀏覽器在 GitHub 建立 Release（含 tag + 變更說明）
5. GitHub 自動打包該 commit 的完整原始碼為 zip/tar.gz

**每次升版需更新的版本標記**：
- `package.json` → `"version"` 欄位
- `main.js` → 標頭版本號 + changelog 新增一行
- 交接文件 → `目前版本` 欄位 + 第七節變更記錄 + 尾部時間戳

**回溯舊版本**：前往 GitHub → Releases 頁面 → 選擇版本 → 下載 Source code (zip)

> **Releases 頁面**：`https://github.com/skycookie0109-ux/outo-traveling-app/releases`

### 8.4 部署驗證（AI 負責）

**階段一：API 狀態確認**
使用者上傳 GitHub 後，AI 透過 Vercel MCP 工具確認：
- 使用 `list_deployments` 確認最新部署狀態為 `READY`
- 確認 commit message 與 SHA 正確對應
- 若部署失敗，使用 `get_deployment_build_logs` 查看錯誤並修復

**階段二：線上實際驗收**
部署 READY 後，透過瀏覽器實際檢查線上成品：
- 開啟 `https://outo-traveling-app-ver1.vercel.app/` 截圖確認
- 若涉及 UI 變動，截圖對比修改前後
- 若涉及功能邏輯，在頁面上實際操作驗證
- 檢查 Console 是否有 JS 錯誤
- 若發現問題，Local 修復後請使用者重新上傳

> **注意**：Vercel 部署 READY 只代表建置成功，不代表功能正常。必須實際驗收才算完成。

### 8.5 修改摘要格式
每次完成 Local 修改後，回報應包含：

```
## 修改摘要
- **版本**：v2.x.x
- **修改內容**：（簡述改了什麼）
- **涉及檔案**：（列出所有被修改的檔案）
- **Local 端**：✅ 已完成
- **待上傳至 GitHub**：（列出檔案路徑）
- **注意事項**：（使用者需要知道的）
```

驗收完成後補充：
```
- **Vercel 部署**：✅ READY
- **線上驗收**：✅ 頁面正常 / ⚠️ 發現問題（說明）
```

### 8.6 錯誤處理
- Vercel 部署失敗 → 查看 build logs、Local 修復後請使用者重新上傳
- Service Worker 快取問題 → 提醒使用者在 DevTools 中 Unregister SW 後重整
- 線上驗收發現 bug → Local 修復 → 使用者重新上傳 → 再次驗收

---

*此文件更新於 v2.12.0（2026-03-11，含 QR 本地生成 + 掃描驗票 + 品牌 Loading），請在新對話開頭貼上以保持開發連續性。*
