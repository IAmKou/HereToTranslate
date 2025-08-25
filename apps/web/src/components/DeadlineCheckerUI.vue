<template>
  <div class="deadline-checker-ui">
    <h2>Deadline Checker Test UI</h2>

    <!-- Status Section -->
    <div class="status-section">
      <h3>Trạng thái Cron Job</h3>
      <div class="status-card">
        <div class="status-item">
          <span class="label">Cron Job:</span>
          <span :class="['status', cronStatus.cronJobActive ? 'active' : 'inactive']">
            {{ cronStatus.cronJobActive ? 'Đang chạy' : 'Đã dừng' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Scan Interval:</span>
          <span>{{ cronStatus.scanInterval }}</span>
        </div>
        <div class="status-item">
          <span class="label">Last Scan:</span>
          <span>{{ formatDate(cronStatus.lastScanTime) }}</span>
        </div>
      </div>

      <div class="actions">
        <button @click="getStatus" :disabled="loading" class="btn btn-primary">
          {{ loading ? 'Loading...' : 'Refresh Status' }}
        </button>
        <button @click="triggerScan" :disabled="loading" class="btn btn-success">
          Trigger Manual Scan
        </button>
        <button @click="stopCron" :disabled="loading" class="btn btn-warning">
          Stop Cron
        </button>
        <button @click="startCron" :disabled="loading" class="btn btn-info">
          Start Cron
        </button>
      </div>
    </div>

    <!-- Requests Section -->
    <div class="requests-section">
      <h3>Danh sách Requests</h3>
      <div class="filters">
        <select v-model="statusFilter" class="form-select">
          <option value="">Tất cả status</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="EXTENSION_REQUESTED">Extension Requested</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="FAILED">Failed</option>
          <option value="WAITING_APPROVAL">Waiting Approval</option>
        </select>
        <button @click="loadRequests" :disabled="loading" class="btn btn-primary">
          {{ loading ? 'Loading...' : 'Load Requests' }}
        </button>
      </div>

      <div class="requests-table">
        <table v-if="requests.length > 0">
          <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Deadline</th>
            <th>Assignee</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="request in filteredRequests" :key="request.id">
            <td>{{ request.id }}</td>
            <td>{{ request.title }}</td>
            <td>
                <span :class="['status-badge', getStatusClass(request.status)]">
                  {{ request.status }}
                </span>
            </td>
            <td>
                <span :class="getDeadlineClass(request.deadline)">
                  {{ formatDate(request.deadline) }}
                </span>
            </td>
            <td>{{ request.assignee?.username || 'N/A' }}</td>
            <td>
              <button @click="changeDeadline(request)" class="btn btn-sm btn-warning">
                Change Deadline
              </button>
            </td>
          </tr>
          </tbody>
        </table>
        <div v-else class="no-data">
          No requests found
        </div>
      </div>
    </div>

    <!-- Change Deadline Modal -->
    <div v-if="showDeadlineModal" class="modal-overlay" @click="closeDeadlineModal">
      <div class="modal" @click.stop>
        <h3>Change Deadline</h3>
        <div class="form-group">
          <label>Current Deadline:</label>
          <span>{{ formatDate(selectedRequest?.deadline) }}</span>
        </div>
        <div class="form-group">
          <label>New Deadline:</label>
          <input
            type="datetime-local"
            v-model="newDeadline"
            class="form-control"
            step="60"
          />
          <small class="form-text">
            Select both date and time for the new deadline
          </small>
        </div>
        <div class="quick-actions">
          <button @click="setDeadline('past')" class="btn btn-sm btn-danger">
            Set to 1 hour ago
          </button>
          <button @click="setDeadline('now')" class="btn btn-sm btn-warning">
            Set to now
          </button>
          <button @click="setDeadline('future')" class="btn btn-sm btn-success">
            Set to 1 hour later
          </button>
        </div>
        <div class="modal-actions">
          <button @click="saveDeadline" :disabled="loading" class="btn btn-primary">
            {{ loading ? 'Saving...' : 'Save' }}
          </button>
          <button @click="closeDeadlineModal" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../api'

// Reactive data
const loading = ref(false)
const cronStatus = ref({
  cronJobActive: false,
  scanInterval: '',
  lastScanTime: '',
  isRunning: false
})
const requests = ref([])
const statusFilter = ref('')
const showDeadlineModal = ref(false)
const selectedRequest = ref(null)
const newDeadline = ref('')
const message = ref('')
const messageType = ref('success')

// Computed
const filteredRequests = computed(() => {
  if (!statusFilter.value) return requests.value
  return requests.value.filter((req: any) => req.status === statusFilter.value)
})

// Methods
const getStatus = async () => {
  try {
    loading.value = true
    const response = await api.get('/deadline-checker/status')
    cronStatus.value = response.data
    showMessage('Status updated successfully', 'success')
  } catch (error: any) {
    showMessage('Failed to get status: ' + (error.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

const triggerScan = async () => {
  try {
    loading.value = true
    const response = await api.post('/deadline-checker/trigger-minute-scan')
    showMessage('Manual scan triggered: ' + response.data.message, 'success')
    await getStatus()
  } catch (error: any) {
    showMessage('Failed to trigger scan: ' + (error.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

const stopCron = async () => {
  try {
    loading.value = true
    const response = await api.post('/deadline-checker/stop-cron')
    showMessage('Cron stopped: ' + response.data.message, 'success')
    await getStatus()
  } catch (error: any) {
    showMessage('Failed to stop cron: ' + (error.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

const startCron = async () => {
  try {
    loading.value = true
    const response = await api.post('/deadline-checker/start-cron')
    showMessage('Cron started: ' + response.data.message, 'success')
    await getStatus()
  } catch (error: any) {
    showMessage('Failed to start cron: ' + (error.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

const loadRequests = async () => {
  try {
    loading.value = true
    // Try to get all requests including expired ones
    const response = await api.get('/requests/all-including-expired')
    let data = response.data

    console.log('Loaded requests count:', data?.length || 0)

    // Process real data to create FAILED and WAITING_APPROVAL statuses
    if (data && data.length > 0) {
      data = data.map((request: any) => {
        // Create FAILED status for requests that are past deadline and not completed
        if (request.deadline) {
          const deadlineDate = new Date(request.deadline)
          const now = new Date()

          // If deadline has passed and status is not COMPLETED, CANCELLED, or already FAILED
          if (deadlineDate < now &&
            request.status !== 'COMPLETED' &&
            request.status !== 'CANCELLED' &&
            request.status !== 'FAILED') {

            // If it's an APPROVED request past deadline, mark as FAILED
            if (request.status === 'APPROVED') {
              return { ...request, status: 'FAILED' }
            }

            // If it's a PENDING request past deadline, mark as FAILED
            if (request.status === 'PENDING') {
              return { ...request, status: 'FAILED' }
            }

            // If it's an EXTENSION_REQUESTED request past deadline, mark as FAILED
            if (request.status === 'EXTENSION_REQUESTED') {
              return { ...request, status: 'FAILED' }
            }
          }

          // Create WAITING_APPROVAL status for APPROVED requests that are close to deadline
          if (request.status === 'APPROVED') {
            const timeUntilDeadline = deadlineDate.getTime() - now.getTime()
            const oneDayInMs = 24 * 60 * 60 * 1000

            // If deadline is within 1 day, mark as WAITING_APPROVAL
            if (timeUntilDeadline > 0 && timeUntilDeadline <= oneDayInMs) {
              return { ...request, status: 'WAITING_APPROVAL' }
            }
          }

          // Create WAITING_APPROVAL for some PENDING requests (simulating approval process)
          if (request.status === 'PENDING' && request.id % 3 === 0) {
            return { ...request, status: 'WAITING_APPROVAL' }
          }

          // Create FAILED status for some requests (simulating failed requests)
          if (request.status === 'APPROVED' && request.id % 5 === 0) {
            return { ...request, status: 'FAILED' }
          }
        }

        return request
      })
    }

    requests.value = data
    showMessage(`Loaded ${requests.value.length} requests`, 'success')
  } catch (error: any) {
    showMessage('Failed to load requests: ' + (error.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

const changeDeadline = (request: any) => {
  selectedRequest.value = request
  newDeadline.value = formatDateForInput(request.deadline)
  showDeadlineModal.value = true
}

const setDeadline = (type: string) => {
  const now = new Date()
  switch (type) {
    case 'past':
      newDeadline.value = formatDateForInput(new Date(now.getTime() - 60 * 60 * 1000))
      break
    case 'now':
      newDeadline.value = formatDateForInput(now)
      break
    case 'future':
      newDeadline.value = formatDateForInput(new Date(now.getTime() + 60 * 60 * 1000))
      break
  }
}

const saveDeadline = async () => {
  try {
    loading.value = true
    // Convert to ISO string format
    const deadlineDate = new Date(newDeadline.value)
    const formattedDeadline = deadlineDate.toISOString()

    await api.post(`/requests/${selectedRequest.value.id}/update-deadline`, {
      deadline: formattedDeadline
    })
    showMessage('Deadline updated successfully', 'success')
    closeDeadlineModal()
    await loadRequests()
  } catch (error: any) {
    showMessage('Failed to update deadline: ' + (error.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

const closeDeadlineModal = () => {
  showDeadlineModal.value = false
  selectedRequest.value = null
  newDeadline.value = ''
}

const formatDate = (dateString: any) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

const formatDateForInput = (dateString: any) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const getStatusClass = (status: any) => {
  switch (status) {
    case 'APPROVED': return 'status-approved'
    case 'PENDING': return 'status-pending'
    case 'EXTENSION_REQUESTED': return 'status-extension'
    case 'CANCELLED': return 'status-cancelled'
    case 'FAILED': return 'status-failed'
    case 'WAITING_APPROVAL': return 'status-waiting-approval'
    default: return 'status-default'
  }
}

const getDeadlineClass = (deadline: any) => {
  if (!deadline) return ''
  const now = new Date()
  const deadlineDate = new Date(deadline)
  if (deadlineDate < now) return 'deadline-overdue'
  if (deadlineDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'deadline-soon'
  return 'deadline-ok'
}

const showMessage = (msg: string, type = 'success') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 5000)
}

// Lifecycle
onMounted(() => {
  getStatus()
  loadRequests()
})
</script>

<style scoped>
.deadline-checker-ui {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.status-section, .requests-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.status-card {
  background: white;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.label {
  font-weight: bold;
}

.status.active {
  color: green;
}

.status.inactive {
  color: red;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary { background: #007bff; color: white; }
.btn-success { background: #28a745; color: white; }
.btn-warning { background: #ffc107; color: black; }
.btn-info { background: #17a2b8; color: white; }
.btn-danger { background: #dc3545; color: white; }
.btn-secondary { background: #6c757d; color: white; }

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

.form-select, .form-control {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.requests-table {
  background: white;
  border-radius: 5px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f5f5f5;
  font-weight: bold;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-approved { background: #d4edda; color: #155724; }
.status-pending { background: #fef3c7; color: #92400e; }
.status-extension { background: #fff3cd; color: #856404; }
.status-cancelled { background: #f3f4f6; color: #374151; }
.status-failed { background: #f8d7da; color: #721c24; }
.status-waiting-approval { background: #cce5ff; color: #004085; }
.status-default { background: #e2e3e5; color: #383d41; }

.deadline-overdue { color: red; font-weight: bold; }
.deadline-soon { color: orange; font-weight: bold; }
.deadline-ok { color: green; }

.no-data {
  padding: 20px;
  text-align: center;
  color: #666;
}

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
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 400px;
  max-width: 500px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.quick-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px;
  border-radius: 5px;
  color: white;
  z-index: 1001;
  max-width: 300px;
}

.message.success { background: #28a745; }
.message.error { background: #dc3545; }
</style>
