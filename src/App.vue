<template>
  <div class="card">
    <h1>AI Assistant</h1>
    <TabMenu :model="items" />
    <div class="container">
      <router-view />
    </div>
  </div>
</template>


<script>
import Chat from "./components/Chat.vue";
import Chat2 from "./components/Chat2.vue";
import Prompts from "./components/Prompts.vue";
import ChatScrolling from './components/ChatScrolling.vue'


export default {
  components: {
    Chat,
    Prompts,
    ChatScrolling,
    Chat2

  },
  data() {
    return {
      active: 2,
      items: [
        {
          label: "Chat",
          icon: "pi pi-fw pi-home",
          to: "/static",
        },
        {
          label: "ChatScrolling",
          icon: "pi pi-fw pi-home",
          to: "/static/chat-scrolling",
        },
        {
          label: "Prompts",
          icon: "pi pi-box",
          to: "/static/prompts",
        },
        {
          label: "Chat2",
          icon: "pi pi-box",
          to: "/static/chat2",
        },
      ],
    };
  },
  methods: {},
};
</script>

<style scoped>
.card {
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}
</style>
