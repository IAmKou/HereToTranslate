<template>
  <div v-if="visible && !inline" class="modal-overlay">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>Create Task</h2>
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

        <div class="form-row">
          <div class="form-group">
            <label for="assignedTo">Assigned To</label>
            <select
              id="assignedTo"
              v-model="formData.assignedToId"
              class="form-control"
              @change="validateAssigneeReviewer"
            >
              <option value="">Unassigned</option>
              <option
                v-for="m in members"
                :key="m.id"
                :value="m.id"
              >
                {{ m.fullName || m.username }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="reviewer">Reviewer</label>
            <select
              id="reviewer"
              v-model="formData.reviewerId"
              class="form-control"
              @change="validateAssigneeReviewer"
            >
              <option value="">No reviewer</option>
              <option
                v-for="m in members"
                :key="m.id"
                :value="m.id"
              >
                {{ m.fullName || m.username }}
              </option>
            </select>
            <div v-if="assignReviewerError" class="field-error">
              {{ assignReviewerError }}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="fileSelection" class="required">File</label>
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
          <div v-if="selectedFileId && fileStrings.length > 0" class="range-section">
            <div class="range-row">
              <div class="range-col">
                <label for="startString" class="required">Start string</label>
                <select
                  id="startString"
                  class="form-control"
                  v-model.number="startIndex"
                  @change="onStartChanged"
                >
                  <option
                    v-for="(s, idx) in fileStrings"
                    :key="s.id"
                    :value="idx"
                    :disabled="usedStringIds.has(Number(s.id))"
                  >
                    {{ renderStringOption(s, idx) }}
                  </option>
                </select>
              </div>
              <div class="range-col">
                <label for="endString" class="required">End string</label>
                <select
                  id="endString"
                  class="form-control"
                  v-model.number="endIndex"
                  @change="onEndChanged"
                >
                  <option
                    v-for="(s, idx) in fileStrings"
                    :key="s.id"
                    :value="idx"
                    :disabled="idx < startIndex || usedStringIds.has(Number(s.id))"
                  >
                    {{ renderStringOption(s, idx) }}
                  </option>
                </select>
              </div>
            </div>
            <div class="range-summary" v-if="selectedCount > 0">
              <strong>Total strings:</strong> {{ selectedCount }}
            </div>
            <div v-if="overlapError" class="error-message">
              {{ overlapError }}
            </div>
          </div>
          <div v-else-if="selectedFileId && fileStringsLoading" class="range-section">
            Loading strings...
          </div>
          <div v-else-if="selectedFileId && !fileStringsLoading && fileStrings.length === 0" class="range-section">
            No strings found for this file.
          </div>
        </div>

        <div class="form-group">
          <label for="language" class="required">Language</label>
          <select
            id="language"
            v-model="formData.language"
            class="form-control"
            :class="{ 'error': fieldErrors.languages }"
            @blur="validateLanguages"
          >
            <option value="">Select language</option>
            <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
              {{ lang.name }} ({{ lang.code.toUpperCase() }})
            </option>
          </select>
          <div v-if="fieldErrors.languages" class="field-error">
            {{ fieldErrors.languages }}
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
      <h2 class="form-title">Create Task</h2>

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

      <div class="form-row">
        <div class="form-group">
          <label for="assignedToInline">Assigned To</label>
          <select
            id="assignedToInline"
            v-model="formData.assignedToId"
            class="form-control"
            @change="validateAssigneeReviewer"
          >
            <option value="">Unassigned</option>
            <option v-for="m in members" :key="m.id" :value="m.id">
              {{ m.fullName || m.username }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="reviewerInline">Reviewer</label>
          <select
            id="reviewerInline"
            v-model="formData.reviewerId"
            class="form-control"
            @change="validateAssigneeReviewer"
          >
            <option value="">No reviewer</option>
            <option v-for="m in members" :key="m.id" :value="m.id">
              {{ m.fullName || m.username }}
            </option>
          </select>
          <div v-if="assignReviewerError" class="field-error">
            {{ assignReviewerError }}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="fileSelection" class="required">File</label>
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
        <div v-if="selectedFileId && fileStrings.length > 0" class="range-section">
          <div class="range-row">
            <div class="range-col">
              <label for="startString" class="required">Start string</label>
              <select
                id="startString"
                class="form-control"
                v-model.number="startIndex"
                @change="onStartChanged"
              >
                <option
                  v-for="(s, idx) in fileStrings"
                  :key="s.id"
                  :value="idx"
                  :disabled="usedStringIds.has(Number(s.id))"
                >
                  {{ renderStringOption(s, idx) }}
                </option>
              </select>
            </div>
            <div class="range-col">
              <label for="endString" class="required">End string</label>
              <select
                id="endString"
                class="form-control"
                v-model.number="endIndex"
                @change="onEndChanged"
              >
                <option
                  v-for="(s, idx) in fileStrings"
                  :key="s.id"
                  :value="idx"
                  :disabled="idx < startIndex || usedStringIds.has(Number(s.id))"
                >
                  {{ renderStringOption(s, idx) }}
                </option>
              </select>
            </div>
          </div>
          <div class="range-summary" v-if="selectedCount > 0">
            <strong>Total strings:</strong> {{ selectedCount }}
          </div>
          <div v-if="overlapError" class="error-message">
            {{ overlapError }}
          </div>
        </div>
        <div v-else-if="selectedFileId && fileStringsLoading" class="range-section">
          Loading strings...
        </div>
        <div v-else-if="selectedFileId && !fileStringsLoading && fileStrings.length === 0" class="range-section">
          No strings found for this file.
        </div>
      </div>

      <div class="form-group">
        <label for="language" class="required">Language</label>
        <select
          id="language"
          v-model="formData.language"
          class="form-control"
          :class="{ 'error': fieldErrors.languages }"
          @blur="validateLanguages"
        >
          <option value="">Select language</option>
          <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
            {{ lang.name }} ({{ lang.code.toUpperCase() }})
          </option>
        </select>
        <div v-if="fieldErrors.languages" class="field-error">
          {{ fieldErrors.languages }}
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
import { ref, computed, watch, onUnmounted } from 'vue';
import { taskService, CreateTaskDto, FileString, ProjectFile } from '../services/task.service';
import { SUPPORTED_LANGUAGES } from '../utils/languages';

const props = defineProps({
  visible: { type: Boolean, required: true },
  projectId: { type: String, required: true },
  projectMembers: { type: Array, default: () => [] },
  projectGroups: { type: Array, default: () => [] },
  projectFiles: { type: Array, default: () => [] },
  projectTargetLanguages: { type: Array, default: () => [] },
  inline: { type: Boolean, default: false }
});

const emit = defineEmits<{ close: []; success: [task: any] }>();

const loading = ref(false);
const error = ref('');
const dueDateTimeWarning = ref('');
const assignReviewerError = ref('');
const overlapError = ref('');
const usedStringIds = ref<Set<number>>(new Set());

const fieldErrors = ref({
  title: '',
  description: '',
  fileSelection: '',
  languages: '',
  dueDateTime: ''
});

const formData = ref<CreateTaskDto>({
  title: '',
  description: '',
  projectId: props.projectId,
  dueDateTime: '',
  fileId: '',
  selectedStrings: [],
  language: '',
  totalStrings: 0
});

const projectFilesComputed = computed<ProjectFile[]>(() => (props.projectFiles || []) as any);
const members = computed<Array<{ id: string; username: string; fullName?: string }>>(
  () => (props.projectMembers as any as Array<{ id: string; username: string; fullName?: string }>) || []
);
const selectedFileId = ref<string>('');
const fileStrings = ref<FileString[]>([]);
const fileStringsLoading = ref<boolean>(false);
const startIndex = ref<number>(0);
const endIndex = ref<number>(0);

const selectedCount = computed(() => {
  if (fileStrings.value.length === 0) return 0;
  if (startIndex.value > endIndex.value) return 0;
  return endIndex.value - startIndex.value + 1;
});

const availableLanguages = computed(() => {
  if (!props.projectTargetLanguages || (props.projectTargetLanguages as any).length === 0) {
    return SUPPORTED_LANGUAGES;
  }
  return SUPPORTED_LANGUAGES.filter(lang => (props.projectTargetLanguages as any).includes(lang.code));
});

const descriptionLength = computed(() => formData.value.description?.length || 0);

const minDateTime = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
});

