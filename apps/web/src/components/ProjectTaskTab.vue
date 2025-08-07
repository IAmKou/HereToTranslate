<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { taskService, Task, ProjectFile, TaskHistory, TaskProgress } from '../services/task.service';
import CreateTaskDialog from './CreateTaskDialog.vue';
import EditTaskDialog from './EditTaskDialog.vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import { getLanguageName } from '../utils/languages';

// Types
interface Status {
  id: string;
  name: string;
  color: string;
  type: 'todo' | 'in_progress' | 'done';
  position: number;
  isDefault: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
}

interface Transition {
  id: string;
  name: string;
  fromStatus: Status;
  toStatus: Status;
  conditionType: string;
}

interface EditTaskData {
  projectId: string;
  branchId: string;
  projectMembers: any[];
  projectGroups: any[];
  projectFiles: ProjectFile[];
  projectTargetLanguages: any[];
  task: Task;
}

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  branchId: {
    type: String,
    default: null
  },
  projectMembers: {
    type: Array,
    default: () => []
  },
  projectGroups: {
    type: Array,
    default: () => []
  },
  project: {
    type: Object,
    default: () => null
  },
  customTitle: {
    type: String,
    default: ''
  },
  canCreateTask: {
    type: Boolean,
    default: true
  }
});

// Reactive state
const loading = ref(false);
const error = ref('');
const tasks = ref<Task[]>([]);
const statuses = ref<Status[]>([]);
const workflow = ref<Workflow | null>(null);
const selectedTask = ref<Task | null>(null);
const availableTransitions = ref<Transition[]>([]);
const taskHistory = ref<TaskHistory[]>([]);
const projectFiles = ref<ProjectFile[]>([]);
const taskProgressData = ref<Map<string, TaskProgress>>(new Map());

// UI state
const showCreateTask = ref(false);
const showEditTask = ref(false);
const editTaskData = ref<EditTaskData | null>(null);
const search = ref('');
const activeTab = ref<'board' | 'all'>('board');
const showFilters = ref(false);
const selectedFilters = ref({
  assignee: 'All users',
  createdBy: 'All users',
  file: 'All files',
  dueDate: 'All'
});

// Calendar state
const showDatePicker = ref(false);
const selectedDateRange = ref({
  startDate: null as Date | null,
  endDate: null as Date | null
});
const currentMonth = ref(new Date());
const nextMonth = ref(new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1));

// Task action state
const showTaskActionMenu = ref(false);
const taskActionMenuPosition = ref({ x: 0, y: 0 });
const currentTaskForAction = ref<Task | null>(null);

// Modal state
const showDeleteModal = ref(false);
const taskToDelete = ref<Task | null>(null);
const isDeleting = ref(false);
const showCloseTaskModal = ref(false);
const taskToClose = ref<Task | null>(null);
const isClosingTask = ref(false);
const showReopenTaskModal = ref(false);
const taskToReopen = ref<Task | null>(null);
const isReopeningTask = ref(false);

// Task detail state
const activeTaskDetailTab = ref<'details' | 'history'>('details');
const taskHistoryLoading = ref(false);
const selectedTaskProgress = ref(0);
const selectedTaskProgressText = ref('0%');
const selectedTaskProgressLoading = ref(false);

// Drag & drop state
const draggedTask = ref<Task | null>(null);
const isDragging = ref(false);
const dragOverColumn = ref<string | null>(null);

// Utilities
const router = useRouter();
const toast = useToast();

// Computed properties
const assigneeOptions = computed(() => {
  const options = ['All users', 'Unassigned'];
  if (props.projectMembers && Array.isArray(props.projectMembers)) {
    props.projectMembers.forEach((member: any) => {
      if (member.fullName) {
        options.push(member.fullName);
      }
    });
  }
  return options;
});

const createdByOptions = computed(() => {
  const options = ['All users'];
  if (props.projectMembers && Array.isArray(props.projectMembers)) {
    props.projectMembers.forEach((member: any) => {
      if (member.fullName) {
        options.push(member.fullName);
      }
    });
  }
  return options;
});

const fileOptions = computed(() => {
  const options = ['All files'];
  if (projectFiles.value && Array.isArray(projectFiles.value)) {
    projectFiles.value.forEach((file: ProjectFile) => {
      if (file.fileName) {
        options.push(file.fileName);
      }
    });
  }
  return options;
});

const dueDateOptions = computed(() => [
  { value: 'All', label: 'All' },
  { value: 'Overdue now', label: 'Overdue now' },
  { value: 'Custom Range', label: 'Custom Range' }
]);

