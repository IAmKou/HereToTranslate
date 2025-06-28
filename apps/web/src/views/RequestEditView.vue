<template>
  <div class="edit-request-modal">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edit Request</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="edit-form">
        <div class="form-group">
          <label for="title">Title <span class="required">*</span></label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            required
            class="form-control"
            :class="{ 'error': errors.title }"
            placeholder="Enter request title"
          >
          <span v-if="errors.title" class="error-message">{{ errors.title }}</span>
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            class="form-control"
            :class="{ 'error': errors.description }"
            rows="4"
            placeholder="Enter request description"
          ></textarea>
          <span v-if="errors.description" class="error-message">{{ errors.description }}</span>
        </div>

        <div class="form-group">
          <label for="dealAmount">Deal Amount <span class="required">*</span></label>
          <input
            id="dealAmount"
            v-model.number="form.dealAmount"
            type="number"
            min="0"
            required
            class="form-control"
            :class="{ 'error': errors.dealAmount }"
            placeholder="Enter deal amount"
          >
          <span v-if="errors.dealAmount" class="error-message">{{ errors.dealAmount }}</span>
        </div>

        <div class="form-group">
          <label for="deadline">Deadline <span class="required">*</span></label>
          <input
            id="deadline"
            v-model="form.deadline"
            type="date"
            :min="minDateString"
            required
            class="form-control"
            :class="{ 'error': errors.deadline }"
          >
          <span v-if="errors.deadline" class="error-message">{{ errors.deadline }}</span>
          <span v-else class="help-text">Deadline phải cách hiện tại ít nhất 7 ngày</span>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? 'Updating...' : 'Update Request' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const props = defineProps({
  request: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const form = ref({
  title: '',
  description: '',
  dealAmount: 0,
  deadline: ''
})

const errors = ref({})
const loading = ref(false)

const minDate = ref(new Date())
minDate.value.setDate(minDate.value.getDate() + 7)

const minDateString = computed(() => {
  return minDate.value.toISOString().split('T')[0]
})

onMounted(() => {
  if (props.request) {
    console.log('Request data:', props.request)
    console.log('Request ID:', props.request.id, typeof props.request.id)

    form.value = {
      title: props.request.title || '',
      description: props.request.description || '',
      dealAmount: props.request.dealAmount || 0,
      deadline: props.request.deadline ? new Date(props.request.deadline).toISOString().split('T')[0] : ''
    }

    console.log('Form data:', form.value)
  }
})

function validateForm() {
  errors.value = {}

  if (!form.value.title.trim()) {
    errors.value.title = 'Title is required'
  }

  if (form.value.dealAmount <= 0) {
    errors.value.dealAmount = 'Deal amount must be greater than 0'
  }

  if (!form.value.deadline) {
    errors.value.deadline = 'Deadline is required'
  } else {
    const deadlineDate = new Date(form.value.deadline)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    if (deadlineDate < sevenDaysFromNow) {
      errors.value.deadline = 'Deadline phải cách hiện tại ít nhất 7 ngày'
    }
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    console.log('Updating request:', props.request.id, {
      title: form.value.title,
      description: form.value.description,
      dealAmount: form.value.dealAmount,
      deadline: form.value.deadline
    })

    const response = await axios.post(`/api/requests/${props.request.id}/update`, {
      title: form.value.title,
      description: form.value.description,
      dealAmount: Number(form.value.dealAmount),
      deadline: form.value.deadline
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    })

    console.log('Update response:', response.data)

    emit('updated')
    emit('close')
  } catch (error) {
    console.error('Error updating request:', error)
    console.error('Error response:', error.response?.data)

    // Show error message to user
    const errorMessage = error.response?.data?.message || 'Failed to update request'
    alert(errorMessage) // Temporary alert, should use toast
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.edit-request-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
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
  padding: 0;
  width: 90%;
  max-width: 500px;
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

.edit-form {
  padding: 1.5rem;
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

.required {
  color: #ef4444;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control.error {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
}

.help-text {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
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
