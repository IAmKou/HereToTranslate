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

          <!-- Real-time Demo -->
          <RealtimeNotificationDemo />

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
              <div class="sort-controls">
                <label for="sort-order">Sort by:</label>
                <select id="sort-order" v-model="sortOrder" class="sort-select">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              <div class="action-buttons-group">
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

          <!-- No Notifications on Current Page -->
          <div v-else-if="paginatedNotifications.length === 0 && notifications.length > 0" class="empty-page-container">
            <div class="empty-icon">
              <i class="pi pi-search"></i>
            </div>
            <h3>No Notifications on This Page</h3>
            <p>There are {{ notifications.length }} notifications total, but none on page {{ currentPage }}.</p>
            <button @click="goToPage(1)" class="go-to-first-btn">
              <i class="pi pi-angle-double-left"></i>
              Go to First Page
            </button>
          </div>

          <!-- Delete Confirmation Modal -->
          <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
            <div class="modal-content" @click.stop>
              <div class="modal-header">
                <h3>Confirm Delete</h3>
                <button @click="closeDeleteModal" class="modal-close-btn">
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="modal-body">
                <p>Are you sure you want to delete this notification?</p>
                <p class="notification-preview">{{ notificationToDelete?.message }}</p>
              </div>
              <div class="modal-footer">
                <button @click="closeDeleteModal" class="modal-btn secondary">
                  Cancel
                </button>
                <button @click="confirmDelete" class="modal-btn danger">
                  <i class="pi pi-trash"></i>
                  Delete
                </button>
              </div>
            </div>
          </div>

          <!-- Success Notification -->
          <div v-if="showSuccessNotification" class="success-notification">
            <div class="success-content">
              <i class="pi pi-check-circle"></i>
              <span>{{ successMessage }}</span>
            </div>
            <button @click="closeSuccessNotification" class="success-close-btn">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Notifications List -->
          <div v-else class="notifications-container">
            <div
              v-for="notification in paginatedNotifications"
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

            <!-- Pagination -->
            <div class="pagination">
              <div class="pagination-info">
                <span class="pagination-text">
                  Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredNotifications.length) }} of {{ filteredNotifications.length }} notifications
                  <span v-if="activeFilter === 'unread'" class="filter-info">(Unread only)</span>
                </span>
              </div>

              <div class="pagination-controls">
                <button
                  @click="goToPage(1)"
                  :disabled="currentPage === 1"
                  class="pagination-btn"
                  title="First page"
                >
                  <i class="pi pi-angle-double-left"></i>
                </button>

                <button
                  @click="goToPage(currentPage - 1)"
                  :disabled="currentPage === 1"
                  class="pagination-btn"
                  title="Previous page"
                >
                  <i class="pi pi-chevron-left"></i>
                </button>

                <div class="page-numbers">
                  <button
                    v-for="page in visiblePages"
                    :key="page"
                    @click="typeof page === 'number' ? goToPage(page) : null"
                    :class="['page-btn', { active: page === currentPage }]"
                    :disabled="page === '...'">
                    {{ page }}
                  </button>
                </div>

                <button
                  @click="goToPage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="pagination-btn"
                  title="Next page"
                >
                  <i class="pi pi-chevron-right"></i>
                </button>

                <button
                  @click="goToPage(totalPages)"
                  :disabled="currentPage === totalPages"
                  class="pagination-btn"
                  title="Last page"
                >
                  <i class="pi pi-angle-double-right"></i>
                </button>
              </div>

              <div class="pagination-settings">
                <label for="items-per-page">Items per page:</label>
                <select
                  id="items-per-page"
                  v-model="itemsPerPage"
                  @change="handleItemsPerPageChange"
                  class="items-per-page-select"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { notificationService, type Notification, type NotificationCount } from '../services/notification.service'
import { useNotificationSync } from '../composables/useNotificationSync'
import { projectInvitationService, type ProjectInvitation } from '../services/project-invitation.service'
import { realtimeNotificationService, type RealtimeNotification } from '../services/realtime-notification.service'

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
const markingAllAsRead = ref(false)
const deletingAll = ref(false)

// Modal state
const showDeleteModal = ref(false)
const notificationToDelete = ref<Notification | null>(null)
const showSuccessNotification = ref(false)
const successMessage = ref('')

