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
import qrcode from 'qrcode-generator';

/* ── [v2.11] 多人票券分頁狀態 ── */
let _ticketMembers = [];   // [{name, ticketId}]
let _ticketIdx = 0;        // 當前顯示的成員 index
let _ticketMeta = {};       // {spotName, address}

/* ── [v2.12] 本地 QR Code 產生器（取代外部 API） ── */
function generateQRDataURL(text, cellSize = 4) {
  const qr = qrcode(0, 'M');   // type=0 (auto), error-correction=M
  qr.addData(text);
  qr.make();
  return qr.createDataURL(cellSize, 0);   // cellSize px per module, margin=0
}

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
      const qrUrl = generateQRDataURL(member.ticketId + ' | ' + _ticketMeta.spotName, 3);
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
                <button class="pass-action-btn scan" onclick="event.stopPropagation(); App.Actions.openScanner()">
                  <i class="fa-solid fa-camera"></i> 掃描驗票
                </button>
                <button class="pass-action-btn mark-used" onclick="event.stopPropagation(); App.Actions.markTicketUsed(this, '${member.ticketId}')">
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
      <div class="carousel-wrapper" onclick="event.stopPropagation()">
        ${arrowsHtml}
        <div class="ticket-carousel" id="ticket-carousel">${slidesHtml}</div>
      </div>
      ${indicatorHtml}
    `;

    // 用雙層 rAF 確保 DOM 完成 layout 後再計算 padding（修復首張不置中問題）
    requestAnimationFrame(() => { requestAnimationFrame(() => {
      const carousel = document.getElementById('ticket-carousel');
      if (!carousel) return;
      const slides = carousel.querySelectorAll('.ticket-slide');
      if (slides.length === 0) return;

      // 用 carousel 父容器（.carousel-wrapper）的實際寬度來算，而非 window.innerWidth
      const wrapper = carousel.closest('.carousel-wrapper');
      const containerW = (wrapper && wrapper.offsetWidth > 0) ? wrapper.offsetWidth : window.innerWidth;
      const slideW = slides[0].offsetWidth || 260;
      const padSide = Math.max(0, (containerW - slideW) / 2);
      carousel.style.paddingLeft = padSide + 'px';
      carousel.style.paddingRight = padSide + 'px';
      // 確保起始位置在第一張
      carousel.scrollLeft = 0;

      // 綁定滾動事件更新指示器 + 箭頭
      if (isMulti) {
        carousel.addEventListener('scroll', () => this._onCarouselScroll(carousel, slides));
        this._updateArrows(0, slides.length);
      }

      // 桌面滑鼠拖曳支援
      this._initDrag(carousel, slides);

      // [v2.12] 從 localStorage 恢復「已使用」狀態
      this._refreshTicketCards();
    }); });
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

  /* ── [v2.11] QR Code 放大模式（含左右滑動切換） ── */
  _wakeLock: null,

  zoomQR(idx) {
    const total = _ticketMembers.length;
    const isMulti = total > 1;

    // 建立或更新 overlay
    let overlay = document.getElementById('qr-zoom-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'qr-zoom-overlay';
      overlay.className = 'qr-zoom-overlay';
      document.body.appendChild(overlay);
    }

    // 產生每張 QR 的 slide
    const slidesHtml = _ticketMembers.map((member, i) => {
      const qrUrl = generateQRDataURL(member.ticketId + ' | ' + _ticketMeta.spotName, 6);
      return `
        <div class="qr-zoom-slide">
          <img src="${qrUrl}" class="qr-zoom-img" alt="QR Code">
          <div class="qr-zoom-code">${member.ticketId}</div>
          ${isMulti ? `<div class="qr-zoom-serial">#${i + 1} / ${total}</div>` : ''}
        </div>`;
    }).join('');

    // 底部指示器
    let dotsHtml = '';
    if (isMulti) {
      dotsHtml = `<div class="qr-zoom-dots" id="qr-zoom-dots">
        ${_ticketMembers.map((_, i) =>
          `<div class="qr-zoom-dot${i === idx ? ' active' : ''}"></div>`
        ).join('')}
      </div>`;
    }

    overlay.innerHTML = `
      <button class="qr-zoom-close" onclick="App.Actions._closeQR()">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="qr-zoom-spot">${_ticketMeta.spotName}</div>
      <div class="qr-zoom-carousel" id="qr-zoom-carousel">${slidesHtml}</div>
      ${dotsHtml}
      <div class="qr-zoom-hint">
        <i class="fa-solid fa-sun"></i> 建議手動調高螢幕亮度以利掃描
      </div>
      ${isMulti ? '<div class="qr-zoom-swipe-hint">← 左右滑動切換 →</div>' : ''}
    `;

    // 顯示 + 滑到指定 QR
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const qrCarousel = document.getElementById('qr-zoom-carousel');
      if (qrCarousel && idx > 0) {
        const slideW = qrCarousel.querySelector('.qr-zoom-slide')?.offsetWidth || 300;
        qrCarousel.scrollLeft = idx * slideW;
      }

      // 綁定滾動事件更新指示器
      if (isMulti && qrCarousel) {
        qrCarousel.addEventListener('scroll', () => {
          const slides = qrCarousel.querySelectorAll('.qr-zoom-slide');
          const slideW = slides[0]?.offsetWidth || 300;
          const cur = Math.round(qrCarousel.scrollLeft / slideW);
          const clamped = Math.max(0, Math.min(cur, slides.length - 1));
          const dots = document.querySelectorAll('#qr-zoom-dots .qr-zoom-dot');
          dots.forEach((d, i) => d.classList.toggle('active', i === clamped));
        });

        // 桌面版滑鼠拖曳
        this._initQRDrag(qrCarousel);
      }
    });

    // 點擊空白處關閉（排除 carousel 和按鈕）
    overlay.onclick = (e) => {
      if (e.target === overlay) this._closeQR();
    };

    // 嘗試啟用 Wake Lock（防止螢幕休眠）
    this._requestWakeLock();
  },

  /* ── QR 放大模式：桌面滑鼠拖曳 ── */
  _initQRDrag(carousel) {
    let dragging = false, startX = 0, scrollStart = 0;

    carousel.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      startX = e.pageX;
      scrollStart = carousel.scrollLeft;
      carousel.style.scrollSnapType = 'none';
      carousel.style.scrollBehavior = 'auto';
      e.preventDefault();
    });

    const onMove = (e) => {
      if (!dragging) return;
      carousel.scrollLeft = scrollStart - (e.pageX - startX);
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      carousel.style.scrollSnapType = '';
      carousel.style.scrollBehavior = '';
      const slides = carousel.querySelectorAll('.qr-zoom-slide');
      const slideW = slides[0]?.offsetWidth || 300;
      const target = Math.round(carousel.scrollLeft / slideW) * slideW;
      carousel.scrollTo({ left: target, behavior: 'smooth' });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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

  /* ── [v2.12] 標記已使用（含 localStorage 持久化） ── */
  markTicketUsed(btn, ticketId) {
    if (!btn) return;
    // 寫入 localStorage
    if (ticketId) localStorage.setItem(`ticket_used_${ticketId}`, '1');
    // 視覺更新
    this._applyUsedStyle(btn.closest('.wallet-pass'), btn);
  },

  /* ── 套用「已使用」視覺狀態 ── */
  _applyUsedStyle(card, btn) {
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> 已使用';
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
    }
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

  /* ── 檢查票券是否已使用 ── */
  _isTicketUsed(ticketId) {
    return !!localStorage.getItem(`ticket_used_${ticketId}`);
  },

  /* ── [v2.12] 掃描驗票：啟動相機掃描（測試版功能） ── */
  openScanner() {
    // 建立掃描 overlay
    let overlay = document.getElementById('scan-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'scan-overlay';
      overlay.className = 'scan-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="scan-header">
        <button class="scan-close-btn" onclick="App.Actions.closeScanner()">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <span class="scan-title">掃描 QR Code</span>
      </div>
      <div id="scan-reader"></div>
      <div class="scan-instruction">將 QR Code 對準畫面中央</div>
      <button class="scan-reset-btn" onclick="App.Actions.resetAllTickets()">
        <i class="fa-solid fa-rotate-left"></i> 重置所有驗票紀錄
      </button>
      <div class="scan-reset-note">（測試版功能）</div>
    `;

    overlay.classList.add('active');

    // 延遲啟動掃描器，等 DOM 就緒
    setTimeout(() => {
      this._startScanner();
    }, 300);
  },

  async _startScanner() {
    try {
      // 確認 Html5Qrcode 已載入
      if (typeof Html5Qrcode === 'undefined') {
        // 動態載入
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      this._html5QrCode = new Html5Qrcode('scan-reader');

      await this._html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // 成功掃描
          this._onScanSuccess(decodedText);
        },
        () => {} // ignore errors during scanning
      );
    } catch (err) {
      console.warn('[Scanner] 無法啟動相機:', err);
      const reader = document.getElementById('scan-reader');
      if (reader) {
        reader.innerHTML = `
          <div style="color:#fff;text-align:center;padding:40px 20px;">
            <i class="fa-solid fa-camera-slash" style="font-size:2rem;margin-bottom:12px;display:block;"></i>
            <div>無法存取相機</div>
            <div style="font-size:0.75rem;margin-top:8px;opacity:0.6;">請確認已授權相機權限</div>
          </div>`;
      }
    }
  },

  _onScanSuccess(decodedText) {
    // 停止掃描並清除引用（避免 closeScanner 再次對已銷毀 DOM 呼叫 stop）
    if (this._html5QrCode) {
      try { this._html5QrCode.stop().catch(() => {}); } catch (_) {}
      this._html5QrCode = null;
    }

    // 解析票券 ID：格式為 "ticketId | spotName"
    const parts = decodedText.split('|').map(s => s.trim());
    const scannedId = parts[0] || decodedText;

    // 尋找匹配的票券
    let found = false;
    let foundMember = null;
    for (const recKey in Store.tickets) {
      const list = Store.tickets[recKey];
      for (const member of list) {
        if (member.ticketId === scannedId) {
          found = true;
          foundMember = member;
          break;
        }
      }
      if (found) break;
    }

    if (found && !this._isTicketUsed(scannedId)) {
      // 標記為已使用
      localStorage.setItem(`ticket_used_${scannedId}`, '1');
      this._showScanResult(true, scannedId, foundMember);
    } else if (found && this._isTicketUsed(scannedId)) {
      this._showScanResult('already', scannedId, foundMember);
    } else {
      this._showScanResult(false, scannedId);
    }
  },

  _showScanResult(status, ticketId, member) {
    const overlay = document.getElementById('scan-overlay');
    if (!overlay) return;

    let icon, title, detail, color;
    if (status === true) {
      icon = 'fa-check';
      title = '驗票成功';
      detail = `序號 ${ticketId} 已標記為已使用`;
      color = '#22c55e';
    } else if (status === 'already') {
      icon = 'fa-exclamation-triangle';
      title = '此票已使用過';
      detail = `序號 ${ticketId} 先前已被標記`;
      color = '#f59e0b';
    } else {
      icon = 'fa-xmark';
      title = '無法辨識';
      detail = `找不到匹配的票券`;
      color = '#ef4444';
    }

    overlay.innerHTML = `
      <div class="scan-result">
        <div class="scan-result-icon" style="background:${color}20;">
          <i class="fa-solid ${icon}" style="color:${color};font-size:2.5rem;"></i>
        </div>
        <div class="scan-result-title">${title}</div>
        <div class="scan-result-detail">${detail}</div>
        <button class="scan-result-btn" onclick="try{App.Actions.closeScanner()}catch(e){console.warn(e)}">
          返回票券
        </button>
        <button class="scan-result-btn secondary" onclick="try{App.Actions.closeScanner()}catch(e){}; setTimeout(()=>App.Actions.openScanner(), 300);">
          繼續掃描
        </button>
      </div>
    `;

    // 同時更新已開啟的票券卡片 DOM（如果有的話）
    if (status === true) {
      this._refreshTicketCards();
    }
  },

  /* ── 重新整理票券卡片的「已使用」狀態 ── */
  _refreshTicketCards() {
    const slides = document.querySelectorAll('.ticket-slide');
    slides.forEach((slide, idx) => {
      if (idx < _ticketMembers.length) {
        const member = _ticketMembers[idx];
        if (this._isTicketUsed(member.ticketId)) {
          const card = slide.querySelector('.wallet-pass');
          const btn = slide.querySelector('.pass-action-btn.mark-used');
          this._applyUsedStyle(card, btn);
        }
      }
    });
  },

  closeScanner() {
    if (this._html5QrCode) {
      try { this._html5QrCode.stop().catch(() => {}); } catch (_) {}
      this._html5QrCode = null;
    }
    const overlay = document.getElementById('scan-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
    }
  },

  /* ── [v2.12] 重置所有驗票紀錄（測試版功能） ── */
  resetAllTickets() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ticket_used_')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));

    // 關閉掃描器
    this.closeScanner();

    // 重新渲染票券（如果票券面板還開著）
    const overlay = document.getElementById('ticketOverlay');
    if (overlay && overlay.classList.contains('active')) {
      this._renderCarousel();
    }

    // Toast 提示
    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerHTML = '<i class="fa-solid fa-rotate-left"></i> 所有驗票紀錄已重置';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  },
};

export default Actions;
