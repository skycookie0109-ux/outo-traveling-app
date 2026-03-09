/**
 * Language Module
 * Handles language translation with voice input and Google Translate API integration
 *
 * [v2.7] 常用詞分類標籤 + 翻譯結果卡片美化 + 複製功能
 */

import Store from './store.js';
import { GOOGLE_API_KEY } from './config.js';

// — [v2.7] 常用詞分類（依 icon 自動歸類）————————
const PHRASE_CATEGORIES = [
  { key: 'all',      label: '全部' },
  { key: 'greet',    label: '招呼',   icons: ['👋','🙏','😊','🤝','👍'] },
  { key: 'food',     label: '餐飲',   icons: ['🍜','🍲','🥖','☕','🍺','🧊','🥤','🍽','🍛','🥢','🍴'] },
  { key: 'transport', label: '交通',  icons: ['🚕','✈️','🚌','🛵','🚂','🗺','📍'] },
  { key: 'shop',     label: '購物',   icons: ['💰','🛒','🏪','💳','🧾'] },
  { key: 'emergency', label: '緊急',  icons: ['🆘','🏥','👮','📞','⚠️','❓'] },
];

const Language = {
  recognitionInstance: null,
  voiceSafetyTimer: null,
  activeTab: 'all',  // [v2.7]

  open() {
    App.Utils.openModal("phraseModal");
    this.renderTabs();
    this.renderPhrases();
  },

  // — [v2.7] 渲染分類標籤列 ———————————
  renderTabs() {
    const bar = document.getElementById("phrase-tab-bar");
    if (!bar) return;

    bar.innerHTML = PHRASE_CATEGORIES.map(cat =>
      `<button class="phrase-tab${cat.key === this.activeTab ? ' active' : ''}"
              onclick="App.Language.switchTab('${cat.key}')">${cat.label}</button>`
    ).join('');
  },

  switchTab(key) {
    this.activeTab = key;
    this.renderTabs();
    this.renderPhrases();
  },

  // — [v2.7] 按分類篩選後渲染常用詞卡片 —
  renderPhrases() {
    const grid = document.getElementById("phrase-grid-content");
    if (!grid) return;

    let phrases = Store.phrases;

    if (this.activeTab !== 'all') {
      const cat = PHRASE_CATEGORIES.find(c => c.key === this.activeTab);
      if (cat && cat.icons) {
        phrases = phrases.filter(p => cat.icons.includes(p.icon));
      }
    }

    if (phrases.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-tertiary);">
        此分類暫無常用詞</div>`;
      return;
    }

    grid.innerHTML = phrases.map(p =>
      `<div class="phrase-card" onclick="App.Utils.speak('${p.target.replace(/'/g, "\\'")}', 'vi-VN')">
        <div class="phrase-card-icon">${p.icon}</div>
        <div>
          <div class="phrase-card-zh">${p.zh}</div>
          <div class="phrase-card-target">${p.target}</div>
          <small class="phrase-card-pron">${p.pron}</small>
        </div>
      </div>`
    ).join('');
  },

  stopVoiceInput() {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch (e) {}
      this.recognitionInstance = null;
    }

    if (this.voiceSafetyTimer) {
      clearTimeout(this.voiceSafetyTimer);
      this.voiceSafetyTimer = null;
    }

    const btn = document.getElementById("btn-mic-trans");
    const inputEl = document.getElementById("transInput");

    if (btn) btn.classList.remove("mic-active-anim");
    if (inputEl) {
      inputEl.classList.remove("input-recording");
      inputEl.placeholder = "輸入或語音 (自動偵測)...";
    }
  },

  toggleVoiceInput() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("您的瀏覽器不支援語音輸入 (建議使用 Chrome)");
      return;
    }

    if (this.recognitionInstance) {
      this.stopVoiceInput();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    this.recognitionInstance = recognition;

    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.continuous = false;

    const btn = document.getElementById("btn-mic-trans");
    const inputEl = document.getElementById("transInput");
    const resultEl = document.getElementById("transResult");

    inputEl.value = "";
    resultEl.innerText = "...";
    inputEl.placeholder = "啟動中...";

    recognition.onstart = () => {
      btn.classList.add("mic-active-anim");
      inputEl.classList.add("input-recording");
      inputEl.placeholder = "● 正在聆聽中... (再次點擊停止)";

      if (navigator.vibrate) navigator.vibrate(50);

      this.voiceSafetyTimer = setTimeout(() => {
        this.stopVoiceInput();
      }, 8000);
    };

    recognition.onresult = (event) => {
      if (this.voiceSafetyTimer) clearTimeout(this.voiceSafetyTimer);

      this.stopVoiceInput();

      const text = event.results[0][0].transcript;
      inputEl.value = text;

      setTimeout(() => {
        this.translate();
      }, 200);
    };

    recognition.onend = () => {
      this.stopVoiceInput();
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      this.stopVoiceInput();
      inputEl.placeholder = "辨識失敗，請重試";
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      this.stopVoiceInput();
    }
  },

  async translate() {
    const inputEl = document.getElementById("transInput");
    const targetEl = document.getElementById("transTarget");
    const resultEl = document.getElementById("transResult");
    const speakBtn = document.getElementById("btn-speak-result");
    const copyBtn = document.getElementById("btn-copy-result");

    const text = inputEl.value.trim();
    const targetLang = targetEl.value;

    if (!text) return;

    resultEl.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> 翻譯中...';
    if (speakBtn) speakBtn.classList.remove("visible");
    if (copyBtn) copyBtn.classList.remove("visible");

    const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          format: "text",
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error("API Error:", data.error);
        resultEl.innerText = "翻譯失敗";
      } else {
        const translatedText = data.data.translations[0].translatedText;
        resultEl.innerText = translatedText;
        resultEl.dataset.lang = targetLang;
        if (speakBtn) speakBtn.classList.add("visible");
        if (copyBtn) copyBtn.classList.add("visible");
      }
    } catch (error) {
      console.error(error);
      resultEl.innerText = "網路錯誤";
    }
  },

  // — [v2.7] 複製翻譯結果 ——————————————
  copyResult() {
    const resultEl = document.getElementById("transResult");
    const text = resultEl?.innerText;
    if (!text || text === '...') return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById("btn-copy-result");
        if (copyBtn) {
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> 已複製';
          setTimeout(() => { copyBtn.innerHTML = orig; }, 1500);
        }
      });
    }
  },

  openGoogle() {
    const t = document.getElementById("transInput").value;
    const target = document.getElementById("transTarget").value;
    window.open(
      `https://translate.google.com/?sl=auto&tl=${target}&text=${encodeURIComponent(
        t
      )}&op=translate`,
      "_blank"
    );
  },
};

export default Language;
