<script setup lang="ts">
import garbageImage from '../assets/garbage.png';
import { useGameStore } from '../stores/game';
import { toRef } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayerInteraction } from '../composables/usePlayerInteraction';
import InteractPrompt from './InteractPrompt.vue';

const props = defineProps<{
  row: number;
  col: number;
  tileSize: number;
  width: number;
  depth: number;
  height: number;
  playerIsNear: boolean;
}>();

const gameStore = useGameStore();
const { heldItemId } = storeToRefs(gameStore);

// Handle player interaction using composable
usePlayerInteraction(
  toRef(props, 'playerIsNear'),
  () => {
    if (!heldItemId.value) {
      // Nothing held
      return;
    }

    // Emit intent-to-discard-item event with the held item ID
    gameStore.emitEvent('intent-to-discard-item', {
      id: heldItemId.value
    });
  }
);
</script>

<template>
  <div :style="{
    position: 'absolute',
    top: `${row * tileSize}px`,
    left: `${col * tileSize}px`,
    width: `${width * tileSize}px`,
    height: `${depth * tileSize}px`,
    border: gameStore.debug ? '1px solid red': 'none'
  }">
    <InteractPrompt :visible="playerIsNear" position="above" />
    <img 
      :src="garbageImage" 
      :width="width * tileSize" 
      :style="{
        position: 'absolute',
        top: `-${tileSize * 1}px`
      }"
      :class="['garbage', { 'garbage-active': playerIsNear }]"
      alt="Garbage"
    />
    <!-- Height visualization line (only visible in debug mode) -->
    <div v-if="gameStore.debug" class="height-line" :style="{
      position: 'absolute',
      left: '0',
      bottom: '0',
      width: '2px',
      height: `${height * tileSize}px`,
      backgroundColor: 'blue',
      zIndex: 1000
    }" />
  </div>
</template>

<style scoped>
.garbage {
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5));
  object-fit: contain;
  transition: filter 0.3s ease;
}

.garbage-active {
  filter: drop-shadow(0 0 15px white);
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style>