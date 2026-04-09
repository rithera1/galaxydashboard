import { ref, computed } from 'vue'

const MAX_SECONDS = 20

// Module-level singleton state so all components share the same timer
const timerSeconds = ref(MAX_SECONDS)
let timerInterval = null

export function useTimer() {
  const timerPct = computed(() => (timerSeconds.value / MAX_SECONDS) * 100)

  const timerClass = computed(() => {
    const pct = timerPct.value
    if (pct < 33) return 'timer-bar-fill danger'
    if (pct < 60) return 'timer-bar-fill warn'
    return 'timer-bar-fill'
  })

  function startTimer(onExpire) {
    clearTimer()
    timerSeconds.value = MAX_SECONDS

    timerInterval = setInterval(() => {
      timerSeconds.value--
      if (timerSeconds.value <= 0) {
        clearTimer()
        onExpire()
      }
    }, 1000)
  }

  function clearTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  return { timerSeconds, timerPct, timerClass, startTimer, clearTimer }
}
