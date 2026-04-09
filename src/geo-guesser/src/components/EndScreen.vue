<script setup>
import { computed, ref, watch } from 'vue'
import { useGameState } from '../composables/useGameState.js'

const props = defineProps({
  confettiCanvas: { type: Object, default: null },
})

const { currentScreen, startGame, showStart, getEndData } = useGameState()

// Recompute end data each time the end screen becomes active
const endData = ref(null)

watch(currentScreen, (screen) => {
  if (screen === 'end') {
    endData.value = getEndData()
    if (endData.value.showConfetti && props.confettiCanvas) {
      // Slight delay so the canvas is visible
      setTimeout(() => {
        import('../composables/useConfetti.js').then(({ launchConfetti }) => {
          launchConfetti(props.confettiCanvas)
        })
      }, 200)
    }
  }
}, { immediate: true })
</script>

<template>
  <div v-if="endData" class="end-screen">
    <div class="end-trophy">{{ endData.trophy }}</div>
    <div class="end-title">{{ endData.title }}</div>
    <div class="end-final-score">{{ endData.finalScore }}</div>
    <div class="end-rank">{{ endData.rank }}</div>

    <div class="score-breakdown">
      <div class="breakdown-header">📋 Round by Round</div>
      <div
        v-for="row in endData.rounds"
        :key="row.index"
        class="breakdown-row"
        :style="{ animationDelay: row.delay }"
      >
        <span class="breakdown-name">{{ row.index }}. {{ row.name }}</span>
        <span class="breakdown-dist">{{ row.dist }}</span>
        <span class="breakdown-pts" :class="`pts-${row.cls}`">{{ row.pts }}</span>
      </div>
    </div>

    <div class="end-actions">
      <button class="btn-primary"   @click="startGame">Play Again</button>
      <button class="btn-secondary" @click="showStart">Change Mode</button>
    </div>
  </div>
</template>
