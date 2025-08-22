<template>
  <div class="dialog-backdrop" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>Request Deadline Extension</h3>
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

// Set minimum date to be after current deadline
const minDate = computed(() => {
  const currentDeadlineDate = new Date(props.currentDeadline)
  const nextDay = new Date(currentDeadlineDate)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0)
  return nextDay
})

const minDateStr = () => minDate.value.toISOString().slice(0, 10)

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
    // You can add toast notification here if you have a toast system
    alert('Failed to submit extension request. Please try again.')
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
.dialog-header h3 { margin: 0; font-size: 1rem; }
.form-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
label { font-weight: 600; color: #374151; font-size: 0.85rem; }
input, textarea { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-size: 0.85rem; }
textarea { min-height: 180px; resize: vertical; }
input:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
.btn { padding: 12px 20px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn-primary { background: #2563eb; color: #fff; border: none; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
</style>


