<script setup lang="ts">
import BilliardTable from '../components/BilliardTable.vue'
import type { Orientation } from '../table/geometry'
import type { ThemeName } from '../table/themes'

const variants: { orientation: Orientation; theme: ThemeName; label: string }[] = [
  { orientation: 'portrait', theme: 'teal', label: 'Staand · blauwgroen' },
  { orientation: 'portrait', theme: 'green', label: 'Staand · groen' },
  { orientation: 'landscape', theme: 'teal', label: 'Liggend · blauwgroen' },
  { orientation: 'landscape', theme: 'green', label: 'Liggend · groen' },
]
</script>

<template>
  <main class="mx-auto max-w-5xl p-4">
    <h1 class="mb-4 text-xl font-semibold">Tafel</h1>
    <div class="grid gap-8 md:grid-cols-2">
      <section v-for="v in variants" :key="v.label">
        <h2 class="mb-2 text-sm text-gray-600">{{ v.label }}</h2>
        <div :class="v.orientation === 'portrait' ? 'mx-auto max-w-sm' : ''">
          <BilliardTable :orientation="v.orientation" :theme="v.theme" />
        </div>
      </section>
    </div>
  </main>
</template>
