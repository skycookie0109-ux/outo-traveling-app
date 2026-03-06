/**
 * settings.js - App settings and data management
 * Handles clearing finance records, notes, and factory reset
 * Note: This module references App.Finance, App.Utils, and localStorage
 *
 * [Ver2] 新增 clearCompletions() 清除行程完成標記
 * [Ver2.3] 移除深色模式
 */

const Settings = {
  // ── [Ver2.2.2] 設定按鈕長按啟動（防誤觸）──
  initSettingsButton() {
    const btn = document.getElementById('settings-btn-header');
    if (!btn) return;
    let timer = null;
    const start = () => {
      timer = setTimeout(() => {
        App.Actions.openSettings();
        timer = null;
      }, 600); // 需長按 0.6 秒
    };
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    btn.addEventListener('touchstart', start, { passive: true });
    btn.addEventListener('touchend', cancel);
    btn.addEventListener('touchmove', cancel);
    // 桌面端直接點擊即可
    btn.addEventListener('click', (e) => {
      if ('ontouchstart' in window) return; // 手機端由長按處理
      App.Actions.openSettings();
    });
  },

  // 1. 清除記帳
  clearFinance() {
    if (confirm("確定要刪除所有的記帳紀錄嗎？(此動作無法復原)")) {
      localStorage.removeItem("fin_list");
      alert("記帳紀錄已清除");
      App.Finance.renderList();
      App.Utils.closeAll();
    }
  },

  // 2. 清除筆記
  clearNotes() {
    if (confirm("確定要刪除所有的筆記嗎？(此動作無法復原)")) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("note_")) {
          localStorage.removeItem(key);
        }
      });
      alert("所有筆記已清除");
      App.Utils.closeAll();
      location.reload();
    }
  },

  // [Ver2] 3. 清除行程完成標記
  clearCompletions() {
    if (confirm("確定要清除所有行程完成標記嗎？")) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("done_")) {
          localStorage.removeItem(key);
        }
      });
      alert("完成標記已清除");
      App.Utils.closeAll();
      location.reload();
    }
  },

  // 4. 重置所有資料 (安全鎖)
  factoryReset() {
    const check = prompt(
      "【嚴重警告】\n此動作將刪除所有記帳、筆記與快取資料，且無法復原。\n\n如確認要刪除，請在下方輸入大寫單字：DELETE"
    );

    if (check === "DELETE") {
      localStorage.clear();
      alert("App 已重置，將重新載入。");
      location.reload();
    } else if (check !== null) {
      alert("輸入錯誤，取消重置。");
    }
  },
};

export default Settings;