watch(() => props.visible, (val: boolean) => {
  if (val) {
    resetForm();
  } else {
    document.body.classList.remove('modal-open');
  }
});

watch(() => props.visible, (val: boolean) => {
  if (val) document.body.classList.add('modal-open');
});

onUnmounted(() => {
  document.body.classList.remove('modal-open');
});

function resetForm() {
  loading.value = false;
  error.value = '';
  fieldErrors.value = { title: '', description: '', fileSelection: '', languages: '', dueDateTime: '' };
  formData.value = { title: '', description: '', projectId: props.projectId, dueDateTime: '', fileId: '', selectedStrings: [], language: '', totalStrings: 0 };
  selectedFileId.value = '';
  fileStrings.value = [];
  fileStringsLoading.value = false;
  startIndex.value = 0;
  endIndex.value = 0;
  usedStringIds.value = new Set();
  overlapError.value = '';
}

function validateTitle() {
  if (!formData.value.title?.trim()) {
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

function validateDescription() {
  if (formData.value.description && formData.value.description.trim().length > 500) {
    fieldErrors.value.description = 'Description must be less than 500 characters';
    return false;
  }
  fieldErrors.value.description = '';
  return true;
}

function validateFileSelection() {
  if (!selectedFileId.value) {
    fieldErrors.value.fileSelection = 'Please select a file';
    return false;
  }
  fieldErrors.value.fileSelection = '';
  return true;
}

function validateLanguages() {
  if (!formData.value.language) {
    fieldErrors.value.languages = 'Please select a language';
    return false;
  }
  fieldErrors.value.languages = '';
  return true;
}

function validateDueDateTime() {
  if (!formData.value.dueDateTime) {
    fieldErrors.value.dueDateTime = '';
    dueDateTimeWarning.value = '';
    return;
  }
  const selected = new Date(formData.value.dueDateTime);
  const now = new Date();
  const diffMs = selected.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffMs < 0) {
    fieldErrors.value.dueDateTime = 'Deadline cannot be in the past';
    dueDateTimeWarning.value = ' Deadline cannot be in the past';
    return;
  }
  fieldErrors.value.dueDateTime = '';
  if (diffHours < 1) {
    dueDateTimeWarning.value = ' Deadline is very close (less than 1 hour)';
  } else if (diffHours < 24) {
    dueDateTimeWarning.value = ' Deadline is close (less than 24 hours)';
  } else {
    dueDateTimeWarning.value = '';
  }
}

// Format datetime for API (preserve local time without timezone conversion)
function formatDateTimeForAPI(dateTimeString: string): string {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  // no timezone suffix; backend will parse as local-like
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function renderStringOption(s: FileString, idx: number): string {
  const text = (s.originalText || '').replace(/\s+/g, ' ').trim();
  const preview = text.length > 40 ? text.slice(0, 37) + '…' : text;
  return `#${idx + 1} • ${preview}`;
}

async function onFileChange() {
  formData.value.fileId = selectedFileId.value || '';
  formData.value.selectedStrings = [];
  formData.value.totalStrings = 0;
  fileStrings.value = [];
  startIndex.value = 0;
  endIndex.value = 0;
  usedStringIds.value = new Set();
  overlapError.value = '';

  if (!selectedFileId.value) return;

  try {
    fileStringsLoading.value = true;
    const strings = await taskService.getFileStrings(props.projectId, selectedFileId.value);
    // sort by orderIndex ascending, fallback to id
    fileStrings.value = (strings || []).slice().sort((a: any, b: any) => {
      const ao = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
      const bo = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
      if (ao !== bo) return ao - bo;
      return Number(a.id) - Number(b.id);
    });
    startIndex.value = findNextAvailableIndex(0);
    endIndex.value = findPrevAvailableIndex(fileStrings.value.length - 1);
    onRangeChange();
    // Load existing tasks to collect already-used string IDs for this file
    const tasks = await taskService.getProjectTasks(props.projectId);
    const related = (tasks || []).filter((t: any) => t.fileId === selectedFileId.value && Array.isArray((t as any).selectedStrings));
    const set = new Set<number>();
    for (const t of related) {
      for (const sid of (t as any).selectedStrings as number[]) {
        set.add(Number(sid));
      }
    }
    usedStringIds.value = set;
    // re-check overlap with the newly loaded set
    checkOverlap();
  } catch (e) {
    console.error('Failed to load strings', e);
    fileStrings.value = [];
  } finally {
    fileStringsLoading.value = false;
  }
}

function selectFirstFile() {
  const firstReady = (projectFilesComputed.value as any[]).find(f => (f as any).status === 'ready');
  if (firstReady) {
    selectedFileId.value = (firstReady as any).fileId;
    onFileChange();
  }
}

function onRangeChange() {
  if (fileStrings.value.length === 0) {
    formData.value.selectedStrings = [];
    formData.value.totalStrings = 0;
    overlapError.value = '';
    return;
  }
  if (startIndex.value > endIndex.value) {
    formData.value.selectedStrings = [];
    formData.value.totalStrings = 0;
    overlapError.value = '';
    return;
  }
  const slice = fileStrings.value.slice(startIndex.value, endIndex.value + 1);
  formData.value.selectedStrings = slice.map(s => Number(s.id));
  formData.value.totalStrings = slice.length;
  checkOverlap();
}

function checkOverlap() {
  if (!formData.value.selectedStrings || formData.value.selectedStrings.length === 0) {
    overlapError.value = '';
    return true;
  }
  const conflicts = formData.value.selectedStrings.filter(id => usedStringIds.value.has(Number(id)));
  if (conflicts.length > 0) {
    overlapError.value = `Selected range contains ${conflicts.length} string(s) already assigned to other tasks.`;
    return false;
  }
  overlapError.value = '';
  return true;
}

function validateAssigneeReviewer() {
  if (formData.value.assignedToId && formData.value.reviewerId && formData.value.assignedToId === formData.value.reviewerId) {
    assignReviewerError.value = 'Reviewer and assignee cannot be the same person';
    return false;
  }
  assignReviewerError.value = '';
  return true;
}

function validateForm() {
  const t = validateTitle();
  const d = validateDescription();
  const f = validateFileSelection();
  const l = validateLanguages();
  const ar = validateAssigneeReviewer();
  const hasRange = formData.value.selectedStrings && formData.value.selectedStrings.length > 0;
  if (!hasRange) {
    // set a general error near file selection
    fieldErrors.value.fileSelection = fieldErrors.value.fileSelection || 'Please select a valid string range';
  }
  const noOverlap = checkOverlap();
  return t && d && f && l && ar && hasRange && noOverlap;
}

async function onSubmit() {
  if (!validateForm()) return;
  loading.value = true;
  error.value = '';
  try {
    const payload: CreateTaskDto = {
      title: formData.value.title.trim(),
      description: formData.value.description?.trim() || undefined,
      projectId: props.projectId,
      fileId: formData.value.fileId!,
      selectedStrings: formData.value.selectedStrings,
      language: formData.value.language!,
      totalStrings: formData.value.totalStrings,
      // send dueDate (backend expects dueDate, not dueDateTime)
      dueDate: formData.value.dueDateTime ? formatDateTimeForAPI(formData.value.dueDateTime) : undefined
    } as any;

    if (formData.value.assignedToId) {
      (payload as any).assignedToId = formData.value.assignedToId;
    }
    if (formData.value.reviewerId) {
      (payload as any).reviewerId = formData.value.reviewerId;
    }

    const created = await taskService.createTask(payload);
    emit('success', created);
    emit('close');
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to create task';
  } finally {
    loading.value = false;
  }
}

function onCancel() {
  if (!loading.value) emit('close');
}

function findNextAvailableIndex(from: number): number {
  for (let i = Math.max(0, from); i < fileStrings.value.length; i++) {
    const s = fileStrings.value[i];
    if (!usedStringIds.value.has(Number(s.id))) return i;
  }
  return from;
}

function findPrevAvailableIndex(from: number): number {
  for (let i = Math.min(from, fileStrings.value.length - 1); i >= 0; i--) {
    const s = fileStrings.value[i];
    if (!usedStringIds.value.has(Number(s.id))) return i;
  }
  return from;
}

function onStartChanged() {
  // if chosen start points to a used item, snap to next available
  if (fileStrings.value[startIndex.value] && usedStringIds.value.has(Number(fileStrings.value[startIndex.value].id))) {
    startIndex.value = findNextAvailableIndex(startIndex.value);
  }
  // ensure endIndex >= startIndex and points to available
  if (endIndex.value < startIndex.value) {
    endIndex.value = findPrevAvailableIndex(startIndex.value);
  }
  if (fileStrings.value[endIndex.value] && usedStringIds.value.has(Number(fileStrings.value[endIndex.value].id))) {
    endIndex.value = findPrevAvailableIndex(endIndex.value);
    if (endIndex.value < startIndex.value) {
      endIndex.value = startIndex.value;
    }
  }
  onRangeChange();
}

function onEndChanged() {
  // if chosen end points to a used item, snap to prev available
  if (fileStrings.value[endIndex.value] && usedStringIds.value.has(Number(fileStrings.value[endIndex.value].id))) {
    endIndex.value = findPrevAvailableIndex(endIndex.value);
  }
  if (endIndex.value < startIndex.value) {
    endIndex.value = startIndex.value;
  }
  onRangeChange();
}
</script>

<style scoped>
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
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
.close-btn:hover { background-color: #f3f4f6; }

.task-form { padding: 1.5rem; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; font-size: 0.875rem; }
.form-group label.required::after { content: ' *'; color: #ef4444; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; transition: border-color 0.2s, box-shadow 0.2s; }
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
textarea.form-control { resize: vertical; min-height: 100px; }

.error-message { background-color: #fee; color: #dc2626; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.875rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.5rem; border-top: 1px solid #e5e7eb; }
.btn { padding: 0.625rem 1.25rem; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background-color: #3b82f6; color: white; }
.btn-primary:hover:not(:disabled) { background-color: #2563eb; }
.btn-secondary { background-color: #e5e7eb; color: #374151; }
.btn-secondary:hover:not(:disabled) { background-color: #d1d5db; }

/* Range section */
.range-section { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb; }
.range-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.range-col { display: flex; flex-direction: column; gap: 0.5rem; }
.range-summary { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: #f0f9ff; color: #1e40af; border-radius: 4px; font-size: 0.9rem; }
.summary-detail { margin-left: 8px; color: #155e75; font-size: 0.85rem; }

/* Helpers */
.field-error { margin-top: 6px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 13px; display: flex; align-items: center; gap: 6px; }
.form-control.error { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 102, 0.1); }

/* Inline form */
.inline-task-form { background: #fff; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); margin-bottom: 1rem; }
.inline-form-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
.form-title { margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600; color: #1f2937; text-align: center; }

/* Textarea counter */
.textarea-container { position: relative; }
.char-counter { position: absolute; bottom: 8px; right: 12px; font-size: 11px; color: #6b7280; background: rgba(255, 255, 255, 0.9); padding: 2px 6px; border-radius: 4px; pointer-events: none; }
.char-counter.warning { color: #f59e0b; }
.char-counter.error { color: #dc2626; }

/* Date time */
.datetime-picker-container { position: relative; display: flex; align-items: center; }
.datetime-picker { background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px 16px; font-size: 14px; width: 100%; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.datetime-picker:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.datetime-warning { margin-top: 8px; padding: 8px 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; color: #92400e; font-size: 13px; display: flex; align-items: center; gap: 6px; }
</style>
