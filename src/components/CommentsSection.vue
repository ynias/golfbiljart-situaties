<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { MAX_COMMENT_AUTHOR_LENGTH, MAX_COMMENT_LENGTH, hasErrors, validateComment, type CommentErrors } from '../domain/comment'
import type { SituationComment } from '../domain/types'
import { addComment, adminDeleteComment, listComments } from '../lib/comments'
import { formatDate } from '../lib/format'

const props = defineProps<{ slug: string; situationId: string; isAdmin: boolean }>()
const emit = defineEmits<{ (e: 'count', count: number): void }>()

const NAME_KEY = 'comment_author_name'

const comments = ref<SituationComment[]>([])
const loading = ref(true)
const loadError = ref(false)
const form = reactive({ authorName: readName(), body: '' })
const errors = ref<CommentErrors>({})
const sending = ref(false)
const sendError = ref<string | null>(null)

const count = computed(() => comments.value.length)

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function rememberName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* not important */
  }
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    comments.value = await listComments(props.situationId)
    emit('count', comments.value.length)
  } catch (e) {
    loadError.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onSubmit() {
  errors.value = validateComment(form)
  if (hasErrors(errors.value) || sending.value) return
  sending.value = true
  sendError.value = null
  try {
    const comment = await addComment(props.slug, form)
    comments.value = [...comments.value, comment]
    emit('count', comments.value.length)
    rememberName(form.authorName.trim())
    form.body = ''
  } catch (e) {
    sendError.value = 'Je reactie kon niet geplaatst worden. Probeer het zo meteen opnieuw.'
    console.error(e)
  } finally {
    sending.value = false
  }
}

async function onDelete(comment: SituationComment) {
  if (!window.confirm(`Reactie van ${comment.authorName} verwijderen?`)) return
  try {
    if (await adminDeleteComment(comment.id)) {
      comments.value = comments.value.filter((c) => c.id !== comment.id)
      emit('count', comments.value.length)
    }
  } catch (e) {
    window.alert('Verwijderen is mislukt.')
    console.error(e)
  }
}
</script>

<template>
  <section aria-labelledby="comments-title" class="mt-8">
    <h2 id="comments-title" class="font-display text-2xl font-bold tracking-wide uppercase">
      Reacties <span v-if="!loading && !loadError" class="text-muted">{{ count }}</span>
    </h2>
    <p class="mt-1 text-sm text-muted">Hoe zou jij deze situatie spelen? Laat je feedback achter.</p>

    <p v-if="loading" class="mt-4 text-sm text-muted">Reacties laden…</p>
    <p v-else-if="loadError" class="mt-4 text-sm text-red-700">
      De reacties konden niet geladen worden.
      <button type="button" class="font-semibold underline" @click="load">Opnieuw proberen</button>
    </p>
    <p v-else-if="count === 0" class="mt-4 text-sm text-muted">Nog geen reacties. Geef als eerste je mening.</p>
    <ol v-else class="mt-4 space-y-3">
      <li v-for="c in comments" :key="c.id" class="rounded-lg border border-line bg-white p-3 shadow-sm">
        <div class="flex items-baseline gap-2">
          <span class="font-semibold">{{ c.authorName }}</span>
          <span class="text-xs text-muted">{{ formatDate(c.createdAt) }}</span>
          <button
            v-if="isAdmin"
            type="button"
            class="ml-auto rounded px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-50"
            @click="onDelete(c)"
          >
            Verwijderen
          </button>
        </div>
        <p class="mt-1 whitespace-pre-line">{{ c.body }}</p>
      </li>
    </ol>

    <form class="mt-5 space-y-3 rounded-lg border border-line bg-white p-4 shadow-sm" novalidate @submit.prevent="onSubmit">
      <h3 class="font-semibold">Reageer</h3>
      <div>
        <label for="comment-name" class="block text-sm font-semibold">Je naam</label>
        <input
          id="comment-name"
          v-model="form.authorName"
          type="text"
          :maxlength="MAX_COMMENT_AUTHOR_LENGTH"
          autocomplete="name"
          class="mt-1 w-full rounded-md border px-3 py-2 focus:border-chalk focus:outline-none sm:max-w-xs"
          :class="errors.authorName ? 'border-red-500' : 'border-line'"
          :aria-invalid="!!errors.authorName"
        />
        <p v-if="errors.authorName" class="mt-1 text-sm text-red-700">{{ errors.authorName }}</p>
      </div>
      <div>
        <label for="comment-body" class="block text-sm font-semibold">Je feedback</label>
        <textarea
          id="comment-body"
          v-model="form.body"
          rows="4"
          :maxlength="MAX_COMMENT_LENGTH"
          placeholder="bv. Ik zou rood 1 eerst via de korte band spelen."
          class="mt-1 w-full rounded-md border px-3 py-2 focus:border-chalk focus:outline-none"
          :class="errors.body ? 'border-red-500' : 'border-line'"
          :aria-invalid="!!errors.body"
        />
        <div class="mt-1 flex justify-between gap-2 text-sm">
          <p class="text-red-700">{{ errors.body }}</p>
          <p class="text-xs text-muted">{{ form.body.length }}/{{ MAX_COMMENT_LENGTH }}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          class="rounded-md bg-felt px-4 py-2 font-semibold text-white shadow-sm hover:bg-felt-dark disabled:opacity-50"
          :disabled="sending"
        >
          {{ sending ? 'Bezig met plaatsen…' : 'Reactie plaatsen' }}
        </button>
        <p v-if="sendError" class="text-sm text-red-700" role="alert">{{ sendError }}</p>
      </div>
    </form>
  </section>
</template>
