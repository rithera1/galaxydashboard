<script setup>
import { useGameState } from '../composables/useGameState.js'

const { showResult, lastResult, nextQuestion } = useGameState()

function onNext(event) {
  event.stopPropagation()
  nextQuestion()
}
</script>

<template>
  <div class="result-overlay" :class="{ show: showResult }">
    <div class="result-info">
      <div class="result-name">{{ lastResult?.name }}</div>
      <div class="result-detail">{{ lastResult?.detail }}</div>
    </div>

    <div
      class="result-score-badge"
      :class="lastResult?.badgeCls"
    >
      {{ lastResult?.badgeLabel }}
    </div>

    <button class="next-btn" @click="onNext">
      {{ lastResult?.isLast ? 'See Results!' : 'Next →' }}
    </button>
  </div>
</template>
