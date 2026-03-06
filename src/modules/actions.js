/**
 * Actions Module
 * Handles main application actions and navigation between different features
 *
 * [Ver2] 新增 toggleComplete() 行程完成標記功能
 */

import Store from './store.js';
import EventBus from './eventbus.js';
import { GOOGLE_API_KEY } from './config.js';

const Actions = {
  switchDay(id) {
    Store.activeDayId = id;
    EventBus.emit("APP:DAY_CHANGED", id);
  },

  openDetail(dayId, idx) {
    EventBus.emit("UI:OPEN_DETAIL", { dayId, idx });
  },

  openInfo() {
    App.Utils.openModal("infoModal");
  },

  openSettings() {
    App.Utils.openModal("settingsModal");
  },

  openMap() {
    App.Map.open();
  },

  closeMap() {
    App.Map.close();
  },

  openRec() {
    App.Rec.open();
  },

  openFinance() {
    App.Finance.open();
  },

  openLanguage() {
    App.Language.open();
  },

  openConverter() {
    App.Utils.openModal("converterModal");
  },

  speakFromTrans() {
    const resultEl = document.getElementById("transResult");
    const txt = resultEl.innerText;

    const targetLang =
      document.getElementById("transTarget")?.value || "vi";

    App.Utils.speak(txt, targetLang);
  },

  // ── [Ver2] 行程完成標記 ──────────────────
  toggleComplete(dayId, idx) {
    const key = `done_${dayId}_${idx}`;
    const current = localStorage.getItem(key);

    if (current) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, "1");
    }

    // 重新渲染 timeline 以反映新狀態
    EventBus.emit("APP:DAY_CHANGED", Store.activeDayId);

    // 顯示 toast 回饋
    const toast = document.getElementById("toast");
    toast.innerHTML = current
      ? '<i class="fa-solid fa-rotate-left"></i> 已取消完成標記'
      : '<i class="fa-solid fa-check"></i> 已標記完成！';
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1500);
  },

  isCompleted(dayId, idx) {
    return !!localStorage.getItem(`done_${dayId}_${idx}`);
  },
  // ── End Ver2 ─────────────────────────────

  openTicket(name, address, realTicketData) {
    const overlay = document.getElementById("ticketOverlay");
    overlay.classList.add("active");

    const container = document.getElementById("ticket-content-area");

    let ticketId, displayId;

    if (realTicketData && realTicketData !== "undefined" && realTicketData !== "") {
        ticketId = realTicketData;
        displayId = realTicketData;
    } else {
        ticketId = "OUTO-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        displayId = ticketId;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      ticketId + " | " + name
    )}`;

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    container.innerHTML = `
            <div class="wallet-pass">
                <div class="pass-header">
                    <div class="pass-brand">
                        <span class="pass-logo">OUTO TRAVEL</span>
                        <i class="fa-solid fa-ticket" style="opacity:0.8;"></i>
                    </div>
                    <div class="pass-main-title">${name}</div>
                    <div style="font-size:0.85rem; opacity:0.9; margin-top:5px; font-weight:500;">
                        <i class="fa-solid fa-location-dot"></i> ${address.split(/[|，,]/)[0]}
                    </div>
                </div>

                <div class="pass-divider">
                    <div class="pass-dashed-line"></div>
                </div>

                <div class="pass-body">
                    <div class="pass-info-grid">
                        <div>
                            <div class="pass-label">使用日期</div>
                            <div class="pass-value large">${dateStr}</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="pass-label">入場時間</div>
                            <div class="pass-value large">${timeStr}</div>
                        </div>
                        <div>
                            <div class="pass-label">票種</div>
                            <div class="pass-value">標準入場</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="pass-label">狀態</div>
                            <div class="pass-value" style="color:#34c759;">有效憑證</div>
                        </div>
                    </div>

                    <div class="pass-qr-box">
                        <img src="${qrUrl}" class="pass-qr-img" alt="Ticket QR">
                        <div class="pass-code-text">${displayId}</div>
                    </div>

                    <div style="margin-top:20px; font-size:0.7rem; color:#c7c7cc; text-align:center;">
                        請在入場時出示此電子憑證<br>Outo Wallet Security Verified
                    </div>
                </div>
            </div>

            <div class="pass-close-btn" onclick="App.Utils.closeTicket()">
                <i class="fa-solid fa-xmark"></i>
            </div>
        `;
  },
};

export default Actions;
