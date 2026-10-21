<script setup lang="ts">
import { computed } from 'vue'
import { pathLength, positionAlongPath } from '../domain/paths'
import type { BallColor, Point } from '../domain/types'
import type { Orientation } from '../table/geometry'

const props = withDefaults(
  defineProps<{
    path: Point[]
    order: number
    result: 'rest' | 'scored'
    color: BallColor
    orientation?: Orientation
    /** Highlight while this path is being drawn. */
    active?: boolean
    /** Show the knick points. */
    showPoints?: boolean
  }>(),
  { orientation: 'portrait', active: false, showPoints: false },
)

const ARROW_LENGTH = 28
const ARROW_WIDTH = 18
const LABEL_RADIUS = 20

const stroke = computed(() => (props.color === 'white' ? '#fff8e0' : '#ffb0b0'))
const pointsAttr = computed(() => props.path.map((p) => `${p.x},${p.y}`).join(' '))
const hasSegments = computed(() => props.path.length >= 2)

const arrow = computed(() => {
  if (!hasSegments.value) return null
  const end = props.path[props.path.length - 1]!
  const prev = props.path[props.path.length - 2]!
  const angle = (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI
  return { x: end.x, y: end.y, angle }
})

const label = computed(() => {
  if (!hasSegments.value) return null
  const len = pathLength(props.path)
  const p = positionAlongPath(props.path, len / 2)
  return { x: p.x, y: p.y }
})

const labelRotation = computed(() => (props.orientation === 'landscape' ? 'rotate(90)' : undefined))
</script>

<template>
  <g class="shot-path" :class="{ 'shot-path--active': active }">
    <template v-if="hasSegments">
      <polyline :points="pointsAttr" fill="none" stroke="#111" stroke-linejoin="round" stroke-linecap="round" class="shot-path__outline" />
      <polyline
        :points="pointsAttr"
        fill="none"
        :stroke="stroke"
        stroke-linejoin="round"
        stroke-linecap="round"
        class="shot-path__line"
        :stroke-dasharray="result === 'scored' ? '14 10' : undefined"
      />
      <!-- Arrow head at the end of the path -->
      <polygon
        v-if="arrow"
        :points="`0,0 ${-ARROW_LENGTH},${-ARROW_WIDTH / 2} ${-ARROW_LENGTH},${ARROW_WIDTH / 2}`"
        :transform="`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle})`"
        :fill="stroke"
        stroke="#111"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <!-- Movement number halfway the path -->
      <g v-if="label" :transform="`translate(${label.x} ${label.y})`">
        <g :transform="labelRotation">
          <circle :r="LABEL_RADIUS" fill="#111" :stroke="stroke" stroke-width="2" />
          <text
            text-anchor="middle"
            dominant-baseline="central"
            fill="#fff"
            font-family="system-ui, sans-serif"
            font-weight="700"
            :font-size="LABEL_RADIUS * 1.2"
            style="user-select: none; pointer-events: none"
          >
            {{ order }}
          </text>
        </g>
      </g>
    </template>
    <!-- Knick points while drawing -->
    <template v-if="showPoints">
      <circle v-for="(p, i) in path.slice(1)" :key="i" :cx="p.x" :cy="p.y" r="7" :fill="stroke" stroke="#111" stroke-width="1.5" />
    </template>
  </g>
</template>

<style scoped>
.shot-path__outline {
  stroke-width: 6px;
  vector-effect: non-scaling-stroke;
  opacity: 0.85;
}
.shot-path__line {
  stroke-width: 3px;
  vector-effect: non-scaling-stroke;
}
.shot-path--active .shot-path__line {
  stroke-width: 4px;
}
.shot-path {
  pointer-events: none;
}
</style>
