<template>
  <div class="layout-wrapper">
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="my-requests-container">
          <!-- Header -->
          <div class="my-requests-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
            <div>
              <h1 class="requests-title">
                <span class="emoji">📋</span> Requests
              </h1>
              <p class="requests-desc">
                Manage your requests and assigned tasks
              </p>
            </div>
            <router-link to="/requests/create">
              <button class="btn btn-primary">
                <span class="material-icons" style="vertical-align: middle;">add_circle</span>
                Create New Request
              </button>
            </router-link>
          </div>

          <!-- Tabs -->
          <div class="tabs-container">
            <button
              @click="activeTab = 'my-requests'"
              :class="['tab-button', { active: activeTab === 'my-requests' }]"
            >
              <span class="material-icons">description</span>
              My Requests
              <span v-if="myRequestsCount > 0" class="badge">{{ myRequestsCount }}</span>
            </button>
            <button
              @click="activeTab = 'assigned-requests'"
              :class="['tab-button', { active: activeTab === 'assigned-requests' }]"
            >
              <span class="material-icons">assignment_ind</span>
              Assigned to Me
              <span v-if="assignedRequestsCount > 0" class="badge">{{ assignedRequestsCount }}</span>
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading requests...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-container">
            <div class="error-content">
              <div class="error-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h3>Oops! Something went wrong</h3>
              <p>{{ error }}</p>
              <button @click="fetchRequests" class="btn btn-secondary">Try Again</button>
            </div>
          </div>

          <!-- My Requests Tab -->
          <div v-else-if="activeTab === 'my-requests'">
            <!-- Empty State for My Requests -->
            <div v-if="myRequests.length === 0" class="empty-container">
              <div class="empty-content">
                <div class="empty-icon">
                  <i class="pi pi-file"></i>
                </div>
                <h3>No requests found</h3>
                <p>You haven't created any requests yet.</p>
                <router-link to="/requests/create" class="btn btn-primary">
                  <i class="pi pi-plus"></i>
                  Create Your First Request
                </router-link>
              </div>
            </div>

            <!-- My Requests Table -->
            <div v-else class="requests-table-container">
              <div class="table-wrapper">
                <table class="requests-table">
                  <thead>
                  <tr>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Category</th>
                    <th>Deal Amount</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="req in myRequests" :key="req.id" class="request-row">
                    <td class="request-title">{{ req.title }}</td>
                    <td>{{ req.project?.name || '-' }}</td>
                    <td>{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount">${{ req.dealAmount }}</td>
                    <td>{{ formatDate(req.deadline) }}</td>
                    <td>
                        <span :class="['status-badge', `status-${req.status.toLowerCase()}`]">
                          {{ req.status }}
                        </span>
                    </td>
                    <td class="actions">
                      <button @click="onEdit(req)" class="btn btn-small btn-secondary">
                        <i class="pi pi-pencil"></i>
                      </button>
                      <button @click="onCancel(req)" class="btn btn-small btn-danger">
                        <i class="pi pi-times"></i>
                      </button>
                      <button v-if="canReview(req)" @click="onReview(req)" class="btn btn-small btn-primary">
                        <i class="pi pi-eye"></i>
                      </button>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Assigned Requests Tab -->
          <div v-else-if="activeTab === 'assigned-requests'">
            <!-- Empty State for Assigned Requests -->
            <div v-if="assignedRequests.length === 0" class="empty-container">
              <div class="empty-content">
                <div class="empty-icon">
                  <i class="pi pi-user"></i>
                </div>
                <h3>No assigned requests</h3>
                <p>You don't have any requests assigned to you at the moment.</p>
              </div>
            </div>

            <!-- Assigned Requests Grid -->
            <div v-else class="assigned-requests-grid">
              <div
                v-for="request in assignedRequests"
                :key="request.id"
                class="request-card"
                :class="getStatusClass(request.status)"
              >
                <div class="request-header">
                  <div class="request-title">
                    <h3>{{ request.title }}</h3>
                    <span class="status-badge" :class="getStatusClass(request.status)">
                      {{ formatStatus(request.status) }}
                    </span>
                  </div>
                  <div class="request-meta">
                    <span class="requester">By: {{ request.requester?.username || 'Unknown' }}</span>
                    <span class="category">{{ request.category?.name || 'No Category' }}</span>
                  </div>
                </div>

                <div class="request-content">
                  <p v-if="request.description" class="description">
                    {{ request.description }}
                  </p>
                  <div class="request-details">
                    <div class="detail-item">
                      <span class="detail-label">Deal Amount:</span>
                      <span class="detail-value">${{ formatAmount(request.dealAmount) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Deadline:</span>
                      <span class="detail-value" :class="getDeadlineClass(request.deadline)">
                        {{ formatDate(request.deadline) }}
                      </span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Created:</span>
                      <span class="detail-value">{{ formatDate(request.createdAt) }}</span>
                    </div>
                  </div>
                </div>

                <div class="request-actions">
                  <button
                    v-if="request.status === 'PENDING'"
                    @click="acceptRequest(request.id)"
                    class="btn btn-success"
                    :disabled="actionLoading"
                  >
                    Accept Request
                  </button>
                  <button
                    v-if="request.status === 'PENDING'"
                    @click="rejectRequest(request.id)"
                    class="btn btn-danger"
                    :disabled="actionLoading"
                  >
                    Reject Request
                  </button>
                  <button
                    v-if="request.status === 'APPROVED'"
                    @click="completeRequest(request.id)"
                    class="btn btn-primary"
                    :disabled="actionLoading"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialogs -->
          <EditRequestForm v-if="showEdit" :request="selectedRequest" @close="showEdit = false" @updated="onRequestUpdated" />
          <ReviewRequestDialog v-if="showReview" :request="selectedRequest" @close="showReview = false" @reviewed="onRequestReviewed" />
          <CancelRequestDialog v-if="showCancel" :request="selectedRequest" @close="showCancel = false" @cancelled="onRequestCancelled" />
        </div>
      </div>
    </div>
    <Footer />
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'primevue/usetoast'
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import EditRequestForm from '../views/RequestEditView.vue'
import ReviewRequestDialog from '../components/ReviewRequestDialog.vue'
import CancelRequestDialog from '../components/CancelRequestDialog.vue'

const requests = ref([])
const loading = ref(false)
const error = ref(null)
const showEdit = ref(false)
const showReview = ref(false)
const showCancel = ref(false)
const selectedRequest = ref(null)
const toast = useToast()
const activeTab = ref('my-requests')
const myRequests = ref([])
const assignedRequests = ref([])
const actionLoading = ref(false)

// Computed properties for counts
const myRequestsCount = computed(() => myRequests.value.length)
const assignedRequestsCount = computed(() => assignedRequests.value.length)

function fetchRequests() {
  loading.value = true
  error.value = null

  // Fetch my requests
  axios.get('/api/requests/myRequests')
    .then(res => {
      myRequests.value = res.data
    })
    .catch(err => {
      console.error('Error fetching my requests:', err)
    })

  // Fetch assigned requests
  axios.get('/api/requests/private')
    .then(res => {
      assignedRequests.value = res.data
    })
    .catch(err => {
      // If the error is "You have no request", treat it as empty state
      if (err.response?.data?.message === 'You have no request') {
        assignedRequests.value = []
      } else {
        console.error('Error fetching assigned requests:', err)
      }
    })
    .finally(() => {
      loading.value = false
    })
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function onEdit(req) {
  selectedRequest.value = req
  showEdit.value = true
}

function onReview(req) {
  selectedRequest.value = req
  showReview.value = true
}

function onCancel(req) {
  selectedRequest.value = req
  showCancel.value = true
}

function canReview(req) {
  // Tùy quyền, ví dụ: return req.status === 'pending' && userIsAdmin
  return false
}

function onRequestUpdated() {
  fetchRequests()
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Request updated successfully',
    life: 3000
  })
}

function onRequestReviewed() {
  fetchRequests()
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Request reviewed successfully',
    life: 3000
  })
}

