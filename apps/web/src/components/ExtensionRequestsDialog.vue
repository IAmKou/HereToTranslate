<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h2>Extension Requests</h2>
        <p class="subtitle">Manage deadline extension requests for: {{ requestTitle }}</p>
      </div>

      <div v-if="loading" class="loading">
        <p>Loading extensions...</p>
      </div>

      <div v-else-if="extensions.length === 0" class="no-extensions">
        <p>No extension requests found for this request.</p>
      </div>

      <div v-else class="extensions-list">
        <div v-for="extension in extensions" :key="extension.id" class="extension-item">
          <div class="extension-header">
            <div class="translator-info">
              <strong>{{ extension.translatorName }}</strong>
              <span class="email">{{ extension.translatorEmail }}</span>
            </div>
            <span class="status-badge pending">PENDING</span>
          </div>

          <div class="extension-details">
            <div class="detail-row">
              <span class="label">Current deadline:</span>
              <span class="value">{{ formatDate(extension.currentDeadline) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Requested deadline:</span>
              <span class="value requested-deadline">{{ formatDate(extension.newDeadline) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Reason:</span>
              <div class="reason-container">
                <p class="reason-text">{{ extension.reason }}</p>
              </div>
            </div>
            <div class="detail-row">
              <span class="label">Requested on:</span>
              <span class="value">{{ formatDate(extension.createdAt) }}</span>
            </div>
          </div>

          <div class="extension-actions">
            <button
              @click="confirmApprove(extension)"
              :disabled="actionLoading"
              class="btn btn-approve"
            >
              {{ actionLoading ? 'Approving...' : 'Approve' }}
            </button>
            <button
              @click="confirmReject(extension)"
              :disabled="actionLoading"
              class="btn btn-reject"
            >
              {{ actionLoading ? 'Rejecting...' : 'Reject' }}
            </button>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="emit('close')" class="btn btn-close">Close</button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="confirm-modal-backdrop" @click.self="closeConfirmModal">
      <div class="confirm-modal">
        <div class="confirm-header">
          <h3>{{ confirmAction === 'approve' ? 'Approve Extension' : 'Reject Extension' }}</h3>
        </div>
        <div class="confirm-content">
          <p v-if="confirmAction === 'approve'">
            Are you sure you want to approve this deadline extension?
            The request deadline will be updated to <strong>{{ formatDate(selectedExtension?.newDeadline) }}</strong>.
          </p>
          <p v-else>
            Are you sure you want to reject this deadline extension?
            The original deadline will remain unchanged.
          </p>
        </div>
        <div class="confirm-actions">
          <button @click="closeConfirmModal" class="btn btn-cancel">Cancel</button>
          <button
            @click="executeAction"
            :disabled="actionLoading"
            :class="['btn', confirmAction === 'approve' ? 'btn-approve' : 'btn-reject']"
          >
            {{ actionLoading ? 'Processing...' : (confirmAction === 'approve' ? 'Approve' : 'Reject') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axiosInstance from '../api'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  requestId: { type: [Number, String], required: true },
  requestTitle: { type: String, required: true }
})

const emit = defineEmits(['close', 'updated'])

const extensions = ref([])
const loading = ref(false)
const actionLoading = ref(false)
const showConfirmModal = ref(false)
const confirmAction = ref('')
const selectedExtension = ref(null)

const toast = useToast()

onMounted(() => {
  fetchExtensions()
})

async function fetchExtensions() {
  loading.value = true
  try {
    const response = await axiosInstance.get(`/requests/${props.requestId}/extensions`)
    extensions.value = response.data
  } catch (err) {
    console.error('Failed to fetch extensions:', err)
    extensions.value = []
  } finally {
    loading.value = false
  }
}

function confirmApprove(extension) {
  selectedExtension.value = extension
  confirmAction.value = 'approve'
  showConfirmModal.value = true
}

function confirmReject(extension) {
  selectedExtension.value = extension
  confirmAction.value = 'reject'
  showConfirmModal.value = true
}

function closeConfirmModal() {
  showConfirmModal.value = false
  confirmAction.value = ''
  selectedExtension.value = null
}

async function executeAction() {
  if (!selectedExtension.value || !confirmAction.value) return

  console.log('🚀 executeAction called:', {
    action: confirmAction.value,
    extension: selectedExtension.value,
    requestId: props.requestId
  })

  actionLoading.value = true
  try {
    let response;
    if (confirmAction.value === 'approve') {
      console.log('✅ Calling approveExtension...')
      response = await axiosInstance.post(`/requests/${props.requestId}/extensions/${selectedExtension.value.id}/approve`)
    } else {
      console.log('❌ Calling rejectExtension...')
      response = await axiosInstance.post(`/requests/${props.requestId}/extensions/${selectedExtension.value.id}/reject`)
    }

    // Show success toast
    const actionText = confirmAction.value === 'approve' ? 'approved' : 'rejected';
    toast.add({
      severity: 'success',
      summary: 'Extension Request ' + actionText.charAt(0).toUpperCase() + actionText.slice(1),
      detail: `Extension request has been ${actionText} successfully.`,
      life: 3000
    });

    // Close confirmation modal
    closeConfirmModal()

    // Refresh the extensions list in the main dialog
    await fetchExtensions()

    // Notify parent to refresh its data (e.g., hide "Extensions" button if count is 0)
    emit('updated')

    // Close the main ExtensionRequestsDialog after successful action
    emit('close')

  } catch (err) {
    console.error('💥 Action failed:', err)
    console.error('💥 Error details:', {
      status: err.response?.status,
      message: err.response?.data?.message,
      error: err.response?.data?.error
    })
    // Show error toast
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Action failed',
      life: 3000
    });
  } finally {
    actionLoading.value = false
  }
}



function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  width: 900px;
  max-width: 95vw;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
  padding: 36px 40px;
}

.dialog-header {
  margin-bottom: 24px;
  text-align: center;
}

.dialog-header h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.loading, .no-extensions {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.extensions-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.extension-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  background: #fafafa;
}

.extension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.translator-info strong {
  display: block;
  font-size: 1.1rem;
  color: #1f2937;
  margin-bottom: 4px;
}

.email {
  color: #6b7280;
  font-size: 0.9rem;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.extension-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 600;
  color: #374151;
  min-width: 120px;
  flex-shrink: 0;
}

.value {
  color: #1f2937;
  text-align: right;
  flex: 1;
}

.value.requested-deadline {
  color: #059669; /* Green color for requested deadline */
  font-weight: 600;
}

.reason-container {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  flex: 1;
  max-width: 400px;
  word-wrap: break-word;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.reason-text {
  margin: 0;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.extension-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-approve {
  background: #10b981;
  color: white;
}

.btn-approve:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-close {
  background: #6b7280;
  color: white;
}

.btn-close:hover {
  background: #4b5563;
}

.dialog-footer {
  margin-top: 32px;
  text-align: center;
}

/* Confirmation Modal Styles */
.confirm-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}

.confirm-modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.confirm-header h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 1.3rem;
  text-align: center;
}

.confirm-content {
  margin-bottom: 32px;
  text-align: center;
}

.confirm-content p {
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
}

.confirm-content strong {
  color: #1f2937;
}

.confirm-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-cancel {
  background: #6b7280;
  color: white;
}

.btn-cancel:hover {
  background: #4b5563;
}
</style>