// Connection status
const connectionStatus = ref({ isConnected: false, reconnectAttempts: 0, maxReconnectAttempts: 5 })

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Sort state
const sortOrder = ref<'newest' | 'oldest'>('newest')

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
      currentPage.value = 1
    }

    const response = await notificationService.getUserNotifications(
      1000, // Load all notifications for pagination
      unreadOnly.value
    )

    notifications.value = response.notifications

    // Load stats
    const stats = await notificationService.getNotificationCount()
    notificationStats.value = stats

    // Load project invitations for expire time display
    await loadProjectInvitations()

  } catch (error) {
    console.error('Error loading notifications:', error)
  } finally {
    loading.value = false
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

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page
    // Don't reload from server, just change page
  }
}

const resetPagination = () => {
  currentPage.value = 1
  // Don't reload from server, just reset page
}

const handleItemsPerPageChange = () => {
  // Ensure current page is valid after changing items per page
  const maxPage = Math.ceil(notifications.value.length / itemsPerPage.value)
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
  // Don't reload from server, just adjust page
}

// Computed properties for pagination
const filteredNotifications = computed(() => {
  return notifications.value
})

const paginatedNotifications = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredNotifications.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredNotifications.value.length / itemsPerPage.value)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

const markAsRead = async (notificationId: string) => {
  try {
    await notificationService.markAsRead(notificationId)

    // Update local state immediately for better UX
    const notification = notifications.value.find((n: Notification) => n.id === notificationId)
    if (notification) {
      notification.isRead = true
      notification.readAt = new Date().toISOString()
      notificationStats.value.unread = Math.max(0, notificationStats.value.unread - 1)
    }

    emitNotificationMarkedRead(notificationId)

    // Don't reload from server - just use local state to avoid issues

  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

const markAllAsRead = async () => {
  try {
    markingAllAsRead.value = true
    await notificationService.markAllAsRead()

    // Update local state immediately for better UX
    notifications.value.forEach((notification: Notification) => {
      if (!notification.isRead) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
      }
    })
    notificationStats.value.unread = 0

    emitAllNotificationsMarkedRead()

    // Don't reload from server - just use local state to avoid issues

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  } finally {
    markingAllAsRead.value = false
  }
}

const deleteNotification = async (notificationId: string) => {
  // Find the notification to show in modal
  const notification = notifications.value.find((n: Notification) => n.id === notificationId)
  if (notification) {
    notificationToDelete.value = notification
    showDeleteModal.value = true
  }
}

const confirmDelete = async () => {
  if (!notificationToDelete.value) return

  try {
    console.log('🗑️ Deleting notification:', notificationToDelete.value)
    console.log('📊 Current notifications count:', notifications.value.length)

    await notificationService.deleteNotification(notificationToDelete.value.id)

    console.log('✅ Notification deleted from server successfully')

    // Update local state immediately for better UX
    const index = notifications.value.findIndex((n: Notification) => n.id === notificationToDelete.value!.id)
    console.log('🔍 Found notification at index:', index)

    if (index !== -1) {
      const notification = notifications.value[index]
      console.log('🗑️ Removing notification from local state:', notification)

      notifications.value.splice(index, 1)

      // Update stats
      notificationStats.value.total = Math.max(0, notificationStats.value.total - 1)
      if (notification && !notification.isRead) {
        notificationStats.value.unread = Math.max(0, notificationStats.value.unread - 1)
      }

      console.log('📊 Updated local state - total:', notificationStats.value.total, 'unread:', notificationStats.value.unread, 'notifications:', notifications.value.length)
    } else {
      console.warn('⚠️ Notification not found in local state, this might cause issues')
    }

    emitNotificationDeleted(notificationToDelete.value.id)

    // Handle pagination edge case
    const maxPage = Math.ceil(notifications.value.length / itemsPerPage.value)
    console.log('📄 Pagination - current page:', currentPage.value, 'max page:', maxPage)

    if (currentPage.value > maxPage && maxPage > 0) {
      currentPage.value = maxPage
      console.log('📄 Adjusted to max page:', currentPage.value)
    }

    // If current page is empty and not first page, go to previous page
    if (paginatedNotifications.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
      console.log('📄 Moved to previous page:', currentPage.value)
    }

    // Show success notification
    successMessage.value = 'Notification deleted successfully'
    showSuccessNotification.value = true

    // Auto-hide success notification after 3 seconds
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 3000)

    // Close modal
    closeDeleteModal()

    // Reload từ server một cách an toàn với fallback
    console.log('🔄 Reloading notifications from server with safety check...')
    try {
      const response = await notificationService.getUserNotifications()
      const serverNotifications = response.notifications || []

      console.log('🔄 Server returned:', serverNotifications.length, 'notifications')

      if (serverNotifications.length > 0) {
        // Server có notifications - cập nhật local state
        notifications.value = serverNotifications
        notificationStats.value.total = serverNotifications.length
        notificationStats.value.unread = serverNotifications.filter(n => !n.isRead).length
        console.log('✅ Server reload successful - updated local state')
      } else {
        // Server trả về 0 notifications - giữ nguyên local state
        console.warn('⚠️ Server returned 0 notifications - keeping current local state')
        console.warn('⚠️ Current local state has:', notifications.value.length, 'notifications')
        console.warn('⚠️ This might indicate a server/database issue')
      }
    } catch (reloadError) {
      console.error('❌ Error reloading from server:', reloadError)
      console.warn('⚠️ Keeping current local state due to reload error')
    }

    console.log('✅ Final state - total:', notificationStats.value.total, 'unread:', notificationStats.value.unread, 'notifications:', notifications.value.length)

  } catch (error: any) {
    console.error('❌ Error deleting notification:', error)

    // Show error in success notification
    if (error.response?.status === 404) {
      successMessage.value = 'Notification not found. It may have been already deleted.'
    } else if (error.response?.status === 500) {
      successMessage.value = 'Server error. Please try again or contact support.'
    } else {
      successMessage.value = 'Error deleting notification. Please try again.'
    }

    showSuccessNotification.value = true
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 5000)

    // Close modal
    closeDeleteModal()

    // Giữ nguyên local state khi có lỗi
    console.log('❌ Deletion failed - keeping current local state')
  }
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  notificationToDelete.value = null
}

