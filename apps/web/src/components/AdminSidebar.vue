<template>
  <aside :class="['admin-sidebar', { 'sidebar-collapsed': isCollapsed }]">
    <div class="sidebar-header">
      <button class="collapse-btn" @click="toggleSidebar" aria-label="Toggle sidebar">
        <span class="material-icons">menu</span>
      </button>
      <img v-if="!isCollapsed" src="../assets/logo.png" alt="Logo" class="sidebar-logo" />
      <div class="admin-badge" v-if="!isCollapsed">
        <span class="badge-text">ADMIN</span>
      </div>
    </div>

    <nav class="sidebar-menu">
      <!-- Dashboard Section -->
      <div class="menu-section">
        <h3 class="section-title" v-if="!isCollapsed">Dashboard</h3>
        <router-link to="/adminhome" class="menu-item" exact-active-class="active" :title="isCollapsed ? 'Admin Dashboard' : ''">
          <span class="material-icons">dashboard</span>
          <span class="menu-text">Dashboard</span>
        </router-link>
      </div>

      <!-- User Management Section -->
      <div class="menu-section">
        <h3 class="section-title" v-if="!isCollapsed">User Management</h3>
        <router-link to="/admin/users" class="menu-item" :title="isCollapsed ? 'User Management' : ''">
          <span class="material-icons">people</span>
          <span class="menu-text">Users</span>
        </router-link>
      </div>

      <!-- Content Management Section -->
      <div class="menu-section">
        <h3 class="section-title" v-if="!isCollapsed">Content</h3>
        <router-link to="/category" class="menu-item" :title="isCollapsed ? 'Categories' : ''">
          <span class="material-icons">category</span>
          <span class="menu-text">Categories</span>
        </router-link>

      </div>

      <!-- System Section -->
      <div class="menu-section">
        <h3 class="section-title" v-if="!isCollapsed">System</h3>
        <router-link to="/admin/transactions" class="menu-item" :title="isCollapsed ? 'Transaction History' : ''">
          <span class="material-icons">history</span>
          <span class="menu-text">Transaction History</span>
        </router-link>

        <router-link to="/admin/notifications" class="menu-item" :title="isCollapsed ? 'Notification Management' : ''">
          <span class="material-icons">notifications</span>
          <span class="menu-text">Notifications</span>
        </router-link>

        <router-link to="/admin/review" class="menu-item" :title="isCollapsed ? 'Admin Review' : ''">
          <span class="material-icons">gavel</span>
          <span class="menu-text">Admin Review</span>
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, defineEmits, defineProps, watch } from 'vue';

const props = defineProps({
  collapsed: Boolean
});
const emit = defineEmits(['update:collapsed']);

const isCollapsed = ref(props.collapsed);

watch(() => props.collapsed, (val) => {
  isCollapsed.value = val;
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  emit('update:collapsed', isCollapsed.value);
};
</script>

<style scoped>
.admin-sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
  border-right: 1px solid #475569;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  transition: width 0.2s cubic-bezier(.4,0,.2,1);
  z-index: 1100;
  box-shadow: 2px 0 8px rgba(0,0,0,0.15);
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
  border-bottom: 1px solid #475569;
  position: relative;
}

.sidebar-logo {
  height: 48px;
  width: 48px;
  border-radius: 8px;
  object-fit: contain;
  margin: 0;
  display: block;
  background: rgba(255,255,255,0.1);
  padding: 4px;
}

.admin-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(45deg, #dc2626, #ef4444);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.collapse-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
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
  background: rgba(255,255,255,0.1);
  color: #f8fafc;
}

.sidebar-menu {
  flex: 1;
  padding: 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.menu-section {
  margin-bottom: 1rem;
}

.section-title {
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 0.5rem 0.75rem;
  padding: 0.25rem 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  gap: 14px;
}

.menu-item .material-icons {
  font-size: 20px;
  min-width: 20px;
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

.menu-item:hover {
  background: rgba(255,255,255,0.1);
  color: #f8fafc;
  transform: translateX(2px);
}

.menu-item.active {
  background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(220,38,38,0.3);
}

.menu-item.active .material-icons {
  color: white;
}

.sidebar-footer {
  padding: 1rem 0.5rem;
  border-top: 1px solid #475569;
  margin-top: auto;
}

.profile-link {
  margin-bottom: 0.5rem;
}

.sidebar-badge {
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.98rem;
  font-weight: 700;
  margin-left: 8px;
  display: inline-block;
  min-width: 28px;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .admin-sidebar {
    width: 72px;
  }

  .sidebar-collapsed {
    width: 72px;
  }
}
</style>
