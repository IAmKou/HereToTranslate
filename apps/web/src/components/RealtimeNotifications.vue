<template>
  <div class="realtime-notifications">
    <!-- Notification Bell Icon -->
    <div class="notification-bell" @click="toggleNotificationPanel">
      <i class="pi pi-bell" :class="{ 'has-unread': filteredUnreadCount > 0 }"></i>
      <span v-if="filteredUnreadCount > 0" class="unread-badge">{{ filteredUnreadCount }}</span>
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
        <!-- Note: Removed Project Invitations Section to avoid duplication -->
        <!-- Project invitations will only appear in My Notifications page -->

        <!-- Regular Notifications Section -->
        <div v-if="filteredNotifications.length > 0" class="notifications-section">
          <div class="section-header">
            <h4>Other Notifications</h4>
          </div>
          <div
            v-for="notification in filteredNotifications.slice(0, 5)"
            :key="notification.id"
            class="notification-item"
            :class="{ 'unread': !notification.isRead }"
            @click="handleNotificationClick(notification)"
          >
            <div class="notification-content">
              <div class="notification-header">
                <span class="notification-type">{{ getTypeLabel(notification.type) }}</span>
                <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
              </div>
              <p class="notification-message">{{ getCleanMessage(notification) }}</p>

              <!-- Add action buttons for project_invite notifications -->
              <div v-if="notification.type === 'project_invite' && !isNotificationProcessed(notification)" class="invitation-actions" @click.stop>
                <button @click="acceptProjectInvitationFromNotification(notification)" class="accept-btn">
                  <i class="pi pi-check"></i>
                  Join Project
                </button>
                <button @click="declineProjectInvitationFromNotification(notification)" class="decline-btn">
                  <span class="close-icon">×</span>
                  Decline
                </button>
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
            </div>
            <div class="notification-actions" @click.stop>
              <button v-if="!notification.isRead" @click="markAsRead(notification)" class="mark-read">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredNotifications.length === 0" class="empty-state">
          No notifications
        </div>
      </div>

      <div class="panel-footer">
        <div class="view-all-buttons">
          <button @click="navigateToNotifications" class="view-all">
            View All Notifications
          </button>
        </div>
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
import { useRouter } from 'vue-router'
import { io, Socket } from 'socket.io-client'
import { notificationService } from '../services/notification.service'
import { projectInvitationService, type ProjectInvitation } from '../services/project-invitation.service'
import { useAuthStore } from '../store/auth'
import { getChatConfig } from '../utils/chat-config'
import { useNotificationSync } from '../composables/useNotificationSync'

const router = useRouter()
const { onNotificationDeleted, onNotificationMarkedRead, onAllNotificationsDeleted, onAllNotificationsMarkedRead, emitNotificationMarkedRead, emitAllNotificationsMarkedRead } = useNotificationSync()

interface Notification {
  id: string
  type: string
  message: string
  createdAt: string
  isRead?: boolean
  isGlobal?: boolean
  readAt?: string
}

interface ToastNotification extends Notification {
  id: string
}

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const config = getChatConfig()

const notifications = ref<Notification[]>([])
const projectInvitations = ref<ProjectInvitation[]>([])
const toastNotifications = ref<ToastNotification[]>([])
const showNotificationPanel = ref(false)
const loading = ref(false)
const hasMore = ref(true)
const unreadCount = ref(0)
const currentRoute = ref(router.currentRoute.value)

// Computed property to filter notifications based on current route
const filteredNotifications = computed(() => {
  console.log('🔍 Computing filtered notifications, current route:', currentRoute.value.path)

  let filtered = notifications.value

  // If user is in project detail page, hide project_invite notifications
  if (currentRoute.value.path.startsWith('/projects/') && currentRoute.value.params.id) {
    console.log('🏠 Filtering out project_invite notifications due to project detail location')
    filtered = filtered.filter((n: Notification) => n.type !== 'project_invite')
  }

  // Hide processed project_invite notifications from popup (show only in My Notifications)
  filtered = filtered.filter((n: Notification) => {
    if (n.type === 'project_invite' && isNotificationProcessed(n)) {
      console.log('🚫 Hiding processed notification from popup:', n.message)
      return false
    }
    return true
  })

  console.log('📋 Original notifications count:', notifications.value.length)
  console.log('📋 Filtered notifications count:', filtered.length)
  return filtered
})

