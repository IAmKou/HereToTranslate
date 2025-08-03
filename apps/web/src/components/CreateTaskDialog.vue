<template>
  <div v-if="visible && !inline" class="modal-overlay">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>{{ props.editTask ? 'Edit Task' : 'Create New Task' }}</h2>
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
            :class="{ 'error': fieldErrors.title }"
            placeholder="Enter task title"
            @blur="validateTitle"
            @input="validateTitle"
            required
          />
          <div v-if="fieldErrors.title" class="field-error">
            {{ fieldErrors.title }}
          </div>
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <div class="textarea-container">
            <textarea
              id="description"
              v-model="formData.description"
              class="form-control"
              :class="{ 'error': fieldErrors.description }"
              placeholder="Enter task description (optional)"
              rows="3"
              @blur="validateDescription"
              @input="validateDescription"
            ></textarea>
            <div class="char-counter" :class="{ 'warning': descriptionLength > 400, 'error': descriptionLength > 500 }">
              {{ descriptionLength }}/500
            </div>
          </div>
          <div v-if="fieldErrors.description" class="field-error">
            {{ fieldErrors.description }}
          </div>
        </div>

        <div class="form-group">
          <label for="fileSelection">File Selection</label>
          <div class="file-selection-container">
            <select
              id="fileSelection"
              v-model="selectedFileId"
              class="form-control"
              :class="{ 'error': fieldErrors.fileSelection }"
              @change="onFileChange"
              @blur="validateFileSelection"
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
            <div v-if="projectFilesComputed.length > 0" class="quick-file-actions">
              <button
                type="button"
                class="quick-action-btn"
                @click="selectFirstFile"
                :disabled="projectFilesComputed.length === 0"
                title="Select first available file"
              >
                <i class="pi pi-chevron-right"></i>
              </button>
            </div>
          </div>
          <div v-if="fieldErrors.fileSelection" class="field-error">
            {{ fieldErrors.fileSelection }}
          </div>
          <div v-if="projectFilesComputed.length === 0" style="color: #666; font-style: italic; margin-top: 0.5rem;">
            No files found. Please check if files have been uploaded to this project.
          </div>
          <div v-if="selectedFileId && fileParts.length > 0" class="file-parts-section">
            <label class="file-parts-label">File Pages:</label>
            <div class="file-parts-info" style="margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">
              Select specific pages to create tasks for. If you select multiple pages, a single task will be created for the entire file.
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
                  Page {{ part.pageNumber || (part.part + 1) }} ({{ part.stringCount }} strings)
                </span>
              </label>
            </div>
            <div class="file-parts-actions">
              <button
                type="button"
                class="select-all-btn"
                @click="selectAllParts"
              >
                Select All Pages
              </button>
              <button
                type="button"
                class="clear-all-btn"
                @click="clearAllParts"
              >
                Clear All Pages
              </button>
            </div>
            <div v-if="selectedFileParts.length > 0" class="file-parts-summary" style="margin-top: 0.5rem; padding: 0.5rem; background: #f0f9ff; border-radius: 4px; font-size: 0.875rem; color: #1e40af;">
              <strong>Selected:</strong> {{ selectedFileParts.length }} page(s)
              <span v-if="selectedFileParts.length === 1">
                (Page {{ getSelectedPageNumber(selectedFileParts[0]) }})
              </span>
              <span v-else>
                (Multiple pages - task will cover entire file)
              </span>
            </div>
          </div>
          <div v-else-if="selectedFileId && fileParts.length === 0" class="file-parts-section">
            <div style="color: #666; font-style: italic; text-align: center; padding: 1rem;">
              No file pages found for this file. The file may not have been processed yet or may not contain translatable content.
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="language">{{ props.editTask ? 'Language' : 'Target Languages' }}</label>
          <div class="languages-grid" :class="{ 'error': fieldErrors.languages }">
            <label
              v-for="language in availableLanguages"
              :key="language.code"
              class="language-option"
            >
              <input
                type="checkbox"
                :value="language.code"
                v-model="selectedLanguages"
                class="language-checkbox"
                @change="validateLanguages"
                :disabled="props.editTask && selectedLanguages.length === 1 && selectedLanguages[0] !== language.code"
              />
              <div class="language-info">
                <span class="language-flag">{{ language.code.toUpperCase() }}</span>
                <div class="language-text">
                  <span class="language-name">{{ language.name }}</span>
                  <span class="language-native">{{ language.nativeName }}</span>
                </div>
              </div>
            </label>
          </div>
          <div v-if="fieldErrors.languages" class="field-error">
            {{ fieldErrors.languages }}
          </div>
          <div v-if="selectedLanguages.length > 0" class="selected-languages-summary">
            <strong>Selected:</strong> {{ selectedLanguages.length }} language(s)
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
          <label for="dueDateTime">Due Date & Time</label>
          <div class="datetime-picker-container">
            <input
              id="dueDateTime"
              v-model="formData.dueDateTime"
              type="datetime-local"
              class="form-control datetime-picker"
              :class="{ 'error': fieldErrors.dueDateTime }"
              :min="minDateTime"
              @change="validateDueDateTime"
            />

          </div>
          <div v-if="fieldErrors.dueDateTime" class="field-error">
            {{ fieldErrors.dueDateTime }}
          </div>
          <div v-if="dueDateTimeWarning && !fieldErrors.dueDateTime" class="datetime-warning">
            <i class="pi pi-exclamation-triangle"></i>
            {{ dueDateTimeWarning }}
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
          :class="{ 'error': fieldErrors.title }"
          placeholder="Enter task title"
          @blur="validateTitle"
          @input="validateTitle"
          required
        />
        <div v-if="fieldErrors.title" class="field-error">
          {{ fieldErrors.title }}
        </div>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <div class="textarea-container">
          <textarea
            id="description"
            v-model="formData.description"
            class="form-control"
            :class="{ 'error': fieldErrors.description }"
            placeholder="Enter task description (optional)"
            rows="3"
            @blur="validateDescription"
            @input="validateDescription"
          ></textarea>
          <div class="char-counter" :class="{ 'warning': descriptionLength > 400, 'error': descriptionLength > 500 }">
            {{ descriptionLength }}/500
          </div>
        </div>
        <div v-if="fieldErrors.description" class="field-error">
          {{ fieldErrors.description }}
        </div>
      </div>

      <div class="form-group">
        <label for="fileSelection">File Selection</label>
        <select
          id="fileSelection"
          v-model="selectedFileId"
          class="form-control"
          :class="{ 'error': fieldErrors.fileSelection }"
          @change="onFileChange"
          @blur="validateFileSelection"
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
        <div v-if="fieldErrors.fileSelection" class="field-error">
          {{ fieldErrors.fileSelection }}
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

      <div class="form-group">
        <label for="language">Target Languages</label>
        <div class="languages-header">
          <div class="languages-grid" :class="{ 'error': fieldErrors.languages }">
            <label
              v-for="language in availableLanguages"
              :key="language.code"
              class="language-option"
            >
              <input
                type="checkbox"
                :value="language.code"
                v-model="selectedLanguages"
                class="language-checkbox"
                @change="validateLanguages"
              />
              <div class="language-info">
                <span class="language-flag">{{ language.code.toUpperCase() }}</span>
                <div class="language-text">
                  <span class="language-name">{{ language.name }}</span>
                  <span class="language-native">{{ language.nativeName }}</span>
                </div>
              </div>
            </label>
          </div>
          <div class="language-quick-actions">
            <button
              type="button"
              class="quick-action-btn"
              @click="selectAllLanguages"
              title="Select all languages"
            >
              <i class="pi pi-check-square"></i>
            </button>
            <button
              type="button"
              class="quick-action-btn"
              @click="clearAllLanguages"
              title="Clear all selections"
            >
              <i class="pi pi-square"></i>
            </button>
          </div>
        </div>
        <div v-if="fieldErrors.languages" class="field-error">
          {{ fieldErrors.languages }}
        </div>
        <div v-if="selectedLanguages.length > 0" class="selected-languages-summary">
          <strong>Selected:</strong> {{ selectedLanguages.length }} language(s)
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
        <label for="dueDateTime">Due Date & Time</label>
        <div class="datetime-picker-container">
          <input
            id="dueDateTime"
            v-model="formData.dueDateTime"
            type="datetime-local"
            class="form-control datetime-picker"
            :class="{ 'error': fieldErrors.dueDateTime }"
            :min="minDateTime"
            @change="validateDueDateTime"
          />

        </div>
        <div v-if="fieldErrors.dueDateTime" class="field-error">
          {{ fieldErrors.dueDateTime }}
        </div>
        <div v-if="dueDateTimeWarning && !fieldErrors.dueDateTime" class="datetime-warning">
          <i class="pi pi-exclamation-triangle"></i>
          {{ dueDateTimeWarning }}
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
import { SUPPORTED_LANGUAGES, Language } from '../utils/languages';

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
  projectTargetLanguages?: string[];
  branchId?: string;
  fileId?: string;
  filePart?: number;
  editTask?: any;
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
  projectTargetLanguages: {
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
  },
  editTask: {
    type: Object,
    default: null
  }
});

