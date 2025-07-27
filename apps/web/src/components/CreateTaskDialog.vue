<template>
  <div v-if="visible && !inline" class="modal-overlay">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>Create New Task</h2>
        <button class="close-btn" @click="onCancel">
          <span>&times;</span>
        </button>
      </div>

      <form @submit.prevent="onSubmit" class="task-form">
        <div class="form-group">
          <label for="title" class="required">Task Title</label>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            class="form-control"
            placeholder="Enter task title"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="formData.description"
            class="form-control"
            placeholder="Enter task description (optional)"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="fileSelection">File Selection</label>
          <div style="font-size: 0.8em; color: #666; margin-bottom: 0.5rem;">
            Debug: {{ projectFilesComputed.length }} files loaded
            <br>
            Props files: {{ props.projectFiles?.length || 0 }}
            <br>
            Files: {{ projectFilesComputed.map((f: any) => f.fileName).join(', ') }}
          </div>
          <select
            id="fileSelection"
            v-model="selectedFileId"
            class="form-control"
            @change="onFileChange"
          >
            <option value="">Select a file</option>
            <option
              v-for="file in projectFilesComputed"
              :key="file.fileId"
              :value="file.fileId"
              :disabled="file.status !== 'ready'"
            >
              {{ file.fileName }} {{ file.status !== 'ready' ? `(${file.status})` : '' }}
            </option>
          </select>
          <div v-if="projectFilesComputed.length === 0" style="color: #666; font-style: italic; margin-top: 0.5rem;">
            No files found. Please check if files have been uploaded to this project.
          </div>
          <div v-if="selectedFileId && fileParts.length > 0" class="file-parts-section">
            <label class="file-parts-label">File Parts:</label>
            <div class="file-parts-info" style="margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">
              Select specific parts to create tasks for. If you select multiple parts, a single task will be created for the entire file.
            </div>
            <div class="file-parts-grid">
              <label
                v-for="part in fileParts"
                :key="part.part"
                class="file-part-option"
              >
                <input
                  type="checkbox"
                  :value="part.part"
                  v-model="selectedFileParts"
                  @change="onFilePartChange"
                />
                <span class="file-part-label">
                  Part {{ part.part + 1 }} ({{ part.stringCount }} strings)
                </span>
              </label>
            </div>
            <div class="file-parts-actions">
              <button
                type="button"
                class="select-all-btn"
                @click="selectAllParts"
              >
                Select All
              </button>
              <button
                type="button"
                class="clear-all-btn"
                @click="clearAllParts"
              >
                Clear All
              </button>
            </div>
            <div v-if="selectedFileParts.length > 0" class="file-parts-summary" style="margin-top: 0.5rem; padding: 0.5rem; background: #f0f9ff; border-radius: 4px; font-size: 0.875rem; color: #1e40af;">
              <strong>Selected:</strong> {{ selectedFileParts.length }} part(s)
              <span v-if="selectedFileParts.length === 1">
                (Part {{ selectedFileParts[0] + 1 }})
              </span>
              <span v-else>
                (Multiple parts - task will cover entire file)
              </span>
            </div>
          </div>
          <div v-else-if="selectedFileId && fileParts.length === 0" class="file-parts-section">
            <div style="color: #666; font-style: italic; text-align: center; padding: 1rem;">
              No file parts found for this file. The file may not have been processed yet or may not contain translatable content.
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="assignedTo">Assign To</label>
            <select
              id="assignedTo"
              v-model="formData.assignedToId"
              class="form-control"
            >
              <option value="">Unassigned</option>
              <option
                v-for="member in projectMembers"
                :key="member.id"
                :value="member.id"
              >
                {{ member.fullName || member.username }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="group">Group</label>
            <select
              id="group"
              v-model="formData.groupId"
              class="form-control"
            >
              <option value="">No Group</option>
              <option
                v-for="group in projectGroups"
                :key="group.id"
                :value="group.id"
              >
                {{ group.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="dueDate">Due Date & Time</label>
          <div class="datetime-inputs">
            <input
              id="dueDate"
              v-model="formData.dueDate"
              type="date"
              class="form-control"
              :min="minDate"
              style="flex: 1; margin-right: 0.5rem;"
            />
            <input
              id="dueTime"
              v-model="formData.dueTime"
              type="time"
              class="form-control"
              step="300"
              style="flex: 1;"
            />
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="onCancel"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !formData.title"
          >
            <span v-if="loading">Creating...</span>
            <span v-else>Create Task</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-else-if="visible && inline" class="inline-task-form">
    <form @submit.prevent="onSubmit" class="task-form">
      <h2 class="form-title">Create New Task</h2>

      <div class="form-group">
        <label for="title" class="required">Task Title</label>
        <input
          id="title"
          v-model="formData.title"
          type="text"
          class="form-control"
          placeholder="Enter task title"
          required
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="formData.description"
          class="form-control"
          placeholder="Enter task description (optional)"
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="fileSelection">File Selection</label>
        <select
          id="fileSelection"
          v-model="selectedFileId"
          class="form-control"
          @change="onFileChange"
        >
          <option value="">Select a file</option>
          <option
            v-for="file in projectFilesComputed"
            :key="file.fileId"
            :value="file.fileId"
            :disabled="file.status !== 'ready'"
          >
            {{ file.fileName }} {{ file.status !== 'ready' ? `(${file.status})` : '' }}
          </option>
        </select>
        <div v-if="selectedFileId && fileParts.length > 0" class="file-parts-section">
          <label class="file-parts-label">File Parts:</label>
          <div class="file-parts-info" style="margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">
            Select specific parts to create tasks for. If you select multiple parts, a single task will be created for the entire file.
          </div>
          <div class="file-parts-grid">
            <label
              v-for="part in fileParts"
              :key="part.part"
              class="file-part-option"
            >
              <input
                type="checkbox"
                :value="part.part"
                v-model="selectedFileParts"
                @change="onFilePartChange"
              />
              <span class="file-part-label">
                Part {{ part.part + 1 }} ({{ part.stringCount }} strings)
              </span>
            </label>
          </div>
          <div class="file-parts-actions">
            <button
              type="button"
              class="select-all-btn"
              @click="selectAllParts"
            >
              Select All
            </button>
            <button
              type="button"
              class="clear-all-btn"
              @click="clearAllParts"
            >
              Clear All
            </button>
          </div>
          <div v-if="selectedFileParts.length > 0" class="file-parts-summary" style="margin-top: 0.5rem; padding: 0.5rem; background: #f0f9ff; border-radius: 4px; font-size: 0.875rem; color: #1e40af;">
            <strong>Selected:</strong> {{ selectedFileParts.length }} part(s)
            <span v-if="selectedFileParts.length === 1">
              (Part {{ selectedFileParts[0] + 1 }})
            </span>
            <span v-else>
              (Multiple parts - task will cover entire file)
            </span>
          </div>
        </div>
        <div v-else-if="selectedFileId && fileParts.length === 0" class="file-parts-section">
          <div style="color: #666; font-style: italic; text-align: center; padding: 1rem;">
            No file parts found for this file. The file may not have been processed yet or may not contain translatable content.
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="assignedTo">Assign To</label>
          <select
            id="assignedTo"
            v-model="formData.assignedToId"
            class="form-control"
          >
            <option value="">Unassigned</option>
            <option
              v-for="member in projectMembers"
              :key="member.id"
              :value="member.id"
            >
              {{ member.fullName || member.username }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="group">Group</label>
          <select
            id="group"
            v-model="formData.groupId"
            class="form-control"
          >
            <option value="">No Group</option>
            <option
              v-for="group in projectGroups"
              :key="group.id"
              :value="group.id"
            >
              {{ group.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="dueDate">Due Date & Time</label>
        <div class="datetime-inputs">
          <input
            id="dueDate"
            v-model="formData.dueDate"
            type="date"
            class="form-control"
            :min="minDate"
            style="flex: 1; margin-right: 0.5rem;"
          />
          <input
            id="dueTime"
            v-model="formData.dueTime"
            type="time"
            class="form-control"
            step="300"
            style="flex: 1;"
          />
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="inline-form-footer">
        <button
          type="button"
          class="btn btn-secondary"
          @click="onCancel"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="loading || !formData.title"
        >
          <span v-if="loading">Creating...</span>
          <span v-else>Create Task</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { taskService, CreateTaskDto, ProjectFile, FilePart } from '../services/task.service';

interface Props {
  visible: boolean;
  projectId: string;
  projectMembers?: Array<{
    id: string;
    username: string;
    fullName?: string;
  }>;
  projectGroups?: Array<{
    id: string;
    name: string;
  }>;
  projectFiles?: Array<{
    fileId: string;
    fileName: string;
    status: string;
  }>;
  branchId?: string;
  fileId?: string;
  filePart?: number;
}

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  projectMembers: {
    type: Array,
    default: () => []
  },
  projectGroups: {
    type: Array,
    default: () => []
  },
  projectFiles: {
    type: Array,
    default: () => []
  },
  branchId: {
    type: String,
    default: null
  },
  fileId: {
    type: String,
    default: null
  },
  filePart: {
    type: Number,
    default: null
  },
  inline: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits<{
  close: [];
  success: [task: any];
}>();

const loading = ref(false);
const error = ref('');

const formData = ref<CreateTaskDto>({
  title: '',
  description: '',
  projectId: props.projectId,
  assignedToId: '',
  groupId: '',
  dueDate: '',
  dueTime: '',
  branchId: props.branchId,
  fileId: props.fileId,
  filePart: props.filePart
});

// File selection state
const projectFilesComputed = computed(() => props.projectFiles || []);
const selectedFileId = ref('');
const fileParts = ref<FilePart[]>([]);
const selectedFileParts = ref<number[]>([]);

// Reset form when dialog opens/closes
watch(() => props.visible, (newVal: boolean) => {
  if (newVal) {
    console.log('CreateTaskDialog: Dialog opened, checking props.projectFiles:', props.projectFiles);
    console.log('CreateTaskDialog: props.projectFiles length:', props.projectFiles?.length);

    formData.value = {
      title: '',
      description: '',
      projectId: props.projectId,
      assignedToId: '',
      groupId: '',
      dueDate: '',
      dueTime: '',
      branchId: props.branchId,
      fileId: props.fileId,
      filePart: props.filePart
    };
    selectedFileId.value = '';
    fileParts.value = [];
    selectedFileParts.value = [];
    error.value = '';

    // Use projectFiles from props if available, otherwise load them
    if (props.projectFiles && props.projectFiles.length > 0) {
      // projectFiles.value = props.projectFiles as ProjectFile[]; // This line is removed
      console.log('CreateTaskDialog: Using projectFiles from props:', projectFilesComputed.value.length, 'files');
      console.log('CreateTaskDialog: Files from props:', projectFilesComputed.value);
    } else {
      console.log('CreateTaskDialog: No projectFiles from props, loading them...');
      // loadProjectFiles(); // This function is removed
    }
  }
});

// Debug: Log component lifecycle
console.log('CreateTaskDialog component script setup executed');

// Thêm onMounted để kiểm tra component có được mount không
onMounted(() => {
  console.log('CreateTaskDialog: Component mounted');
  console.log('CreateTaskDialog: Props received:', {
    visible: props.visible,
    projectId: props.projectId,
    projectFilesLength: props.projectFiles?.length,
    inline: props.inline
  });
});

// Format datetime for submission
function formatDateTimeForSubmission(dateString: string, timeString: string): string {
  if (!dateString || !timeString) return '';

  // Combine date and time
  const dateTimeString = `${dateString}T${timeString}`;
  const date = new Date(dateTimeString);
  return date.toISOString();
}

// Format datetime for display
function formatDateTimeForDisplay(dateTimeString: string): string {
  if (!dateTimeString) return '';

  const date = new Date(dateTimeString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Compute minimum date (today)
const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

// Compute minimum date and time (now)
const minDateTime = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
});

// Thêm/xoá class modal-open vào body khi modal mở/đóng
watch(() => props.visible, (val: boolean) => {
  if (val) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
});

// Đảm bảo khi component bị unmount thì xoá class
onUnmounted(() => {
  document.body.classList.remove('modal-open');
});

// Load project files (only if not provided via props)
async function loadProjectFiles() {
  console.log('CreateTaskDialog: Loading project files for projectId:', props.projectId);
  try {
    // projectFiles.value = await taskService.getProjectFiles(props.projectId); // This line is removed
    console.log('CreateTaskDialog: Project files loaded successfully:', projectFilesComputed.value.length, 'files');
    console.log('CreateTaskDialog: Files:', projectFilesComputed.value);
  } catch (err) {
    console.error('CreateTaskDialog: Failed to load project files:', err);
    // projectFiles.value = []; // This line is removed
  }
}

// Handle file selection change
async function onFileChange() {
  console.log('File changed:', selectedFileId.value);
  console.log('Branch ID:', props.branchId);

  if (!selectedFileId.value || !props.branchId) {
    console.log('Missing fileId or branchId, clearing parts');
    fileParts.value = [];
    selectedFileParts.value = [];
    return;
  }

  try {
    console.log('Loading file parts for:', {
      projectId: props.projectId,
      branchId: props.branchId,
      fileId: selectedFileId.value
    });

    fileParts.value = await taskService.getFileParts(
      props.projectId,
      props.branchId,
      selectedFileId.value
    );

    console.log('File parts loaded:', fileParts.value);
    selectedFileParts.value = [];
  } catch (err) {
    console.error('Failed to load file parts:', err);
    fileParts.value = [];
  }
}

// Handle file part selection change
function onFilePartChange() {
  // Update formData with selected file
  formData.value.fileId = selectedFileId.value;

  // Nếu chỉ chọn 1 part, set filePart
  if (selectedFileParts.value.length === 1) {
    formData.value.filePart = selectedFileParts.value[0];
  } else {
    // Nếu chọn nhiều parts, không set filePart (sẽ tạo task cho toàn bộ file)
    formData.value.filePart = undefined;
  }

  console.log('Selected file parts:', selectedFileParts.value);
  console.log('Updated formData:', formData.value);
}

// Select all file parts
function selectAllParts() {
  selectedFileParts.value = fileParts.value.map((part: FilePart) => part.part);
  onFilePartChange();
}

// Clear all file parts
function clearAllParts() {
  selectedFileParts.value = [];
  onFilePartChange();
}

async function onSubmit() {
  if (!formData.value.title.trim()) {
    error.value = 'Please enter a task title';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // Clean up empty values
    const dto: CreateTaskDto = {
      title: formData.value.title.trim(),
      projectId: props.projectId,
      description: formData.value.description?.trim() || undefined,
      assignedToId: formData.value.assignedToId || undefined,
      groupId: formData.value.groupId || undefined,
      dueDate: formatDateTimeForSubmission(formData.value.dueDate, formData.value.dueTime),
      branchId: props.branchId || undefined,
      fileId: formData.value.fileId || undefined,
      filePart: formData.value.filePart
    };

    const task = await taskService.createTask(dto);
    emit('success', task);
    emit('close');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to create task';
  } finally {
    loading.value = false;
  }
}

function onCancel() {
  if (!loading.value) {
    emit('close');
  }
}
</script>

<style scoped>
.modal-absolute-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.3);
  z-index: 9999999;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000000;
}
.modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10000001;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
}

.task-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-group label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.error-message {
  background-color: #fee;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #d1d5db;
}

/* File parts styling */
.file-parts-section {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.file-parts-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.file-parts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.file-part-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-part-option:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.file-part-option input[type="checkbox"] {
  margin: 0;
}

.file-part-label {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.file-parts-actions {
  display: flex;
  gap: 0.5rem;
}

.select-all-btn,
.clear-all-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.select-all-btn:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.clear-all-btn:hover {
  background: #fef2f2;
  border-color: #ef4444;
  color: #ef4444;
}

.file-parts-summary {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #1e40af;
}

/* Force English locale for datetime picker */
input[type="datetime-local"] {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Override browser's native datetime picker styling */
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: none;
}

/* Ensure consistent date/time format display */
input[type="datetime-local"]::-webkit-datetime-edit {
  font-family: inherit;
}

/* Datetime inputs layout */
.datetime-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Inline form styles */
.inline-task-form {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.inline-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.form-title {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-container {
    width: 95%;
    margin: 1rem;
  }

  .file-parts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