// Computed property for filtered unread count
const filteredUnreadCount = computed(() => {
  // If user is in project detail page, exclude project_invite notifications from unread count
  if (currentRoute.value.path.startsWith('/projects/') && currentRoute.value.params.id) {
    const nonProjectInviteUnread = notifications.value.filter((n: Notification) =>
      n.type !== 'project_invite' && !n.isRead
    ).length
    console.log('📊 Filtered unread count (excluding project_invite):', nonProjectInviteUnread)
    return nonProjectInviteUnread
  }

  console.log('📊 Using original unread count:', unreadCount.value)
  return unreadCount.value
})

let socket: Socket | null = null
let toastIdCounter = 0

const toggleNotificationPanel = async () => {
  showNotificationPanel.value = !showNotificationPanel.value
  if (isAdmin.value) {
    return
  }
  if (showNotificationPanel.value && notifications.value.length === 0) {
    await loadNotifications()
  }

  // Log current route for debugging
  if (showNotificationPanel.value) {
    console.log('🔔 Opening notification panel, current route:', currentRoute.value.path)
    console.log('📋 Current notifications in popup:', notifications.value.map((n: Notification) => ({
      id: n.id,
      type: n.type,
      message: n.message.substring(0, 50) + '...',
      isRead: n.isRead
    })))
    if (currentRoute.value.path.startsWith('/projects/') && currentRoute.value.params.id) {
      console.log('🏠 User is in project detail, notifications will be filtered automatically')
    }
  }
}

const closePanel = () => {
  showNotificationPanel.value = false
}

const loadNotifications = async () => {
  if (isAdmin.value) return
  loading.value = true
  try {
    console.log('🔄 Loading notifications from server...')
    const response = await notificationService.getUserNotifications(20)
    console.log('📋 Server response notifications:', response.notifications.map((n: any) => ({
      id: n.id,
      type: n.type,
      message: n.message.substring(0, 50) + '...',
      isRead: n.isRead
    })))

    notifications.value = response.notifications.map(notif => ({
      ...notif,
      isRead: notif.isRead // Preserve actual read status from server
    }))

    console.log('📋 Updated local notifications:', notifications.value.map((n: Notification) => ({
      id: n.id,
      type: n.type,
      message: n.message.substring(0, 50) + '...',
      isRead: n.isRead
    })))

    // Load project invitations
    await loadProjectInvitations()

    // Update unread count
    updateUnreadCount()
  } catch (error) {
    console.error('Error loading notifications:', error)
  } finally {
    loading.value = false
  }
}

const loadProjectInvitations = async () => {
  try {
    const response = await projectInvitationService.getMyInvitations('pending')
    projectInvitations.value = response.invitations
  } catch (error) {
    console.error('Error loading project invitations:', error)
  }
}

const loadMoreNotifications = async () => {
  // Implementation for pagination
  try {
    if (isAdmin.value) return
    const response = await notificationService.getUserNotifications(20)
    // Add to existing notifications...
  } catch (error) {
    console.error('Error loading more notifications:', error)
  }
}

