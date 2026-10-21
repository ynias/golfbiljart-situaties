<script setup lang="ts">
import { computed, ref } from 'vue'
import BallToken from '../components/BallToken.vue'
import BallTray from '../components/BallTray.vue'
import BilliardTable from '../components/BilliardTable.vue'
import ShotPath from '../components/ShotPath.vue'
import ShotPlayer from '../components/ShotPlayer.vue'
import { useBallDrag, type TableHandle } from '../composables/useBallDrag'
import { useOrientation } from '../composables/useOrientation'
import { useSituationEditor } from '../composables/useSituationEditor'
import { MAX_DESCRIPTION_LENGTH, type Ball, type Movement } from '../domain/types'
import { BALL_RADIUS } from '../table/geometry'

const editor = useSituationEditor()
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
  editor.goToShot()
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

const ballLabel = (id: string) => id
const movementBall = (m: Movement) => editor.state.balls.find((b) => b.id === m.ballId)

const hint = computed(() => {
  if (!isShotStep.value) return ''
  if (showAfter.value) return 'Dit is de situatie na de stoot.'
  if (showPlayer.value) return 'Speel de stoot af. Stap per stap speelt één beweging.'
  if (!editor.state.playedBallId) return 'Tik op de bal die je speelt.'
  const cur = editor.state.currentBallId
  const m = editor.currentMovement.value
  if (cur && m) {
    if (m.result === 'scored') return `${cur} is gescoord. Tik op een andere bal die beweegt, of bewaar.`
    return m.path.length < 2
      ? `Tik op de tafel waar ${cur} naartoe gaat. Dicht bij de band klikt het punt vast op de band; in het gat betekent gescoord.`
      : `Tik verder voor extra knikpunten van ${cur}, of tik op een andere bal die beweegt.`
  }
  return 'Tik op een bal die beweegt, of bewaar.'
})

function onSave() {
  // Saving comes in phase 5.
}
</script>

