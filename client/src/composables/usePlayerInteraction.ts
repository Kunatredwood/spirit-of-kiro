import { onMounted, onUnmounted, type Ref, toValue } from 'vue';
import { useGameStore } from '../stores/game';

/**
 * Composable for handling player interaction events
 * Automatically registers and cleans up event listeners
 * 
 * @param playerIsNear - Ref or boolean indicating if player is near the object
 * @param callback - Function to call when player interacts (presses E)
 * @param options - Optional configuration
 * @returns Object with utility functions if needed
 */
export function usePlayerInteraction(
  playerIsNear: Ref<boolean> | boolean,
  callback: () => void,
  options?: {
    additionalCondition?: () => boolean; // Additional condition to check before calling callback
  }
) {
  const gameStore = useGameStore();
  let interactionListenerId: string | null = null;

  const handleInteraction = () => {
    // Check if player is near (supports both Ref and boolean)
    const isNear = toValue(playerIsNear);
    if (!isNear) {
      return;
    }

    // Check additional condition if provided
    if (options?.additionalCondition && !options.additionalCondition()) {
      return;
    }

    // Call the callback
    callback();
  };

  onMounted(() => {
    interactionListenerId = gameStore.addEventListener('player-interaction', handleInteraction);
  });

  onUnmounted(() => {
    if (interactionListenerId) {
      gameStore.removeEventListener('player-interaction', interactionListenerId);
    }
  });

  return {
    // Could expose utility functions here if needed in the future
  };
}
