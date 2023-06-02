import { createRouter, createWebHistory } from 'vue-router'
import Chat from './components/Chat.vue'
import Chat2 from './components/Chat2.vue'
import ChatScrolling from './components/ChatScrolling.vue'
import Prompts from './components/Prompts.vue'



const routes = [
  { path: '/static', component: Chat },
  { path: '/static/chat-scrolling', component: ChatScrolling },
  { path: '/static/prompts', component: Prompts },
  { path: '/static/chat2', component: Chat2 },
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
