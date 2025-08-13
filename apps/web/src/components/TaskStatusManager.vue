<template>
  <div class="task-status-manager">
    <!-- Header -->
    <div class="status-header">
      <h2>Task Status Management</h2>
      <button class="btn-primary" @click="showCreateStatus = true">
        <i class="pi pi-plus"></i>
        Create Status
      </button>
    </div>

    <!-- Status List -->
    <div class="status-list">
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        Loading task statuses...
      </div>

      <div v-else-if="taskStatuses.length === 0" class="empty-state">
        <div class="empty-icon">🏷️</div>
        <h3>No task statuses yet</h3>
        <p>Create your first task status to define the workflow stages</p>
        <button class="btn-primary" @click="showCreateStatus = true">
          Create Status
        </button>
      </div>

      <div v-else class="status-cards">
        <div
          v-for="status in sortedStatuses"
          :key="status.id"
          class="status-card"
          :class="{ 'default': status.isDefault }"
        >
          <div class="status-card-header">
            <div class="status-info">
              <div class="status-color-preview" :style="{ backgroundColor: status.color }"></div>
              <div class="status-details">
                <h3>{{ status.name }}</h3>
                <p v-if="status.description">{{ status.description }}</p>
                <div class="status-badges">
                  <span v-if="status.isDefault" class="badge default">Default</span>
                  <span v-if="status.isActive" class="badge active">Active</span>
                  <span v-else class="badge inactive">Inactive</span>
                  <span class="badge type">{{ status.type }}</span>
                </div>
              </div>
            </div>
            <div class="status-actions">
              <button
                class="btn-icon"
                @click="editStatus(status)"
                title="Edit status"
              >
                <i class="pi pi-pencil"></i>
              </button>
              <button
                v-if="!status.isDefault"
                class="btn-icon danger"
                @click="deleteStatus(status)"
                title="Delete status"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>

          <div class="status-stats">
            <div class="stat">
              <span class="stat-label">Tasks</span>
              <span class="stat-value">{{ getTasksInStatus(status.id) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Status Modal -->
    <div v-if="showCreateStatus || showEditStatus" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ showEditStatus ? 'Edit Task Status' : 'Create Task Status' }}</h3>
          <button class="btn-icon" @click="closeStatusModal">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <form @submit.prevent="saveStatus" class="status-form">
          <div class="form-group">
            <label for="statusName">Name *</label>
            <input
              id="statusName"
              v-model="statusForm.name"
              type="text"
              required
              placeholder="Enter status name"
            >
          </div>

          <div class="form-group">
            <label for="statusDescription">Description</label>
            <textarea
              id="statusDescription"
              v-model="statusForm.description"
              placeholder="Enter status description"
              rows="3"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="statusType">Type *</label>
              <select id="statusType" v-model="statusForm.type" required>
                <option value="">Select status type</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="review">Review</option>
                <option value="approval">Approval</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="statusColor">Color *</label>
            <div class="color-picker">
              <input
                id="statusColor"
                v-model="statusForm.color"
                type="color"
                required
                class="color-input"
              >
              <span class="color-preview" :style="{ backgroundColor: statusForm.color }"></span>
              <span class="color-value">{{ statusForm.color }}</span>
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                v-model="statusForm.isDefault"
                type="checkbox"
              >
              <span class="checkmark"></span>
              Set as default status for this project
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="closeStatusModal">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="saving">
              <i v-if="saving" class="pi pi-spin pi-spinner"></i>
              {{ showEditStatus ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h3>Quick Actions</h3>
      <div class="action-buttons">
        <button class="btn-secondary" @click="createDefaultStatuses">
          <i class="pi pi-magic"></i>
          Create Default Statuses
        </button>

        <button class="btn-secondary" @click="exportStatuses">
          <i class="pi pi-download"></i>
          Export Statuses
        </button>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';

interface TaskStatus {
  id: string;
  name: string;
  description?: string;
  color: string;
  type: string;

  isActive: boolean;
  isDefault: boolean;
  project: { id: string };
  createdAt: string;
  updatedAt: string;
}

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'status-updated'): void;
}>();

const toast = useToast();

// State
const taskStatuses = ref<TaskStatus[]>([]);
const loading = ref(false);
const saving = ref(false);

// Modal states
const showCreateStatus = ref(false);
const showEditStatus = ref(false);

// Selected items
const selectedStatus = ref<TaskStatus | null>(null);

// Forms
const statusForm = ref({
  name: '',
  description: '',
  type: '',
  color: '#007bff',
  isDefault: false
});

