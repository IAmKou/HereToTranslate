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
            <button class="action-btn notification-btn" @click="toggleNotificationsModal" title="System Notifications">
              <i class="pi pi-bell"></i>
              <span class="notification-badge" v-if="unreadNotificationCount > 0">{{ unreadNotificationCount }}</span>
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
                </div>

                <div class="menu-divider"></div>

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





    <!-- Notifications Modal -->
    <transition name="slide-down">
      <div v-if="showNotificationsModal" class="notifications-panel">
        <div class="panel-header">
          <h3>System Notifications</h3>
          <div class="header-actions">
            <button @click="markAllAsRead" class="mark-all-read-btn" title="Mark all as read">
              <i class="pi pi-check-double"></i>
            </button>
            <button @click="showNotificationsModal = false" class="close-btn">
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>

        <div v-if="loadingNotifications" class="loading-state">
          <i class="pi pi-spinner pi-spin"></i> Loading notifications...
        </div>

        <div v-else-if="systemNotifications.length === 0" class="empty-state">
          <i class="pi pi-bell-slash"></i>
          <p>No system notifications</p>
        </div>

        <div v-else class="notifications-list">
          <div
            v-for="notification in systemNotifications"
            :key="notification.id"
            class="notification-item"
            :class="{ 'unread': !notification.isRead }"
            @click="markAsRead(notification.id)"
          >
            <div class="notification-icon" :class="notification.type">
              <i :class="getNotificationIcon(notification.type)"></i>
            </div>
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
              <div class="notification-time">{{ formatNotificationTime(notification.timestamp) }}</div>
            </div>
            <div class="notification-actions">
              <button @click.stop="deleteNotification(notification.id)" class="delete-btn" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <router-link to="/admin/notifications" class="view-all-link">
            <i class="pi pi-external-link"></i>
            View All Notifications
          </router-link>
        </div>
      </div>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import { adminNotificationService } from '../services/admin-notification.service';
import axios from '../utils/axios';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
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

interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system' | 'withdrawal' | 'request';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isGlobal: boolean;
}

// Removed SystemMetrics as system status feature was deleted

const router = useRouter();
const menuVisible = ref(false);
const showNotificationsModal = ref(false);
const currentUser = ref<User | null>(null);
const notificationCount = ref(0);
const unreadNotificationCount = ref(0);
const systemNotifications = ref<SystemNotification[]>([]);
const loadingNotifications = ref(false);
let adminSocket: Socket | null = null;

// Removed system status feature

// Simple notification handling - no real-time complexity
const setupNotifications = () => {
  console.log('🔌 Setting up simple system notifications...');
};

const cleanupNotifications = () => {
  console.log('🔌 Cleaning up simple system notifications...');
};

const loadNotificationCount = async () => {
  try {
    // Admin bell shows admin alerts: pending requests + pending withdrawals
    const [reqCountRes, pendingWithdrawalsRes] = await Promise.all([
      axios.get('/requests/pending/count'),
      axios.get('/admin/transactions', { params: { status: 'Pending', type: 'WITHDRAWAL' } })
    ]);
    const pendingRequests = reqCountRes?.data?.count ?? 0;
    const pendingWithdrawals = Array.isArray(pendingWithdrawalsRes?.data) ? pendingWithdrawalsRes.data.length : 0;
    const total = Number(pendingRequests) + Number(pendingWithdrawals);
    notificationCount.value = total;
    unreadNotificationCount.value = total;
  } catch (error) {
    console.error('Error loading notification count:', error);
  }
};
// System status removed

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



// Removed system logs and backup handlers

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

const formatNotificationTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
};

const getNotificationIcon = (type: SystemNotification['type']) => {
  switch (type) {
    case 'info':
      return 'pi pi-info-circle';
    case 'warning':
      return 'pi pi-exclamation-triangle';
    case 'error':
      return 'pi pi-times-circle';
    case 'success':
      return 'pi pi-check-circle';
    case 'system':
      return 'pi pi-server';
    default:
      return 'pi pi-info-circle';
  }
};

const markAsRead = async (notificationId: string) => {
  // Local-only read marker for admin global notifications
  const notification = systemNotifications.value.find((n: SystemNotification) => n.id === notificationId);
  if (notification && !notification.isRead) {
    notification.isRead = true;
    unreadNotificationCount.value = Math.max(0, unreadNotificationCount.value - 1);
  }
};

const markAllAsRead = async () => {
  // Local-only read marker for admin global notifications
  systemNotifications.value.forEach((n: SystemNotification) => {
    n.isRead = true;
  });
  unreadNotificationCount.value = 0;
};

const deleteNotification = async (notificationId: string) => {
  try {
    console.log('🗑️ Deleting notification:', notificationId);
    console.log('📊 Current notifications count:', systemNotifications.value.length);

    await adminNotificationService.deleteNotification(notificationId);

    console.log('✅ Notification deleted from server successfully');

    // Update local state
    const notification = systemNotifications.value.find((n: SystemNotification) => n.id === notificationId);
    if (notification && !notification.isRead) {
      unreadNotificationCount.value = Math.max(0, unreadNotificationCount.value - 1);
    }

    systemNotifications.value = systemNotifications.value.filter((n: SystemNotification) => n.id !== notificationId);

    console.log('📊 Updated local state - notifications:', systemNotifications.value.length);

    // Reload notification count
    await loadNotificationCount();

    // Show success message
    console.log('Notification deleted successfully');
  } catch (error) {
    console.error('Error deleting notification:', error);
    console.error('Failed to delete notification');
  }
};

