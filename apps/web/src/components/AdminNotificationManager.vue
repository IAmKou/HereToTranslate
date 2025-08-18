<template>
  <!-- Global Notification Management Panel -->
  <div class="admin-notification-manager">
    <div class="header-section">
      <h2>Notification Management</h2>
      <div class="header-actions">
        <button @click="showCreateModal = true" class="btn-create">
          <i class="pi pi-plus"></i>Send New Notification
        </button>
      </div>
    </div>



    <!-- Global Notifications List -->
    <div class="notifications-list">
      <div class="list-header">
        <h3>Global Notifications <span class="notification-count">({{ globalNotificationCount }})</span></h3>
        <div class="list-controls">
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search notifications..."
              class="search-input"
            />
          </div>
          <button @click="refreshNotifications" class="btn-refresh" :disabled="loading">
            <i class="pi pi-refresh" :class="{ 'pi-spin': loading }"></i>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <i class="pi pi-spinner pi-spin"></i> Loading notifications...
      </div>

      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <i class="pi pi-inbox"></i>
        <p>No notifications found</p>
      </div>

      <div v-else>
        <div
          v-for="notification in paginatedNotifications"
          :key="notification.id"
          class="notification-item"
        >
          <div class="notification-content">
            <div class="notification-header">
              <span class="notification-type">{{ notification.type }}</span>
              <span class="notification-date">{{ formatDate(notification.createdAt) }}</span>
            </div>
            <p class="notification-message">{{ notification.message }}</p>
            <div class="notification-meta">
              Created by: {{ notification.createdBy?.fullName || notification.createdBy?.username }}
            </div>
          </div>
          <div class="notification-actions">
            <button @click="editNotification(notification)" class="btn-edit" title="Edit">
              <i class="pi pi-pencil"></i>
            </button>
            <button @click="deleteNotification(notification.id)" class="btn-delete" title="Delete">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-controls">
          <div class="pagination-info">
            <span>
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredNotifications.length) }} of {{ filteredNotifications.length }} notifications
              <span v-if="totalPages > 1">({{ totalPages }} page{{ totalPages > 1 ? 's' : '' }})</span>
            </span>
          </div>
          <div class="pagination-buttons">
            <button @click="goToPage(1)" :disabled="currentPage === 1" class="btn btn-secondary">
              <i class="pi pi-angle-double-left"></i> First
            </button>
            <button @click="prevPage" :disabled="currentPage === 1" class="btn btn-secondary">
              <i class="pi pi-chevron-left"></i> Previous
            </button>
            <span class="page-info" v-if="totalPages > 1">Page {{ currentPage }} of {{ totalPages }}</span>
            <button @click="nextPage" :disabled="currentPage === totalPages" class="btn btn-secondary">
              Next <i class="pi pi-chevron-right"></i>
            </button>
            <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="btn btn-secondary">
              Last <i class="pi pi-angle-double-right"></i>
            </button>
          </div>
          <div class="page-size-selector">
            <label for="pageSize">Show:</label>
            <select id="pageSize" v-model="itemsPerPage" @change="currentPage = 1" class="page-size-select">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span>per page</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <h3>Create Global Notification</h3>
        <form @submit.prevent="createGlobalNotification">
          <div class="form-group">
            <label>Notification Type:</label>
            <select v-model="createForm.type" required>
              <option value="announcement">Announcement</option>
              <option value="update">Update</option>
              <option value="maintenance">Maintenance</option>
              <option value="alert">Alert</option>
              <option value="info">Information</option>
            </select>
          </div>
          <div class="form-group">
            <label>Message:</label>
            <textarea
              v-model="createForm.message"
              required
              rows="4"
              placeholder="Enter notification content..."
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">
              Create Notification
            </button>
            <button type="button" @click="showCreateModal = false" class="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create for All Users Modal -->
    <div v-if="showCreateForAllModal" class="modal-overlay" @click="showCreateForAllModal = false">
      <div class="modal-content" @click.stop>
        <h3>Send Notification to All Users</h3>
        <form @submit.prevent="createNotificationForAll">
          <div class="form-group">
            <label>Notification Type:</label>
            <select v-model="createAllForm.type" required>
              <option value="announcement">Announcement</option>
              <option value="update">Update</option>
              <option value="maintenance">Maintenance</option>
              <option value="alert">Alert</option>
              <option value="info">Information</option>
            </select>
          </div>
          <div class="form-group">
            <label>Message:</label>
            <textarea
              v-model="createAllForm.message"
              required
              rows="4"
              placeholder="Enter notification content..."
            ></textarea>
          </div>
          <div class="warning-note">
            <strong>Note:</strong> This notification will be sent to all active users in the system.
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">
              Send to All
            </button>
            <button type="button" @click="showCreateForAllModal = false" class="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="showEditModal = false">
      <div class="modal-content" @click.stop>
        <h3>Edit Notification</h3>
        <form @submit.prevent="updateNotification">
          <div class="form-group">
            <label>Notification Type:</label>
            <select v-model="editForm.type" required>
              <option value="announcement">Announcement</option>
              <option value="update">Update</option>
              <option value="maintenance">Maintenance</option>
              <option value="alert">Alert</option>
              <option value="info">Information</option>
            </select>
          </div>
          <div class="form-group">
            <label>Message:</label>
            <textarea
              v-model="editForm.message"
              required
              rows="4"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">
              Update
            </button>
            <button type="button" @click="showEditModal = false" class="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
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

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content" @click.stop>
        <h3>Confirm Delete</h3>
        <div class="delete-content">
          <div class="delete-icon">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <h4>Delete Global Notification</h4>
          <p>Are you sure you want to delete this notification?</p>
          <div class="notification-preview">
            <strong>Type:</strong> {{ notificationToDelete?.type }}<br>
            <strong>Message:</strong> {{ notificationToDelete?.message }}
          </div>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
        <div class="form-actions">
          <button @click="showDeleteModal = false" class="btn-secondary">
            Cancel
          </button>
          <button @click="confirmDeleteNotification" :disabled="deleting" class="btn-danger">
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { adminNotificationService } from '../services/admin-notification.service'
import { realtimeNotificationService, type RealtimeNotification } from '../services/realtime-notification.service'
import { useAuthStore } from '../store/auth'