const filteredTasks = computed(() => {
  let filtered = tasks.value;

  // Search filter
  if (search.value.trim()) {
    filtered = filtered.filter((task: Task) =>
      task.title.toLowerCase().includes(search.value.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.value.toLowerCase()))
    );
  }

  // Apply other filters
  if (selectedFilters.value.assignee !== 'All users') {
    filtered = filtered.filter((task: Task) => {
      if (selectedFilters.value.assignee === 'Unassigned') {
        return !task.assignedTo || !task.assignedTo.fullName;
      }
      return task.assignedTo && task.assignedTo.fullName === selectedFilters.value.assignee;
    });
  }

  if (selectedFilters.value.createdBy !== 'All users') {
    filtered = filtered.filter((task: Task) =>
      task.createdBy && task.createdBy.fullName === selectedFilters.value.createdBy
    );
  }

  if (selectedFilters.value.file !== 'All files') {
    filtered = filtered.filter((task: Task) => {
      if (!task.fileId) return false;
      const fileName = getFileName(task.fileId);
      return fileName === selectedFilters.value.file;
    });
  }

  if (selectedFilters.value.dueDate !== 'All') {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    filtered = filtered.filter((task: Task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      switch (selectedFilters.value.dueDate) {
        case 'Overdue now':
          return dueDate < today;
        case 'Custom Range':
          if (selectedDateRange.value.startDate && selectedDateRange.value.endDate) {
            return dueDate >= selectedDateRange.value.startDate && dueDate <= selectedDateRange.value.endDate;
          }
          return true;
        default:
          return true;
      }
    });
  }

  return filtered;
});

const todoTasks = computed(() => {
  return filteredTasks.value.filter((task: Task) => task.status === 'pending');
});

const inProgressTasks = computed(() => {
  return filteredTasks.value.filter((task: Task) => task.status === 'in_progress');
});

const doneTasks = computed(() => {
  return filteredTasks.value.filter((task: Task) => task.status === 'completed');
});

const closedTasks = computed(() => {
  return filteredTasks.value.filter((task: Task) => task.status === 'closed');
});

// Language grouping
const availableLanguages = computed(() => {
  const languages = new Set<string>();
  filteredTasks.value.forEach((task: Task) => {
    if (task.language) {
      languages.add(task.language);
    }
  });
  return Array.from(languages).sort();
});

const shouldShowLanguageGrouping = computed(() => {
  return availableLanguages.value.length > 1;
});

const tasksByLanguageAndStatus = computed(() => {
  const result: Record<string, { todo: Task[]; inProgress: Task[]; done: Task[] }> = {};
  availableLanguages.value.forEach((lang: string) => {
    result[lang] = { todo: [], inProgress: [], done: [] };
  });
  filteredTasks.value.forEach((task: Task) => {
    const lang = task.language || 'Unknown';
    if (!result[lang]) {
      result[lang] = { todo: [], inProgress: [], done: [] };
    }
    if (task.status === 'pending') result[lang].todo.push(task);
    else if (task.status === 'in_progress') result[lang].inProgress.push(task);
    else if (task.status === 'completed') result[lang].done.push(task);
  });
  return result;
});

// Methods
async function loadBoard() {
  if (!props.projectId) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    // Load statuses
    const statusesResponse = await axiosInstance.get(`/projects/${props.projectId}/statuses`);
    statuses.value = statusesResponse.data;

    // Load tasks
    const tasksResponse = await axiosInstance.get(`/tasks/project/${props.projectId}`);
    tasks.value = Array.isArray(tasksResponse.data) ? [...tasksResponse.data] : [];

    // Load workflow if available
    try {
      const workflowsResponse = await axiosInstance.get(`/projects/${props.projectId}/workflows`);
      const workflows = workflowsResponse.data;
      workflow.value = workflows.find((w: Workflow) => w.isDefault) || workflows[0] || null;
    } catch (error) {
      console.warn('No workflow found for project:', props.projectId);
    }

    console.log('Board loaded:', {
      statuses: statuses.value.length,
      tasks: tasks.value.length,
      workflow: workflow.value?.name
    });

  } catch (err: any) {
    error.value = err.message || 'Failed to load board';
    console.error('Error loading board:', err);
  } finally {
    loading.value = false;
  }
}

async function loadProjectFiles() {
  try {
    projectFiles.value = await taskService.getProjectFiles(props.projectId);
    console.log('Loaded project files:', projectFiles.value.length);
  } catch (err: any) {
    console.error('Error loading project files:', err);
  }
}

async function refreshBoard() {
  console.log('Refreshing board...');
  await loadBoard();
  await loadProjectFiles();
  
  // Clear progress cache
  taskProgressData.value.clear();
  
  // Refresh selected task progress if any
  if (selectedTask.value) {
    await updateSelectedTaskProgress();
  }
}

function getFileName(fileId: string): string {
  const file = projectFiles.value.find((f: ProjectFile) => f.fileId === fileId);
  if (file) {
    return file.fileName;
  } else {
    const fileStr = projectFiles.value.find((f: ProjectFile) => String(f.fileId) === String(fileId));
    return fileStr ? fileStr.fileName : `File ${fileId}`;
  }
}

function truncateFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) {
    return fileName;
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName.substring(0, maxLength - 3) + '...';
  }

  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  const maxNameLength = maxLength - extension.length - 3;

  if (name.length <= maxNameLength) {
    return fileName;
  }

  return name.substring(0, maxNameLength) + '...' + extension;
}

