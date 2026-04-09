import { ref, computed } from 'vue'
import { US_STATES, US_CITIES, WORLD_COUNTRIES } from '../data/locations.js'
import { haversineKm, calcScore, scoreLabel, distanceDisplay, shuffle } from '../utils/scoring.js'
import { useTimer } from './useTimer.js'

// ── Singleton game state ──────────────────────────────────────────────────────
const { startTimer, clearTimer } = useTimer()

const currentScreen = ref('start')   // 'start' | 'game' | 'end'
const gameMode      = ref(null)       // 'states' | 'cities' | 'world'
const totalRounds   = ref(5)
const currentRound  = ref(0)
const totalScore    = ref(0)
const currentStreak = ref(0)
const roundResults  = ref([])
const queue         = ref([])
const currentTarget = ref(null)
const guessLocked   = ref(false)

// Reactive result data read by GameMap and ResultOverlay
const showResult   = ref(false)
const lastResult   = ref(null)
const mapRevealData = ref(null)   // triggers the map update in GameMap

// ── Computed ──────────────────────────────────────────────────────────────────
const isLastRound = computed(() => currentRound.value >= totalRounds.value - 1)

function getDotClass(index) {
  if (index < currentRound.value) {
    const r = roundResults.value[index]
    if (!r) return ''
    if (r.pts >= 1000) return 'dot-perfect'
    if (r.pts >= 700)  return 'dot-great'
    if (r.pts >= 400)  return 'dot-ok'
    return 'dot-poor'
  }
  if (index === currentRound.value) return 'dot-current'
  return ''
}

// ── Actions ───────────────────────────────────────────────────────────────────
function selectMode(mode) {
  gameMode.value = mode
}

function setRounds(n) {
  totalRounds.value = n
}

function showStart() {
  clearTimer()
  currentScreen.value = 'start'
}

function startGame() {
  if (!gameMode.value) return

  const pool =
    gameMode.value === 'states' ? US_STATES :
    gameMode.value === 'cities' ? US_CITIES  :
    WORLD_COUNTRIES

  queue.value         = shuffle([...pool]).slice(0, totalRounds.value)
  currentRound.value  = 0
  totalScore.value    = 0
  currentStreak.value = 0
  roundResults.value  = []
  showResult.value    = false
  lastResult.value    = null
  mapRevealData.value = null

  currentScreen.value = 'game'

  // Give Vue one tick to mount GameMap before we need the map
  setTimeout(() => loadQuestion(), 0)
}

function loadQuestion() {
  if (currentRound.value >= totalRounds.value) {
    showEndScreen()
    return
  }

  currentTarget.value = queue.value[currentRound.value]
  guessLocked.value   = false
  showResult.value    = false
  lastResult.value    = null
  mapRevealData.value = { type: 'reset' }  // signal GameMap to reset view

  startTimer(() => handleTimeUp())
}

function handleMapClick(lat, lng) {
  if (guessLocked.value) return
  guessLocked.value = true
  clearTimer()
  revealAnswer(lat, lng)
}

function handleTimeUp() {
  if (guessLocked.value) return
  guessLocked.value = true
  revealAnswer(null, null)
}

function revealAnswer(guessLat, guessLng) {
  const target = currentTarget.value
  let pts = 0
  let distKm = 0
  let basePts = 0

  if (guessLat !== null) {
    distKm  = haversineKm(guessLat, guessLng, target.lat, target.lng)
    basePts = calcScore(distKm, target, gameMode.value)
    pts     = basePts
  }

  // Streak bonus applied after line-colour determination
  if (pts >= 400) {
    currentStreak.value++
    if (currentStreak.value >= 3) pts = Math.min(1000, Math.round(pts * 1.1))
  } else {
    currentStreak.value = 0
  }

  totalScore.value += pts
  roundResults.value.push({ name: target.name, pts, distKm, guessLat, guessLng })

  const sl     = scoreLabel(pts)
  const detail = guessLat === null
    ? `⏱️ Time's up! It was in ${target.region}`
    : `${distanceDisplay(distKm, gameMode.value)} · ${target.region}${currentStreak.value >= 3 ? ' 🔥 Streak bonus!' : ''}`

  lastResult.value = {
    name:       target.name,
    pts,
    detail,
    badgeLabel: `${sl.label}${pts > 0 ? ' ' + pts.toLocaleString() + ' pts' : ''}`,
    badgeCls:   sl.cls,
    isLast:     isLastRound.value,
  }

  // Tell GameMap to show markers / line
  mapRevealData.value = { guessLat, guessLng, targetLat: target.lat, targetLng: target.lng, basePts }
  showResult.value    = true
}

function nextQuestion() {
  currentRound.value++
  if (currentRound.value >= totalRounds.value) {
    showEndScreen()
  } else {
    loadQuestion()
  }
}

function showEndScreen() {
  clearTimer()
  currentScreen.value = 'end'
}

// End-screen derived data (computed lazily when needed)
function getEndData() {
  const maxPts = totalRounds.value * 1000
  const pct    = totalScore.value / maxPts

  const rankLabels = [
    { min: 0.9,  label: '🌟 World-class navigator' },
    { min: 0.75, label: '✈️ Seasoned traveler'     },
    { min: 0.5,  label: '🧭 Curious explorer'       },
    { min: 0.25, label: '🗺️ Rookie cartographer'   },
    { min: 0,    label: '📚 Keep studying!'          },
  ]

  let trophy = '🗺️', title = 'Time to Study!'
  if      (pct >= 0.9)  { trophy = '🥇'; title = 'Geography Master!' }
  else if (pct >= 0.75) { trophy = '🏆'; title = 'Great Explorer!'   }
  else if (pct >= 0.5)  { trophy = '🥈'; title = 'Getting There!'    }
  else if (pct >= 0.25) { trophy = '🥉'; title = 'Keep Exploring!'   }

  return {
    trophy,
    title,
    finalScore: totalScore.value.toLocaleString() + ' pts',
    rank:       rankLabels.find(r => pct >= r.min).label,
    showConfetti: pct >= 0.75,
    rounds:     roundResults.value.map((r, i) => {
      const sl = scoreLabel(r.pts)
      return {
        index: i + 1,
        name:  r.name,
        dist:  r.guessLat !== null ? distanceDisplay(r.distKm, gameMode.value) : "Time's up",
        pts:   r.pts.toLocaleString(),
        cls:   sl.cls,
        delay: (i * 0.07) + 's',
      }
    }),
  }
}

export function useGameState() {
  return {
    // State
    currentScreen,
    gameMode,
    totalRounds,
    currentRound,
    totalScore,
    currentStreak,
    roundResults,
    currentTarget,
    guessLocked,
    showResult,
    lastResult,
    mapRevealData,
    // Computed helpers
    isLastRound,
    getDotClass,
    // Actions
    selectMode,
    setRounds,
    showStart,
    startGame,
    nextQuestion,
    handleMapClick,
    handleTimeUp,
    getEndData,
  }
}
