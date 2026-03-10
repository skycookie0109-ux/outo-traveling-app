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

  /* ── [v2.11] 票券開啟 — 橫向滑動卡片輪播 ── */
  openTicket(name, address, recKey) {
    const overlay = document.getElementById("ticketOverlay");
    overlay.classList.add("active");

    _ticketMeta = { spotName: name, address };

    const ticketList = Store.tickets[recKey];
    if (ticketList && ticketList.length > 0) {
      _ticketMembers = ticketList;
    } else {
      _ticketMembers = [{ name: "", ticketId: "OUTO-" + Math.random().toString(36).substr(2, 9).toUpperCase() }];
    }

    _ticketIdx = 0;
    this._renderCarousel();

    // 綁定鍵盤左右鍵（桌面版）
    this._keyHandler = (e) => {
      if (e.key === 'ArrowLeft') this._goToSlide(_ticketIdx - 1);
      if (e.key === 'ArrowRight') this._goToSlide(_ticketIdx + 1);
      if (e.key === 'Escape') this._closeQR();
    };
    window.addEventListener('keydown', this._keyHandler);
  },

  /* ── [v2.11] 建立整個輪播（所有卡片一次渲染） ── */
  _renderCarousel() {
    const container = document.getElementById("ticket-content-area");
    const total = _ticketMembers.length;
    const isMulti = total > 1;
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    const addrShort = _ticketMeta.address.split(/[|，,]/)[0];

    // 產生每張卡片的 HTML
    const slidesHtml = _ticketMembers.map((member, idx) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        member.ticketId + " | " + _ticketMeta.spotName
      )}`;
      const serialBar = isMulti
        ? `<div class="pass-serial-bar">#${idx + 1} / ${total}</div>`
        : '';

      return `
        <div class="ticket-slide">
          <div class="wallet-pass">
            <div class="pass-header">
              <div class="pass-brand">
                <span class="pass-logo">OUTO TRAVEL</span>
                <i class="fa-solid fa-ticket" style="opacity:0.8;"></i>
              </div>
              <div class="pass-main-title">${_ticketMeta.spotName}</div>
              <div class="pass-addr"><i class="fa-solid fa-location-dot"></i> ${addrShort}</div>
            </div>
            ${serialBar}
            <div class="pass-divider"><div class="pass-dashed-line"></div></div>
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
                  <div class="pass-label">序號</div>
                  <div class="pass-value">${isMulti ? '#' + (idx + 1) + ' of ' + total : '1 張'}</div>
                </div>
              </div>
              <div class="pass-status-strip">
                <span class="pass-status-dot"></span>
                <span class="pass-status-text">有效憑證 · 未使用</span>
              </div>
              <div class="pass-qr-zone" onclick="event.stopPropagation(); App.Actions.zoomQR(${idx})">
                <img src="${qrUrl}" class="pass-qr-img" alt="Ticket QR">
                <div class="pass-code-text">${member.ticketId}</div>
                <div class="pass-promo">請在入場時出示此電子憑證 · Outo Wallet</div>
                <div class="pass-qr-tap-hint"><i class="fa-solid fa-expand"></i> 點擊放大 QR Code</div>
              </div>
              <div class="pass-action-row">
                <button class="pass-action-btn share" onclick="event.stopPropagation(); App.Actions.shareTicket(${idx})">
                  <i class="fa-solid fa-arrow-up-from-bracket"></i> 分享
                </button>
                <button class="pass-action-btn mark-used" onclick="event.stopPropagation(); App.Actions.markTicketUsed(this)">
                  <i class="fa-solid fa-check-circle"></i> 標記已使用
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    // 桌面版左右箭頭（CSS media query 控制顯示）
    const arrowsHtml = isMulti ? `
      <button class="carousel-arrow left" onclick="event.stopPropagation(); App.Actions._goToSlide(${0})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button class="carousel-arrow right" onclick="event.stopPropagation(); App.Actions._goToSlide(1)">
        <i class="fa-solid fa-chevron-right"></i>
      </button>` : '';

    // 底部指示器（多張時顯示）
    let indicatorHtml = '';
    if (isMulti) {
      const dotsHtml = _ticketMembers.map((_, i) =>
        `<div class="carousel-dot${i === 0 ? ' active' : ''}"></div>`
      ).join('');
      indicatorHtml = `
        <div class="carousel-indicator" id="ticket-dots">${dotsHtml}</div>
        <div class="carousel-label" id="ticket-label">1 / ${total}</div>
        <div class="carousel-hint">← 左右滑動切換票券 →</div>`;
    }

    container.innerHTML = `
      <div class="carousel-wrapper">
        ${arrowsHtml}
        <div class="ticket-carousel" id="ticket-carousel">${slidesHtml}</div>
      </div>
      ${indicatorHtml}
      <div class="pass-close-btn" onclick="App.Utils.closeTicket()">
        <i class="fa-solid fa-xmark"></i>
      </div>
    `;

    // 用 rAF 等 DOM 完成渲染後再計算 padding（修復首張不置中問題）
    requestAnimationFrame(() => {
      const carousel = document.getElementById('ticket-carousel');
      if (!carousel) return;
      const slides = carousel.querySelectorAll('.ticket-slide');
      if (slides.length === 0) return;

      const slideW = slides[0].offsetWidth || 260;
      const padSide = Math.max(0, (window.innerWidth - slideW) / 2);
      carousel.style.paddingLeft = padSide + 'px';
      carousel.style.paddingRight = padSide + 'px';
      // 確保起始位置在第一張
      carousel.scrollLeft = 0;

      // 綁定滾動事件更新指示器 + 箭頭
      if (isMulti) {
        carousel.addEventListener('scroll', () => this._onCarouselScroll(carousel, slides));
      }

      // 桌面滑鼠拖曳支援
      this._initDrag(carousel, slides);
    });
  },

  /* ── 跳轉到指定卡片 ── */
  _goToSlide(idx) {
    const carousel = document.getElementById('ticket-carousel');
    if (!carousel) return;
    const slides = carousel.querySelectorAll('.ticket-slide');
    const total = slides.length;
    const clamped = Math.max(0, Math.min(idx, total - 1));
    const slideW = (slides[0]?.offsetWidth || 260) + 16; // 含 margin
    carousel.scrollTo({ left: clamped * slideW, behavior: 'smooth' });
    this._updateArrows(clamped, total);
  },

  /* ── 滾動時更新指示器 + 箭頭 ── */
  _onCarouselScroll(carousel, slides) {
    const slideW = (slides[0]?.offsetWidth || 260) + 16;
    const idx = Math.round(carousel.scrollLeft / slideW);
    const clamped = Math.max(0, Math.min(idx, slides.length - 1));
    _ticketIdx = clamped;

    const dots = document.querySelectorAll('#ticket-dots .carousel-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === clamped));
    const label = document.getElementById('ticket-label');
    if (label) label.textContent = `${clamped + 1} / ${slides.length}`;

    this._updateArrows(clamped, slides.length);
  },

  /* ── 更新桌面版箭頭的 onclick 和 disabled 狀態 ── */
  _updateArrows(idx, total) {
    const leftBtn = document.querySelector('.carousel-arrow.left');
    const rightBtn = document.querySelector('.carousel-arrow.right');
    if (leftBtn) {
      leftBtn.style.visibility = idx <= 0 ? 'hidden' : 'visible';
      leftBtn.onclick = (e) => { e.stopPropagation(); this._goToSlide(idx - 1); };
    }
    if (rightBtn) {
      rightBtn.style.visibility = idx >= total - 1 ? 'hidden' : 'visible';
      rightBtn.onclick = (e) => { e.stopPropagation(); this._goToSlide(idx + 1); };
    }
  },

  /* ── 桌面滑鼠拖曳（修復版） ── */
  _initDrag(carousel, slides) {
    let dragging = false, startX = 0, scrollStart = 0, hasMoved = false;

    carousel.addEventListener('mousedown', (e) => {
      // 排除按鈕點擊
      if (e.target.closest('button, .pass-action-btn')) return;
      dragging = true;
      hasMoved = false;
      startX = e.pageX;
      scrollStart = carousel.scrollLeft;
      carousel.classList.add('dragging');
      carousel.style.scrollBehavior = 'auto'; // 暫停 smooth 避免衝突
      e.preventDefault();
    });

    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 3) hasMoved = true;
      carousel.scrollLeft = scrollStart - dx;
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('dragging');
      carousel.style.scrollBehavior = ''; // 恢復 smooth
      // snap 到最近的卡片
      const slideW = (slides[0]?.offsetWidth || 260) + 16;
      const target = Math.round(carousel.scrollLeft / slideW) * slideW;
      carousel.scrollTo({ left: target, behavior: 'smooth' });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // 防止拖曳後觸發 QR zoom
    carousel.addEventListener('click', (e) => {
      if (hasMoved) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  },

  /* ── [v2.11] QR Code 放大模式 ── */
  _wakeLock: null,

  zoomQR(idx) {
    const member = _ticketMembers[idx];
    if (!member) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
      member.ticketId + " | " + _ticketMeta.spotName
    )}`;

    // 建立或更新 overlay
    let overlay = document.getElementById('qr-zoom-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'qr-zoom-overlay';
      overlay.className = 'qr-zoom-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <button class="qr-zoom-close" onclick="App.Actions._closeQR()">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="qr-zoom-spot">${_ticketMeta.spotName}</div>
      <img src="${qrUrl}" class="qr-zoom-img" alt="QR Code">
      <div class="qr-zoom-code">${member.ticketId}</div>
      <div class="qr-zoom-hint">
        <i class="fa-solid fa-sun"></i> 建議手動調高螢幕亮度以利掃描
      </div>
    `;

    // 顯示
    requestAnimationFrame(() => overlay.classList.add('active'));

    // 點擊空白處關閉
    overlay.onclick = (e) => {
      if (e.target === overlay) this._closeQR();
    };

    // 嘗試啟用 Wake Lock（防止螢幕休眠）
    this._requestWakeLock();
  },

  async _requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this._wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) {
      // Wake Lock 不支援或被拒絕，靜默處理
    }
  },

  _closeQR() {
    const overlay = document.getElementById('qr-zoom-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    // 釋放 Wake Lock
    if (this._wakeLock) {
      this._wakeLock.release().catch(() => {});
      this._wakeLock = null;
    }
  },

  /* ── 分享票券 ── */
  shareTicket(idx) {
    const member = _ticketMembers[idx !== undefined ? idx : _ticketIdx];
    const text = `${_ticketMeta.spotName} 電子票券\n票號：${member.ticketId}`;
    if (navigator.share) {
      navigator.share({ title: `${_ticketMeta.spotName} 票券`, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('票券資訊已複製到剪貼板'));
    }
  },

  /* ── 標記已使用（視覺回饋） ── */
  markTicketUsed(btn) {
    if (!btn) return;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> 已使用';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
    const card = btn.closest('.wallet-pass');
    if (!card) return;
    const strip = card.querySelector('.pass-status-strip');
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
