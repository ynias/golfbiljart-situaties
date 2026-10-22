<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAdmin } from '../composables/useAdmin'
import type { Situation } from '../domain/types'
import { adminDeleteComment, listRecentComments, type RecentComment } from '../lib/comments'
import { formatDate } from '../lib/format'
import { adminDeleteSituation, listSituations } from '../lib/situations'

const admin = useAdmin()
const checking = ref(true)

// ---- login ----------------------------------------------------------------------------
const email = ref('')
const password = ref('')
const signingIn = ref(false)
const loginError = ref<string | null>(null)

async function onSignIn() {
  if (signingIn.value) return
  signingIn.value = true
  loginError.value = null
  const result = await admin.signIn(email.value, password.value)
  signingIn.value = false
  password.value = ''
  if (result === 'invalid') loginError.value = 'E-mailadres of wachtwoord klopt niet.'
  if (result === 'not-admin') loginError.value = 'Dit account heeft geen beheerrechten.'
}

// ---- management -----------------------------------------------------------------------
const tab = ref<'situations' | 'comments'>('situations')
const search = ref('')
const situations = ref<Situation[]>([])
const comments = ref<RecentComment[]>([])
const loadingData = ref(false)
const dataError = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function loadData() {
  loadingData.value = true
  dataError.value = false
  try {
    ;[situations.value, comments.value] = await Promise.all([
      listSituations({ search: search.value, limit: 200 }),
      listRecentComments(100),
    ])
  } catch (e) {
    dataError.value = true
    console.error(e)
  } finally {
    loadingData.value = false
  }
}

onMounted(async () => {
  await admin.ready
  checking.value = false
  if (admin.isAdmin.value) await loadData()
})

watch(admin.isAdmin, (isAdmin) => {
  if (isAdmin) void loadData()
})

watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(loadData, 300)
})

async function onDeleteSituation(s: Situation) {
  if (!window.confirm(`“${s.title}” verwijderen, met alle likes en reacties? Dit kan niet ongedaan gemaakt worden.`)) return
  try {
    if (await adminDeleteSituation(s.slug)) {
      situations.value = situations.value.filter((x) => x.slug !== s.slug)
      comments.value = comments.value.filter((c) => c.situationSlug !== s.slug)
    }
  } catch (e) {
    window.alert('Verwijderen is mislukt.')
    console.error(e)
  }
}

