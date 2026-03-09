/**
 * templates.js - HTML template functions
 * All UI templates for rendering different components
 * NOTE: These templates reference App.Actions, App.Map, App.Utils, etc.
 *       which are set up in the global App object in main.js
 *
 * [v2.0] 新增行程完成標記 checkbox 功能
 */

const Templates = {
  tabBtn: (d, isActive) =>
    `<button class="tab-btn ${
      isActive ? "active" : ""
    }" onclick="App.Actions.switchDay(${d.id})"><span class="date">${
      d.date
    }</span><span class="day">${d.dayName}</span></button>`,

  timelineRow: (e, i, dayId, isCompleted) =>
    `<div class="event-row ${isCompleted ? 'completed' : ''}">
            <div class="time-col">${e.time}</div>
            <div class="timeline-center"><div class="timeline-line"></div><div class="timeline-dot ${isCompleted ? 'done' : ''}"></div></div>
            <div class="card-col">
                <div class="swipe-wrap" data-day="${dayId}" data-idx="${i}">
                    <div class="swipe-action ${isCompleted ? 'is-undo' : ''}">
                        <i class="fa-solid ${isCompleted ? 'fa-rotate-left' : 'fa-circle-check'}"></i>
                        <span>${isCompleted ? '取消' : '完成'}</span>
                    </div>
                    <div class="mini-card ${isCompleted ? 'card-done' : ''}" onclick="App.Actions.openDetail(${dayId}, ${i})">
                        <div class="mc-header">
                            <div class="mc-info">
                                <span class="mc-tag">${e.tag}</span>
                                <h3 class="mc-title">${e.title}</h3>
                                <div class="mc-sub">${e.subtitle}</div>
                            </div>
                            <div class="mc-check" onclick="event.stopPropagation(); App.Actions.toggleComplete(${dayId}, ${i})">
                                <i class="fa-${isCompleted ? 'solid' : 'regular'} fa-circle-check"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`,

  // [v2.9] 天氣卡片 — 純顯示（不可點擊）+ 溫度右上/降雨右下佈局
  weatherCard: (d, i) =>
    `<div class="w-card">
        <div class="wc-row-main">
            <div class="wc-left">
                <div class="wc-icon-wrap ${d.iconCls || ''}"><i class="fa-solid ${d.icon}"></i></div>
                <div class="wc-loc">${d.name}</div>
                <span class="wc-desc-tag">${d.desc || ''}</span>
            </div>
            <div class="wc-right">
                <div class="wc-temp-range"><span class="wc-t-lo">${d.min}°</span><div class="wc-temp-bar"></div><span class="wc-t-hi">${d.max}°</span></div>
                <div class="wc-rain rain-${d.rainLevel || 'low'}"><i class="fa-solid fa-droplet"></i><div class="wc-rain-track"><div class="wc-rain-fill" style="width:${d.pop}%"></div></div><span>${d.pop}%</span></div>
            </div>
        </div>
        <div class="wc-row-sub">
            <div class="wc-status ${d.isRef ? 'is-ref' : 'is-live'}">${d.statusLabel}</div>
            <div class="wc-advice"><i class="fa-solid ${d.advice ? d.advice.icon : 'fa-shirt'}"></i> ${d.advice ? d.advice.text : ''}</div>
        </div>
     </div>`,

  weatherDot: (isActive) =>
    `<div class="w-dot ${isActive ? "active" : ""}"></div>`,

  recCard: (r, uniqueId, tagsHtml, ribbonHtml, bottomSection, navOnClick) => {
    const displayIcon = r.icon && r.icon.trim().length > 0 ? r.icon : "📍";

    return `<div class="rec-card">${ribbonHtml}
          <div class="rec-upper">
            <div class="rec-icon-box ${r.category}">
              ${displayIcon}
            </div>

            <div class="rec-main-content">
              <div class="rec-name-text">${r.name}</div>
              <div class="rec-tag-group">${tagsHtml}</div>
            </div>
            <button id="${uniqueId}-nav-btn" class="rec-nav-circle" onclick="${navOnClick}">
              <i class="fa-solid fa-location-arrow"></i>
            </button>
          </div>
          ${bottomSection}
        </div>`;
  },

  drawerItem: (e, i, dayId, isChecked) => {
    const hasGeo = e.lat && e.lon;
    const checkClass = isChecked ? "checked" : "";
    const checkIcon = hasGeo
      ? `<div class="drawer-check ${checkClass}" onclick="App.Map.toggleCheck(${dayId}, ${i})"><i class="fa-solid fa-circle-check"></i></div>`
      : `<div class="drawer-check" style="opacity:0.3; cursor:default;"><i class="fa-solid fa-ban"></i></div>`;

    return `<div class="drawer-item" id="drawer-item-${i}">
            <div class="drawer-row-main">
                ${checkIcon}
                <div class="drawer-content" onclick="App.Map.zoomTo(${dayId}, ${i})">
                    <div class="drawer-title">${i + 1}. ${e.title}</div>
                    <div class="drawer-time">${e.time} ${e.subtitle}</div>
                </div>
                <div class="drawer-nav" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  e.pos || e.title
                )}', '_blank')"><i class="fa-solid fa-location-arrow"></i></div>
            </div>
            <div id="leg-info-${dayId}-${i}" class="drawer-leg-info"></div>
        </div>`;
  },

  detailSheet: (e, bgUrl, toolsHtml, savedNote, safeNavQuery) =>
    `<div class="sheet-header-wrap">
            <div class="sheet-hero-bg loaded" style="background-image: url('${bgUrl}');"></div>
            <div class="sheet-header-overlay">
                <button class="sheet-close" onclick="App.Utils.closeAll()"><i class="fa-solid fa-xmark"></i></button>
                <div class="sh-content-wrap"><div class="sh-tag">${
                  e.tag
                }</div><h2 class="sh-title">${
      e.title
    }</h2><div class="sh-sub">${e.subtitle}</div></div>
            </div>
        </div>
        <div class="sheet-body">
            <div style="background:#e8f5e9;padding:15px;border-radius:12px;color:#2e7d32;margin-bottom:20px;">${e.desc.replace(
              /\n/g,
              "<br>"
            )}</div>
            <div class="sh-tools-grid">${toolsHtml}</div>
            <div class="sh-note-box" onclick="App.Note.edit(${e.dayId}, ${
      e.idx
    })">
                <div style="font-weight:bold;color:#f57c00;margin-bottom:5px;">📝 我的筆記</div>
                <div style="font-size:0.9rem;color:#666;">${
                  savedNote || "點此新增..."
                }</div>
            </div>
        </div>
        <div class="sheet-footer">
            <button class="btn-sheet-main" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              safeNavQuery
            )}', '_blank')"><i class="fa-brands fa-google"></i> Google Maps</button>
        </div>`,
};

export default Templates;
