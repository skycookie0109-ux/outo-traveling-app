/**
 * Weather Module
 * Handles weather data fetching, geocoding, and weather display
 * Uses Open-Meteo API for weather forecasts
 *
 * [v2.4] 天氣資訊強化：穿搭建議、分級降雨、圖示升級
 */

import EventBus from './eventbus.js';
import Store from './store.js';
import Templates from './templates.js';

const Weather = {
  cache: {},

  // ── [v2.4] 穿搭/攜帶建議 ──────────────────
  getAdvice(min, max, pop) {
    if (typeof min !== 'number' || typeof max !== 'number') {
      return { text: '載入中...', icon: 'fa-spinner' };
    }

    const items = [];
    const avg = (min + max) / 2;

    // 溫度建議
    if (max >= 33) {
      items.push('短袖短褲、防曬乳、遮陽帽');
    } else if (avg >= 28) {
      items.push('輕薄透氣衣物、太陽眼鏡');
    } else if (avg >= 23) {
      items.push('薄長袖備用');
    } else {
      items.push('薄外套或風衣');
    }

    // 降雨建議
    if (typeof pop === 'number') {
      if (pop >= 80) {
        items.push('雨具 + 防水袋');
      } else if (pop >= 60) {
        items.push('記得帶傘');
      }
    }

    return {
      text: items.join('、'),
      icon: max >= 30 ? 'fa-sun' : avg >= 23 ? 'fa-shirt' : 'fa-vest-patches',
    };
  },

  // ── [v2.4] 降雨等級分類 ──────────────────
  getRainLevel(pop) {
    if (typeof pop !== 'number') return 'unknown';
    if (pop >= 60) return 'high';
    if (pop >= 30) return 'mid';
    return 'low';
  },

  // ── [v2.4] 天氣圖示映射（Font Awesome 取代 emoji）──
  getWeatherIcon(code) {
    if (code === 0) return { icon: 'fa-sun', cls: 'w-icon-sun', desc: '晴朗' };
    if (code <= 3) return { icon: 'fa-cloud-sun', cls: 'w-icon-cloudy', desc: '多雲' };
    if (code <= 45) return { icon: 'fa-cloud', cls: 'w-icon-overcast', desc: '陰天' };
    if (code <= 67) return { icon: 'fa-cloud-rain', cls: 'w-icon-rain', desc: '有雨' };
    return { icon: 'fa-cloud-bolt', cls: 'w-icon-storm', desc: '雷雨' };
  },

  init() {
    EventBus.on("APP:DAY_CHANGED", (id) => this.updateDashboard(id));
    EventBus.on("DATA:READY", () => this.updateDashboard(1));
  },

  async geocode(query) {
    if (!query) return null;
    if (Store.geoCache[query]) return Store.geoCache[query];

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=1&language=zh&format=json`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = {
          lat: data.results[0].latitude,
          lon: data.results[0].longitude,
          name: query,
        };
        Store.geoCache[query] = r;
        return r;
      }
    } catch (e) {
      console.error("Geocode error:", e);
    }
    return null;
  },

  async updateDashboard(dayId) {
    const dayData = Store.itinerary.find((d) => d.id === dayId);
    if (!dayData) return;

    let targets = dayData.events.filter(
      (e) => e.showW && e.showW.trim() !== ""
    );
    if (targets.length === 0) {
      const firstValid = dayData.events.find((e) => e.wLoc || e.pos);
      if (firstValid) targets = [firstValid];
    }

    const container = document.getElementById("weather-scroll-container");
    const dots = document.getElementById("weather-dots");

    if (!targets || targets.length === 0) {
      container.innerHTML =
        "<div style='padding:20px; color:#666;'>無天氣資訊</div>";
      dots.innerHTML = "";
      return;
    }

    container.innerHTML = targets
      .map(() => `<div class="w-card">Loading...</div>`)
      .join("");
    dots.innerHTML = targets
      .map((_, i) => Templates.weatherDot(i === 0))
      .join("");

    const tripDate = new Date(dayData.fullDate);
    const today = new Date();
    let diffDays = Math.ceil((tripDate - today) / (1000 * 60 * 60 * 24));

    if (isNaN(diffDays)) diffDays = 999;

    // 過去 92 天內 & 未來 13 天內都可以透過 API 查詢實際天氣
    const isReferenceMode = diffDays > 13 || diffDays < -92;
    const targetDateStr = dayData.fullDate;

    const results = await Promise.all(
      targets.map(async (e) => {
        let coords = null;
        if (e.lat && e.lon) {
          coords = {
            lat: e.lat,
            lon: e.lon,
            name: e.wLoc || e.pos || e.title,
          };
        } else {
          coords = await this.geocode(e.wLoc || e.pos);
        }

        if (!coords)
          return {
            name: e.wLoc || e.pos || "未知地點",
            min: "-",
            max: "-",
            pop: "--",
            icon: "?",
            statusLabel: "無法定位",
            isRef: true,
          };

        const apiRef = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        const apiForecast = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${targetDateStr}&end_date=${targetDateStr}`;

        try {
          let res, data;
          let useRef = isReferenceMode;

          if (useRef) {
            res = await fetch(apiRef);
          } else {
            res = await fetch(apiForecast);
            if (!res.ok) {
              useRef = true;
              res = await fetch(apiRef);
            }
          }

          data = await res.json();
          if (!data.daily) throw new Error("No daily data");

          const i = 0;
          const min = Math.round(data.daily.temperature_2m_min[i]);
          const max = Math.round(data.daily.temperature_2m_max[i]);
          const pop = data.daily.precipitation_probability_max[i];
          const code = data.daily.weather_code[i];

          // [v2.4] 使用 getWeatherIcon 取代 emoji
          const wIcon = this.getWeatherIcon(code);
          const advice = this.getAdvice(min, max, pop);
          const rainLevel = this.getRainLevel(pop);

          let statusLabel = "";
          if (useRef) {
            const daysToWait = diffDays - 13;
            if (daysToWait > 0 && daysToWait <= 14) {
              statusLabel = `${daysToWait}天後更新`;
            } else {
              statusLabel = "近期參考";
            }
          } else if (diffDays < 0) {
            statusLabel = "實際天氣";
          } else {
            statusLabel = "即時預報";
          }

          return {
            name: coords.name,
            min,
            max,
            pop,
            icon: wIcon.icon,
            iconCls: wIcon.cls,
            desc: wIcon.desc,
            advice,
            rainLevel,
            statusLabel,
            isRef: useRef,
          };
        } catch (err) {
          console.error(err);
          return {
            name: coords.name,
            min: "-",
            max: "-",
            pop: "--",
            icon: "?",
            statusLabel: "暫無資料",
            isRef: true,
          };
        }
      })
    );

    container.innerHTML = results
      .map((d, i) => Templates.weatherCard(d, i))
      .join("");

    container.onscroll = () => {
      const index = Math.round(
        container.scrollLeft / container.offsetWidth
      );
      document
        .querySelectorAll(".w-dot")
        .forEach((d, i) => d.classList.toggle("active", i === index));
    };
  },

  async show(query, lat = null, lon = null) {
    App.Utils.openModal("weatherModal");
    const contentEl = document.getElementById("weather-modal-content");
    contentEl.innerText = "Loading...";

    let coords = null;
    if (lat !== null && lon !== null) {
      coords = { lat: lat, lon: lon, name: query };
    } else {
      coords = await this.geocode(query);
    }

    if (!coords) {
      contentEl.innerText = "無法定位";
      return;
    }

    const tripStartStr = Store.itinerary[0].fullDate;
    const tripEndStr = Store.itinerary[Store.itinerary.length - 1].fullDate;

    const tripStartDate = new Date(tripStartStr);
    const today = new Date();

    const diffDays = Math.ceil(
      (tripStartDate - today) / (1000 * 60 * 60 * 24)
    );

    // 過去 92 天內 & 未來 13 天內都可查詢實際天氣
    const isRefMode = diffDays > 13 || diffDays < -92 || isNaN(diffDays);

    const safeLimitDate = new Date();
    safeLimitDate.setDate(today.getDate() + 13);

    // 過去日期也設上限：最多查到 92 天前
    const safeHistoryDate = new Date();
    safeHistoryDate.setDate(today.getDate() - 92);

    const tripEndDate = new Date(tripEndStr);
    const tripStartDateObj = new Date(tripStartStr);

    let effectiveStartDateStr = tripStartStr;
    if (tripStartDateObj < safeHistoryDate) {
      effectiveStartDateStr = safeHistoryDate.toISOString().split("T")[0];
    }

    let effectiveEndDateStr = tripEndStr;
    if (tripEndDate > safeLimitDate) {
      effectiveEndDateStr = safeLimitDate.toISOString().split("T")[0];
    }

    const apiForecast7Days = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const apiTripDates = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${effectiveStartDateStr}&end_date=${effectiveEndDateStr}`;

    let apiUrl = isRefMode ? apiForecast7Days : apiTripDates;

    try {
      let res = await fetch(apiUrl);
      let finalMode = isRefMode;

      if (!res.ok) {
        console.warn("彈窗特定日期查詢失敗，改抓未來預報");
        res = await fetch(apiForecast7Days);
        finalMode = true;
      }

      const data = await res.json();
      this.cache = data;

      if (!data.daily) throw new Error("No daily data");

      let statusBanner = "";
      if (finalMode) {
        // 真正的參考模式（超過 API 查詢範圍）
        let daysToWait = diffDays - 13;
        if (daysToWait < 1) daysToWait = 1;

        statusBanner = `
              <div style="background:#fff3e0; color:#e65100; padding:12px; border-radius:12px; margin-bottom:15px; font-size:0.9rem; display:flex; align-items:start; gap:10px;">
                <i class="fa-solid fa-clock-rotate-left" style="margin-top:3px;"></i>
                <div>
                  <div style="font-weight:bold; margin-bottom:2px;">目前顯示近幾天的氣候</div>
                  <div style="font-size:0.8rem; opacity:0.9; line-height:1.4;">
                    距離出發還有 ${diffDays} 天，暫無即時預報。<br>
                    <span style="color:#bf360c; font-weight:700; background:rgba(255,255,255,0.5); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px;">
                      (預計 ${daysToWait} 天後可取得精準天氣)
                    </span>
                  </div>
                </div>
              </div>`;
      } else {
        const isPast = diffDays < 0;
        const isPartial = effectiveEndDateStr !== tripEndStr || effectiveStartDateStr !== tripStartStr;

        let titleText, subText, bannerBg, bannerColor, bannerIcon;
        if (isPast) {
          titleText = "旅程期間的實際天氣紀錄";
          subText = `顯示 ${effectiveStartDateStr} 至 ${effectiveEndDateStr} 的歷史天氣。`;
          bannerBg = "#e0f2fe";
          bannerColor = "#0369a1";
          bannerIcon = "fa-cloud-sun";
        } else {
          titleText = isPartial ? "已更新為旅程真實預報 (部分)" : "已更新為旅程真實預報";
          subText = isPartial
            ? `顯示 ${effectiveStartDateStr} 至 ${effectiveEndDateStr} 的天氣 (後續日期尚未釋出)。`
            : `顯示 ${tripStartStr} 至 ${tripEndStr} 的當地預測。`;
          bannerBg = "#e8f5e9";
          bannerColor = "#2e7d32";
          bannerIcon = "fa-check-circle";
        }

        statusBanner = `
              <div style="background:${bannerBg}; color:${bannerColor}; padding:12px; border-radius:12px; margin-bottom:15px; font-size:0.9rem; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid ${bannerIcon}" style="font-size:1.1rem;"></i>
                <div>
                  <div style="font-weight:bold;">${titleText}</div>
                  <div style="font-size:0.8rem; opacity:0.8;">${subText}</div>
                </div>
              </div>`;
      }

      const dayNames = [
        "週日",
        "週一",
        "週二",
        "週三",
        "週四",
        "週五",
        "週六",
      ];

      const listHtml = data.daily.time
        .map((t, i) => {
          const d = new Date(t);
          const dayStr = dayNames[d.getDay()];
          const min = Math.round(data.daily.temperature_2m_min[i]);
          const max = Math.round(data.daily.temperature_2m_max[i]);
          const pop = data.daily.precipitation_probability_max[i];
          const code = data.daily.weather_code[i];

          // [v2.4] 使用統一的圖示 + 建議系統
          const wIcon = this.getWeatherIcon(code);
          const advice = this.getAdvice(min, max, pop);
          const rainLevel = this.getRainLevel(pop);

          return `
                <div class="w-day-item" id="w-day-${i}">
                    <div class="w-header" onclick="App.Weather.toggleItem(${i})">
                        <div class="w-date-col">
                            <div class="wd-main-date">${t
                              .slice(5)
                              .replace("-", "/")}</div>
                            <div class="wd-sub-day">${dayStr}</div>
                        </div>
                        <div class="w-summary-col">
                            <div class="ws-icon-wrap ${wIcon.cls}"><i class="fa-solid ${wIcon.icon}"></i></div>
                            <div class="ws-temp-range">
                                <span class="ws-min">${min}°</span>
                                <div class="ws-bar"></div>
                                <span class="ws-max">${max}°</span>
                            </div>
                        </div>
                        <div class="w-pop-col rain-${rainLevel}"><i class="fa-solid fa-droplet"></i> ${pop}%</div>
                        <div class="w-chevron"><i class="fa-solid fa-chevron-down"></i></div>
                    </div>
                    <div class="w-day-advice">
                        <i class="fa-solid ${advice.icon}"></i> ${advice.text}
                    </div>
                    <div class="w-detail-panel">
                        <div class="w-slider-wrap">
                            <span class="w-slider-label" id="label-${i}">12:00</span>
                            <input type="range" min="0" max="23" value="12" class="w-range-input" id="slider-${i}" oninput="App.Weather.updateSlider(this, ${i})">
                            <div class="w-slider-scale"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
                        </div>
                        <div class="w-hour-result" id="result-${i}"></div>
                    </div>
                </div>`;
        })
        .join("");

      contentEl.innerHTML = statusBanner + listHtml;
    } catch (e) {
      console.error(e);
      contentEl.innerText = "無法取得天氣資訊";
    }
  },

  toggleItem(i) {
    const item = document.getElementById(`w-day-${i}`);
    const wasOpen = item.classList.contains("open");

    document
      .querySelectorAll(".w-day-item")
      .forEach((e) => e.classList.remove("open"));

    if (!wasOpen) {
      item.classList.add("open");
      const slider = document.getElementById(`slider-${i}`);
      this.updateSlider(slider, i);
    }
  },

  updateSlider(input, dayIndex) {
    const hour = parseInt(input.value);
    const label = document.getElementById(`label-${dayIndex}`);

    label.innerText = `${hour.toString().padStart(2, "0")}:00`;

    const percent = (hour / 23) * 100;
    label.style.left = `${percent}%`;

    const data = this.cache;
    const idx = dayIndex * 24 + hour;

    if (
      !data.hourly ||
      !data.hourly.temperature_2m ||
      !data.hourly.temperature_2m[idx]
    ) {
      document.getElementById(`result-${dayIndex}`).innerHTML = "無資料";
      return;
    }

    const temp = Math.round(data.hourly.temperature_2m[idx]);
    const pop = data.hourly.precipitation_probability[idx];
    const code = data.hourly.weather_code[idx];

    // [v2.4] 統一使用 getWeatherIcon
    const wIcon = this.getWeatherIcon(code);
    const rainLevel = this.getRainLevel(pop);

    document.getElementById(
      `result-${dayIndex}`
    ).innerHTML = `<div class="wh-left">
              <div class="wh-icon-wrap ${wIcon.cls}"><i class="fa-solid ${wIcon.icon}"></i></div>
              <div class="wh-temp-grp">
                  <div class="wh-temp">${temp}°</div>
                  <div class="wh-desc">${wIcon.desc}</div>
              </div>
           </div>
           <div class="wh-pop rain-${rainLevel}"><i class="fa-solid fa-droplet"></i> ${pop}%</div>`;
  },
};

export default Weather;
