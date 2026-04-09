<script setup>
import { useGameState } from '../composables/useGameState.js'

const { gameMode, totalRounds, selectMode, setRounds, startGame } = useGameState()

const MODES = [
  { key: 'states', cls: 'm-states', emoji: '🗺️', label: 'US States',  desc: '50 states on the US map'   },
  { key: 'cities', cls: 'm-cities', emoji: '🏙️', label: 'US Cities',  desc: 'Major American cities'     },
  { key: 'world',  cls: 'm-world',  emoji: '🌐', label: 'Countries',   desc: 'Nations of the world'      },
]

const ROUND_OPTIONS = [5, 10, 15]

const LABELS = { states: 'US States', cities: 'US Cities', world: 'Countries' }

function startBtnLabel() {
  return gameMode.value
    ? `Start ${LABELS[gameMode.value]}! 🚀`
    : 'Choose a mode to start!'
}
</script>

<template>
  <div class="start-screen">
    <div class="start-globe">🌍</div>
    <h1 class="start-title">Geo <span>Guesser</span></h1>
    <p class="start-sub">Click the map to place where you think it is!</p>

    <!-- Mode selection -->
    <div class="mode-grid">
      <div
        v-for="mode in MODES"
        :key="mode.key"
        class="mode-card"
        :class="[mode.cls, { selected: gameMode === mode.key }]"
        @click="selectMode(mode.key)"
      >
        <div class="mode-emoji">{{ mode.emoji }}</div>
        <div class="mode-label">{{ mode.label }}</div>
        <div class="mode-desc">{{ mode.desc }}</div>
      </div>
    </div>

    <!-- Rounds selector -->
    <div class="diff-row">
      <span class="diff-label">Rounds:</span>
      <button
        v-for="n in ROUND_OPTIONS"
        :key="n"
        class="diff-btn"
        :class="{ active: totalRounds === n }"
        @click="setRounds(n)"
      >
        {{ n }}
      </button>
    </div>

    <button
      class="start-btn"
      :disabled="!gameMode"
      @click="startGame"
    >
      {{ startBtnLabel() }}
    </button>
  </div>
</template>
