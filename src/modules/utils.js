/**
 * utils.js - Utility functions for UI control and speech synthesis
 * Handles modal management, FAB menu, and text-to-speech
 * Note: This module references App.Finance and App.Language via global App object
 */

const Utils = {
  closeAll() {
    if (App.Finance && App.Finance.stopVoiceInput) {
      App.Finance.stopVoiceInput();
    }

    if (App.Language && App.Language.stopVoiceInput) {
      App.Language.stopVoiceInput();
    }

    document
      .querySelectorAll(".modal-overlay, .sheet-overlay")
      .forEach((el) => {
        el.classList.remove("active");
        el.oncontextmenu = null;
      });
    document.getElementById("fab-container").classList.remove("open");
    document.body.classList.remove("no-scroll");
  },

  closeTicket() {
    const overlay = document.getElementById("ticketOverlay");
    if (overlay) overlay.classList.remove("active");
  },

  toggleFab(e) {
    e.stopPropagation();
    document.getElementById("fab-container").classList.toggle("open");
  },
  openModal(id) {
    this.closeAll();
    document.body.classList.add("no-scroll");
    const overlay = document.getElementById(id);
    overlay.classList.add("active");
  },
  speak(text, lang = "vi-VN") {
    const u = new SpeechSynthesisUtterance(text);

    let voiceLang = lang;

    if (lang === "vi")
      voiceLang = "vi-VN";
    else if (lang === "en") voiceLang = "en-US";
    else if (lang === "zh-TW") voiceLang = "zh-TW";

    u.lang = voiceLang;
    window.speechSynthesis.speak(u);
  },
};

export default Utils;
