/**
 * Finance Module
 * Handles expense tracking with voice input, currency conversion, and expense management
 */

import Store from './store.js';

const Finance = {
  currentTotalType: "TWD",
  recognitionInstance: null,
  voiceSafetyTimer: null,

  open() {
    App.Utils.openModal("financeModal");
    this.populateTimeSelect();
    this.renderList();
    this.updateInputHelper();
  },

  stopVoiceInput() {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch (e) {
        // ignore
      }
      this.recognitionInstance = null;
    }

    if (this.voiceSafetyTimer) {
      clearTimeout(this.voiceSafetyTimer);
      this.voiceSafetyTimer = null;
    }

    const btn = document.getElementById("fin-voice-btn");
    if (btn) {
      btn.classList.remove("listening");
      btn.style.opacity = "1";
      btn.innerHTML =
        '<i class="fa-solid fa-microphone"></i> 按下說話 (例：2月10號晚餐越南盾50萬元)';
    }
  },

  populateTimeSelect() {
    const select = document.getElementById("fin-time-select");
    select.innerHTML =
      '<option value="">-- 一般消費 (未指定日期) --</option>';
    if (!Store.itinerary || Store.itinerary.length === 0) return;
    Store.itinerary.forEach((day) => {
      const opt = document.createElement("option");
      opt.value = day.id;
      opt.textContent = `${day.date} ${day.dayName.split(" ")[0]}`;
      select.appendChild(opt);
    });
  },

  formatMoney(amount, currency) {
    const decimals = currency === "VND" ? 0 : 1;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(amount);
  },

  updateInputHelper() {
    const costInput = document.getElementById("fin-cost");
    const currInput = document.getElementById("fin-currency");
    const helperEl = document.getElementById("fin-input-helper");

    const val = parseFloat(costInput.value);
    const curr = currInput.value;

    if (isNaN(val) || val === 0) {
      helperEl.innerHTML = "";
      return;
    }

    if (!App.Currency.rates || !App.Currency.rates[curr]) {
      App.Currency.rates = { TWD: 1, VND: 770, USD: 0.031 };
    }

    const rate = App.Currency.rates[curr];
    let twdVal = val / rate;

    const formattedVal = this.formatMoney(val, curr);
    const approxTwd = Math.round(twdVal);

    let cnText = "";
    if (val >= 10000) {
      const wan = (val / 10000).toFixed(val % 10000 === 0 ? 0 : 1);
      cnText = ` (${wan}萬)`;
    }

    if (curr !== "TWD") {
      helperEl.innerHTML = `${formattedVal}${cnText} <span style="color:#999; margin:0 4px;">≈</span> <span style="color:#2e7d32;">NT$ ${this.formatMoney(
        approxTwd,
        "TWD"
      )}</span>`;
    } else {
      helperEl.innerHTML = `${formattedVal}${cnText}`;
    }
  },

  startVoiceInput() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("您的瀏覽器不支援語音輸入功能");
      return;
    }

    if (this.recognitionInstance) {
      this.stopVoiceInput();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    this.recognitionInstance = recognition;

    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.continuous = false;

    const btn = document.getElementById("fin-voice-btn");

    btn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin"></i> 啟動中 (再按一次取消)...';
    btn.style.opacity = "0.7";

    recognition.onstart = () => {
      btn.classList.add("listening");
      btn.style.opacity = "1";
      btn.innerHTML =
        '<i class="fa-solid fa-microphone-lines fa-beat"></i> 請說話 (點擊停止)...';

      if (navigator.vibrate) navigator.vibrate(50);

      this.voiceSafetyTimer = setTimeout(() => {
        this.stopVoiceInput();
      }, 8000);
    };

    recognition.onresult = (event) => {
      if (this.voiceSafetyTimer) clearTimeout(this.voiceSafetyTimer);

      this.stopVoiceInput();

      const text = event.results[0][0].transcript;
      console.log("語音輸入:", text);
      setTimeout(() => this.parseVoiceCommand(text), 200);
    };

    recognition.onend = () => {
      this.stopVoiceInput();
    };

    recognition.onerror = (event) => {
      console.error("語音錯誤:", event.error);
      this.stopVoiceInput();
      if (event.error === "not-allowed") alert("請允許麥克風權限");
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      this.stopVoiceInput();
    }
  },

  parseVoiceCommand(text) {
    let remainingText = text;

    const cnNums = {
      零: "0",
      "○": "0",
      一: "1",
      壹: "1",
      二: "2",
      貳: "2",
      兩: "2",
      三: "3",
      參: "3",
      四: "4",
      肆: "4",
      五: "5",
      伍: "5",
      六: "6",
      陸: "6",
      七: "7",
      柒: "7",
      八: "8",
      捌: "8",
      九: "9",
      玖: "9",
      十: "10",
    };
    remainingText = remainingText
      .split("")
      .map((char) => cnNums[char] || char)
      .join("");

    remainingText = remainingText.replace(/(\d),(\d)/g, "$1$2");

    let matchedDayId = "";
    const dateRegex =
      /(?:(1[0-2]|[1-9])\s*[月\/\-]\s*)?(3[01]|[12][0-9]|[1-9])\s*[號日]/;
    const dateMatch = remainingText.match(dateRegex);
    if (dateMatch) {
      const wholeMatch = dateMatch[0];
      const m = dateMatch[1];
      const d = dateMatch[2];
      const foundDay = Store.itinerary.find((day) => {
        const [dayM, dayD] = day.date.split("/");
        if (m)
          return (
            parseInt(dayM) == parseInt(m) && parseInt(dayD) == parseInt(d)
          );
        else return parseInt(dayD) == parseInt(d);
      });
      if (foundDay) {
        matchedDayId = foundDay.id;
        remainingText = remainingText.replace(wholeMatch, " ");
      }
    }

    let currency = "VND";
    const currencyMatchers = [
      { code: "VND", regex: /(越南盾|越盾|盾|VND|Dong)/i },
      { code: "TWD", regex: /(台幣|新台幣|TWD|NT\$|NT)/i },
      { code: "USD", regex: /(美金|美元|USD|US\$|\$)/i },
    ];
    for (const matcher of currencyMatchers) {
      if (remainingText.match(matcher.regex)) {
        currency = matcher.code;
        break;
      }
    }

    let amount = "";
    const amountRegex = /(\d+(?:\.\d+)?)\s*(萬|万|w|W|千|k|K)?/;
    const amountMatch = remainingText.match(amountRegex);
    if (amountMatch) {
      let rawNum = parseFloat(amountMatch[1]);
      const unit = amountMatch[2];
      if (unit) {
        if (["萬", "万", "w", "W"].includes(unit)) rawNum = rawNum * 10000;
        else if (["千", "k", "K"].includes(unit)) rawNum = rawNum * 1000;
      }
      amount = rawNum.toString();
      remainingText = remainingText.replace(amountMatch[0], " ");
    }

    const noiseWords =
      /花費|花了|金額|是|用|去|買|吃|元|塊|錢|的|了|總共|共/g;
    remainingText = remainingText.replace(noiseWords, "");
    remainingText = remainingText.replace(
      /(越南盾|越盾|盾|台幣|新台幣|美金|VND|TWD|USD)/gi,
      ""
    );
    let name = remainingText
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, "")
      .trim();
    if (!name) {
      if (text.includes("餐")) name = "用餐";
      else if (text.includes("車") || text.includes("搭")) name = "交通";
      else name = "一般消費";
    }

    if (matchedDayId)
      document.getElementById("fin-time-select").value = matchedDayId;
    if (name) document.getElementById("fin-name").value = name;
    if (amount) document.getElementById("fin-cost").value = amount;
    document.getElementById("fin-currency").value = currency;

    this.updateInputHelper();
  },

  switchTotalCurrency(type) {
    this.currentTotalType = type;
    this.renderList();
  },

  add() {
    const nameInput = document.getElementById("fin-name");
    const costInput = document.getElementById("fin-cost");
    const currInput = document.getElementById("fin-currency");
    const timeSelect = document.getElementById("fin-time-select");

    const name = nameInput.value;
    const cost = parseFloat(costInput.value);
    const currency = currInput.value;
    const dayId = timeSelect.value;

    if (!name || isNaN(cost)) return;

    let linkedDateLabel = "";
    if (dayId) {
      const day = Store.itinerary.find((d) => d.id == dayId);
      if (day) linkedDateLabel = `${day.date} ${day.dayName.split(" ")[0]}`;
    }

    if (!App.Currency.rates || !App.Currency.rates[currency]) {
      App.Currency.rates = { TWD: 1, VND: 770, USD: 0.031 };
    }

    const rate = App.Currency.rates[currency];
    const baseAmount = cost / rate;

    const list = JSON.parse(localStorage.getItem("fin_list") || "[]");
    list.push({
      id: Date.now(),
      name,
      cost,
      currency,
      baseAmount,
      rate,
      linkedDateLabel,
    });
    localStorage.setItem("fin_list", JSON.stringify(list));
    this.renderList();

    nameInput.value = "";
    costInput.value = "";
    this.updateInputHelper();
  },

  del(id) {
    const list = JSON.parse(
      localStorage.getItem("fin_list") || "[]"
    ).filter((i) => i.id !== id);
    localStorage.setItem("fin_list", JSON.stringify(list));
    this.renderList();
  },

  renderList() {
    const list = JSON.parse(localStorage.getItem("fin_list") || "[]");

    let totalBaseTwd = 0;
    list.forEach((i) => {
      totalBaseTwd += i.baseAmount || i.cost;
    });

    if (!App.Currency.rates)
      App.Currency.rates = { TWD: 1, VND: 770, USD: 0.031 };
    const targetRate = App.Currency.rates[this.currentTotalType] || 1;

    const displayTotalNum = totalBaseTwd * targetRate;

    document.getElementById("fin-total").innerText = this.formatMoney(
      displayTotalNum,
      this.currentTotalType
    );

    const groups = {};
    const groupOrder = [];
    list.forEach((item) => {
      const key = item.linkedDateLabel || "未分類";
      if (!groups[key]) {
        groups[key] = { items: [], totalBaseTwd: 0 };
        groupOrder.push(key);
      }
      groups[key].items.push(item);
      groups[key].totalBaseTwd += item.baseAmount || item.cost;
    });

    groupOrder.sort((a, b) => {
      if (a === "未分類") return 1;
      if (b === "未分類") return -1;
      return a.localeCompare(b);
    });

    const container = document.getElementById("fin-list");
    if (list.length === 0) {
      container.innerHTML =
        "<div style='text-align:center;padding:20px;color:#999;'>暫無記帳紀錄</div>";
      return;
    }

    let html = "";
    groupOrder.forEach((groupKey, index) => {
      const group = groups[groupKey];

      const groupTotalNum = group.totalBaseTwd * targetRate;
      const groupTotalStr = this.formatMoney(
        groupTotalNum,
        this.currentTotalType
      );
      const isOpen = index === 0 ? "open" : "";

      const itemsHtml = group.items
        .reverse()
        .map((i) => {
          const curr = i.currency || "TWD";
          const amountStr = this.formatMoney(i.cost, curr);
          const base = i.baseAmount || i.cost;

          return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; border-bottom:1px solid #f9f9f9;">
                  <div>
                    <div style="font-weight:600; color:#37474f; font-size:1rem; margin-bottom:2px;">${
                      i.name
                    }</div>
                    <div style="display:flex; align-items:baseline; gap:6px;">
                        <span style="font-size:1.1rem; font-weight:700; color:#555;">${amountStr}</span>
                        <span style="font-size:0.75rem; color:#999;">${curr}</span>
                        ${
                          curr !== "TWD"
                            ? `<span style="font-size:0.75rem; color:#ccc;">(≈ NT$${Math.round(
                                base
                              )})</span>`
                            : ""
                        }
                    </div>
                  </div>
                  <span style="color:#ef5350; cursor:pointer; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#ffebee;" onclick="App.Finance.del(${
                    i.id
                  })">
                    <i class="fa-solid fa-trash-can" style="font-size:0.9rem;"></i>
                  </span>
                </div>`;
        })
        .join("");

      html += `
            <div class="fin-group ${isOpen}" id="fin-group-${index}">
                <div class="fin-group-header" onclick="document.getElementById('fin-group-${index}').classList.toggle('open')">
                    <div><i class="fa-regular fa-calendar-check" style="color:var(--primary); margin-right:6px;"></i> ${groupKey}</div>
                    <div style="display:flex; align-items:center;">
                        <span class="day-total">${this.currentTotalType} ${groupTotalStr}</span>
                        <i class="fa-solid fa-chevron-down arrow"></i>
                    </div>
                </div>
                <div class="fin-group-body">${itemsHtml}</div>
            </div>`;
    });
    container.innerHTML = html;
  },
};

export default Finance;
