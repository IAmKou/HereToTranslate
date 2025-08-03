<template>
  <Teleport to="body">
    <div class="review-dialog-modal">
      <div class="modal-overlay" @click="$emit('close')"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Review Request</h3>
          <button class="close-btn" @click="$emit('close')">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="request-info">
            <h4>{{ request.title }}</h4>
            <p>{{ request.description }}</p>
            <div class="request-details">
              <div class="detail-item">
                <span class="label">Deal Amount:</span>
                <span class="value">${{ request.dealAmount }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Deadline:</span>
                <span class="value">{{ formatDate(request.deadline) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Status:</span>
                <span :class="['status-badge', `status-${request.status.toLowerCase()}`]">
                  {{ request.status }}
                </span>
              </div>
            </div>
          </div>

          <div class="review-form">
            <div class="form-group">
              <label>Review Decision</label>
              <div class="radio-group">
                <label class="radio-item">
                  <input
                    type="radio"
                    v-model="decision"
                    value="APPROVED"
                    :disabled="request.status !== 'PENDING'"
                  >
                  <span class="radio-label">Approve</span>
                </label>
                <label class="radio-item">
                  <input
                    type="radio"
                    v-model="decision"
                    value="REJECTED"
                    :disabled="request.status !== 'PENDING'"
                  >
                  <span class="radio-label">Reject</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="comment">Comment (Optional)</label>
              <textarea
                id="comment"
                v-model="comment"
                class="form-control"
                rows="3"
                placeholder="Add a comment about your decision..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click="handleReview"
            :disabled="!decision || loading || request.status !== 'PENDING'"
          >
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? 'Reviewing...' : 'Submit Review' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const props = defineProps({
  request: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'reviewed'])

const decision = ref('')
const comment = ref('')
const loading = ref(false)

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function handleReview() {
  if (!decision.value) return

  loading.value = true

  try {
    await axios.post(`/api/requests/${props.request.id}/review`, {
      status: decision.value,
      comment: comment.value
    })

    emit('reviewed')
    emit('close')
  } catch (error) {
    console.error('Error reviewing request:', error)
    // Handle error
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.review-dialog-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.request-info {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.request-info h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.1rem;
}

.request-info p {
  margin: 0 0 1rem 0;
  color: #64748b;
  line-height: 1.5;
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
}

.label {
  font-weight: 500;
  color: #374151;
}

.value {
  color: #64748b;
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

.review-form {
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.radio-item input[type="radio"] {
  margin: 0;
}

.radio-label {
  font-size: 0.875rem;
  color: #374151;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  resize: vertical;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
