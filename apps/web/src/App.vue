<template>
  <div class="app-layout">
    <AppHeader />
    <Navbar />
    <div class="main-container">
      <!-- <Sidebar /> -->
      <div class="router-container">
        <router-view />
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/Header.vue'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-container {
  display: flex;
  flex: 1;
}

.router-container {
  flex: 1;
  padding: 1.5rem;
  background-color: #f9f9f9;
}
</style>
