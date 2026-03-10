/**
 * Actions Module
 * Handles main application actions and navigation between different features
 *
 * [v2.0] 新增 toggleComplete() 行程完成標記功能
 * [v2.11] 票券 UI 精緻化 + 多人票券分頁切換
 */

import Store from './store.js';
import EventBus from './eventbus.js';
import { GOOGLE_API_KEY } from './config.js';

/* ── [v2.11] 多人票券分頁狀態 ── */
let _ticketMembers = [];   // [{name, ticketId}]
let _ticketIdx = 0;        // 當前顯示的成員 index
let _ticketMeta = {};       // {spotName, address}

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

  // ── [v2.2.2] 行程完成標記 — DOM 直接操作（不重新渲染）──
  toggleComplete(dayId, idx) {
    const key = `done_${dayId}_${idx}`;
    const current = localStorage.getItem(key);

    if (current) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, "1");
    }

    const nowDone = !current; // 切換後的狀態

    // 直接操作 DOM，不觸發 APP:DAY_CHANGED（避免天氣/地圖重新載入）
    const rows = document.querySelectorAll('#timeline-content .event-row');
    const row = rows[idx];
    if (row) {
      // 1. event-row: completed class
      row.classList.toggle('completed', nowDone);

      // 2. timeline-dot: done class
      const dot = row.querySelector('.timeline-dot');
      if (dot) dot.classList.toggle('done', nowDone);

      // 3. mini-card: card-done class
      const card = row.querySelector('.mini-card');
      if (card) card.classList.toggle('card-done', nowDone);

      // 4. check icon: fa-regular ↔ fa-solid
      const icon = row.querySelector('.mc-check i');
      if (icon) {
        icon.classList.toggle('fa-regular', !nowDone);
        icon.classList.toggle('fa-solid', nowDone);
      }
    }

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
  // ── End v2.0 ─────────────────────────────

  /* ── [v2.11] 票券開啟（從 Store.tickets 讀取，recKey 對應 Tickets 分頁） ── */
  openTicket(name, address, recKey) {
    const overlay = document.getElementById("ticketOverlay");
    overlay.classList.add("active");

    _ticketMeta = { spotName: name, address };

    // 從 Store.tickets 讀取該景點的所有票券
    const ticketList = Store.tickets[recKey];
    if (ticketList && ticketList.length > 0) {
      _ticketMembers = ticketList;
    } else {
      // 無票券資料 → 自動生成預覽票
      _ticketMembers = [{ name: "", ticketId: "OUTO-" + Math.random().toString(36).substr(2, 9).toUpperCase() }];
    }

    _ticketIdx = 0;
    this._renderTicket();
  },

  /* ── [v2.11] 渲染當前成員票券 ── */
  _renderTicket() {
    const container = document.getElementById("ticket-content-area");
    const member = _ticketMembers[_ticketIdx];
    const total = _ticketMembers.length;
    const isMulti = total > 1;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      member.ticketId + " | " + _ticketMeta.spotName
    )}`;

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 成員名稱列（多人時顯示）
    const memberBarHtml = isMulti
      ? `<div class="pass-member-bar"><i class="fa-solid fa-user"></i> ${member.name}</div>`
      : '';

    // 分頁指示器（多人時顯示）
    let pagerHtml = '';
    if (isMulti) {
      const dots = _ticketMembers.map((_, i) =>
        `<span class="pass-pager-dot${i === _ticketIdx ? ' active' : ''}"></span>`
      ).join('');
      pagerHtml = `
        <div class="pass-pager">
          <button class="pass-pager-arrow" onclick="event.stopPropagation(); App.Actions.prevTicket()">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="pass-pager-dots">${dots}</div>
          <button class="pass-pager-arrow" onclick="event.stopPropagation(); App.Actions.nextTicket()">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="pass-pager-label">${_ticketIdx + 1} / ${total}</div>`;
    }

    // 票種顯示
    const ticketType = isMulti ? '標準入場' : '標準入場';
    // 數量顯示（多人時顯示當前張數）
    const qtyLabel = isMulti ? '成員' : '數量';
    const qtyValue = isMulti ? `${_ticketIdx + 1} / ${total}` : '1 張';

    container.innerHTML = `
      <div class="wallet-pass">
        <div class="pass-header">
          <div class="pass-brand">
            <span class="pass-logo">OUTO TRAVEL</span>
            <i class="fa-solid fa-ticket" style="opacity:0.8;"></i>
          </div>
          <div class="pass-main-title">${_ticketMeta.spotName}</div>
          <div class="pass-addr">
            <i class="fa-solid fa-location-dot"></i> ${_ticketMeta.address.split(/[|，,]/)[0]}
          </div>
        </div>

        ${memberBarHtml}

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
              <div class="pass-value">${ticketType}</div>
            </div>
            <div style="text-align:right;">
              <div class="pass-label">${qtyLabel}</div>
              <div class="pass-value">${qtyValue}</div>
            </div>
          </div>

          <div class="pass-status-strip">
            <span class="pass-status-dot"></span>
            <span class="pass-status-text">有效憑證 · 未使用</span>
          </div>

          <div class="pass-qr-zone">
            <img src="${qrUrl}" class="pass-qr-img" alt="Ticket QR">
            <div class="pass-code-text">${member.ticketId}</div>
            <div class="pass-promo">請在入場時出示此電子憑證 · Outo Wallet Security Verified</div>
          </div>

          <div class="pass-action-row">
            <button class="pass-action-btn share" onclick="event.stopPropagation(); App.Actions.shareTicket()">
              <i class="fa-solid fa-arrow-up-from-bracket"></i> 分享
            </button>
            <button class="pass-action-btn mark-used" onclick="event.stopPropagation(); App.Actions.markTicketUsed()">
              <i class="fa-solid fa-check-circle"></i> 標記已使用
            </button>
          </div>
        </div>

        ${pagerHtml}
      </div>

      <div class="pass-close-btn" onclick="App.Utils.closeTicket()">
        <i class="fa-solid fa-xmark"></i>
      </div>
    `;
  },

  /* ── [v2.11] 分頁切換 ── */
  prevTicket() {
    if (_ticketMembers.length <= 1) return;
    _ticketIdx = (_ticketIdx - 1 + _ticketMembers.length) % _ticketMembers.length;
    this._renderTicket();
  },

  nextTicket() {
    if (_ticketMembers.length <= 1) return;
    _ticketIdx = (_ticketIdx + 1) % _ticketMembers.length;
    this._renderTicket();
  },

  /* ── [v2.11] 分享票券（Web Share API fallback clipboard） ── */
  shareTicket() {
    const member = _ticketMembers[_ticketIdx];
    const text = `${_ticketMeta.spotName} 電子票券\n票號：${member.ticketId}${member.name ? '\n持票人：' + member.name : ''}`;
    if (navigator.share) {
      navigator.share({ title: `${_ticketMeta.spotName} 票券`, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('票券資訊已複製到剪貼板');
      });
    }
  },

  /* ── [v2.11] 標記已使用（預留，目前僅視覺回饋） ── */
  markTicketUsed() {
    const btn = document.querySelector('.pass-action-btn.mark-used');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> 已使用';
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
    }
    const strip = document.querySelector('.pass-status-strip');
    if (strip) {
      strip.style.background = 'linear-gradient(135deg, #fefce8, #fef9c3)';
      strip.style.borderColor = '#fde68a';
      const dot = strip.querySelector('.pass-status-dot');
      if (dot) { dot.style.background = '#f59e0b'; dot.style.animation = 'none'; }
      const txt = strip.querySelector('.pass-status-text');
      if (txt) { txt.textContent = '已使用'; txt.style.color = '#d97706'; }
    }
  },
};

export default Actions;