const emit = defineEmits<{
  close: [];
  success: [task: any];
}>();

const loading = ref(false);
const error = ref('');

// Field validation errors
const fieldErrors = ref({
  title: '',
  description: '',
  fileSelection: '',
  languages: '',
  dueDateTime: ''
});

// Track if form has been submitted to show all errors
const hasSubmitted = ref(false);

const formData = ref<CreateTaskDto>({
  title: '',
  description: '',
  projectId: props.projectId,
  assignedToId: '',
  groupId: '',
  dueDate: '',
  dueTime: '',
  dueDateTime: '',
  branchId: props.branchId,
  fileId: props.fileId,
  filePart: props.filePart,
  language: ''
});

// Khởi tạo form với dữ liệu task cũ nếu đang edit
const initializeFormWithEditData = () => {
  if (props.editTask) {
    console.log('Initializing form with edit data:', props.editTask);
    formData.value = {
      title: props.editTask.title || '',
      description: props.editTask.description || '',
      projectId: props.projectId,
      assignedToId: props.editTask.assignedToId || '',
      groupId: props.editTask.groupId || '',
      dueDate: props.editTask.dueDate ? new Date(props.editTask.dueDate).toISOString().split('T')[0] : '',
      dueTime: props.editTask.dueDate ? new Date(props.editTask.dueDate).toTimeString().slice(0, 5) : '',
      dueDateTime: props.editTask.dueDate || '',
      branchId: props.branchId,
      fileId: props.editTask.fileId || props.fileId,
      filePart: props.editTask.filePart !== undefined ? props.editTask.filePart : props.filePart,
      language: props.editTask.language || ''
    };

    // Set selected languages
    if (props.editTask.language) {
      selectedLanguages.value = [props.editTask.language];
      formData.value.language = props.editTask.language;
    }

    // When editing, only allow one language selection
    if (props.editTask) {
      // Disable multiple language selection for edit mode
      selectedLanguages.value = selectedLanguages.value.slice(0, 1);
    }

    // Set selected file
    if (props.editTask.fileId) {
      selectedFileId.value = props.editTask.fileId;
      onFileChange();
    }
  }
};

