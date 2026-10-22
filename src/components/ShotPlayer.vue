<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import BallToken from './BallToken.vue'
import BilliardTable from './BilliardTable.vue'
import ShotPath from './ShotPath.vue'
import { buildTimeline, frameAt, nextStepEnd, segmentIndexAt } from '../domain/playback'
import type { Ball, Shot } from '../domain/types'
import type { Orientation } from '../table/geometry'
import type { ThemeName } from '../table/themes'

const props = withDefaults(
  defineProps<{
    before: readonly Ball[]
    shot: Shot
    orientation?: Orientation
    theme?: ThemeName
    /** Show the paths under the balls while playing. */
    showPaths?: boolean
  }>(),
  { orientation: 'portrait', showPaths: true },
)

const emit = defineEmits<{ (e: 'ended'): void }>()

const SPEEDS = [0.5, 1, 2] as const
type Speed = (typeof SPEEDS)[number]

const timeline = computed(() => buildTimeline(props.shot))
const time = ref(0)
const playing = ref(false)
const speed = ref<Speed>(1)
/** When set, playback pauses automatically at this time (step-by-step). */
const stopAt = ref<number | null>(null)

const frame = computed(() => frameAt(props.before, timeline.value, time.value))
const currentIndex = computed(() => segmentIndexAt(timeline.value, time.value))
const atEnd = computed(() => time.value >= timeline.value.total)
const progress = computed(() => (timeline.value.total === 0 ? 1 : time.value / timeline.value.total))

let raf = 0
let last = 0

function tick(now: number) {
  if (!playing.value) return
  const dt = last === 0 ? 0 : now - last
  last = now
  let next = time.value + dt * speed.value
  const limit = stopAt.value ?? timeline.value.total
  if (next >= limit) {
    next = limit
    time.value = next
    pause()
    if (next >= timeline.value.total) emit('ended')
    return
  }
  time.value = next
  raf = requestAnimationFrame(tick)
}

function play() {
  if (atEnd.value) time.value = 0
  stopAt.value = null
  start()
}

function start() {
  if (playing.value) return
  playing.value = true
  last = 0
  raf = requestAnimationFrame(tick)
}

function pause() {
  playing.value = false
  cancelAnimationFrame(raf)
  raf = 0
  stopAt.value = null
}

function restart() {
  pause()
  time.value = 0
}

/** Plays until the end of the current (or next) movement, then pauses. */
function step() {
  if (atEnd.value) {
    time.value = 0
  }
  const target = nextStepEnd(timeline.value, time.value)
  pause()
  stopAt.value = target
  start()
}

function setSpeed(s: Speed) {
  speed.value = s
}

function togglePlay() {
  if (playing.value) pause()
  else play()
}

// Reset when the shot changes (e.g. while editing).
watch(
  () => [props.shot, props.before],
  () => restart(),
  { deep: true },
)

onUnmounted(() => cancelAnimationFrame(raf))

defineExpose({ play, pause, restart, step, time, playing })

const ballById = (id: string) => props.before.find((b) => b.id === id)
</script>

<template>
  <div class="shot-player">
    <BilliardTable :orientation="orientation" :theme="theme">
      <template v-if="showPaths">
        <ShotPath
          v-for="(seg, i) in timeline.segments"
          :key="seg.ballId"
          :path="seg.path"
          :order="seg.order"
          :result="seg.result"
          :color="ballById(seg.ballId)?.color ?? 'white'"
          :orientation="orientation"
          :active="i === currentIndex"
        />
      </template>
      <template v-for="f in frame" :key="f.ball.id">
        <g v-if="f.visible" :transform="`translate(${f.position.x} ${f.position.y}) scale(${f.scale}) translate(${-f.position.x} ${-f.position.y})`" :opacity="f.scale">
          <BallToken
            :color="f.ball.color"
            :number="f.ball.number"
            :position="f.position"
            :orientation="orientation"
            :state="f.moving ? 'dragging' : 'idle'"
          />
        </g>
      </template>
    </BilliardTable>

    <div class="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" class="rounded-md bg-felt px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-felt-dark" :aria-label="playing ? 'Pauze' : 'Afspelen'" @click="togglePlay">
        {{ playing ? '❚❚ Pauze' : '▶ Afspelen' }}
      </button>
      <button type="button" class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper" @click="restart">↺ Herstart</button>
      <button type="button" class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper" :disabled="playing" @click="step">
        Stap per stap ⏭
      </button>
      <div class="ml-auto inline-flex rounded-md border border-line bg-white p-0.5 shadow-sm" role="radiogroup" aria-label="Snelheid">
        <button
          v-for="s in SPEEDS"
          :key="s"
          type="button"
          class="rounded px-2 py-1 text-xs"
          :class="speed === s ? 'bg-felt text-white' : 'text-muted hover:text-felt'"
          :aria-pressed="speed === s"
          @click="setSpeed(s)"
        >
          {{ s }}×
        </button>
      </div>
    </div>
    <div class="mt-2 h-1.5 w-full overflow-hidden rounded bg-line" aria-hidden="true">
      <div class="h-full bg-felt transition-[width] duration-75" :style="{ width: `${progress * 100}%` }" />
    </div>
  </div>
</template>
