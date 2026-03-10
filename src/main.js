/* =========================================
   main.js — App 入口點 (v2.12.0)

   這個檔案負責：
   1. 引入所有樣式
   2. 引入所有模組
   3. 組裝全域 App 物件
   4. 載入外部依賴 (PapaParse, Google Maps)
   5. 啟動應用程式

   [v2.0] 新增行程完成標記功能
   [v2.2] 新增 PWA
   [v2.3] 移除深色模式
   [v2.4] iOS 17/18 風格 UI/UX 全面翻新
   [v2.5] 左滑完成手勢 + 勾選修復 + 動畫優化
   [v2.6] 天氣強化：穿搭建議 + 降雨分級 + FA 圖示升級
   [v2.7] 記帳分類標籤 + 刪除確認 / 常用詞分類標籤 + 翻譯卡片美化
   [v2.8] 地圖毛玻璃 Popup + 路線膠囊升級 + Popup 桌面版對比修正
   [v2.9] 匯率模組重構：方案D 漸層基準區 + 下拉切換 + 緊湊結果清單 + CSS 外部化
   [v2.9] 天氣卡優化：移除天氣儀表板 + Grid 佈局 + 圖示併入描述標籤 + 溫度加大平衡
   [v2.10] 攻略推薦優化：左側分類色條 + icon 漸層 + 分類副標 + ribbon 膠囊化
   [v2.10.1] 攻略 UI 修正：平板+ 兩欄佈局 + ribbon 改 inline 實色紅底脈動光暈
   [v2.11] 票券 UI 精緻化 + 多人票券橫向輪播 + QR 放大模式 + 桌面版箭頭導覽 + Tickets 獨立分頁
   [v2.12] QR 本地生成 + 掃描驗票(測試版) + 票券已使用持久化 + Outo 品牌 Loading 畫面
   ========================================= */

// ── 1. 引入樣式 ──────────────────────────
import './styles/main.css';

// ── 2. 引入模組 ──────────────────────────
import EventBus from './modules/eventbus.js';
import Store from './modules/store.js';
import { GOOGLE_API_KEY, CONFIG, FALLBACK_ASSETS } from './modules/config.js';
import Templates from './modules/templates.js';
import Data from './modules/data.js';
import Image from './modules/image.js';
import Note from './modules/note.js';
import Info from './modules/info.js';
import Settings from './modules/settings.js';
import Utils from './modules/utils.js';
import Currency from './modules/currency.js';
import MapModule, { Location } from './modules/map.js';
import Weather from './modules/weather.js';
import Rec from './modules/rec.js';
import Finance from './modules/finance.js';
import Language from './modules/language.js';
import UI from './modules/ui.js';
import Actions from './modules/actions.js';

// ── 3. 組裝全域 App 物件 ─────────────────
// 為什麼需要全域 App？
// 因為 HTML 裡有大量 onclick="App.Actions.openMap()" 這種直接呼叫
// 在完全轉換到事件驅動架構之前，這是必要的過渡方式
const App = {
  Actions,
  Settings,
  Data,
  Info,
  Image,
  Note,
  Map: MapModule,
  Location,
  Weather,
  Rec,
  Finance,
  Language,
  Currency,
  Utils,
  UI,
};

// 掛載到 window，讓 HTML onclick 能存取
window.App = App;

// 同時掛載需要被模組存取的共享物件
window.EventBus = EventBus;
window.Store = Store;
window.CONFIG = CONFIG;
window.FALLBACK_ASSETS = FALLBACK_ASSETS;
window.Templates = Templates;
window.GOOGLE_API_KEY = GOOGLE_API_KEY;

// ── 4. 載入外部依賴 ─────────────────────

// 4a. PapaParse (CSV 解析器，用於讀取 Google Sheets)
function loadPapaParse() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 4b. Google Maps
function loadGoogleMaps() {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&loading=async&libraries=places,geometry`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// ── 5. 啟動應用程式 ─────────────────────
window.onload = async () => {
  try {
    // 先載入 PapaParse（Data 模組需要它）
    await loadPapaParse();

    // 載入 Google Maps（非同步，地圖模組會自行等待）
    loadGoogleMaps();

    // 初始化 UI（會設定 EventBus 監聽器）
    App.UI.init();

    // 載入資料（從 Google Sheets 拉取）
    App.Data.init();
    // [v2.2] 註冊 Service Worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] SW registered, scope:', reg.scope))
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    }

    // [v2.2.2] 設定按鈕長按啟動
    App.Settings.initSettingsButton();
  } catch (error) {
    console.error('App 啟動失敗:', error);
    document.getElementById('loading-screen')?.classList.add('hidden');
  }
};
