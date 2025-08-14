<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <Navbar />
    <div class="main-content">
      <Sidebar v-model:collapsed="sidebarCollapsed" />
      <div class="content">
        <div class="user-notifications-view">
          <!-- Page Header -->
          <div class="page-header">
            <div class="header-content">
              <div class="header-left">
                <div class="header-icon">
                  <i class="pi pi-bell"></i>
                </div>
                <div class="header-text">
                  <h1>My Notifications</h1>
                  <p class="subtitle">Stay updated with your latest notifications</p>
                </div>
              </div>
              <div class="header-stats">
                <div class="stat-item">
                  <span class="stat-number">{{ notificationStats.total }}</span>
                  <span class="stat-label">Total</span>
                </div>
                <div class="stat-item unread">
                  <span class="stat-number">{{ notificationStats.unread }}</span>
                  <span class="stat-label">Unread</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div class="controls-section">
            <div class="filter-tabs">
              <button
                @click="activeFilter = 'all'"
                :class="{ active: activeFilter === 'all' }"
                class="filter-tab"
              >
                <i class="pi pi-list"></i>
                All Notifications
              </button>
              <button
                @click="activeFilter = 'unread'"
                :class="{ active: activeFilter === 'unread' }"
                class="filter-tab"
              >
                <i class="pi pi-circle"></i>
                Unread Only
                <span v-if="notificationStats.unread > 0" class="unread-badge">{{ notificationStats.unread }}</span>
              </button>
            </div>

            <div class="action-buttons">
              <button
                @click="markAllAsRead"
                :disabled="notificationStats.unread === 0 || markingAllAsRead"
                class="action-btn secondary"
              >
                <i class="pi pi-check"></i>
                {{ markingAllAsRead ? 'Marking...' : 'Mark All Read' }}
              </button>
              <button
                @click="deleteAllNotifications"
                :disabled="notifications.length === 0 || deletingAll"
                class="action-btn danger"
              >
                <i class="pi pi-trash"></i>
                {{ deletingAll ? 'Deleting...' : 'Delete All' }}
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="notifications.length === 0" class="empty-container">
            <div class="empty-icon">
              <i class="pi pi-bell-slash"></i>
            </div>
            <h3>{{ activeFilter === 'unread' ? 'No Unread Notifications' : 'No Notifications' }}</h3>
            <p>{{ activeFilter === 'unread' ? 'All caught up! You have no unread notifications.' : 'You don\'t have any notifications yet.' }}</p>
          </div>

          <!-- Notifications List -->
          <div v-else class="notifications-container">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-item"
              :class="{
                'unread': !notification.isRead,
                'global': notification.isGlobal
              }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-indicator" v-if="!notification.isRead"></div>

              <div class="notification-icon">
                <i :class="getTypeIcon(notification.type)"></i>
              </div>

              <div class="notification-content">
                <div class="notification-header">
                  <div class="notification-type">{{ getTypeLabel(notification.type) }}</div>
                  <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
                </div>

                <div class="notification-message">{{ getCleanMessage(notification) }}</div>

                <!-- Add action buttons for project_invite notifications -->
                <div v-if="notification.type === 'project_invite' && !isNotificationProcessed(notification)" class="invitation-actions" @click.stop>
                  <!-- Show expire time if available -->
                  <div v-if="getProjectInvitation(notification)" class="expire-info">
                    <span v-if="isInvitationExpired(getProjectInvitation(notification)!)" class="expire-expired">
                      <i class="pi pi-clock"></i>
                      Expired
                    </span>
                    <span v-else class="expire-time">
                      <i class="pi pi-clock"></i>
                      {{ formatExpireTime(getProjectInvitation(notification)!.expiresAt) }}
                    </span>
                  </div>

                  <div v-if="!getProjectInvitation(notification) || !isInvitationExpired(getProjectInvitation(notification)!)" class="action-buttons-row">
                    <button
                      @click="acceptProjectInvitationFromNotification(notification)"
                      class="accept-btn"
                    >
                      <i class="pi pi-check"></i>
                      Join Project
                    </button>
                    <button
                      @click="declineProjectInvitationFromNotification(notification)"
                      class="decline-btn"
                    >
                      <i class="pi pi-times"></i>
                      Decline
                    </button>
                  </div>
                </div>

                <!-- Show status for processed notifications -->
                <div v-if="notification.type === 'project_invite' && isNotificationProcessed(notification)" class="invitation-status" @click.stop>
                  <span v-if="isNotificationAccepted(notification)" class="status-accepted">
                    <i class="pi pi-check"></i>
                    Accepted
                  </span>
                  <span v-else-if="isNotificationDeclined(notification)" class="status-declined">
                    <i class="pi pi-times"></i>
                    Declined
                  </span>
                </div>

                <div class="notification-meta">
                  <span v-if="notification.isGlobal" class="global-badge">
                    <i class="pi pi-globe"></i>
                    Global
                  </span>
                  <span v-if="notification.createdBy" class="created-by">
                    From: {{ notification.createdBy.fullName || notification.createdBy.username }}
                  </span>
                  <span v-if="notification.readAt" class="read-time">
                    Read: {{ formatTime(notification.readAt) }}
                  </span>
                </div>
              </div>

              <div class="notification-actions" @click.stop>
                <button
                  v-if="!notification.isRead"
                  @click="markAsRead(notification.id)"
                  class="mark-read-btn"
                  title="Mark as read"
                >
                  <i class="pi pi-check"></i>
                </button>
                <button
                  @click="deleteNotification(notification.id)"
                  class="delete-btn"
                  title="Delete notification"
                >
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </div>

            <!-- Load More Button -->
            <div v-if="hasMore" class="load-more-container">
              <button @click="loadMoreNotifications" :disabled="loadingMore" class="load-more-btn">
                <i class="pi pi-plus"></i>
                {{ loadingMore ? 'Loading...' : 'Load More' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { notificationService, type Notification, type NotificationCount } from '../services/notification.service'
import { useNotificationSync } from '../composables/useNotificationSync'
import { projectInvitationService, type ProjectInvitation } from '../services/project-invitation.service'

const router = useRouter()
const { emitNotificationDeleted, emitNotificationMarkedRead, emitAllNotificationsDeleted, emitAllNotificationsMarkedRead } = useNotificationSync()

// Sidebar state
const sidebarCollapsed = ref(false)

// Filter state
const activeFilter = ref<'all' | 'unread'>('all')

// Notification state
const notifications = ref<Notification[]>([])
const notificationStats = ref<NotificationCount>({ total: 0, unread: 0 })
const loading = ref(true)
const loadingMore = ref(false)
const markingAllAsRead = ref(false)
const deletingAll = ref(false)
const hasMore = ref(true)
const currentLimit = ref(20)

// Project invitation state
const projectInvitations = ref<ProjectInvitation[]>([])
const loadingInvitations = ref(false)

// Computed
const unreadOnly = computed(() => activeFilter.value === 'unread')

// Methods
const loadNotifications = async (reset = true) => {
  try {
    if (reset) {
      loading.value = true
      notifications.value = []
      currentLimit.value = 20
    } else {
      loadingMore.value = true
    }

    const response = await notificationService.getUserNotifications(
      currentLimit.value,
      unreadOnly.value
    )

    if (reset) {
      notifications.value = response.notifications
    } else {
      notifications.value.push(...response.notifications)
    }

    hasMore.value = response.notifications.length === currentLimit.value

    // Load stats
    const stats = await notificationService.getNotificationCount()
    notificationStats.value = stats

    // Load project invitations for expire time display
    await loadProjectInvitations()

  } catch (error) {
    console.error('Error loading notifications:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadProjectInvitations = async () => {
  try {
    loadingInvitations.value = true
    const response = await projectInvitationService.getMyInvitations('pending')
    projectInvitations.value = response.invitations
  } catch (error) {
    console.error('Error loading project invitations:', error)
  } finally {
    loadingInvitations.value = false
  }
}

const loadMoreNotifications = async () => {
  currentLimit.value += 20
  await loadNotifications(false)
}

const markAsRead = async (notificationId: string) => {
  try {
    await notificationService.markAsRead(notificationId)

    // Update local state
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.isRead = true
      notification.readAt = new Date().toISOString()
    }

    // Update stats
    notificationStats.value.unread = Math.max(0, notificationStats.value.unread - 1)

    // If we're showing unread only, remove it from the list
    if (unreadOnly.value) {
      notifications.value = notifications.value.filter(n => n.id !== notificationId)
    }

    emitNotificationMarkedRead(notificationId)

  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

const markAllAsRead = async () => {
  try {
    markingAllAsRead.value = true
    await notificationService.markAllAsRead()

    // Update local state
    notifications.value.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
      }
    })

    // Update stats
    notificationStats.value.unread = 0

    // If showing unread only, clear the list
    if (unreadOnly.value) {
      notifications.value = []
    }

    emitAllNotificationsMarkedRead()

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  } finally {
    markingAllAsRead.value = false
  }
}

const deleteNotification = async (notificationId: string) => {
  try {
    await notificationService.deleteNotification(notificationId)

    // Remove from local state
    const notification = notifications.value.find(n => n.id === notificationId)
    notifications.value = notifications.value.filter(n => n.id !== notificationId)

    // Update stats
    notificationStats.value.total = Math.max(0, notificationStats.value.total - 1)
    if (notification && !notification.isRead) {
      notificationStats.value.unread = Math.max(0, notificationStats.value.unread - 1)
    }

    emitNotificationDeleted(notificationId)

  } catch (error) {
    console.error('Error deleting notification:', error)
  }
}

const deleteAllNotifications = async () => {
  if (!confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
    return
  }

  try {
    deletingAll.value = true
    await notificationService.deleteAllNotifications()

    // Clear local state
    notifications.value = []
    notificationStats.value = { total: 0, unread: 0 }

    emitAllNotificationsDeleted()

  } catch (error) {
    console.error('Error deleting all notifications:', error)
  } finally {
    deletingAll.value = false
  }
}

const handleNotificationClick = (notification: Notification) => {
  const t = notification.type
  if (
    t === 'PRIVATE_REQUEST_CREATED' ||
    t === 'PUBLIC_REQUEST_REGISTERED' ||
    t === 'REGISTRANT_APPROVED' ||
    t === 'PRIVATE_REQUEST_ACCEPTED' ||
    t === 'PRIVATE_REQUEST_DECLINED' ||
    t === 'request_status'
  ) {
    router.push('/my-requests')
  } else if (
    t === 'PROJECT_UPDATED' ||
    t === 'USER_ADDED_TO_PROJECT' ||
    t === 'USER_REMOVED_FROM_PROJECT'
  ) {
    router.push('/projects')
  } else if (t === 'project_invite') {
    // giữ lại nút Accept/Decline, click container sẽ tới trang lời mời
    router.push('/project-invitations')
  } else if (t === 'new_message') {
    router.push('/chat')
  } else if (t === 'WITHDRAW_REQUEST' || t === 'WITHDRAW_APPROVED') {
    router.push('/transactions')
  } else if (t === 'PUBLIC_REQUEST_CREATED') {
    router.push('/all-requests')
  } else {
    router.push('/notifications')
  }
}

// Methods for handling project invitations from notifications
const acceptProjectInvitationFromNotification = async (notification: Notification) => {
  try {
    // Extract project name from notification message
    const projectName = notification.message.match(/project "([^"]+)"/)?.[1]

    if (projectName) {
      // Get project invitations to find the matching one
      const response = await projectInvitationService.getMyInvitations('pending')
      const invitation = response.invitations.find(inv => inv.project?.name === projectName)

      if (invitation) {
        await projectInvitationService.respondToInvitation(invitation.id, 'accepted')

        // Mark notification as read instead of deleting
        await markAsRead(notification.id)

        // Redirect to project detail
        if (invitation.project?.id) {
          router.push(`/projects/${invitation.project.id}`)
        }
      } else {
        alert('Project invitation not found. Please try again.')
      }
    }
  } catch (error: any) {
    console.error('Error accepting invitation from notification:', error)
    alert(error.response?.data?.message || 'Failed to accept invitation')
  }
}

const declineProjectInvitationFromNotification = async (notification: Notification) => {
  try {
    // Extract project name from notification message
    const projectName = notification.message.match(/project "([^"]+)"/)?.[1]

    if (projectName) {
      // Get project invitations to find the matching one
      const response = await projectInvitationService.getMyInvitations('pending')
      const invitation = response.invitations.find(inv => inv.project?.name === projectName)

      if (invitation) {
        await projectInvitationService.respondToInvitation(invitation.id, 'declined')

        // Mark notification as read instead of deleting
        await markAsRead(notification.id)
      } else {
        alert('Project invitation not found. Please try again.')
      }
    }
  } catch (error: any) {
    console.error('Error declining invitation from notification:', error)
    alert(error.response?.data?.message || 'Failed to decline invitation')
  }
}

const getTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    info: 'pi pi-info-circle',
    warning: 'pi pi-exclamation-triangle',
    error: 'pi pi-times-circle',
    success: 'pi pi-check-circle',
    announcement: 'pi pi-megaphone',
    update: 'pi pi-sync',
    maintenance: 'pi pi-wrench',
    alert: 'pi pi-bell',
    request_status: 'pi pi-file',
    project_invite: 'pi pi-users',
    new_message: 'pi pi-envelope'
  }
  return icons[type] || 'pi pi-bell'
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
    alert: 'Alert',
    request_status: 'Request Status',
    project_invite: 'Project Invitation',
    new_message: 'New Message'
  }
  return labels[type] || 'Notification'
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)

  // Fix múi giờ - cộng thêm 7 tiếng để khớp với giờ Việt Nam
  date.setHours(date.getHours() + 7)

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Helper functions to check notification status
// For now, we'll use a simple approach: if notification is read and is project_invite, consider it processed
const isNotificationProcessed = (notification: Notification): boolean => {
  return notification.type === 'project_invite' && !!notification.isRead
}

const isNotificationAccepted = (notification: Notification): boolean => {
  // For now, we'll assume all processed project_invite notifications are accepted
  // In a real implementation, you might want to check against a separate status field
  return notification.type === 'project_invite' && !!notification.isRead
}

