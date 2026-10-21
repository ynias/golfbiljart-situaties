<script setup lang="ts">
import { computed } from 'vue'
import type { BallColor, Point } from '../domain/types'
import { BALL_RADIUS, type Orientation } from '../table/geometry'

const props = withDefaults(
  defineProps<{
    color: BallColor
    number?: number
    position: Point
    orientation?: Orientation
    /** Visual state while dragging / after an invalid drop. */
    state?: 'idle' | 'dragging' | 'invalid' | 'selected' | 'active'
    interactive?: boolean
  }>(),
  { orientation: 'portrait', state: 'idle', interactive: false },
)

const fill = computed(() => (props.color === 'white' ? '#f8f6f0' : '#d41e1e'))
const textColor = computed(() => (props.color === 'white' ? '#222' : '#fff'))
const stroke = computed(() => {
  if (props.state === 'invalid') return '#ff2a2a'
  if (props.state === 'selected') return '#ffd400'
  if (props.state === 'active') return '#4cc9ff'
  return props.color === 'white' ? '#8a8578' : '#7a0d0d'
})
</script>

<template>
  <g
    class="ball-token"
    :class="[`ball-token--${state}`, { 'ball-token--interactive': interactive }]"
    :transform="`translate(${position.x} ${position.y})`"
  >
    <!-- Inner group so CSS animations can transform it without touching the positioning transform. -->
    <g class="ball-token__body">
      <circle :r="BALL_RADIUS" :fill="fill" :stroke="stroke" :stroke-width="state === 'idle' ? 1.5 : 4" />
      <circle :r="BALL_RADIUS * 0.55" :cx="-BALL_RADIUS * 0.25" :cy="-BALL_RADIUS * 0.3" fill="#fff" opacity="0.18" />
      <!-- The table group is rotated −90° in landscape; rotate the label back so it reads upright. -->
      <text
        v-if="number"
        :transform="orientation === 'landscape' ? 'rotate(90)' : undefined"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="textColor"
        font-family="system-ui, sans-serif"
        font-weight="700"
        :font-size="BALL_RADIUS * 1.15"
        style="user-select: none; pointer-events: none"
      >
        {{ number }}
      </text>
    </g>
  </g>
</template>

<style scoped>
.ball-token--interactive {
  cursor: grab;
  touch-action: none;
}
.ball-token--dragging {
  cursor: grabbing;
}
.ball-token--dragging .ball-token__body {
  filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.45));
  transform: scale(1.08);
}
.ball-token--invalid .ball-token__body {
  animation: ball-shake 0.4s ease-in-out;
}
.ball-token__body {
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes ball-shake {
  0%, 100% { transform: translate(0, 0); }
  20%, 60% { transform: translate(-6px, 0); }
  40%, 80% { transform: translate(6px, 0); }
}
</style>