interface Notification {
  id: string
  type: string
  message: string
  isGlobal: boolean
  createdAt: string
  createdBy?: {
    id: string
    username: string
    fullName?: string
  }
}

const globalNotifications = ref<Notification[]>([])
const globalNotificationCount = ref(0)
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const showCreateModal = ref(false)
const showCreateForAllModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

const createForm = reactive({
  type: 'announcement',
  message: ''
})

const createAllForm = reactive({
  type: 'announcement',
  message: ''
})

const editingNotificationId = ref<string | null>(null)

const editForm = reactive({
  type: 'announcement',
  message: ''
})

const notificationToDelete = ref<Notification | null>(null)
const deleting = ref(false)

// Success notification state
const showSuccessNotification = ref(false)
const successMessage = ref('')

// Connection status
const connectionStatus = ref({ isConnected: false, reconnectAttempts: 0, maxReconnectAttempts: 5 })

// Computed properties
const filteredNotifications = computed(() => {
  if (!searchQuery.value.trim()) {
    return globalNotifications.value
  }
  const query = searchQuery.value.toLowerCase()
  return globalNotifications.value.filter((notification: Notification) =>
    notification.message.toLowerCase().includes(query) ||
    notification.type.toLowerCase().includes(query) ||
    (notification.createdBy?.fullName || notification.createdBy?.username || '').toLowerCase().includes(query)
  )
})

const totalPages = computed(() => {
  return Math.ceil(filteredNotifications.value.length / itemsPerPage.value)
})

const paginatedNotifications = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredNotifications.value.slice(start, end)
})

const canCreateNotification = computed(() => {
  return createForm.type && createForm.message.trim()
})

const canCreateNotificationForAll = computed(() => {
  return createAllForm.type && createAllForm.message.trim()
})

// Methods
const loadGlobalNotifications = async () => {
  loading.value = true
  try {
    const response = await adminNotificationService.getGlobalNotifications()
    globalNotifications.value = response.notifications || []
    globalNotificationCount.value = globalNotifications.value.length
  } catch (error) {
    console.error('Error loading notifications:', error)
    globalNotifications.value = []
    globalNotificationCount.value = 0
  } finally {
    loading.value = false
  }
}

const loadGlobalNotificationCount = async () => {
  try {
    const countResponse = await adminNotificationService.getGlobalNotificationCount()
    globalNotificationCount.value = countResponse.count
  } catch (error) {
    console.error('Error loading notification count:', error)
  }
}

