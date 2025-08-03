<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <Navbar />
    <div class="main-content">
      <Sidebar v-model:collapsed="sidebarCollapsed" />
      <div class="content">
        <div class="notification-detail-view">
          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading notification...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-container">
            <div class="error-icon">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <h3>Error Loading Notification</h3>
            <p>{{ error }}</p>
            <button @click="loadNotification" class="retry-btn">
              <i class="pi pi-refresh"></i>
              Try Again
            </button>
          </div>

          <!-- Notification Content -->
          <div v-else-if="notification" class="notification-container">
            <!-- Header -->
            <div class="notification-header">
              <div class="header-left">
                <button @click="goBack" class="back-btn">
                  <i class="pi pi-arrow-left"></i>
                  Back to Notifications
                </button>
              </div>
              <div class="header-right">
                <span class="notification-status" :class="{ 'unread': !notification.isRead }">
                  <i :class="notification.isRead ? 'pi pi-check-circle' : 'pi pi-circle'"></i>
                  {{ notification.isRead ? 'Read' : 'Unread' }}
                </span>
              </div>
            </div>

            <!-- Main Content -->
            <div class="notification-content">
              <div class="notification-type-badge" :class="`type-${notification.type}`">
                <i :class="getTypeIcon(notification.type)"></i>
                {{ getTypeLabel(notification.type) }}
              </div>

              <div class="notification-message">
                <h2>{{ notification.message }}</h2>
              </div>

              <div class="notification-meta">
                <div class="meta-item">
                  <i class="pi pi-calendar"></i>
                  <span>Created: {{ formatDate(notification.createdAt) }}</span>
                </div>

                <div v-if="notification.readAt" class="meta-item">
                  <i class="pi pi-eye"></i>
                  <span>Read: {{ formatDate(notification.readAt) }}</span>
                </div>

                <div v-if="notification.createdBy" class="meta-item">
                  <i class="pi pi-user"></i>
                  <span>From: {{ notification.createdBy.fullName || notification.createdBy.username }}</span>
                </div>

                <div v-if="notification.isGlobal" class="meta-item">
                  <i class="pi pi-globe"></i>
                  <span>Global Notification</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="notification-actions">
                <button
                  v-if="!notification.isRead"
                  @click="markAsRead"
                  class="action-btn primary"
                  :disabled="markingAsRead"
                >
                  <i class="pi pi-check"></i>
                  {{ markingAsRead ? 'Marking as Read...' : 'Mark as Read' }}
                </button>

                <button @click="deleteNotification" class="action-btn danger" :disabled="deleting">
                  <i class="pi pi-trash"></i>
                  {{ deleting ? 'Deleting...' : 'Delete Notification' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Not Found State -->
          <div v-else class="not-found-container">
            <div class="not-found-icon">
              <i class="pi pi-search"></i>
            </div>
            <h3>Notification Not Found</h3>
            <p>The notification you're looking for doesn't exist or has been removed.</p>
            <router-link to="/notifications" class="back-link">
              <i class="pi pi-arrow-left"></i>
              Back to Notifications
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { notificationService, type Notification } from '../services/notification.service'

const route = useRoute()
const router = useRouter()

// Sidebar state
const sidebarCollapsed = ref(false)

// Notification state
const notification = ref<Notification | null>(null)
const loading = ref(true)
const error = ref<string>('')
const markingAsRead = ref(false)
const deleting = ref(false)

const loadNotification = async () => {
  try {
    loading.value = true
    error.value = ''
    const notificationId = route.params.id as string
    notification.value = await notificationService.getNotificationById(notificationId)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load notification'
    console.error('Error loading notification:', err)
  } finally {
    loading.value = false
  }
}

const markAsRead = async () => {
  if (!notification.value || notification.value.isRead) return

  try {
    markingAsRead.value = true
    await notificationService.markAsRead(notification.value.id)
    notification.value.isRead = true
    notification.value.readAt = new Date().toISOString()
  } catch (err: any) {
    console.error('Error marking notification as read:', err)
    alert('Failed to mark notification as read')
  } finally {
    markingAsRead.value = false
  }
}

const deleteNotification = async () => {
  if (!notification.value) return

  if (!confirm('Are you sure you want to delete this notification?')) return

  try {
    deleting.value = true
    await notificationService.deleteNotification(notification.value.id)
    router.push('/notifications')
  } catch (err: any) {
    console.error('Error deleting notification:', err)
    alert('Failed to delete notification')
  } finally {
    deleting.value = false
  }
}

const goBack = () => {
  router.push('/notifications')
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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadNotification()
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

/* Main Container */
.notification-detail-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
}

/* Loading State */
.loading-container {
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

/* Error State */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.error-icon {
  font-size: 64px;
  color: #ef4444;
  margin-bottom: 16px;
}

.error-container h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.error-container p {
  color: #64748b;
  margin: 0 0 24px 0;
}

.retry-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Notification Container */
.notification-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Header */
.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 12px;
  border-radius: 8px;
}

.back-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.notification-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notification-status:not(.unread) {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
}

.notification-status.unread {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* Content */
.notification-content {
  padding: 32px;
}

.notification-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 24px;
}

.type-info { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.type-warning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.type-error { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.type-success { background: rgba(34, 197, 94, 0.1); color: #059669; }
.type-announcement { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
.type-update { background: rgba(16, 185, 129, 0.1); color: #047857; }
.type-maintenance { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.type-alert { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.type-request_status { background: rgba(34, 197, 94, 0.1); color: #059669; }
.type-project_invite { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.type-new_message { background: rgba(236, 72, 153, 0.1); color: #be185d; }

.notification-message h2 {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  margin: 0 0 32px 0;
}

.notification-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.meta-item i {
  color: #94a3b8;
  width: 16px;
}

/* Actions */
.notification-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.action-btn.danger {
  background: #f1f5f9;
  color: #ef4444;
  border: 1px solid #e2e8f0;
}

.action-btn.danger:hover:not(:disabled) {
  background: #ef4444;
  color: white;
  transform: translateY(-1px);
}

/* Not Found State */
.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.not-found-icon {
  font-size: 64px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.not-found-container h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.not-found-container p {
  color: #64748b;
  margin: 0 0 24px 0;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.back-link:hover {
  color: #2563eb;
}

/* Responsive Design */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }

  .notification-detail-view {
    padding: 20px 16px;
  }

  .notification-header {
    padding: 20px 24px;
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .notification-content {
    padding: 24px;
  }

  .notification-message h2 {
    font-size: 24px;
  }

  .notification-actions {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }
}
</style>
