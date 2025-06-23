<template>
  <aside class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
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
        <span class="tooltip">Dashboard</span>
      </router-link>

      <router-link to="/projects" class="menu-item">
        <span class="material-icons">work</span>
        <span class="menu-text">Project</span>
        <span class="tooltip">Project</span>
      </router-link>

      <router-link to="/user-home/settings" class="menu-item">
        <span class="material-icons">settings</span>
        <span class="menu-text">Settings</span>
        <span class="tooltip">Settings</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <router-link to="/userprofile" class="menu-item profile-link">
        <div class="profile-avatar">
          <span class="material-icons">person</span>
        </div>
        <span class="menu-text">Profile</span>
        <span class="tooltip">Profile</span>
      </router-link>

      <router-link to="/help" class="menu-item">
        <span class="material-icons">help_outline</span>
        <span class="menu-text">Help & Support</span>
        <span class="tooltip">Help & Support</span>
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
  width: 260px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  transition: all 0.3s ease;
  z-index: 1000;
}

.sidebar-collapsed {
  width: 70px;
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
  transition: all 0.3s ease;
}

.sidebar-collapsed .logo-img {
  height: 32px;
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
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: #f3f4f6;
  color: #374151;
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
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
}

.menu-item .material-icons {
  font-size: 1.25rem;
  min-width: 24px;
  margin-right: 1rem;
}

.menu-text {
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.sidebar-collapsed .menu-text {
  opacity: 0;
}

.menu-item:hover {
  background: #f3f4f6;
  color: #374151;
}

.menu-item.active {
  background: #2563eb;
  color: #ffffff;
}

.tooltip {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  background: #ffffff;
  color: #374151;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
}

.sidebar-collapsed .menu-item:hover .tooltip {
  opacity: 1;
  visibility: visible;
  left: calc(100% + 10px);
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

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar-collapsed {
    transform: translateX(0);
  }
}
</style>