const createGlobalNotification = async () => {
  try {
    console.log('🔄 Creating global notification...', createForm)
    console.log('🔌 WebSocket connection status:', connectionStatus.value.isConnected)

    const response = await adminNotificationService.createGlobalNotification(createForm)
    console.log('✅ Notification created successfully:', response)

    // Add new notification to local state for immediate UX
    const newNotification: Notification = {
      id: response.id,
      type: response.type,
      message: response.message,
      isGlobal: true, // Global notifications are always true
      createdAt: response.createdAt,
      createdBy: {
        id: 'current-user', // We'll get this from auth store if needed
        username: 'Admin',
        fullName: 'Administrator'
      }
    }

    console.log('📝 Adding to local state:', newNotification)

    // Add to the beginning of the list
    globalNotifications.value.unshift(newNotification)
    globalNotificationCount.value++

    console.log('📊 Updated local state:', {
      count: globalNotificationCount.value,
      notifications: globalNotifications.value.length,
      firstNotification: globalNotifications.value[0]
    })

    // Reset form
    createForm.type = 'announcement'
    createForm.message = ''
    showCreateModal.value = false

    // Reset to first page
    currentPage.value = 1

    showSuccessMessage('Global notification created successfully')
  } catch (error) {
    console.error('❌ Error creating notification:', error)
    showSuccessMessage('Error creating notification')

    // Auto-hide error notification after 5 seconds
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 5000)
  }
}

const createNotificationForAll = async () => {
  try {
    const response = await adminNotificationService.createNotificationForAllUsers(createAllForm)

    // Reset form
    createAllForm.type = 'announcement'
    createAllForm.message = ''
    showCreateForAllModal.value = false

    showSuccessMessage(`Created ${response.count} notifications for all users`)

    // Note: For notifications sent to all users, we don't add them to the global list
    // since they are user-specific notifications, not global ones
    // The real-time listeners will handle updates if needed

    // Reset to first page
    currentPage.value = 1
  } catch (error: any) {
    console.error('Error creating notification for all:', error)
    showSuccessMessage('Error creating notification')

    // Auto-hide error notification after 5 seconds
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 5000)
  }
}

const editNotification = (notification: Notification) => {
  editingNotificationId.value = notification.id
  editForm.type = notification.type
  editForm.message = notification.message
  showEditModal.value = true
}

const updateNotification = async () => {
  try {
    // Cache id & new values before we mutate state
    const idToUpdate = editingNotificationId.value
    const newType = editForm.type
    const newMessage = editForm.message

    await adminNotificationService.updateNotification(idToUpdate, {
      type: editForm.type,
      message: editForm.message
    })

    showEditModal.value = false

    // Update local state immediately for better UX
    const notification = globalNotifications.value.find((n: Notification) => n.id === idToUpdate)
    if (notification) {
      notification.type = newType
      notification.message = newMessage
    }

    // Reset editor state after applying local update
    editingNotificationId.value = null
    editForm.type = 'announcement'
    editForm.message = ''

    // Don't reload from server - just use local state to avoid issues
  } catch (error: any) {
    console.error('Error updating notification:', error)
    showSuccessMessage('Error updating notification')

    // Auto-hide error notification after 5 seconds
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 5000)
  }
}

const deleteNotification = (id: string) => {
  const notification = globalNotifications.value.find((n: Notification) => n.id === id)
  if (notification) {
    notificationToDelete.value = notification
    showDeleteModal.value = true
  }
}

const confirmDeleteNotification = async () => {
  if (!notificationToDelete.value) return

  deleting.value = true
  try {
    await adminNotificationService.deleteNotification(notificationToDelete.value.id)

    // Update local state immediately for better UX
    const index = globalNotifications.value.findIndex((n: Notification) => n.id === notificationToDelete.value!.id)
    if (index !== -1) {
      globalNotifications.value.splice(index, 1)
      globalNotificationCount.value = Math.max(0, globalNotificationCount.value - 1)
    }

    // Show success notification
    showSuccessMessage('Notification deleted successfully')

    // Handle pagination edge case
    const maxPage = Math.ceil(globalNotifications.value.length / itemsPerPage.value)
    if (currentPage.value > maxPage && maxPage > 0) {
      currentPage.value = maxPage
    }

    // If current page is empty and not first page, go to previous page
    if (paginatedNotifications.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }

    showDeleteModal.value = false
    notificationToDelete.value = null

    // Don't reload from server - just use local state to avoid issues
  } catch (error: any) {
    console.error('Error deleting notification:', error)

    // Show error in success notification
    if (error.response?.status === 404) {
      showSuccessMessage('Notification not found. It may have been already deleted.')
    } else if (error.response?.status === 500) {
      showSuccessMessage('Server error. Please try again or contact support.')
    } else {
      showSuccessMessage('Error deleting notification. Please try again.')
    }

    // Auto-hide error notification after 5 seconds
    setTimeout(() => {
      showSuccessNotification.value = false
    }, 5000)

    // Don't reload from server - just use local state to avoid issues
  } finally {
    deleting.value = false
  }
}

