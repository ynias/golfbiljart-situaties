<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  TABLE,
  FRAME,
  fromSvg,
  holes,
  lines,
  orientationTransform,
  pins,
  viewBox,
  type Orientation,
  type Point,
} from '../table/geometry'
import { DEFAULT_THEME, themes, type ThemeName } from '../table/themes'

const props = withDefaults(
  defineProps<{
    orientation?: Orientation
    theme?: ThemeName
  }>(),
  { orientation: 'portrait', theme: DEFAULT_THEME },
)

const svg = ref<SVGSVGElement | null>(null)

/**
 * Maps a client (screen) point to canonical table coordinates in mm.
 * Returns null when the SVG is not mounted.
 */
function clientToTable(clientX: number, clientY: number): Point | null {
  const el = svg.value
  if (!el) return null
  const ctm = el.getScreenCTM()
  if (!ctm) return null
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return fromSvg({ x: p.x, y: p.y }, props.orientation)
}

/** Current scale: screen pixels per mm. */
function pixelsPerMm(): number {
  const ctm = svg.value?.getScreenCTM()
  return ctm ? Math.hypot(ctm.a, ctm.b) : 1
}

defineExpose({ svg, clientToTable, pixelsPerMm })

const colors = computed(() => themes[props.theme])
const box = computed(() => viewBox(props.orientation))
const viewBoxAttr = computed(() => `${box.value.x} ${box.value.y} ${box.value.width} ${box.value.height}`)
const transform = computed(() => orientationTransform(props.orientation))

const W = TABLE.width
const L = TABLE.length
const pointsAttr = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ')
</script>

<template>
  <svg
    ref="svg"
    class="billiard-table block h-auto w-full"
    :viewBox="viewBoxAttr"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- Everything inside is in canonical (portrait) mm coordinates; the group rotates for landscape. -->
    <g :transform="transform">
      <!-- Rail -->
      <rect :x="-FRAME" :y="-FRAME" :width="W + 2 * FRAME" :height="L + 2 * FRAME" :rx="FRAME / 3" :fill="colors.rail" />
      <!-- Cushion -->
      <rect
        :x="-TABLE.cushion"
        :y="-TABLE.cushion"
        :width="W + 2 * TABLE.cushion"
        :height="L + 2 * TABLE.cushion"
        :fill="colors.cushion"
      />
      <!-- Cloth -->
      <rect :x="0" :y="0" :width="W" :height="L" :fill="colors.cloth" />

      <!-- Lines -->
      <g :stroke="colors.line" fill="none" stroke-linecap="butt" class="table-lines">
        <polyline v-for="line in lines" :key="line.id" :points="pointsAttr(line.points)" />
      </g>

      <!-- Holes -->
      <circle v-for="hole in holes" :key="hole.id" :cx="hole.center.x" :cy="hole.center.y" :r="hole.radius" :fill="colors.hole" />

      <!-- Pins -->
      <g class="table-pins">
        <circle
          v-for="pin in pins"
          :key="pin.id"
          :cx="pin.center.x"
          :cy="pin.center.y"
          :r="pin.radius"
          :fill="colors.pin"
          :stroke="colors.pinRing"
          :stroke-width="pin.radius * 0.3"
        />
      </g>

      <!-- Balls, paths, … rendered by the parent in the same mm coordinates -->
      <slot />
    </g>
  </svg>
</template>

<style scoped>
.table-lines polyline {
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}
</style>