const markAsRead = async (notification: Notification) => {
  if (!notification.isRead) {
    try {
      if (isAdmin.value) return
      await notificationService.markAsRead(notification.id)
      notification.isRead = true
      notification.readAt = new Date().toISOString()
      updateUnreadCount()
      emitNotificationMarkedRead(notification.id)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
}

const markAllAsRead = async () => {
  try {
    if (isAdmin.value) return
    await notificationService.markAllAsRead()
    notifications.value.forEach(notif => {
      if (!notif.isRead) {
        notif.isRead = true
        notif.readAt = new Date().toISOString()
      }
    })
    updateUnreadCount()
    emitAllNotificationsMarkedRead()
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

const updateUnreadCount = async () => {
  try {
    if (isAdmin.value) { unreadCount.value = 0; return }
    const response = await notificationService.getNotificationCount()
    // Note: Removed project invitations count since they're not shown in popup anymore
    unreadCount.value = response.unread
  } catch (error) {
    console.error('Error updating unread count:', error)
  }
}

const addToast = (notification: Notification) => {
  if (isAdmin.value) return
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
  if (!authStore.user || isAdmin.value) return

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

    // Ignore popups for the sender
    const currentUserId = authStore.user?.id ? String(authStore.user.id) : null
    if (currentUserId && notification.createdByUserId === currentUserId) {
      return
    }

    // Check if this is a project_invite notification and user is in project detail
    const currentRoute = router.currentRoute.value
    if (notification.type === 'project_invite' &&
      currentRoute.path.startsWith('/projects/') &&
      currentRoute.params.id) {
      console.log('🚫 Ignoring project_invite notification because user is in project detail')
      return
    }

    // Dedupe by id: update if exists, else insert at top
    const existingIndex = notifications.value.findIndex(n => n.id === notification.id)
    if (existingIndex > -1) {
      const n = notifications.value[existingIndex]
      n.type = notification.type
      n.message = notification.message
      n.createdAt = notification.createdAt
    } else {
      notifications.value.unshift({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt,
        isRead: false,
        isGlobal: notification.isGlobal
      })
      // Update unread count only when adding new
      unreadCount.value++
    }

    // Show toast
    addToast(notification)
  })

  socket.on('global_notification', (notification: any) => {
    console.log('📢 Global notification received:', notification)

    // Ignore popups for the sender
    const currentUserId = authStore.user?.id ? String(authStore.user.id) : null
    if (currentUserId && notification.createdByUserId === currentUserId) {
      return
    }

    // Check if this is a project_invite notification and user is in project detail
    const currentRoute = router.currentRoute.value
    if (notification.type === 'project_invite' &&
      currentRoute.path.startsWith('/projects/') &&
      currentRoute.params.id) {
      console.log('🚫 Ignoring global project_invite notification because user is in project detail')
      return
    }

    // Dedupe by id
    const existingIndex = notifications.value.findIndex(n => n.id === notification.id)
    if (existingIndex > -1) {
      const n = notifications.value[existingIndex]
      n.type = notification.type
      n.message = notification.message
      n.createdAt = notification.createdAt
    } else {
      notifications.value.unshift({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt,
        isRead: false,
        isGlobal: true
      })
      // Update unread count when adding new
      unreadCount.value++
    }

    // Show toast
    addToast(notification)
  })

  socket.on('notification_deleted', (data: { id: string }) => {
    console.log('🗑️ Notification deleted:', data.id)

    // Remove from local notifications list
    const index = notifications.value.findIndex(n => n.id === data.id)
    if (index > -1) {
      const deletedNotification = notifications.value[index]
      notifications.value.splice(index, 1)

      // Update unread count if the deleted notification was unread
      if (!deletedNotification.isRead) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    }
  })

  socket.on('notification_marked_read', (data: { id: string }) => {
    console.log('✅ Notification marked as read:', data.id)

    // Update local notification status
    const notification = notifications.value.find(n => n.id === data.id)
    if (notification && !notification.isRead) {
      notification.isRead = true
      notification.readAt = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  })

  socket.on('all_notifications_deleted', () => {
    console.log('🗑️ All notifications deleted')

    // Clear local notifications list
    notifications.value = []
    unreadCount.value = 0
  })

  socket.on('all_notifications_marked_read', () => {
    console.log('✅ All notifications marked as read')

    // Update all notifications to read status
    notifications.value.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
      }
    })
    unreadCount.value = 0
  })

  // Note: Removed project invitation socket listener to avoid popup notification
  // Project invitations will only appear in My Notifications page
  // socket.on('new_project_invitation', (invitation: any) => {
  //   console.log('📧 New project invitation received:', invitation)
  //   projectInvitations.value.unshift(invitation)
  //   addToast({
  //     id: `invitation-${invitation.id}`,
  //     type: 'project_invite',
  //     message: `${invitation.invitedByUser?.fullName || invitation.invitedByUser?.username} invited you to join ${invitation.project?.name}`,
  //     createdAt: invitation.createdAt,
  //     isRead: false
  //   })
  //   updateUnreadCount()
  // })

  // Note: Removed invitation status listener since project invitations are handled in My Notifications page
  // socket.on('invitation_responded', (data: { invitationId: string, status: string }) => {
  //   console.log('📧 Invitation responded:', data)
  //   const index = projectInvitations.value.findIndex(inv => inv.id === data.invitationId)
  //   if (index > -1) {
  //     projectInvitations.value.splice(index, 1)
  //   }
  //   updateUnreadCount()
  // })

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
    alert: 'Alert',
    PRIVATE_REQUEST_CREATED: 'Private Request',
    PUBLIC_REQUEST_REGISTERED: 'Request Registration',
    REGISTRANT_APPROVED: 'Registration Approved',
    PRIVATE_REQUEST_ACCEPTED: 'Request Accepted',
    PRIVATE_REQUEST_DECLINED: 'Request Declined',
    WITHDRAW_REQUEST: 'Withdrawal Request',
    WITHDRAW_APPROVED: 'Withdrawal Approved',
    GROUP_UPDATED: 'Group Updated',
    GROUP_DELETED: 'Group Deleted',
    USER_ADDED_TO_GROUP: 'User Added to Group',
    USER_REMOVED_FROM_GROUP: 'User Removed from Group',
    PROJECT_UPDATED: 'Project Updated',
    USER_ADDED_TO_PROJECT: 'User Added to Project',
    USER_REMOVED_FROM_PROJECT: 'User Removed from Project'
  }
  return labels[type] || 'Notification'
}