function onRequestCancelled() {
  fetchRequests()
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Request cancelled successfully',
    life: 3000
  })
}

function getStatusClass(status) {
  const classMap = {
    'PENDING': 'status-pending',
    'APPROVED': 'status-approved',
    'REJECTED': 'status-rejected',
    'COMPLETED': 'status-completed',
    'CANCELLED': 'status-cancelled'
  }
  return classMap[status] || 'status-pending'
}

function formatStatus(status) {
  const statusMap = {
    'PENDING': 'Pending',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled'
  }
  return statusMap[status] || status
}

function getDeadlineClass(deadline) {
  if (!deadline) return ''
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24))

  if (daysUntilDeadline < 0) return 'deadline-overdue'
  if (daysUntilDeadline <= 3) return 'deadline-urgent'
  if (daysUntilDeadline <= 7) return 'deadline-warning'
  return 'deadline-normal'
}

function formatAmount(amount) {
  if (!amount) return '0.00'
  return parseFloat(amount).toFixed(2)
}

async function acceptRequest(requestId) {
  actionLoading.value = true
  try {
    await axios.post(`/api/requests/${requestId}/update`, {
      status: 'APPROVED'
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request accepted successfully',
      life: 3000
    })
    fetchRequests()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to accept request',
      life: 3000
    })
  } finally {
    actionLoading.value = false
  }
}

