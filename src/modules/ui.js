/**
 * UI Module
 * Handles main UI initialization, tab rendering, timeline rendering, and detail view
 *
 * [Ver2] renderTimeline 現在會讀取 localStorage 的完成狀態傳入 template
 */

import EventBus from './eventbus.js';
import Store from './store.js';
import Templates from './templates.js';

const UI = {
  init() {
    EventBus.on("DATA:READY", () => this.onDataReady());
    EventBus.on("APP:DAY_CHANGED", () => {
      this.renderTabs();
      this.renderTimeline();
    });
    EventBus.on("UI:OPEN_DETAIL", (payload) => this.openDetail(payload));

    App.Map.init();
    App.Info.init();
    App.Weather.init();

    const onScroll = (e) => {
      const scrollDistance =
        e.target.scrollTop ||
        document.body.scrollTop ||
        document.documentElement.scrollTop;

      if (scrollDistance > 50) {
        document.body.classList.add("scrolled");
      } else {
        document.body.classList.remove("scrolled");
      }
    };

    document.body.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll);

    window.addEventListener("click", (e) => {
      const fab = document.getElementById("fab-container");
      if (fab.classList.contains("open") && !fab.contains(e.target))
        fab.classList.remove("open");
    });

    // [Ver2.5] 左滑完成手勢 — 事件委派
    this.initSwipeGesture();
  },

  // ── [Ver2.5] 左滑完成手勢（事件委派在 #timeline-content）──
  initSwipeGesture() {
    const timeline = document.getElementById('timeline-content');
    if (!timeline) return;

    let startX = 0, startY = 0, currentX = 0;
    let isTracking = false;
    let direction = null;   // 'horizontal' | 'vertical' | null
    let activeWrap = null;
    let activeCard = null;

    const THRESHOLD = 70;   // 觸發完成的最小滑動距離 (px)
    const ANGLE_LIMIT = 25; // 角度限制 (deg)，低於此才算水平滑動
    const MAX_SLIDE = 100;  // 最大滑動距離 (px)

    function reset() {
      startX = startY = currentX = 0;
      isTracking = false;
      direction = null;
      activeWrap = null;
      activeCard = null;
    }

    timeline.addEventListener('touchstart', (e) => {
      const wrap = e.target.closest('.swipe-wrap');
      if (!wrap) return;
      const card = wrap.querySelector('.mini-card');
      if (!card) return;

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = 0;
      direction = null;
      isTracking = true;
      activeWrap = wrap;
      activeCard = card;
      activeCard.classList.remove('snap-back', 'swipe-triggered');
    }, { passive: true });

    timeline.addEventListener('touchmove', (e) => {
      if (!isTracking || !activeCard) return;

      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      // 首次移動：判斷滑動方向
      if (direction === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
        if (angle > ANGLE_LIMIT) {
          direction = 'vertical';
          isTracking = false;
          return;
        }
        direction = 'horizontal';
        activeWrap.classList.add('swiping');
      }

      if (direction !== 'horizontal') return;

      // 只允許往左滑（dx < 0），加入阻尼效果讓越遠越有阻力
      const rawX = Math.min(0, dx);
      const ratio = Math.min(1, Math.abs(rawX) / MAX_SLIDE);
      // 阻尼公式：指數越高阻力越強（^3 比 ^2 更明顯）
      const dampened = -MAX_SLIDE * (1 - Math.pow(1 - ratio, 3));
      currentX = dampened;
      activeCard.style.transform = `translateX(${currentX}px)`;
      e.preventDefault();
    }, { passive: false });

    timeline.addEventListener('touchend', () => {
      if (direction !== 'horizontal' || !activeWrap || !activeCard) {
        if (activeWrap) activeWrap.classList.remove('swiping');
        reset();
        return;
      }

      const dayId = parseInt(activeWrap.dataset.day, 10);
      const idx = parseInt(activeWrap.dataset.idx, 10);
      const card = activeCard;
      const wrap = activeWrap;

      if (Math.abs(currentX) >= THRESHOLD) {
        // ✅ 滑動距離足夠 → 觸發完成/取消
        // 先加上 swipe-triggered（含 transition），讓卡片動畫回到 translateX(0)
        card.classList.add('swipe-triggered');

        card.addEventListener('transitionend', () => {
          // ★ 重要：清除 inline transform，否則移除 class 後卡片會跳回位移位置
          card.style.transform = '';
          card.classList.remove('swipe-triggered');
          wrap.classList.remove('swiping');
          App.Actions.toggleComplete(dayId, idx);
          if (navigator.vibrate) navigator.vibrate(15);
        }, { once: true });

        // 安全網：若 transitionend 未觸發（偶發），500ms 後強制執行
        setTimeout(() => {
          if (card.classList.contains('swipe-triggered')) {
            card.style.transform = '';
            card.classList.remove('swipe-triggered');
            wrap.classList.remove('swiping');
            App.Actions.toggleComplete(dayId, idx);
          }
        }, 500);
      } else {
        // ↩ 未達門檻 → 彈回原位
        card.classList.add('snap-back');
        card.style.transform = '';

        card.addEventListener('transitionend', () => {
          card.classList.remove('snap-back');
        }, { once: true });
      }

      wrap.classList.remove('swiping');
      reset();
    });

    timeline.addEventListener('touchcancel', () => {
      if (activeCard) {
        activeCard.style.transform = '';
        activeCard.classList.remove('snap-back', 'swipe-triggered');
      }
      if (activeWrap) activeWrap.classList.remove('swiping');
      reset();
    });
  },

  onDataReady() {
    const coverUrl = App.Image.getImgUrl("header_cover");
    if (coverUrl) {
      const h = document.getElementById("header-bg");
      h.style.backgroundImage = `url('${coverUrl}')`;
      h.classList.add("loaded");
    }
    this.renderTabs();
    this.renderTimeline();
    App.Currency.fetchRates();
  },

  renderTabs() {
    document.getElementById("tabs-container").innerHTML = Store.itinerary
      .map((d) => Templates.tabBtn(d, d.id === Store.activeDayId))
      .join("");
  },

  // [Ver2] 加入完成狀態判斷
  renderTimeline() {
    const day = Store.itinerary.find((d) => d.id === Store.activeDayId);
    if (!day) return;
    document.getElementById("timeline-content").innerHTML = day.events
      .map((e, i) => {
        const isCompleted = App.Actions.isCompleted(day.id, i);
        return Templates.timelineRow(e, i, day.id, isCompleted);
      })
      .join("");
  },

  openDetail({ dayId, idx }) {
    App.Utils.openModal("detailOverlay");
    const e = Store.itinerary.find((d) => d.id === dayId).events[idx];
    const bgUrl = App.Image.getImgUrl(e.img);
    e.dayId = dayId;
    e.idx = idx;
    let tools = "",
      safeNav = (e.pos || e.title).replace(/'/g, "\\'");
    if (e.wLoc || e.pos) {
      let weatherCmd = `App.Weather.show('${e.wLoc || e.pos}')`;

      if (e.lat && e.lon) {
        weatherCmd = `App.Weather.show('${e.wLoc || e.pos}', ${e.lat}, ${
          e.lon
        })`;
      }

      tools += `<div class="sh-tool-btn" onclick="${weatherCmd}"><i class="fa-solid fa-cloud-sun"></i> 天氣</div>`;
    }
    if (e.pos)
      tools += `<div class="sh-tool-btn" onclick="navigator.clipboard.writeText('${safeNav}'); document.getElementById('toast').classList.add('show'); setTimeout(()=>document.getElementById('toast').classList.remove('show'), 2000);"><i class="fa-regular fa-copy"></i> 複製</div>`;
    document.getElementById("detailModal").innerHTML =
      Templates.detailSheet(
        e,
        bgUrl,
        tools,
        localStorage.getItem(`note_${dayId}_${idx}`),
        safeNav
      );
  },
};

export default UI;