// Computed
const sortedStatuses = computed(() =>
  [...taskStatuses.value]
);

// Methods
async function loadTaskStatuses() {
  loading.value = true;
  try {
    const { data } = await axiosInstance.get(`/task-statuses/project/${props.projectId}`);
    taskStatuses.value = data;
  } catch (error) {
    console.error('Error loading task statuses:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load task statuses',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

function getTasksInStatus(_statusId: string): number {
  return 0; // Placeholder
}

// Status actions
function createStatus() {
  statusForm.value = {
    name: '',
    description: '',
    type: '',
    color: '#007bff',
    isDefault: false
  };
  showCreateStatus.value = true;
}

function editStatus(status: TaskStatus) {
  statusForm.value = {
    name: status.name,
    description: status.description || '',
    type: status.type,
    color: status.color,
    isDefault: status.isDefault
  };
  selectedStatus.value = status;
  showEditStatus.value = true;
}

async function saveStatus() {
  saving.value = true;
  try {
    if (showEditStatus.value && selectedStatus.value) {
      await axiosInstance.put(`/task-statuses/${selectedStatus.value.id}`, statusForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Task status updated successfully',
        life: 3000
      });
    } else {
      await axiosInstance.post(`/task-statuses/project/${props.projectId}`, statusForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Task status created successfully',
        life: 3000
      });
    }
    await loadTaskStatuses();
    emit('status-updated');
    closeStatusModal();
  } catch (error) {
    console.error('Error saving task status:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save task status',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
}

async function deleteStatus(status: TaskStatus) {
  if (!confirm(`Are you sure you want to delete status "${status.name}"?`)) {
    return;
  }
  try {
    await axiosInstance.delete(`/task-statuses/${status.id}`);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Task status deleted successfully',
      life: 3000
    });
    await loadTaskStatuses();
    emit('status-updated');
  } catch (error) {
    console.error('Error deleting task status:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete task status',
      life: 3000
    });
  }
}

// Quick actions
async function createDefaultStatuses() {
  try {
    await axiosInstance.post(`/task-statuses/project/${props.projectId}/defaults`);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Default task statuses created successfully',
      life: 3000
    });
    await loadTaskStatuses();
    emit('status-updated');
  } catch (error) {
    console.error('Error creating default statuses:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create default statuses',
      life: 3000
    });
  }
}

async function exportStatuses() {
  try {
    const { data } = await axiosInstance.get(`/task-statuses/project/${props.projectId}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-statuses-${props.projectId}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Task statuses exported successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error exporting task statuses:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to export task statuses',
      life: 3000
    });
  }
}

// Modal close functions
function closeStatusModal() {
  showCreateStatus.value = false;
  showEditStatus.value = false;
  selectedStatus.value = null;
  statusForm.value = {
    name: '',
    description: '',
    type: '',
    color: '#007bff',
    isDefault: false
  };
}

// Lifecycle
onMounted(() => {
  loadTaskStatuses();
});

watch(() => props.projectId, () => {
  if (props.projectId) {
    loadTaskStatuses();
  }
});
</script>

<style scoped>
.task-status-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.status-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-icon {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f8f9fa;
  color: #333;
}

.btn-icon.danger:hover {
  background: #f8d7da;
  color: #721c24;
}

/* Loading and Empty States */
.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.loading-state i {
  font-size: 24px;
  margin-bottom: 16px;
  display: block;
}

.empty-state .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #666;
}

/* Status Cards */
.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.status-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.status-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.status-card.default {
  border-color: #007bff;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
}

.status-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.status-color-preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  flex-shrink: 0;
}

.status-details h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 18px;
}

.status-details p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
}

.status-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge.default {
  background: #007bff;
  color: white;
}

.badge.active {
  background: #28a745;
  color: white;
}

.badge.inactive {
  background: #6c757d;
  color: white;
}

.badge.type {
  background: #e9ecef;
  color: #495057;
}

.status-actions {
  display: flex;
  gap: 4px;
}

.status-stats {
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* Quick Actions */
.quick-actions {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.quick-actions h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}



.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

/* Form Styles */
.status-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-input {
  width: 60px;
  height: 40px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  border: 2px solid #ddd;
}

.color-value {
  font-family: monospace;
  font-size: 14px;
  color: #666;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}



/* Responsive */
@media (max-width: 768px) {
  .status-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .status-cards {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .modal {
    width: 95%;
    margin: 20px;
  }
}
</style>
