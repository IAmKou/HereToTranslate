<template>
  <div class="realtime-notifications">
    <!-- Notification Bell Icon -->
    <div class="notification-bell" @click="toggleNotificationPanel">
      <i class="pi pi-bell" :class="{ 'has-unread': unreadCount > 0 }"></i>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
    </div>

    <!-- Notification Panel -->
    <div v-if="showNotificationPanel" class="notification-panel" @click.stop>
      <div class="panel-header">
        <h3>Notifications</h3>
        <div class="header-actions">
          <button @click="markAllAsRead" class="mark-all-read">
            Mark All as Read
          </button>
          <button @click="toggleNotificationPanel" class="close-panel">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>

      <div class="notifications-list">
        <div v-if="notifications.length === 0" class="empty-state">
          No notifications
        </div>
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="{ 'unread': !notification.isRead }"
        >
          <div class="notification-content">
            <div class="notification-header">
              <span class="notification-type">{{ getTypeLabel(notification.type) }}</span>
              <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
            </div>
            <p class="notification-message">{{ notification.message }}</p>
          </div>
          <div class="notification-actions">
            <button v-if="!notification.isRead" @click="markAsRead(notification.id)" class="mark-read">
              <i class="pi pi-check"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button @click="loadMoreNotifications" v-if="hasMore" class="load-more">
          Load More
        </button>
        <button @click="navigateToNotifications" class="view-all">
          View All
        </button>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <div
        v-for="toast in toastNotifications"
        :key="toast.id"
        class="toast-notification"
        :class="`toast-${toast.type}`"
      >
        <div class="toast-content">
          <i class="pi pi-bell"></i>
          <div>
            <strong>{{ getTypeLabel(toast.type) }}</strong>
            <p>{{ toast.message }}</p>
          </div>
        </div>
        <button @click="dismissToast(toast.id)" class="toast-close">
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { io, Socket } from 'socket.io-client'
import { notificationService } from '../services/notification.service'
import { useAuthStore } from '../store/auth'
import { getChatConfig } from '../utils/chat-config'

interface Notification {
  id: string
  type: string
  message: string
  createdAt: string
  isRead?: boolean
  isGlobal?: boolean
}

interface ToastNotification extends Notification {
  id: string
}

const authStore = useAuthStore()
const config = getChatConfig()

const notifications = ref<Notification[]>([])
const toastNotifications = ref<ToastNotification[]>([])
const showNotificationPanel = ref(false)
const loading = ref(false)
const hasMore = ref(true)
const unreadCount = ref(0)

let socket: Socket | null = null
let toastIdCounter = 0

const toggleNotificationPanel = async () => {
  showNotificationPanel.value = !showNotificationPanel.value
  if (showNotificationPanel.value && notifications.value.length === 0) {
    await loadNotifications()
  }
}

const closePanel = () => {
  showNotificationPanel.value = false
}

const loadNotifications = async () => {
  loading.value = true
  try {
    const response = await notificationService.getUserNotifications(20)
    notifications.value = response.notifications.map(notif => ({
      ...notif,
      isRead: false // Assuming all are unread initially
    }))

    // Update unread count
    updateUnreadCount()
  } catch (error) {
    console.error('Error loading notifications:', error)
  } finally {
    loading.value = false
  }
}

const loadMoreNotifications = async () => {
  // Implementation for pagination
  try {
    const response = await notificationService.getUserNotifications(20)
    // Add to existing notifications...
  } catch (error) {
    console.error('Error loading more notifications:', error)
  }
}

const markAsRead = (notification: Notification) => {
  if (!notification.isRead) {
    notification.isRead = true
    updateUnreadCount()
    // Here you would call API to mark as read on server
  }
}

const markAllAsRead = () => {
  notifications.value.forEach(notif => {
    notif.isRead = true
  })
  updateUnreadCount()
  // Here you would call API to mark all as read on server
}

const updateUnreadCount = async () => {
  try {
    const response = await notificationService.getNotificationCount()
    unreadCount.value = response.count
  } catch (error) {
    console.error('Error updating unread count:', error)
  }
}

const addToast = (notification: Notification) => {
  const toast: ToastNotification = {
    ...notification,
    id: `toast-${++toastIdCounter}`
  }
  toastNotifications.value.push(toast)

  // Auto remove after 5 seconds
  setTimeout(() => {
    dismissToast(toast.id)
  }, 5000)
}

const dismissToast = (toastId: string) => {
  const index = toastNotifications.value.findIndex(t => t.id === toastId)
  if (index > -1) {
    toastNotifications.value.splice(index, 1)
  }
}

const connectToNotificationSocket = () => {
  if (!authStore.user) return

  socket = io(`${config.serverUrl}/notifications`, {
    path: '/api/notifications/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('✅ Connected to notification socket')
    // Join user room
    socket?.emit('join_user_room', authStore.user?.id.toString())
  })

  socket.on('joined_user_room', (userId: string) => {
    console.log(`👤 Joined notification room for user: ${userId}`)
  })

  socket.on('new_notification', (notification: any) => {
    console.log('🔔 New notification received:', notification)

    // Add to notifications list
    notifications.value.unshift({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt,
      isRead: false,
      isGlobal: notification.isGlobal
    })

    // Show toast
    addToast(notification)

    // Update unread count
    unreadCount.value++
  })

  socket.on('global_notification', (notification: any) => {
    console.log('📢 Global notification received:', notification)

    // Add to notifications list
    notifications.value.unshift({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt,
      isRead: false,
      isGlobal: true
    })

    // Show toast
    addToast({
      ...notification,
      isGlobal: true
    })

    // Update unread count
    unreadCount.value++
  })

  socket.on('notification_deleted', (data: { id: string }) => {
    const index = notifications.value.findIndex(n => n.id === data.id)
    if (index > -1) {
      notifications.value.splice(index, 1)
      updateUnreadCount()
    }
  })

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from notification socket')
  })
}

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

