<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import ResultOverlay from './ResultOverlay.vue'
import { useGameState } from '../composables/useGameState.js'
import { useLeafletMap } from '../composables/useLeafletMap.js'

const { gameMode, guessLocked, mapRevealData, handleMapClick } = useGameState()
const { initMap, setMapView, clearMarkersAndLine, revealOnMap, destroyMap } = useLeafletMap()

onMounted(() => {
  initMap('mapContainer', (lat, lng) => {
    if (!guessLocked.value) {
      handleMapClick(lat, lng)
    }
  })
  setMapView(gameMode.value)
})

onBeforeUnmount(() => {
  destroyMap()
})

// React to map commands issued by the game state
watch(mapRevealData, (cmd) => {
  if (!cmd) return

  if (cmd.type === 'reset') {
    clearMarkersAndLine()
    setMapView(gameMode.value)
    return
  }

  // cmd has { guessLat, guessLng, targetLat, targetLng, basePts }
  revealOnMap(cmd)
})
</script>

<template>
  <div class="map-wrap">
    <div id="mapContainer" />
    <ResultOverlay />
  </div>
</template>
