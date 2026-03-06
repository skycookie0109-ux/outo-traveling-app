/**
 * Map Module
 * Handles map initialization, markers, route planning, and location tracking
 * Exports: MapModule (default), Location
 */

import EventBus from './eventbus.js';
import Store from './store.js';
import Templates from './templates.js';

const MapModule = {
  instance: null,
  directionsService: null,
  directionsRenderer: null,
  customMarkers: [],
  activeDayId: 1,
  checkedItems: {},
  transportMode: "driving",
  OverlayClass: null,
  infoWindow: null,

  init() {
    EventBus.on("APP:DAY_CHANGED", (id) => this.switchDay(id));
  },

  initMap() {
    if (this.instance) return;

    if (!window.google || !window.google.maps) {
      setTimeout(() => this.initMap(), 500);
      return;
    }

    const defaultLat = parseFloat(Store.config.mapCenterLat) || 16.0544;
    const defaultLon = parseFloat(Store.config.mapCenterLon) || 108.2022;

    const mapOptions = {
      center: { lat: defaultLat, lng: defaultLon },
      zoom: 13,
      disableDefaultUI: true,
      clickableIcons: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP,
      },
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    };

    this.instance = new google.maps.Map(
      document.getElementById("map"),
      mapOptions
    );
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.instance,
      suppressMarkers: true,
      preserveViewport: false,
      polylineOptions: {
        strokeColor: "#00acc1",
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });

    this.infoWindow = new google.maps.InfoWindow();

    this.instance.addListener("click", () => {
      document.getElementById("map-drawer").classList.add("collapsed");
      if (this.infoWindow) {
        this.infoWindow.close();
      }
    });

    this.OverlayClass = class extends google.maps.OverlayView {
      constructor(position, idx, map, onClick) {
        super();
        this.position = position;
        this.idx = idx;
        this.onClick = onClick;
        this.div = null;
        this.setMap(map);
      }
      onAdd() {
        this.div = document.createElement("div");
        this.div.className = "gmap-custom-marker-container";
        this.div.innerHTML = `<div class="gmap-marker-bubble">${
          this.idx + 1
        }</div>`;
        this.div.addEventListener("click", (e) => {
          e.stopPropagation();
          this.onClick();
        });
        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const pos = projection.fromLatLngToDivPixel(this.position);
        if (this.div) {
          this.div.style.left = pos.x - 14 + "px";
          this.div.style.top = pos.y - 14 + "px";
        }
      }
      onRemove() {
        if (this.div) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }
    };
  },

  open() {
    App.Utils.closeAll();
    document.getElementById("map-layer").classList.add("active");

    if (window.innerWidth >= 1024) {
      document.body.classList.add("map-active");
    }

    setTimeout(() => {
      this.initMap();
    }, 100);

    this.activeDayId = Store.activeDayId;
    this.checkedItems = {};

    this.renderDayTabs();

    setTimeout(() => {
      this.renderDrawer(this.activeDayId);
      document.getElementById("map-drawer").classList.remove("collapsed");
    }, 300);
  },

  close() {
    document.getElementById("map-layer").classList.remove("active");
    document.body.classList.remove("map-active");
  },

  toggleDrawer() {
    const drawer = document.getElementById("map-drawer");
    drawer.classList.toggle("collapsed");
  },

  setMode(mode) {
    if (mode === "transit") {
      this.openGoogleMapsTransit();
      return;
    }
    this.transportMode = mode;

    document
      .querySelectorAll(".mode-btn")
      .forEach((b) => b.classList.remove("active", "walk"));
    const btn = document.getElementById(
      mode === "driving" ? "btn-mode-driving" : "btn-mode-walking"
    );
    btn.classList.add("active");
    if (mode === "walking") btn.classList.add("walk");

    this.updateMarkers(this.activeDayId);
  },

  openGoogleMapsTransit() {
    const day = Store.itinerary.find((d) => d.id === this.activeDayId);
    if (!day) return;

    const activeIndices = Object.keys(this.checkedItems)
      .filter(
        (k) => k.startsWith(`${this.activeDayId}_`) && this.checkedItems[k]
      )
      .map((k) => parseInt(k.split("_")[1]))
      .sort((a, b) => a - b);

    if (activeIndices.length < 2) {
      alert("請至少勾選兩個景點以規劃路線");
      return;
    }

    const startEvent = day.events[activeIndices[0]];
    const endEvent = day.events[activeIndices[activeIndices.length - 1]];

    const origin = startEvent.lat + "," + startEvent.lon;
    const dest = endEvent.lat + "," + endEvent.lon;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=transit`;
    window.open(url, "_blank");
  },

  renderDayTabs() {
    document.getElementById("map-day-tabs").innerHTML = Store.itinerary
      .map(
        (d) =>
          `<div class="map-day-tab ${
            d.id === this.activeDayId ? "active" : ""
          }" onclick="event.stopPropagation(); App.Map.switchDay(${
            d.id
          })">${d.dayName}</div>`
      )
      .join("");
  },

  switchDay(dayId) {
    this.activeDayId = dayId;
    this.checkedItems = {};

    if (document.getElementById("map-layer").classList.contains("active")) {
      this.renderDayTabs();
      this.renderDrawer(dayId);
      const drawer = document.getElementById("map-drawer");
      drawer.classList.remove("collapsed");
    }
  },

  toggleAll() {
    const dayId = this.activeDayId;
    const day = Store.itinerary.find((d) => d.id === dayId);
    if (!day) return;

    let allChecked = true;
    for (let i = 0; i < day.events.length; i++) {
      const e = day.events[i];
      if (e.lat && e.lon && !this.checkedItems[`${dayId}_${i}`]) {
        allChecked = false;
        break;
      }
    }

    const newState = !allChecked;
    day.events.forEach((e, i) => {
      if (e.lat && e.lon) {
        this.checkedItems[`${dayId}_${i}`] = newState;
      }
    });

    this.renderDrawer(dayId);
  },

  toggleCheck(dayId, idx) {
    const key = `${dayId}_${idx}`;
    this.checkedItems[key] = !this.checkedItems[key];
    this.renderDrawer(dayId);
  },

  renderDrawer(dayId) {
    const day = Store.itinerary.find((d) => d.id === dayId);
    const list = document.getElementById("drawer-list-content");

    document.getElementById("drawer-day-title").innerHTML = `行程列表`;

    if (!day) return;

    list.innerHTML = day.events
      .map((e, i) =>
        Templates.drawerItem(
          e,
          i,
          dayId,
          this.checkedItems[`${dayId}_${i}`]
        )
      )
      .join("");

    this.updateMarkers(dayId);
  },

  clearDrawerLegInfo(dayId) {
    const day = Store.itinerary.find((d) => d.id === dayId);
    if (!day) return;
    day.events.forEach((_, i) => {
      const el = document.getElementById(`leg-info-${dayId}-${i}`);
      if (el) {
        el.innerHTML = "";
        el.classList.remove("visible", "mode-walk", "mode-drive");
      }
    });
  },

  async updateMarkers(dayId) {
    if (!this.instance || !this.OverlayClass) return;

    this.customMarkers.forEach((m) => m.setMap(null));
    this.customMarkers = [];
    this.directionsRenderer.setMap(null);
    this.clearDrawerLegInfo(dayId);

    document.getElementById("drawer-day-title").innerHTML = `行程列表`;
    const pill = document.getElementById("collapsed-route-info");
    pill.classList.remove("visible");

    const day = Store.itinerary.find((d) => d.id === dayId);

    const selectedPoints = [];
    day.events.forEach((e, i) => {
      if (this.checkedItems[`${dayId}_${i}`] && e.lat && e.lon) {
        selectedPoints.push({ ...e, idx: i });
      }
    });

    if (selectedPoints.length === 0) return;

    let legDurations = [];

    if (selectedPoints.length >= 2) {
      this.directionsRenderer.setMap(this.instance);
      const origin = {
        lat: selectedPoints[0].lat,
        lng: selectedPoints[0].lon,
      };
      const destination = {
        lat: selectedPoints[selectedPoints.length - 1].lat,
        lng: selectedPoints[selectedPoints.length - 1].lon,
      };
      const waypoints = selectedPoints.slice(1, -1).map((p) => ({
        location: { lat: p.lat, lng: p.lon },
        stopover: true,
      }));

      const mode =
        this.transportMode === "walking"
          ? google.maps.TravelMode.WALKING
          : google.maps.TravelMode.DRIVING;

      try {
        const result = await new Promise((resolve, reject) => {
          this.directionsService.route(
            {
              origin: origin,
              destination: destination,
              waypoints: waypoints,
              travelMode: mode,
            },
            (res, status) => {
              if (status === "OK") resolve(res);
              else reject(status);
            }
          );
        });

        this.directionsRenderer.setDirections(result);

        const isWalk = this.transportMode === "walking";
        const routeColor = isWalk ? "#ff9800" : "#00acc1";

        this.directionsRenderer.setOptions({
          polylineOptions: {
            strokeColor: routeColor,
            strokeWeight: 6,
            strokeOpacity: 0.7,
          },
        });

        const iconClass = isWalk ? "fa-person-walking" : "fa-car";
        const modeClass = isWalk ? "mode-walk" : "mode-drive";
        const routeLegs = result.routes[0].legs;

        let totalDurationSec = 0;
        let totalDistMeters = 0;

        routeLegs.forEach((leg, i) => {
          totalDurationSec += leg.duration.value;
          totalDistMeters += leg.distance.value;
          const startPointIdx = selectedPoints[i].idx;
          const infoEl = document.getElementById(
            `leg-info-${dayId}-${startPointIdx}`
          );

          if (infoEl) {
            infoEl.innerHTML = `
                    <div class="drawer-leg-chip">
                        <i class="fa-solid ${iconClass}"></i>
                        <span>${leg.duration.text}</span>
                        <span style="color:#aaa; font-weight:normal;">(${leg.distance.text})</span>
                    </div>`;
            infoEl.classList.add("visible", modeClass);
          }
          legDurations[i + 1] = leg.duration.text;
        });

        const totalMins = Math.round(totalDurationSec / 60);
        const totalKm = (totalDistMeters / 1000).toFixed(1);
        let displayTime =
          totalMins > 60
            ? `${Math.floor(totalMins / 60)}小時 ${totalMins % 60}分`
            : `${totalMins}分鐘`;

        document.getElementById("drawer-day-title").innerHTML = `
                <span style="font-size:0.9rem;">${selectedPoints.length} 站 •
                <span style="color:${isWalk ? "#e65100" : "#00838f"}">
                    <i class="fa-solid ${iconClass}"></i> ${displayTime}
                </span>
                <span style="color:#999; font-size:0.75rem;">(${totalKm} km)</span></span>`;

        pill.innerHTML = `
                <i class="fa-solid ${iconClass}" style="color:${
          isWalk ? "#ff9800" : "#00acc1"
        }"></i>
                <span>${displayTime}</span>
                <span class="pill-sub">(${totalKm} km)</span>`;
        pill.classList.add("visible");
      } catch (err) {
        console.error("Directions Error:", err);
      }
    } else {
      this.instance.panTo({
        lat: selectedPoints[0].lat,
        lng: selectedPoints[0].lon,
      });
    }

    selectedPoints.forEach((pt, arrayIdx) => {
      const position = new google.maps.LatLng(pt.lat, pt.lon);
      const marker = new this.OverlayClass(
        position,
        pt.idx,
        this.instance,
        () => {
          const imgUrl = App.Image.getImgUrl(pt.img);
          let timeHtml = "";
          if (arrayIdx > 0 && legDurations[arrayIdx]) {
            const icon =
              this.transportMode === "walking"
                ? "fa-person-walking"
                : "fa-car";
            timeHtml = `<div class="mp-time-info"><i class="fa-solid ${icon}"></i> 距上一站：${legDurations[arrayIdx]}</div>`;
          } else if (arrayIdx === 0 && selectedPoints.length > 1) {
            timeHtml = `<div class="mp-time-info" style="background:#e3f2fd; color:#1976d2;">🚩 行程起點</div>`;
          }

          const content = `
                    <div class="map-popup-card">
                        <div class="mp-header-img" style="background-image: url('${imgUrl}');"></div>
                        <div class="mp-content">
                             <div class="mp-meta">
                                <span><i class="fa-regular fa-clock"></i> ${pt.time}</span>
                                <span class="mp-tag-pill">${pt.tag}</span>
                             </div>
                             <div class="mp-title">${pt.title}</div>
                             ${timeHtml}
                             <button class="mp-gmap-btn" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lon}', '_blank')">
                                <i class="fa-brands fa-google"></i> Google 導航
                             </button>
                        </div>
                    </div>`;

          if (this.infoWindow) {
            this.infoWindow.setContent(content);
            this.infoWindow.setPosition(position);
            this.infoWindow.open(this.instance);
            this.infoWindow.setOptions({
              pixelOffset: new google.maps.Size(0, -15),
            });
          }
        }
      );
      this.customMarkers.push(marker);
    });
  },

  zoomTo(dayId, idx) {
    const day = Store.itinerary.find((d) => d.id === dayId);
    if (!day) return;
    const e = day.events[idx];
    if (e.lat && e.lon) {
      if (!this.checkedItems[`${dayId}_${idx}`]) {
        this.checkedItems[`${dayId}_${idx}`] = true;
        this.renderDrawer(dayId);
      } else {
        if (this.instance) {
          this.instance.panTo({ lat: e.lat, lng: e.lon });
          this.instance.setZoom(16);
        }
      }
    } else {
      alert("此景點無座標資料");
    }
  },
};