const getTypeClass = (type: string) => {
  const classes: Record<string, string> = {
    announcement: 'type-announcement',
    maintenance: 'type-maintenance',
    news: 'type-news',
    warning: 'type-warning',
    info: 'type-info',
    request_status: 'type-request',
    project_invite: 'type-project',
    new_message: 'type-message'
  }
  return classes[type] || 'type-default'
}

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    announcement: '📢',
    maintenance: '🔧',
    news: '📰',
    warning: '⚠️',
    info: 'ℹ️',
    request_status: '📋',
    project_invite: '🎯',
    new_message: '💬'
  }
  return icons[type] || '🔔'
}

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    info: 'Information',
    warning: 'Warning',
    error: 'Error',
    success: 'Success',
    announcement: 'Announcement',
    update: 'Update',
    maintenance: 'Maintenance',
    alert: 'Alert'
  }
  return labels[type] || 'Notification'
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  return date.toLocaleDateString('vi-VN')
}

const navigateToNotifications = () => {
  // Navigate to notifications page
  closePanel()
}

onMounted(() => {
  updateUnreadCount()
  connectToNotificationSocket()
})

onUnmounted(() => {
  disconnectSocket()
})
</script>

<style scoped>
.realtime-notifications {
  position: relative;
}

/* Bell Icon */
.notification-bell {
  position: relative;
  cursor: pointer;
  padding: 12px;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.1) 100%);
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-bell i {
  font-size: 20px;
  color: #64748b;
  transition: all 0.3s ease;
}

.notification-bell:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(29, 78, 216, 0.15) 100%);
  border: 2px solid rgba(59, 130, 246, 0.3);
  transform: scale(1.05);
}

.notification-bell:hover i {
  color: #3b82f6;
}

.notification-bell.has-unread {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
  animation: bellPulse 2s infinite;
}

.notification-bell.has-unread i {
  color: white;
}

@keyframes bellPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.unread-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  animation: badgeBounce 0.6s ease-out;
}

@keyframes badgeBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Notification Panel */
.notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: -20px;
  width: 420px;
  max-height: 600px;
  background: white;
  border: none;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  overflow: hidden;
  animation: panelSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  backdrop-filter: blur(10px);
}

@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.panel-header {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-header h3::before {
  content: "🔔";
  font-size: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mark-all-read {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mark-all-read:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.close-panel {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  color: #64748b;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-panel:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Notifications List */
.notifications-list {
  max-height: 450px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.notifications-list::-webkit-scrollbar {
  width: 6px;
}

.notifications-list::-webkit-scrollbar-track {
  background: transparent;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #64748b;
}

.empty-state::before {
  content: "📭";
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.notification-item {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  gap: 16px;
}

.notification-item:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.notification-item.unread {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-left: 4px solid #3b82f6;
}

.notification-item.unread::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 20px;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: unreadPulse 2s infinite;
}

@keyframes unreadPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 12px;
}

.notification-type {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.notification-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  white-space: nowrap;
}

.notification-message {
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  margin-bottom: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mark-read {
  background: none;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  color: #3b82f6;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mark-read:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: scale(1.1);
}

/* Panel Footer */
.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.load-more, .view-all {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.load-more:hover, .view-all:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1002;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 380px;
}

.toast-notification {
  background: white;
  border: none;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  overflow: hidden;
  animation: toastSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  backdrop-filter: blur(10px);
}

.toast-notification::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-content i {
  font-size: 20px;
  color: #3b82f6;
  margin-right: 12px;
}

.toast-content strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.toast-content p {
  font-size: 13px;
  line-height: 1.4;
  color: #64748b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.toast-close {
  background: none;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-close:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Toast Type Variants */
.toast-announcement::before {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.toast-update::before {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.toast-maintenance::before {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.toast-alert::before {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.toast-info::before {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

/* Responsive Design */
@media (max-width: 768px) {
  .notification-panel {
    width: 350px;
    right: -50px;
  }

  .toast-container {
    right: 12px;
    left: 12px;
    max-width: none;
  }

  .toast-notification {
    padding: 12px 16px;
  }
}

@media (max-width: 480px) {
  .notification-panel {
    width: 320px;
    right: -60px;
  }

  .panel-header {
    padding: 16px 20px;
  }

  .notification-item {
    padding: 12px 20px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .notification-panel {
    background: #1f2937;
    border: 1px solid #374151;
  }

  .panel-header {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border-bottom-color: #374151;
  }

  .panel-header h3 {
    color: #f9fafb;
  }

  .notification-item {
    border-bottom-color: #374151;
  }

  .notification-item:hover {
    background: linear-gradient(135deg, #374151 0%, #2d3748 100%);
  }

  .notification-message {
    color: #d1d5db;
  }

  .panel-footer {
    background: #1f2937;
    border-top-color: #374151;
  }

  .toast-notification {
    background: #1f2937;
    border: 1px solid #374151;
  }

  .toast-content strong {
    color: #f9fafb;
  }

  .toast-content p {
    color: #d1d5db;
  }
}
</style>