function getCleanTaskTitle(title: string): string {
  return title.replace(/\s*\([A-Z]{2}\)$/, '');
}

async function selectTask(task: Task) {
  selectedTask.value = task;
  
  // Clear progress cache for fresh data
  taskProgressData.value.delete(task.id);
  
  try {
    // Load available transitions
    const transitionsResponse = await axiosInstance.get(`/tasks/${task.id}/available-transitions`);
    availableTransitions.value = transitionsResponse.data;

    // Load task history
    await loadTaskHistory(task.id);

    // Update progress
    await updateSelectedTaskProgress();

  } catch (error) {
    console.error('Failed to load task details:', error);
  }
}

async function loadTaskHistory(taskId: string) {
  if (!taskId) return;

  taskHistoryLoading.value = true;
  try {
    taskHistory.value = await taskService.getTaskHistory(taskId);
  } catch (error) {
    console.error('Error loading task history:', error);
    taskHistory.value = [];
  } finally {
    taskHistoryLoading.value = false;
  }
}

async function loadTaskProgress(taskId: string): Promise<TaskProgress> {
  if (taskProgressData.value.has(taskId)) {
    return taskProgressData.value.get(taskId)!;
  }

  try {
    const progress = await taskService.getTaskProgress(taskId);
    taskProgressData.value.set(taskId, progress);
    return progress;
  } catch (error) {
    console.error('Error loading task progress:', error);
    return { total: 0, translated: 0, percentage: 0 };
  }
}

async function updateSelectedTaskProgress() {
  if (!selectedTask.value) {
    selectedTaskProgress.value = 0;
    selectedTaskProgressText.value = '0%';
    return;
  }

  selectedTaskProgressLoading.value = true;
  try {
    const progress = await loadTaskProgress(selectedTask.value.id);
    selectedTaskProgress.value = progress.percentage;

    if (progress.percentage === 0) {
      selectedTaskProgressText.value = '0%';
    } else if (progress.percentage === 100) {
      selectedTaskProgressText.value = '100%';
    } else {
      selectedTaskProgressText.value = `${progress.percentage}%`;
    }
  } catch (error) {
    console.error('Error updating selected task progress:', error);
    selectedTaskProgress.value = 0;
    selectedTaskProgressText.value = '0%';
  } finally {
    selectedTaskProgressLoading.value = false;
  }
}

// Drag & Drop
function onDragStart(event: DragEvent, task: Task) {
  draggedTask.value = task;
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  }
}

function onDragEnd(event: DragEvent) {
  isDragging.value = false;
  draggedTask.value = null;
}

async function onDrop(event: DragEvent, toStatusId: string) {
  event.preventDefault();

  if (!draggedTask.value || draggedTask.value.status === toStatusId) {
    return;
  }

  try {
    await axiosInstance.post(`/tasks/${draggedTask.value.id}/transition`, {
      toStatusId: toStatusId
    });

    // Update task status locally
    const task = tasks.value.find(t => t.id === draggedTask.value!.id);
    if (task) {
      task.status = toStatusId as any;
    }

    // Update selected task if it's the same
    if (selectedTask.value?.id === draggedTask.value.id) {
      selectedTask.value.status = toStatusId as any;
      await selectTask(selectedTask.value);
    }

    toast.add({
      severity: 'success',
      summary: 'Task Moved',
      detail: 'Task moved successfully',
      life: 3000
    });

  } catch (error) {
    console.error('Failed to move task:', error);
    toast.add({
      severity: 'error',
      summary: 'Move Failed',
      detail: 'Failed to move task',
      life: 4000
    });
  } finally {
    draggedTask.value = null;
  }
}

// Task actions
function openTaskActionMenu(event: MouseEvent, task: Task) {
  event.stopPropagation();
  currentTaskForAction.value = task;
  taskActionMenuPosition.value = { x: event.clientX, y: event.clientY };
  showTaskActionMenu.value = true;
}

function closeTaskActionMenu() {
  showTaskActionMenu.value = false;
  currentTaskForAction.value = null;
}

function editTask() {
  if (!currentTaskForAction.value) return;

  selectedTask.value = null;
  
  editTaskData.value = {
    projectId: props.projectId,
    branchId: props.branchId || '',
    projectMembers: props.projectMembers,
    projectGroups: props.projectGroups,
    projectFiles: projectFiles.value,
    projectTargetLanguages: props.project?.targetLanguages || [],
    task: currentTaskForAction.value
  };

  showEditTask.value = true;
  closeTaskActionMenu();
}

function handleTaskUpdated(updatedTask: Task) {
  const taskIndex = tasks.value.findIndex(t => t.id === updatedTask.id);
  if (taskIndex !== -1) {
    tasks.value[taskIndex] = updatedTask;
  }

  if (selectedTask.value && selectedTask.value.id === updatedTask.id) {
    selectedTask.value = updatedTask;
  }

  showEditTask.value = false;
  editTaskData.value = null;

  toast.add({
    severity: 'success',
    summary: 'Task Updated',
    detail: 'Task has been successfully updated.',
    life: 3000
  });
}

