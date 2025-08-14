<template>
  <!-- Global Notification Management Panel -->
  <div class="admin-notification-manager">
    <h2>Notification Management</h2>

    <!-- Global Notification Creation -->
    <div class="create-section">
      <h3>Create Global Notification</h3>
      <button @click="showCreateModal = true" class="btn-create">
        Send to All Users
      </button>
    </div>

    <!-- Stats Section -->
    <div class="stats-section">
      <div class="stat-card">
        <i class="pi pi-bell"></i>
        <div>
          <h4>Total Global Notifications</h4>
          <p class="stat-number">{{ globalNotificationCount }}</p>
        </div>
      </div>
    </div>

    <!-- Global Notifications List -->
    <div class="notifications-list">
      <h3>Global Notifications</h3>
      <div v-if="globalNotifications.length === 0" class="empty-state">
        No notifications yet
      </div>
      <div v-else>
        <div
          v-for="notification in globalNotifications"
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
              Created by: {{ notification.createdBy.fullName || notification.createdBy.username }}
            </div>
          </div>
          <div class="notification-actions">
            <button @click="editNotification(notification)" class="btn-edit">
              <i class="pi pi-pencil"></i>
            </button>
            <button @click="deleteNotification(notification.id)" class="btn-delete">
              Delete
            </button>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { adminNotificationService } from '../services/admin-notification.service'

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

const canCreateNotification = computed(() => {
  return createForm.type && createForm.message.trim()
})

const canCreateNotificationForAll = computed(() => {
  return createAllForm.type && createAllForm.message.trim()
})

const loadGlobalNotifications = async () => {
  loading.value = true
  try {
    const response = await adminNotificationService.getGlobalNotifications()
    globalNotifications.value = response.notifications
  } catch (error) {
    console.error('Error loading notifications:', error)
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
    await adminNotificationService.createGlobalNotification(createForm)

    // Reset form
    createForm.type = 'announcement'
    createForm.message = ''
    showCreateModal.value = false

    // Refresh list
    await loadGlobalNotifications()
    await loadGlobalNotificationCount()
  } catch (error) {
    console.error('Error creating notification:', error)
    alert('Error creating notification')
  }
}

const createNotificationForAll = async () => {
  try {
    const response = await adminNotificationService.createNotificationForAllUsers(createAllForm)

    // Reset form
    createAllForm.type = 'announcement'
    createAllForm.message = ''
    showCreateForAllModal.value = false

    alert(`Created ${response.count} notifications for all users`)

    // Refresh list
    await loadGlobalNotifications()
    await loadGlobalNotificationCount()
  } catch (error) {
    console.error('Error creating notification for all:', error)
    alert('Error creating notification')
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
    await adminNotificationService.updateNotification(editingNotificationId.value, {
      type: editForm.type,
      message: editForm.message
    })

    showEditModal.value = false
    editingNotificationId.value = null
    editForm.type = 'announcement'
    editForm.message = ''
    await loadGlobalNotifications()
  } catch (error) {
    console.error('Error updating notification:', error)
    alert('Error updating notification')
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
    showDeleteModal.value = false
    notificationToDelete.value = null
    await loadGlobalNotifications()
    await loadGlobalNotificationCount()
  } catch (error) {
    console.error('Error deleting notification:', error)
    alert('Error deleting notification')
  } finally {
    deleting.value = false
  }
}

const refreshNotifications = () => {
  loadGlobalNotifications()
  loadGlobalNotificationCount()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US')
}

onMounted(() => {
  loadGlobalNotifications()
  loadGlobalNotificationCount()
})
</script>

<style scoped>
.admin-notification-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background: transparent;
}

.admin-notification-manager h2 {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
  text-align: center;
}

/* Create Section */
.create-section {
  text-align: center;
  margin-bottom: 32px;
}

.create-section h3 {
  font-size: 20px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 16px;
}

.btn-create {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
}

/* Stats Section */
.stats-section {
  margin-bottom: 32px;
}

.stat-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: none;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  max-width: 400px;
  margin: 0 auto;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 35px rgba(0, 0, 0, 0.12);
}

.stat-card i {
  font-size: 48px;
  color: #3b82f6;
  margin-bottom: 16px;
}

.stat-card h4 {
  font-size: 18px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 12px 0;
}

.stat-number {
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

/* Notifications List */
.notifications-list {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
}

.notifications-list h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.notifications-list h3::before {
  content: "📢";
  font-size: 28px;
}

.empty-state {
  text-align: center;
  padding: 64px 32px;
  color: #64748b;
}

.empty-state::before {
  content: "📭";
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.notification-item {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.notification-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.notification-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.notification-content {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.notification-type {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notification-date {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.notification-message {
  font-size: 16px;
  line-height: 1.6;
  color: #374151;
  margin-bottom: 16px;
}

.notification-meta {
  font-size: 14px;
  color: #64748b;
  font-style: italic;
}

.notification-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-edit, .btn-delete {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
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
  border-radius: 20px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
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
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 24px 0;
  padding: 32px 32px 0 32px;
}

.modal-content form {
  padding: 0 32px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.warning-note {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
  color: #92400e;
  font-size: 14px;
}

.warning-note strong {
  color: #78350f;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 32px;
  border-top: 1px solid #e5e7eb;
  margin-top: 24px;
}

.btn-primary, .btn-secondary {
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
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
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
}

.delete-content {
  text-align: center;
  padding: 32px;
}

.delete-icon {
  font-size: 64px;
  color: #ef4444;
  margin-bottom: 24px;
}

.delete-content h4 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

.delete-content p {
  font-size: 16px;
  color: #475569;
  margin-bottom: 24px;
}

.notification-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
  font-size: 14px;
  color: #374151;
  font-style: italic;
}

.warning-text {
  color: #92400e;
  font-size: 14px;
  margin-top: 20px;
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-notification-manager {
    padding: 16px;
  }

  .admin-notification-manager h2 {
    font-size: 24px;
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
    padding: 16px;
  }

  .stat-card {
    padding: 24px;
  }
}
</style>
