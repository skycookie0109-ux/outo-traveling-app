/**
 * note.js - User notes management module
 * Stores and retrieves user notes from localStorage
 * Note: This module references App.Utils and App.Actions via global App object
 */

const Note = {
  target: {},
  edit(dayId, idx) {
    App.Utils.openModal("noteModal");
    this.target = { dayId, idx };
    const key = `note_${dayId}_${idx}`;
    document.getElementById("noteInput").value =
      localStorage.getItem(key) || "";
  },
  save() {
    const { dayId, idx } = this.target;
    const content = document.getElementById("noteInput").value;
    const key = `note_${dayId}_${idx}`;
    localStorage.setItem(key, content);
    App.Utils.closeAll();
    App.Actions.openDetail(dayId, idx);
  },
};

export default Note;
