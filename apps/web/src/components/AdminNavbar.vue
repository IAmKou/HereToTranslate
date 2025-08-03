<template>
  <nav class="admin-navbar">
    <div class="navbar-container">
      <!-- Brand Section -->
      <div class="navbar-brand">
        <div class="brand-info">
          <span v-if="currentUser" class="username">{{ currentUser.username }}</span>
          <span v-else class="username">Admin</span>
          <div class="role-badge">
            <i class="pi pi-shield"></i>
            <span>Administrator</span>
          </div>
        </div>
      </div>

      <div class="navbar-menu">
        <div class="navbar-start">
          <!-- Quick Actions -->
          <div class="quick-actions">
            <router-link to="/admin/notifications" class="action-btn notification-link" title="Notification Management">
              <i class="pi pi-bell"></i>
              <span class="notification-badge" v-if="notificationCount > 0">{{ notificationCount }}</span>
            </router-link>

            <button class="action-btn" @click="showSystemStatus = !showSystemStatus" title="System Status">
              <i class="pi pi-server"></i>
              <span class="status-indicator" :class="systemStatus"></span>
            </button>
          </div>
        </div>

        <div class="navbar-end">
          <div v-if="!currentUser" class="navbar-item">
            <router-link to="/login" class="button is-primary">Sign In</router-link>
          </div>
          <div v-else class="user-menu" style="position: relative;">
            <Button
              @click="menuVisible = !menuVisible"
              aria-haspopup="menu"
              :aria-expanded="menuVisible"
              class="avatar-button"
              aria-label="Open admin menu"
            >
              <template v-if="currentUser.avatarUrl">
                <img :src="getFullAvatarUrl(currentUser.avatarUrl)" alt="Avatar" class="navbar-avatar-img" />
              </template>
              <template v-else>
                <Avatar
                  :label="getInitials(currentUser.fullName)"
                  size="large"
                  shape="circle"
                  :style="{ backgroundColor: getRandomColor(currentUser.username), boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #e0e7ef' }"
                />
              </template>
            </Button>
            <transition name="fade-scale">
              <div
                v-if="menuVisible"
                class="user-dropdown-menu admin-dropdown"
                tabindex="-1"
                @keydown.esc="menuVisible = false"
              >
                <!-- User Info -->
                <div class="user-info">
                  <template v-if="currentUser.avatarUrl">
                    <img :src="getFullAvatarUrl(currentUser.avatarUrl)" alt="Avatar" class="dropdown-avatar-img" />
                  </template>
                  <template v-else>
                    <div class="avatar-initials" :style="{ background: getRandomColor(currentUser.username) }">
                      {{ getInitials(currentUser.fullName) }}
                    </div>
                  </template>
                  <div>
                    <div class="user-name">{{ currentUser.fullName }}</div>
                    <div class="user-username">@{{ currentUser.username }}</div>
                    <div class="user-role">Administrator</div>
                  </div>
                </div>

                <div class="menu-section">
                  <div class="menu-header">Admin Actions</div>
                  <router-link to="/adminhome" class="menu-item" tabindex="0">
                    <i class="pi pi-home"></i> Dashboard <span class="shortcut">⌘D</span>
                  </router-link>
                  <router-link to="/admin/users" class="menu-item" tabindex="0">
                    <i class="pi pi-users"></i> User Management <span class="shortcut">⌘U</span>
                  </router-link>
                  <router-link to="/admin/notifications" class="menu-item" tabindex="0">
                    <i class="pi pi-bell"></i> Notification Management <span class="shortcut">⌘N</span>
                  </router-link>
                  <router-link to="/admin/settings" class="menu-item" tabindex="0">
                    <i class="pi pi-cog"></i> System Settings <span class="shortcut">⌘S</span>
                  </router-link>
                </div>

                <div class="menu-divider"></div>

                <div class="menu-section">
                  <div class="menu-header">Account</div>
                  <router-link to="/userprofile" class="menu-item" tabindex="0">
                    <i class="pi pi-user"></i> View Profile <span class="shortcut"></span>
                  </router-link>
                  <router-link to="/settings" class="menu-item" tabindex="0">
                    <i class="pi pi-cog"></i> Settings <span class="shortcut"></span>
                  </router-link>
                </div>

                <div class="menu-divider"></div>

                <div class="menu-section">
                  <div class="menu-header">System</div>
                  <div class="menu-item" tabindex="0" @click="openSystemLogs">
                    <i class="pi pi-file-text"></i> System Logs <span class="shortcut">⌘L</span>
                  </div>
                  <div class="menu-item" tabindex="0" @click="openBackup">
                    <i class="pi pi-database"></i> Backup & Restore <span class="shortcut">⌘B</span>
                  </div>
                </div>

                <div class="menu-divider"></div>

                <div class="menu-section">
                  <div class="menu-item sign-out" tabindex="0" @click="signOut">
                    <i class="pi pi-sign-out"></i> Sign Out <span class="shortcut">⌘Q</span>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>



    <!-- System Status Panel -->
    <transition name="slide-down">
      <div v-if="showSystemStatus" class="system-status-panel">
        <div class="panel-header">
          <h3>System Status</h3>
          <button @click="showSystemStatus = false" class="close-btn">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-label">CPU Usage</div>
            <div class="status-value">{{ systemMetrics.cpu }}%</div>
            <div class="status-bar">
              <div class="status-fill" :style="{ width: systemMetrics.cpu + '%' }"></div>
            </div>
          </div>
          <div class="status-item">
            <div class="status-label">Memory Usage</div>
            <div class="status-value">{{ systemMetrics.memory }}%</div>
            <div class="status-bar">
              <div class="status-fill" :style="{ width: systemMetrics.memory + '%' }"></div>
            </div>
          </div>
          <div class="status-item">
            <div class="status-label">Disk Usage</div>
            <div class="status-value">{{ systemMetrics.disk }}%</div>
            <div class="status-bar">
              <div class="status-fill" :style="{ width: systemMetrics.disk + '%' }"></div>
            </div>
          </div>
          <div class="status-item">
            <div class="status-label">Active Users</div>
            <div class="status-value">{{ systemMetrics.activeUsers }}</div>
          </div>
        </div>
      </div>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import { adminNotificationService } from '../services/admin-notification.service';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: {
    id: number;
    name: string;
  };
  isActive: boolean;
  phone?: string;
  createdAt: string;
  avatarUrl?: string;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  activeUsers: number;
}

