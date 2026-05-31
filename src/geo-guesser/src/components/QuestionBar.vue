<script setup>
import { useGameState } from '../composables/useGameState.js'
import { useTimer } from '../composables/useTimer.js'

const { currentTarget, totalRounds, currentRound, getDotClass } = useGameState()
const { timerPct, timerClass } = useTimer()
</script>

<template>
  <div class="question-bar">
    <!-- Question text -->
    <div class="question-text">
      Where is <span>{{ currentTarget?.name ?? '…' }}</span>?
    </div>

    <!-- Progress dots -->
    <div class="progress-dots">
      <div
        v-for="i in totalRounds"
        :key="i"
        class="progress-dot"
        :class="getDotClass(i - 1)"
      />
    </div>

    <!-- Timer bar -->
    <div class="timer-bar-wrap" title="Time remaining">
      <div
        class="timer-bar-fill"
        :class="timerClass.split(' ').slice(1)"
        :style="{ width: timerPct + '%' }"
      />
    </div>
  </div>
</template>
