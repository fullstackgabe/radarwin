import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import HojeView from '@/views/HojeView.vue'
import SemanaView from '@/views/SemanaView.vue'
import EventoView from '@/views/EventoView.vue'
import AjustesView from '@/views/AjustesView.vue'
import ConnectView from '@/views/ConnectView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/hoje' },
    { path: '/hoje', name: 'hoje', component: HojeView, meta: { title: 'Hoje', tab: true } },
    { path: '/semana', name: 'semana', component: SemanaView, meta: { title: 'Semana', tab: true } },
    { path: '/evento/:code', name: 'evento', component: EventoView, meta: { title: 'Notícia' } },
    { path: '/ajustes', name: 'ajustes', component: AjustesView, meta: { title: 'Ajustes' } },
    { path: '/conectar', name: 'conectar', component: ConnectView, meta: { title: 'Conectar' } },
    { path: '/:pathMatch(.*)*', redirect: '/hoje' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready || !auth.loggedIn) return true
  const profile = useProfileStore()
  if (!profile.ready) await profile.load()
  if (profile.subscribed === false) return true
  if (!profile.verified && to.path !== '/conectar') return '/conectar'
  if (profile.verified && to.path === '/conectar' && !to.query.redo) return '/hoje'
  return true
})
