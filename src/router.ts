import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import TablePreviewPage from './pages/TablePreviewPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/tafel', name: 'table-preview', component: TablePreviewPage },
  ],
})
