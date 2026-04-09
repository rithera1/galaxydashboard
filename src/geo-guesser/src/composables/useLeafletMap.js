import * as L from 'leaflet'

// Module-level singleton — one map instance for the whole app
let leafletMap    = null
let guessMarker   = null
let answerMarker  = null
let distancePoly  = null

function makePinGuess() {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="40" viewBox="0 0 30 40" style="display:block">
      <path d="M15 0 C7 0 1 6 1 14 C1 24 15 40 15 40 C15 40 29 24 29 14 C29 6 23 0 15 0Z"
            fill="#e8453c" stroke="#3b2f1e" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="white"/>
    </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  })
}

function makePinAnswer() {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="40" viewBox="0 0 30 40" style="display:block">
      <path d="M15 0 C7 0 1 6 1 14 C1 24 15 40 15 40 C15 40 29 24 29 14 C29 6 23 0 15 0Z"
            fill="#5cbb6f" stroke="#3b2f1e" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="white"/>
    </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  })
}

export function useLeafletMap() {
  /**
   * Initialise (or re-initialise) the Leaflet map.
   * @param {string} containerId  The id of the div to mount the map into.
   * @param {(lat: number, lng: number) => void} onMapClick  Called when the user clicks the map.
   */
  function initMap(containerId, onMapClick) {
    if (leafletMap) {
      leafletMap.remove()
      leafletMap   = null
      guessMarker  = null
      answerMarker = null
      distancePoly = null
    }

    leafletMap = L.map(containerId, {
      zoomControl:        true,
      attributionControl: true,
      minZoom:            2,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains:  'abcd',
        maxZoom:     19,
      },
    ).addTo(leafletMap)

    leafletMap.on('click', (e) => onMapClick(e.latlng.lat, e.latlng.lng))
  }

  /** Pan/zoom to the default view for the current game mode. */
  function setMapView(gameMode) {
    if (!leafletMap) return
    if (gameMode === 'world') {
      leafletMap.setView([20, 10], 2)
    } else {
      leafletMap.fitBounds([[24, -125], [50, -66]])
    }
  }

  /** Remove all markers and the distance line from the map. */
  function clearMarkersAndLine() {
    if (guessMarker)  { leafletMap.removeLayer(guessMarker);  guessMarker  = null }
    if (answerMarker) { leafletMap.removeLayer(answerMarker); answerMarker = null }
    if (distancePoly) { leafletMap.removeLayer(distancePoly); distancePoly = null }
  }

  /**
   * Place the player's guess marker, answer marker, and distance line;
   * then fit the map to show both points.
   *
   * @param {{ guessLat: number|null, guessLng: number|null,
   *           targetLat: number, targetLng: number, basePts: number }} data
   */
  function revealOnMap({ guessLat, guessLng, targetLat, targetLng, basePts }) {
    if (!leafletMap) return

    clearMarkersAndLine()

    // Always place the answer marker
    answerMarker = L.marker([targetLat, targetLng], { icon: makePinAnswer() }).addTo(leafletMap)

    if (guessLat !== null) {
      guessMarker = L.marker([guessLat, guessLng], { icon: makePinGuess() }).addTo(leafletMap)

      const lineColor = basePts >= 700 ? '#5cbb6f' : '#e8453c'
      distancePoly = L.polyline(
        [[guessLat, guessLng], [targetLat, targetLng]],
        { color: lineColor, weight: 2.5, dashArray: '8, 6', opacity: 0.9 },
      ).addTo(leafletMap)

      const bounds = L.latLngBounds([[guessLat, guessLng], [targetLat, targetLng]])
      leafletMap.fitBounds(bounds, { padding: [70, 70], maxZoom: 8 })
    } else {
      // Time's up — just pan to the correct location
      leafletMap.setView([targetLat, targetLng], 4)
    }
  }

  /** Destroy the map (call when the game screen unmounts). */
  function destroyMap() {
    if (leafletMap) {
      leafletMap.remove()
      leafletMap   = null
      guessMarker  = null
      answerMarker = null
      distancePoly = null
    }
  }

  return { initMap, setMapView, clearMarkersAndLine, revealOnMap, destroyMap }
}
