<script setup lang="ts">
import { computed, ref } from 'vue'
import BallToken from '../components/BallToken.vue'
import BallTray from '../components/BallTray.vue'
import BilliardTable from '../components/BilliardTable.vue'
import { useBallDrag, type TableHandle } from '../composables/useBallDrag'
import { useOrientation } from '../composables/useOrientation'
import { useSituationEditor } from '../composables/useSituationEditor'
import { MAX_DESCRIPTION_LENGTH } from '../domain/types'
import { BALL_RADIUS } from '../table/geometry'

const editor = useSituationEditor()
const orientation = useOrientation()
const table = ref<TableHandle | null>(null)
const tray = ref<HTMLElement | null>(null)
const { drag, startFromTray, startFromTable } = useBallDrag(editor, table, tray)

const triedToContinue = ref(false)

/** Position to draw each ball at: the live drag position for the ball being moved. */
function displayPosition(id: string, fallback: { x: number; y: number }) {
  return drag.source === 'table' && drag.ballId === id && drag.table ? drag.table : fallback
}

function tokenState(id: string): 'idle' | 'dragging' | 'invalid' {
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
  if (!editor.canContinue.value) return
  editor.form.step = 'shot'
}
</script>

<template>
  <main class="mx-auto max-w-6xl p-4">
    <h1 class="mb-3 text-xl font-semibold">Nieuwe situatie</h1>

    <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
      <section class="min-w-0">
        <div ref="tray" class="mb-3">
          <BallTray :remaining="editor.remaining.value" :drop-target="drag.overTray" @dragstart="startFromTray" />
        </div>

        <div class="editor-table mx-auto" :class="orientation === 'portrait' ? 'max-w-md' : ''">
          <BilliardTable ref="table" :orientation="orientation">
            <BallToken
              v-for="ball in editor.state.balls"
              :key="ball.id"
              :color="ball.color"
              :number="ball.number"
              :position="displayPosition(ball.id, ball.position)"
              :orientation="orientation"
              :state="tokenState(ball.id)"
              interactive
              @pointerdown.prevent="startFromTable(ball, $event)"
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
        <p v-if="triedToContinue && editor.fieldErrors.value.balls" class="mt-2 text-sm text-red-700">
          {{ editor.fieldErrors.value.balls }}
        </p>
      </section>

      <aside class="space-y-4">
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
          class="w-full rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          @click="onContinue"
        >
          Verder naar de stoot
        </button>
        <p v-if="editor.state.step === 'shot'" class="text-sm text-gray-600">De stoot tekenen komt in de volgende stap.</p>
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
