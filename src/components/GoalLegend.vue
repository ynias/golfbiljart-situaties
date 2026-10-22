<script setup lang="ts">
import type { Orientation } from '../table/geometry'

// The red goal is the top goal in portrait and the left goal in landscape (see geometry.holes).
defineProps<{ orientation: Orientation }>()
</script>

<template>
  <p class="flex items-center justify-between gap-3 text-xs text-muted" aria-label="Welke ballen in welk doel">
    <span class="inline-flex items-center gap-1.5">
      <span class="h-3 w-3 rounded-full border-[3px] border-ball-red bg-rail" aria-hidden="true" />
      Rode ballen: doel {{ orientation === 'landscape' ? 'links' : 'boven' }}
    </span>
    <span class="inline-flex items-center gap-1.5">
      Witte ballen: doel {{ orientation === 'landscape' ? 'rechts' : 'onder' }}
      <span class="h-3 w-3 rounded-full border-[3px] border-ball-white bg-rail ring-1 ring-stone-400" aria-hidden="true" />
    </span>
  </p>
</template>
