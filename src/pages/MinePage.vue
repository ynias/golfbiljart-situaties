<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SituationCard from '../components/SituationCard.vue'
import { useEditTokens } from '../composables/useEditTokens'
import type { Situation } from '../domain/types'
import { listSituationsBySlugs } from '../lib/situations'

const tokens = useEditTokens()
const situations = ref<Situation[]>([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    situations.value = await listSituationsBySlugs(tokens.slugs())
  } catch (e) {
    error.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="mx-auto max-w-5xl p-4">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold">Mijn situaties</h1>
      <nav class="ml-auto flex items-center gap-3 text-sm">
        <RouterLink to="/" class="text-emerald-800 underline">Alle situaties</RouterLink>
        <RouterLink to="/nieuw" class="rounded bg-emerald-700 px-3 py-2 font-medium text-white hover:bg-emerald-800">
          Nieuwe situatie
        </RouterLink>
      </nav>
    </header>
    <p class="mb-4 text-sm text-gray-600">Situaties die je op dit toestel gemaakt hebt. Enkel hier kan je ze bewerken of verwijderen.</p>

    <p v-if="loading" class="text-gray-600">Laden…</p>
    <p v-else-if="error" class="text-red-700">De situaties konden niet geladen worden.</p>
    <p v-else-if="situations.length === 0" class="text-gray-600">Nog geen situaties op dit toestel.</p>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SituationCard v-for="s in situations" :key="s.slug" :situation="s" />
    </div>
  </main>
</template>
