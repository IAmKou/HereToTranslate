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
            <div class="detail-row reason-row">
              <span class="label">Reason:</span>
              <input
                type="text"
                :value="extension.reason"
                readonly
                class="reason-input"
              />
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
  width: 800px;
  max-width: 95vw;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1);
  padding: 32px 36px;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.dialog-header {
  margin-bottom: 28px;
  text-align: center;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f5f9;
}

.dialog-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.85rem;
  font-weight: 500;
}

.loading, .no-extensions {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 0.9rem;
}

.extensions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.extension-item {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 22px;
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.extension-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.extension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.translator-info strong {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 3px;
  letter-spacing: -0.01em;
}

.email {
  color: #6b7280;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge {
  padding: 5px 10px;
  border-radius: 18px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-badge.pending {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fbbf24;
}

.extension-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
  padding: 8px 0;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 600;
  color: #374151;
  min-width: 110px;
  flex-shrink: 0;
  font-size: 0.8rem;
}

.value {
  color: #1f2937;
  text-align: right;
  flex: 1;
  font-size: 0.8rem;
  font-weight: 500;
}

.value.requested-deadline {
  color: #059669;
  font-weight: 600;
}

.reason-row {
  align-items: center;
}

.reason-input {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.8rem;
  color: #374151;
  flex: 1;
  max-width: 380px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: default;
  transition: all 0.2s ease;
}

.reason-input:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.reason-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.extension-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.02em;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-approve {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: 1px solid #059669;
}

.btn-approve:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-reject {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: 1px solid #dc2626;
}

.btn-reject:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-close {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  border: 1px solid #4b5563;
}

.btn-close:hover {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.dialog-footer {
  margin-top: 28px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
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
  border-radius: 16px;
  padding: 28px;
  max-width: 480px;
  width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 8px 32px rgba(0,0,0,0.15);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.confirm-header h3 {
  margin: 0 0 18px 0;
  color: #111827;
  font-size: 1.2rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: -0.025em;
}

.confirm-content {
  margin-bottom: 28px;
  text-align: center;
}

.confirm-content p {
  margin: 0;
  color: #4b5563;
  line-height: 1.5;
  font-size: 0.85rem;
}

.confirm-content strong {
  color: #111827;
  font-weight: 600;
}

.confirm-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
}

.btn-cancel {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  border: 1px solid #4b5563;
}

.btn-cancel:hover {
  background: #4b5563;
}
</style>