async function rejectRequest(requestId) {
  actionLoading.value = true
  try {
    await axios.post(`/api/requests/${requestId}/update`, {
      status: 'REJECTED'
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request rejected successfully',
      life: 3000
    })
    fetchRequests()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to reject request',
      life: 3000
    })
  } finally {
    actionLoading.value = false
  }
}

async function completeRequest(requestId) {
  actionLoading.value = true
  try {
    await axios.post(`/api/requests/${requestId}/update`, {
      status: 'COMPLETED'
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request marked as completed',
      life: 3000
    })
    fetchRequests()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to complete request',
      life: 3000
    })
  } finally {
    actionLoading.value = false
  }
}

onMounted(fetchRequests)
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main-content {
  display: flex;
  flex: 1;
  margin-left: 15rem;
}
.content {
  flex: 1;
  padding: 32px 20px;
  background: #f6f8fa;
}
.my-requests-container {
  max-width: 1200px;
  margin: 0 auto;
}
.requests-header {
  margin-bottom: 32px;
}
.requests-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.emoji {
  font-size: 2.5rem;
}
.requests-desc {
  font-size: 1.1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-content,
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-icon,
.empty-icon {
  font-size: 3rem;
  color: #ef4444;
}

.empty-icon {
  color: #9ca3af;
}

.requests-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.requests-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.requests-table th {
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.requests-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.request-row:hover {
  background: #f8fafc;
}

.request-title {
  font-weight: 500;
  color: #1e293b;
}

.deal-amount {
  font-weight: 600;
  color: #059669;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-cancelled {
  background: #f3f4f6;
  color: #374151;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tabs-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  background: #f3f4f6;
  color: #6b7280;
  position: relative;
}

.tab-button:hover {
  background: #e5e7eb;
  color: #374151;
}

.tab-button.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.tab-button .material-icons {
  font-size: 18px;
}

.badge {
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.25rem;
}

.assigned-requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.request-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.request-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #e5e7eb;
}

.request-card.status-pending::before {
  background: #f59e0b;
}

.request-card.status-approved::before {
  background: #10b981;
}

.request-card.status-rejected::before {
  background: #ef4444;
}

.request-card.status-completed::before {
  background: #3b82f6;
}

.request-card.status-cancelled::before {
  background: #6b7280;
}

.request-header {
  margin-bottom: 1rem;
}

.request-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.request-title h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
  margin-right: 1rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-completed {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.status-cancelled {
  background: #f3f4f6;
  color: #374151;
}

.request-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #64748b;
}

.requester,
.category {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.request-content {
  margin-bottom: 1.5rem;
}

.description {
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.request-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #64748b;
  font-weight: 500;
  font-size: 0.875rem;
}

.detail-value {
  color: #1e293b;
  font-weight: 600;
  font-size: 0.875rem;
}

.deadline-overdue {
  color: #ef4444;
}

.deadline-urgent {
  color: #f59e0b;
}

.deadline-warning {
  color: #f97316;
}

.deadline-normal {
  color: #10b981;
}

.request-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

@media (max-width: 768px) {
  .tabs-container {
    flex-direction: column;
    gap: 0.5rem;
  }

  .tab-button {
    justify-content: center;
  }

  .assigned-requests-grid {
    grid-template-columns: 1fr;
  }

  .request-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .request-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
