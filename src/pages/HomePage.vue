<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import SituationCard from '../components/SituationCard.vue'
import type { Situation } from '../domain/types'
import { listSituations, type SituationSort } from '../lib/situations'

const situations = ref<Situation[]>([])
const search = ref('')
const sort = ref<SituationSort>('new')
const loading = ref(true)
const error = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  error.value = false
  try {
    situations.value = await listSituations({ search: search.value, sort: sort.value })
  } catch (e) {
    error.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(sort, load)
watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(load, 300)
})
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 pt-6 pb-12">
    <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div class="min-w-0">
        <h1 class="font-display text-4xl leading-none font-bold tracking-wide uppercase">Situaties</h1>
        <p class="mt-1.5 text-muted">Teken een stand, toon de stoot en deel hem met je club.</p>
      </div>
      <label class="relative w-full sm:ml-auto sm:w-80">
        <span class="sr-only">Zoeken op titel</span>
        <svg class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" stroke-linecap="round" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Zoek op titel"
          class="w-full rounded-md border border-line bg-white py-2 pr-3 pl-9 shadow-sm placeholder:text-muted/70 focus:border-chalk focus:outline-none"
        />
      </label>
    </div>

    <div v-if="!loading && !error && situations.length > 0" class="mt-6 mb-3 flex flex-wrap items-center gap-3">
      <p class="text-sm text-muted" aria-live="polite">
        {{ situations.length }} {{ situations.length === 1 ? 'situatie' : 'situaties' }}{{ search ? ` voor “${search}”` : '' }}
      </p>
      <div class="ml-auto inline-flex rounded-md border border-line bg-white p-0.5 text-sm shadow-sm" role="radiogroup" aria-label="Sorteren">
        <button
          v-for="o in [{ id: 'new', label: 'Nieuwste' }, { id: 'popular', label: 'Meeste likes' }] as const"
          :key="o.id"
          type="button"
          role="radio"
          :aria-checked="sort === o.id"
          class="rounded px-3 py-1 font-semibold transition-colors"
          :class="sort === o.id ? 'bg-felt text-white' : 'text-muted hover:text-felt'"
          @click="sort = o.id"
        >
          {{ o.label }}
        </button>
      </div>
    </div>

    <!-- Loading: placeholder cards in the shape of the real ones -->
    <div v-if="loading" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Situaties laden">
      <div v-for="i in 3" :key="i" class="overflow-hidden rounded-lg border border-line bg-white">
        <div class="aspect-[2.1/1.1] animate-pulse bg-felt/15" />
        <div class="space-y-2 p-3">
          <div class="h-4 w-3/4 animate-pulse rounded bg-line" />
          <div class="h-3 w-1/2 animate-pulse rounded bg-line/70" />
        </div>
      </div>
    </div>

    <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-white p-6 text-center">
      <p class="font-semibold">De situaties konden niet geladen worden.</p>
      <p class="mt-1 text-sm text-muted">Controleer je internetverbinding en probeer opnieuw.</p>
      <button type="button" class="mt-4 rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-paper" @click="load">
        Opnieuw proberen
      </button>
    </div>

    <div v-else-if="situations.length === 0" class="mt-6 rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <template v-if="search">
        <p class="font-semibold">Geen situaties gevonden voor “{{ search }}”.</p>
        <button type="button" class="mt-3 text-sm font-semibold text-felt underline underline-offset-2" @click="search = ''">
          Toon alle situaties
        </button>
      </template>
      <template v-else>
        <p class="font-semibold">Nog geen situaties.</p>
        <p class="mt-1 text-sm text-muted">Zet de ballen op tafel en teken de eerste stoot.</p>
        <RouterLink to="/nieuw" class="mt-4 inline-block rounded-md bg-felt px-4 py-2 font-semibold text-white hover:bg-felt-dark">
          Nieuwe situatie
        </RouterLink>
      </template>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SituationCard v-for="s in situations" :key="s.slug" :situation="s" />
    </div>
  </main>
</template>
