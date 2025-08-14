<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <AdminNavbar />
    <div class="main-content">
      <AdminSidebar v-model:collapsed="isSidebarCollapsed" />
      <div class="content">
        <div class="admin-notification-view">
          <!-- Header Section -->
          <div class="page-header">
            <div class="header-content">
              <div class="header-left">
                <div class="header-icon">
                  <i class="pi pi-bell"></i>
                </div>
                <div class="header-text">
                  <h1>Notification Management</h1>
                  <p class="subtitle">Create and manage global notifications for all users in the system</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-section">
            <AdminNotificationManager />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdminNavbar from '../components/AdminNavbar.vue'
import AdminSidebar from '../components/AdminSidebar.vue'
import AdminNotificationManager from '../components/AdminNotificationManager.vue'

// Sidebar state management
const isSidebarCollapsed = ref(false)
</script>

<style scoped>
/* Layout Structure */
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8fafc;
}

.main-content {
  display: flex;
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.2s cubic-bezier(.4,0,.2,1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
}

.content {
  flex: 1;
  background: #f8fafc;
  min-height: calc(100vh - 70px);
}

/* Admin Notification View */
.admin-notification-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Page Header */
.page-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  padding: 32px 40px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
}

.header-icon i {
  font-size: 28px;
  color: white;
}

.header-text h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.header-text .subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
  max-width: 600px;
}

/* Main Section */
.main-section {
  flex: 1;
  padding: 0;
  background: transparent;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .main-content {
    margin-left: 72px;
  }

  .layout-wrapper.sidebar-collapsed .main-content {
    margin-left: 0;
  }

  .page-header {
    padding: 24px 32px;
  }

  .header-left {
    gap: 16px;
  }

  .header-icon {
    width: 56px;
    height: 56px;
  }

  .header-icon i {
    font-size: 24px;
  }

  .header-text h1 {
    font-size: 28px;
  }

  .header-text .subtitle {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }

  .page-header {
    padding: 20px 24px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
  }

  .header-icon i {
    font-size: 20px;
  }

  .header-text h1 {
    font-size: 24px;
  }

  .header-text .subtitle {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 16px 20px;
  }

  .header-text h1 {
    font-size: 20px;
  }

  .header-text .subtitle {
    font-size: 13px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: light) {
  .layout-wrapper {
    background: #0f172a;
  }

  .content {
    background: #0f172a;
  }

  .page-header {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-bottom-color: #334155;
  }

  .header-text h1 {
    color: #f8fafc;
  }

  .header-text .subtitle {
    color: #94a3b8;
  }
}
</style>
