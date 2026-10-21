<script setup lang="ts">
import BallToken from './BallToken.vue'
import BilliardTable from './BilliardTable.vue'
import type { Situation } from '../domain/types'
import { formatDate } from '../lib/format'

defineProps<{ situation: Situation }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'situation', params: { slug: situation.slug } }"
    class="block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
  >
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
    <div class="p-3">
      <h2 class="truncate font-medium">{{ situation.title }}</h2>
      <p class="text-xs text-gray-600">{{ situation.authorName || 'Anoniem' }} · {{ formatDate(situation.createdAt) }}</p>
    </div>
  </RouterLink>
</template>
