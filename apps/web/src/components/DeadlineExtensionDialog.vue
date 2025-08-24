<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>Request Deadline Extension</h3>
      </div>

      <!-- Loading state while checking extensions -->
      <div v-if="checkingExtensions" class="loading-extensions">
        <p>Checking for existing extension requests...</p>
      </div>

      <!-- Warning about existing extension request -->
      <div v-else-if="existingExtensionRequest" class="existing-extension-warning">
        <div class="warning-icon">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
        <div class="warning-content">
          <h4>⚠️ Existing Extension Request</h4>
          <p>You have received a deadline extension request from the translator for this project.</p>
          <div class="extension-details">
            <p><strong>Requested Deadline:</strong> {{ formatDate(existingExtensionRequest.newDeadline) }}</p>
            <p><strong>Reason:</strong> {{ existingExtensionRequest.reason }}</p>
            <p><strong>Status:</strong> <span class="status-badge">{{ existingExtensionRequest.status }}</span></p>
          </div>
          <p><em>Please review the existing extension request before submitting a new one.</em></p>
        </div>
      </div>

      <form @submit.prevent="submit" :class="{ 'form-disabled': checkingExtensions || existingExtensionRequest }">
        <div class="form-row">
          <label for="newDate">New deadline</label>
          <input id="newDate" v-model="newDeadline" type="date" :min="minDateStr()" required :disabled="checkingExtensions || !!existingExtensionRequest" />
        </div>
        <div class="form-row">
          <label for="reason">Reason</label>
          <textarea id="reason" v-model="reason" rows="4" placeholder="Brief reason for extension (≥ 10 chars)" required :disabled="checkingExtensions || !!existingExtensionRequest"></textarea>
          <small v-if="reason && reason.length < 10" style="color:#b91c1c">Please provide at least 10 characters.</small>
        </div>

        <div class="dialog-actions">
          <button type="button" @click="emit('close')" class="btn btn-cancel">Cancel</button>
          <button
            type="submit"
            :disabled="!isValid || loading || checkingExtensions || !!existingExtensionRequest"
            class="btn btn-submit"
          >
            {{ loading ? 'Submitting...' : (checkingExtensions ? 'Checking...' : (existingExtensionRequest ? 'Extension Already Requested' : 'Submit request')) }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axiosInstance from '../api'

const props = defineProps({
  requestId: { type: [Number, String], required: true },
  currentDeadline: { type: String, required: true }
})
const emit = defineEmits(['close', 'submitted'])

const newDeadline = ref('')
const reason = ref('')
const loading = ref(false)
const existingExtensionRequest = ref(null)
const checkingExtensions = ref(false)

// Check for existing extension requests when component mounts
async function checkExistingExtensions() {
  checkingExtensions.value = true
  try {
    const response = await axiosInstance.get(`/requests/${props.requestId}/extensions`)
    if (response.data && response.data.length > 0) {
      existingExtensionRequest.value = {
        newDeadline: response.data[0].newDeadline,
        reason: response.data[0].reason,
        status: 'Pending Review'
      }
    }
  } catch (error) {
    console.error('Failed to check existing extensions:', error)
  } finally {
    checkingExtensions.value = false
  }
}

// Set current deadline when component mounts or when prop changes
const initializeDeadline = () => {
  if (props.currentDeadline) {
    // Convert to YYYY-MM-DD format for HTML date input
    const date = new Date(props.currentDeadline)
    newDeadline.value = date.toISOString().split('T')[0]
  }
}

onMounted(() => {
  initializeDeadline()
  checkExistingExtensions()
})

// Watch for changes in currentDeadline prop
watch(() => props.currentDeadline, (newValue) => {
  if (newValue) {
    initializeDeadline()
  }
}, { immediate: true })

// Toast notification function
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#2563eb'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.remove()
  }, 5000)
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Set minimum date to be after current deadline
const minDate = computed(() => {
  if (!props.currentDeadline) return new Date()
  const currentDeadlineDate = new Date(props.currentDeadline)
  const nextDay = new Date(currentDeadlineDate)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0)
  return nextDay
})

const minDateStr = () => {
  if (!minDate.value) return ''
  return minDate.value.toISOString().split('T')[0]
}

// Format extension deadline (3 days after current deadline)
function formatExtensionDeadline() {
  const currentDeadlineDate = new Date(props.currentDeadline)
  const extensionDeadline = new Date(currentDeadlineDate)
  extensionDeadline.setDate(extensionDeadline.getDate() + 3)
  return formatDate(extensionDeadline)
}

const isValid = computed(() => {
  // If checking extensions or there's an existing extension request, form is never valid
  if (checkingExtensions.value || existingExtensionRequest.value) {
    return false
  }

  const hasReason = reason.value && reason.value.trim().length >= 10
  const hasDate = !!newDeadline.value && new Date(newDeadline.value) > new Date(props.currentDeadline)
  return hasReason && hasDate
})

async function submit() {
  // Prevent submission if there's an existing extension request
  if (existingExtensionRequest.value) {
    showToast('You already have an extension request to review. Please handle the existing request first.', 'error')
    return
  }

  if (!newDeadline.value || !reason.value) return
  loading.value = true
  try {
    await axiosInstance.post(`/requests/${props.requestId}/extension`, {
      newDeadline: newDeadline.value,
      reason: reason.value,
    })
    emit('submitted')
    emit('close')
  } catch (error) {
    console.error('Failed to submit extension request:', error)

    // Show specific error message from backend
    let errorMessage = 'Failed to submit extension request. Please try again.';

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    showToast(errorMessage, 'error')
  } finally {
    loading.value = false
  }
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
  width: 680px;
  max-width: 95vw;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
  padding: 24px 28px;
}
.dialog-header {
  margin-bottom: 20px;
}
.dialog-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  color: #1f2937;
  font-weight: 700;
}
.form-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
label { font-weight: 600; color: #374151; font-size: 0.85rem; }
input, textarea { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-size: 0.85rem; }
textarea { min-height: 180px; resize: vertical; }
input:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.dialog-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
.btn { padding: 12px 20px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn-primary { background: #2563eb; color: #fff; border: none; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-cancel { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.btn-submit { background: #2563eb; color: #fff; border: none; }

/* Loading extensions state */
.loading-extensions {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
  color: #64748b;
}

.loading-extensions p {
  margin: 0;
  font-size: 0.9rem;
}

/* Existing extension warning styles */
.existing-extension-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.warning-icon {
  color: #d97706;
  font-size: 1.5rem;
  margin-top: 2px;
}

.warning-content h4 {
  margin: 0 0 12px 0;
  color: #92400e;
  font-size: 1rem;
  font-weight: 700;
}

.warning-content p {
  margin: 0 0 8px 0;
  color: #78350f;
  font-size: 0.9rem;
  line-height: 1.5;
}

.extension-details {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}

.extension-details p {
  margin: 0 0 6px 0;
  color: #78350f;
  font-size: 0.85rem;
  line-height: 1.4;
}

.extension-details p:last-child {
  margin-bottom: 0;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #f59e0b;
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.warning-note {
  font-weight: 600;
  color: #92400e;
  margin-top: 12px !important;
}

/* Form disabled state */
.form-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.form-disabled input,
.form-disabled textarea {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

/* Toast notification styles */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 10000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast.show {
  transform: translateX(0);
}

.toast-error {
  background: #dc2626;
}

.toast-info {
  background: #2563eb;
}

.toast-success {
  background: #059669;
}
</style>