const router = useRouter();
const menuVisible = ref(false);
const showSystemStatus = ref(false);
const currentUser = ref<User | null>(null);
const notificationCount = ref(0);

const systemMetrics = ref<SystemMetrics>({
  cpu: 65,
  memory: 72,
  disk: 45,
  activeUsers: 127
});

const loadNotificationCount = async () => {
  try {
    const response = await adminNotificationService.getGlobalNotificationCount();
    notificationCount.value = response.count;
  } catch (error) {
    console.error('Error loading notification count:', error);
  }
};
const systemStatus = computed(() => {
  const avgUsage = (systemMetrics.value.cpu + systemMetrics.value.memory) / 2;
  if (avgUsage > 80) return 'critical';
  if (avgUsage > 60) return 'warning';
  return 'normal';
});

const signOut = async () => {
  await authService.logout();
  currentUser.value = null;
  router.push('/login');
  menuVisible.value = false;
};

const getInitials = (name: string): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
};

const getRandomColor = (seed: string): string => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];
  const index = seed.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};



const openSystemLogs = () => {
  router.push('/admin/logs');
  menuVisible.value = false;
};

const openBackup = () => {
  router.push('/admin/backup');
  menuVisible.value = false;
};

const loadUserInfo = async (): Promise<void> => {
  try {
    const user = await authService.getCurrentUser();
    if (user) {
      currentUser.value = user;
    } else {
      currentUser.value = null;
    }
  } catch (error) {
    console.error('Error loading user info:', error);
    currentUser.value = null;
  }
};

const getFullAvatarUrl = (avatarUrl: string) => {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';
  return base + avatarUrl;
};

