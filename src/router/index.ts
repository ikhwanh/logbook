import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LogbookView from '@/views/LogbookView.vue'
import SettingsView from '@/views/SettingsView.vue'

// Hash history lets the app run from any static host without SPA rewrite rules.
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/logbook/:id', name: 'logbook', component: LogbookView, props: true },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})

export default router
