<template>
  <aside :class="['sidebar', { collapsed: isCollapsed }]">
    <div class="sidebar-logo">
      <button class="collapse-btn" @click="toggleSidebar">
        <span class="material-icons">
          {{ isCollapsed ? 'chevron_right' : 'menu' }}
        </span>
      </button>
      <img v-if="!isCollapsed" src="../assets/logo.png" alt="Logo" class="logo-img" />
    </div>
    <nav class="sidebar-menu">
      <router-link v-for="item in menuItems" :key="item.path" :to="item.path" class="menu-item" exact-active-class="active">
        <span class="material-icons">{{ item.icon }}</span>
        <span v-if="!isCollapsed">{{ item.label }}</span>
      </router-link>
    </nav>
    <div class="sidebar-bottom">
      <router-link to="/whats-new" class="menu-item">
        <span class="material-icons">new_releases</span>
        <span v-if="!isCollapsed">What's New</span>
      </router-link>
      <router-link to="/help" class="menu-item">
        <span class="material-icons">help_outline</span>
        <span v-if="!isCollapsed">Help & Support</span>
      </router-link>
    </div>
    <!-- Debug: -->
    <!-- <div>{{ isCollapsed }}</div> -->
  </aside>
</template>

<script setup>
import { ref } from 'vue';

const isCollapsed = ref(false);
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const menuItems = [
  { path: '/', icon: 'home', label: 'Home' },
  { path: '/todo', icon: 'check_circle', label: 'To Do' },
  { path: '/managers', icon: 'group', label: 'Managers' },
  { path: '/translation-memories', icon: 'history_edu', label: 'Translation Memories' },
  { path: '/glossaries', icon: 'menu_book', label: 'Glossaries' },
  { path: '/machine-translation', icon: 'smart_toy', label: 'Machine Translation' },
  { path: '/ai', icon: 'psychology', label: 'AI' },
  { path: '/vendors', icon: 'storefront', label: 'Vendors' },
  { path: '/store', icon: 'shopping_cart', label: 'Store' },
];
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css?family=Inter:400,500,600,700&display=swap');
.sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
  transition: width 0.2s;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 8px 16px 8px;
}
.logo-img {
  height: 80px;
  width: auto;
  display: block;
  margin: 0 auto 12px auto;
}
.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 8px;
  color: #2563eb;
  font-size: 28px;
  padding: 4px;
  border-radius: 50%;
  transition: background 0.2s;
}
.collapse-btn:hover {
  background: #f3f4f6;
}
.sidebar.collapsed .logo-img {
  display: none;
}
.sidebar-menu, .sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  color: #374151;
  text-decoration: none;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s, color 0.2s;
  letter-spacing: 0.01em;
}
.menu-item .material-icons {
  font-size: 22px;
  color: #9ca3af;
}
.menu-item.active, .menu-item.router-link-exact-active {
  background: #f3f4f6;
  color: #2563eb;
  font-weight: 700;
}
.menu-item.active .material-icons, .menu-item.router-link-exact-active .material-icons {
  color: #2563eb;
}
.menu-item:hover {
  background: #f3f4f6;
  color: #2563eb;
}
.menu-item:hover .material-icons {
  color: #2563eb;
}
.sidebar.collapsed .menu-item span:not(:first-child) {
  display: none;
}
.sidebar-bottom {
  margin-top: auto;
  padding-bottom: 16px;
}
</style>
