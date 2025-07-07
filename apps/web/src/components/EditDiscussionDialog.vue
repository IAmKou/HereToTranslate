<template>
  <div class="edit-dialog-modal">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edit Discussion</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="title">Title</label>
          <input id="title" v-model="title" class="form-control" />
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" v-model="description" class="form-control" rows="3"></textarea>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import axiosInstance from '../api'

const props = defineProps({
  discussion: {
    type: Object,
    required: true
  },
  projectId: {
    type: Number,
    required: true
  }
})
const emit = defineEmits(['close', 'updated'])

const title = ref(props.discussion.title)
const description = ref(props.discussion.description || '')
const loading = ref(false)
const error = ref('')

watch(() => props.discussion, (newVal) => {
  title.value = newVal.title
  description.value = newVal.description || ''
})

async function handleSave() {
  if (!title.value.trim()) {
    error.value = 'Title is required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await axiosInstance.patch(`/projects/${props.projectId}/discussions/${String(props.discussion.id)}`, {
      title: title.value,
      description: description.value
    })
    emit('updated')
    emit('close')
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to update discussion'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.edit-dialog-modal {
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
.modal-body {
  padding: 1.5rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}
.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
  transition: border-color 0.2s;
}
.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.error-message {
  color: #dc2626;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}
.btn-secondary:hover {
  background: #e5e7eb;
}
.btn-primary {
  background: #2563eb;
  color: white;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}
.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
