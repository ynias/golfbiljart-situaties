<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SituationEditor from '../components/SituationEditor.vue'
import { useEditTokens } from '../composables/useEditTokens'
import type { Situation } from '../domain/types'
import { getSituation, updateSituation, type SituationInput } from '../lib/situations'

const route = useRoute()
const router = useRouter()
const tokens = useEditTokens()
const slug = String(route.params.slug)
const token = tokens.get(slug)

const situation = ref<Situation | null>(null)
const loading = ref(true)
const notFound = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

onMounted(async () => {
  if (!token) {
    await router.replace({ name: 'situation', params: { slug } })
    return
  }
  try {
    situation.value = await getSituation(slug)
    notFound.value = situation.value === null
  } finally {
    loading.value = false
  }
})

async function onSave(input: SituationInput) {
  if (!token) return
  saving.value = true
  saveError.value = null
  try {
    const ok = await updateSituation(slug, token, input)
    if (!ok) {
      saveError.value = 'Je kan deze situatie niet bewerken vanaf dit toestel.'
      return
    }
    await router.push({ name: 'situation', params: { slug }, query: { bewaard: '1' } })
  } catch (e) {
    saveError.value = 'Bewaren is mislukt. Probeer opnieuw.'
    console.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main v-if="loading" class="p-4 text-gray-600">Laden…</main>
  <main v-else-if="notFound" class="mx-auto max-w-3xl p-4">
    <h1 class="text-xl font-semibold">Situatie niet gevonden</h1>
    <p class="mt-2 text-gray-600">Deze link bestaat niet (meer).</p>
    <RouterLink to="/" class="mt-4 inline-block text-emerald-800 underline">Naar de galerij</RouterLink>
  </main>
  <SituationEditor v-else-if="situation" :initial="situation" :saving="saving" :save-error="saveError" @save="onSave" />
</template>
