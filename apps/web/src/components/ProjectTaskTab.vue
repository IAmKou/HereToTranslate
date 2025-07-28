<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { taskService, Task, ProjectFile } from '../services/task.service';
import CreateTaskDialog from './CreateTaskDialog.vue';
import EditTaskDialog from './EditTaskDialog.vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import { getLanguageName } from '../utils/languages';

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

// Local state như các tab khác
const tasks = ref<Task[]>([]);
const loading = ref(false);
const error = ref('');
const showCreateDialog = ref(false);
const search = ref('');
const activeTab = ref<'board' | 'all'>('board');
const filters = ref<number>(2); // demo số filter
const showFilters = ref(false); // Thêm state để ẩn/hiện filters
const selectedFilters = ref({
  assignee: 'All users',
  createdBy: 'All users',
  file: 'All files',
  dueDate: 'All'
});

// Calendar picker state
const showDatePicker = ref(false);
const selectedDateRange = ref({
  startDate: null as Date | null,
  endDate: null as Date | null
});
const currentMonth = ref(new Date());
const nextMonth = ref(new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1));

// Computed properties để lấy danh sách user thực tế
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

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const activeSubDropdown = ref<string | null>(null);
const activeCustomSelect = ref<string | null>(null);
const showFilterOptions = ref(false);
const selectedTask = ref<Task|null>(null);
const projectFiles = ref<ProjectFile[]>([]);
const showCreateForm = ref(false);
const showDeleteModal = ref(false);
const taskToDelete = ref<Task|null>(null);
const isDeleting = ref(false);
const router = useRouter();
const toast = useToast();

// Task action menu state
const showTaskActionMenu = ref(false);
const taskActionMenuPosition = ref({ x: 0, y: 0 });
const currentTaskForAction = ref<Task|null>(null);

// Search and filter functions
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

// Load tasks function như các tab khác
async function loadTasks() {
  if (!props.projectId) return;
  loading.value = true;
  error.value = '';
  try {
    console.log('Call API: /tasks/project/' + props.projectId);
    const { data } = await axiosInstance.get(`/tasks/project/${props.projectId}`);
    console.log('API /tasks/project response:', data);
    tasks.value = Array.isArray(data) ? [...data] : [];
    console.log('Tasks loaded for project', props.projectId, ':', tasks.value.length, 'tasks');

    // Debug: Check if tasks have language field
    console.log('🔍 Language Debug - Tasks with languages:');
    tasks.value.forEach(task => {
      console.log(`Task ${task.id}: "${task.title}" -> language: "${task.language}"`);
    });

    const languagesFound = new Set();
    tasks.value.forEach(task => {
      if (task.language) languagesFound.add(task.language);
    });
    console.log('🌐 Unique languages found:', Array.from(languagesFound));

  } catch (err: any) {
    error.value = err.message || 'Failed to load tasks';
    console.error('Error loading tasks:', err);
  } finally {
    loading.value = false;
  }
}

// Function để reload tasks từ server
async function reloadTasks() {
  console.log('Reloading tasks from server...');
  await loadTasks();

  // Clear progress cache to ensure fresh data
  taskProgressData.value.clear();

  // If there's a selected task, refresh its progress
  if (selectedTask.value) {
    await updateSelectedTaskProgress();
  }
}

// Function để kiểm tra task có tồn tại trên server không
async function checkTaskExists(taskId: string): Promise<boolean> {
  try {
    const taskExists = tasks.value.some((task: Task) => task.id === taskId);
    console.log(`Task ${taskId} exists in local tasks:`, taskExists);
    return taskExists;
  } catch (error) {
    console.error('Error checking task existence:', error);
    return false;
  }
}

async function loadProjectFiles() {
  console.log('loadProjectFiles called for project:', props.projectId);
  try {
    projectFiles.value = await taskService.getProjectFiles(props.projectId);
    console.log('Loaded project files:', projectFiles.value.length, 'for project:', props.projectId);
  } catch (err: any) {
    console.error('Error loading project files:', err);
  }
}

function getFileName(fileId: string): string {
  console.log('Getting filename for fileId:', fileId);
  console.log('Available projectFiles:', projectFiles.value);

  const file = projectFiles.value.find((f: ProjectFile) => f.fileId === fileId);
  console.log('Found file:', file);

  if (file) {
    return file.fileName;
  } else {
    // Nếu không tìm thấy file, thử tìm với string comparison
    const fileStr = projectFiles.value.find((f: ProjectFile) => String(f.fileId) === String(fileId));
    console.log('Found file with string comparison:', fileStr);
    return fileStr ? fileStr.fileName : `File ${fileId}`;
  }
}

function truncateFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) {
    return fileName;
  }

  // Tách extension
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // Không có extension
    return fileName.substring(0, maxLength - 3) + '...';
  }

  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);

  const maxNameLength = maxLength - extension.length - 3; // 3 cho "..."

  if (name.length <= maxNameLength) {
    return fileName;
  }

  return name.substring(0, maxNameLength) + '...' + extension;
}

function handleTaskCreated(task: Task) {
  console.log('ProjectTaskTab: Task created:', task);
  // Add new task to local array
  tasks.value.unshift(task);
  console.log('Task created:', task);

  // Only close form after the last task is added
  // The CreateTaskDialog will emit multiple success events for multiple languages
  setTimeout(() => {
    showCreateForm.value = false; // Quay lại board view
  }, 100);

  // Clear progress cache to ensure fresh data
  taskProgressData.value.clear();
}

function showCreateTaskForm() {
  console.log('ProjectTaskTab: Opening CreateTaskDialog');
  console.log('ProjectTaskTab: projectFiles to pass:', projectFiles.value);
  console.log('ProjectTaskTab: projectFiles length:', projectFiles.value.length);
  showCreateForm.value = true;
  selectedTask.value = null; // Ẩn task detail nếu đang mở
}

function cancelCreateTask() {
  console.log('ProjectTaskTab: Closing CreateTaskDialog');
  showCreateForm.value = false;
}

const filteredTasks = computed(() => {
  console.log('filteredTasks computed - tasks.value.length:', tasks.value.length, 'search:', search.value);

  let filtered = tasks.value;

  // Search filter
  if (search.value.trim()) {
    filtered = filtered.filter((t: Task) =>
      t.title.toLowerCase().includes(search.value.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.value.toLowerCase()))
    );
  }

  // Apply other filters
  if (selectedFilters.value.assignee !== 'All users') {
    filtered = filtered.filter((t: Task) => {
      if (selectedFilters.value.assignee === 'Unassigned') {
        return !t.assignedTo || !t.assignedTo.fullName;
      }
      return t.assignedTo && t.assignedTo.fullName === selectedFilters.value.assignee;
    });
  }

  if (selectedFilters.value.createdBy !== 'All users') {
    filtered = filtered.filter((t: Task) =>
      t.createdBy && t.createdBy.fullName === selectedFilters.value.createdBy
    );
  }

  if (selectedFilters.value.file !== 'All files') {
    filtered = filtered.filter((t: Task) => {
      if (!t.fileId) return false;
      const fileName = getFileName(t.fileId);
      return fileName === selectedFilters.value.file;
    });
  }

  if (selectedFilters.value.dueDate !== 'All') {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    filtered = filtered.filter((t: Task) => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      switch (selectedFilters.value.dueDate) {
        case 'Overdue now':
          return dueDate < today;
        case 'Custom Range':
          if (selectedDateRange.value.startDate && selectedDateRange.value.endDate) {
            return dueDate >= selectedDateRange.value.startDate && dueDate <= selectedDateRange.value.endDate;
          }
          return true; // Show all tasks if no range selected
        default:
          return true;
      }
    });
  }

  return filtered;
});

const todoTasks = computed(() => {
  const filtered = filteredTasks.value.filter((t: Task) => t.status && t.status.toLowerCase() === 'pending');
  console.log('Todo tasks:', filtered.length, 'tasks:', filtered.map((t: Task) => ({ id: t.id, title: t.title, status: t.status })));
  return filtered;
});

const inProgressTasks = computed(() => {
  const filtered = filteredTasks.value.filter((t: Task) => t.status && t.status.toLowerCase() === 'in_progress');
  console.log('In Progress tasks:', filtered.length, 'tasks:', filtered.map((t: Task) => ({ id: t.id, title: t.title, status: t.status })));
  return filtered;
});

const doneTasks = computed(() => {
  const filtered = filteredTasks.value.filter((t: Task) => t.status && t.status.toLowerCase() === 'completed');
  console.log('Done tasks:', filtered.length, 'tasks:', filtered.map((t: Task) => ({ id: t.id, title: t.title, status: t.status })));
  return filtered;
});

const closedTasks = computed(() => {
  const filtered = filteredTasks.value.filter((t: Task) => t.status && t.status.toLowerCase() === 'closed');
  console.log('Closed tasks:', filtered.length, 'tasks:', filtered.map((t: Task) => ({ id: t.id, title: t.title, status: t.status })));
  return filtered;
});

// Computed để lấy danh sách unique languages từ all tasks
const availableLanguages = computed(() => {
  const languages = new Set<string>();
  filteredTasks.value.forEach((task: Task) => {
    if (task.language) {
      languages.add(task.language);
    }
  });
  const result = Array.from(languages).sort();
  console.log('Available languages:', result);
  console.log('Tasks with languages:', filteredTasks.value.map(t => ({ id: t.id, title: t.title, language: t.language })));
  return result;
});

// Check if we need to show language grouping (more than 1 language)
const shouldShowLanguageGrouping = computed(() => {
  const shouldShow = availableLanguages.value.length > 1;
  console.log('Should show language grouping:', shouldShow, 'Languages count:', availableLanguages.value.length);
  return shouldShow;
});



// Function to clean task title (remove language suffix)
function getCleanTaskTitle(title: string): string {
  // Remove language suffix like "(EN)", "(BN)", etc.
  return title.replace(/\s*\([A-Z]{2}\)$/, '');
}

// Group tasks by language for each status
const todoTasksByLanguage = computed(() => {
  if (!shouldShowLanguageGrouping.value) {
    return { default: todoTasks.value };
  }

  // Always show all available languages, even if no tasks
  const grouped = new Map<string, Task[]>();

  // Initialize all available languages with empty arrays
  availableLanguages.value.forEach(language => {
    grouped.set(language, []);
  });

  // Add tasks to their respective languages
  todoTasks.value.forEach((task: Task) => {
    const language = task.language || 'Unknown';
    if (!grouped.has(language)) {
      grouped.set(language, []);
    }
    grouped.get(language)!.push(task);
  });

  const result = Object.fromEntries(grouped);
  console.log('🔄 Todo tasks by language updated:', result);
  return result;
});

const inProgressTasksByLanguage = computed(() => {
  if (!shouldShowLanguageGrouping.value) {
    return { default: inProgressTasks.value };
  }

  // Always show all available languages, even if no tasks
  const grouped = new Map<string, Task[]>();

  // Initialize all available languages with empty arrays
  availableLanguages.value.forEach((language: string) => {
    grouped.set(language, []);
  });

  // Add tasks to their respective languages
  inProgressTasks.value.forEach((task: Task) => {
    const language = task.language || 'Unknown';
    if (!grouped.has(language)) {
      grouped.set(language, []);
    }
    grouped.get(language)!.push(task);
  });

  const result = Object.fromEntries(grouped);
  console.log('🔄 InProgress tasks by language updated:', result);
  return result;
});

const doneTasksByLanguage = computed(() => {
  if (!shouldShowLanguageGrouping.value) {
    return { default: doneTasks.value };
  }

  // Always show all available languages, even if no tasks
  const grouped = new Map<string, Task[]>();

  // Initialize all available languages with empty arrays
  availableLanguages.value.forEach((language: string) => {
    grouped.set(language, []);
  });

  // Add tasks to their respective languages
  doneTasks.value.forEach((task: Task) => {
    const language = task.language || 'Unknown';
    if (!grouped.has(language)) {
      grouped.set(language, []);
    }
    grouped.get(language)!.push(task);
  });

  const result = Object.fromEntries(grouped);
  console.log('🔄 Done tasks by language updated:', result);
  return result;
});

