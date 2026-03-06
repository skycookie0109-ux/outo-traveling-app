/**
 * config.js - Application configuration constants
 * Contains API keys, sheet IDs, and fallback assets
 */

const GOOGLE_API_KEY = "AIzaSyDkdIhs2SP1uOKdTxkVuxDxDKrQMo9U-4Y";

const CONFIG = {
  GOOGLE_SHEET_ID: "1PSmzEE9K91CiRxcGu8JipOXVF3joNuEbItDaZOYVv_s",
  unsplashBase: "https://images.unsplash.com/photo-",
};

const FALLBACK_ASSETS = {
  // 交通與機場
  header_cover:
    "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80",
  airport_dad: "1579546929518-9e396f3cc809",
  airport_tw: "1570125909232-eb263c188f7e",
  transport: "1449965408869-eaa3f722e40d",
  bana_cable: "1523278976207-455a8665584e",

  // 住宿
  danang_hotel: "1565667728577-6c376d3d6361",
  hoian_hotel: "1582236980892-74ba2733c756",

  // 峴港景點
  dragon_bridge: "1562679044-b0cb243e3862",
  linh_ung: "1597333930263-d4d42f534064",
  danang_cathedral: "1559592413-7cec4d0cae2b",
  marble_mountain: "1597333930263-d4d42f534064",
  han_market: "1533900298318-6b8da08a523e",
  lotte_mart: "1533900298318-6b8da08a523e",

  // 巴拿山
  golden_bridge: "1559592413-7cec4d0cae2b",
  bana_buffet: "1555992336-03a23c7b20ee",
  fantasy_park: "1567620905732-2d1ec0a7da64",

  // 會安與美山
  my_son: "1559592369-f2c322e5e27d",
  hoian_old_town: "1559592369-f2c322e5e27d",
  basket_boat: "1559592369-f2c322e5e27d",
  hoian_lantern: "1535448033526-2729314bbc29",
  hoian_memories: "1514525253440-b393452e8d26",

  // 美食
  danang_food_tour: "1582878826629-29b7ad1cdc43",
  thia_go: "1504674900247-0877df9cc836",
  cong_cafe: "1514432324607-a09d9b4a5819",
  morning_glory: "1582878826629-29b7ad1cdc43",
};

export { GOOGLE_API_KEY, CONFIG, FALLBACK_ASSETS };
