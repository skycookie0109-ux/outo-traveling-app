/**
 * image.js - Image URL resolution and fallback handling
 * Resolves image URLs from Google Sheets or fallback assets
 * Depends on: Store, CONFIG, FALLBACK_ASSETS
 */

import Store from './store.js';
import { CONFIG, FALLBACK_ASSETS } from './config.js';

const Image = {
  getImgUrl(key) {
    let val = Store.assets[key];

    if (!val || val.trim() === "") {
      val = FALLBACK_ASSETS[key];
    }

    if (!val) {
      return "https://via.placeholder.com/800x400?text=No+Image";
    }

    if (val.startsWith("http")) {
      return val;
    }

    return CONFIG.unsplashBase + val + "?auto=format&fit=crop&w=800&q=80";
  },
};

export default Image;
