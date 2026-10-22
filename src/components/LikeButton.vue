<script setup lang="ts">
import { ref } from 'vue'
import { toggleLike } from '../lib/likes'

const props = defineProps<{ slug: string; count: number; liked: boolean }>()
const emit = defineEmits<{ (e: 'change', liked: boolean, count: number): void }>()

const busy = ref(false)
const failed = ref(false)

async function onClick() {
  if (busy.value) return
  busy.value = true
  failed.value = false
  const before = { liked: props.liked, count: props.count }
  // Optimistic: show the result immediately, correct it with the server answer.
  emit('change', !before.liked, Math.max(0, before.count + (before.liked ? -1 : 1)))
  try {
    const result = await toggleLike(props.slug)
    emit('change', result.liked, result.likeCount)
  } catch (e) {
    emit('change', before.liked, before.count)
    failed.value = true
    console.error(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="like-button inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors"
    :class="liked ? 'border-ball-red bg-ball-red text-white hover:bg-red-700' : 'border-line bg-white text-rail hover:border-ball-red hover:text-ball-red'"
    :aria-pressed="liked"
    :aria-label="liked ? `Vind ik niet meer leuk (${count})` : `Vind ik leuk (${count})`"
    :title="failed ? 'Dat lukte niet. Probeer opnieuw.' : undefined"
    @click="onClick"
  >
    <svg class="h-4 w-4" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 17.5s-6.5-4.1-6.5-8.6A3.6 3.6 0 0 1 10 6.6a3.6 3.6 0 0 1 6.5 2.3c0 4.5-6.5 8.6-6.5 8.6Z"
        :fill="liked ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
    </svg>
    <span class="tabular-nums">{{ count }}</span>
  </button>
</template>

<style scoped>
.like-button[aria-pressed='true'] svg {
  animation: like-pop 0.25s ease-out;
}
@keyframes like-pop {
  50% {
    transform: scale(1.3);
  }
}
</style>