onMounted(() => {
  loadUserInfo();
  loadNotificationCount();

  // Refresh notification count every 30 seconds
  setInterval(loadNotificationCount, 30000);

  document.addEventListener('sign-out', async () => {
    try {
      await authService.logout();
      currentUser.value = null;
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });
});
</script>

<style scoped>
.admin-navbar {
  background: linear-gradient(90deg, #1e293b 0%, #334155 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background 0.3s;
  border-bottom: 1px solid #475569;
}

.navbar-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.brand-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}

.role-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(45deg, #dc2626, #ef4444);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.navbar-start {
  display: flex;
  gap: 12px;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  text-decoration: none;
}

.action-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #f8fafc;
}

.notification-link {
  color: #cbd5e1 !important;
  text-decoration: none !important;
}

.notification-link:hover {
  color: #f8fafc !important;
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #1e293b;
}

.status-indicator.normal { background: #10b981; }
.status-indicator.warning { background: #f59e0b; }
.status-indicator.critical { background: #ef4444; }

.user-menu {
  position: relative;
}

.avatar-button {
  padding: 2px;
  border-radius: 50%;
  transition: background-color 0.15s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.avatar-button:hover {
  background-color: rgba(255,255,255,0.1);
}

:deep(.p-avatar) {
  width: 36px;
  height: 36px;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.navbar-avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e7ef;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.dropdown-avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.2);
}

.fade-scale-enter-active, .fade-scale-leave-active {
  transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-4px);
}

.user-dropdown-menu {
  position: absolute;
  right: 0;
  top: 48px;
  min-width: 280px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  z-index: 1001;
  padding: 0;
  overflow: hidden;
}

.admin-dropdown {
  min-width: 320px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(90deg, #1e293b 0%, #334155 100%);
  color: white;
}

.avatar-initials {
  width: 40px;
  height: 40px;
  font-size: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  border: 2px solid rgba(255,255,255,0.2);
}

.user-name {
  font-size: 14px;
  font-weight: 600;
}
.user-username {
  font-size: 12px;
  opacity: 0.8;
}
.user-role {
  font-size: 11px;
  background: rgba(220,38,38,0.8);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 2px;
  display: inline-block;
}

.menu-section {
  padding: 8px 0;
}
.menu-header {
  font-size: 11px;
  padding: 6px 16px 2px 16px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.menu-item {
  text-decoration: none !important;
  color: inherit !important;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  min-height: 36px;
  border-radius: 8px;
  margin: 0 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.18s, color 0.18s, transform 0.12s;
  outline: none;
}
.menu-item:hover, .menu-item:focus-visible {
  background: #f3f4f6;
  color: #dc2626;
  transform: scale(1.02);
  text-decoration: none !important;
}
.menu-divider {
  border-top: 1px solid #f0f0f0;
  margin: 8px 0;
}
.shortcut {
  color: #9ca3af;
  font-size: 12px;
  font-weight: 400;
  margin-left: auto;
}
.sign-out {
  background: rgba(255,59,48,0.08);
  color: #ff3b30;
  font-weight: 700;
}
.sign-out:hover, .sign-out:focus-visible {
  background: rgba(255,59,48,0.16);
}

/* Notifications Panel */
.notifications-panel, .system-status-panel {
  position: absolute;
  top: 100%;
  right: 24px;
  width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  z-index: 1002;
  max-height: 500px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-icon.info { background: #dbeafe; color: #2563eb; }
.notification-icon.warning { background: #fef3c7; color: #d97706; }
.notification-icon.error { background: #fee2e2; color: #dc2626; }
.notification-icon.success { background: #d1fae5; color: #059669; }

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 2px;
}

.notification-message {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 11px;
  color: #9ca3af;
}

/* System Status Panel */
.status-grid {
  padding: 16px;
  display: grid;
  gap: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.status-value {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.status-bar {
  height: 4px;
  background: #f3f4f6;
  border-radius: 2px;
  overflow: hidden;
}

.status-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Transitions */
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .notifications-panel, .system-status-panel {
    width: calc(100vw - 48px);
    right: 24px;
  }

  .user-dropdown-menu {
    min-width: calc(100vw - 48px);
    right: 0;
  }
}
</style>
