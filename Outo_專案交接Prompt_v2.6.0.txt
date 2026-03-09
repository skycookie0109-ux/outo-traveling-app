# Outo Traveling App — 專案交接 Prompt (v2.6.0)

> 請在新的 Cowork 聊天室開頭貼上以下內容，讓 AI 立即了解專案全貌。

---

## 一、專案概述

你正在協助開發「Outo Traveling App」，一個專為半自助旅行者設計的越南旅遊行動網頁應用（Mobile-first Web App）。目標是整合行程、天氣、地圖、攻略、匯率、記帳等功能於一體，以簡潔明瞭的 UI/UX 讓使用者輕鬆上手。

- **目前版本**：v2.8.1
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
    │   ├── templates.js    # HTML 模板（timelineRow、weatherCard 含溫度漸層條+降雨進度條 等）
    │   ├── actions.js      # 使用者操作（開啟詳情、完成標記等）
    │   ├── settings.js     # 設定面板 + 長按保護
    │   ├── weather.js      # 天氣 API（Open-Meteo）+ 儀表板 + 穿搭建議 + 降雨分級 + FA 圖示 + 逐時結果卡片 + 24H 溫度趨勢圖
    │   ├── map.js          # Google Maps 整合
    │   ├── rec.js          # 攻略推薦系統
    │   ├── currency.js     # 匯率轉換
    │   ├── finance.js      # 記帳功能
    │   ├── note.js         # 筆記功能
    │   ├── info.js         # 資訊面板
    │   ├── image.js        # 圖片處理
    │   ├── language.js     # 翻譯功能
    │   └── utils.js        # 工具函式
    └── styles/             # 13 個 CSS 檔案
        ├── main.css        # 入口 CSS（@import 所有其他）
        ├── base.css        # 設計 Token（CSS 變數）
        ├── header.css      # 頂部導航 + 日期 tab
        ├── timeline.css    # 時間軸 + 行程卡 + 左滑手勢
        ├── weather.css     # 天氣儀表板 + 溫度漸層條 + 降雨進度條 + 滑桿美化 + 逐時結果卡片 + 趨勢圖 + 圖示動畫 + 卡片互動
        ├── map.css         # 地圖相關
        ├── rec.css         # 攻略推薦
        ├── ticket.css      # 票券樣式
        ├── finance.css     # 記帳
        ├── info.css        # 資訊
        ├── fab.css         # 浮動按鈕
        ├── modals.css      # 彈窗/面板
        └── responsive.css  # 響應式（僅 layout）
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
| v2.6.0 | 天氣強化：穿搭建議 + 降雨分級 + FA 圖示升級 + 溫度漸層條 + 降雨進度條 + Modal 滑桿美化 + 逐時結果卡片 + 24H 趨勢圖 + 圖示動畫 + 卡片微互動 + 進場動畫 + reduced-motion 支援 ← **目前** |

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

*此文件更新於 v2.8.1（2026-03-09），請在新對話開頭貼上以保持開發連續性。*
