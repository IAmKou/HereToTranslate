<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>Request Deadline Extension</h3>
        <p class="dialog-subtitle">You have 3 days after the deadline to request an extension</p>
      </div>

      <!-- Extension Rules Info -->
      <div class="extension-rules">
        <h4>
          <i class="pi pi-info-circle"></i>
          Extension Rules
        </h4>
        <ul>
          <li><strong>Grace Period:</strong> <span class="approved">3 days after deadline</span></li>
          <li><strong>Current Deadline:</strong> {{ formatDate(currentDeadline) }}</li>
          <li><strong>Extension Deadline:</strong> {{ formatExtensionDeadline() }}</li>
          <li><strong>Note:</strong> After the grace period expires, you cannot request extensions</li>
        </ul>
      </div>

      <form @submit.prevent="submit">
        <div class="form-row">
          <label for="newDate">New deadline</label>
          <input id="newDate" v-model="newDeadline" type="date" :min="minDateStr()" required />
        </div>
        <div class="form-row">
          <label for="reason">Reason</label>
          <textarea id="reason" v-model="reason" rows="4" placeholder="Brief reason for extension (≥ 10 chars)" required></textarea>
          <small v-if="reason && reason.length < 10" style="color:#b91c1c">Please provide at least 10 characters.</small>
        </div>
        <div class="actions">
          <button type="button" class="btn" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="loading || !isValid">
            {{ loading ? 'Submitting...' : 'Submit request' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axiosInstance from '../api'

const props = defineProps({
  requestId: { type: [Number, String], required: true },
  currentDeadline: { type: String, required: true }
})
const emit = defineEmits(['close', 'submitted'])

const newDeadline = ref('')
const reason = ref('')
const loading = ref(false)

// Toast notification function
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message

  // Add to body
  document.body.appendChild(toast)

  // Show toast
  setTimeout(() => toast.classList.add('show'), 100)

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => document.body.removeChild(toast), 300)
  }, 5000)
}

// Set minimum date to be after current deadline
const minDate = computed(() => {
  const currentDeadlineDate = new Date(props.currentDeadline)
  const nextDay = new Date(currentDeadlineDate)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0)
  return nextDay
})

const minDateStr = () => minDate.value.toISOString().slice(0, 10)

// Format extension deadline (3 days after current deadline)
function formatExtensionDeadline() {
  const currentDeadlineDate = new Date(props.currentDeadline)
  const extensionDeadline = new Date(currentDeadlineDate)
  extensionDeadline.setDate(extensionDeadline.getDate() + 3)
  return formatDate(extensionDeadline)
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Pre-fill with current deadline when component mounts
newDeadline.value = props.currentDeadline

const isValid = computed(() => {
  const hasReason = reason.value && reason.value.trim().length >= 10
  const hasDate = !!newDeadline.value && new Date(newDeadline.value) > new Date(props.currentDeadline)
  return hasReason && hasDate
})

async function submit() {
  if (!newDeadline.value || !reason.value) return
  loading.value = true
  try {
    console.log('🔍 [FRONTEND] Submitting extension request:', {
      requestId: props.requestId,
      newDeadline: newDeadline.value,
      reason: reason.value,
      reasonLength: reason.value.length
    });

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

    // Show toast notification with specific error reason
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
.dialog-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
}
.form-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
label { font-weight: 600; color: #374151; font-size: 0.85rem; }
input, textarea { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-size: 0.85rem; }
textarea { min-height: 180px; resize: vertical; }
input:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
.btn { padding: 12px 20px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn-primary { background: #2563eb; color: #fff; border: none; }
.btn:disabled { opacity: .6; cursor: not-allowed; }

.extension-rules {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border-left: 4px solid #f59e0b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.extension-rules h4 {
  margin: 0 0 16px 0;
  font-size: 1rem;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.extension-rules h4 i {
  color: #f59e0b;
  font-size: 1.1rem;
}

.extension-rules ul {
  margin: 0;
  padding-left: 20px;
  font-size: 0.9rem;
  color: #4b5563;
}

.extension-rules li {
  margin-bottom: 12px;
  line-height: 1.6;
}

.extension-rules .approved {
  color: #059669;
  font-weight: 600;
  background: #ecfdf5;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.extension-rules strong {
  color: #1f2937;
  font-weight: 700;
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


