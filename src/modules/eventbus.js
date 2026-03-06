/**
 * EventBus - Simple pub/sub event emitter
 * Handles application-wide event communication
 */

const EventBus = {
  events: {},
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  },
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach((cb) => cb(data));
    }
  },
};

export default EventBus;
