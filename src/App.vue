<template>
  <div class="card">
    <h1>AI Assistant</h1>
    <div class="container">
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  name: "App",
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
