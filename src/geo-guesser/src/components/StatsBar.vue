<script setup>
import { useGameState } from '../composables/useGameState.js'

const { totalScore, currentRound, totalRounds, currentStreak } = useGameState()
</script>

<template>
  <div class="stats-bar">
    <div class="stat-chip score-chip">⭐ {{ totalScore.toLocaleString() }}</div>
    <div class="stat-chip round-chip">Round {{ currentRound + 1 }} / {{ totalRounds }}</div>
    <div class="stat-chip streak-chip">🔥 {{ currentStreak }}</div>
  </div>
</template>
