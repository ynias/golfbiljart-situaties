<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAdmin } from '../composables/useAdmin'

const route = useRoute()
const admin = useAdmin()
const onEditor = computed(() => route.name === 'new-situation' || route.name === 'situation-edit')

const links = [
  { to: '/', name: 'home', label: 'Alle situaties', short: 'Alle' },
  { to: '/mijn', name: 'mine', label: 'Mijn situaties', short: 'Mijn' },
] as const
</script>

<template>
  <!-- A slice of the table: dark rail on top, cloth band with a cushion edge underneath. -->
  <header class="border-t-4 border-b-4 border-t-rail border-b-cushion bg-felt text-white">
    <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
      <RouterLink to="/" class="flex items-center gap-2.5 rounded" aria-label="Golfbiljart situaties, naar het overzicht">
        <span class="relative block h-7 w-11 shrink-0" aria-hidden="true">
          <span class="absolute top-0.5 left-0 h-6 w-6 rounded-full border border-red-950/40 bg-ball-red shadow" />
          <span class="absolute top-0.5 left-4 h-6 w-6 rounded-full border border-stone-500/40 bg-ball-white shadow" />
        </span>
        <span class="font-display text-xl leading-none font-bold tracking-wide uppercase sm:text-2xl">
          Golfbiljart <span class="font-semibold text-white/70">situaties</span>
        </span>
      </RouterLink>

      <nav class="ml-auto flex items-center gap-1 text-sm sm:gap-2" aria-label="Hoofdmenu">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="link.to"
          class="rounded px-2 py-1.5 font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-3"
          :class="{ 'bg-white/15 text-white': route.name === link.name }"
          :aria-current="route.name === link.name ? 'page' : undefined"
        >
          <span class="sm:hidden">{{ link.short }}</span>
          <span class="hidden sm:inline">{{ link.label }}</span>
        </RouterLink>
        <RouterLink
          v-if="admin.isAdmin.value"
          to="/admin"
          class="rounded px-2 py-1.5 font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-3"
          :class="{ 'bg-white/15 text-white': route.name === 'admin' }"
          :aria-current="route.name === 'admin' ? 'page' : undefined"
        >
          Beheer
        </RouterLink>
        <RouterLink
          v-if="!onEditor"
          to="/nieuw"
          class="ml-1 inline-flex items-center gap-1.5 rounded bg-ball-white px-3 py-1.5 font-semibold text-felt-dark shadow-sm transition-colors hover:bg-white"
        >
          <span aria-hidden="true" class="text-base leading-none">+</span>
          <span class="sm:hidden">Nieuw</span>
          <span class="hidden sm:inline">Nieuwe situatie</span>
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
