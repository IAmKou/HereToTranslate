<template>
  <aside
    class="sidebar"
    :class="{ 'sidebar-hidden': isCollapsed }"
  >
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <img src="../assets/logo.png" alt="Logo" class="logo-img" />
      </div>
      <button class="collapse-btn" @click="toggleSidebar">
        <span class="material-icons">{{ isCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
      </button>
    </div>

    <nav class="sidebar-menu">
      <router-link to="/userhome" class="menu-item" exact-active-class="active">
        <span class="material-icons">dashboard</span>
        <span class="menu-text">Dashboard</span>
      </router-link>
      <router-link to="/projects" class="menu-item">
        <span class="material-icons">work</span>
        <span class="menu-text">Project</span>
      </router-link>
      <router-link to="/user-home/settings" class="menu-item">
        <span class="material-icons">settings</span>
        <span class="menu-text">Settings</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <router-link to="/userprofile" class="menu-item profile-link">
        <div class="profile-avatar">
          <span class="material-icons">person</span>
        </div>
        <span class="menu-text">Profile</span>
      </router-link>
      <router-link to="/help" class="menu-item">
        <span class="material-icons">help_outline</span>
        <span class="menu-text">Help & Support</span>
      </router-link>
    </div>
  </aside>
  <button
    v-if="isCollapsed"
    class="sidebar-open-btn"
    @click="toggleSidebar"
    aria-label="Mở sidebar"
  >
    <span class="material-icons">chevron_right</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isCollapsed = ref(false);

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  transition: transform 0.3s cubic-bezier(.4,0,.2,1);
  z-index: 1100;
  box-shadow: 2px 0 8px rgba(0,0,0,0.04);
  transform: translateX(0);
}
.sidebar-hidden {
  transform: translateX(-100%);
}
.sidebar-header {
  padding: 1.5rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.logo-img {
  height: 100px;
  width: auto;
  transition: height 0.3s cubic-bezier(.4,0,.2,1);
}
.collapse-btn {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}
.collapse-btn:hover {
  background: #f3f4f6;
  color: #2563eb;
}
.sidebar-menu {
  flex: 1;
  padding: 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: #6b7280;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s;
  position: relative;
  overflow: visible;
}
.menu-item .material-icons {
  font-size: 1.35rem;
  min-width: 24px;
  margin-right: 1rem;
  transition: color 0.2s, transform 0.2s;
}
.menu-item:hover .material-icons {
  color: #2563eb;
  transform: scale(1.1);
}
.menu-text {
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.3s, margin 0.3s;
}
.menu-item:hover {
  background: #f3f4f6;
  color: #2563eb;
  box-shadow: 0 2px 8px rgba(37,99,235,0.04);
  transform: translateX(2px);
}
.menu-item.active {
  background: linear-gradient(90deg, #2563eb 80%, #1e40af 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.08);
}
.menu-item.active .material-icons {
  color: #fff;
}
.sidebar-footer {
  padding: 1rem 0.5rem;
  border-top: 1px solid #e5e7eb;
}
.profile-link {
  margin-bottom: 0.5rem;
}
.profile-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
}
.profile-avatar .material-icons {
  font-size: 1.25rem;
  color: #6b7280;
}
.sidebar-open-btn {
  position: fixed;
  top: 24px;
  left: 12px;
  z-index: 1200;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(37,99,235,0.12);
  cursor: pointer;
  transition: background 0.2s;
}
.sidebar-open-btn:hover {
  background: #1e40af;
}
</style>
