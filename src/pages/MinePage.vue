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
  <main class="mx-auto max-w-6xl px-4 pt-6 pb-12">
    <h1 class="font-display text-4xl leading-none font-bold tracking-wide uppercase">Mijn situaties</h1>
    <p class="mt-1.5 mb-6 text-muted">Situaties die je op dit toestel gemaakt hebt. Enkel hier kan je ze bewerken of verwijderen.</p>

    <p v-if="loading" class="text-muted">Laden…</p>
    <p v-else-if="error" class="text-red-700">De situaties konden niet geladen worden.</p>
    <div v-else-if="situations.length === 0" class="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <p class="font-semibold">Nog geen situaties op dit toestel.</p>
      <RouterLink to="/nieuw" class="mt-4 inline-block rounded-md bg-felt px-4 py-2 font-semibold text-white hover:bg-felt-dark">
        Nieuwe situatie
      </RouterLink>
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SituationCard v-for="s in situations" :key="s.slug" :situation="s" />
    </div>
  </main>
</template>
