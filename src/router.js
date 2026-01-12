import { createRouter, createWebHistory } from 'vue-router'
import Chat2 from './components/Chat2.vue'

const routes = [
  { path: '/static/chat2', component: Chat2 },
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
