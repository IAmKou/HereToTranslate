<template>
  <aside :class="['sidebar', { 'sidebar-collapsed': isCollapsed }]">
    <div class="sidebar-header">
      <button class="collapse-btn" @click="toggleSidebar" aria-label="Toggle sidebar">
        <span class="material-icons">menu</span>
      </button>
      <img src="../assets/logo.png" alt="Logo" class="sidebar-logo" />
    </div>
    <nav class="sidebar-menu">
      <router-link to="/userhome" class="menu-item" exact-active-class="active" :title="isCollapsed ? 'Dashboard' : ''">
        <span class="material-icons">home</span>
        <span class="menu-text">Home</span>
      </router-link>
      <router-link to="/projects" class="menu-item" :title="isCollapsed ? 'Project' : ''">
        <span class="material-icons">work</span>
        <span class="menu-text">Project</span>
      </router-link>
      <router-link to="/my-requests" class="menu-item" :title="isCollapsed ? 'My Requests' : ''">
        <span class="material-icons">description</span>
        <span class="menu-text">My Requests</span>
      </router-link>
      <router-link to="/all-requests" class="menu-item" :title="isCollapsed ? 'Public Requests' : ''">
        <span class="material-icons">public</span>
        <span class="menu-text">Public Requests</span>
      </router-link>
      <div class="sidebar-divider"></div>
      <router-link to="/user-home/settings" class="menu-item" :title="isCollapsed ? 'Settings' : ''">
        <span class="material-icons">settings</span>
        <span class="menu-text">Settings</span>
      </router-link>
    </nav>
    <div class="sidebar-footer">
      <router-link to="/userprofile" class="menu-item profile-link" :title="isCollapsed ? 'Profile' : ''">
        <span class="material-icons">person</span>
        <span class="menu-text">Profile</span>
      </router-link>
      <router-link to="/help" class="menu-item" :title="isCollapsed ? 'Help & Support' : ''">
        <span class="material-icons">help_outline</span>
        <span class="menu-text">Help & Support</span>
      </router-link>
    </div>
  </aside>
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
  width: 240px;
  background: #fff;
  border-right: 1px solid #eee;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  transition: width 0.2s cubic-bezier(.4,0,.2,1);
  z-index: 1100;
  box-shadow: 2px 0 8px rgba(0,0,0,0.04);
}
.sidebar-collapsed {
  width: 72px;
}
.sidebar-header {
  padding: 1.25rem 1rem 1rem 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border-bottom: 1px solid #eee;
}
.sidebar-logo {
  height: 80px;
  width: 80px;
  border-radius: 8px;
  object-fit: contain;
  margin: 0;
  display: block;
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
  margin-right: 0;
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
  gap: 0.25rem;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  color: #222;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s;
  position: relative;
  overflow: visible;
  gap: 14px;
}
.menu-item .material-icons {
  font-size: 22px;
  min-width: 22px;
  margin-right: 0;
  transition: color 0.2s, transform 0.2s;
}
.menu-item .menu-text {
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.2s, margin 0.2s;
}
.sidebar-collapsed .menu-text {
  opacity: 0;
  width: 0;
  margin: 0;
  pointer-events: none;
}
.menu-item:hover, .menu-item.active {
  background: #f1f1f1;
  color: #c00;
}
.menu-item.active .material-icons,
.menu-item:hover .material-icons {
  color: #c00;
}
.sidebar-divider {
  height: 1px;
  background: #eee;
  margin: 12px 0;
}
.sidebar-footer {
  padding: 1rem 0.5rem;
  border-top: 1px solid #eee;
  margin-top: auto;
}
.profile-link {
  margin-bottom: 0.5rem;
}
.sidebar-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f3f4f6;
  object-fit: cover;
  margin-right: 0.75rem;
  border: 1px solid #eee;
}
.sidebar-collapsed .sidebar-avatar {
  margin-right: 0;
}
</style>