// Helper function to get clean message - remove EXTENSION_DATA and RequestID parts
const getCleanMessage = (notification: Notification): string => {
  // Remove [EXTENSION_DATA:...] and [RequestID:...] parts from the message
  return notification.message
    .replace(/\[EXTENSION_DATA:\{.*?\}\]/g, '')
    .replace(/\[RequestID:\d+\]/g, '')
}

const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }

    // Fix múi giờ - cộng thêm 7 tiếng để khớp với giờ Việt Nam
    date.setHours(date.getHours() + 7)

    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
    return date.toLocaleDateString('en-US')
  } catch (error) {
    console.error('Error formatting time:', dateString, error)
    return 'Invalid Date'
  }
}

// Helper functions to check notification status
const isNotificationProcessed = (notification: Notification): boolean => {
  return notification.message.includes(' - ACCEPTED') || notification.message.includes(' - DECLINED')
}

const isNotificationAccepted = (notification: Notification): boolean => {
  return notification.message.includes(' - ACCEPTED')
}

const isNotificationDeclined = (notification: Notification): boolean => {
  return notification.message.includes(' - DECLINED')
}

const navigateToNotifications = () => {
  router.push('/notifications')
  showNotificationPanel.value = false
}

const handleNotificationClick = (notification: Notification) => {
  const t = notification.type

  // Handle extension request notifications
  if (t === 'EXTENSION_REQUESTED') {
    // Extract requestId from message: "... [RequestID:123]"
    const requestIdMatch = notification.message.match(/\[RequestID:(\d+)\]/)
    if (requestIdMatch) {
      const requestId = requestIdMatch[1]
      router.push(`/my-requests?highlight=${requestId}`)
      showNotificationPanel.value = false
      return
    }
  }

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
  showNotificationPanel.value = false
}

const navigateToProjectInvitations = () => {
  router.push('/project-invitations')
  showNotificationPanel.value = false
}

// Removed: navigating to detail view is deprecated; use navigateToNotifications instead

