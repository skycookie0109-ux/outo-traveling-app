/**
 * currency.js — 即時匯率轉換模組
 * [v2.9] 方案D 重構：漸層基準區 + 下拉切換 + 緊湊結果清單
 *
 * 功能：
 * - 支援多幣別動態清單（不再硬編碼 3 個）
 * - 基準幣別切換（下拉選擇器）
 * - 快速金額按鈕
 * - 即時匯率 API（fawazahmed0/currency-api）
 * - 千分位數字格式化
 */

const Currency = {
  // ── 幣別定義 ──────────────────────────
  currencies: [
    { code: 'TWD', flag: '🇹🇼', name: '新台幣', symbol: 'NT$' },
    { code: 'VND', flag: '🇻🇳', name: '越南盾', symbol: '₫' },
    { code: 'USD', flag: '🇺🇸', name: '美元', symbol: '$' },
  ],

  // ── 狀態 ──────────────────────────────
  baseCurrency: 'TWD',
  rates: { TWD: 1, VND: 770, USD: 0.031 },
  lastUpdated: null,
  inputValue: '',
  activeQuick: null,

  // ── 初始化（由外部呼叫）────────────────
  init() {
    this.fetchRates();
    this.render();
  },

  // ── API 取得即時匯率 ──────────────────
  async fetchRates() {
    try {
      const res = await fetch(
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/twd.json'
      );
      const data = await res.json();

      this.rates = { TWD: 1 };
      this.currencies.forEach((c) => {
        if (c.code !== 'TWD' && data.twd[c.code.toLowerCase()]) {
          this.rates[c.code] = data.twd[c.code.toLowerCase()];
        }
      });

      this.lastUpdated = new Date();
      this.updateTimeDisplay();
      this.calculate();
    } catch (e) {
      console.error('[Currency] 匯率更新失敗:', e);
      this.updateTimeDisplay(true);
    }
  },

  // ── 渲染整個匯率介面 ──────────────────
  render() {
    const container = document.getElementById('currency-container');
    if (!container) return;

    const base = this.currencies.find((c) => c.code === this.baseCurrency);
    const others = this.currencies.filter((c) => c.code !== this.baseCurrency);

    container.innerHTML = `
      <!-- 基準幣別卡片 -->
      <div class="currency-base-card">
        <div class="currency-base-top">
          <div class="currency-base-left">
            <span class="currency-base-flag">${base.flag}</span>
            <div>
              <div class="currency-base-code">${base.code} ${base.name}</div>
              <div class="currency-base-name">基準幣別</div>
            </div>
          </div>
          <button class="currency-switch-btn" onclick="App.Currency.openPicker()">切換 ▾</button>
        </div>
        <input
          type="number"
          class="currency-base-input"
          id="currency-base-input"
          placeholder="輸入金額"
          inputmode="decimal"
          value="${this.inputValue}"
          oninput="App.Currency.onInput(this.value)"
        />
        <div class="currency-quick-row">
          ${[100, 500, 1000, 5000, 10000]
            .map(
              (amt) =>
                `<button class="currency-quick-btn${this.activeQuick === amt ? ' active' : ''}" onclick="App.Currency.quickAmount(${amt})">${amt.toLocaleString()}</button>`
            )
            .join('')}
        </div>
        <div class="currency-base-footer">
          <div class="currency-update-time" id="currency-update-time">載入中...</div>
          <button class="currency-clear-btn" onclick="App.Currency.clear()">清除</button>
        </div>
      </div>

      <!-- 結果標題 -->
      <div class="currency-result-header">換算結果</div>

      <!-- 結果清單 -->
      <div class="currency-result-list" id="currency-result-list">
        ${others
          .map(
            (c) => `
          <div class="currency-result-item" data-code="${c.code}">
            <div class="currency-result-left">
              <span class="currency-result-flag">${c.flag}</span>
              <div>
                <div class="currency-result-code">${c.code}</div>
                <div class="currency-result-name">${c.name}</div>
              </div>
            </div>
            <div class="currency-result-right">
              <div class="currency-result-amount" id="result-${c.code}">—</div>
              <div class="currency-result-rate" id="rate-${c.code}"></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    this.updateTimeDisplay();
    this.calculate();
  },

  // ── 輸入處理 ──────────────────────────
  onInput(val) {
    this.inputValue = val;
    this.activeQuick = null;
    this.calculate();
    // 移除 quick 按鈕 active 狀態
    document.querySelectorAll('.currency-quick-btn').forEach((b) => b.classList.remove('active'));
  },

  // ── 快速金額 ──────────────────────────
  quickAmount(amt) {
    this.inputValue = String(amt);
    this.activeQuick = amt;
    const input = document.getElementById('currency-base-input');
    if (input) input.value = amt;

    // 更新 active 狀態
    document.querySelectorAll('.currency-quick-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.textContent.replace(/,/g, '')) === amt);
    });

    this.calculate();
  },

  // ── 換算計算 ──────────────────────────
  calculate() {
    const val = parseFloat(this.inputValue);
    const others = this.currencies.filter((c) => c.code !== this.baseCurrency);

    others.forEach((c) => {
      const amountEl = document.getElementById(`result-${c.code}`);
      const rateEl = document.getElementById(`rate-${c.code}`);
      if (!amountEl) return;

      if (isNaN(val) || val === 0) {
        amountEl.textContent = '—';
        if (rateEl) rateEl.textContent = '';
        return;
      }

      // 先將輸入值轉為 TWD，再轉為目標幣別
      const baseRate = this.rates[this.baseCurrency] || 1;
      const targetRate = this.rates[c.code] || 1;
      const valInTwd = val / baseRate;
      const result = valInTwd * targetRate;

      // 格式化：小數位依幣別調整
      let formatted;
      if (c.code === 'VND' || result > 1000) {
        formatted = Math.round(result).toLocaleString();
      } else if (result < 0.01) {
        formatted = result.toFixed(6);
      } else {
        formatted = result.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }

      amountEl.textContent = formatted;

      // 顯示匯率比
      if (rateEl) {
        const rateRatio = targetRate / baseRate;
        let rateStr;
        if (rateRatio >= 1) {
          rateStr = rateRatio > 100 ? Math.round(rateRatio).toLocaleString() : rateRatio.toFixed(2);
        } else {
          rateStr = rateRatio.toFixed(4);
        }
        rateEl.textContent = `1 ${this.baseCurrency} = ${rateStr} ${c.code}`;
      }
    });
  },

  // ── 清除 ──────────────────────────────
  clear() {
    this.inputValue = '';
    this.activeQuick = null;
    const input = document.getElementById('currency-base-input');
    if (input) input.value = '';
    document.querySelectorAll('.currency-quick-btn').forEach((b) => b.classList.remove('active'));
    this.calculate();
  },

  // ── 更新時間顯示 ──────────────────────
  updateTimeDisplay(failed = false) {
    const el = document.getElementById('currency-update-time');
    if (!el) return;

    if (failed) {
      el.textContent = '匯率更新失敗（使用預設值）';
      el.style.setProperty('--dot-color', '#ef4444');
      return;
    }

    if (this.lastUpdated) {
      const h = this.lastUpdated.getHours().toString().padStart(2, '0');
      const m = this.lastUpdated.getMinutes().toString().padStart(2, '0');
      el.textContent = `即時匯率 ${h}:${m} 更新`;
    }
  },

  // ── 幣別選擇器（掛在 modal-card 內部）────
  openPicker() {
    // 如果已存在就移除
    let overlay = document.getElementById('currency-picker-overlay');
    if (overlay) overlay.remove();

    // 找到 converterModal 的 modal-card 作為掛載點
    const modalCard = document.querySelector('#converterModal .modal-card');
    if (!modalCard) return;

    overlay = document.createElement('div');
    overlay.id = 'currency-picker-overlay';
    overlay.className = 'currency-picker-overlay';
    overlay.innerHTML = `
      <div class="currency-picker-sheet">
        <div class="currency-picker-handle"></div>
        <div class="currency-picker-title">選擇基準幣別</div>
        ${this.currencies
          .map(
            (c) => `
          <div class="currency-picker-item${c.code === this.baseCurrency ? ' current' : ''}"
               onclick="App.Currency.selectBase('${c.code}')">
            <span class="flag">${c.flag}</span>
            <div>
              <div class="code">${c.code}</div>
              <div class="name">${c.name}</div>
            </div>
            ${c.code === this.baseCurrency ? '<span class="check">✓</span>' : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `;

    // 點擊遮罩關閉
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closePicker();
    });

    modalCard.appendChild(overlay);

    // 觸發動畫
    requestAnimationFrame(() => overlay.classList.add('show'));
  },

  closePicker() {
    const overlay = document.getElementById('currency-picker-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  },

  selectBase(code) {
    if (code === this.baseCurrency) {
      this.closePicker();
      return;
    }
    this.baseCurrency = code;
    this.closePicker();
    // 保留輸入值，重新渲染
    this.render();
  },
};

export default Currency;
