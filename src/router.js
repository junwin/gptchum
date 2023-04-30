import { createRouter, createWebHistory } from 'vue-router'
import Chat from './components/Chat.vue'
import Prompts from './components/Prompts.vue'


const routes = [
  { path: '/static', component: Chat },
  { path: '/static/prompts', component: Prompts },
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
