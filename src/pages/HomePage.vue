<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import SituationCard from '../components/SituationCard.vue'
import type { Situation } from '../domain/types'
import { listSituations } from '../lib/situations'

const situations = ref<Situation[]>([])
const search = ref('')
const loading = ref(true)
const error = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  error.value = false
  try {
    situations.value = await listSituations({ search: search.value })
  } catch (e) {
    error.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(load, 300)
})
</script>

<template>
  <main class="mx-auto max-w-5xl p-4">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold">Golfbiljart situaties</h1>
      <nav class="ml-auto flex items-center gap-3 text-sm">
        <RouterLink to="/mijn" class="text-emerald-800 underline">Mijn situaties</RouterLink>
        <RouterLink to="/nieuw" class="rounded bg-emerald-700 px-3 py-2 font-medium text-white hover:bg-emerald-800">
          Nieuwe situatie
        </RouterLink>
      </nav>
    </header>

    <label class="block">
      <span class="sr-only">Zoeken op titel</span>
      <input
        v-model="search"
        type="search"
        placeholder="Zoek op titel…"
        class="w-full rounded border border-gray-300 px-3 py-2"
      />
    </label>

    <p v-if="loading" class="mt-4 text-gray-600">Laden…</p>
    <p v-else-if="error" class="mt-4 text-red-700">De situaties konden niet geladen worden.</p>
    <p v-else-if="situations.length === 0" class="mt-4 text-gray-600">
      {{ search ? 'Geen situaties gevonden.' : 'Nog geen situaties. Maak de eerste!' }}
    </p>
    <div v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SituationCard v-for="s in situations" :key="s.slug" :situation="s" />
    </div>
  </main>
</template>
