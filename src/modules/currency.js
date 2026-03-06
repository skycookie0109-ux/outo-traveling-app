/**
 * currency.js - Currency conversion and exchange rate management
 * Fetches live exchange rates and performs currency conversions
 */

const Currency = {
  rates: {
    TWD: 1,
    VND: 770,
    USD: 0.031,
  },

  async fetchRates() {
    try {
      const res = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/twd.json`
      );
      const data = await res.json();

      this.rates = {
        TWD: 1,
        USD: data.twd.usd,
        VND: data.twd.vnd,
      };
      document.getElementById("rate-source").innerText =
        "匯率已更新 (" + new Date().toLocaleDateString() + ")";
    } catch (e) {
      console.error(e);
      document.getElementById("rate-source").innerText =
        "匯率更新失敗 (使用預設值)";
    }
  },

  calculate(source) {
    const inputEl = document.getElementById(`inp-${source}`);
    if (!inputEl) return;

    const val = parseFloat(inputEl.value);
    if (isNaN(val)) return this.clear();

    const valInTwd = val / this.rates[source];

    ["TWD", "USD", "VND"].forEach((c) => {
      if (c !== source) {
        let result = valInTwd * this.rates[c];

        let fixed = c === "VND" ? 0 : 2;
        if (result > 1000) fixed = 0;

        const targetEl = document.getElementById(`inp-${c}`);
        if (targetEl) targetEl.value = parseFloat(result.toFixed(fixed));
      }
    });
  },
  clear() {
    ["TWD", "USD", "VND"].forEach((c) => {
      const el = document.getElementById(`inp-${c}`);
      if (el) el.value = "";
    });
  },
};

export default Currency;
