<script setup lang="ts">
import { computed, ref } from 'vue'
import BallToken from '../components/BallToken.vue'
import BallTray from '../components/BallTray.vue'
import BilliardTable from '../components/BilliardTable.vue'
import GoalLegend from '../components/GoalLegend.vue'
import ShotPath from '../components/ShotPath.vue'
import ShotPlayer from '../components/ShotPlayer.vue'
import { useBallDrag, type TableHandle } from '../composables/useBallDrag'
import { useOrientation } from '../composables/useOrientation'
import { useSituationEditor } from '../composables/useSituationEditor'
import { MAX_DESCRIPTION_LENGTH, type Ball, type Movement, type Situation } from '../domain/types'
import type { SituationInput } from '../lib/situations'
import { BALL_RADIUS } from '../table/geometry'

const props = withDefaults(
  defineProps<{
    /** Existing situation to edit; omitted for a new one. */
    initial?: Situation
    saving?: boolean
    saveError?: string | null
  }>(),
  { initial: undefined, saving: false, saveError: null },
)

const emit = defineEmits<{
  (e: 'save', payload: SituationInput): void
}>()

const editor = useSituationEditor(
  props.initial
    ? {
        title: props.initial.title,
        description: props.initial.description ?? '',
        authorName: props.initial.authorName ?? '',
        balls: props.initial.data.before.map((b) => ({ ...b, position: { ...b.position } })),
        playedBallId: props.initial.data.shot.playedBallId || null,
        movements: props.initial.data.shot.movements.map((m) => ({ ...m, path: m.path.map((p) => ({ ...p })) })),
      }
    : undefined,
)
const orientation = useOrientation()
const table = ref<TableHandle | null>(null)
const tray = ref<HTMLElement | null>(null)
const { drag, startFromTray, startFromTable } = useBallDrag(editor, table, tray)

const triedToContinue = ref(false)

const isBeforeStep = computed(() => editor.state.step === 'before')
const isShotStep = computed(() => editor.state.step === 'shot')
const showAfter = computed(() => isShotStep.value && editor.state.view === 'after')
const showPlayer = computed(() => isShotStep.value && editor.state.view === 'play')

/** Balls drawn on the table: the before-state, or the derived after-state. */
const shownBalls = computed<readonly Ball[]>(() => (showAfter.value ? editor.after.value : editor.state.balls))

// ---- before step ---------------------------------------------------------------------

function displayPosition(id: string, fallback: { x: number; y: number }) {
  return drag.source === 'table' && drag.ballId === id && drag.table ? drag.table : fallback
}

function beforeTokenState(id: string): 'idle' | 'dragging' | 'invalid' {
  if (drag.invalidBallId === id) return 'invalid'
  if (drag.source === 'table' && drag.ballId === id) return 'dragging'
  return 'idle'
}

/** Ghost ball (HTML) that follows the pointer while dragging a new ball from the tray. */
const ghost = computed(() => {
  if (drag.source !== 'tray' || !drag.color) return null
  const size = Math.max(28, 2 * BALL_RADIUS * (table.value?.pixelsPerMm() ?? 0.3))
  return { x: drag.client.x, y: drag.client.y, size, color: drag.color, valid: drag.valid, overTable: drag.table !== null }
})

function onContinue() {
  triedToContinue.value = true
  // On phones the title field sits below the table: bring it into view when it is missing.
  if (!editor.goToShot() && editor.fieldErrors.value.title) document.getElementById('title')?.focus()
}

// ---- shot step -----------------------------------------------------------------------

function shotTokenState(id: string): 'idle' | 'selected' | 'active' {
  if (showAfter.value) return 'idle'
  if (editor.state.currentBallId === id) return 'active'
  if (editor.state.playedBallId === id) return 'selected'
  return 'idle'
}

function onBallClick(ball: Ball) {
  if (!isShotStep.value || showAfter.value) return
  if (!editor.state.playedBallId) editor.selectPlayedBall(ball.id)
  else if (editor.state.currentBallId !== ball.id) editor.startMovement(ball.id)
}

function onTableClick(event: MouseEvent) {
  if (!isShotStep.value || showAfter.value || !editor.state.currentBallId) return
  const point = table.value?.clientToTable(event.clientX, event.clientY)
  if (point) editor.addPathPoint(point)
}

const movementBall = (m: Movement) => editor.state.balls.find((b) => b.id === m.ballId)
const ballName = (m: Movement) => {
  const ball = movementBall(m)
  return ball ? `${ball.color === 'white' ? 'Wit' : 'Rood'} ${ball.number}` : m.ballId
}

const views = [
  { id: 'before', label: 'Voor' },
  { id: 'after', label: 'Na' },
  { id: 'play', label: 'Afspelen' },
] as const

