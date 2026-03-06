/**
 * info.js - Pre-trip information module
 * Displays travel tips, requirements, and other informational content
 * Depends on: EventBus, Store
 */

import EventBus from './eventbus.js';
import Store from './store.js';

const Info = {
  init() {
    EventBus.on("DATA:READY", this.render.bind(this));
  },
  render() {
    const container = document.getElementById("info-list-container");
    if (!Store.info || Store.info.length === 0) {
      container.innerHTML =
        "<div style='text-align:center;padding:40px;color:#999;font-weight:bold;'>暫無行前資訊</div>";
      return;
    }

    container.innerHTML = Store.info
      .map((item) => {
        if (item.type === "highlight") {
          const listItems = item.content
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map(
              (line) => `
                <div class="checklist-item">
                  <div class="checklist-icon"><i class="fa-solid fa-check"></i></div>
                  <div class="checklist-text">${line.trim()}</div>
                </div>
              `
            )
            .join("");

          return `
              <div class="info-highlight-card">
                <div class="info-highlight-header">
                  <i class="fa-solid ${item.icon}"></i>
                  <span>${item.title}</span>
                </div>
                <div class="info-highlight-body">
                  ${listItems}
                </div>
              </div>
            `;
        }

        let prettyContent = item.content;

        return `
            <div class="info-card">
              <div class="info-icon-bubble">
                <i class="fa-solid ${item.icon}"></i>
              </div>
              <div class="info-content-wrap">
                <div class="info-title">${item.title}</div>
                <div class="info-desc">${prettyContent}</div>
              </div>
            </div>
          `;
      })
      .join("");
  },
};

export default Info;