// --- Add new computed for language grouping within columns ---
const tasksByLanguageAndStatus = computed(() => {
  // { [language]: { todo: Task[], inProgress: Task[], done: Task[] } }
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

// Crowdin-style: Only show languages that have tasks in each column
const languagesInTodoColumn = computed(() => {
  const languages = new Set<string>();
  todoTasks.value.forEach((task: Task) => {
    if (task.language) languages.add(task.language);
  });
  return Array.from(languages).sort();
});

const languagesInProgressColumn = computed(() => {
  const languages = new Set<string>();
  inProgressTasks.value.forEach((task: Task) => {
    if (task.language) languages.add(task.language);
  });
  return Array.from(languages).sort();
});

const languagesInDoneColumn = computed(() => {
  const languages = new Set<string>();
  doneTasks.value.forEach((task: Task) => {
    if (task.language) languages.add(task.language);
  });
  return Array.from(languages).sort();
});



// State for collapsed language sections in swimlanes
const collapsedLanguagesInSwimlanes = ref<Set<string>>(new Set());

// Function to toggle language section collapse in swimlanes
function toggleLanguageCollapse(language: string) {
  if (collapsedLanguagesInSwimlanes.value.has(language)) {
    collapsedLanguagesInSwimlanes.value.delete(language);
  } else {
    collapsedLanguagesInSwimlanes.value.add(language);
  }
}

// Function to check if language is collapsed in swimlanes
function isLanguageCollapsed(language: string): boolean {
  return collapsedLanguagesInSwimlanes.value.has(language);
}

const selectedTaskFileName = computed(() => {
  if (!selectedTask.value?.fileId) return '';
  return getFileName(selectedTask.value.fileId);
});

const selectedTaskTruncatedFileName = computed(() => {
  if (!selectedTask.value?.fileId) return '';
  return truncateFileName(getFileName(selectedTask.value.fileId));
});

// Computed property để lấy tên cột khi drag over
const dragOverColumnName = computed(() => {
  if (!dragOverColumn.value) return '';

  switch (dragOverColumn.value) {
    case 'todo':
      return 'To Do';
    case 'inProgress':
      return 'In Progress';
    case 'done':
      return 'Done';
    default:
      return '';
  }
});

// Thêm ref để lưu file parts data
const filePartsData = ref<Map<string, any[]>>(new Map());
const currentPartInfo = ref<{partNumber: number, stringCount: number} | null>(null);

// Function để load file parts data
async function loadFilePartsData(fileId: string) {
  if (filePartsData.value.has(fileId)) {
    return filePartsData.value.get(fileId);
  }

  try {
    const parts = await taskService.getFileParts(props.projectId, props.branchId || '', fileId);
    filePartsData.value.set(fileId, parts);
    return parts;
  } catch (err) {
    console.error('Failed to load file parts:', err);
    return [];
  }
}

// Function để tính toán progress percentage dựa trên status (fallback)
function calculateTaskProgress(task: Task): number {
  switch (task.status?.toLowerCase()) {
    case 'pending':
      return 0;
    case 'in_progress':
      return 50; // Fallback value
    case 'completed':
      return 100;
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
}

// Function để lấy progress thực tế từ Crowdin API
async function getCrowdinProgress(task: Task): Promise<number> {
  try {
    const progress = await taskService.getTaskProgress(task.id);
    console.log('Crowdin progress for task:', task.id, progress);
    return progress.percentage;
  } catch (error) {
    console.error('Error getting Crowdin progress:', error);
    // Fallback to status-based calculation
    return calculateTaskProgress(task);
  }
}

// Reactive state để lưu progress thực tế
const taskProgressData = ref<Map<string, { total: number; translated: number; percentage: number }>>(new Map());

// Function để load progress cho task
async function loadTaskProgress(taskId: string) {
  if (taskProgressData.value.has(taskId)) {
    return taskProgressData.value.get(taskId);
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

// Reactive refs để lưu progress của selected task
const selectedTaskProgress = ref(0);
const selectedTaskProgressText = ref('0%');
const selectedTaskProgressLoading = ref(false);

// Function để update progress cho selected task
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

    // Chỉ hiển thị progress percentage, không hiển thị status text
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

// Drag & Drop functionality
const draggedTask = ref<Task | null>(null);
const isDragging = ref(false);
const draggedIndex = ref<number>(-1);
const dragOverColumn = ref<string | null>(null);

function handleDragStart(event: DragEvent, task: Task, index: number) {
  console.log('Drag start for task:', task.id, task.title);

  if (!event.dataTransfer) {
    console.log('No dataTransfer available');
    return;
  }

  draggedTask.value = task;
  draggedIndex.value = index;
  isDragging.value = true;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', task.id);

  // Add visual feedback
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '0.5';
  }

  console.log('Drag started successfully for task:', task.id);
}

function handleDragEnd(event: DragEvent) {
  isDragging.value = false;
  draggedTask.value = null;

  // Remove visual feedback
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '1';
  }
}

function handleDragOver(event: DragEvent, columnType: 'todo' | 'inProgress' | 'done') {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';

  // Add visual feedback to drop zone
  const target = event.currentTarget as HTMLElement;
  if (target && !target.classList.contains('drag-over')) {
    target.classList.add('drag-over');
  }

  // Set the column being dragged over
  dragOverColumn.value = columnType;
  console.log('Drag over column:', columnType);
}

function handleDragLeave(event: DragEvent) {
  // Remove visual feedback when leaving drop zone
  const target = event.currentTarget as HTMLElement;
  if (target) {
    target.classList.remove('drag-over');
  }

  // Clear the drag over column
  dragOverColumn.value = null;
}

async function handleDrop(event: DragEvent, targetColumn: 'todo' | 'inProgress' | 'done') {
  event.preventDefault();

  // Remove visual feedback
  const target = event.currentTarget as HTMLElement;
  if (target) {
    target.classList.remove('drag-over');
  }

  // Clear drag over column
  dragOverColumn.value = null;

  if (!draggedTask.value) {
    console.log('No dragged task found');
    return;
  }

  console.log('Dropping task:', draggedTask.value.id, 'to column:', targetColumn);

  // Get drop position (you could enhance this to detect exact position)
  const dropIndex = getDropIndex(event, targetColumn);

  // Actually move the task to the target column
  const taskToMove = draggedTask.value;
  await moveTaskToColumn(taskToMove, targetColumn, dropIndex);

  console.log(`Task ${taskToMove.id} moved to ${targetColumn} column at position ${dropIndex}`);
}

async function moveTaskToColumn(task: Task, targetColumn: 'todo' | 'inProgress' | 'done', dropIndex: number) {
  // Update task status based on target column (this is what Crowdin actually does)
  // When you drag a task to a different column, it changes the status
  // Note: Database uses lowercase values: 'pending', 'in_progress', 'completed'
  let newStatus: 'pending' | 'in_progress' | 'completed';
  switch (targetColumn) {
    case 'todo':
      newStatus = 'pending';
      break;
    case 'inProgress':
      newStatus = 'in_progress';
      break;
    case 'done':
      newStatus = 'completed';
      break;
  }

  // Update task status in database
  try {
    console.log('Sending API request:', { taskId: task.id, newStatus });
    await taskService.updateTask(task.id, { status: newStatus });

    // Update the task status in the local array immediately for smooth UX
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === task.id);
    if (taskIndex !== -1) {
      // Create a new task object to trigger reactivity
      const updatedTask = { ...tasks.value[taskIndex], status: newStatus };
      tasks.value[taskIndex] = updatedTask;
      console.log('Task status updated in local array:', updatedTask);
    }

    // Clear cached progress data for this task to force refresh
    taskProgressData.value.delete(task.id);

    // If this is the currently selected task, refresh its progress
    if (selectedTask.value?.id === task.id) {
      await updateSelectedTaskProgress();
    }

    console.log('Task moved successfully:', {
      taskId: task.id,
      taskTitle: task.title,
      targetColumn: targetColumn,
      newStatus: newStatus,
      dropIndex: dropIndex
    });
  } catch (error) {
    console.error('Failed to update task status:', error);
    // If API call fails, revert the local change
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === task.id);
    if (taskIndex !== -1) {
      const originalTask = { ...tasks.value[taskIndex], status: task.status };
      tasks.value[taskIndex] = originalTask;
    }
  }
}

function getDropIndex(event: DragEvent, targetColumn: 'todo' | 'inProgress' | 'done'): number {
  // Simple implementation - in real app you'd calculate exact position
  // based on mouse position relative to other task cards
  return 0; // For now, just drop at the top
}





// Function để đóng modal xóa task
function closeDeleteModal() {
  showDeleteModal.value = false;
  taskToDelete.value = null;
  isDeleting.value = false;
  // Remove body class when modal closes
  document.body.classList.remove('modal-open');

  // Close task detail view if it's the same task
  if (taskToDelete.value && selectedTask.value?.id === taskToDelete.value.id) {
    selectedTask.value = null;
  }

  // Close task action menu
  closeTaskActionMenu();
}

// Function để mở task action menu
function openTaskActionMenu(event: MouseEvent, task: Task) {
  event.stopPropagation();
  currentTaskForAction.value = task;
  taskActionMenuPosition.value = { x: event.clientX, y: event.clientY };
  showTaskActionMenu.value = true;
}

// Function để đóng task action menu
function closeTaskActionMenu() {
  showTaskActionMenu.value = false;
  currentTaskForAction.value = null;
}

// Function để mở modal xóa task
function openDeleteModal() {
  if (!currentTaskForAction.value) return;
  taskToDelete.value = currentTaskForAction.value;
  showDeleteModal.value = true;
  closeTaskActionMenu();
  // Add body class when modal opens
  document.body.classList.add('modal-open');
}

// Function để edit task
function editTask() {
  console.log('🔧 Edit task function called');
  if (!currentTaskForAction.value) {
    console.log('❌ No current task for action');
    return;
  }

  console.log('📝 Current task for action:', currentTaskForAction.value);

  // Close task detail view first
  selectedTask.value = null;

  // Prepare data for edit inline form
  const editData = {
    projectId: props.projectId,
    branchId: props.branchId || '',
    projectMembers: props.projectMembers,
    projectGroups: props.projectGroups,
    projectFiles: projectFiles.value,
    projectTargetLanguages: props.project?.targetLanguages || [],
    task: currentTaskForAction.value // Pass the entire task object
  };

  console.log('📋 Edit data prepared:', editData);

  editTaskInlineData.value = editData;
  showEditTaskInline.value = true;

  console.log('✅ Edit form state set:', {
    showEditTaskInline: showEditTaskInline.value,
    editTaskInlineData: editTaskInlineData.value
  });

  closeTaskActionMenu();
}

// Function để close task
function closeTaskFromMenu() {
  if (!currentTaskForAction.value) return;
  closeTask(currentTaskForAction.value);
  // closeTaskActionMenu() sẽ được gọi trong closeTask function
}

// Function để xóa task
async function deleteSelectedTask() {
  if (!taskToDelete.value) return;

  isDeleting.value = true;
  const taskId = taskToDelete.value.id;
  const taskTitle = taskToDelete.value.title;

  try {
    console.log('Attempting to delete task:', taskId, taskTitle);

    // Call API to delete task
    await taskService.deleteTask(taskId);
    console.log('Delete API call completed');

    // Close modal first
    closeDeleteModal();

    // Close task detail view to return to board
    selectedTask.value = null;

    // Close task action menu
    closeTaskActionMenu();

    // Reload tasks from server to get actual state
    console.log('Reloading tasks from server...');
    await reloadTasks();

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Task Deleted',
      detail: 'Task has been successfully deleted.',
      life: 3000
    });

    console.log('Task deletion process completed');
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    console.error('Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status
    });

    // Close modal
    closeDeleteModal();

    // Close task action menu
    closeTaskActionMenu();

    // Reload tasks to check actual server state
    console.log('Reloading tasks to check actual server state...');
    await reloadTasks();

    // Check if task was actually deleted
    const taskStillExists = await checkTaskExists(taskId);

    if (taskStillExists) {
      // Task still exists, show error
      toast.add({
        severity: 'error',
        summary: 'Delete Failed',
        detail: 'Failed to delete task. Please try again.',
        life: 4000
      });
    } else {
      // Task was actually deleted, show success
      // Close task detail view to return to board
      selectedTask.value = null;

      // Close task action menu
      closeTaskActionMenu();

      toast.add({
        severity: 'success',
        summary: 'Task Deleted',
        detail: 'Task has been successfully deleted.',
        life: 3000
      });
    }
  } finally {
    isDeleting.value = false;
  }
}

