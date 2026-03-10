/**
 * data.js - Data module for loading and processing data from Google Sheets
 * Handles fetching, parsing, and transforming itinerary and config data
 * Depends on: Store, CONFIG, EventBus, Papa (PapaParse)
 */

import Store from './store.js';
import { CONFIG, GOOGLE_API_KEY } from './config.js';
import EventBus from './eventbus.js';

const Data = {
  async init() {
    try {
      const fetchSheet = (sheetName) => {
        const isConfig = sheetName === "Config";
        const baseUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.GOOGLE_SHEET_ID}`;

        let url;
        if (isConfig) {
          url = `${baseUrl}/export?format=csv&sheet=${sheetName}&t=${Date.now()}`;
        } else {
          url = `${baseUrl}/gviz/tq?tqx=out:csv&sheet=${sheetName}&t=${Date.now()}`;
        }

        return new Promise((resolve, reject) => {
          Papa.parse(url, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: (res) => {
              if (res.data && res.data.length > 0) {
                resolve(res.data);
              } else {
                console.warn(`Sheet "${sheetName}" 讀取成功但內容為空`);
                resolve([]);
              }
            },
            error: (err) => reject(err),
          });
        });
      };
      const [
        configData,
        itineraryData,
        recsData,
        phrasesData,
        assetsData,
        infoData,
        ticketsData,
      ] = await Promise.all([
        fetchSheet("Config"),
        fetchSheet("Itinerary"),
        fetchSheet("Recs"),
        fetchSheet("Phrases"),
        fetchSheet("Assets"),
        fetchSheet("Info"),
        fetchSheet("Tickets"),
      ]);

      if (configData && configData.length > 1) {
        configData.slice(1).forEach((row) => {
          if (row[0])
            Store.config[row[0].trim()] = row[1]
              ? row[1].trim().replace(/^["']|["']$/g, "")
              : "";
        });
      }
      this.applyConfig();

      assetsData.slice(1).forEach((row) => {
        if (row[0])
          Store.assets[row[0].trim()] = row[1] ? row[1].trim() : "";
      });

      // [v2.11] Recs 欄位：Key(0) Category(1) Name(2) Subtitle(3) Icon(4) Items(5) Address(6) ImageKey(7)
      recsData.slice(1).forEach((row) => {
        if (row[0]) {
          const key = row[0].trim();
          Store.recommendations[key] = {
            category: row[1] ? row[1].trim().toLowerCase() : "food",
            name: row[2] ? row[2].trim() : "未命名",
            subtitle: row[3] ? row[3].trim() : "",
            icon: row[4] ? row[4].trim() : "",
            items: row[5] ? row[5].split(",").map(t => t.trim()) : [],
            address: row[6] ? row[6].trim() : "",
            imageKey: (row[7] && row[7].trim()) ? row[7].trim() : key,
          };
        }
      });

      // [v2.11] Tickets 欄位：RecKey(0) MemberName(1) TicketID(2) Note(3)
      Store.tickets = {};
      ticketsData.slice(1).forEach((row) => {
        if (row[0] && row[2]) {
          const recKey = row[0].trim();
          if (!Store.tickets[recKey]) Store.tickets[recKey] = [];
          Store.tickets[recKey].push({
            name: row[1] ? row[1].trim() : "",
            ticketId: row[2].trim(),
          });
        }
      });

      Store.phrases = phrasesData.slice(1).map((row) => ({
        icon: row[0],
        zh: row[1],
        target: row[2],
        pron: row[3],
      }));

      const itineraryStructured = itineraryData.slice(1).map((row) => ({
        Day: row[0],
        Time: row[1],
        Title: row[2],
        Subtitle: row[3],
        Desc: row[4],
        Tag: row[5],
        ImageKey: row[6],
        Position: row[7],
        WeatherLoc: row[8],
        ShowCard: row[9],
        Lat: row[10] ? parseFloat(row[10].trim()) : null,
        Lon: row[11] ? parseFloat(row[11].trim()) : null,
      }));
      this.transformItinerary(itineraryStructured);

      if (infoData && infoData.length > 1) {
        Store.info = infoData.slice(1).map((row) => ({
          icon: row[0],
          title: row[1],
          content: row[2],
          type: row[3] ? row[3].trim() : "normal",
        }));
      }

      EventBus.emit("DATA:READY");
      document.getElementById("loading-screen").classList.add("hidden");
    } catch (e) {
      console.error(e);
      alert("讀取失敗，請檢查網路。");
      document.getElementById("loading-screen").classList.add("hidden");
    }
  },
  applyConfig() {
    const { appTitle, appSubtitle, primaryColor, accentColor } =
      Store.config;

    document.title = appTitle || "行程載入中...";
    document.getElementById("app-title").innerText =
      appTitle || "行程載入中...";
    document.getElementById("app-subtitle").innerText =
      appSubtitle || "LOADING...";

    if (primaryColor) {
      document.documentElement.style.setProperty("--primary", primaryColor);
      document.documentElement.style.setProperty(
        "--primary-dark",
        primaryColor
      );
    }

    const btnColor = accentColor || primaryColor;
    if (btnColor) {
      document.documentElement.style.setProperty("--accent", btnColor);

      document.documentElement.style.setProperty(
        "--grad-fab",
        `linear-gradient(135deg, ${btnColor} 0%, ${btnColor} 100%)`
      );
    }
  },
  transformItinerary(rawData) {
    const days = {};
    let startStr =
      Store.config.startDate || new Date().toISOString().split("T")[0];
    const start = new Date(startStr);
    rawData.forEach((row) => {
      if (!row.Day) return;
      const dNum = row.Day.trim();
      if (!days[dNum]) days[dNum] = [];
      days[dNum].push({
        time: row.Time,
        title: row.Title,
        subtitle: row.Subtitle,
        desc: row.Desc,
        tag: row.Tag,
        img: row.ImageKey ? row.ImageKey.trim() : "",
        pos: row.Position ? row.Position.trim() : "",
        wLoc: row.WeatherLoc ? row.WeatherLoc.trim() : "",
        showW: row.ShowCard ? row.ShowCard.trim() : "",
        lat: row.Lat,
        lon: row.Lon,
        details: [],
      });
    });
    const weekDays = [
      "週日",
      "週一",
      "週二",
      "週三",
      "週四",
      "週五",
      "週六",
    ];

    Store.itinerary = Object.keys(days)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((dNum) => {
        const offset = parseInt(dNum) - 1;
        const current = new Date(start);
        current.setDate(start.getDate() + offset);
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        return {
          id: parseInt(dNum),
          date: current.getMonth() + 1 + "/" + current.getDate(),
          fullDate: `${y}-${m}-${d}`,
          dayName: weekDays[current.getDay()] + ` (Day ${dNum})`,
          events: days[dNum],
        };
      });
  },
};

export default Data;
