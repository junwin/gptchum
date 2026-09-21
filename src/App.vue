<template>
  <div class="card">
    <h1>AI Assistant</h1>
    <div class="container">
      <Chat2 />
    </div>
  </div>
</template>

<script>
import Chat2 from './components/Chat2.vue'

export default {
  name: "App",
  components: { Chat2 },
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
