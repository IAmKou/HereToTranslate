<template>
  <Teleport to="body">
    <div class="cancel-dialog-modal">
      <div class="modal-overlay" @click="$emit('close')"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Respond to Cancellation</h3>
          <button class="close-btn" @click="$emit('close')">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="info">
            <div><strong>ID:</strong> {{ cancellationId }}</div>
          </div>
          <div class="form-group">
            <label>Decision</label>
            <div class="radio-group">
              <label class="radio"><input type="radio" value="true" v-model="approvedRaw" /> Approve</label>
              <label class="radio"><input type="radio" value="false" v-model="approvedRaw" /> Reject</label>
            </div>
          </div>
          <div class="form-group">
            <label for="responseReason">Reason (optional)</label>
            <textarea id="responseReason" v-model="responseReason" class="form-control" rows="3" placeholder="Add a note to your decision"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">Close</button>
          <button class="btn btn-primary" :disabled="submitting" @click="submit">
            <i v-if="submitting" class="pi pi-spin pi-spinner"></i>
            {{ submitting ? 'Submitting...' : 'Submit' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import axiosInstance from '../api'

const props = defineProps({ cancellationId: { type: Number, required: true } })
const emit = defineEmits(['close', 'completed'])

const approvedRaw = ref('true')
const responseReason = ref('')
const submitting = ref(false)

const approved = computed(() => approvedRaw.value === 'true')

async function submit() {
  submitting.value = true
  try {
    await axiosInstance.put('/project-cancellation/respond', {
      cancellationId: props.cancellationId,
      approved: approved.value,
      responseReason: responseReason.value || undefined,
    })
    emit('completed')
    emit('close')
  } catch (e) {
    // noop, parent shows toast
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cancel-dialog-modal { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; }
.modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.modal-content { position: relative; background: #fff; border-radius: 12px; width: 92%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid #e5e7eb; }
.close-btn { background:none; border:none; font-size:1.2rem; color:#6b7280; cursor:pointer; padding:0.25rem; border-radius:6px; }
.modal-body { padding: 1rem 1.25rem; }
.modal-footer { display:flex; gap:0.75rem; justify-content:flex-end; padding:1rem 1.25rem; border-top:1px solid #e5e7eb; }
.btn { padding:0.6rem 1.2rem; border:none; border-radius:6px; font-size:0.9rem; font-weight:600; cursor:pointer; }
.btn-secondary { background:#6b7280; color:#fff; }
.btn-primary { background:#3b82f6; color:#fff; }
.form-group { margin-top: 12px; }
label { display:block; margin-bottom:6px; font-weight:600; color:#374151; font-size:0.9rem; }
.form-control { width:100%; padding:0.6rem 0.8rem; border:1px solid #d1d5db; border-radius:6px; font-size:0.9rem; }
.radio-group { display:flex; gap:1rem; }
.radio { display:flex; align-items:center; gap:6px; }
.info { color:#64748b; margin-bottom:8px; font-size:0.9rem; }
</style>