const acceptProjectInvitation = async (invitation: ProjectInvitation) => {
  try {
    const result = await projectInvitationService.respondToInvitation(
      invitation.id,
      'accepted'
    )

    // Remove from pending invitations
    const index = projectInvitations.value.findIndex(inv => inv.id === invitation.id)
    if (index > -1) {
      projectInvitations.value.splice(index, 1)
    }

    // Show success toast
    addToast({
      id: `invitation-${invitation.id}`,
      type: 'project_invite',
      message: `You've successfully joined ${invitation.project?.name}`,
      createdAt: new Date().toISOString(),
      isRead: false
    })

    // Redirect to project detail after successful acceptance
    if (invitation.project?.id) {
      router.push(`/projects/${invitation.project.id}`)
    }

  } catch (error: any) {
    console.error('Error accepting invitation:', error)
    addToast({
      id: `error-${invitation.id}`,
      type: 'error',
      message: error.response?.data?.message || 'Failed to accept invitation',
      createdAt: new Date().toISOString(),
      isRead: false
    })
  }
}

const declineProjectInvitation = async (invitation: ProjectInvitation) => {
  try {
    const result = await projectInvitationService.respondToInvitation(
      invitation.id,
      'declined'
    )

    // Remove from pending invitations
    const index = projectInvitations.value.findIndex(inv => inv.id === invitation.id)
    if (index > -1) {
      projectInvitations.value.splice(index, 1)
    }

  } catch (error: any) {
    console.error('Error declining invitation:', error)
  }
}