const hint = computed(() => {
  if (!isShotStep.value) return ''
  if (showAfter.value) return 'Dit is de situatie na de stoot.'
  if (showPlayer.value) return 'Speel de stoot af. Stap per stap speelt één beweging.'
  if (!editor.state.playedBallId) return 'Tik op de bal die je speelt.'
  const cur = editor.state.currentBallId
  const m = editor.currentMovement.value
  if (cur && m) {
    if (m.result === 'scored') return `${ballName(m)} is gescoord. Tik op een andere bal die beweegt, of bewaar.`
    return m.path.length < 2
      ? `Tik op de tafel waar ${ballName(m)} naartoe gaat. Dicht bij de band klikt het punt vast op de band; in het gat betekent gescoord.`
      : `Tik verder voor extra knikpunten van ${ballName(m)}, of tik op een andere bal die beweegt.`
  }
  return 'Tik op een bal die beweegt, of bewaar.'
})

function onSave() {
  if (!editor.canSave.value || props.saving) return
  emit('save', {
    title: editor.state.title,
    description: editor.state.description,
    authorName: editor.state.authorName,
    data: {
      version: 1,
      table: 'standard',
      before: editor.state.balls.map((b) => ({ ...b, position: { ...b.position } })),
      shot: {
        playedBallId: editor.shot.value.playedBallId,
        movements: editor.shot.value.movements.map((m) => ({ ...m, path: m.path.map((p) => ({ ...p })) })),
      },
    },
  })
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 pt-5 pb-28 md:pb-12">
    <!-- Page head: title and the two steps -->
    <div class="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
      <div class="min-w-0">
        <RouterLink to="/" class="text-sm font-semibold text-felt hover:underline">← Alle situaties</RouterLink>
        <h1 class="mt-1 font-display text-3xl leading-none font-bold tracking-wide uppercase sm:text-4xl">
          {{ initial ? 'Situatie bewerken' : 'Nieuwe situatie' }}
        </h1>
      </div>
      <ol class="flex items-center gap-2 text-sm sm:ml-auto" aria-label="Stappen">
        <li>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 font-semibold transition-colors"
            :class="isBeforeStep ? 'bg-felt text-white' : 'text-felt hover:bg-felt-tint'"
            :aria-current="isBeforeStep ? 'step' : undefined"
            :disabled="isBeforeStep"
            @click="editor.backToBefore()"
          >
            <span
              class="grid h-6 w-6 place-items-center rounded-full text-xs"
              :class="isBeforeStep ? 'bg-white text-felt' : 'bg-felt text-white'"
              aria-hidden="true"
              >{{ isBeforeStep ? '1' : '✓' }}</span
            >
            Ballen plaatsen
          </button>
        </li>
        <li class="h-px w-6 bg-line" aria-hidden="true" />
        <li>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 font-semibold transition-colors"
            :class="isShotStep ? 'bg-felt text-white' : 'text-muted hover:bg-felt-tint hover:text-felt'"
            :aria-current="isShotStep ? 'step' : undefined"
            :disabled="isShotStep"
            @click="onContinue"
          >
            <span
              class="grid h-6 w-6 place-items-center rounded-full text-xs"
              :class="isShotStep ? 'bg-white text-felt' : 'border border-current'"
              aria-hidden="true"
              >2</span
            >
            Stoot tekenen
          </button>
        </li>
      </ol>
    </div>

    <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
      <section class="min-w-0">
        <!-- Step 1: ball tray -->
        <div v-if="isBeforeStep" ref="tray" class="mb-3">
          <BallTray :remaining="editor.remaining.value" :drop-target="drag.overTray" @dragstart="startFromTray" />
        </div>

        <!-- Step 2: view switch and what to do next -->
        <div v-else class="mb-3 space-y-2">
          <div class="inline-flex rounded-md border border-line bg-white p-0.5 shadow-sm" role="radiogroup" aria-label="Voor of na">
            <button
              v-for="v in views"
              :key="v.id"
              type="button"
              role="radio"
              :aria-checked="editor.state.view === v.id"
              class="rounded px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40"
              :class="editor.state.view === v.id ? 'bg-felt text-white' : 'text-muted hover:text-felt'"
              :disabled="v.id === 'play' && !editor.canSave.value"
              @click="editor.form.view = v.id"
            >
              {{ v.label }}
            </button>
          </div>
          <p class="flex min-h-11 items-start gap-2 rounded-md border border-chalk/30 bg-chalk-tint px-3 py-2 text-sm text-rail" aria-live="polite">
            <span class="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-chalk" aria-hidden="true" />
            {{ hint }}
          </p>
        </div>

        <div class="editor-table mx-auto" :class="orientation === 'portrait' ? 'max-w-md' : ''">
          <ShotPlayer v-if="showPlayer" :before="editor.state.balls" :shot="editor.shot.value" :orientation="orientation" />
          <BilliardTable v-else ref="table" :orientation="orientation" @click="onTableClick">
            <!-- Paths (before view of the shot step) -->
            <template v-if="isShotStep && !showAfter">
              <ShotPath
                v-for="m in editor.shot.value.movements"
                :key="m.ballId"
                :path="m.path"
                :order="m.order"
                :result="m.result"
                :color="movementBall(m)?.color ?? 'white'"
                :orientation="orientation"
                :active="m.ballId === editor.state.currentBallId"
                :show-points="m.ballId === editor.state.currentBallId"
              />
            </template>

            <BallToken
              v-for="ball in shownBalls"
              :key="ball.id"
              :color="ball.color"
              :number="ball.number"
              :position="isBeforeStep ? displayPosition(ball.id, ball.position) : ball.position"
              :orientation="orientation"
              :state="isBeforeStep ? beforeTokenState(ball.id) : shotTokenState(ball.id)"
              :interactive="isBeforeStep || (isShotStep && !showAfter)"
              @pointerdown="isBeforeStep && ($event.preventDefault(), startFromTable(ball, $event))"
              @click.stop="onBallClick(ball)"
            />
            <!-- Preview of a new ball while it hovers over the table -->
            <BallToken
              v-if="drag.source === 'tray' && drag.table && drag.color"
              :color="drag.color"
              :position="drag.table"
              :orientation="orientation"
              :state="drag.valid ? 'dragging' : 'invalid'"
            />
          </BilliardTable>
          <GoalLegend :orientation="orientation" class="mt-2" />
        </div>
        <p v-if="isBeforeStep && triedToContinue && editor.fieldErrors.value.balls" class="mt-2 text-sm font-semibold text-red-700">
          {{ editor.fieldErrors.value.balls }}
        </p>
      </section>

      <!-- Step 1: details -->
      <aside v-if="isBeforeStep" class="space-y-4 rounded-lg border border-line bg-white p-4 shadow-sm md:self-start">
        <h2 class="font-display text-lg font-bold tracking-wide uppercase">Over deze situatie</h2>
        <div>
          <label for="title" class="block text-sm font-semibold">Titel</label>
          <input
            id="title"
            v-model="editor.form.title"
            type="text"
            maxlength="120"
            required
            class="mt-1 w-full rounded-md border px-3 py-2 focus:border-chalk focus:outline-none"
            :class="triedToContinue && editor.fieldErrors.value.title ? 'border-red-500' : 'border-line'"
            :aria-invalid="triedToContinue && !!editor.fieldErrors.value.title"
            placeholder="bv. Via de band in het gat"
          />
          <p v-if="triedToContinue && editor.fieldErrors.value.title" class="mt-1 text-sm text-red-700">
            {{ editor.fieldErrors.value.title }}
          </p>
        </div>
        <div>
          <label for="description" class="block text-sm font-semibold">Beschrijving <span class="font-normal text-muted">(optioneel)</span></label>
          <textarea
            id="description"
            v-model="editor.form.description"
            rows="4"
            :maxlength="MAX_DESCRIPTION_LENGTH"
            class="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-chalk focus:outline-none"
            placeholder="Wat is de bedoeling van de stoot?"
          />
          <p class="mt-1 text-right text-xs text-muted">{{ editor.form.description.length }}/{{ MAX_DESCRIPTION_LENGTH }}</p>
        </div>
        <div>
          <label for="author" class="block text-sm font-semibold">Je naam <span class="font-normal text-muted">(optioneel)</span></label>
          <input
            id="author"
            v-model="editor.form.authorName"
            type="text"
            maxlength="60"
            class="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-chalk focus:outline-none"
            placeholder="Anoniem"
          />
        </div>
        <div class="action-bar">
          <button
            type="button"
            class="w-full rounded-md bg-felt px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-felt-dark"
            @click="onContinue"
          >
            Verder naar de stoot →
          </button>
        </div>
      </aside>

      <!-- Step 2: movements -->
      <aside v-else class="space-y-4 rounded-lg border border-line bg-white p-4 shadow-sm md:self-start">
        <div>
          <h2 class="font-display text-lg font-bold tracking-wide uppercase">Bewegingen</h2>
          <p v-if="editor.shot.value.movements.length === 0" class="mt-1 text-sm text-muted">
            Nog geen gespeelde bal gekozen. Tik op de tafel op de bal die je speelt.
          </p>
          <ol v-else class="mt-2 space-y-1.5">
            <li
              v-for="m in editor.shot.value.movements"
              :key="m.ballId"
              class="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors"
              :class="m.ballId === editor.state.currentBallId ? 'border-chalk bg-chalk-tint' : 'border-line'"
            >
              <span class="w-4 text-center font-display text-base font-bold text-muted">{{ m.order }}</span>
              <button
                type="button"
                class="inline-flex min-w-0 items-center gap-2 rounded text-left font-semibold hover:text-felt"
                :title="`${ballName(m)} bewerken`"
                @click="editor.startMovement(m.ballId)"
              >
                <span
                  class="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold"
                  :class="movementBall(m)?.color === 'red' ? 'border-red-900 bg-ball-red text-white' : 'border-stone-400 bg-ball-white text-rail'"
                  aria-hidden="true"
                  >{{ movementBall(m)?.number }}</span
                >
                <span class="min-w-0">
                  <span class="block truncate">{{ ballName(m) }}</span>
                  <span class="block text-xs font-normal text-muted">
                    {{ m.path.length - 1 }} {{ m.path.length - 1 === 1 ? 'punt' : 'punten' }}{{ m.result === 'scored' ? ' · gescoord' : ''
                    }}{{ m.ballId === editor.state.playedBallId ? ' · gespeeld' : '' }}
                  </span>
                </span>
              </button>
              <span class="ml-auto flex shrink-0">
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded text-muted hover:bg-paper hover:text-rail disabled:opacity-30"
                  :disabled="m.order <= 2"
                  title="Vroeger"
                  aria-label="Vroeger"
                  @click="editor.moveMovement(m.ballId, 'up')"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded text-muted hover:bg-paper hover:text-rail disabled:opacity-30"
                  :disabled="m.order === 1 || m.order === editor.shot.value.movements.length"
                  title="Later"
                  aria-label="Later"
                  @click="editor.moveMovement(m.ballId, 'down')"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded text-red-700 hover:bg-red-50"
                  :title="m.ballId === editor.state.playedBallId ? 'Pad wissen' : 'Beweging verwijderen'"
                  :aria-label="m.ballId === editor.state.playedBallId ? 'Pad wissen' : 'Beweging verwijderen'"
                  @click="editor.removeMovement(m.ballId)"
                >
                  ✕
                </button>
              </span>
            </li>
          </ol>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-paper disabled:opacity-40"
            :disabled="!editor.currentMovement.value || editor.currentMovement.value.path.length < 2"
            @click="editor.undoPoint()"
          >
            Laatste punt ongedaan
          </button>
          <button
            type="button"
            class="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-paper disabled:opacity-40"
            :disabled="!editor.state.currentBallId"
            @click="editor.finishMovement()"
          >
            Klaar met deze bal
          </button>
        </div>

        <ul v-if="editor.shotErrors.value.length" class="space-y-1 text-sm text-muted">
          <li v-for="e in editor.shotErrors.value" :key="e">{{ e }}</li>
        </ul>

        <div class="action-bar flex gap-2">
          <button
            type="button"
            class="rounded-md border border-line bg-white px-3 py-2.5 text-sm font-semibold hover:bg-paper"
            @click="editor.backToBefore()"
          >
            ← Ballen
          </button>
          <button
            type="button"
            class="flex-1 rounded-md bg-felt px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-felt-dark disabled:opacity-50"
            :disabled="!editor.canSave.value || saving"
            @click="onSave"
          >
            {{ saving ? 'Bezig met bewaren…' : 'Bewaren' }}
          </button>
        </div>
        <p v-if="saveError" class="text-sm font-semibold text-red-700" role="alert">{{ saveError }}</p>
      </aside>
    </div>

    <!-- Ghost that follows the pointer while dragging a new ball from the tray (outside the table) -->
    <div
      v-if="ghost && !ghost.overTable"
      class="pointer-events-none fixed z-50 rounded-full border-2 shadow-lg"
      :class="ghost.color === 'white' ? 'border-stone-400 bg-stone-50' : 'border-red-900 bg-red-600'"
      :style="{ left: `${ghost.x - ghost.size / 2}px`, top: `${ghost.y - ghost.size / 2}px`, width: `${ghost.size}px`, height: `${ghost.size}px` }"
    />
  </main>
</template>

<style scoped>
.editor-table :deep(svg) {
  touch-action: none;
}

/* On phones the main action stays within thumb reach at the bottom of the screen. */
@media (max-width: 767px) {
  .action-bar {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 40;
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
    background: rgb(255 255 255 / 0.96);
    border-top: 1px solid var(--color-line);
    box-shadow: 0 -4px 12px rgb(0 0 0 / 0.06);
  }
}
</style>
