<template>
  <Teleport to="body">
    <div class="cancel-dialog-modal">
      <div class="modal-overlay" @click="$emit('close')"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Request Cancellation</h3>
          <button class="close-btn" @click="$emit('close')">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="loadingSummary" class="loading">
            <i class="pi pi-spin pi-spinner"></i>
            Loading cancellation options...
          </div>

          <template v-else>
            <div class="summary-box" v-if="summary">
              <div class="summary-row">
                <span class="label">Permission</span>
                <span class="value" :class="summary.canCancel ? 'ok' : 'warn'">
                  {{ summary.canCancel ? 'You can request cancellation' : 'You cannot cancel this request' }}
                </span>
              </div>
              <div class="summary-row" v-if="summary.cancellationType">
                <span class="label">Role</span>
                <span class="value">{{ summary.cancellationType }}</span>
              </div>
              <div class="summary-row" v-if="summary.refundAmount">
                <span class="label">Refund</span>
                <span class="value">${{ Number(summary.refundAmount).toFixed(2) }}</span>
              </div>
              <div class="summary-row" v-if="summary.penaltyAmount">
                <span class="label">Penalty</span>
                <span class="value">${{ Number(summary.penaltyAmount).toFixed(2) }}</span>
              </div>
              <div class="summary-note">{{ summary.message }}</div>
            </div>

            <div v-if="summary?.canCancel" class="form">
              <div class="form-group">
                <label>Action</label>
                <div class="radio-group">
                  <label class="radio">
                    <input type="radio" value="DELETE" v-model="action" />
                    <span>Delete project (requires confirmation)</span>
                  </label>
                  <label class="radio">
                    <input type="radio" value="ARCHIVE" v-model="action" />
                    <span>Archive project (no confirmation)</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label for="reason">Reason (required)</label>
                <textarea
                  id="reason"
                  v-model="reason"
                  class="form-control"
                  rows="3"
                  placeholder="Describe why you want to cancel"
                ></textarea>
                <div v-if="reasonError" class="error">{{ reasonError }}</div>
              </div>
            </div>
          </template>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">Close</button>
          <button class="btn btn-danger" :disabled="submitting || !summary?.canCancel" @click="submit">
            <i v-if="submitting" class="pi pi-spin pi-spinner"></i>
            {{ submitting ? 'Submitting...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axiosInstance from '../api'

const props = defineProps({ requestId: { type: Number, required: true } })
const emit = defineEmits(['close', 'completed'])

const loadingSummary = ref(false)
const submitting = ref(false)
const summary = ref(null)
const action = ref('DELETE')
const reason = ref('')
const reasonError = ref('')

async function loadSummary() {
  loadingSummary.value = true
  try {
    const res = await axiosInstance.get(`/project-cancellation/summary/${props.requestId}`)
    summary.value = res.data
  } catch (e) {
    summary.value = { canCancel: false, message: 'Failed to load summary' }
  } finally {
    loadingSummary.value = false
  }
}

function validate() {
  reasonError.value = ''
  if (!reason.value || reason.value.trim().length < 5) {
    reasonError.value = 'Please provide a brief reason (min 5 characters).'
    return false
  }
  return true
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    await axiosInstance.post('/project-cancellation/request', {
      requestId: props.requestId,
      reason: reason.value.trim(),
      action: action.value,
    })
    emit('completed')
    emit('close')
  } catch (e) {
    // swallow, caller can show toast
  } finally {
    submitting.value = false
  }
}

onMounted(loadSummary)
watch(() => props.requestId, loadSummary)
</script>

<style scoped>
.cancel-dialog-modal { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; }
.modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.modal-content { position: relative; background: #fff; border-radius: 12px; width: 92%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid #e5e7eb; }
.close-btn { background:none; border:none; font-size:1.2rem; color:#6b7280; cursor:pointer; padding:0.25rem; border-radius:6px; }
.modal-body { padding: 1rem 1.25rem; }
.modal-footer { display:flex; gap:0.75rem; justify-content:flex-end; padding:1rem 1.25rem; border-top:1px solid #e5e7eb; }
.btn { padding:0.6rem 1.2rem; border:none; border-radius:6px; font-size:0.9rem; font-weight:600; cursor:pointer; }
.btn-secondary { background:#6b7280; color:#fff; }
.btn-danger { background:#ef4444; color:#fff; }
.loading { display:flex; align-items:center; gap:8px; color:#64748b; }
.summary-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:12px; }
.summary-row { display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:6px; }
.summary-row .label { color:#64748b; font-weight:500; }
.summary-row .value { color:#111827; font-weight:700; }
.summary-row .value.ok { color:#16a34a; }
.summary-row .value.warn { color:#dc2626; }
.summary-note { color:#6b7280; font-size:0.85rem; margin-top:8px; }
.form-group { margin-top:12px; }
label { display:block; margin-bottom:6px; font-weight:600; color:#374151; font-size:0.9rem; }
.form-control { width:100%; padding:0.6rem 0.8rem; border:1px solid #d1d5db; border-radius:6px; font-size:0.9rem; }
.radio-group { display:flex; flex-direction:column; gap:6px; }
.radio { display:flex; align-items:center; gap:8px; color:#374151; }
.error { color:#dc2626; font-size:0.85rem; margin-top:4px; }
</style>