function closeEditTask() {
  showEditTask.value = false;
  editTaskData.value = null;
}

// Task deletion
function openDeleteModal() {
  if (!currentTaskForAction.value) return;
  taskToDelete.value = currentTaskForAction.value;
  showDeleteModal.value = true;
  closeTaskActionMenu();
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  taskToDelete.value = null;
  isDeleting.value = false;
}

async function deleteSelectedTask() {
  if (!taskToDelete.value) return;

  isDeleting.value = true;
  const taskId = taskToDelete.value.id;
  const taskTitle = taskToDelete.value.title;

  try {
    await taskService.deleteTask(taskId);
    
    closeDeleteModal();
    selectedTask.value = null;
    await refreshBoard();

    toast.add({
      severity: 'success',
      summary: 'Task Deleted',
      detail: 'Task has been successfully deleted.',
      life: 3000
    });

  } catch (error: any) {
    console.error('Failed to delete task:', error);
    
    closeDeleteModal();
    await refreshBoard();

    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: error.response?.data?.message || 'Failed to delete task. Please try again.',
      life: 4000
    });
  } finally {
    isDeleting.value = false;
  }
}

// Task close/reopen
function showCloseTaskConfirmation(task: Task) {
  taskToClose.value = task;
  showCloseTaskModal.value = true;
}

async function confirmCloseTask() {
  if (!taskToClose.value) return;

  isClosingTask.value = true;

  try {
    await taskService.closeTask(taskToClose.value.id);

    const taskIndex = tasks.value.findIndex((t: Task) => t.id === taskToClose.value!.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = { ...tasks.value[taskIndex], status: 'closed' };
    }

    toast.add({
      severity: 'success',
      summary: 'Task Closed',
      detail: `Task "${taskToClose.value.title}" has been closed successfully.`,
      life: 3000
    });

    selectedTask.value = null;

  } catch (error: any) {
    console.error('Failed to close task:', error);
    toast.add({
      severity: 'error',
      summary: 'Close Failed',
      detail: error.response?.data?.message || 'Failed to close task. Please try again.',
      life: 4000
    });
  } finally {
    showCloseTaskModal.value = false;
    taskToClose.value = null;
    isClosingTask.value = false;
  }
}

function cancelCloseTask() {
  showCloseTaskModal.value = false;
  taskToClose.value = null;
}

function showReopenTaskConfirmation(task: Task) {
  taskToReopen.value = task;
  showReopenTaskModal.value = true;
}

async function confirmReopenTask() {
  if (!taskToReopen.value) return;

  isReopeningTask.value = true;

  try {
    await taskService.reopenTask(taskToReopen.value.id);

    const taskIndex = tasks.value.findIndex((t: Task) => t.id === taskToReopen.value!.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = { ...tasks.value[taskIndex], status: 'pending' };
    }

    toast.add({
      severity: 'success',
      summary: 'Task Reopened',
      detail: `Task "${taskToReopen.value.title}" has been reopened successfully.`,
      life: 3000
    });

    selectedTask.value = null;
    activeTab.value = 'board';

  } catch (error: any) {
    console.error('Failed to reopen task:', error);
    toast.add({
      severity: 'error',
      summary: 'Reopen Failed',
      detail: error.response?.data?.message || 'Failed to reopen task. Please try again.',
      life: 4000
    });
  } finally {
    showReopenTaskModal.value = false;
    taskToReopen.value = null;
    isReopeningTask.value = false;
  }
}

function cancelReopenTask() {
  showReopenTaskModal.value = false;
  taskToReopen.value = null;
}

// Utility functions
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  return due < now;
}

function getAvatarUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';
  return base + url;
}

function getFileIcon(fileName: string): string {
  if (!fileName) return '📄';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return '📄';
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx'].includes(ext)) return '📗';
  if (['txt', 'md'].includes(ext)) return '📄';
  return '📄';
}

function getStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'To do',
    'in_progress': 'In progress',
    'completed': 'Done',
    'closed': 'Closed',
    'cancelled': 'Cancelled'
  };
  return statusMap[status] || status;
}

function formatHistoryAction(action: string): string {
  const actionMap: Record<string, string> = {
    'status_change': 'Status changed',
    'assignment_change': 'Assignment changed',
    'due_date_change': 'Due date changed',
    'created': 'Task created',
    'closed': 'Task closed',
    'reopened': 'Task reopened'
  };
  return actionMap[action] || action;
}