const closeSuccessNotification = () => {
  showSuccessNotification.value = false
  successMessage.value = ''
}

const deleteAllNotifications = async () => {
  if (!confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
    return
  }

  try {
    deletingAll.value = true
    await notificationService.deleteAllNotifications()

    // Update local state immediately for better UX
    notifications.value = []
    notificationStats.value = { total: 0, unread: 0 }
    currentPage.value = 1

    emitAllNotificationsDeleted()

    // Don't reload from server - just use local state to avoid issues

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
  if (!dateString) return '-'

  const date = new Date(dateString)

  // Kiểm tra nếu date không hợp lệ
  if (isNaN(date.getTime())) return '-'

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Relative time cho notifications gần đây
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`

  // Absolute time cho notifications cũ hơn
  return date.toLocaleString('en-US', {
    year: 'numeric',
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
  currentPage.value = 1
  // Don't reload from server, just reset page
})

watch(itemsPerPage, () => {
  currentPage.value = 1
  // Don't reload from server, just reset page
})

// Watch for notifications changes to handle pagination edge cases
watch(notifications, () => {
  const maxPage = Math.ceil(notifications.value.length / itemsPerPage.value)
  if (currentPage.value > maxPage && maxPage > 0) {
    currentPage.value = maxPage
  }
}, { deep: true })

// Real-time notification handling
let unsubscribeNewNotification: (() => void) | null = null
let unsubscribeGlobalNotification: (() => void) | null = null
let unsubscribeNotificationDeleted: (() => void) | null = null

const setupRealtimeNotifications = () => {
  // Listen for connection status
  const unsubscribeConnected = realtimeNotificationService.onConnected(() => {
    connectionStatus.value.isConnected = true
    connectionStatus.value.reconnectAttempts = 0
  })

  const unsubscribeDisconnected = realtimeNotificationService.onDisconnected(() => {
    connectionStatus.value.isConnected = false
  })

  // Listen for new notifications
  unsubscribeNewNotification = realtimeNotificationService.onNewNotification((notification: RealtimeNotification) => {
    console.log('📨 Real-time new notification received:', notification)

    // Add new notification to the top of the list
    notifications.value.unshift(notification as any)

    // Update stats
    notificationStats.value.total++
    // Assume new notifications are unread
    notificationStats.value.unread++

    // Show success notification
    successMessage.value = `New notification: ${notification.message}`
    showSuccessNotification.value = true
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 3000)
  })

  // Listen for global notifications
  unsubscribeGlobalNotification = realtimeNotificationService.onGlobalNotification((notification: RealtimeNotification) => {
    console.log('📢 Real-time global notification received:', notification)

    // Add global notification to the top of the list
    notifications.value.unshift(notification as any)

    // Update stats
    notificationStats.value.total++
    // Assume global notifications are unread
    notificationStats.value.unread++

    // Show success notification
    successMessage.value = `Global notification: ${notification.message}`
    showSuccessNotification.value = true
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 3000)
  })

  // Listen for notification deletions
  unsubscribeNotificationDeleted = realtimeNotificationService.onNotificationDeleted((event) => {
    console.log('🗑️ Real-time notification deleted:', event)

    // Remove notification from local state
    const index = notifications.value.findIndex((n: any) => n.id === event.id)
    if (index !== -1) {
      const notification = notifications.value[index]
      notifications.value.splice(index, 1)

      // Update stats
      notificationStats.value.total = Math.max(0, notificationStats.value.total - 1)
      if (notification && !notification.isRead) {
        notificationStats.value.unread = Math.max(0, notificationStats.value.unread - 1)
      }

      // Handle pagination edge case
      const maxPage = Math.ceil(notifications.value.length / itemsPerPage.value)
      if (currentPage.value > maxPage && maxPage > 0) {
        currentPage.value = maxPage
      }

      // If current page is empty and not first page, go to previous page
      if (paginatedNotifications.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
    }
  })
}

const cleanupRealtimeNotifications = () => {
  if (unsubscribeNewNotification) {
    unsubscribeNewNotification()
    unsubscribeNewNotification = null
  }
  if (unsubscribeGlobalNotification) {
    unsubscribeGlobalNotification()
    unsubscribeGlobalNotification = null
  }
  if (unsubscribeNotificationDeleted) {
    unsubscribeNotificationDeleted()
    unsubscribeNotificationDeleted = null
  }
}

onMounted(() => {
  loadNotifications()
  setupRealtimeNotifications()
})

onUnmounted(() => {
  cleanupRealtimeNotifications()
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

.stat-item.connection-status .stat-number {
  color: #10b981;
}

.stat-item.connection-status.disconnected .stat-number {
  color: #ef4444;
}

.stat-item.connection-status i {
  font-size: 20px;
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
  gap: 16px;
  align-items: center;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-controls label {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  min-width: 140px;
}

.sort-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.action-buttons-group {
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

.empty-page-container {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.empty-page-container h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.empty-page-container p {
  color: #64748b;
  margin: 0 0 16px 0;
}

.go-to-first-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.go-to-first-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
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

/* Pagination */
.pagination {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 32px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
}



.pagination-info {
  text-align: center;
}

.pagination-text {
  font-size: 14px;
  color: #6b7280;
}

.filter-info {
  color: #3b82f6;
  font-weight: 600;
  margin-left: 8px;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.pagination-btn {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 40px;
  text-align: center;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.page-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.page-btn.active:hover {
  background: #2563eb;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-settings {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.items-per-page-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.items-per-page-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .sort-controls {
    justify-content: center;
  }

  .action-buttons-group {
    justify-content: center;
  }

  .notification-item {
    padding: 16px 20px;
  }

  .notification-actions {
    margin-left: 8px;
  }

  .pagination-controls {
    flex-wrap: wrap;
    gap: 6px;
  }

  .pagination-btn {
    min-width: 36px;
    padding: 6px 10px;
  }

  .page-btn {
    min-width: 36px;
    padding: 6px 10px;
  }

  .pagination-settings {
    flex-direction: column;
    gap: 6px;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0 0 16px 0;
  color: #4b5563;
  line-height: 1.6;
}

.notification-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin: 0;
  font-style: italic;
  color: #6b7280;
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px 24px 24px;
  border-top: 1px solid #e5e7eb;
}

.modal-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.modal-btn.secondary {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.modal-btn.secondary:hover {
  background: #e5e7eb;
}

.modal-btn.danger {
  background: #dc2626;
  color: white;
}

.modal-btn.danger:hover {
  background: #b91c1c;
}

/* Success Notification */
.success-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 400px;
  animation: notificationSlideIn 0.3s ease-out;
}

@keyframes notificationSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.success-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.success-content i {
  font-size: 18px;
  color: #d1fae5;
}

.success-close-btn {
  background: none;
  border: none;
  color: #d1fae5;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 16px;
}

.success-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* Responsive Modal */
@media (max-width: 768px) {
  .modal-content {
    margin: 20px;
    max-height: calc(100vh - 40px);
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-btn {
    justify-content: center;
  }

  .success-notification {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>
