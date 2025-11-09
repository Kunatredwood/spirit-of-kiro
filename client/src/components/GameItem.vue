<script setup lang="ts">
import { type PhysicsProperties } from '../utils/physics';
import { computed, toRef } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import { usePlayerInteraction } from '../composables/usePlayerInteraction';
import InteractPrompt from './InteractPrompt.vue';

const store = useGameStore();

interface Props {
  id: string;
  row: number;
  col: number;
  tileSize: number;
  width: number;
  height: number;
  depth: number;
  playerIsNear: boolean;
  physics?: PhysicsProperties;
  props: {
    itemId: string; // Now we only pass the itemId
    pickedUp: boolean; // Whether the item has been picked up before
  };
}

const props = defineProps<Props>();

// Get the item details using useItem
const item = computed(() => store.useItem(props.props.itemId).value);

// No dialog state needed anymore

// Use the item's imageUrl if available, otherwise use generic.png
const icon = computed(() => item.value?.imageUrl || '/src/assets/generic.png');

// Use the shared utility function for rarity class
const rarityClass = computed(() => {
  if (!item.value || item.value.value === undefined) return getRarityClass();
  return getRarityClass(item.value.value);
});

// Calculate shadow opacity based on item height
const shadowOpacity = computed(() => {
  const height = props.physics?.height || 0;
  // Linear decrease from 0.3 to 0 as height increases from 0 to 4
  return Math.max(0, 0.3 * (1 - height / 4));
});

// Handle player interaction using composable
usePlayerInteraction(
  toRef(props, 'playerIsNear'),
  () => {
    // If the item hasn't been picked up yet, emit inspect-item event
    if (!props.props.pickedUp) {
      store.emitEvent('inspect-item', {
        id: props.props.itemId
      });
    }

    // Remove the item from the game world so it no longer renders
    // but we will keep it inside of the item list, so that the
    // player can pick it up.
    store.removeObject(props.id);

    // Emit item pickup events. The PlayerCharacter component subscribes
    // to this event.
    store.emitEvent('item-pickup', {
      id: props.props.itemId
    });
  },
  {
    additionalCondition: () => !!item.value // Only interact if item exists
  }
);
</script>

<template>
  <div 
    class="game-item"
    :style="{
      position: 'absolute',
      top: `${row * tileSize - ((physics?.height || 0) * tileSize)}px`,
      left: `${col * tileSize}px`,
      width: `${tileSize * width}px`,
      height: `${tileSize * depth}px`,
      transform: `scale(${1 + ((physics?.height || 0) * .1)})`,
      transition: 'transform 0.1s ease-out',
      border: store.debug ? '1px solid red': 'none'
    }"
  >
    <!-- Ground tile outline (always visible in debug mode) -->
    <div v-if="store.debug" 
         :style="{
           position: 'absolute',
           top: `${(physics?.height || 0) * tileSize}px`,
           left: '0',
           width: `${tileSize * width}px`,
           height: `${tileSize * depth}px`,
           border: '1px solid red',
           zIndex: 999
         }">
    </div>
    <!-- Debug information display -->
    <div v-if="store.debug && physics" 
         class="debug-info"
         :style="{
           position: 'absolute',
           top: '-30px',
           left: '0',
           color: 'white',
           backgroundColor: 'rgba(0, 0, 0, 0.7)',
           padding: '2px 4px',
           fontSize: '10px',
           zIndex: 1000,
           display: 'flex',
           gap: '4px'
         }">
      <span>H:{{ physics.height.toFixed(1) }}</span>
      <span>V:{{ physics.velocity.toFixed(1) }}</span>
      <span>VV:{{ physics.verticalVelocity?.toFixed(1) || '0.0' }}</span>
    </div>
    <div v-if="store.debug && physics?.active" 
         class="debug-vector"
         :style="{
           transform: `rotate(${physics.angle}deg)`,
           width: `${physics.velocity * tileSize}px`
         }">
    </div>
    <!-- Height visualization line (only visible in debug mode) -->
    <div v-if="store.debug" 
         class="height-line"
         :style="{
           position: 'absolute',
           left: '0',
           bottom: '0',
           width: '2px',
           height: `${height * tileSize}px`,
           backgroundColor: 'blue',
           zIndex: 1000
         }">
    </div>
    <!-- Drop shadow under item at ground level -->
    <div
      class="item-shadow"
      :style="{
        position: 'absolute',
        bottom: `-${(physics?.height || 0) * tileSize + (tileSize * 0.2)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${tileSize * width * 0.7}px`,
        height: `${tileSize * depth * 0.2}px`,
        backgroundColor: `rgba(0, 0, 0, ${shadowOpacity})`,
        borderRadius: '50%',
        filter: 'blur(3px)',
        zIndex: -1
      }"
    ></div>
    <div class="item-container" :class="[{ 'item-near': playerIsNear }, rarityClass]">
      <InteractPrompt :visible="playerIsNear" position="high" />
      <img :src="icon" alt="Item" class="item-image" />
    </div>
    <!--<div class="item-name" :class="getRarityClass">{{ item?.name || 'Unknown Item' }}</div>-->
  </div>
  

</template>

<style scoped>
.game-item {
  pointer-events: none;
}

.item-near .item-image {
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.debug-vector {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 2px;
  background-color: orange;
  transform-origin: left center;
  z-index: 1000;
}

.ground-tile-outline {
  pointer-events: none;
  box-sizing: border-box;
  background-color: rgba(255, 0, 0, 0.1);
}
</style>