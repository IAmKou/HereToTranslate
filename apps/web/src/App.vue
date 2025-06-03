<template>
  <div class="container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// no need to import anything, Vue Router handles it
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  font-family: Arial, sans-serif;
}
</style>
