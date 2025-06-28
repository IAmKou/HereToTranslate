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
                <span class="emoji">📋</span> My Requests
              </h1>
              <p class="requests-desc">
                Manage your request
              </p>
            </div>
            <router-link to="/requests/create">
              <button class="btn btn-primary">
                <span class="material-icons" style="vertical-align: middle;">add_circle</span>
                Create New Request
              </button>
            </router-link>
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

          <!-- Empty State -->
          <div v-else-if="requests.length === 0" class="empty-container">
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

          <!-- Requests Table -->
          <div v-else class="requests-table-container">
            <div class="table-wrapper">
              <table class="requests-table">
                <thead>
                <tr>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Deal Amount</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="req in requests" :key="req.id" class="request-row">
                  <td class="request-title">{{ req.title }}</td>
                  <td>{{ req.project?.name || '-' }}</td>
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
import { ref, onMounted } from 'vue'
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

function fetchRequests() {
  loading.value = true
  error.value = null
  axios.get('/api/requests/myRequests')
    .then(res => {
      requests.value = res.data
    })
    .catch(err => {
      error.value = err.response?.data?.message || 'Failed to load requests'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.value,
        life: 3000
      })
      console.error('Error fetching requests:', err)
    })
    .finally(() => loading.value = false)
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
</style>
