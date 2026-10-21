<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SituationEditor from '../components/SituationEditor.vue'
import { useEditTokens } from '../composables/useEditTokens'
import { createSituation, type SituationInput } from '../lib/situations'

const router = useRouter()
const tokens = useEditTokens()
const saving = ref(false)
const saveError = ref<string | null>(null)

async function onSave(input: SituationInput) {
  saving.value = true
  saveError.value = null
  try {
    const { slug, editToken } = await createSituation(input)
    tokens.set(slug, editToken)
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
  <SituationEditor :saving="saving" :save-error="saveError" @save="onSave" />
</template>
