<script setup lang="ts">
import type { BallColor } from '../domain/types'

defineProps<{
  remaining: Record<BallColor, number>
  /** True while a table ball is dragged over the tray (drop = remove). */
  dropTarget?: boolean
}>()

const emit = defineEmits<{
  (e: 'dragstart', color: BallColor, event: PointerEvent): void
}>()

const colors: BallColor[] = ['white', 'red']
</script>

<template>
  <div
    class="ball-tray flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-2 transition-colors select-none sm:p-3"
    :class="dropTarget ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'"
    data-testid="ball-tray"
  >
    <div v-for="color in colors" :key="color" class="flex items-center gap-2">
      <span class="w-9 text-xs text-gray-600">{{ color === 'white' ? 'Wit' : 'Rood' }}</span>
      <div class="flex gap-1">
        <button
          v-for="i in 5"
          :key="i"
          type="button"
          class="ball-tray__ball h-8 w-8 rounded-full border-2 shadow-sm sm:h-9 sm:w-9"
          :class="[
            color === 'white' ? 'border-stone-400 bg-stone-50' : 'border-red-900 bg-red-600',
            i <= remaining[color] ? 'cursor-grab' : 'invisible',
          ]"
          :aria-label="`${color === 'white' ? 'Witte' : 'Rode'} bal naar de tafel slepen`"
          :disabled="i > remaining[color]"
          @pointerdown.prevent="emit('dragstart', color, $event)"
        />
      </div>
    </div>
    <p v-if="dropTarget" class="basis-full text-sm text-red-700 sm:ml-auto sm:basis-auto">Laat los om te verwijderen</p>
    <p v-else class="ml-auto hidden text-xs text-gray-500 sm:block">Sleep een bal naar de tafel. Sleep terug om te verwijderen.</p>
  </div>
</template>

<style scoped>
.ball-tray__ball {
  touch-action: none;
}
</style>
