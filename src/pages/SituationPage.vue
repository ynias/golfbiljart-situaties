<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BallToken from '../components/BallToken.vue'
import BilliardTable from '../components/BilliardTable.vue'
import CommentsSection from '../components/CommentsSection.vue'
import GoalLegend from '../components/GoalLegend.vue'
import LikeButton from '../components/LikeButton.vue'
import ShotPath from '../components/ShotPath.vue'
import ShotPlayer from '../components/ShotPlayer.vue'
import { useAdmin } from '../composables/useAdmin'
import { useEditTokens } from '../composables/useEditTokens'
import { useOrientation } from '../composables/useOrientation'
import { computeAfter } from '../domain/situation'
import type { Situation } from '../domain/types'
import { likedSlugs } from '../lib/likes'
import { copyToClipboard, shareSituation, situationUrl } from '../lib/share'
import { adminDeleteSituation, deleteSituation, getSituation } from '../lib/situations'
import { formatDate } from '../lib/format'

const route = useRoute()
const router = useRouter()
const tokens = useEditTokens()
const admin = useAdmin()
const orientation = useOrientation()

const slug = String(route.params.slug)
const situation = ref<Situation | null>(null)
const loading = ref(true)
const loadError = ref(false)
const view = ref<'before' | 'after' | 'play'>('play')
const notice = ref<string | null>(route.query.bewaard === '1' ? 'Bewaard. Deel de link.' : null)
const deleting = ref(false)
const liked = ref(false)

const ownToken = computed(() => tokens.get(slug))
/** Own situations (edit token on this device) or any situation for an admin. */
const canEdit = computed(() => ownToken.value !== null || admin.isAdmin.value)
const url = computed(() => situationUrl(slug))
const before = computed(() => situation.value?.data.before ?? [])
const shot = computed(() => situation.value?.data.shot ?? { playedBallId: '', movements: [] })
const after = computed(() => (situation.value ? computeAfter(before.value, shot.value) : []))
const ballById = (id: string) => before.value.find((b) => b.id === id)

const views = [
  { id: 'before', label: 'Voor' },
  { id: 'after', label: 'Na' },
  { id: 'play', label: 'Afspelen' },
] as const

onMounted(async () => {
  // In parallel with the situation itself, so the heart is filled in right away.
  likedSlugs([slug])
    .then((set) => (liked.value = set.has(slug)))
    .catch((e) => console.error(e))
  try {
    situation.value = await getSituation(slug)
  } catch (e) {
    loadError.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
})

function onLikeChange(value: boolean, count: number) {
  liked.value = value
  if (situation.value) situation.value.likeCount = count
}

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
  if (!canEdit.value || !window.confirm('Deze situatie verwijderen? Dit kan niet ongedaan gemaakt worden.')) return
  deleting.value = true
  try {
    const token = ownToken.value
    const ok = token ? await deleteSituation(slug, token) : await adminDeleteSituation(slug)
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
  <main class="mx-auto max-w-6xl px-4 pt-5 pb-12">
    <p v-if="loading" class="text-muted">Laden…</p>

    <template v-else-if="!situation">
      <h1 class="font-display text-3xl font-bold tracking-wide uppercase">{{ loadError ? 'Er ging iets mis' : 'Situatie niet gevonden' }}</h1>
      <p class="mt-2 text-muted">
        {{ loadError ? 'De situatie kon niet geladen worden. Probeer later opnieuw.' : 'Deze link bestaat niet (meer). Controleer of je de volledige link gekopieerd hebt.' }}
      </p>
      <RouterLink to="/" class="mt-4 inline-block font-semibold text-felt underline">Naar alle situaties</RouterLink>
    </template>

    <template v-else>
      <div
        v-if="notice"
        class="mb-3 rounded-md border border-felt/30 bg-felt-tint px-3 py-2 text-sm font-semibold text-felt-dark"
        role="status"
      >
        {{ notice }}
      </div>

      <header class="mb-4 flex flex-wrap items-start gap-x-6 gap-y-3">
        <div class="min-w-0 flex-1">
          <RouterLink to="/" class="text-sm font-semibold text-felt hover:underline">← Alle situaties</RouterLink>
          <h1 class="mt-1 text-2xl leading-tight font-bold sm:text-3xl">{{ situation.title }}</h1>
          <p class="mt-1 text-sm text-muted">{{ situation.authorName || 'Anoniem' }} · {{ formatDate(situation.createdAt) }}</p>
          <p v-if="situation.description" class="mt-2 max-w-prose whitespace-pre-line">{{ situation.description }}</p>
        </div>
        <LikeButton :slug="slug" :count="situation.likeCount" :liked="liked" class="sm:mt-6" @change="onLikeChange" />
      </header>

      <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <section class="min-w-0">
          <div class="mb-3 inline-flex rounded-md border border-line bg-white p-0.5 shadow-sm" role="radiogroup" aria-label="Weergave">
            <button
              v-for="v in views"
              :key="v.id"
              type="button"
              role="radio"
              class="rounded px-4 py-1.5 text-sm font-semibold transition-colors"
              :class="view === v.id ? 'bg-felt text-white' : 'text-muted hover:text-felt'"
              :aria-checked="view === v.id"
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
            <GoalLegend :orientation="orientation" class="mt-2" />
          </div>
        </section>

        <aside class="flex flex-wrap content-start gap-2 md:flex-col">
          <button type="button" class="rounded-md bg-felt px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-felt-dark" @click="onShare">
            Delen
          </button>
          <button type="button" class="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-paper" @click="onCopy">
            Link kopiëren
          </button>
          <template v-if="canEdit">
            <p v-if="!ownToken" class="w-full pt-2 text-xs font-semibold tracking-wide text-muted uppercase">Beheer (admin)</p>
            <RouterLink
              :to="{ name: 'situation-edit', params: { slug } }"
              class="rounded-md border border-line bg-white px-4 py-2 text-center text-sm font-semibold hover:bg-paper"
            >
              Bewerken
            </RouterLink>
            <button
              type="button"
              class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
              :disabled="deleting"
              @click="onDelete"
            >
              {{ deleting ? 'Bezig met verwijderen…' : 'Verwijderen' }}
            </button>
          </template>
        </aside>
      </div>

      <div class="max-w-3xl">
        <CommentsSection
          :slug="slug"
          :situation-id="situation.id"
          :is-admin="admin.isAdmin.value"
          @count="(n) => situation && (situation.commentCount = n)"
        />
      </div>
    </template>
  </main>
</template>
