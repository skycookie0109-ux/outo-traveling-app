/**
 * Recommendations Module
 * Handles displaying and filtering recommendations for dining, shopping, massage, and attractions
 */

import Store from './store.js';
import Templates from './templates.js';

const Rec = {
  activeTab: "food",

  open() {
    App.Utils.openModal("recOverlay");
    this.renderTabs();
    this.filter("food");
  },

  renderTabs() {
    const tabs = [
      { id: "food", label: "🍽️ 美食" },
      { id: "shopping", label: "🛍️ 購物" },
      { id: "massage", label: "💆 按摩" },
      { id: "tourist_attraction", label: "📸 景點" },
    ];
    document.getElementById("rec-tabs").innerHTML = tabs
      .map(
        (t) =>
          `<button class="rec-tab-btn ${
            this.activeTab === t.id ? "active " + t.id : ""
          }" onclick="App.Rec.filter('${t.id}')">${t.label}</button>`
      )
      .join("");
  },

  toggleBranch(id) {
    const box = document.getElementById(id + "-branch-box");
    const arrow = document.getElementById(id + "-arrow");
    box.classList.toggle("open");
    if (arrow) arrow.classList.toggle("rotate");
  },

  selectBranch(cardId, address, el) {
    const parent = el.closest(".rec-branch-box");
    parent.querySelectorAll(".rec-branch-item").forEach((item) => {
      item.classList.remove("active");
      item
        .querySelector(".rec-branch-radio i")
        .classList.replace("fa-circle-dot", "fa-circle");
    });
    el.classList.add("active");
    el.querySelector(".rec-branch-radio i").classList.replace(
      "fa-circle",
      "fa-circle-dot"
    );
    document.getElementById(
      cardId + "-addr-text"
    ).innerHTML = `<i class="fa-solid fa-location-dot"></i> ${address}`;
    document.getElementById(cardId + "-nav-btn").onclick = function () {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address
        )}`,
        "_blank"
      );
    };
  },

  filter(cat) {
    this.activeTab = cat;
    this.renderTabs();

    const list = Object.values(Store.recommendations);
    const filtered =
      cat === "all" ? list : list.filter((i) => i.category === cat);

    const container = document.getElementById("rec-list");

    if (filtered.length === 0) {
      container.innerHTML =
        "<div style='text-align:center;padding:40px;color:#999;'>暫無資料</div>";
      return;
    }

    container.innerHTML = filtered
      .map((r, i) => {
        const uniqueId = `rec-${i}`;

        const isAttraction = r.category === "tourist_attraction";
        if (isAttraction && (!r.icon || r.icon === "📍")) {
          r.icon = "🎟️";
        }

        const hotKeywords = ["★"];
        const isHot = r.items.some((tag) =>
          hotKeywords.some((k) => tag.includes(k))
        );
        const ribbonHtml = isHot
          ? `<div class="rec-ribbon">🔥 推薦</div>`
          : "";

        const tagsHtml = r.items
          .map((tag) => {
            const isHigh = hotKeywords.some((k) => tag.includes(k));
            return `<span class="rec-tag-pill ${
              isHigh ? "highlight" : ""
            }">${tag.replace(/[#★]/g, "")}</span>`;
          })
          .join("");

        let bottomSection = "";
        let currentAddress = r.address;
        let navOnClick = `window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          r.address
        )}', '_blank')`;

        if (r.address.includes("\n")) {
          const branches = r.address.split("\n").map((l) => {
            const p = l.split("|");
            return {
              name: p[0].trim(),
              tag: p[1] || "",
              addr: p[2] || p[0].trim(),
            };
          });
          currentAddress = branches[0].addr;
          navOnClick = `window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            currentAddress
          )}', '_blank')`;

          const listHtml = branches
            .map(
              (b, bIdx) => `
                    <div class="rec-branch-item ${
                      bIdx === 0 ? "active" : ""
                    }" onclick="App.Rec.selectBranch('${uniqueId}', '${b.addr.replace(
                /'/g,
                "\\'"
              )}', this)">
                        <div class="rec-branch-radio"><i class="fa-regular ${
                          bIdx === 0 ? "fa-circle-dot" : "fa-circle"
                        }"></i></div>
                        <div class="rec-branch-info">
                            <span class="rec-branch-name">${b.name}</span>
                            ${
                              b.tag
                                ? `<span class="rec-branch-tag ${
                                    b.tag.includes("冷氣") ? "blue" : "orange"
                                  }">${b.tag}</span>`
                                : ""
                            }
                        </div>
                    </div>`
            )
            .join("");

          bottomSection = `
                    <div class="rec-expand-footer" onclick="App.Rec.toggleBranch('${uniqueId}')">
                        <span>📍 選擇分店 (共${branches.length}間)</span> <i id="${uniqueId}-arrow" class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div id="${uniqueId}-branch-box" class="rec-branch-box">${listHtml}</div>
                    <div class="rec-current-addr" id="${uniqueId}-addr-text"><i class="fa-solid fa-location-dot"></i> ${currentAddress}</div>`;
        } else {
          bottomSection = `<div class="rec-current-addr"><i class="fa-solid fa-location-dot"></i> ${r.address}</div>`;
        }

        if (isAttraction) {
          const safeName = r.name.replace(/'/g, "\\'");
          const safeAddr = currentAddress.replace(/'/g, "\\'");
          const safeTicket = r.ticketInfo
            ? r.ticketInfo.replace(/'/g, "\\'")
            : "";

          const ticketBtnHtml = `
                  <div class="rec-ticket-cta" onclick="event.stopPropagation(); App.Actions.openTicket('${safeName}', '${safeAddr}', '${safeTicket}')">
                    <div class="rec-ticket-icon-col">
                      <i class="fa-solid fa-ticket"></i>
                    </div>
                    <div class="rec-ticket-info">
                      <div class="rec-ticket-title">${r.name} 門票</div>
                      <div class="rec-ticket-sub">點此開啟 OUTO 電子憑證</div>
                    </div>
                    <div class="rec-ticket-arrow">
                      <i class="fa-solid fa-qrcode"></i>
                    </div>
                  </div>
                `;

          bottomSection = ticketBtnHtml + bottomSection;
        }

        return Templates.recCard(
          r,
          uniqueId,
          tagsHtml,
          ribbonHtml,
          bottomSection,
          navOnClick
        );
      })
      .join("");
  },
};

export default Rec;