const isNotificationDeclined = (notification: Notification): boolean => {
  // For now, we'll assume declined notifications are not shown in popup
  // In a real implementation, you might want to check against a separate status field
  return false
}

// Helper function to get clean message (no longer needed since we don't modify message)
const getCleanMessage = (notification: Notification): string => {
  return notification.message
}

// Helper functions for project invitation expire time
const getProjectInvitation = (notification: Notification): ProjectInvitation | undefined => {
  if (notification.type !== 'project_invite') return undefined

  // Extract project name from notification message
  const projectName = notification.message.match(/project "([^"]+)"/)?.[1]
  if (!projectName) return undefined

  return projectInvitations.value.find(inv => inv.project?.name === projectName)
}

const isInvitationExpired = (invitation: ProjectInvitation): boolean => {
  return new Date(invitation.expiresAt) < new Date()
}

const formatExpireTime = (expiresAt: string): string => {
  const expireDate = new Date(expiresAt)
  const now = new Date()
  const diff = expireDate.getTime() - now.getTime()

  if (diff < 0) return 'Expired'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`
  if (minutes > 0) return `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`
  return 'Expires soon'
}

// Watchers
watch(activeFilter, () => {
  loadNotifications()
})

onMounted(() => {
  loadNotifications()
})
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
  transition: margin-left 0.2s cubic-bezier(.4,0,.2,1);
}

.content {
  flex: 1;
  background: #f8fafc;
  min-height: calc(100vh - 70px);
}

/* User Notifications View */
.user-notifications-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

/* Page Header */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
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
}

.header-text .subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  min-width: 80px;
}

.stat-item.unread {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
}

.stat-item.unread .stat-number {
  color: #dc2626;
}

.stat-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* Controls */
.controls-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  position: relative;
}

.filter-tab:hover {
  background: #f8fafc;
  border-color: #3b82f6;
}

.filter-tab.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.unread-badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.action-btn.danger {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.action-btn.danger:hover:not(:disabled) {
  background: #dc2626;
  color: white;
}

/* Loading & Empty States */
.loading-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 64px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.empty-container h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.empty-container p {
  color: #64748b;
  margin: 0;
}

/* Notifications List */
.notifications-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  background: white;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item.unread {
  background: rgba(59, 130, 246, 0.02);
  border-left: 4px solid #3b82f6;
}

.notification-item.global {
  border-right: 4px solid #10b981;
}

.notification-indicator {
  position: absolute;
  left: 8px;
  top: 24px;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
}

.notification-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #64748b;
  margin-right: 16px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.notification-type {
  font-size: 12px;
  font-weight: 700;
  color: #3b82f6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notification-time {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.notification-message {
  font-size: 16px;
  line-height: 1.5;
  color: #1e293b;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
  flex-wrap: wrap;
}

.global-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.notification-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
  flex-shrink: 0;
}

.mark-read-btn, .delete-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.mark-read-btn {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
}

.mark-read-btn:hover {
  background: #059669;
  color: white;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.delete-btn:hover {
  background: #dc2626;
  color: white;
}

/* Invitation Action Buttons */
.invitation-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 8px;
}

.expire-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}

.expire-time {
  color: #059669;
  background: rgba(34, 197, 94, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.expire-expired {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-buttons-row {
  display: flex;
  gap: 8px;
}

.accept-btn, .decline-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.accept-btn {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
}

.accept-btn:hover {
  background: #059669;
  color: white;
}

.decline-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.decline-btn:hover {
  background: #dc2626;
  color: white;
}

/* Status indicators for processed notifications */
.invitation-status {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 8px;
}

.status-accepted, .status-declined {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-accepted {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid #86efac;
}

.status-declined {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
  border: 1px solid #fca5a5;
}

/* Load More */
.load-more-container {
  padding: 24px;
  text-align: center;
  border-top: 1px solid #f1f5f9;
}

.load-more-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  margin: 0 auto;
}

.load-more-btn:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }

  .user-notifications-view {
    padding: 20px 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
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
    font-size: 24px;
  }

  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-tabs {
    justify-content: stretch;
  }

  .filter-tab {
    flex: 1;
    justify-content: center;
  }

  .action-buttons {
    justify-content: center;
  }

  .notification-item {
    padding: 16px 20px;
  }

  .notification-actions {
    margin-left: 8px;
  }
}
</style>