// Due date time warning state
const dueDateTimeWarning = ref('');

// Languages selection state
const selectedLanguages = ref<string[]>([]);

// File selection state
const projectFilesComputed = computed(() => props.projectFiles || []);
const selectedFileId = ref('');
const fileParts = ref<FilePart[]>([]);
const selectedFileParts = ref<number[]>([]);

// Language options computed from project target languages
const availableLanguages = computed(() => {
  if (!props.projectTargetLanguages || props.projectTargetLanguages.length === 0) {
    return SUPPORTED_LANGUAGES; // Fallback to all languages if no target languages
  }

  return SUPPORTED_LANGUAGES.filter(lang =>
    props.projectTargetLanguages.includes(lang.code)
  );
});

// Character count for description
const descriptionLength = computed(() => {
  return formData.value.description?.length || 0;
});

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
      dueDateTime: '',
      branchId: props.branchId,
      fileId: props.fileId,
      filePart: props.filePart,
      language: ''
    };

    // Initialize form with edit data if editing
    initializeFormWithEditData();
    selectedFileId.value = '';
    selectedLanguages.value = [];
    fileParts.value = [];
    selectedFileParts.value = [];
    error.value = '';
    dueDateTimeWarning.value = '';

    // Clear field errors
    fieldErrors.value = {
      title: '',
      description: '',
      fileSelection: '',
      languages: '',
      dueDateTime: ''
    };
    hasSubmitted.value = false;

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

