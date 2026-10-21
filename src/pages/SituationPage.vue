<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BallToken from '../components/BallToken.vue'
import BilliardTable from '../components/BilliardTable.vue'
import ShotPath from '../components/ShotPath.vue'
import ShotPlayer from '../components/ShotPlayer.vue'
import { useEditTokens } from '../composables/useEditTokens'
import { useOrientation } from '../composables/useOrientation'
import { computeAfter } from '../domain/situation'
import type { Situation } from '../domain/types'
import { copyToClipboard, shareSituation, situationUrl } from '../lib/share'
import { deleteSituation, getSituation } from '../lib/situations'
import { formatDate } from '../lib/format'

const route = useRoute()
const router = useRouter()
const tokens = useEditTokens()
const orientation = useOrientation()

const slug = String(route.params.slug)
const situation = ref<Situation | null>(null)
const loading = ref(true)
const loadError = ref(false)
const view = ref<'before' | 'after' | 'play'>('play')
const notice = ref<string | null>(route.query.bewaard === '1' ? 'Bewaard. Deel de link.' : null)
const deleting = ref(false)

const canEdit = computed(() => tokens.get(slug) !== null)
const url = computed(() => situationUrl(slug))
const before = computed(() => situation.value?.data.before ?? [])
const shot = computed(() => situation.value?.data.shot ?? { playedBallId: '', movements: [] })
const after = computed(() => (situation.value ? computeAfter(before.value, shot.value) : []))
const ballById = (id: string) => before.value.find((b) => b.id === id)

onMounted(async () => {
  try {
    situation.value = await getSituation(slug)
  } catch (e) {
    loadError.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
})

function flash(message: string) {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = null
  }, 3000)
}

async function onCopy() {
  flash((await copyToClipboard(url.value)) ? 'Link gekopieerd.' : 'Kopiëren lukt niet; kopieer de adresbalk.')
}

async function onShare() {
  if (!situation.value) return
  const result = await shareSituation(situation.value.title, url.value)
  if (result === 'whatsapp') flash('WhatsApp geopend.')
}

async function onDelete() {
  const token = tokens.get(slug)
  if (!token || !window.confirm('Deze situatie verwijderen? Dit kan niet ongedaan gemaakt worden.')) return
  deleting.value = true
  try {
    const ok = await deleteSituation(slug, token)
    if (ok) {
      tokens.remove(slug)
      await router.push({ name: 'home' })
    } else {
      flash('Verwijderen lukt niet vanaf dit toestel.')
    }
  } catch (e) {
    flash('Verwijderen is mislukt.')
    console.error(e)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-5xl p-4">
    <p v-if="loading" class="text-gray-600">Laden…</p>

    <template v-else-if="!situation">
      <h1 class="text-xl font-semibold">{{ loadError ? 'Er ging iets mis' : 'Situatie niet gevonden' }}</h1>
      <p class="mt-2 text-gray-600">
        {{ loadError ? 'De situatie kon niet geladen worden. Probeer later opnieuw.' : 'Deze link bestaat niet (meer). Controleer of je de volledige link gekopieerd hebt.' }}
      </p>
      <RouterLink to="/" class="mt-4 inline-block text-emerald-800 underline">Naar de galerij</RouterLink>
    </template>

    <template v-else>
      <div
        v-if="notice"
        class="mb-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        role="status"
      >
        {{ notice }}
      </div>

      <header class="mb-3">
        <h1 class="text-xl font-semibold">{{ situation.title }}</h1>
        <p class="text-sm text-gray-600">
          {{ situation.authorName || 'Anoniem' }} · {{ formatDate(situation.createdAt) }}
        </p>
        <p v-if="situation.description" class="mt-2 whitespace-pre-line text-gray-800">{{ situation.description }}</p>
      </header>

      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <section class="min-w-0">
          <div class="mb-3 inline-flex rounded border border-gray-300 bg-gray-50 p-0.5" role="radiogroup" aria-label="Weergave">
            <button
              v-for="v in [
                { id: 'before', label: 'Voor' },
                { id: 'after', label: 'Na' },
                { id: 'play', label: 'Afspelen' },
              ] as const"
              :key="v.id"
              type="button"
              class="rounded px-3 py-1 text-sm"
              :class="view === v.id ? 'bg-emerald-700 text-white' : 'text-gray-700'"
              :aria-pressed="view === v.id"
              @click="view = v.id"
            >
              {{ v.label }}
            </button>
          </div>

          <div class="mx-auto" :class="orientation === 'portrait' ? 'max-w-md' : ''">
            <ShotPlayer v-if="view === 'play'" :before="before" :shot="shot" :orientation="orientation" />
            <BilliardTable v-else :orientation="orientation">
              <template v-if="view === 'before'">
                <ShotPath
                  v-for="m in shot.movements"
                  :key="m.ballId"
                  :path="m.path"
                  :order="m.order"
                  :result="m.result"
                  :color="ballById(m.ballId)?.color ?? 'white'"
                  :orientation="orientation"
                />
              </template>
              <BallToken
                v-for="b in view === 'before' ? before : after"
                :key="b.id"
                :color="b.color"
                :number="b.number"
                :position="b.position"
                :orientation="orientation"
                :state="view === 'before' && b.id === shot.playedBallId ? 'selected' : 'idle'"
              />
            </BilliardTable>
          </div>
        </section>

        <aside class="flex flex-wrap gap-2 md:flex-col">
          <button type="button" class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50" @click="onCopy">Kopieer link</button>
          <button type="button" class="rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800" @click="onShare">Deel</button>
          <template v-if="canEdit">
            <RouterLink
              :to="{ name: 'situation-edit', params: { slug } }"
              class="rounded border border-gray-300 px-3 py-2 text-center text-sm hover:bg-gray-50"
            >
              Bewerken
            </RouterLink>
            <button
              type="button"
              class="rounded border border-red-300 px-3 py-2 text-sm text-red-800 hover:bg-red-50 disabled:opacity-50"
              :disabled="deleting"
              @click="onDelete"
            >
              Verwijderen
            </button>
          </template>
          <RouterLink to="/" class="mt-2 text-sm text-emerald-800 underline">Alle situaties</RouterLink>
        </aside>
      </div>
    </template>
  </main>
</template>