const refreshNotifications = () => {
  loadGlobalNotifications()
  loadGlobalNotificationCount()
  currentPage.value = 1
  searchQuery.value = ''
}

const formatDate = (dateString: string) => {
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

// Pagination methods
const goToPage = (page: number) => {
  currentPage.value = page
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const showSuccessMessage = (message: string) => {
  successMessage.value = message
  showSuccessNotification.value = true

  // Auto-hide success notification after 3 seconds
  setTimeout(() => {
    showSuccessNotification.value = false
  }, 3000)
}

const closeSuccessNotification = () => {
  showSuccessNotification.value = false
  successMessage.value = ''
}

// Watch for search query changes to reset pagination
watch(searchQuery, () => {
  currentPage.value = 1
})

// Real-time notification handling
let unsubscribeNewNotification: (() => void) | null = null
let unsubscribeGlobalNotification: (() => void) | null = null
let unsubscribeNotificationDeleted: (() => void) | null = null

const setupRealtimeNotifications = () => {
  console.log('🔌 Setting up real-time notifications...')
  const authStore = useAuthStore()
  const currentUserId = authStore.user?.id ? String(authStore.user.id) : null

  // Listen for connection status
  const unsubscribeConnected = realtimeNotificationService.onConnected(() => {
    console.log('✅ WebSocket connected in AdminNotificationManager')
    connectionStatus.value.isConnected = true
    connectionStatus.value.reconnectAttempts = 0
  })

  const unsubscribeDisconnected = realtimeNotificationService.onDisconnected(() => {
    console.log('❌ WebSocket disconnected in AdminNotificationManager')
    connectionStatus.value.isConnected = false
  })

  // Listen for new notifications
  unsubscribeNewNotification = realtimeNotificationService.onNewNotification((notification: RealtimeNotification) => {
    console.log('📨 Real-time new notification received:', notification)

    // Ignore if it's sent by current admin
    if (currentUserId && notification.createdByUserId === currentUserId) {
      return
    }

    // Dedupe by id: update if exists, else insert at top
    const idx = globalNotifications.value.findIndex((n: any) => n.id === notification.id)
    if (idx > -1) {
      const existing = globalNotifications.value[idx] as any
      existing.type = (notification as any).type
      existing.message = (notification as any).message
      existing.createdAt = (notification as any).createdAt
    } else {
      globalNotifications.value.unshift(notification as any)
      globalNotificationCount.value++
    }

    console.log('📊 Real-time update - Updated local state:', {
      count: globalNotificationCount.value,
      notifications: globalNotifications.value.length,
      firstNotification: globalNotifications.value[0]
    })

    // Show success notification (already skipped for sender)
    showSuccessMessage(`New notification: ${notification.message}`)
  })

  // Listen for global notifications
  unsubscribeGlobalNotification = realtimeNotificationService.onGlobalNotification((notification: RealtimeNotification) => {
    console.log('📢 Real-time global notification received:', notification)

    // Ignore if it's sent by current admin
    if (currentUserId && notification.createdByUserId === currentUserId) {
      return
    }

    // Dedupe by id
    const idx = globalNotifications.value.findIndex((n: any) => n.id === notification.id)
    if (idx > -1) {
      const existing = globalNotifications.value[idx] as any
      existing.type = (notification as any).type
      existing.message = (notification as any).message
      existing.createdAt = (notification as any).createdAt
    } else {
      globalNotifications.value.unshift(notification as any)
      globalNotificationCount.value++
    }

    // Show success notification
    showSuccessMessage(`Global notification: ${notification.message}`)
  })

  // Listen for notification deletions
  unsubscribeNotificationDeleted = realtimeNotificationService.onNotificationDeleted((event) => {
    console.log('🗑️ Real-time notification deleted:', event)

    // Remove notification from local state
    const index = globalNotifications.value.findIndex((n: any) => n.id === event.id)
    if (index !== -1) {
      const notification = globalNotifications.value[index]
      globalNotifications.value.splice(index, 1)
      globalNotificationCount.value = Math.max(0, globalNotificationCount.value - 1)

      // Handle pagination edge case
      const maxPage = Math.ceil(globalNotifications.value.length / itemsPerPage.value)
      if (currentPage.value > maxPage && maxPage > 0) {
        currentPage.value = maxPage
      }

      // If current page is empty and not first page, go to previous page
      if (paginatedNotifications.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
    }
  })

  console.log('🔌 Real-time notifications setup complete')
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

// Test function for real-time notifications
const testRealtimeNotification = () => {
  console.log('🧪 Testing real-time notification...')

  // Create a test notification object
  const testNotification: Notification = {
    id: `test-${Date.now()}`,
    type: 'test',
    message: 'This is a test real-time notification',
    isGlobal: true,
    createdAt: new Date().toISOString(),
    createdBy: {
      id: 'test-user',
      username: 'TestUser',
      fullName: 'Test User'
    }
  }

  console.log('🧪 Test notification object:', testNotification)

  // Add to local state to test if the UI updates
  globalNotifications.value.unshift(testNotification)
  globalNotificationCount.value++

  console.log('🧪 Added test notification to local state:', {
    count: globalNotificationCount.value,
    notifications: globalNotifications.value.length,
    firstNotification: globalNotifications.value[0]
  })

  showSuccessMessage('Test notification added to local state')

  // Remove test notification after 5 seconds
  setTimeout(() => {
    const index = globalNotifications.value.findIndex((n: Notification) => n.id === testNotification.id)
    if (index !== -1) {
      globalNotifications.value.splice(index, 1)
      globalNotificationCount.value = Math.max(0, globalNotificationCount.value - 1)
      console.log('🧪 Test notification removed from local state')
    }
  }, 5000)
}

onMounted(async () => {
  console.log('🚀 AdminNotificationManager mounted, setting up...')
  await loadGlobalNotifications()
  await loadGlobalNotificationCount()
  setupRealtimeNotifications()
  console.log('🚀 AdminNotificationManager setup complete')
})

onUnmounted(() => {
  cleanupRealtimeNotifications()
})
</script>

<style scoped>
.admin-notification-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  background: transparent;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.admin-notification-manager h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-create, .btn-create-all {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-create-all {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-create:hover, .btn-create-all:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-create-all:hover {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.notification-count {
  color: #6b7280;
  font-size: 16px;
  font-weight: 400;
  margin-left: 8px;
}

/* Notifications List */
.notifications-list {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.list-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.connection-indicator.connected {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.connection-indicator.disconnected {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.connection-indicator i {
  font-size: 14px;
}

.search-box {
  position: relative;
}

.search-input {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  width: 200px;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.btn-refresh {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #6b7280;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #e5e7eb;
  color: #374151;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
}

.loading-state i {
  margin-right: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
}

.empty-state i {
  font-size: 32px;
  margin-bottom: 12px;
  display: block;
  color: #d1d5db;
}

.notification-item {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.notification-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.notification-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: #3b82f6;
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
  flex-wrap: wrap;
  gap: 8px;
}

.notification-type {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.notification-date {
  color: #6b7280;
  font-size: 12px;
  font-weight: 400;
}

.notification-message {
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  margin-bottom: 12px;
}

.notification-meta {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.notification-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.btn-edit, .btn-delete {
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.btn-edit {
  background: #f59e0b;
  color: white;
}

.btn-edit:hover {
  background: #d97706;
  transform: translateY(-1px);
}

.btn-delete {
  background: #ef4444;
  color: white;
}

.btn-delete:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

/* Pagination */
.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 16px;
}

.pagination-info {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f3f4f6;
  color: #9ca3af;
}

.page-info {
  font-size: 13px;
  color: #6b7280;
  margin: 0 12px;
  font-weight: 500;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-size-select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  background-color: #f9fafb;
  transition: all 0.3s ease;
}

.page-size-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
  padding: 24px 24px 0 24px;
}

.modal-content form {
  padding: 0 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 13px;
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.warning-note {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  color: #92400e;
  font-size: 12px;
}

.warning-note strong {
  color: #78350f;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  margin-top: 20px;
}

.btn-primary, .btn-secondary {
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.delete-content {
  text-align: center;
  padding: 24px;
}

.delete-icon {
  font-size: 48px;
  color: #ef4444;
  margin-bottom: 20px;
}

.delete-content h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.delete-content p {
  font-size: 14px;
  color: #475569;
  margin-bottom: 20px;
}

.notification-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  font-size: 12px;
  color: #374151;
  font-style: italic;
}

.warning-text {
  color: #92400e;
  font-size: 12px;
  margin-top: 16px;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-notification-manager {
    padding: 12px;
  }

  .header-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .list-controls {
    justify-content: center;
  }

  .search-input {
    width: 100%;
    max-width: 250px;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }

  .modal-content h3,
  .modal-content form,
  .form-actions {
    padding-left: 20px;
    padding-right: 20px;
  }

  .notification-item {
    padding: 12px;
    flex-direction: column;
    gap: 12px;
  }

  .notification-actions {
    align-self: flex-end;
  }

  .pagination-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .pagination-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }

  .page-size-selector {
    justify-content: center;
  }
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

/* Responsive Success Notification */
@media (max-width: 768px) {
  .success-notification {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>