// Format datetime for API (preserve local time without timezone conversion)
function formatDateTimeForAPI(dateTimeString: string): string {
  if (!dateTimeString) return '';

  // Create date from the datetime-local input value
  const date = new Date(dateTimeString);

  // Get local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Create ISO string in local timezone
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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

// Handle file page selection change
function onFilePartChange() {
  // Update formData with selected file
  formData.value.fileId = selectedFileId.value;

  // Nếu chỉ chọn 1 page, set filePart
  if (selectedFileParts.value.length === 1) {
    formData.value.filePart = selectedFileParts.value[0];
  } else {
    // Nếu chọn nhiều pages, không set filePart (sẽ tạo task cho toàn bộ file)
    formData.value.filePart = undefined;
  }

  console.log('Selected file pages:', selectedFileParts.value);
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

// Get page number for selected part
function getSelectedPageNumber(partIndex: number): number {
  const part = fileParts.value.find(p => p.part === partIndex);
  return part?.pageNumber || (partIndex + 1);
}

// Select first available file
function selectFirstFile() {
  const firstReadyFile = projectFilesComputed.value.find((file: any) => file.status === 'ready');
  if (firstReadyFile) {
    selectedFileId.value = firstReadyFile.fileId;
    onFileChange();
  }
}

// Select all languages
function selectAllLanguages() {
  selectedLanguages.value = availableLanguages.value.map(lang => lang.code);
  validateLanguages();
}

// Clear all languages
function clearAllLanguages() {
  selectedLanguages.value = [];
  validateLanguages();
}

// Validate due date time and show warnings
function validateDueDateTime() {
  if (!formData.value.dueDateTime) {
    dueDateTimeWarning.value = '';
    fieldErrors.value.dueDateTime = '';
    return;
  }

  const selectedDateTime = new Date(formData.value.dueDateTime);
  const now = new Date();
  const timeDiff = selectedDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // Clear previous warning and error
  dueDateTimeWarning.value = '';
  fieldErrors.value.dueDateTime = '';

  // Check if date is in the past
  if (timeDiff < 0) {
    dueDateTimeWarning.value = '⚠️ Deadline cannot be in the past';
    fieldErrors.value.dueDateTime = 'Deadline cannot be in the past';
    return;
  }

  // Check if deadline is too close (less than 1 hour)
  if (hoursDiff < 1) {
    dueDateTimeWarning.value = '⚠️ Deadline is very close (less than 1 hour)';
    return;
  }

  // Check if deadline is too close (less than 24 hours)
  if (hoursDiff < 24) {
    dueDateTimeWarning.value = '⚠️ Deadline is close (less than 24 hours)';
    return;
  }
}

// Validate title field
function validateTitle() {
  if (!formData.value.title.trim()) {
    fieldErrors.value.title = 'Task Title is required';
    return false;
  }
  if (formData.value.title.trim().length < 3) {
    fieldErrors.value.title = 'Task Title must be at least 3 characters';
    return false;
  }
  fieldErrors.value.title = '';
  return true;
}

// Validate file selection
function validateFileSelection() {
  if (!selectedFileId.value) {
    fieldErrors.value.fileSelection = 'Please select a file';
    return false;
  }
  fieldErrors.value.fileSelection = '';
  return true;
}

// Validate languages selection
function validateLanguages() {
  if (selectedLanguages.value.length === 0) {
    fieldErrors.value.languages = props.editTask ? 'Please select a language' : 'Please select at least one target language';
    return false;
  }

  // When editing, only allow one language
  if (props.editTask && selectedLanguages.value.length > 1) {
    fieldErrors.value.languages = 'Please select only one language when editing a task';
    return false;
  }

  fieldErrors.value.languages = '';
  return true;
}

// Validate description (optional field)
function validateDescription() {
  if (formData.value.description && formData.value.description.trim().length > 500) {
    fieldErrors.value.description = 'Description must be less than 500 characters';
    return false;
  }
  fieldErrors.value.description = '';
  return true;
}

// Validate all fields
function validateForm() {
  hasSubmitted.value = true;

  const isTitleValid = validateTitle();
  const isDescriptionValid = validateDescription();
  const isFileValid = validateFileSelection();
  const isLanguagesValid = validateLanguages();

  return isTitleValid && isDescriptionValid && isFileValid && isLanguagesValid;
}

async function onSubmit() {
  // Validate all fields
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    if (props.editTask) {
      // Update existing task
      const updateDto = {
        title: formData.value.title.trim(),
        description: formData.value.description?.trim() || undefined,
        assignedToId: formData.value.assignedToId || undefined,
        groupId: formData.value.groupId || undefined,
        dueDate: formData.value.dueDateTime ? formatDateTimeForAPI(formData.value.dueDateTime) : undefined,
        fileId: formData.value.fileId || undefined,
        filePart: formData.value.filePart,
        language: formData.value.language
      };

      const updatedTask = await taskService.updateTask(props.editTask.id, updateDto);
      emit('success', updatedTask);
      emit('close');
    } else {
      // Create new tasks
      const createdTasks = [];

      // Create one task per selected language (Crowdin-style)
      for (const language of selectedLanguages.value) {
        const dto: CreateTaskDto = {
          title: formData.value.title.trim(),
          projectId: props.projectId,
          description: formData.value.description?.trim() || undefined,
          assignedToId: formData.value.assignedToId || undefined,
          groupId: formData.value.groupId || undefined,
          dueDate: formData.value.dueDateTime ? formatDateTimeForAPI(formData.value.dueDateTime) : undefined,
          branchId: props.branchId || undefined,
          fileId: formData.value.fileId || undefined,
          filePart: formData.value.filePart,
          language: language
        };

        const task = await taskService.createTask(dto);
        createdTasks.push(task);
      }

      // Emit all created tasks
      createdTasks.forEach(task => emit('success', task));
      emit('close');
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || (props.editTask ? 'Failed to update task' : 'Failed to create task(s)');
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

/* Languages Grid Styles */
.languages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1px;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #e5e7eb;
}

.language-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.language-option:hover {
  background: #f8fafc;
}

.language-option:has(.language-checkbox:checked) {
  background: #f0f9ff;
  position: relative;
}

.language-option:has(.language-checkbox:checked)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #3b82f6;
}

.language-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
  cursor: pointer;
  border-radius: 2px;
  margin: 0;
}

.language-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.language-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 24px;
  background: #6b7280;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 3px;
  letter-spacing: 0.5px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.language-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.language-name {
  font-weight: 500;
  color: #111827;
  font-size: 15px;
  line-height: 1.2;
}

.language-native {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.2;
}

.selected-languages-summary {
  margin-top: 8px;
  padding: 6px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  color: #0c4a6e;
  font-size: 13px;
  font-weight: 500;
}

/* DateTime Picker Styles */
.datetime-picker-container {
  position: relative;
  display: flex;
  align-items: center;
}

.datetime-picker {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 14px;
  width: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.datetime-picker:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}



.datetime-warning {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #92400e;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.datetime-warning i {
  color: #f59e0b;
  font-size: 14px;
}

/* Field Error Styles */
.field-error {
  margin-top: 6px;
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-error::before {
  content: "⚠️";
  font-size: 14px;
}

.form-control.error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 102, 0.1);
}

.languages-grid.error {
  border: 1px solid #dc2626;
  border-radius: 6px;
  padding: 8px;
  background: #fef2f2;
}

/* Textarea Container and Character Counter */
.textarea-container {
  position: relative;
}

.char-counter {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 11px;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}

.char-counter.warning {
  color: #f59e0b;
}

.char-counter.error {
  color: #dc2626;
}

/* File Selection Container */
.file-selection-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-selection-container select {
  flex: 1;
}

.quick-file-actions {
  display: flex;
  gap: 4px;
}

/* Languages Header */
.languages-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.languages-grid {
  flex: 1;
}

.language-quick-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

/* Quick Action Buttons */
.quick-action-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #6b7280;
}

.quick-action-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
  color: #374151;
}

.quick-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-action-btn i {
  font-size: 14px;
}

@media (max-width: 768px) {
  .languages-grid {
    grid-template-columns: 1fr;
    max-height: 240px;
  }

  .language-option {
    padding: 14px 16px;
    gap: 12px;
  }

  .language-info {
    gap: 12px;
  }

  .language-flag {
    width: 32px;
    height: 22px;
    font-size: 9px;
  }

  .language-name {
    font-size: 14px;
  }

  .language-native {
    font-size: 12px;
  }
}
</style>
