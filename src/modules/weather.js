/**
 * Weather Module
 * Handles weather data fetching, geocoding, and weather display
 * Uses Open-Meteo API for weather forecasts
 *
 * [v2.6] å¤©æ°£è³è¨å¼·åï¼ç©¿æ­å»ºè­°ãåç´éé¨ãåç¤ºåç´
 */

import EventBus from './eventbus.js';
import Store from './store.js';
import Templates from './templates.js';

const Weather = {
  cache: {},

  // ââ [v2.6] ç©¿æ­/æå¸¶å»ºè­° ââââââââââââââââââ
  getAdvice(min, max, pop) {
    if (typeof min !== 'number' || typeof max !== 'number') {
      return { text: 'è¼å¥ä¸­...', icon: 'fa-spinner' };
    }

    const items = [];
    const avg = (min + max) / 2;

    // æº«åº¦å»ºè­°
    if (max >= 33) {
      items.push('ç­è¢ç­è¤²ãé²æ¬ä¹³ãé®é½å¸½');
    } else if (avg >= 28) {
      items.push('è¼èéæ°£è¡£ç©ãå¤ªé½ç¼é¡');
    } else if (avg >= 23) {
      items.push('èé·è¢åç¨');
    } else {
      items.push('èå¤å¥æé¢¨æ¯');
    }

    // éé¨å»ºè­°
    if (typeof pop === 'number') {
      if (pop >= 80) {
        items.push('é¨å· + é²æ°´è¢');
      } else if (pop >= 60) {
        items.push('è¨å¾å¸¶å');
      }
    }

    return {
      text: items.join('ã'),
      icon: max >= 30 ? 'fa-sun' : avg >= 23 ? 'fa-shirt' : 'fa-vest-patches',
    };
  },

  // ââ [v2.6] éé¨ç­ç´åé¡ ââââââââââââââââââ
  getRainLevel(pop) {
    if (typeof pop !== 'number') return 'unknown';
    if (pop >= 60) return 'high';
    if (pop >= 30) return 'mid';
    return 'low';
  },

  // ââ [v2.6] å¤©æ°£åç¤ºæ å°ï¼Font Awesome åä»£ emojiï¼ââ
  getWeatherIcon(code) {
    if (code === 0) return { icon: 'fa-sun', cls: 'w-icon-sun', desc: 'æ´æ' };
    if (code <= 3) return { icon: 'fa-cloud-sun', cls: 'w-icon-cloudy', desc: 'å¤é²' };
    if (code <= 45) return { icon: 'fa-cloud', cls: 'w-icon-overcast', desc: 'é°å¤©' };
    if (code <= 67) return { icon: 'fa-cloud-rain', cls: 'w-icon-rain', desc: 'æé¨' };
    return { icon: 'fa-cloud-bolt', cls: 'w-icon-storm', desc: 'é·é¨' };
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
        "<div style='padding:20px; color:#666;'>ç¡å¤©æ°£è³è¨</div>";
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

    // éå» 92 å¤©å§ & æªä¾ 13 å¤©å§é½å¯ä»¥éé API æ¥è©¢å¯¦éå¤©æ°£
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
            name: e.wLoc || e.pos || "æªç¥å°é»",
            min: "-",
            max: "-",
            pop: "--",
            icon: "?",
            statusLabel: "ç¡æ³å®ä½",
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

          // [v2.6] ä½¿ç¨ getWeatherIcon åä»£ emoji
          const wIcon = this.getWeatherIcon(code);
          const advice = this.getAdvice(min, max, pop);
          const rainLevel = this.getRainLevel(pop);

          let statusLabel = "";
          if (useRef) {
            const daysToWait = diffDays - 13;
            if (daysToWait > 0 && daysToWait <= 14) {
              statusLabel = `${daysToWait}å¤©å¾æ´æ°`;
            } else {
              statusLabel = "è¿æåè";
            }
          } else if (diffDays < 0) {
            statusLabel = "å¯¦éå¤©æ°£";
          } else {
            statusLabel = "å³æé å ±";
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
            statusLabel: "æ«ç¡è³æ",
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
      contentEl.innerText = "ç¡æ³å®ä½";
      return;
    }

    const tripStartStr = Store.itinerary[0].fullDate;
    const tripEndStr = Store.itinerary[Store.itinerary.length - 1].fullDate;

    const tripStartDate = new Date(tripStartStr);
    const today = new Date();

    const diffDays = Math.ceil(
      (tripStartDate - today) / (1000 * 60 * 60 * 24)
    );

    // éå» 92 å¤©å§ & æªä¾ 13 å¤©å§é½å¯æ¥è©¢å¯¦éå¤©æ°£
    const isRefMode = diffDays > 13 || diffDays < -92 || isNaN(diffDays);

    const safeLimitDate = new Date();
    safeLimitDate.setDate(today.getDate() + 13);

    // éå»æ¥æä¹è¨­ä¸éï¼æå¤æ¥å° 92 å¤©å
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
        console.warn("å½çªç¹å®æ¥ææ¥è©¢å¤±æï¼æ¹ææªä¾é å ±");
        res = await fetch(apiForecast7Days);
        finalMode = true;
      }

      const data = await res.json();
      this.cache = data;

      if (!data.daily) throw new Error("No daily data");

      let statusBanner = "";
      if (finalMode) {
        // çæ­£çåèæ¨¡å¼ï¼è¶é API æ¥è©¢ç¯åï¼
        let daysToWait = diffDays - 13;
        if (daysToWait < 1) daysToWait = 1;

        statusBanner = `
              <div style="background:#fff3e0; color:#e65100; padding:12px; border-radius:12px; margin-bottom:15px; font-size:0.9rem; display:flex; align-items:start; gap:10px;">
                <i class="fa-solid fa-clock-rotate-left" style="margin-top:3px;"></i>
                <div>
                  <div style="font-weight:bold; margin-bottom:2px;">ç®åé¡¯ç¤ºè¿å¹¾å¤©çæ°£å</div>
                  <div style="font-size:0.8rem; opacity:0.9; line-height:1.4;">
                    è·é¢åºç¼éæ ${diffDays} å¤©ï¼æ«ç¡å³æé å ±ã<br>
                    <span style="color:#bf360c; font-weight:700; background:rgba(255,255,255,0.5); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px;">
                      (é è¨ ${daysToWait} å¤©å¾å¯åå¾ç²¾æºå¤©æ°£)
                    </span>
                  </div>
                </div>
              </div>`;
      } else {
        const isPast = diffDays < 0;
        const isPartial = effectiveEndDateStr !== tripEndStr || effectiveStartDateStr !== tripStartStr;

        let titleText, subText, bannerBg, bannerColor, bannerIcon;
        if (isPast) {
          titleText = "æç¨æéçå¯¦éå¤©æ°£ç´é";
          subText = `é¡¯ç¤º ${effectiveStartDateStr} è³ ${effectiveEndDateStr} çæ­·å²å¤©æ°£ã`;
          bannerBg = "#e0f2fe";
          bannerColor = "#0369a1";
          bannerIcon = "fa-cloud-sun";
        } else {
          titleText = isPartial ? "å·²æ´æ°çºæç¨çå¯¦é å ± (é¨å)" : "å·²æ´æ°çºæç¨çå¯¦é å ±";
          subText = isPartial
            ? `é¡¯ç¤º ${effectiveStartDateStr} è³ ${effectiveEndDateStr} çå¤©æ°£ (å¾çºæ¥æå°æªéåº)ã`
            : `é¡¯ç¤º ${tripStartStr} è³ ${tripEndStr} çç¶å°é æ¸¬ã`;
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
        "é±æ¥",
        "é±ä¸",
        "é±äº",
        "é±ä¸",
        "é±å",
        "é±äº",
        "é±å­",
      ];

      const listHtml = data.daily.time
        .map((t, i) => {
          const d = new Date(t);
          const dayStr = dayNames[d.getDay()];
          const min = Math.round(data.daily.temperature_2m_min[i]);
          const max = Math.round(data.daily.temperature_2m_max[i]);
          const pop = data.daily.precipitation_probability_max[i];
          const code = data.daily.weather_code[i];

          // [v2.6] ä½¿ç¨çµ±ä¸çåç¤º + å»ºè­°ç³»çµ±
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
                                <span class="ws-min">${min}Â°</span>
                                <div class="ws-bar"></div>
                                <span class="ws-max">${max}Â°</span>
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
                        <div class="w-trend-chart" id="trend-${i}"></div>
                    </div>
                </div>`;
        })
        .join("");

      contentEl.innerHTML = statusBanner + listHtml;
    } catch (e) {
      console.error(e);
      contentEl.innerText = "ç¡æ³åå¾å¤©æ°£è³è¨";
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
      document.getElementById(`result-${dayIndex}`).innerHTML = "ç¡è³æ";
      return;
    }

    const temp = Math.round(data.hourly.temperature_2m[idx]);
    const pop = data.hourly.precipitation_probability[idx];
    const code = data.hourly.weather_code[idx];

    // [v2.6] çµ±ä¸ä½¿ç¨ getWeatherIcon
    const wIcon = this.getWeatherIcon(code);
    const rainLevel = this.getRainLevel(pop);

    // [v2.6 Step 3] å¡çå¼éæçµæ
    document.getElementById(`result-${dayIndex}`).innerHTML =
      `<div class="wh-result-card">
        <div class="wh-main-section">
          <div class="wh-icon-wrap ${wIcon.cls}"><i class="fa-solid ${wIcon.icon}"></i></div>
          <div class="wh-temp">${temp}Â°</div>
          <div class="wh-desc">${wIcon.desc}</div>
        </div>
        <div class="wh-divider"></div>
        <div class="wh-details-grid">
          <div class="wh-detail-item rain-${rainLevel}">
            <span class="wh-detail-label">éé¨</span>
            <span class="wh-detail-value"><i class="fa-solid fa-droplet"></i> ${pop}%</span>
          </div>
        </div>
      </div>`;

    // [v2.6 Step 3] ç¢ç 24 å°ææº«åº¦è¶¨å¢è¿·ä½ å
    this.renderTrendChart(dayIndex);
  },

  // [v2.6 Step 3] CSS-only 24 å°ææº«åº¦è¶¨å¢è¿·ä½ å
  renderTrendChart(dayIndex) {
    const chartEl = document.getElementById(`trend-${dayIndex}`);
    if (!chartEl || !this.cache || !this.cache.hourly) return;

    const baseIdx = dayIndex * 24;
    const temps = [];
    for (let h = 0; h < 24; h++) {
      const t = this.cache.hourly.temperature_2m[baseIdx + h];
      if (t != null) temps.push(Math.round(t));
      else temps.push(null);
    }

    const valid = temps.filter((t) => t !== null);
    if (valid.length === 0) { chartEl.innerHTML = ""; return; }

    const tMin = Math.min(...valid);
    const tMax = Math.max(...valid);
    const range = tMax - tMin || 1;

    const bars = temps
      .map((t, h) => {
        if (t === null) return `<div class="tc-bar-wrap"><div class="tc-bar" style="height:2px"></div></div>`;
        const pct = ((t - tMin) / range) * 100;
        const height = Math.max(8, pct * 0.6 + 8); // 8px min, ~68px max
        return `<div class="tc-bar-wrap${h === parseInt(document.getElementById(`slider-${dayIndex}`)?.value) ? ' tc-active' : ''}"><div class="tc-bar" style="height:${height}px"></div></div>`;
      })
      .join("");

    chartEl.innerHTML =
      `<div class="tc-labels"><span>${tMin}Â°</span><span>${tMax}Â°</span></div>
       <div class="tc-bars">${bars}</div>
       <div class="tc-hours"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>`;
  },
};

export default Weather;
