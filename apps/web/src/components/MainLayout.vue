<script setup lang="ts">
import { ref } from 'vue';
import TopNavbar from './TopNavbar.vue';
import Sidebar from './Sidebar.vue';
import Footer from './Footer.vue';

const sidebarVisible = ref(true);

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value;
};
</script>

<template>
  <div class="layout-wrapper">
    <TopNavbar @toggle-sidebar="toggleSidebar" />
    <Sidebar :visible="sidebarVisible" />

    <div class="layout-main" :class="{ 'layout-main-active': !sidebarVisible }">
      <div class="layout-content">
        <slot></slot>
      </div>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.layout-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.layout-main {
  margin-left: 20rem;
  margin-top: 4rem;
  min-height: calc(100vh - 4rem);
  transition: margin-left 0.3s;
  background: var(--surface-ground);
}

.layout-main-active {
  margin-left: 0;
}

.layout-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 991px) {
  .layout-main {
    margin-left: 0;
  }
}
</style>
