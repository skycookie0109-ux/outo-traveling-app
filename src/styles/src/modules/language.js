/**
 * Language Module
 * Handles language translation with voice input and Google Translate API integration
 */

import Store from './store.js';
import { GOOGLE_API_KEY } from './config.js';

const Language = {
  recognitionInstance: null,
  voiceSafetyTimer: null,

  open() {
    App.Utils.openModal("phraseModal");
    document.getElementById("phrase-grid-content").innerHTML = Store.phrases
      .map(
        (p) =>
          `<div class="phrase-card" style="background:white; padding:15px; border-radius:16px; text-align:center; border:1px solid #eee; cursor:pointer; transition:transform 0.2s;" onclick="App.Utils.speak('${p.target}', 'vi-VN')">
                <div style="font-size:2rem; margin-bottom:5px;">${p.icon}</div>
                <div>
                    <div style="font-weight:700; color:#37474f;">${p.zh}</div>
                    <div style="color:var(--primary); font-weight:700; font-size:1.1rem; margin:2px 0;">${p.target}</div>
                    <small style="color:#999;">${p.pron}</small>
                </div>
            </div>`
      )
      .join("");
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

    const text = inputEl.value.trim();
    const targetLang = targetEl.value;

    if (!text) return;

    resultEl.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> 翻譯中...';
    speakBtn.style.display = "none";

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
        speakBtn.style.display = "inline-block";
      }
    } catch (error) {
      console.error(error);
      resultEl.innerText = "網路錯誤";
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