async function onDeleteComment(c: RecentComment) {
  if (!window.confirm(`Reactie van ${c.authorName} verwijderen?`)) return
  try {
    if (await adminDeleteComment(c.id)) comments.value = comments.value.filter((x) => x.id !== c.id)
  } catch (e) {
    window.alert('Verwijderen is mislukt.')
    console.error(e)
  }
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 pt-6 pb-12">
    <p v-if="checking" class="text-muted">Laden…</p>

    <!-- Login -->
    <section v-else-if="!admin.isAdmin.value" class="mx-auto max-w-sm">
      <h1 class="font-display text-4xl leading-none font-bold tracking-wide uppercase">Beheer</h1>
      <p class="mt-1.5 text-muted">Log in met je beheerdersaccount.</p>
      <form class="mt-5 space-y-4 rounded-lg border border-line bg-white p-4 shadow-sm" @submit.prevent="onSignIn">
        <div>
          <label for="admin-email" class="block text-sm font-semibold">E-mailadres</label>
          <input
            id="admin-email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
            class="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-chalk focus:outline-none"
          />
        </div>
        <div>
          <label for="admin-password" class="block text-sm font-semibold">Wachtwoord</label>
          <input
            id="admin-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-chalk focus:outline-none"
          />
        </div>
        <p v-if="loginError" class="text-sm font-semibold text-red-700" role="alert">{{ loginError }}</p>
        <button
          type="submit"
          class="w-full rounded-md bg-felt px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-felt-dark disabled:opacity-50"
          :disabled="signingIn"
        >
          {{ signingIn ? 'Bezig met inloggen…' : 'Inloggen' }}
        </button>
        <button v-if="admin.email.value" type="button" class="w-full text-sm font-semibold text-muted underline" @click="admin.signOut()">
          Uitloggen ({{ admin.email.value }})
        </button>
      </form>
    </section>

    <!-- Management -->
    <template v-else>
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div class="min-w-0">
          <h1 class="font-display text-4xl leading-none font-bold tracking-wide uppercase">Beheer</h1>
          <p class="mt-1.5 text-muted">
            Ingelogd als {{ admin.email.value }} ·
            <button type="button" class="font-semibold text-felt underline" @click="admin.signOut()">Uitloggen</button>
          </p>
        </div>
        <div class="inline-flex rounded-md border border-line bg-white p-0.5 shadow-sm sm:ml-auto" role="tablist" aria-label="Onderdeel">
          <button
            type="button"
            role="tab"
            :aria-selected="tab === 'situations'"
            class="rounded px-4 py-1.5 text-sm font-semibold"
            :class="tab === 'situations' ? 'bg-felt text-white' : 'text-muted hover:text-felt'"
            @click="tab = 'situations'"
          >
            Situaties ({{ situations.length }})
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="tab === 'comments'"
            class="rounded px-4 py-1.5 text-sm font-semibold"
            :class="tab === 'comments' ? 'bg-felt text-white' : 'text-muted hover:text-felt'"
            @click="tab = 'comments'"
          >
            Reacties ({{ comments.length }})
          </button>
        </div>
      </div>

      <p v-if="dataError" class="mt-6 text-red-700">
        Gegevens konden niet geladen worden.
        <button type="button" class="font-semibold underline" @click="loadData">Opnieuw proberen</button>
      </p>

      <!-- Situations -->
      <section v-else-if="tab === 'situations'" class="mt-5">
        <input
          v-model="search"
          type="search"
          placeholder="Zoek op titel"
          aria-label="Zoek op titel"
          class="mb-3 w-full rounded-md border border-line bg-white px-3 py-2 shadow-sm focus:border-chalk focus:outline-none sm:w-80"
        />
        <p v-if="loadingData && situations.length === 0" class="text-muted">Laden…</p>
        <p v-else-if="situations.length === 0" class="text-muted">Geen situaties gevonden.</p>
        <ul v-else class="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <li v-for="s in situations" :key="s.slug" class="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
            <div class="min-w-0 flex-1">
              <RouterLink :to="{ name: 'situation', params: { slug: s.slug } }" class="font-semibold hover:text-felt hover:underline">
                {{ s.title }}
              </RouterLink>
              <p class="text-xs text-muted">
                {{ s.authorName || 'Anoniem' }} · {{ formatDate(s.createdAt) }} · {{ s.likeCount }}
                {{ s.likeCount === 1 ? 'like' : 'likes' }} · {{ s.commentCount }} {{ s.commentCount === 1 ? 'reactie' : 'reacties' }}
              </p>
            </div>
            <div class="flex gap-2">
              <RouterLink
                :to="{ name: 'situation-edit', params: { slug: s.slug } }"
                class="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-paper"
              >
                Bewerken
              </RouterLink>
              <button
                type="button"
                class="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
                @click="onDeleteSituation(s)"
              >
                Verwijderen
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Comments -->
      <section v-else class="mt-5">
        <p v-if="loadingData && comments.length === 0" class="text-muted">Laden…</p>
        <p v-else-if="comments.length === 0" class="text-muted">Nog geen reacties.</p>
        <ul v-else class="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <li v-for="c in comments" :key="c.id" class="flex flex-wrap items-start gap-x-4 gap-y-2 px-3 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted">
                <span class="font-semibold text-rail">{{ c.authorName }}</span> · {{ formatDate(c.createdAt) }} · op
                <RouterLink :to="{ name: 'situation', params: { slug: c.situationSlug } }" class="font-semibold text-felt hover:underline">
                  {{ c.situationTitle }}
                </RouterLink>
              </p>
              <p class="mt-0.5 whitespace-pre-line">{{ c.body }}</p>
            </div>
            <button
              type="button"
              class="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
              @click="onDeleteComment(c)"
            >
              Verwijderen
            </button>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>