// Function để update part info khi selectedTask thay đổi
async function updatePartInfo() {
  if (!selectedTask.value?.fileId || selectedTask.value?.filePart === undefined) {
    currentPartInfo.value = null;
    return;
  }

  const parts = await loadFilePartsData(selectedTask.value.fileId);
  const part = parts.find((p: any) => p.part === selectedTask.value?.filePart);

  if (!part) {
    currentPartInfo.value = null;
    return;
  }

  currentPartInfo.value = {
    partNumber: selectedTask.value.filePart + 1,
    stringCount: part.stringCount
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(date: string) {
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

function getDaysRemaining(dueDate: string): string {
  if (!dueDate) return '';
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d overdue`;
  } else if (diffDays === 0) {
    return '0d';
  } else {
    return `${diffDays}d`;
  }
}

function getAvatarUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return 'http://localhost:3000' + url;
}

function closeFilterDropdown() {
  // Filter dropdown logic removed
}

function updateFilter(filterType: string, value: string) {
  selectedFilters.value[filterType as keyof typeof selectedFilters.value] = value;
}

function clearAllFilters() {
  selectedFilters.value = {
    assignee: 'All users',
    createdBy: 'All users',
    file: 'All files',
    dueDate: 'All'
  };
}

function toggleFilterSelect(filterType: string) {
  if (activeSubDropdown.value === filterType) {
    activeSubDropdown.value = null;
  } else {
    activeSubDropdown.value = filterType;
  }
}

function toggleCustomSelect(selectType: string) {
  if (activeCustomSelect.value === selectType) {
    activeCustomSelect.value = null;
  } else {
    activeCustomSelect.value = selectType;
  }
}

function selectCustomOption(filterType: string, value: string) {
  selectedFilters.value[filterType as keyof typeof selectedFilters.value] = value;
  activeCustomSelect.value = null;
}

function selectFilterOption(filterType: string, value: string) {
  selectedFilters.value[filterType as keyof typeof selectedFilters.value] = value;

  // Show date picker when Custom Range is selected, keep dropdown open
  if (filterType === 'dueDate' && value === 'Custom Range') {
    showDatePicker.value = true;
    // Keep dropdown open to show date picker
    // activeSubDropdown.value remains 'dueDate'
  } else {
    showDatePicker.value = false;
    activeSubDropdown.value = null;
  }
}

// Calendar functions
function selectDate(date: Date) {
  if (!selectedDateRange.value.startDate || (selectedDateRange.value.startDate && selectedDateRange.value.endDate)) {
    // Start new range
    selectedDateRange.value.startDate = date;
    selectedDateRange.value.endDate = null;
  } else {
    // Complete range
    if (date >= selectedDateRange.value.startDate!) {
      selectedDateRange.value.endDate = date;
    } else {
      selectedDateRange.value.endDate = selectedDateRange.value.startDate;
      selectedDateRange.value.startDate = date;
    }

    // Auto-apply filter when both dates are selected
    if (selectedDateRange.value.startDate && selectedDateRange.value.endDate) {
      // Close dropdown after a short delay to show selection
      setTimeout(() => {
        activeSubDropdown.value = null;
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
  return selectedDateRange.value.startDate && date.getTime() === selectedDateRange.value.startDate.getTime();
}

function isDateEnd(date: Date): boolean {
  return selectedDateRange.value.endDate && date.getTime() === selectedDateRange.value.endDate.getTime();
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

function applyDateRange() {
  if (selectedDateRange.value.startDate && selectedDateRange.value.endDate) {
    showDatePicker.value = false;
    activeSubDropdown.value = null;
  }
}

function clearDateRange() {
  selectedDateRange.value.startDate = null;
  selectedDateRange.value.endDate = null;
  selectedFilters.value.dueDate = 'All';
  showDatePicker.value = false;
  activeSubDropdown.value = null;
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

onMounted(() => {
  console.log('ProjectTaskTab mounted, loading tasks and files...');
  loadTasks();
  loadProjectFiles();

  // Add click outside listener for filter dropdown
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-filter-container') && !target.closest('.filter-section') && !target.closest('.date-picker-calendar') && !target.closest('.filter-dropdown-menu') && !target.closest('.custom-select-wrapper')) {
      activeSubDropdown.value = null;
      activeCustomSelect.value = null;
      showDatePicker.value = false;
    }
  });

  // Add click outside listener for task action menu
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.task-action-menu') && !target.closest('.task-action-menu-btn')) {
      closeTaskActionMenu();
    }
  });

  // Add ESC key listener for task action menu
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && showTaskActionMenu.value) {
      closeTaskActionMenu();
    }
  });
});

onBeforeUnmount(() => {
  // Không clear data để giữ lại khi re-mount
});

// Watch cho projectId và branchId thay đổi - giống như ProjectTranslationTab
watch([() => props.projectId, () => props.branchId], () => {
  console.log('Project ID or Branch ID changed, reloading tasks and files...');
  loadTasks();
  loadProjectFiles();
});

watch(() => selectedTask.value, async (task: Task | null) => {
  if (task && task.createdBy) {
    console.log('createdBy:', task.createdBy);
  }
  // Update part info khi task thay đổi
  updatePartInfo();
  // Update progress khi task thay đổi
  await updateSelectedTaskProgress();
});

// Expose methods for parent component
defineExpose({
  reloadTasks,
  loadProjectFiles
});

// Debug: Log component lifecycle
console.log('ProjectTaskTab component script setup executed');

// Thêm hàm getFileIcon
function getFileIcon(fileName: string) {
  if (!fileName) return '📄';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return '📄';
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx'].includes(ext)) return '📗';
  if (['txt', 'md'].includes(ext)) return '📄';
  return '📄';
}

async function closeTask(task: Task) {
  try {
    console.log('Closing task:', task.id, task.title);

    // Call API to close task
    await taskService.closeTask(task.id);

    // Update task status in local array
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === task.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = { ...tasks.value[taskIndex], status: 'closed' };
    }

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Task Closed',
      detail: `Task "${task.title}" has been closed successfully.`,
      life: 3000
    });

    // Close task action menu
    closeTaskActionMenu();

    // Quay về board task sau khi đóng
    selectedTask.value = null;

    console.log('Task closed successfully:', task.id);
  } catch (error: any) {
    console.error('Failed to close task:', error);

    // Show error message
    toast.add({
      severity: 'error',
      summary: 'Close Failed',
      detail: error.response?.data?.message || 'Failed to close task. Please try again.',
      life: 4000
    });
  }
}

// Function để mở lại task đã đóng
async function reopenTask(task: Task) {
  try {
    console.log('Reopening task:', task.id, task.title);

    // Call API to reopen task
    await taskService.reopenTask(task.id);

    // Update task status in local array
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === task.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = { ...tasks.value[taskIndex], status: 'pending' };
    }

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Task Reopened',
      detail: `Task "${task.title}" has been reopened successfully.`,
      life: 3000
    });

    // Close task action menu
    closeTaskActionMenu();

    console.log('Task reopened successfully:', task.id);
  } catch (error: any) {
    console.error('Failed to reopen task:', error);

    // Show error message
    toast.add({
      severity: 'error',
      summary: 'Reopen Failed',
      detail: error.response?.data?.message || 'Failed to reopen task. Please try again.',
      life: 4000
    });
  }
}

// Function để lấy text status dựa trên trạng thái của task
function getStatusText(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'To do';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Done';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

// Edit task inline form state
const showEditTaskInline = ref(false);
const editTaskInlineData = ref(null);



const handleTaskUpdatedInline = (updatedTask: Task) => {
  console.log('✅ Task updated inline, refreshing tasks:', updatedTask);
  console.log('✅ Updated task due date:', updatedTask.dueDate);
  console.log('✅ Selected task before update:', selectedTask.value?.dueDate);

  // Update the task in the current list
  const taskIndex = tasks.value.findIndex(t => t.id === updatedTask.id);
  if (taskIndex !== -1) {
    tasks.value[taskIndex] = updatedTask;
  }

  // Update selectedTask nếu là task đang edit
  if (selectedTask.value && selectedTask.value.id === updatedTask.id) {
    console.log('🔄 Updating selectedTask with new data');
    selectedTask.value = updatedTask;
    console.log('🔄 Selected task after update:', selectedTask.value.dueDate);
  } else {
    // Nếu đang ở form edit, sau khi update thì chuyển sang detail của task đó
    selectedTask.value = updatedTask;
  }

  // Refresh tasks to ensure consistency
  loadTasks();

  // Close inline edit form
  showEditTaskInline.value = false;
  editTaskInlineData.value = null;

  // Show success message
  toast.add({
    severity: 'success',
    summary: 'Task Updated',
    detail: 'Task has been successfully updated.',
    life: 3000
  });
};

const closeEditTaskInline = () => {
  showEditTaskInline.value = false;
  editTaskInlineData.value = null;
};

</script>

<template>
  <div class="kanban-tab-wrapper">
    <!-- Task Detail View -->
    <div v-if="selectedTask" class="task-detail-view">
      <div class="task-detail-header-row">
        <button class="back-btn" @click="selectedTask = null">← Board</button>
        <div class="task-action-menu-wrapper">
          <button
            class="task-action-menu-btn"
            @click="openTaskActionMenu($event, selectedTask)"
            title="Task actions"
          >
            <i class="pi pi-ellipsis-v"></i>
          </button>
        </div>
      </div>
      <div class="task-detail-header">
        <span class="task-detail-id">#{{ selectedTask.id }}</span>
        <span class="task-detail-title">{{ getCleanTaskTitle(selectedTask.title) }}</span>
      </div>
      <div class="task-detail-meta-box">
        <div class="task-detail-meta-col">
          <div class="meta-label">DETAILS</div>
          <div>Language: <b>{{ selectedTask.language ? getLanguageName(selectedTask.language) : 'Not specified' }}</b></div>
          <div class="progress-bar-bg">
            <div v-if="selectedTaskProgressLoading" class="progress-loading">
              <i class="pi pi-spin pi-spinner"></i> Loading...
            </div>
            <div v-else class="progress-bar" :style="{width: selectedTaskProgress + '%'}"></div>
          </div>
          <div class="progress-text">{{ selectedTaskProgressText }}</div>
        </div>
        <div class="task-detail-meta-col">
          <div class="meta-label">DATES</div>
          <div>Created: {{ formatDate(selectedTask.createdAt) }}</div>
          <div>Modified: {{ formatDate(selectedTask.createdAt) }}</div>
          <div v-if="selectedTask.startedAt">Started: {{ formatDateTime(selectedTask.startedAt) }}</div>
          <div v-if="selectedTask.completedAt">Resolved at: {{ formatDateTime(selectedTask.completedAt) }}</div>
          <div v-else>Not resolved yet</div>
          <div v-if="selectedTask.dueDate">
            <span>Due date:</span>
            <span :class="{ 'overdue': isOverdue(selectedTask.dueDate) }">
              <span v-if="isOverdue(selectedTask.dueDate)">⚠️</span>
              {{ formatDateTime(selectedTask.dueDate) }}
            </span>
          </div>
          <div v-else>No due date</div>
        </div>
        <div class="task-detail-meta-col">
          <div class="meta-label">RESOURCES</div>
          <div v-if="selectedTask.fileId">
            <div class="file-name-container" :title="selectedTaskFileName">
              File: <b>{{ selectedTaskTruncatedFileName }}</b>
            </div>
            <div v-if="selectedTask.filePart !== undefined">
              Part: <b>{{ currentPartInfo?.partNumber }}</b> ({{ currentPartInfo?.stringCount }})
            </div>
            <div v-else>
              Parts: <b>All parts</b>
            </div>
          </div>
          <div v-else>
            <div>Files: <b>0</b></div>
          </div>
          <div>Words: 0</div>
        </div>
        <div class="task-detail-meta-col">
          <div class="meta-label">AUTHOR</div>
          <div class="author-avatar">
            <img v-if="selectedTask.createdBy.avatarUrl" :src="getAvatarUrl(selectedTask.createdBy.avatarUrl)" alt="avatar" />
            <span v-else>{{ selectedTask.createdBy.fullName ? selectedTask.createdBy.fullName[0] : selectedTask.createdBy.username[0] }}</span>
          </div>
          <div><b>{{ selectedTask.createdBy.fullName }}</b> {{ selectedTask.createdBy.username }}</div>
        </div>
      </div>
      <div class="task-detail-members">
        <div class="members-title">Members</div>
        <table class="members-table">
          <thead>
          <tr>
            <th>Project members</th>
            <th>Assigned strings</th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="selectedTask.assignedTo">
            <td>
              <div class="assignee-info">
                <img v-if="selectedTask.assignedTo.avatarUrl" :src="getAvatarUrl(selectedTask.assignedTo.avatarUrl)" :alt="selectedTask.assignedTo.fullName" class="assignee-avatar" />
                <span v-else class="assignee-avatar-placeholder">{{ selectedTask.assignedTo.fullName ? selectedTask.assignedTo.fullName[0] : selectedTask.assignedTo.username[0] }}</span>
                <span class="assignee-name">{{ selectedTask.assignedTo.fullName || selectedTask.assignedTo.username }}</span>
              </div>
            </td>
            <td>
              {{ currentPartInfo?.stringCount !== undefined ? currentPartInfo.stringCount : (selectedTask.fileId ? (filePartsData.value.get(selectedTask.fileId)?.reduce((sum: number, p: { stringCount: number }) => sum + (p.stringCount || 0), 0) ?? '-') : '-') }}
            </td>
          </tr>
          <tr v-else>
            <td colspan="2" class="empty-row">Nothing to display</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Task View -->
    <div v-else-if="showCreateForm" class="create-task-view">
      <div class="create-task-header">
        <button class="back-btn" @click="cancelCreateTask">← Back to Board</button>
      </div>
      <CreateTaskDialog
        :visible="true"
        :project-id="projectId"
        :project-members="projectMembers"
        :project-groups="projectGroups"
        :branch-id="branchId"
        :project-files="projectFiles"
        :project-target-languages="project?.targetLanguages || []"
        :inline="true"
        @close="cancelCreateTask"
        @success="handleTaskCreated"
      />
    </div>

    <!-- Edit Task View -->
    <div v-else-if="showEditTaskInline" class="edit-task-view">
      <div class="edit-task-header">
        <button class="back-btn" @click="closeEditTaskInline">← Back to Task Detail</button>
      </div>
      <div v-if="editTaskInlineData">
        <EditTaskDialog
          :visible="true"
          :project-id="editTaskInlineData.projectId"
          :project-members="editTaskInlineData.projectMembers"
          :project-groups="editTaskInlineData.projectGroups"
          :branch-id="editTaskInlineData.branchId"
          :project-files="editTaskInlineData.projectFiles"
          :project-target-languages="editTaskInlineData.projectTargetLanguages"
          :edit-task="editTaskInlineData.task"
          :inline="true"
          @close="closeEditTaskInline"
          @success="handleTaskUpdatedInline"
        />
      </div>
      <div v-else>
        <p>Loading edit form...</p>
      </div>
    </div>



    <!-- Kanban Board View -->
    <div v-else class="kanban-board-view">
      <!-- Tabs for Board and All Tasks -->
      <div class="task-tabs">
        <div class="tabs-left">
          <button
            :class="['tab-btn', { active: activeTab === 'board' }]"
            @click="activeTab = 'board'"
          >
            Board
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'all' }]"
            @click="activeTab = 'all'"
          >
            All Tasks
          </button>
        </div>
        <div class="tabs-right">
          <button v-if="canCreateTask" @click="showCreateTaskForm" class="create-task-btn-header">
            <i class="pi pi-plus"></i>
            Create Task
          </button>
        </div>
      </div>

      <!-- Board View -->
      <div v-if="activeTab === 'board'">
        <!-- Search and Filter Bar -->
        <div class="search-filter-container">
          <!-- Search Section -->
          <div class="search-section">
            <div class="search-input-wrapper">
              <i class="pi pi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                placeholder="Search tasks..."
                class="search-input"
              />
            </div>
            <!-- Filter Button -->
            <button @click="toggleFilters" class="filter-btn" :class="{ active: showFilters }">
              <i class="pi pi-filter"></i>
              Filters
            </button>
          </div>

          <!-- Filter Section -->
          <div v-if="showFilters" class="filter-section">
            <!-- Custom Assignee Select -->
            <div class="custom-select-wrapper">
              <div
                class="custom-select-display filter-select"
                @click="toggleCustomSelect('assignee')"
                :class="{ active: activeCustomSelect === 'assignee' }"
              >
                Assignee: {{ selectedFilters.assignee }}
                <i class="pi pi-chevron-down custom-select-arrow"></i>
              </div>
              <div v-if="activeCustomSelect === 'assignee'" class="custom-select-dropdown">
                <div
                  v-for="option in assigneeOptions"
                  :key="option"
                  class="custom-select-option"
                  :class="{ selected: selectedFilters.assignee === option }"
                  @click="selectCustomOption('assignee', option)"
                >
                  {{ option }}
                </div>
              </div>
            </div>

            <!-- Custom Created By Select -->
            <div class="custom-select-wrapper">
              <div
                class="custom-select-display filter-select"
                @click="toggleCustomSelect('createdBy')"
                :class="{ active: activeCustomSelect === 'createdBy' }"
              >
                Created by: {{ selectedFilters.createdBy }}
                <i class="pi pi-chevron-down custom-select-arrow"></i>
              </div>
              <div v-if="activeCustomSelect === 'createdBy'" class="custom-select-dropdown">
                <div
                  v-for="option in createdByOptions"
                  :key="option"
                  class="custom-select-option"
                  :class="{ selected: selectedFilters.createdBy === option }"
                  @click="selectCustomOption('createdBy', option)"
                >
                  {{ option }}
                </div>
              </div>
            </div>

            <!-- Custom File Select -->
            <div class="custom-select-wrapper">
              <div
                class="custom-select-display filter-select"
                @click="toggleCustomSelect('file')"
                :class="{ active: activeCustomSelect === 'file' }"
              >
                File: {{ selectedFilters.file }}
                <i class="pi pi-chevron-down custom-select-arrow"></i>
              </div>
              <div v-if="activeCustomSelect === 'file'" class="custom-select-dropdown">
                <div
                  v-for="option in fileOptions"
                  :key="option"
                  class="custom-select-option"
                  :class="{ selected: selectedFilters.file === option }"
                  @click="selectCustomOption('file', option)"
                >
                  {{ option }}
                </div>
              </div>
            </div>
            <div class="filter-dropdown-wrapper">
              <button
                @click="toggleFilterSelect('dueDate')"
                class="filter-dropdown-btn"
                :class="{ active: activeSubDropdown === 'dueDate' }"
              >
                Due date: {{ selectedFilters.dueDate }}
                <i class="pi pi-chevron-down filter-arrow"></i>
              </button>
              <div v-if="activeSubDropdown === 'dueDate'" class="filter-dropdown-menu">
                <div
                  v-for="option in dueDateOptions"
                  :key="option.value"
                  class="filter-dropdown-option"
                  :class="{ selected: selectedFilters.dueDate === option.value }"
                  @click="selectFilterOption('dueDate', option.value)"
                >
                  {{ option.label }}
                </div>
                <!-- Clear Selection Option -->
                <div
                  v-if="selectedFilters.dueDate === 'Custom Range' && selectedDateRange.startDate"
                  class="filter-dropdown-option clear-option"
                  @click="clearDateRange"
                >
                  <i class="pi pi-times"></i>
                  Clear Selection
                </div>
                <!-- Date Picker for Custom Range -->
                <div v-if="selectedFilters.dueDate === 'Custom Range'" class="date-picker-container">
                  <div class="date-picker-calendar">
                    <div class="calendar-header">
                      <button @click="navigateMonth('prev')" class="calendar-nav-btn">
                        <i class="pi pi-chevron-left"></i>
                      </button>
                      <div class="calendar-months-title">
                        <span class="month-title">{{ formatMonth(currentMonth) }}</span>
                        <span class="month-title">{{ formatMonth(nextMonth) }}</span>
                      </div>
                      <button @click="navigateMonth('next')" class="calendar-nav-btn">
                        <i class="pi pi-chevron-right"></i>
                      </button>
                    </div>
                    <div class="calendar-grid-container">
                      <!-- First Month -->
                      <div class="calendar-month">
                        <div class="calendar-weekdays">
                          <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
                        </div>
                        <div class="calendar-days">
                          <div
                            v-for="date in getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())"
                            :key="date.getTime()"
                            class="calendar-day"
                            :class="{
                              'other-month': date.getMonth() !== currentMonth.getMonth(),
                              'selected': isDateInRange(date),
                              'start-date': isDateStart(date),
                              'end-date': isDateEnd(date),
                              'in-range': isDateInRange(date) && !isDateStart(date) && !isDateEnd(date)
                            }"
                            @click="selectDate(date)"
                          >
                            {{ date.getDate() }}
                          </div>
                        </div>
                      </div>
                      <!-- Second Month -->
                      <div class="calendar-month">
                        <div class="calendar-weekdays">
                          <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
                        </div>
                        <div class="calendar-days">
                          <div
                            v-for="date in getDaysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())"
                            :key="date.getTime()"
                            class="calendar-day"
                            :class="{
                              'other-month': date.getMonth() !== nextMonth.getMonth(),
                              'selected': isDateInRange(date),
                              'start-date': isDateStart(date),
                              'end-date': isDateEnd(date),
                              'in-range': isDateInRange(date) && !isDateStart(date) && !isDateEnd(date)
                            }"
                            @click="selectDate(date)"
                          >
                            {{ date.getDate() }}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
            <button @click="clearFilters" class="clear-filter-btn">
              <i class="pi pi-times"></i>
              Clear
            </button>
          </div>
        </div>

        <!-- Global Empty State -->
        <div v-if="loading" class="global-loading-state">
          <div class="loading-icon">⏳</div>
          <div class="loading-text">Loading tasks...</div>
        </div>

        <div v-else-if="filteredTasks.length === 0" class="global-empty-state">
          <div class="global-empty-icon">⏱️</div>
          <div class="global-empty-text">No tasks yet</div>
          <div class="global-empty-subtext">Create your first task to get started with this project</div>
          <button v-if="canCreateTask" @click="showCreateTaskForm" class="global-empty-btn">
            <i class="pi pi-plus"></i>
            Create Task
          </button>
        </div>

        <!-- Kanban Board with Language Grouping (Crowdin style) -->
        <div v-else>
          <!-- Always show status headers at the top like Crowdin -->
          <div class="kanban-status-header-row">
            <div class="kanban-status-card todo">
              <div class="status-bar todo"></div>
              <span class="status-title">To Do</span>
              <span class="status-count" v-if="todoTasks.length">{{ todoTasks.length }}</span>
            </div>
            <div class="kanban-status-card inprogress">
              <div class="status-bar inprogress"></div>
              <span class="status-title">In Progress</span>
              <span class="status-count" v-if="inProgressTasks.length">{{ inProgressTasks.length }}</span>
            </div>
            <div class="kanban-status-card done">
              <div class="status-bar done"></div>
              <span class="status-title">Done</span>
              <span class="status-count" v-if="doneTasks.length">{{ doneTasks.length }}</span>
              <span class="status-info"><i class="pi pi-info-circle"></i></span>
            </div>
          </div>

          <!-- Single Language: Original Column Structure -->
          <div v-if="!shouldShowLanguageGrouping" class="kanban-board">
            <!-- TO DO COLUMN -->
            <div class="kanban-column" @dragover="handleDragOver($event, 'todo')" @dragleave="handleDragLeave($event)" @drop="handleDrop($event, 'todo')">
              <div v-if="isDragging && dragOverColumn === 'todo'" class="drag-over-title">
                <div class="drag-over-title-content">
                  <span class="drag-over-icon">📋</span>
                  <span class="drag-over-text">Move to To Do</span>
                </div>
              </div>
              <div v-if="loading" class="kanban-loading">Loading...</div>
              <div v-else>
                <div v-for="(task, idx) in todoTasks" :key="task.id" class="task-card-link" @click="selectedTask = task">
                  <div :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]" tabindex="0" draggable="true" @dragstart="handleDragStart($event, task, idx)" @dragend="handleDragEnd($event)" @keydown.enter="selectedTask = task" @click="selectedTask = task">
                    <!-- Task card content -->
                    <div class="task-status-badge" :class="[task.status, { overdue: task.dueDate && isOverdue(task.dueDate) }]">
                      <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                      <span v-else-if="task.status === 'pending'">To do</span>
                      <span v-else-if="task.status === 'in_progress'">In progress</span>
                      <span v-else-if="task.status === 'completed'">Done</span>
                      <span v-else-if="task.status === 'closed'">Closed</span>
                    </div>
                    <div class="crowdin-row-1">
                      <div class="crowdin-col-left">
                        <span class="task-id">#{{ idx + 1 }}</span>
                        <span class="task-label crowdin-title" :class="{ clickable: true }">{{ getCleanTaskTitle(task.title) }}</span>
                      </div>
                    </div>
                    <div class="crowdin-row-2">
                      <div class="crowdin-col-left">
                        <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                      </div>
                    </div>
                    <div class="crowdin-row-3" v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))">
                      <div class="crowdin-col-left">
                        <span class="arrow">→</span>
                        <span class="due-date-label">
                          <span class="due-icon" v-if="isOverdue(task.dueDate)">⚠️</span>
                          <span class="due-icon" v-else>⏰</span>
                          Due date:
                          <span class="due-date-value" :class="{ 'overdue': isOverdue(task.dueDate) }">
                            {{ formatDateTime(task.dueDate) }}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div class="crowdin-row-4">
                      <div class="crowdin-col-left">
                        <div class="task-meta">
                          <!-- Avatar assignee -->
                          <div class="assignee-info" v-if="task.assignedTo">
                            <img v-if="task.assignedTo.avatarUrl" :src="getAvatarUrl(task.assignedTo.avatarUrl)" :alt="task.assignedTo.fullName" class="assignee-avatar" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)" />
                            <span v-else class="assignee-avatar-placeholder" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)">{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                            <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                          </div>
                          <!-- File info với icon động và tooltip -->
                          <div class="file-info" v-if="task.fileId">
                            <span class="file-icon" :title="getFileName(task.fileId)">{{ getFileIcon(getFileName(task.fileId)) }}</span>
                            <span class="file-name" :title="getFileName(task.fileId)">{{ getFileName(task.fileId) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="crowdin-row-5" v-if="task.type">
                      <div class="crowdin-col-left">
                        <div class="task-type-tag crowdin-tag">
                          {{ task.type }}
                        </div>
                      </div>
                    </div>
                    <!-- Close button -->
                    <div class="crowdin-row-6" v-if="task.status === 'completed'">
                      <div class="crowdin-col-right">
                        <button
                          class="close-task-btn"
                          @click.stop="closeTask(task)"
                          :disabled="task.status === 'closed'"
                          :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- IN PROGRESS COLUMN -->
            <div class="kanban-column" @dragover="handleDragOver($event, 'inProgress')" @dragleave="handleDragLeave($event)" @drop="handleDrop($event, 'inProgress')">
              <div v-if="isDragging && dragOverColumn === 'inProgress'" class="drag-over-title">
                <div class="drag-over-title-content">
                  <span class="drag-over-icon">📋</span>
                  <span class="drag-over-text">Move to In Progress</span>
                </div>
              </div>
              <div v-if="loading" class="kanban-loading">Loading...</div>
              <div v-else>
                <div v-for="(task, idx) in inProgressTasks" :key="task.id" class="task-card-link" @click="selectedTask = task">
                  <div :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]" tabindex="0" draggable="true" @dragstart="handleDragStart($event, task, idx)" @dragend="handleDragEnd($event)" @keydown.enter="selectedTask = task" @click="selectedTask = task">
                    <!-- Same task card content as above -->
                    <div class="task-status-badge" :class="[task.status, { overdue: task.dueDate && isOverdue(task.dueDate) }]">
                      <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                      <span v-else-if="task.status === 'pending'">To do</span>
                      <span v-else-if="task.status === 'in_progress'">In progress</span>
                      <span v-else-if="task.status === 'completed'">Done</span>
                      <span v-else-if="task.status === 'closed'">Closed</span>
                    </div>
                    <div class="crowdin-row-1">
                      <div class="crowdin-col-left">
                        <span class="task-id">#{{ idx + 1 }}</span>
                        <span class="task-label crowdin-title" :class="{ clickable: true }">{{ getCleanTaskTitle(task.title) }}</span>
                      </div>
                    </div>
                    <div class="crowdin-row-2">
                      <div class="crowdin-col-left">
                        <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                      </div>
                    </div>
                    <div class="crowdin-row-3" v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))">
                      <div class="crowdin-col-left">
                        <span class="arrow">→</span>
                        <span class="due-date-label">
                          <span class="due-icon" v-if="isOverdue(task.dueDate)">⚠️</span>
                          <span class="due-icon" v-else>⏰</span>
                          Due date:
                          <span class="due-date-value" :class="{ 'overdue': isOverdue(task.dueDate) }">
                            {{ formatDateTime(task.dueDate) }}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div class="crowdin-row-4">
                      <div class="crowdin-col-left">
                        <div class="task-meta">
                          <!-- Avatar assignee -->
                          <div class="assignee-info" v-if="task.assignedTo">
                            <img v-if="task.assignedTo.avatarUrl" :src="getAvatarUrl(task.assignedTo.avatarUrl)" :alt="task.assignedTo.fullName" class="assignee-avatar" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)" />
                            <span v-else class="assignee-avatar-placeholder" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)">{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                            <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                          </div>
                          <!-- File info với icon động và tooltip -->
                          <div class="file-info" v-if="task.fileId">
                            <span class="file-icon" :title="getFileName(task.fileId)">{{ getFileIcon(getFileName(task.fileId)) }}</span>
                            <span class="file-name" :title="getFileName(task.fileId)">{{ getFileName(task.fileId) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="crowdin-row-5" v-if="task.type">
                      <div class="crowdin-col-left">
                        <div class="task-type-tag crowdin-tag">
                          {{ task.type }}
                        </div>
                      </div>
                    </div>
                    <!-- Close button -->
                    <div class="crowdin-row-6" v-if="task.status === 'completed'">
                      <div class="crowdin-col-right">
                        <button
                          class="close-task-btn"
                          @click.stop="closeTask(task)"
                          :disabled="task.status === 'closed'"
                          :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- DONE COLUMN -->
            <div class="kanban-column" @dragover="handleDragOver($event, 'done')" @dragleave="handleDragLeave($event)" @drop="handleDrop($event, 'done')">
              <div v-if="isDragging && dragOverColumn === 'done'" class="drag-over-title">
                <div class="drag-over-title-content">
                  <span class="drag-over-icon">📋</span>
                  <span class="drag-over-text">Move to Done</span>
                </div>
              </div>
              <div v-if="loading" class="kanban-loading">Loading...</div>
              <div v-else>
                <div v-for="(task, idx) in doneTasks" :key="task.id" class="task-card-link" @click="selectedTask = task">
                  <div :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]" tabindex="0" draggable="true" @dragstart="handleDragStart($event, task, idx)" @dragend="handleDragEnd($event)" @keydown.enter="selectedTask = task" @click="selectedTask = task">
                    <!-- Same task card content as above -->
                    <div class="task-status-badge" :class="[task.status, { overdue: task.dueDate && isOverdue(task.dueDate) }]">
                      <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                      <span v-else-if="task.status === 'pending'">To do</span>
                      <span v-else-if="task.status === 'in_progress'">In progress</span>
                      <span v-else-if="task.status === 'completed'">Done</span>
                      <span v-else-if="task.status === 'closed'">Closed</span>
                    </div>
                    <div class="crowdin-row-1">
                      <div class="crowdin-col-left">
                        <span class="task-id">#{{ idx + 1 }}</span>
                        <span class="task-label crowdin-title" :class="{ clickable: true }">{{ getCleanTaskTitle(task.title) }}</span>
                      </div>
                    </div>
                    <div class="crowdin-row-2">
                      <div class="crowdin-col-left">
                        <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                      </div>
                    </div>
                    <div class="crowdin-row-3" v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))">
                      <div class="crowdin-col-left">
                        <span class="arrow">→</span>
                        <span class="due-date-label">
                          <span class="due-icon" v-if="isOverdue(task.dueDate)">⚠️</span>
                          <span class="due-icon" v-else>⏰</span>
                          Due date:
                          <span class="due-date-value" :class="{ 'overdue': isOverdue(task.dueDate) }">
                            {{ formatDateTime(task.dueDate) }}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div class="crowdin-row-4">
                      <div class="crowdin-col-left">
                        <div class="task-meta">
                          <!-- Avatar assignee -->
                          <div class="assignee-info" v-if="task.assignedTo">
                            <img v-if="task.assignedTo.avatarUrl" :src="getAvatarUrl(task.assignedTo.avatarUrl)" :alt="task.assignedTo.fullName" class="assignee-avatar" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)" />
                            <span v-else class="assignee-avatar-placeholder" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)">{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                            <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                          </div>
                          <!-- File info với icon động và tooltip -->
                          <div class="file-info" v-if="task.fileId">
                            <span class="file-icon" :title="getFileName(task.fileId)">{{ getFileIcon(getFileName(task.fileId)) }}</span>
                            <span class="file-name" :title="getFileName(task.fileId)">{{ getFileName(task.fileId) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="crowdin-row-5" v-if="task.type">
                      <div class="crowdin-col-left">
                        <div class="task-type-tag crowdin-tag">
                          {{ task.type }}
                        </div>
                      </div>
                    </div>
                    <!-- Close button -->
                    <div class="crowdin-row-6" v-if="task.status === 'completed'">
                      <div class="crowdin-col-right">
                        <button
                          class="close-task-btn"
                          @click.stop="closeTask(task)"
                          :disabled="task.status === 'closed'"
                          :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Multiple Languages: Swimlanes Structure -->
          <div v-else class="kanban-swimlanes">
            <div v-for="language in availableLanguages" :key="language" class="language-swimlane">
              <!-- Language Header -->
              <div class="language-swimlane-header" @click="toggleLanguageCollapse(language)">
                <i class="language-toggle-icon pi" :class="isLanguageCollapsed(language) ? 'pi-chevron-right collapsed' : 'pi-chevron-up'"></i>
                <div class="language-flag">{{ language.substring(0, 2).toUpperCase() }}</div>
                <span class="language-name">{{ getLanguageName(language) }}</span>
                <span class="language-count">({{ tasksByLanguageAndStatus[language].todo.length + tasksByLanguageAndStatus[language].inProgress.length + tasksByLanguageAndStatus[language].done.length }})</span>
              </div>

              <!-- Language Tasks Row -->
              <div v-if="!isLanguageCollapsed(language)" class="language-swimlane-content">
                <div class="kanban-column todo-column" @dragover="handleDragOver($event, 'todo')" @dragleave="handleDragLeave($event)" @drop="handleDrop($event, 'todo')">
                  <div v-for="(task, idx) in tasksByLanguageAndStatus[language].todo" :key="task.id" class="task-card-link" @click="selectedTask = task">
                    <div :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]" tabindex="0" draggable="true" @dragstart="handleDragStart($event, task, idx)" @dragend="handleDragEnd($event)" @keydown.enter="selectedTask = task" @click="selectedTask = task">
                      <!-- Task card content -->
                      <div class="task-status-badge" :class="[task.status, { overdue: task.dueDate && isOverdue(task.dueDate) }]">
                        <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                        <span v-else-if="task.status === 'pending'">To do</span>
                        <span v-else-if="task.status === 'in_progress'">In progress</span>
                        <span v-else-if="task.status === 'completed'">Done</span>
                        <span v-else-if="task.status === 'closed'">Closed</span>
                      </div>
                      <div class="crowdin-row-1">
                        <div class="crowdin-col-left">
                          <span class="task-id">#{{ idx + 1 }}</span>
                          <span class="task-label crowdin-title" :class="{ clickable: true }">{{ getCleanTaskTitle(task.title) }}</span>
                        </div>
                      </div>
                      <div class="crowdin-row-2">
                        <div class="crowdin-col-left">
                          <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                        </div>
                      </div>
                      <div class="crowdin-row-3" v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))">
                        <div class="crowdin-col-left">
                          <span class="arrow">→</span>
                          <span class="due-date-label">
                            <span class="due-icon" v-if="isOverdue(task.dueDate)">⚠️</span>
                            <span class="due-icon" v-else>⏰</span>
                            Due date:
                            <span class="due-date-value" :class="{ 'overdue': isOverdue(task.dueDate) }">
                              {{ formatDateTime(task.dueDate) }}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div class="crowdin-row-4">
                        <div class="crowdin-col-left">
                          <div class="task-meta">
                            <!-- Avatar assignee -->
                            <div class="assignee-info" v-if="task.assignedTo">
                              <img v-if="task.assignedTo.avatarUrl" :src="getAvatarUrl(task.assignedTo.avatarUrl)" :alt="task.assignedTo.fullName" class="assignee-avatar" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)" />
                              <span v-else class="assignee-avatar-placeholder" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)">{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                              <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                            </div>
                            <!-- File info với icon động và tooltip -->
                            <div class="file-info" v-if="task.fileId">
                              <span class="file-icon" :title="getFileName(task.fileId)">{{ getFileIcon(getFileName(task.fileId)) }}</span>
                              <span class="file-name" :title="getFileName(task.fileId)">{{ getFileName(task.fileId) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="crowdin-row-5" v-if="task.type">
                        <div class="crowdin-col-left">
                          <div class="task-type-tag crowdin-tag">
                            {{ task.type }}
                          </div>
                        </div>
                      </div>
                      <!-- Close button -->
                      <div class="crowdin-row-6" v-if="task.status === 'completed'">
                        <div class="crowdin-col-right">
                          <button
                            class="close-task-btn"
                            @click.stop="closeTask(task)"
                            :disabled="task.status === 'closed'"
                            :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="kanban-column inprogress-column" @dragover="handleDragOver($event, 'inProgress')" @dragleave="handleDragLeave($event)" @drop="handleDrop($event, 'inProgress')">
                  <div v-for="(task, idx) in tasksByLanguageAndStatus[language].inProgress" :key="task.id" class="task-card-link" @click="selectedTask = task">
                    <div :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]" tabindex="0" draggable="true" @dragstart="handleDragStart($event, task, idx)" @dragend="handleDragEnd($event)" @keydown.enter="selectedTask = task" @click="selectedTask = task">
                      <!-- Same task card content as above -->
                      <div class="task-status-badge" :class="[task.status, { overdue: task.dueDate && isOverdue(task.dueDate) }]">
                        <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                        <span v-else-if="task.status === 'pending'">To do</span>
                        <span v-else-if="task.status === 'in_progress'">In progress</span>
                        <span v-else-if="task.status === 'completed'">Done</span>
                        <span v-else-if="task.status === 'closed'">Closed</span>
                      </div>
                      <div class="crowdin-row-1">
                        <div class="crowdin-col-left">
                          <span class="task-id">#{{ idx + 1 }}</span>
                          <span class="task-label crowdin-title" :class="{ clickable: true }">{{ getCleanTaskTitle(task.title) }}</span>
                        </div>
                      </div>
                      <div class="crowdin-row-2">
                        <div class="crowdin-col-left">
                          <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                        </div>
                      </div>
                      <div class="crowdin-row-3" v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))">
                        <div class="crowdin-col-left">
                          <span class="arrow">→</span>
                          <span class="due-date-label">
                            <span class="due-icon" v-if="isOverdue(task.dueDate)">⚠️</span>
                            <span class="due-icon" v-else>⏰</span>
                            Due date:
                            <span class="due-date-value" :class="{ 'overdue': isOverdue(task.dueDate) }">
                              {{ formatDateTime(task.dueDate) }}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div class="crowdin-row-4">
                        <div class="crowdin-col-left">
                          <div class="task-meta">
                            <!-- Avatar assignee -->
                            <div class="assignee-info" v-if="task.assignedTo">
                              <img v-if="task.assignedTo.avatarUrl" :src="getAvatarUrl(task.assignedTo.avatarUrl)" :alt="task.assignedTo.fullName" class="assignee-avatar" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)" />
                              <span v-else class="assignee-avatar-placeholder" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)">{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                              <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                            </div>
                            <!-- File info với icon động và tooltip -->
                            <div class="file-info" v-if="task.fileId">
                              <span class="file-icon" :title="getFileName(task.fileId)">{{ getFileIcon(getFileName(task.fileId)) }}</span>
                              <span class="file-name" :title="getFileName(task.fileId)">{{ getFileName(task.fileId) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="crowdin-row-5" v-if="task.type">
                        <div class="crowdin-col-left">
                          <div class="task-type-tag crowdin-tag">
                            {{ task.type }}
                          </div>
                        </div>
                      </div>
                      <!-- Close button -->
                      <div class="crowdin-row-6" v-if="task.status === 'completed'">
                        <div class="crowdin-col-right">
                          <button
                            class="close-task-btn"
                            @click.stop="closeTask(task)"
                            :disabled="task.status === 'closed'"
                            :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="kanban-column done-column" @dragover="handleDragOver($event, 'done')" @dragleave="handleDragLeave($event)" @drop="handleDrop($event, 'done')">
                  <div v-for="(task, idx) in tasksByLanguageAndStatus[language].done" :key="task.id" class="task-card-link" @click="selectedTask = task">
                    <div :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]" tabindex="0" draggable="true" @dragstart="handleDragStart($event, task, idx)" @dragend="handleDragEnd($event)" @keydown.enter="selectedTask = task" @click="selectedTask = task">
                      <!-- Same task card content as above -->
                      <div class="task-status-badge" :class="[task.status, { overdue: task.dueDate && isOverdue(task.dueDate) }]">
                        <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                        <span v-else-if="task.status === 'pending'">To do</span>
                        <span v-else-if="task.status === 'in_progress'">In progress</span>
                        <span v-else-if="task.status === 'completed'">Done</span>
                        <span v-else-if="task.status === 'closed'">Closed</span>
                      </div>
                      <div class="crowdin-row-1">
                        <div class="crowdin-col-left">
                          <span class="task-id">#{{ idx + 1 }}</span>
                          <span class="task-label crowdin-title" :class="{ clickable: true }">{{ getCleanTaskTitle(task.title) }}</span>
                        </div>
                      </div>
                      <div class="crowdin-row-2">
                        <div class="crowdin-col-left">
                          <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                        </div>
                      </div>
                      <div class="crowdin-row-3" v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))">
                        <div class="crowdin-col-left">
                          <span class="arrow">→</span>
                          <span class="due-date-label">
                            <span class="due-icon" v-if="isOverdue(task.dueDate)">⚠️</span>
                            <span class="due-icon" v-else>⏰</span>
                            Due date:
                            <span class="due-date-value" :class="{ 'overdue': isOverdue(task.dueDate) }">
                              {{ formatDateTime(task.dueDate) }}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div class="crowdin-row-4">
                        <div class="crowdin-col-left">
                          <div class="task-meta">
                            <!-- Avatar assignee -->
                            <div class="assignee-info" v-if="task.assignedTo">
                              <img v-if="task.assignedTo.avatarUrl" :src="getAvatarUrl(task.assignedTo.avatarUrl)" :alt="task.assignedTo.fullName" class="assignee-avatar" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)" />
                              <span v-else class="assignee-avatar-placeholder" :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)">{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                              <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                            </div>
                            <!-- File info với icon động và tooltip -->
                            <div class="file-info" v-if="task.fileId">
                              <span class="file-icon" :title="getFileName(task.fileId)">{{ getFileIcon(getFileName(task.fileId)) }}</span>
                              <span class="file-name" :title="getFileName(task.fileId)">{{ getFileName(task.fileId) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="crowdin-row-5" v-if="task.type">
                        <div class="crowdin-col-left">
                          <div class="task-type-tag crowdin-tag">
                            {{ task.type }}
                          </div>
                        </div>
                      </div>
                      <!-- Close button -->
                      <div class="crowdin-row-6" v-if="task.status === 'completed'">
                        <div class="crowdin-col-right">
                          <button
                            class="close-task-btn"
                            @click.stop="closeTask(task)"
                            :disabled="task.status === 'closed'"
                            :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- All Tasks View -->
      <div v-else-if="activeTab === 'all'" class="all-tasks-view">
        <!-- Search and Filter Bar for All Tasks -->
        <div class="search-filter-container">
          <!-- Search Section -->
          <div class="search-section">
            <div class="search-input-wrapper">
              <i class="pi pi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                placeholder="Search tasks..."
                class="search-input"
              />
            </div>
            <!-- Filter Button -->
            <button @click="toggleFilters" class="filter-btn" :class="{ active: showFilters }">
              <i class="pi pi-filter"></i>
              Filters
            </button>
          </div>

          <!-- Filter Section -->
          <div v-if="showFilters" class="filter-section">
            <!-- Custom Assignee Select -->
            <div class="custom-select-wrapper">
              <div
                class="custom-select-display filter-select"
                @click="toggleCustomSelect('assignee')"
                :class="{ active: activeCustomSelect === 'assignee' }"
              >
                Assignee: {{ selectedFilters.assignee }}
                <i class="pi pi-chevron-down custom-select-arrow"></i>
              </div>
              <div v-if="activeCustomSelect === 'assignee'" class="custom-select-dropdown">
                <div
                  v-for="option in assigneeOptions"
                  :key="option"
                  class="custom-select-option"
                  :class="{ selected: selectedFilters.assignee === option }"
                  @click="selectCustomOption('assignee', option)"
                >
                  {{ option }}
                </div>
              </div>
            </div>

            <!-- Custom Created By Select -->
            <div class="custom-select-wrapper">
              <div
                class="custom-select-display filter-select"
                @click="toggleCustomSelect('createdBy')"
                :class="{ active: activeCustomSelect === 'createdBy' }"
              >
                Created by: {{ selectedFilters.createdBy }}
                <i class="pi pi-chevron-down custom-select-arrow"></i>
              </div>
              <div v-if="activeCustomSelect === 'createdBy'" class="custom-select-dropdown">
                <div
                  v-for="option in createdByOptions"
                  :key="option"
                  class="custom-select-option"
                  :class="{ selected: selectedFilters.createdBy === option }"
                  @click="selectCustomOption('createdBy', option)"
                >
                  {{ option }}
                </div>
              </div>
            </div>

            <!-- Custom File Select -->
            <div class="custom-select-wrapper">
              <div
                class="custom-select-display filter-select"
                @click="toggleCustomSelect('file')"
                :class="{ active: activeCustomSelect === 'file' }"
              >
                File: {{ selectedFilters.file }}
                <i class="pi pi-chevron-down custom-select-arrow"></i>
              </div>
              <div v-if="activeCustomSelect === 'file'" class="custom-select-dropdown">
                <div
                  v-for="option in fileOptions"
                  :key="option"
                  class="custom-select-option"
                  :class="{ selected: selectedFilters.file === option }"
                  @click="selectCustomOption('file', option)"
                >
                  {{ option }}
                </div>
              </div>
            </div>
            <div class="filter-dropdown-wrapper">
              <button
                @click="toggleFilterSelect('dueDate')"
                class="filter-dropdown-btn"
                :class="{ active: activeSubDropdown === 'dueDate' }"
              >
                Due date: {{ selectedFilters.dueDate }}
                <i class="pi pi-chevron-down filter-arrow"></i>
              </button>
              <div v-if="activeSubDropdown === 'dueDate'" class="filter-dropdown-menu">
                <div
                  v-for="option in dueDateOptions"
                  :key="option.value"
                  class="filter-dropdown-option"
                  :class="{ selected: selectedFilters.dueDate === option.value }"
                  @click="selectFilterOption('dueDate', option.value)"
                >
                  {{ option.label }}
                </div>
                <!-- Clear Selection Option -->
                <div
                  v-if="selectedFilters.dueDate === 'Custom Range' && selectedDateRange.startDate"
                  class="filter-dropdown-option clear-option"
                  @click="clearDateRange"
                >
                  <i class="pi pi-times"></i>
                  Clear Selection
                </div>
                <!-- Date Picker for Custom Range -->
                <div v-if="selectedFilters.dueDate === 'Custom Range'" class="date-picker-container">
                  <div class="date-picker-calendar">
                    <div class="calendar-header">
                      <button @click="navigateMonth('prev')" class="calendar-nav-btn">
                        <i class="pi pi-chevron-left"></i>
                      </button>
                      <div class="calendar-months-title">
                        <span class="month-title">{{ formatMonth(currentMonth) }}</span>
                        <span class="month-title">{{ formatMonth(nextMonth) }}</span>
                      </div>
                      <button @click="navigateMonth('next')" class="calendar-nav-btn">
                        <i class="pi pi-chevron-right"></i>
                      </button>
                    </div>
                    <div class="calendar-grid-container">
                      <!-- First Month -->
                      <div class="calendar-month">
                        <div class="calendar-weekdays">
                          <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
                        </div>
                        <div class="calendar-days">
                          <div
                            v-for="date in getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())"
                            :key="date.getTime()"
                            class="calendar-day"
                            :class="{
                              'other-month': date.getMonth() !== currentMonth.getMonth(),
                              'selected': isDateInRange(date),
                              'start-date': isDateStart(date),
                              'end-date': isDateEnd(date),
                              'in-range': isDateInRange(date) && !isDateStart(date) && !isDateEnd(date)
                            }"
                            @click="selectDate(date)"
                          >
                            {{ date.getDate() }}
                          </div>
                        </div>
                      </div>
                      <!-- Second Month -->
                      <div class="calendar-month">
                        <div class="calendar-weekdays">
                          <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
                        </div>
                        <div class="calendar-days">
                          <div
                            v-for="date in getDaysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())"
                            :key="date.getTime()"
                            class="calendar-day"
                            :class="{
                              'other-month': date.getMonth() !== nextMonth.getMonth(),
                              'selected': isDateInRange(date),
                              'start-date': isDateStart(date),
                              'end-date': isDateEnd(date),
                              'in-range': isDateInRange(date) && !isDateStart(date) && !isDateEnd(date)
                            }"
                            @click="selectDate(date)"
                          >
                            {{ date.getDate() }}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
            <button @click="clearFilters" class="clear-filter-btn">
              <i class="pi pi-times"></i>
              Clear
            </button>
          </div>
        </div>

        <div class="all-tasks-list">
          <div v-if="loading" class="loading-message">Loading tasks...</div>
          <div v-else-if="filteredTasks.length === 0" class="empty-message">No tasks found</div>
          <div v-else>
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="all-task-item"
              @click="selectedTask = task"
            >
              <div class="task-item-content">
                <div class="task-item-left">
                  <div class="task-item-title">
                    <span class="task-id">#{{ task.id }}</span>
                    <span class="task-title">{{ getCleanTaskTitle(task.title) }}</span>
                  </div>
                  <div class="task-item-details">
                    <span class="task-date">{{ formatDate(task.createdAt) }}</span>
                    <span v-if="task.dueDate" class="task-due-date" :class="{ overdue: isOverdue(task.dueDate) }">
                      Due: {{ formatDateTime(task.dueDate) }}
                    </span>
                    <span v-if="task.assignedTo" class="task-assignee">
                      Assigned to: {{ task.assignedTo.fullName || task.assignedTo.username }}
                    </span>
                  </div>
                </div>
                <div class="task-item-right">
                  <span class="task-status" :class="task.status">{{ getStatusText(task.status) }}</span>
                  <button
                    v-if="task.status === 'closed'"
                    class="reopen-btn"
                    @click.stop="reopenTask(task)"
                    title="Reopen task"
                  >
                    Reopen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>



  <!-- Task Action Menu -->
  <Teleport to="body">
    <div v-if="showTaskActionMenu" class="task-action-menu-overlay" @click="closeTaskActionMenu">
      <div
        class="task-action-menu"
        :style="{
          left: taskActionMenuPosition.x + 'px',
          top: taskActionMenuPosition.y + 'px'
        }"
        @click.stop
      >
        <button class="task-action-item" @click="editTask">
          <i class="pi pi-pencil"></i>
          Edit
        </button>
        <button class="task-action-item" @click="closeTaskFromMenu">
          <i class="pi pi-times"></i>
          Close
        </button>
        <button class="task-action-item delete" @click="openDeleteModal">
          <i class="pi pi-trash"></i>
          Delete
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Delete Task Modal -->
  <Teleport to="body">
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Delete Task</h3>
          <button class="modal-close" @click="closeDeleteModal">×</button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">⚠️</div>
            <p class="warning-text">
              Are you sure you want to delete task <strong>"{{ taskToDelete?.title }}"</strong>?
            </p>
            <p class="warning-subtext">
              If the task is completed you can close it or mark as Done.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-cancel"
            @click="closeDeleteModal"
            :disabled="isDeleting"
          >
            Cancel
          </button>
          <button
            class="btn-delete"
            @click="deleteSelectedTask"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting" class="loading-spinner"></span>
            {{ isDeleting ? 'Deleting...' : 'Delete Task' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>



</template>

<style scoped>
.kanban-tab-wrapper {
  padding: 0 0 1.2em 0;
}

/* Search and Filter Bar */
.search-filter-container {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  background: #f8fafc;
  padding: 0.5em 1em;
  border-radius: 8px;
  margin-bottom: 1em;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-section {
  display: flex;
  gap: 0.7em;
  align-items: center;
  flex-wrap: wrap;
}

.search-section {
  flex: 1;
  min-width: 200px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #6366f1;
  font-size: 1em;
  margin-right: -0.4em;
}

.search-input {
  width: 100%;
  min-width: 160px;
  border-radius: 6px;
  border: 1.5px solid #e5e7eb;
  padding: 6px 12px 6px 28px;
  font-size: 0.9em;
  background: white;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

/* Filter Button Styles */
.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.4em;
  padding: 6px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  border-color: #6366f1;
  background: #f8fafc;
}

.filter-btn.active {
  border-color: #6366f1;
  background: #e0e7ff;
  color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.filter-btn i {
  font-size: 0.9em;
}

.filter-section {
  display: flex;
  gap: 0.7em;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  min-width: 160px;
  width: auto;
  max-width: 220px;
  transition: border-color 0.2s ease;
}

.filter-select option {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.clear-filter-btn {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 8px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filter-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.create-task-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #22c55e;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
}

.create-task-btn:hover {
  background: #16a34a;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(34, 197, 94, 0.3);
}

.create-task-btn:active {
  transform: translateY(0);
}

.create-task-btn-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  background: #22c55e;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
}

.create-task-btn-header:hover {
  background: #16a34a;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(34, 197, 94, 0.3);
}

.create-task-btn-header:active {
  transform: translateY(0);
}

/* Filter Dropdown Styles */
.filter-dropdown-wrapper {
  position: relative;
}

.filter-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 8px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 160px;
  width: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-dropdown-btn:hover {
  border-color: #6366f1;
}

.filter-dropdown-btn.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.filter-arrow {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.filter-dropdown-btn.active .filter-arrow {
  transform: rotate(180deg);
}

.filter-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1500 !important;
  margin-top: 4px;
  overflow: visible;
  min-width: 200px;
  max-height: none;
  width: auto;
  display: block !important;
}

.filter-dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.875rem;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-dropdown-option:hover {
  background-color: #f3f4f6;
}

.filter-dropdown-option.selected {
  background-color: #e0e7ff;
  color: #6366f1;
  font-weight: 500;
}

.filter-dropdown-option.clear-option {
  border-top: 1px solid #e5e7eb;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-dropdown-option.clear-option:hover {
  background-color: #fef2f2;
  color: #dc2626;
}

/* Custom Select Styles */
.custom-select-wrapper {
  position: relative;
}

.custom-select-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
}

.custom-select-display.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.custom-select-arrow {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  margin-left: 0.5rem;
}

.custom-select-display.active .custom-select-arrow {
  transform: rotate(180deg);
}

.custom-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1500;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.custom-select-option {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.875rem;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-select-option:hover {
  background-color: #f3f4f6;
}

.custom-select-option.selected {
  background-color: #e0e7ff;
  color: #6366f1;
  font-weight: 500;
}

/* Date Picker Styles */
.date-picker-container {
  padding: 0;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  width: auto;
  overflow: visible;
}

.date-picker-calendar {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-width: 450px;
  max-width: 480px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.calendar-nav-btn {
  background: none;
  border: none;
  padding: 0.3rem;
  cursor: pointer;
  color: #6366f1;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.calendar-nav-btn:hover {
  background-color: #e0e7ff;
}

.calendar-months-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  padding: 0 0.5rem;
}

.month-title {
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
  text-align: center;
  flex: 1;
}

.calendar-grid-container {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
}

.calendar-month {
  flex: 1;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.15rem;
  margin-bottom: 0.25rem;
}

.weekday {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0.15rem;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.15rem;
}

.calendar-day {
  text-align: center;
  padding: 0.2rem;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  color: #374151;
  min-height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-day:hover {
  background-color: #f3f4f6;
}

.calendar-day.other-month {
  color: #9ca3af;
}

.calendar-day.selected {
  background-color: #6366f1;
  color: white;
  font-weight: 600;
}

.calendar-day.start-date {
  background-color: #6366f1;
  color: white;
  font-weight: 600;
}

.calendar-day.end-date {
  background-color: #6366f1;
  color: white;
  font-weight: 600;
}

.calendar-day.in-range {
  background-color: #e0e7ff;
  color: #6366f1;
}



@media (max-width: 600px) {
  .search-filter-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7em;
    padding: 0.7em 0.5em;
  }

  .search-section {
    flex-direction: column;
    gap: 0.7em;
  }

  .filter-section {
    gap: 0.5em;
  }

  .search-input {
    min-width: 100px;
    width: 100%;
  }

  .filter-select {
    width: 100%;
    max-width: none;
  }

  .filter-dropdown-btn {
    width: 100%;
    min-width: auto;
    justify-content: space-between;
  }

  .filter-btn {
    width: 100%;
    justify-content: center;
  }

  .calendar-grid-container {
    flex-direction: column;
    gap: 1rem;
  }

  .date-picker-calendar {
    min-width: 280px;
    max-width: 350px;
  }

  .calendar-months-title {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 1rem;
  }
}

.kanban-board-view {
  /* Container for the main kanban board view */
}

.task-tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.tabs-left {
  display: flex;
  gap: 1rem;
}

.tabs-right {
  display: flex;
  align-items: center;
}

.tab-btn {
  background: none;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: #6b7280;
}

.tab-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab-btn.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.all-tasks-view {
  padding: 1rem;
}

.all-tasks-header {
  margin-bottom: 2rem;
}

.all-tasks-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.all-tasks-header p {
  color: #64748b;
  margin: 0;
}

.all-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.all-task-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.all-task-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.task-item-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.task-item-left {
  flex: 1;
}

.task-item-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.task-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.task-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.task-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.task-status.pending {
  background: #f3f4f6;
  color: #2563eb;
}

.task-status.in_progress {
  background: #fef3c7;
  color: #b45309;
}

.task-status.completed {
  background: #d1fae5;
  color: #059669;
}

.task-status.closed {
  background: #f3f4f6;
  color: #6b7280;
}

.task-id {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
}

.task-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
}

.task-date {
  color: #6b7280;
  font-size: 0.875rem;
}

.task-due-date {
  color: #6b7280;
  font-size: 0.875rem;
}

.task-due-date.overdue {
  color: #dc2626;
  font-weight: 500;
}

.task-assignee {
  color: #6b7280;
  font-size: 0.875rem;
}

.kanban-status-header-row {
  display: flex;
  gap: 2em;
  margin-bottom: 1.5em;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;
}
.kanban-status-card {
  background: #f7f8fa;
  border-radius: 14px;
  min-width: 220px;
  padding: 1.1em 1.5em 0.7em 1.5em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  flex: 1 1 0;
  gap: 0.7em;
}
.status-bar {
  width: 18px;
  height: 32px;
  border-radius: 6px;
  margin-bottom: 0;
  margin-left: 0;
}
.status-bar.todo { background: #a3a3a3; }
.status-bar.inprogress { background: #2563eb; }
.status-bar.done { background: #059669; }

.status-title {
  font-size: 1.15em;
  font-weight: 700;
  color: #374151;
  margin-left: 0.2em;
}
.status-count {
  background: #e0e7ff;
  color: #2563eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 700;
  padding: 0.1em 0.7em;
  margin-left: 0.5em;
}
.status-info {
  color: #2563eb;
  font-size: 1.1em;
  margin-left: 0.5em;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.status-info i {
  background: #e0e7ff;
  border-radius: 50%;
  padding: 0.1em 0.3em;
}
.kanban-board {
  display: flex;
  gap: 1.5em;
  min-height: 300px;
}
.kanban-column {
  background: #f8fafc;
  border-radius: 10px;
  flex: 1 1 0;
  padding: 0.8em;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 0.8em;
  transition: background-color 0.2s ease;
}

.kanban-column.drag-over {
  background: #e0f2fe;
  border: 2px dashed #2563eb;
}
.kanban-column-title {
  font-size: 1em;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.8em;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.done-info {
  background: #e5e7eb;
  color: #2563eb;
  border-radius: 50%;
  font-size: 0.8em;
  width: 1.2em;
  height: 1.2em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5em;
}
.kanban-loading {
  text-align: center;
  color: #888;
  padding: 2em 0;
}

/* Global Empty State Styles */
.global-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.loading-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: pulse 2s infinite;
}

.loading-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #6b7280;
}

.global-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: 3rem 2rem;
}

.global-empty-icon {
  font-size: 5rem;
  margin-bottom: 2rem;
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
}

.global-empty-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 1rem;
}

.global-empty-subtext {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 2rem;
  max-width: 400px;
  line-height: 1.5;
}

.global-empty-btn {
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.global-empty-btn:hover {
  background: #16a34a;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
}

.global-empty-btn:active {
  transform: translateY(0);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.kanban-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  opacity: 0.7;
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-state-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.empty-state-subtext {
  font-size: 0.9rem;
  color: #9ca3af;
  line-height: 1.4;
}

.empty-state-btn {
  margin-top: 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.empty-state-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.empty-state-btn:active {
  transform: translateY(0);
}
.task-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(34,197,94,0.12);
  padding: 1.2em 1em 0.8em 1em;
  margin-bottom: 0.5em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  border: 1.5px solid #22c55e33;
  transition: box-shadow 0.2s, border 0.2s, background 0.2s, opacity 0.2s;
  cursor: grab;
}

.task-card:active {
  cursor: grabbing;
}
.task-card:hover {
  box-shadow: 0 8px 32px rgba(34,197,94,0.18);
  border-color: #22c55e;
  background: #f0fdf4;
}
.task-card-header {
  display: flex;
  align-items: center;
  gap: 0.7em;
  font-size: 0.95em;
}
.task-id {
  color: #a3a3a3;
  font-weight: 600;
}
.task-label {
  font-size: 1.25em;
  font-weight: 700;
  color: #2563eb;
  background: none;
  padding: 0;
}
.task-label.in-progress {
  background: #fef3c7;
  color: #b45309;
}
.task-label.done {
  background: #d1fae5;
  color: #059669;
}
.task-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #1f2937;
  margin: 0.2em 0 0.1em 0;
}
.task-date {
  color: #64748b;
  font-size: 0.95em;
}

.due-date-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.date-text {
  color: #64748b;
}

.arrow {
  color: #64748b;
  font-size: 0.8em;
}

.due-date-label {
  color: #374151;
  font-weight: 500;
  font-size: 0.9em;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.3em;
}
.due-date-value {
  color: #374151;
  font-weight: 600;
  margin-left: 0.2em;
}
.due-date-value.overdue {
  color: #dc2626;
  font-weight: 700;
}

.days-remaining {
  color: #64748b;
  font-size: 0.85em;
  margin-left: auto;
}

.days-remaining.overdue {
  color: #dc2626;
  font-weight: 600;
}
.task-meta-row {
  display: flex;
  align-items: center;
  gap: 1em;
  font-size: 0.95em;
}
.task-badge {
  background: #e0f2fe;
  color: #2563eb;
  border-radius: 6px;
  padding: 0.1em 0.7em;
  font-size: 0.85em;
  font-weight: 600;
}
.task-words {
  color: #a3a3a3;
  font-size: 0.9em;
}
.task-card-footer {
  display: flex;
  align-items: center;
  gap: 0.7em;
  font-size: 0.95em;
  color: #a3a3a3;
  margin-top: 0.2em;
}
.task-comments {
  display: flex;
  align-items: center;
  gap: 0.2em;
}
.task-list-row {
  display: flex;
  align-items: center;
  gap: 2em;
  padding: 0.7em 1em;
  border-bottom: 1px solid #e5e7eb;
}
.task-card-link {
  display: block;
}
.task-detail-view {
  padding: 0 0 1.2em 0;
}

.task-detail-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.back-btn {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 0.6em 1.2em;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  margin-bottom: 0.4rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.back-btn:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.back-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.delete-btn {
  background: #dc2626;
  border: 1px solid #dc2626;
  border-radius: 16px;
  padding: 0.6em 1.2em;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.delete-btn:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  transform: translateY(-1px);
}

.delete-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
}

/* Edit Task Overlay */
.edit-task-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f5f5f5;
  z-index: 1000;
  overflow-y: auto;
}

/* Task Action Menu Styles */
.task-action-menu-wrapper {
  position: relative;
}

.task-action-menu-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 1rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.task-action-menu-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
  color: #374151;
}

.task-action-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.task-action-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  min-width: 160px;
  z-index: 1001;
  transform: translate(-50%, -100%);
  margin-top: -10px;
}

.task-action-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  width: 100%;
  border: none;
  background: none;
  color: #374151;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
}

.task-action-item:hover {
  background: #f9fafb;
}

.task-action-item.delete {
  color: #dc2626;
}

.task-action-item.delete:hover {
  background: #fef2f2;
}
.task-detail-header {
  font-size: 1.5em;
  font-weight: 700;
  margin-bottom: 0.4em;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.task-detail-id {
  color: #888;
  font-size: 0.8em;
  font-weight: 600;
}
.task-detail-title {
  color: #222;
  font-size: 1em;
  font-weight: 700;
}
.task-detail-meta-box {
  background: #f5f6f7;
  border-radius: 18px;
  display: flex;
  gap: 1.5em;
  padding: 1.5em 1.5em 1em 1.5em;
  margin-bottom: 1.5em;
}
.task-detail-meta-col {
  flex: 1 1 0;
  color: #374151;
  font-size: 0.9em;
}
.meta-label {
  color: #64748b;
  font-size: 0.85em;
  font-weight: 700;
  margin-bottom: 0.5em;
  letter-spacing: 0.04em;
}
.progress-bar-bg {
  background: #e0e7ff;
  border-radius: 8px;
  height: 10px;
  width: 80%;
  margin: 0.7em 0 0.2em 0;
}
.progress-bar {
  background: #93c5fd;
  height: 100%;
  border-radius: 8px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-bar[style*="width: 0%"] {
  background: #e5e7eb;
}

.progress-bar[style*="width: 50%"] {
  background: #fbbf24;
}

.progress-bar[style*="width: 100%"] {
  background: #10b981;
}

.progress-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6366f1;
  font-size: 0.9em;
  font-weight: 600;
  gap: 0.5em;
}

.progress-text {
  font-weight: 600;
  color: #374151;
  font-size: 1em;
  margin-top: 0.3em;
}
.author-avatar {
  width: 40px;
  height: 40px;
  background: #065f46;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9em;
  margin-bottom: 0.4em;
  overflow: hidden;
}
.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
  display: block;
}
.task-detail-members {
  margin-top: 2em;
}
.members-title {
  font-size: 1em;
  font-weight: 600;
  margin-bottom: 0.5em;
}
.members-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}
.members-table th, .members-table td {
  padding: 0.7em 1em;
  text-align: left;
  color: #374151;
}
.members-table th {
  background: #f3f4f6;
  font-weight: 700;
}
.empty-row {
  text-align: center;
  color: #888;
  font-style: italic;
}
.file-name-container {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px; /* Adjust as needed */
}
.create-task-view {
  padding: 0 0 1.2em 0;
}
.create-task-header {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 1.5em;
}
.create-task-header h2 {
  font-size: 1.5em;
  font-weight: 700;
  color: #222;
}

.edit-task-view {
  padding: 0 0 1.2em 0;
}
.edit-task-header {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 1.5em;
}
.edit-task-header h2 {
  font-size: 1.5em;
  font-weight: 700;
  color: #222;
}
@media (max-width: 900px) {
  .kanban-board {
    flex-direction: column;
    gap: 1.5em;
  }
  .kanban-column {
    min-width: 0;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.delete-warning {
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.warning-text {
  font-size: 1.1rem;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
  line-height: 1.5;
}

.warning-subtext {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  background: #dc2626;
  border: 1px solid #dc2626;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-delete:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.btn-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
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

/* Hide all other elements when modal is open */
.modal-overlay:has(.modal-content) ~ *,
.modal-overlay:has(.modal-content) + * {
  display: none !important;
}

/* Alternative approach - hide body content when modal is open */
body:has(.modal-overlay) > *:not(.modal-overlay) {
  visibility: hidden;
}

/* Blur sidebar and other elements when modal is open (like delete roles) */
body.modal-open .sidebar,
body.modal-open .nav,
body.modal-open header,
body.modal-open main {
  filter: blur(2px);
  opacity: 0.7;
}

/* Date Picker Calendar Styles */
.date-picker-calendar {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 600px;
  margin-top: 0.25em;
  padding: 1rem;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.month-year {
  font-weight: 600;
  color: #374151;
  min-width: 80px;
  text-align: center;
}

.calendar-grid {
  display: flex;
  gap: 2rem;
}

.calendar-month {
  flex: 1;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.weekday {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0.25rem;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: #374151;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
}

.day:hover {
  background: #f3f4f6;
}

.day.other-month {
  color: #d1d5db;
}

.day.in-range {
  background: #dbeafe;
  color: #1e40af;
}

.day.range-start {
  background: #2563eb;
  color: white;
  font-weight: 600;
}

.day.range-end {
  background: #2563eb;
  color: white;
  font-weight: 600;
}

.calendar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.clear-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.apply-btn {
  background: #2563eb;
  border: 1px solid #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.apply-btn:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Drag Over Title Styles */
.drag-over-title {
  background: rgba(37, 99, 235, 0.1);
  border: 2px dashed #2563eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  animation: dragTitleFadeIn 0.2s ease-out;
}

@keyframes dragTitleFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.drag-over-title-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #2563eb;
  font-weight: 600;
  font-size: 1rem;
}

.drag-over-icon {
  font-size: 1.1rem;
}

.drag-over-text {
  white-space: nowrap;
}

/* Ensure modal is the only visible element */
.modal-overlay {
  position: fixed !important;
  z-index: 99999 !important;
}

/* CSS bổ sung */
.task-card-header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.2em;
}
.task-card-header-col {
  flex: 1 1 0;
  min-width: 0;
}
.task-card-header-col-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5em;
  min-width: 70px;
}
.days-remaining-indicator {
  font-size: 1em;
  color: #64748b;
  font-weight: 600;
}
.days-remaining-indicator.overdue {
  color: #dc2626;
}
.task-words-right {
  color: #a3a3a3;
  font-size: 0.95em;
}
.task-comments-right {
  color: #a3a3a3;
  font-size: 0.95em;
  display: flex;
  align-items: center;
  gap: 0.2em;
}
.task-type-tag {
  margin-top: 0.5em;
  display: inline-block;
  background: #e0edff;
  color: #2563eb;
  border-radius: 6px;
  padding: 0.2em 0.7em;
  font-size: 0.9em;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.task-date-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-top: 0.2em;
  margin-bottom: 0.2em;
}

/* CSS bổ sung cho Crowdin style */
.crowdin-style {
  position: relative;
  border: 2px solid #22c55e;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(34,197,94,0.10);
  padding: 1.3em 1.5em 1em 1.5em;
  margin-bottom: 0.8em;
  transition: box-shadow 0.2s, border 0.2s, background 0.2s, transform 0.18s cubic-bezier(.4,2,.6,1);
  cursor: pointer;
  min-width: 250px;
  font-size: 13px;
  line-height: 1.5;
}
.crowdin-style:hover {
  border-color: #2563eb;
  background: #f0fdf4;
  box-shadow: 0 12px 32px rgba(37,99,235,0.18);
  transform: scale(1.025);
  z-index: 2;
}
.overdue-card {
  border-color: #dc2626 !important;
  animation: shake 0.25s linear;
}
@keyframes shake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

/* CSS bổ sung bố cục Crowdin */
.crowdin-row-1, .crowdin-row-2, .crowdin-row-3, .crowdin-row-4, .crowdin-row-5 {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 0.6em;
}
.crowdin-row-1 {
  margin-bottom: 0.8em;
}
.crowdin-row-2 {
  margin-bottom: 0.5em;
}
.crowdin-row-3 {
  margin-bottom: 0.5em;
}
.crowdin-row-4 {
  margin-bottom: 0.5em;
}
.crowdin-row-5 {
  margin-bottom: 0.2em;
}
.crowdin-row-6 {
  margin-top: 0.5em;
  display: flex;
  justify-content: flex-end;
}
.crowdin-col-left {
  display: flex;
  align-items: center;
  gap: 0.8em;
  min-width: 0;
  width: 100%;
}
.crowdin-title {
  color: #2563eb;
  font-weight: 700;
  font-size: 0.95em;
  margin-left: 0.4em;
  transition: text-decoration 0.2s;
  white-space: pre-line;
  line-height: 1.3;
}
.crowdin-title.clickable:hover {
  text-decoration: underline;
}
.crowdin-days {
  font-size: 1em;
  font-weight: 700;
  color: #059669;
  margin-bottom: 0.2em;
}
.crowdin-days.overdue {
  color: #dc2626;
}
.task-words-right {
  color: #a3a3a3;
  font-size: 0.9em;
  margin-top: 0.2em;
}
.task-comments-right {
  color: #a3a3a3;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 0.2em;
  margin-top: 0.2em;
}
.task-comments-right i {
  font-size: 1em;
  color: #cbd5e1;
}

/* CSS cho assignee và file info */
.task-meta {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  width: 100%;
}
.assignee-info {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.assignee-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
.assignee-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-weight: 600;
}
.assignee-name {
  color: #374151;
  font-size: 0.85em;
  font-weight: 500;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.file-icon {
  font-size: 0.9em;
}
.file-name {
  color: #6b7280;
  font-size: 0.85em;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crowdin-row-5 {
  margin-bottom: 0.3em;
}

.overdue {
  color: #dc2626;
  font-weight: 700;
}

.task-card:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.task-status-badge {
  position: absolute;
  top: 0.7em;
  right: 1.2em;
  font-size: 0.85em;
  font-weight: 700;
  padding: 0.18em 0.8em;
  border-radius: 12px;
  background: #e0e7ff;
  color: #2563eb;
  z-index: 3;
  box-shadow: 0 2px 8px rgba(37,99,235,0.08);
  letter-spacing: 0.01em;
}

.task-status-badge.pending { background: #f3f4f6; color: #2563eb; }
.task-status-badge.in_progress { background: #fef3c7; color: #b45309; }
.task-status-badge.completed { background: #d1fae5; color: #059669; }
.task-status-badge.closed { background: #f3f4f6; color: #6b7280; }
.task-status-badge.overdue { background: #fee2e2; color: #dc2626; border: 1.5px solid #dc2626; }

.task-progress-bar-bg {
  background: #e0e7ff;
  border-radius: 6px;
  height: 7px;
  width: 100%;
  margin: 0.5em 0 0.7em 0;
}

.task-progress-bar {
  background: #2563eb;
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}

.status-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.6em;
  vertical-align: middle;
}

.kanban-status-chip {
  display: flex;
  align-items: center;
  background: #f7f8fa;
  border-radius: 14px;
  padding: 0.3em 1.1em 0.3em 0.7em;
  font-weight: 700;
  font-size: 1.08em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  gap: 0.5em;
  min-width: 110px;
  height: 48px;
  line-height: 1;
}
.status-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.6em;
  vertical-align: middle;
  flex-shrink: 0;
}
.status-chip-title {
  color: #374151;
  font-weight: 700;
  font-size: 1.15em;
  display: flex;
  align-items: center;
  line-height: 1;
}
.status-chip-count {
  background: #e0e7ff;
  color: #2563eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 700;
  padding: 0.1em 0.7em;
  margin-left: 0.2em;
  display: flex;
  align-items: center;
  height: 1.6em;
}
.status-chip-info {
  color: #2563eb;
  font-size: 1.1em;
  margin-left: 0.5em;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.close-task-btn {
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.8;
}

.close-task-btn:hover:not(:disabled) {
  background: #4b5563;
  opacity: 1;
}

.close-task-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.reopen-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 0.5rem;
}

.reopen-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.close-btn {
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 0.5rem;
}

.close-btn:hover:not(:disabled) {
  background: #b91c1c;
}

.empty-message {
  text-align: center;
  color: #888;
  font-style: italic;
}

.loading-message {
  text-align: center;
  color: #888;
  font-weight: 600;
}

/* Language grouping styles */
.language-group {
  margin-bottom: 1.5rem;
}

.language-group.first-language {
  margin-top: 0;
}

.language-section {
  width: 100%;
}

.language-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 0.4rem;
  border: 1px solid #e2e8f0;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.8rem;
  position: relative;
}

.language-toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
  color: #64748b;
  font-size: 0.75rem;
}

.language-toggle-icon.collapsed {
  transform: rotate(-90deg);
}

.language-toggle-icon i {
  font-size: 0.75rem;
}

.language-header:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.language-toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
  color: #64748b;
  font-size: 0.75rem;
}

.language-toggle-icon.collapsed {
  transform: rotate(-90deg);
}

.language-toggle-icon i {
  font-size: 0.75rem;
}

.language-tasks {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.language-header:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6);
}

.language-flag {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.language-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.language-count {
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: auto;
  min-width: 1.3rem;
  text-align: center;
  line-height: 1.2;
}

.task-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-item-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.task-item-actions {
  display: flex;
  gap: 0.5rem;
}

/* Language grouping styles for Crowdin-style board */
.language-group {
  margin-bottom: 1.5em;
}
.language-section {
  margin-bottom: 1em;
}
.language-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  background: #f1f5f9;
  color: #374151;
}
.language-flag {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 600;
}
.language-name {
  font-weight: 600;
  color: #374151;
}
.language-count {
  background: #e0e7ff;
  color: #2563eb;
  border-radius: 8px;
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
  min-width: 1.3rem;
  text-align: center;
  font-weight: 600;
  margin-left: 0.5rem;
}
.language-tasks {
  margin-left: 0.5rem;
}

/* Swimlanes styles for multiple languages */
.kanban-swimlanes {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.language-swimlane {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  overflow: hidden;
}

.language-swimlane-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
  color: #374151;
  width: 100%;
  box-sizing: border-box;
}

.language-swimlane-header .language-name {
  margin-right: 0;
}

.language-swimlane-header:hover {
  background: #e2e8f0;
}

.language-swimlane-content {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  min-height: 200px;
}

.language-swimlane-content .kanban-column {
  flex: 1;
  background: white;
  border-radius: 6px;
  padding: 0.8rem;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.language-swimlane-content .task-card {
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.language-swimlane-content .task-card-link {
  width: 100%;
  max-width: 100%;
}

.language-swimlane-content .kanban-column {
  min-height: 100px;
  max-height: none;
  overflow-y: auto;
}

.todo-column {
  border-left: 4px solid #a3a3a3;
}

.inprogress-column {
  border-left: 4px solid #2563eb;
}

.done-column {
  border-left: 4px solid #059669;
}
</style>
