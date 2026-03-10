/**
 * store.js - Centralized application state
 * Contains all shared data including itinerary, recommendations, phrases, etc.
 */

const Store = {
  config: {
    appTitle: "越南輕旅行",
    appSubtitle: "Da Nang 2026",
    startDate: "2026-12-06",
    targetLang: "vi",
  },
  itinerary: [],
  recommendations: {},
  tickets: {},          // [v2.11] { recKey: [{name, ticketId}] }
  phrases: [],
  assets: {},
  info: [],
  activeDayId: 1,
  geoCache: {},
};

export default Store;
