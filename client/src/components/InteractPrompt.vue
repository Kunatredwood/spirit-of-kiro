<script setup lang="ts">
import { useGameStore } from '../stores/game';

const props = defineProps<{
  visible: boolean;
  position?: 'top' | 'above' | 'high';  // Different vertical positions for different objects
}>();

const gameStore = useGameStore();
const tileSize = gameStore.tileSize;
</script>

<template>
  <div v-if="visible" class="interact-prompt" :class="`position-${position || 'top'}`">
    E
  </div>
</template>

<style scoped>
.interact-prompt {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  pointer-events: none;
  z-index: 1000;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* Default position - standard top */
.interact-prompt.position-top {
  top: calc(-1.1 * v-bind(tileSize) * 1px);
}

/* Above position - slightly higher */
.interact-prompt.position-above {
  top: calc(-0.3 * v-bind(tileSize) * 1px);
}

/* High position - for items */
.interact-prompt.position-high {
  top: -40px;
}
</style>