// New methods for handling project invitations from notifications
const acceptProjectInvitationFromNotification = async (notification: any) => {
  try {
    console.log('🔔 Accepting invitation from notification:', notification)

    // Extract project name from notification message
    const projectName = notification.message.match(/project "([^"]+)"/)?.[1]
    console.log('📋 Extracted project name:', projectName)

    if (projectName) {
      // First, try to find invitation via API
      try {
        const response = await projectInvitationService.getMyInvitations()
        console.log('📋 API invitations response:', response)

        // Try multiple ways to find the invitation
        let apiInvitation = response.invitations.find((inv: any) => inv.project?.name === projectName)

        // If not found by name, try to find by projectId if available in notification
        if (!apiInvitation && notification.projectId) {
          apiInvitation = response.invitations.find((inv: any) => inv.projectId === notification.projectId)
          console.log('📋 Trying to find by projectId:', notification.projectId)
        }

        // If still not found, try to find any invitation for this project name
        if (!apiInvitation) {
          apiInvitation = response.invitations.find((inv: any) =>
            inv.project?.name?.toLowerCase().includes(projectName.toLowerCase()) ||
            projectName.toLowerCase().includes(inv.project?.name?.toLowerCase())
          )
          console.log('📋 Trying fuzzy match for project name')
        }

        console.log('📋 Found API invitation:', apiInvitation)

        if (apiInvitation) {
          console.log('✅ Accepting invitation via API...')

          // REMOVE NOTIFICATION FIRST - before accepting invitation
          console.log('🗑️ Removing notification from popup FIRST...')
          console.log('📋 Current notifications in popup:', notifications.value.map(n => ({ id: n.id, type: n.type, message: n.message })))

          // Remove notification immediately by multiple methods
          let notificationRemoved = false

          // Method 1: Remove by exact ID
          const notificationIndex = notifications.value.findIndex(n => n.id === notification.id)
          if (notificationIndex > -1) {
            notifications.value.splice(notificationIndex, 1)
            notificationRemoved = true
            console.log('✅ Notification removed by exact ID')
          }

          // Method 2: Remove by message content and type
          if (!notificationRemoved) {
            const messageIndex = notifications.value.findIndex(n =>
              n.type === 'project_invite' &&
              n.message.includes(projectName)
            )
            if (messageIndex > -1) {
              notifications.value.splice(messageIndex, 1)
              notificationRemoved = true
              console.log('✅ Notification removed by message content')
            }
          }

          // Method 3: Remove any project_invite notification for this project
          if (!notificationRemoved) {
            const projectInviteIndex = notifications.value.findIndex(n =>
              n.type === 'project_invite' &&
              (n.message.includes(projectName) ||
                n.message.includes('invited you to join') ||
                n.message.includes('invite you to join'))
            )
            if (projectInviteIndex > -1) {
              notifications.value.splice(projectInviteIndex, 1)
              notificationRemoved = true
              console.log('✅ Notification removed by project_invite type and content')
            }
          }

          // Method 4: Remove ALL project_invite notifications (aggressive fallback)
          if (!notificationRemoved) {
            const projectInviteNotifications = notifications.value.filter(n => n.type === 'project_invite')
            if (projectInviteNotifications.length > 0) {
              // Remove ALL project_invite notifications
              notifications.value = notifications.value.filter(n => n.type !== 'project_invite')
              notificationRemoved = true
              console.log('✅ Removed ALL project_invite notifications as aggressive fallback')
            }
          }

          if (notificationRemoved) {
            console.log('📋 Remaining notifications:', notifications.value.length)

            // Update unread count immediately
            if (!notification.isRead) {
              unreadCount.value = Math.max(0, unreadCount.value - 1)
              console.log('📊 Updated unread count:', unreadCount.value)
            }
          } else {
            console.log('❌ Could not find notification to remove!')
            console.log('📋 Available notifications:', notifications.value.map(n => ({
              id: n.id,
              type: n.type,
              message: n.message.substring(0, 50) + '...'
            })))
          }

          // NOW accept the invitation
          await acceptProjectInvitation(apiInvitation)

          // MARK NOTIFICATION AS READ and UPDATE MESSAGE after successful acceptance
          console.log('✅ Marking notification as read...')
          try {
            await notificationService.markAsRead(notification.id)
            console.log('✅ Notification marked as read successfully')


          } catch (markError) {
            console.error('❌ Failed to mark notification as read:', markError)
          }

          // Update unread count from server
          await updateUnreadCount()

          // Show success message
          addToast({
            id: `success-${notification.id}`,
            type: 'success',
            message: `Successfully joined project "${projectName}"`,
            createdAt: new Date().toISOString(),
            isRead: false
          })

          console.log('🎉 Successfully accepted invitation and removed from popup')
        } else {
          console.log('❌ Invitation not found in API response')
          console.log('📋 Available invitations:', response.invitations.map((inv: any) => ({
            id: inv.id,
            projectName: inv.project?.name,
            projectId: inv.projectId
          })))

          // If not found, redirect to My Notifications page
          router.push('/notifications')
          addToast({
            id: `redirect-${notification.id}`,
            type: 'info',
            message: 'Please go to My Notifications to accept this invitation',
            createdAt: new Date().toISOString(),
            isRead: false
          })
        }
      } catch (apiError) {
        console.error('❌ Error fetching invitations from API:', apiError)
        router.push('/notifications')
      }
    } else {
      console.log('❌ Could not extract project name from message:', notification.message)
    }
  } catch (error: any) {
    console.error('❌ Error accepting invitation from notification:', error)
    addToast({
      id: `error-${notification.id}`,
      type: 'error',
      message: 'Failed to accept invitation. Please try again.',
      createdAt: new Date().toISOString(),
      isRead: false
    })
  }
}