<template>
  <main class="mx-auto max-w-6xl p-4">
    <h1 class="mb-3 text-xl font-semibold">
      Nieuwe situatie
      <span class="ml-2 text-sm font-normal text-gray-500">{{ isBeforeStep ? 'Stap 1: de ballen' : 'Stap 2: de stoot' }}</span>
    </h1>

    <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
      <section class="min-w-0">
        <div v-if="isBeforeStep" ref="tray" class="mb-3">
          <BallTray :remaining="editor.remaining.value" :drop-target="drag.overTray" @dragstart="startFromTray" />
        </div>

        <div v-else class="mb-3 flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded border border-gray-300 bg-gray-50 p-0.5" role="radiogroup" aria-label="Voor of na">
            <button
              type="button"
              class="rounded px-3 py-1 text-sm"
              :class="editor.state.view === 'before' ? 'bg-emerald-700 text-white' : 'text-gray-700'"
              @click="editor.form.view = 'before'"
            >
              Voor
            </button>
            <button
              type="button"
              class="rounded px-3 py-1 text-sm"
              :class="editor.state.view === 'after' ? 'bg-emerald-700 text-white' : 'text-gray-700'"
              @click="editor.form.view = 'after'"
            >
              Na
            </button>
            <button
              type="button"
              class="rounded px-3 py-1 text-sm disabled:opacity-40"
              :class="editor.state.view === 'play' ? 'bg-emerald-700 text-white' : 'text-gray-700'"
              :disabled="!editor.canSave.value"
              @click="editor.form.view = 'play'"
            >
              Afspelen
            </button>
          </div>
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
        </div>
        <p v-if="isShotStep" class="mt-2 min-h-10 text-sm text-gray-700">{{ hint }}</p>
        <p v-if="isBeforeStep && triedToContinue && editor.fieldErrors.value.balls" class="mt-2 text-sm text-red-700">
          {{ editor.fieldErrors.value.balls }}
        </p>
      </section>

      <!-- Step 1: fields -->
      <aside v-if="isBeforeStep" class="space-y-4">
        <div>
          <label for="title" class="block text-sm font-medium">Titel</label>
          <input
            id="title"
            v-model="editor.form.title"
            type="text"
            maxlength="120"
            required
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="bv. Via de band in het gat"
          />
          <p v-if="triedToContinue && editor.fieldErrors.value.title" class="mt-1 text-sm text-red-700">
            {{ editor.fieldErrors.value.title }}
          </p>
        </div>
        <div>
          <label for="description" class="block text-sm font-medium">Beschrijving <span class="text-gray-500">(optioneel)</span></label>
          <textarea
            id="description"
            v-model="editor.form.description"
            rows="4"
            :maxlength="MAX_DESCRIPTION_LENGTH"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          <p class="mt-1 text-right text-xs text-gray-500">{{ editor.form.description.length }}/{{ MAX_DESCRIPTION_LENGTH }}</p>
        </div>
        <div>
          <label for="author" class="block text-sm font-medium">Je naam <span class="text-gray-500">(optioneel)</span></label>
          <input
            id="author"
            v-model="editor.form.authorName"
            type="text"
            maxlength="60"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Anoniem"
          />
        </div>
        <button
          type="button"
          class="w-full rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
          @click="onContinue"
        >
          Verder naar de stoot
        </button>
      </aside>

      <!-- Step 2: movements -->
      <aside v-else class="space-y-4">
        <div>
          <h2 class="text-sm font-medium">Bewegingen</h2>
          <p v-if="editor.shot.value.movements.length === 0" class="mt-1 text-sm text-gray-500">Nog geen gespeelde bal gekozen.</p>
          <ol v-else class="mt-1 space-y-1">
            <li
              v-for="m in editor.shot.value.movements"
              :key="m.ballId"
              class="flex items-center gap-2 rounded border px-2 py-1 text-sm"
              :class="m.ballId === editor.state.currentBallId ? 'border-sky-400 bg-sky-50' : 'border-gray-200'"
            >
              <span class="w-5 font-semibold">{{ m.order }}</span>
              <button type="button" class="font-medium underline-offset-2 hover:underline" @click="editor.startMovement(m.ballId)">
                {{ ballLabel(m.ballId) }}
              </button>
              <span class="text-xs text-gray-500">
                {{ m.path.length - 1 }} {{ m.path.length - 1 === 1 ? 'punt' : 'punten' }}{{ m.result === 'scored' ? ' · gescoord' : '' }}
                {{ m.ballId === editor.state.playedBallId ? ' · gespeeld' : '' }}
              </span>
              <span class="ml-auto flex gap-1">
                <button type="button" class="rounded px-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30" :disabled="m.order <= 2" title="Vroeger" @click="editor.moveMovement(m.ballId, 'up')">↑</button>
                <button type="button" class="rounded px-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30" :disabled="m.order === 1 || m.order === editor.shot.value.movements.length" title="Later" @click="editor.moveMovement(m.ballId, 'down')">↓</button>
                <button type="button" class="rounded px-1 text-red-700 hover:bg-red-50" :title="m.ballId === editor.state.playedBallId ? 'Pad wissen' : 'Beweging verwijderen'" @click="editor.removeMovement(m.ballId)">✕</button>
              </span>
            </li>
          </ol>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
            :disabled="!editor.currentMovement.value || editor.currentMovement.value.path.length < 2"
            @click="editor.undoPoint()"
          >
            Laatste punt ongedaan
          </button>
          <button
            type="button"
            class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
            :disabled="!editor.state.currentBallId"
            @click="editor.finishMovement()"
          >
            Klaar met deze bal
          </button>
        </div>

        <p v-for="e in editor.shotErrors.value" :key="e" class="text-sm text-gray-600">{{ e }}</p>

        <div class="flex gap-2">
          <button type="button" class="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50" @click="editor.backToBefore()">
            Terug naar de ballen
          </button>
          <button
            type="button"
            class="flex-1 rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            :disabled="!editor.canSave.value"
            @click="onSave"
          >
            Bewaren
          </button>
        </div>
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
</style>
