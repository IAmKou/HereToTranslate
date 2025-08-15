<template>
  <Teleport to="body">
    <div class="delete-comment-dialog-modal">
      <div class="modal-overlay" @click="$emit('close')"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Delete Comment?</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="modal-body">
          <p>Are you sure you want to delete this comment?</p>
          <div class="comment-preview">
            <div class="comment-text">{{ comment.content }}</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-cancel" @click="$emit('close')">
            Cancel
          </button>
          <button
            class="btn btn-delete"
            @click="handleDelete"
            :disabled="loading"
          >
            {{ loading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import axiosInstance from '../api'

const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  discussionId: {
    type: Number,
    required: true
  },
  projectId: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['close', 'deleted'])

const loading = ref(false)

async function handleDelete() {
  loading.value = true

  try {
    await axiosInstance.delete(`/projects/${props.projectId}/discussions/${props.discussionId}/${props.comment.id}`)
    emit('deleted')
  } catch (error) {
    console.error('Error deleting comment:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.delete-comment-dialog-modal {
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
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  position: relative;
  z-index: 10000;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 1rem;
}

.modal-body p {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.comment-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
}

.comment-text {
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.4;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-width: 60px;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-delete {
  background: #dc2626;
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-delete:disabled {
  background: #fca5a5;
  cursor: not-allowed;
}
</style>
