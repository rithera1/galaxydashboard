<script setup>
import { ref } from 'vue'
import TopBar from './components/TopBar.vue'
import StartScreen from './components/StartScreen.vue'
import GameScreen from './components/GameScreen.vue'
import EndScreen from './components/EndScreen.vue'
import { useGameState } from './composables/useGameState.js'

const { currentScreen } = useGameState()
const confettiCanvas = ref(null)
</script>

<template>
  <!-- Confetti canvas — always rendered, sits above everything via z-index 9999 -->
  <canvas id="confettiCanvas" ref="confettiCanvas" />

  <TopBar />

  <StartScreen v-if="currentScreen === 'start'" />
  <GameScreen  v-if="currentScreen === 'game'"  />
  <EndScreen   v-if="currentScreen === 'end'"   :confettiCanvas="confettiCanvas" />
</template>
