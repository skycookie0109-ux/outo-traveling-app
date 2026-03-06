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