const loadSystemNotifications = async () => {
  loadingNotifications.value = true;

  try {
    // Build admin alerts feed
    const [reqCountRes, withdrawalsRes] = await Promise.all([
      axios.get('/requests/pending/count'),
      axios.get('/admin/transactions', { params: { status: 'Pending', type: 'WITHDRAWAL' } })
    ]);

    const alerts: SystemNotification[] = [];

    // Pending requests aggregate alert
    const pendingRequests = reqCountRes?.data?.count ?? 0;
    if (pendingRequests > 0) {
      alerts.push({
        id: `req-aggregate-${Date.now()}`,
        type: 'request',
        title: 'Pending Requests',
        message: `${pendingRequests} request(s) waiting for action`,
        timestamp: new Date().toISOString(),
        isRead: false,
        isGlobal: true
      });
    }

    // Pending withdrawals details
    const withdrawals: any[] = Array.isArray(withdrawalsRes?.data) ? withdrawalsRes.data : [];
    withdrawals
      .slice(0, 10)
      .forEach((w: any) => {
        alerts.push({
          id: String(w.id ?? `wd-${Math.random()}`),
          type: 'withdrawal',
          title: 'Pending Withdrawal',
          message: `User ${w.user?.username || w.userId || ''} requested withdrawal of $${Math.abs(w.amount ?? 0)}`,
          timestamp: w.createdAt || w.date || new Date().toISOString(),
          isRead: false,
          isGlobal: true
        });
      });

    systemNotifications.value = alerts;
    unreadNotificationCount.value = alerts.length;
  } catch (error) {
    console.error('Error loading system notifications:', error);
    // Fallback to empty array
    systemNotifications.value = [];
  } finally {
    loadingNotifications.value = false;
  }
};

const toggleNotificationsModal = () => {
  showNotificationsModal.value = !showNotificationsModal.value;
  if (showNotificationsModal.value) {
    loadSystemNotifications();
  }
};

onMounted(() => {
  loadUserInfo();
  loadNotificationCount();
  setupNotifications();

  // Refresh notification count every 30 seconds
  const intervalId = setInterval(() => {
    loadNotificationCount();
  }, 30000);

  document.addEventListener('sign-out', async () => {
    try {
      await authService.logout();
      currentUser.value = null;
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });

  // Realtime: subscribe to task events for admin alerts
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const serverUrl = apiBase.replace(/\/api$/, '');
    adminSocket = io(serverUrl, { withCredentials: true, transports: ['websocket', 'polling'] });
    adminSocket.on('task-updated', (task: any) => {
      systemNotifications.value.unshift({
        id: `task-updated-${task.id}-${Date.now()}`,
        type: 'system',
        title: 'Task Updated',
        message: `Task #${task.id} updated to ${task.status}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        isGlobal: true
      });
      unreadNotificationCount.value++;
    });
    adminSocket.on('task-deleted', (task: any) => {
      systemNotifications.value.unshift({
        id: `task-deleted-${task.id}-${Date.now()}`,
        type: 'system',
        title: 'Task Deleted',
        message: `Task #${task.id} was deleted`,
        timestamp: new Date().toISOString(),
        isRead: false,
        isGlobal: true
      });
      unreadNotificationCount.value++;
    });
  } catch (e) {
    console.warn('Admin socket setup failed', e);
  }
});

onUnmounted(() => {
  cleanupNotifications();
  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }
  // Note: we didn't store intervalId in scope for brevity
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

.notification-btn {
  position: relative;
}

.notification-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #f8fafc;
}

.notification-btn .notification-badge {
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
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
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
.notifications-panel {
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

.notifications-panel {
  width: 450px;
  max-height: 600px;
}

.notifications-panel .notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notifications-panel .notification-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.notifications-panel .notification-item:hover {
  background: #f8fafc;
  transform: translateX(4px);
}

.notifications-panel .notification-item.unread {
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
}

.notifications-panel .notification-item.unread:hover {
  background: #e0f2fe;
}

.notifications-panel .notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

.notifications-panel .notification-icon.info {
  background: #dbeafe;
  color: #2563eb;
}

.notifications-panel .notification-icon.warning {
  background: #fef3c7;
  color: #d97706;
}

.notifications-panel .notification-icon.error {
  background: #fee2e2;
  color: #dc2626;
}

.notifications-panel .notification-icon.success {
  background: #d1fae5;
  color: #059669;
}

.notifications-panel .notification-icon.system {
  background: #f3e8ff;
  color: #7c3aed;
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

.header-actions {
  display: flex;
  gap: 8px;
}

.mark-all-read-btn {
  background: #10b981;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.mark-all-read-btn:hover {
  background: #059669;
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

.loading-state {
  padding: 16px;
  text-align: center;
  color: #6b7280;
}

.empty-state {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 12px;
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
  cursor: pointer;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item.unread {
  background: #f3f4f6;
  font-weight: 600;
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

.notification-actions {
  display: flex;
  gap: 8px;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: #fee2e2;
}

.panel-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.view-all-link {
  text-decoration: none;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.view-all-link:hover {
  text-decoration: underline;
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
  .notifications-panel {
    width: calc(100vw - 48px);
    right: 24px;
  }

  .user-dropdown-menu {
    min-width: calc(100vw - 48px);
    right: 0;
  }
}
</style>
