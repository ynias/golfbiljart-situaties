<script setup lang="ts">
import { computed } from 'vue'
import BallToken from './BallToken.vue'
import BilliardTable from './BilliardTable.vue'
import { summarize } from '../domain/situation'
import type { Situation } from '../domain/types'
import { formatDate } from '../lib/format'

const props = defineProps<{ situation: Situation }>()

const summary = computed(() => summarize(props.situation.data.before, props.situation.data.shot))
</script>

<template>
  <RouterLink
    :to="{ name: 'situation', params: { slug: situation.slug } }"
    class="group flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-felt/40 hover:shadow-md"
  >
    <div class="bg-rail">
      <BilliardTable orientation="landscape">
        <BallToken
          v-for="b in situation.data.before"
          :key="b.id"
          :color="b.color"
          :number="b.number"
          :position="b.position"
          orientation="landscape"
          :state="b.id === situation.data.shot.playedBallId ? 'selected' : 'idle'"
        />
      </BilliardTable>
    </div>
    <div class="flex flex-1 flex-col gap-2 p-3">
      <h2 class="line-clamp-2 leading-snug font-semibold group-hover:text-felt">{{ situation.title }}</h2>
      <ul class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted" aria-label="Samenvatting">
        <li v-if="summary.white" class="inline-flex items-center gap-1">
          <span class="h-2.5 w-2.5 rounded-full border border-stone-400 bg-ball-white" aria-hidden="true" />
          {{ summary.white }} wit
        </li>
        <li v-if="summary.red" class="inline-flex items-center gap-1">
          <span class="h-2.5 w-2.5 rounded-full bg-ball-red" aria-hidden="true" />
          {{ summary.red }} rood
        </li>
        <li>{{ summary.movements }} {{ summary.movements === 1 ? 'beweging' : 'bewegingen' }}</li>
        <li v-if="summary.scored" class="font-semibold text-felt">{{ summary.scored }} gescoord</li>
      </ul>
      <div class="mt-auto flex items-center gap-3 text-xs text-muted">
        <p class="min-w-0 truncate">{{ situation.authorName || 'Anoniem' }} · {{ formatDate(situation.createdAt) }}</p>
        <p class="ml-auto inline-flex shrink-0 items-center gap-1" :aria-label="`${situation.likeCount} likes`">
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 17.5s-6.5-4.1-6.5-8.6A3.6 3.6 0 0 1 10 6.6a3.6 3.6 0 0 1 6.5 2.3c0 4.5-6.5 8.6-6.5 8.6Z"
              :fill="situation.likeCount ? 'var(--color-ball-red)' : 'none'"
              :stroke="situation.likeCount ? 'var(--color-ball-red)' : 'currentColor'"
              stroke-width="1.8"
            />
          </svg>
          {{ situation.likeCount }}
        </p>
        <p class="inline-flex shrink-0 items-center gap-1" :aria-label="`${situation.commentCount} reacties`">
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M3.5 4.5h13v9h-7l-4 3v-3h-2z" stroke-linejoin="round" />
          </svg>
          {{ situation.commentCount }}
        </p>
      </div>
    </div>
  </RouterLink>
</template>
