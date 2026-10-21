import { createRouter, createWebHistory } from 'vue-router'
import { isValidSlug } from './lib/slug'
import EditSituationPage from './pages/EditSituationPage.vue'
import HomePage from './pages/HomePage.vue'
import MinePage from './pages/MinePage.vue'
import NewSituationPage from './pages/NewSituationPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'
import SituationPage from './pages/SituationPage.vue'
import TablePreviewPage from './pages/TablePreviewPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/nieuw', name: 'new-situation', component: NewSituationPage },
    { path: '/mijn', name: 'mine', component: MinePage },
    {
      path: '/s/:slug',
      name: 'situation',
      component: SituationPage,
      beforeEnter: (to) => (isValidSlug(String(to.params.slug)) ? true : { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }),
    },
    {
      path: '/s/:slug/bewerken',
      name: 'situation-edit',
      component: EditSituationPage,
      beforeEnter: (to) => (isValidSlug(String(to.params.slug)) ? true : { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }),
    },
    { path: '/tafel', name: 'table-preview', component: TablePreviewPage },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage },
  ],
})