const declineProjectInvitationFromNotification = async (notification: any) => {
  try {
    console.log('🔔 Declining invitation from notification:', notification)

    // Extract project name from notification message
    const projectName = notification.message.match(/project "([^"]+)"/)?.[1]
    console.log('📋 Extracted project name:', projectName)

    if (projectName) {
      // First, try to find invitation via API
      try {
        const response = await projectInvitationService.getMyInvitations()
        console.log('📋 API invitations response:', response)

        // Try multiple ways to find the invitation
        let apiInvitation = response.invitations.find((inv: any) => inv.project?.name === projectName)

        // If not found by name, try to find by projectId if available in notification
        if (!apiInvitation && notification.projectId) {
          apiInvitation = response.invitations.find((inv: any) => inv.projectId === notification.projectId)
          console.log('📋 Trying to find by projectId:', notification.projectId)
        }

        // If still not found, try to find any invitation for this project name
        if (!apiInvitation) {
          apiInvitation = response.invitations.find((inv: any) =>
            inv.project?.name?.toLowerCase().includes(projectName.toLowerCase()) ||
            projectName.toLowerCase().includes(inv.project?.name?.toLowerCase())
          )
          console.log('📋 Trying fuzzy match for project name')
        }

        console.log('📋 Found API invitation:', apiInvitation)

        if (apiInvitation) {
          console.log('✅ Declining invitation via API...')

          // REMOVE NOTIFICATION FIRST - before declining invitation
          console.log('🗑️ Removing notification from popup FIRST...')

          // Remove notification immediately by multiple methods
          let notificationRemoved = false

          // Method 1: Remove by exact ID
          const notificationIndex = notifications.value.findIndex(n => n.id === notification.id)
          if (notificationIndex > -1) {
            notifications.value.splice(notificationIndex, 1)
            notificationRemoved = true
            console.log('✅ Notification removed by exact ID')
          }

          // Method 2: Remove by message content and type
          if (!notificationRemoved) {
            const messageIndex = notifications.value.findIndex(n =>
              n.type === 'project_invite' &&
              n.message.includes(projectName)
            )
            if (messageIndex > -1) {
              notifications.value.splice(messageIndex, 1)
              notificationRemoved = true
              console.log('✅ Notification removed by message content')
            }
          }

          // Method 3: Remove any project_invite notification for this project
          if (!notificationRemoved) {
            const projectInviteIndex = notifications.value.findIndex(n =>
              n.type === 'project_invite' &&
              (n.message.includes(projectName) ||
                n.message.includes('invited you to join') ||
                n.message.includes('invite you to join'))
            )
            if (projectInviteIndex > -1) {
              notifications.value.splice(projectInviteIndex, 1)
              notificationRemoved = true
              console.log('✅ Notification removed by project_invite type and content')
            }
          }

          // Method 4: Remove ALL project_invite notifications (aggressive fallback)
          if (!notificationRemoved) {
            const projectInviteNotifications = notifications.value.filter(n => n.type === 'project_invite')
            if (projectInviteNotifications.length > 0) {
              // Remove ALL project_invite notifications
              notifications.value = notifications.value.filter(n => n.type !== 'project_invite')
              notificationRemoved = true
              console.log('✅ Removed ALL project_invite notifications as aggressive fallback')
            }
          }

          if (notificationRemoved) {
            console.log('📋 Remaining notifications:', notifications.value.length)

            // Update unread count immediately
            if (!notification.isRead) {
              unreadCount.value = Math.max(0, unreadCount.value - 1)
              console.log('📊 Updated unread count:', unreadCount.value)
            }
          } else {
            console.log('❌ Could not find notification to remove!')
            console.log('📋 Available notifications:', notifications.value.map(n => ({
              id: n.id,
              type: n.type,
              message: n.message.substring(0, 50) + '...'
            })))
          }

          // NOW decline the invitation
          await declineProjectInvitation(apiInvitation)

          // MARK NOTIFICATION AS READ and UPDATE MESSAGE after successful decline
          console.log('✅ Marking notification as read...')
          try {
            await notificationService.markAsRead(notification.id)
            console.log('✅ Notification marked as read successfully')

            // Update notification message to show declined status
            const updatedMessage = `You have been invited to join project "${projectName}" - DECLINED ❌`
            await notificationService.updateNotification(notification.id, {
              message: updatedMessage
            })
            console.log('📝 Notification message updated to show declined status')
          } catch (markError) {
            console.error('❌ Failed to mark notification as read:', markError)
          }

          // Update unread count from server
          await updateUnreadCount()

          // Show success message
          addToast({
            id: `declined-${notification.id}`,
            type: 'info',
            message: `Declined invitation to project "${projectName}"`,
            createdAt: new Date().toISOString(),
            isRead: false
          })

          console.log('🎉 Successfully declined invitation and removed from popup')
        } else {
          console.log('❌ Invitation not found in API response')
          console.log('📋 Available invitations:', response.invitations.map((inv: any) => ({
            id: inv.id,
            projectName: inv.project?.name,
            projectId: inv.projectId
          })))

          // If not found, redirect to My Notifications page
          router.push('/notifications')
          addToast({
            id: `redirect-${notification.id}`,
            type: 'info',
            message: 'Please go to My Notifications to decline this invitation',
            createdAt: new Date().toISOString(),
            isRead: false
          })
        }
      } catch (apiError) {
        console.error('❌ Error fetching invitations from API:', apiError)
        router.push('/notifications')
      }
    } else {
      console.log('❌ Could not extract project name from message:', notification.message)
    }
  } catch (error: any) {
    console.error('❌ Error declining invitation from notification:', error)
    addToast({
      id: `error-${notification.id}`,
      type: 'error',
      message: 'Failed to decline invitation. Please try again.',
      createdAt: new Date().toISOString(),
      isRead: false
    })
  }
}

