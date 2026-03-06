/* =========================================
   main.js — App 入口點 (Ver2)

   這個檔案負責：
   1. 引入所有樣式
   2. 引入所有模組
   3. 組裝全域 App 物件
   4. 載入外部依賴 (PapaParse, Google Maps)
   5. 啟動應用程式

   [Ver2] 新增行程完成標記功能
   [Ver2.2] 新增 PWA
   [Ver2.3] 移除深色模式
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
    // [Ver2.2] 註冊 Service Worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] SW registered, scope:', reg.scope))
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    }

    // [Ver2.2.2] 設定按鈕長按啟動
    App.Settings.initSettingsButton();
  } catch (error) {
    console.error('App 啟動失敗:', error);
    document.getElementById('loading-screen')?.classList.add('hidden');
  }
};