const Location = {
  watchId: null,
  userMarker: null,
  isActive: false,
  currentHeading: 0,

  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start();
    }
  },

  async start() {
    const btn = document.getElementById("btn-locate");
    if ("geolocation" in navigator) {
      this.isActive = true;
      btn.classList.add("active");

      App.Utils.speak("正在定位中");

      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.updatePosition(pos),
        (err) => {
          console.error(err);
          alert(
            "無法取得位置，請確認手機 GPS 已開啟，並允許網頁存取位置。"
          );
          this.stop();
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    } else {
      alert("您的瀏覽器不支援定位功能");
    }
  },

  stop() {
    this.isActive = false;
    document.getElementById("btn-locate").classList.remove("active");

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.userMarker) {
      this.userMarker.setMap(null);
      this.userMarker = null;
    }
  },

  updatePosition(pos) {
    const { latitude, longitude } = pos.coords;
    const map = App.Map.instance;

    if (!map) return;

    const latLng = new google.maps.LatLng(latitude, longitude);

    if (!this.userMarker) {
      this.userMarker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#4285f4",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
        zIndex: 999,
      });
      map.panTo(latLng);
      map.setZoom(16);
      App.Utils.speak("定位成功");
    } else {
      this.userMarker.setPosition(latLng);
    }
  },
};

export { MapModule as default, Location };