onMounted(() => {
  loadNotifications()
  connectToNotificationSocket()

  // Set up periodic refresh for project invitations
  const invitationRefreshInterval = setInterval(async () => {
    if (authStore.user) {
      await loadProjectInvitations()
      updateUnreadCount()
    }
  }, 30000) // Refresh every 30 seconds

  // Set up notification sync listeners
  onNotificationDeleted((id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      const deletedNotification = notifications.value[index]
      notifications.value.splice(index, 1)

      // Update unread count if the deleted notification was unread
      if (!deletedNotification.isRead) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    }
  })

  onNotificationMarkedRead((id: string) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification && !notification.isRead) {
      notification.isRead = true
      notification.readAt = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  })

  onAllNotificationsDeleted(() => {
    notifications.value = []
    unreadCount.value = 0
  })

  onAllNotificationsMarkedRead(() => {
    notifications.value.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
      }
    })
    unreadCount.value = 0
  })

  // Watch for route changes to update currentRoute and log when user navigates to project detail
  const unwatchRoute = router.afterEach((to) => {
    // Update currentRoute ref
    currentRoute.value = to
    console.log('🔄 Route changed to:', to.path)

    // If user navigates to a project detail page, log for debugging
    if (to.path.startsWith('/projects/') && to.params.id) {
      const projectId = to.params.id as string
      console.log('🏠 User navigated to project detail:', projectId)
      console.log('🔔 Notifications will be automatically filtered due to project location')

      // Force a reactive update by triggering a small change
      if (showNotificationPanel.value) {
        console.log('🔔 Notification panel is open, forcing reactive update')
        // This will trigger computed properties to recalculate
        showNotificationPanel.value = false
        setTimeout(() => {
          showNotificationPanel.value = true
        }, 10)
      }
    }
  })

  // Cleanup interval and route watcher on unmount
  onUnmounted(() => {
    clearInterval(invitationRefreshInterval)
    unwatchRoute()
  })
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

.view-all-buttons {
  display: flex;
  gap: 8px;
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

/* Project Invitation Styles */
.invitations-section {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.section-header {
  padding: 0 24px 12px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.project-invitation-item {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-left: 4px solid #3b82f6;
  position: relative;
}

.project-invitation-item::before {
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

.invitation-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invitation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.invitation-type {
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

.invitation-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  white-space: nowrap;
}

.invitation-message p {
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  margin: 0 0 8px 0;
}

.invitation-message p:last-child {
  margin-bottom: 0;
}

.invitation-custom-message {
  font-style: italic;
  color: #64748b;
  background: rgba(59, 130, 246, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  margin-top: 8px;
}

.invitation-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.accept-btn, .decline-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.accept-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.accept-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.decline-btn {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.decline-btn:hover {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
  border-color: #fca5a5;
  transform: translateY(-1px);
}

.close-icon {
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
}

/* Status indicators for processed notifications */
.invitation-status {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.status-accepted, .status-declined {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
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

.notifications-section {
  padding-top: 8px;
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

  .invitation-actions {
    flex-direction: column;
  }

  .accept-btn, .decline-btn {
    width: 100%;
    justify-content: center;
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
@media (prefers-color-scheme: light) {
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