function formatTimeOnly(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatDateOnly(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Filter functions
function toggleFilters() {
  showFilters.value = !showFilters.value;
}

function clearFilters() {
  selectedFilters.value = {
    assignee: 'All users',
    createdBy: 'All users',
    file: 'All files',
    dueDate: 'All'
  };
}

function toggleCustomSelect(selectType: string) {
  // Implementation for custom select toggle
}

function selectCustomOption(filterType: string, value: string) {
  selectedFilters.value[filterType as keyof typeof selectedFilters.value] = value;
}

// Calendar functions
function selectDate(date: Date) {
  if (!selectedDateRange.value.startDate || (selectedDateRange.value.startDate && selectedDateRange.value.endDate)) {
    selectedDateRange.value.startDate = date;
    selectedDateRange.value.endDate = null;
  } else {
    if (date >= selectedDateRange.value.startDate!) {
      selectedDateRange.value.endDate = date;
    } else {
      selectedDateRange.value.endDate = selectedDateRange.value.startDate;
      selectedDateRange.value.startDate = date;
    }

    if (selectedDateRange.value.startDate && selectedDateRange.value.endDate) {
      setTimeout(() => {
        showDatePicker.value = false;
      }, 300);
    }
  }
}

function isDateInRange(date: Date): boolean {
  if (!selectedDateRange.value.startDate) return false;
  if (!selectedDateRange.value.endDate) {
    return date.getTime() === selectedDateRange.value.startDate.getTime();
  }
  return date >= selectedDateRange.value.startDate && date <= selectedDateRange.value.endDate;
}

function isDateStart(date: Date): boolean {
  return selectedDateRange.value.startDate ? date.getTime() === selectedDateRange.value.startDate.getTime() : false;
}

function isDateEnd(date: Date): boolean {
  return selectedDateRange.value.endDate ? date.getTime() === selectedDateRange.value.endDate.getTime() : false;
}

function navigateMonth(direction: 'prev' | 'next') {
  if (direction === 'prev') {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
    nextMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
  } else {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
    nextMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 2, 1);
  }
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 1);
  }
  return days;
}

function clearDateRange() {
  selectedDateRange.value.startDate = null;
  selectedDateRange.value.endDate = null;
  selectedFilters.value.dueDate = 'All';
  showDatePicker.value = false;
}

// Lifecycle
onMounted(() => {
  console.log('ProjectTaskTab mounted, loading board...');
  loadBoard();
  loadProjectFiles();

  // Add click outside listeners
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-filter-container') && !target.closest('.filter-section') && !target.closest('.date-picker-calendar') && !target.closest('.filter-dropdown-menu') && !target.closest('.custom-select-wrapper')) {
      showDatePicker.value = false;
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.task-action-menu') && !target.closest('.task-action-menu-btn')) {
      closeTaskActionMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && showTaskActionMenu.value) {
      closeTaskActionMenu();
    }
  });
});

onBeforeUnmount(() => {
  // Cleanup event listeners if needed
});

// Watchers
watch([() => props.projectId, () => props.branchId], () => {
  console.log('Project ID or Branch ID changed, reloading board...');
  loadBoard();
  loadProjectFiles();
});

watch(() => selectedTask.value, async (task: Task | null) => {
  if (task) {
    await loadTaskHistory(task.id);
    await updateSelectedTaskProgress();
  } else {
    taskHistory.value = [];
  }
});

// Expose methods
defineExpose({
  refreshBoard,
  loadProjectFiles
});

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Missing methods referenced in template
function getTasksByStatus(statusId: string): Task[] {
  return tasks.value.filter(task => task.status === statusId);
}

