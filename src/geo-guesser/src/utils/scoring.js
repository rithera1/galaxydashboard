/**
 * Calculate great-circle distance between two lat/lng points in kilometres.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Convert distance to a 0-1000 point score.
 * Clicks within the target's boundary radius (r km) receive a perfect 1000.
 */
export function calcScore(distKm, target, gameMode) {
  const r = target.r || 50
  const maxDist = gameMode === 'world' ? 10000 : 4000
  if (distKm <= r) return 1000
  const raw = Math.max(0, 1 - (distKm - r) / (maxDist - r))
  return Math.round(raw * raw * 999) // caps at 999 just outside boundary
}

/**
 * Return a human-readable label and CSS class for a point value.
 */
export function scoreLabel(pts) {
  if (pts >= 1000) return { label: '🎯 Perfect!', cls: 'perfect' }
  if (pts >= 700)  return { label: '⭐ Great!',   cls: 'great'   }
  if (pts >= 400)  return { label: '👍 OK',        cls: 'ok'      }
  return                  { label: '📍 Off',       cls: 'poor'    }
}

/**
 * Format a distance into a user-friendly string.
 * US modes use miles; world mode uses kilometres.
 */
export function distanceDisplay(distKm, gameMode) {
  if (distKm < 5) return 'Spot on!'
  if (gameMode === 'world') {
    if (distKm < 100) return `~${Math.round(distKm)} km away`
    return `~${Math.round(distKm / 100) * 100} km away`
  } else {
    const mi = distKm * 0.621371
    if (mi < 20) return `~${Math.round(mi)} miles away`
    return `~${Math.round(mi / 50) * 50} miles away`
  }
}

/**
 * Fisher-Yates in-place shuffle. Returns the array.
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
