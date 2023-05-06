<template>
  <div class="card">
    <h1>AI Assistant</h1>
    <TabMenu :model="items" />
    <router-view />
  </div>
</template>

<script>
import Chat from "./components/Chat.vue";
import Prompts from "./components/Prompts.vue";

export default {
  components: {
    Chat,
    Prompts,
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
          label: "Prompts",
          icon: "pi pi-box",
          to: "/static/prompts",
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
</style>