function getInitials(fullName?: string): string {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function showColumnMenu(status: Status) {
  // Show context menu for column actions
  console.log('Show column menu for:', status);
}

function createTaskInStatus(statusId: string) {
  // Emit event to parent component or navigate to create task page
  showCreateTask.value = true;
}

function handleTaskCreated(task: Task) {
  console.log('Task created:', task);
  tasks.value.unshift(task);
  showCreateTask.value = false;
  
  // Clear progress cache to ensure fresh data
  taskProgressData.value.clear();
}

async function transitionTask(taskId: string, toStatusId: string) {
  try {
    await axiosInstance.post(`/tasks/${taskId}/transition`, {
      toStatusId: toStatusId
    });

    // Update task status locally
    const task = tasks.value.find(t => t.id === taskId);
    if (task) {
      task.status = toStatusId as any;
    }

    // Update selected task if it's the same
    if (selectedTask.value?.id === taskId) {
      selectedTask.value.status = toStatusId as any;
      await selectTask(selectedTask.value);
    }

    toast.add({
      severity: 'success',
      summary: 'Task Moved',
      detail: 'Task moved successfully',
      life: 3000
    });

  } catch (error) {
    console.error('Failed to move task:', error);
    toast.add({
      severity: 'error',
      summary: 'Move Failed',
      detail: 'Failed to move task',
      life: 4000
    });
  }
}
</script>

<template>
  <div class="kanban-board">
    <!-- Header -->
    <div class="board-header">
      <h2 class="board-title">{{ workflow?.name || 'Kanban Board' }}</h2>
      <div class="board-actions">
        <button v-if="canCreateTask" @click="showCreateTask = true" class="btn btn-primary">
          <i class="icon-plus"></i>
          Add Task
        </button>
        <button @click="refreshBoard" class="btn btn-secondary">
          <i class="icon-refresh"></i>
          Refresh
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading board...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="refreshBoard" class="btn btn-primary">Retry</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="tasks.length === 0" class="empty-container">
      <div class="empty-icon">📋</div>
      <h3>No tasks yet</h3>
      <p>Create your first task to get started with this project</p>
      <button v-if="canCreateTask" @click="showCreateTask = true" class="btn btn-primary">
        <i class="icon-plus"></i>
        Create Task
      </button>
    </div>

    <!-- Kanban Columns -->
    <div v-else class="kanban-columns">
      <div
        v-for="status in statuses"
        :key="status.id"
        class="kanban-column"
        @drop="onDrop($event, status.id)"
        @dragover.prevent
        @dragenter.prevent
      >
        <!-- Column Header -->
        <div class="column-header" :style="{ borderTopColor: status.color }">
          <div class="column-title">
            <span class="status-indicator" :style="{ backgroundColor: status.color }"></span>
            {{ status.name }}
            <span class="task-count">{{ getTasksByStatus(status.id).length }}</span>
          </div>
          <button @click="showColumnMenu(status)" class="column-menu-btn">
            <i class="icon-more"></i>
          </button>
        </div>

        <!-- Task Cards -->
        <div class="column-content">
          <div
            v-for="task in getTasksByStatus(status.id)"
            :key="task.id"
            class="task-card"
            :class="{ 'task-selected': selectedTask?.id === task.id }"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @click="selectTask(task)"
          >
            <!-- Task Priority -->
            <div class="task-priority" :class="`priority-${task.priority || 'medium'}`">
              <span class="priority-icon"></span>
            </div>

            <!-- Task Content -->
            <div class="task-content">
              <h4 class="task-title">{{ getCleanTaskTitle(task.title) }}</h4>
              <p v-if="task.description" class="task-description">
                {{ task.description }}
              </p>

              <!-- Task Meta -->
              <div class="task-meta">
                <div v-if="task.storyPoints" class="story-points">
                  {{ task.storyPoints }} SP
                </div>
                <div v-if="task.dueDate" class="due-date" :class="{ 'overdue': isOverdue(task.dueDate) }">
                  <i class="icon-calendar"></i>
                  {{ formatDate(task.dueDate) }}
                </div>
                <div v-if="task.language" class="language-tag">
                  {{ getLanguageName(task.language) }}
                </div>
              </div>

              <!-- Task Tags -->
              <div v-if="task.customFields?.tags" class="task-tags">
                <span
                  v-for="tag in task.customFields.tags"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- Task Footer -->
            <div class="task-footer">
              <div class="task-assignee">
                <img
                  v-if="task.assignedTo?.avatarUrl"
                  :src="getAvatarUrl(task.assignedTo.avatarUrl)"
                  :alt="task.assignedTo.fullName"
                  class="avatar"
                >
                <div v-else class="avatar avatar-placeholder">
                  {{ getInitials(task.assignedTo?.fullName) }}
                </div>
              </div>
              <div class="task-actions">
                <button @click.stop="openTaskActionMenu($event, task)" class="task-menu-btn">
                  <i class="icon-more"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Add Task Button in Column -->
          <button
            v-if="canCreateTask"
            @click="createTaskInStatus(status.id)"
            class="add-task-btn"
          >
            <i class="icon-plus"></i>
            Add a card
          </button>
        </div>
      </div>
    </div>

    <!-- Task Detail Modal -->
    <div v-if="selectedTask" class="modal-overlay" @click="selectedTask = null">
      <div class="modal-content task-detail-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedTask.title }}</h3>
          <button @click="selectedTask = null" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="task-info">
            <div class="info-row">
              <label>Status:</label>
              <div class="status-badge" :style="{ backgroundColor: selectedTask.status.color }">
                {{ getStatusDisplayName(selectedTask.status) }}
              </div>
            </div>

            <div class="info-row">
              <label>Priority:</label>
              <span class="priority-badge" :class="`priority-${selectedTask.priority || 'medium'}`">
                {{ selectedTask.priority || 'medium' }}
              </span>
            </div>

            <div v-if="selectedTask.assignedTo" class="info-row">
              <label>Assignee:</label>
              <div class="assignee-info">
                <img
                  v-if="selectedTask.assignedTo.avatarUrl"
                  :src="getAvatarUrl(selectedTask.assignedTo.avatarUrl)"
                  class="avatar-sm"
                >
                <div v-else class="avatar-sm avatar-placeholder">
                  {{ getInitials(selectedTask.assignedTo.fullName) }}
                </div>
                {{ selectedTask.assignedTo.fullName }}
              </div>
            </div>

            <div v-if="selectedTask.description" class="info-row">
              <label>Description:</label>
              <p>{{ selectedTask.description }}</p>
            </div>

            <div v-if="selectedTask.language" class="info-row">
              <label>Language:</label>
              <span>{{ getLanguageName(selectedTask.language) }}</span>
            </div>

            <div v-if="selectedTaskProgressLoading" class="info-row">
              <label>Progress:</label>
              <div class="progress-loading">
                <i class="icon-spinner"></i> Loading...
              </div>
            </div>
            <div v-else class="info-row">
              <label>Progress:</label>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: selectedTaskProgress + '%' }"></div>
              </div>
              <span class="progress-text">{{ selectedTaskProgressText }}</span>
            </div>
          </div>

          <!-- Available Transitions -->
          <div v-if="availableTransitions.length > 0" class="transitions-section">
            <h4>Available Actions</h4>
            <div class="transition-buttons">
              <button
                v-for="transition in availableTransitions"
                :key="transition.id"
                @click="transitionTask(selectedTask.id, transition.toStatus.id)"
                class="btn btn-transition"
                :style="{ borderColor: transition.toStatus.color }"
              >
                Move to {{ transition.toStatus.name }}
              </button>
            </div>
          </div>

          <!-- Task History -->
          <div class="history-section">
            <h4>History</h4>
            <div v-if="taskHistoryLoading" class="history-loading">
              <i class="icon-spinner"></i> Loading history...
            </div>
            <div v-else-if="taskHistory.length === 0" class="no-history">
              <p>No history available for this task.</p>
            </div>
            <div v-else class="history-list">
              <div v-for="entry in taskHistory" :key="entry.id" class="history-entry">
                <div class="history-icon">
                  <i class="icon-arrow-right"></i>
                </div>
                <div class="history-content">
                  <p>
                    <strong>{{ entry.changedBy?.fullName || 'Unknown' }}</strong>
                    {{ formatHistoryAction(entry.action) }}
                  </p>
                  <small>{{ formatDateTime(entry.performedAt) }}</small>
                  <p v-if="entry.description" class="history-comment">{{ entry.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Action Menu -->
    <div v-if="showTaskActionMenu" class="task-action-menu" :style="{ left: taskActionMenuPosition.x + 'px', top: taskActionMenuPosition.y + 'px' }">
      <button @click="editTask" class="menu-item">
        <i class="icon-edit"></i>
        Edit Task
      </button>
      <button @click="openDeleteModal" class="menu-item delete">
        <i class="icon-delete"></i>
        Delete Task
      </button>
      <button v-if="currentTaskForAction?.status === 'completed'" @click="showCloseTaskConfirmation(currentTaskForAction)" class="menu-item">
        <i class="icon-check"></i>
        Close Task
      </button>
      <button v-if="currentTaskForAction?.status === 'closed'" @click="showReopenTaskConfirmation(currentTaskForAction)" class="menu-item">
        <i class="icon-refresh"></i>
        Reopen Task
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content confirmation-modal" @click.stop>
        <div class="modal-header">
          <h3>Delete Task</h3>
          <button @click="closeDeleteModal" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete the task "{{ taskToDelete?.title }}"?</p>
          <p>This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button @click="closeDeleteModal" class="btn btn-secondary">Cancel</button>
          <button @click="deleteSelectedTask" class="btn btn-danger" :disabled="isDeleting">
            <i v-if="isDeleting" class="icon-spinner"></i>
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Close Task Confirmation Modal -->
    <div v-if="showCloseTaskModal" class="modal-overlay" @click="cancelCloseTask">
      <div class="modal-content confirmation-modal" @click.stop>
        <div class="modal-header">
          <h3>Close Task</h3>
          <button @click="cancelCloseTask" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to close the task "{{ taskToClose?.title }}"?</p>
        </div>
        <div class="modal-footer">
          <button @click="cancelCloseTask" class="btn btn-secondary">Cancel</button>
          <button @click="confirmCloseTask" class="btn btn-primary" :disabled="isClosingTask">
            <i v-if="isClosingTask" class="icon-spinner"></i>
            {{ isClosingTask ? 'Closing...' : 'Close' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reopen Task Confirmation Modal -->
    <div v-if="showReopenTaskModal" class="modal-overlay" @click="cancelReopenTask">
      <div class="modal-content confirmation-modal" @click.stop>
        <div class="modal-header">
          <h3>Reopen Task</h3>
          <button @click="cancelReopenTask" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to reopen the task "{{ taskToReopen?.title }}"?</p>
        </div>
        <div class="modal-footer">
          <button @click="cancelReopenTask" class="btn btn-secondary">Cancel</button>
          <button @click="confirmReopenTask" class="btn btn-primary" :disabled="isReopeningTask">
            <i v-if="isReopeningTask" class="icon-spinner"></i>
            {{ isReopeningTask ? 'Reopening...' : 'Reopen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Task Dialog -->
    <CreateTaskDialog
      v-if="showCreateTask"
      :visible="true"
      :project-id="projectId"
      :project-members="projectMembers"
      :project-groups="projectGroups"
      :branch-id="branchId"
      :project-files="projectFiles"
      :project-target-languages="project?.targetLanguages || []"
      @close="showCreateTask = false"
      @success="handleTaskCreated"
    />

    <!-- Edit Task Dialog -->
    <EditTaskDialog
      v-if="showEditTask && editTaskData"
      :visible="true"
      :project-id="editTaskData.projectId"
      :project-members="editTaskData.projectMembers"
      :project-groups="editTaskData.projectGroups"
      :branch-id="editTaskData.branchId"
      :project-files="editTaskData.projectFiles"
      :project-target-languages="editTaskData.projectTargetLanguages"
      :edit-task="editTaskData.task"
      @close="closeEditTask"
      @success="handleTaskUpdated"
    />
  </div>
</template>

<style scoped>
.kanban-board {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f4f5f7;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e1e4e8;
}

.board-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #172b4d;
}

.board-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #0052cc;
  color: white;
}

.btn-secondary {
  background: #f4f5f7;
  color: #42526e;
  border: 1px solid #dfe1e6;
}

.btn-danger {
  background: #de350b;
  color: white;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 1rem;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #0052cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.kanban-columns {
  display: flex;
  flex: 1;
  gap: 1rem;
  padding: 1rem 2rem;
  overflow-x: auto;
}

.kanban-column {
  flex: 0 0 300px;
  background: #ebecf0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 140px);
}

.column-header {
  padding: 1rem;
  border-top: 3px solid;
  border-radius: 8px 8px 0 0;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #172b4d;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.task-count {
  background: #dfe1e6;
  color: #42526e;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.column-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: #6b778c;
}

.column-content {
  flex: 1;
  padding: 0.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-card {
  background: white;
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.task-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}

.task-selected {
  border: 2px solid #0052cc;
}

.task-priority {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.priority-highest { background: #de350b; }
.priority-high { background: #ff8b00; }
.priority-medium { background: #ffab00; }
.priority-low { background: #36b37e; }
.priority-lowest { background: #6b778c; }

.task-content {
  margin-right: 1rem;
}

.task-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #172b4d;
  line-height: 1.3;
}

.task-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.8rem;
  color: #6b778c;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.story-points {
  background: #dfe1e6;
  color: #42526e;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.due-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: #6b778c;
}

.due-date.overdue {
  color: #de350b;
}

.language-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.1rem 0.4rem;
  border-radius: 12px;
  font-size: 0.7rem;
}

.task-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.tag {
  background: #f4f5f7;
  color: #42526e;
  padding: 0.1rem 0.4rem;
  border-radius: 12px;
  font-size: 0.7rem;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.avatar-placeholder {
  background: #dfe1e6;
  color: #42526e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
}

.task-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: #6b778c;
  opacity: 0;
  transition: opacity 0.2s;
}

.task-card:hover .task-menu-btn {
  opacity: 1;
}

.add-task-btn {
  background: none;
  border: 1px dashed #c1c7d0;
  color: #6b778c;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.add-task-btn:hover {
  background: white;
  color: #42526e;
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

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e1e4e8;
}

.modal-header h3 {
  margin: 0;
  color: #172b4d;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  color: #6b778c;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1.5rem;
  border-top: 1px solid #e1e4e8;
}

.task-info {
  margin-bottom: 2rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.info-row label {
  font-weight: 600;
  color: #42526e;
  min-width: 80px;
}

.status-badge {
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.priority-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.assignee-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar-sm {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #dfe1e6;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #36b37e;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #42526e;
  min-width: 40px;
}

.progress-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b778c;
}

.transitions-section {
  margin-bottom: 2rem;
}

.transitions-section h4 {
  margin: 0 0 1rem 0;
  color: #172b4d;
}

.transition-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-transition {
  background: white;
  border: 1px solid;
  color: #42526e;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-transition:hover {
  background: #f4f5f7;
}

.history-section h4 {
  margin: 0 0 1rem 0;
  color: #172b4d;
}

.history-loading,
.no-history {
  text-align: center;
  color: #6b778c;
  padding: 2rem;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-entry {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f4f5f7;
}

.history-icon {
  color: #6b778c;
  margin-top: 0.25rem;
}

.history-content p {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  color: #172b4d;
}

.history-content small {
  color: #6b778c;
  font-size: 0.8rem;
}

.history-comment {
  margin-top: 0.5rem !important;
  padding: 0.5rem;
  background: #f4f5f7;
  border-radius: 4px;
  font-style: italic;
}

/* Task Action Menu */
.task-action-menu {
  position: fixed;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1001;
  min-width: 150px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: #42526e;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background: #f4f5f7;
}

.menu-item.delete {
  color: #de350b;
}

.menu-item.delete:hover {
  background: #ffebe6;
}

/* Icon placeholders */
.icon-plus::before { content: '+'; }
.icon-refresh::before { content: '⟲'; }
.icon-more::before { content: '⋯'; }
.icon-close::before { content: '×'; }
.icon-calendar::before { content: '📅'; }
.icon-arrow-right::before { content: '→'; }
.icon-edit::before { content: '✏️'; }
.icon-delete::before { content: '🗑️'; }
.icon-check::before { content: '✓'; }
.icon-spinner::before { content: '⟳'; }
</style>
