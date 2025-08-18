<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { taskService, Task, ProjectFile, TaskHistory } from '../services/task.service';
import CreateTaskDialog from './CreateTaskDialog.vue';
import EditTaskDialog from './EditTaskDialog.vue';
import WorkflowManager from './WorkflowManager.vue';


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

// Workflow management state
const activeTab = ref<'board' | 'all' | 'workflows'>('board');
const showWorkflowManager = ref(false);


// Add new state for dynamic statuses
const availableStatuses = ref<any[]>([]);
const statusesLoading = ref(false);

// Load statuses from API
async function loadStatuses() {
  statusesLoading.value = true;
  try {
    const { data } = await axiosInstance.get(`/task-statuses/project/${props.projectId}`);
    availableStatuses.value = data;
    console.log('🚀 Loaded statuses from API:', availableStatuses.value);
  } catch (error) {
    console.error('Error loading statuses:', error);
    // Fallback to default statuses if API fails
    availableStatuses.value = [
      { id: '1', name: 'To Do', color: '#ef4444', order: 1 },
      { id: '2', name: 'In Progress', color: '#f59e0b', order: 2 },
      { id: '3', name: 'Done', color: '#10b981', order: 3 }
    ];
  } finally {
    statusesLoading.value = false;
  }
}

// Auto-detect statuses from tasks and merge with API statuses
const autoDetectStatuses = computed(() => {
  const detectedStatuses = new Map<string, { id: string; name: string; color: string; order: number }>();

  // Start with API statuses
  availableStatuses.value.forEach((status: any) => {
    detectedStatuses.set(status.id, { ...status });
  });

  // Add new statuses from tasks that might not be in API
  tasks.value.forEach((task: Task) => {
    if (task.status && typeof task.status === 'object' && task.status !== null) {
      const statusId = (task.status as any).id || (task.status as any).type || '';
      const statusName = (task.status as any).name || 'Unknown';
      const statusColor = (task.status as any).color || '#6b7280';

      if (statusId && !detectedStatuses.has(statusId)) {
        // This is a new status not in our API statuses
        detectedStatuses.set(statusId, {
          id: statusId,
          name: statusName,
          color: statusColor,
          order: detectedStatuses.size + 1
        });
        console.log(`🆕 Found new status: ${statusId} - ${statusName}`);
      }
    }
  });

  const result = Array.from(detectedStatuses.values()).sort((a, b) => a.order - b.order);
  console.log('🔍 Combined statuses (API + detected):', result);

  return result;
});

// Column reordering state and helpers
const statusOrder = ref<string[]>([]);
const draggedStatusId = ref<string | null>(null);
const statusDragOverId = ref<string | null>(null);

// Ordered view of statuses based on user preference (persisted)
const orderedStatuses = computed(() => {
  const all = autoDetectStatuses.value;
  // Merge existing order with any new statuses
  const existing = new Set(statusOrder.value);
  const merged: string[] = [...statusOrder.value];
  all.forEach((s: any) => {
    if (!existing.has(s.id)) {
      merged.push(s.id);
    }
  });
  // Remove ids that no longer exist
  const valid = new Set(all.map((s: any) => s.id));
  const filtered = merged.filter((id) => valid.has(id));
  // Keep state in sync
  if (
    filtered.length !== statusOrder.value.length ||
    filtered.some((id, idx) => id !== statusOrder.value[idx])
  ) {
    statusOrder.value = filtered;
  }

  const indexOf = (id: string) => filtered.indexOf(id);
  return all.slice().sort((a: any, b: any) => indexOf(a.id) - indexOf(b.id));
});

function loadStatusOrder() {
  try {
    const key = `kanbanStatusOrder:${props.projectId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) statusOrder.value = parsed as string[];
    }
  } catch {}
}

function saveStatusOrder() {
  try {
    const key = `kanbanStatusOrder:${props.projectId}`;
    localStorage.setItem(key, JSON.stringify(statusOrder.value));
  } catch {}
}

watch(statusOrder, () => {
  saveStatusOrder();
});

onMounted(() => {
  loadStatusOrder();
  loadStatuses();
});

// Watch for tab changes to refresh statuses when switching from workflows to board
watch(activeTab, (newTab: 'board' | 'all' | 'workflows', oldTab: 'board' | 'all' | 'workflows') => {
  if (oldTab === 'workflows' && newTab === 'board') {
    console.log('🔄 Switching from workflows to board, refreshing statuses...');
    loadStatuses();
  }
});

function onStatusDragStart(event: DragEvent, statusId: string) {
  draggedStatusId.value = statusId;
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', statusId);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onStatusDragOver(event: DragEvent, overStatusId: string) {
  event.preventDefault();
  statusDragOverId.value = overStatusId;
}

function onStatusDrop(event: DragEvent, dropStatusId: string) {
  event.preventDefault();
  const sourceId = draggedStatusId.value;
  if (!sourceId || sourceId === dropStatusId) {
    statusDragOverId.value = null;
    draggedStatusId.value = null;
    return;
  }

  const order = [...statusOrder.value];
  const fromIdx = order.indexOf(sourceId);
  const toIdx = order.indexOf(dropStatusId);
  if (fromIdx !== -1 && toIdx !== -1) {
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, sourceId);
    statusOrder.value = order;
  }

  statusDragOverId.value = null;
  draggedStatusId.value = null;
}

function onStatusDragEnd() {
  statusDragOverId.value = null;
  draggedStatusId.value = null;
}

// Removed debug board info computed

// Removed debug-only computed helpers: allTaskStatuses, tasksWithoutStatus, tasksWithUnknownStatus

// Local state như các tab khác
const tasks = ref<Task[]>([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
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
const selectedTask = ref<Task|null>(null);
const projectFiles = ref<ProjectFile[]>([]);
const showCreateForm = ref(false);
const showDeleteModal = ref(false);
const taskToDelete = ref<Task|null>(null);
const isDeleting = ref(false);

// Close task confirmation modal state
const showCloseTaskModal = ref(false);
const taskToClose = ref<Task|null>(null);
const isClosingTask = ref(false);

// Reopen task confirmation modal state
const showReopenTaskModal = ref(false);
const taskToReopen = ref<Task|null>(null);
const isReopeningTask = ref(false);
const reopenReason = ref('');
// Reopen target status selection
const reopenTargetStatusId = ref<string>('');
const showReopenStatusDropdown = ref(false);
const reopenStatusSearch = ref('');

const reopenStatusOptions = computed(() => {
  const query = reopenStatusSearch.value.trim().toLowerCase();
  const notClosed = (s: any) => String(s.type || '').toLowerCase() !== 'closed' && s.isClosed !== true;
  return orderedStatuses.value
    .filter((s: any) => notClosed(s))
    .filter((s: any) => !query || String(s.name || '').toLowerCase().includes(query));
});

function formatStatusTypeLabel(type: string | undefined) {
  if (!type) return '';
  const t = String(type).toLowerCase();
  const map: Record<string, string> = {
    open: 'Open',
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
    overdue: 'Overdue',
    closed: 'Closed',
  };
  return map[t] || type;
}


const toast = useToast();

// Task action menu state
const showTaskActionMenu = ref(false);
const taskActionMenuPosition = ref({ x: 0, y: 0 });
const currentTaskForAction = ref<Task|null>(null);

// Task history state
const taskHistory = ref<TaskHistory[]>([]);
const taskHistoryLoading = ref(false);
const activeTaskDetailTab = ref<'details' | 'history'>('details');

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
    tasks.value.forEach((task: Task) => {
      console.log(`Task ${task.id}: "${task.title}" -> language: "${task.language}"`);
    });

    // Debug: Check task statuses
    console.log('🔍 Status Debug - Tasks with statuses:');
    tasks.value.forEach((task: Task) => {
      console.log(`Task ${task.id}: "${task.title}" -> status: "${task.status}" (type: ${typeof task.status})`);
    });

    const languagesFound = new Set();
    tasks.value.forEach((task: Task) => {
      if (task.language) languagesFound.add(task.language);
    });
    console.log('🌐 Unique languages found:', Array.from(languagesFound));

    // Reload statuses after loading tasks to ensure we have the latest status data
    await loadStatuses();

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
    error.value = errorMessage;
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
  } catch (error: unknown) {
    console.error('Error checking task existence:', error);
    return false;
  }
}

// Function để load task history
async function loadTaskHistory(taskId: string) {
  if (!taskId) return;

  taskHistoryLoading.value = true;
  try {
    const history = await taskService.getTaskHistory(taskId);
    // Map backend history (createdAt/comment/fromStatus/toStatus) to UI model
    const mapped = (history as any[]).map((h: any) => {
      const performedAt = h.performedAt || h.createdAt;
      const action = h.action || (h.fromStatus || h.toStatus ? 'status_change' : 'created');
      const description = h.description || h.comment || '';
      const metadata = h.metadata || {
        fromStatus: h.fromStatus?.id || h.fromStatus?.type || h.fromStatus?.name || h.fromStatus,
        toStatus: h.toStatus?.id || h.toStatus?.type || h.toStatus?.name || h.toStatus,
      };
      return {
        id: String(h.id),
        action,
        description,
        performedAt,
        reason: h.reason,
        metadata,
      } as TaskHistory;
    });
    taskHistory.value = mapped;
    console.log('Task history loaded:', mapped);
  } catch (error: unknown) {
    console.error('Error loading task history:', error);
    taskHistory.value = [];
  } finally {
    taskHistoryLoading.value = false;
  }
}

// Function để format history action
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

// Function để get status display name
function getStatusDisplayName(status: any): string {
  if (!status) return 'Unknown';

  let statusId: string;

  // Handle both string and object status
  if (typeof status === 'string') {
    statusId = status;
  } else if (typeof status === 'object' && status !== null) {
    statusId = status.id || status.type || '';
  } else {
    return 'Unknown';
  }

  if (!statusId) return 'Unknown';

  const statusObj = availableStatuses.value.find((s: any) => s.id === statusId);
  return statusObj ? statusObj.name : statusId;
}

// Function to get tasks by status
function getTasksByStatus(statusId: string): Task[] {
  console.log(`🔍 Getting tasks for status: ${statusId}`);
  console.log(`🔍 Available tasks:`, filteredTasks.value.length);
  console.log(`🔍 Task statuses:`, filteredTasks.value.map((t: Task) => ({ id: t.id, status: t.status })));

  const tasks = filteredTasks.value.filter((task: Task) => {
    if (!task.status) {
      console.log(`❌ Task ${task.id} has no status`);
      return false;
    }

    let taskStatusId: string;

    // Handle both string and object status
    if (typeof task.status === 'string') {
      taskStatusId = task.status;
    } else if (typeof task.status === 'object' && task.status !== null) {
      // If status is an object, try to get the id or type
      taskStatusId = (task.status as any).id || (task.status as any).type || '';
      console.log(`🔍 Task ${task.id} has object status:`, task.status, '-> extracted ID:', taskStatusId);
    } else {
      console.log(`❌ Task ${task.id} has invalid status type:`, typeof task.status, task.status);
      return false;
    }

    if (!taskStatusId) {
      console.log(`❌ Task ${task.id} has empty status ID`);
      return false;
    }

    const matches = taskStatusId === statusId; // Remove toLowerCase() for exact match
    console.log(`🔍 Task ${task.id}: status="${taskStatusId}" vs "${statusId}" -> ${matches}`);
    return matches;
  });

  console.log(`✅ Found ${tasks.length} tasks for status ${statusId}`);
  return tasks;
}

// Function to get status color
function getStatusColor(statusId: any): string {
  if (!statusId) return '#6b7280';

  let id: string;

  // Handle both string and object status
  if (typeof statusId === 'string') {
    id = statusId;
  } else if (typeof statusId === 'object' && statusId !== null) {
    id = statusId.id || statusId.type || '';
  } else {
    return '#6b7280';
  }

  if (!id) return '#6b7280';

  const statusObj = availableStatuses.value.find((s: any) => s.id === id);
  return statusObj ? statusObj.color : '#6b7280';
}

// Helper: check if a status (by id) has type "closed"
function isClosedTypeStatus(statusId: string): boolean {
  const statusObj = availableStatuses.value.find((s: any) => s.id === statusId);
  if (!statusObj || !statusObj.type) return false;
  return String(statusObj.type).toLowerCase() === 'closed';
}

// Function để format time only
function formatTimeOnly(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Function để format date only
function formatDateOnly(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
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

  console.log('🔍 Before filtering - Total tasks:', filtered.length);
  console.log('🔍 Task statuses before filtering:', filtered.map((t: Task) => ({ id: t.id, status: t.status })));

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

  console.log('🔍 After filtering - Final filtered tasks:', filtered.length);
  console.log('🔍 Final task statuses:', filtered.map((t: Task) => ({ id: t.id, status: t.status })));

  return filtered;
});

// These computed properties are now replaced by the dynamic getTasksByStatus function



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
  console.log('Tasks with languages:', filteredTasks.value.map((t: Task) => ({ id: t.id, title: t.title, language: t.language })));
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
// These computed properties are now replaced by the dynamic tasksByLanguageAndStatus

// --- Add new computed for language grouping within columns ---
const tasksByLanguageAndStatus = computed(() => {
  // { [language]: { [statusId]: Task[] } }
  const result: Record<string, Record<string, Task[]>> = {};
  availableLanguages.value.forEach((lang: string) => {
    result[lang] = {};
    autoDetectStatuses.value.forEach((status: any) => {
      result[lang][status.id] = [];
    });
  });
  filteredTasks.value.forEach((task: Task) => {
    const lang = task.language || 'Unknown';
    if (!result[lang]) {
      result[lang] = {};
      autoDetectStatuses.value.forEach((status: any) => {
        result[lang][status.id] = [];
      });
    }
    if (task.status) {
      let statusId: string = '';

      if (typeof task.status === 'string') {
        statusId = task.status;
      } else if (typeof task.status === 'object' && task.status !== null) {
        statusId = (task.status as any).id || (task.status as any).type || '';
      }

      if (statusId && result[lang][statusId]) {
        result[lang][statusId].push(task);
      }
    }
  });
  return result;
});

// These computed properties are now replaced by the dynamic structure



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

// Computed property để lấy string count an toàn
const selectedTaskStringCount = computed(() => {
  if (!selectedTask.value?.fileId || !filePagesData.value) return '-';

  const pages = filePagesData.value.get(selectedTask.value.fileId);
  if (!pages || !Array.isArray(pages)) return '-';

  const totalCount = pages.reduce((sum: number, p: { stringCount: number }) => sum + (p.stringCount || 0), 0);
  return totalCount > 0 ? totalCount.toString() : '-';
});

// Computed property để lấy tên cột khi drag over
const dragOverColumnName = computed(() => {
  if (!dragOverColumn.value) return '';

  const status = autoDetectStatuses.value.find((s: any) => s.id === dragOverColumn.value);
  return status ? status.name : dragOverColumn.value;
});

// Thêm ref để lưu file pages data
const filePagesData = ref<Map<string, any[]>>(new Map());
const currentPageInfo = ref<{pageNumber: number, stringCount: number} | null>(null);

// Function để load file pages data
async function loadFilePagesData(fileId: string) {
  if (filePagesData.value.has(fileId)) {
    return filePagesData.value.get(fileId);
  }

  try {
    const pages = await taskService.getFileParts(props.projectId, props.branchId || '', fileId);
    filePagesData.value.set(fileId, pages);
    return pages;
  } catch (err) {
    console.error('Failed to load file pages:', err);
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

// Function để load translation strings cho task (giống như trong editor)
async function loadTranslationStringsForTask(task: Task) {
  if (!task.fileId || !task.projectId || !task.branchId) {
    return { total: 0, translated: 0, percentage: 0 };
  }

  try {
    // Sử dụng ngôn ngữ của task, fallback về 'en' nếu không có
    const taskLanguage = task.language || 'en';

    // Lấy translation strings cho file của task
    const { data } = await axiosInstance.get('/translation/strings', {
      params: {
        projectId: task.projectId,
        branchId: task.branchId,
        fileId: task.fileId,
        language: taskLanguage,
      },
    });

    const strings = Array.isArray(data) ? data : [];

    // Lọc strings theo page nếu có
    let filteredStrings = strings;

    // Check for multiple pages first
    if (task.pages && Array.isArray(task.pages) && task.pages.length > 0) {
      filteredStrings = strings.filter((str: any) =>
        task.pages!.includes(str.filePart)
      );
    }
    // Check for single page
    else if (task.page !== undefined) {
      filteredStrings = strings.filter((str: any) => str.filePart === task.page);
    }

    // Sử dụng deduplication giống như trong editor
    const seen = new Set<string>();
    const uniqueStrings: any[] = [];

    for (const str of filteredStrings) {
      const key = `${str.fileId}_${str.originalText}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStrings.push(str);
      }
    }
    const translatedStrings = uniqueStrings.filter((str: any) =>
      str.translatedText && str.translatedText.trim().length > 0
    );

    const total = uniqueStrings.length;
    const translated = translatedStrings.length;
    const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;

    return { total, translated, percentage };
  } catch (error) {
    console.error('Error loading translation strings for task:', error);
    return { total: 0, translated: 0, percentage: 0 };
  }
}

// Reactive state để lưu progress thực tế
const taskProgressData = ref<Map<string, { total: number; translated: number; percentage: number }>>(new Map());

// Function để load progress cho task (sử dụng logic mới)
async function loadTaskProgress(taskId: string) {
  if (taskProgressData.value.has(taskId)) {
    return taskProgressData.value.get(taskId);
  }

  try {
    const task = tasks.value.find((t: Task) => t.id === taskId);
    if (!task) {
      return { total: 0, translated: 0, percentage: 0 };
    }

    const progress = await loadTranslationStringsForTask(task);
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

// Interval ID for progress refresh
let progressIntervalId: number | undefined;

// Function để select task và clear cache
function selectTask(task: Task | null) {
  console.log('selectTask called with:', task);
  if (task) {
    // Clear cache cho task này để đảm bảo lấy dữ liệu mới nhất
    taskProgressData.value.delete(task.id);
    console.log('Cleared progress cache for task:', task.id);
  }
  selectedTask.value = task;
}

// Function để update progress cho selected task
async function updateSelectedTaskProgress() {
  if (!selectedTask.value) {
    selectedTaskProgress.value = 0;
    selectedTaskProgressText.value = '0%';
    return;
  }

  selectedTaskProgressLoading.value = true;
  try {
    // Clear cache để đảm bảo lấy dữ liệu mới nhất
    taskProgressData.value.delete(selectedTask.value.id);

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

// Function để refresh progress cho tất cả tasks (có thể gọi từ bên ngoài)
async function refreshAllTaskProgress() {
  console.log('Refreshing all task progress...');
  taskProgressData.value.clear();

  // Refresh progress cho selected task nếu có
  if (selectedTask.value) {
    await updateSelectedTaskProgress();
  }
}

// Drag & Drop functionality
const draggedTask = ref<Task | null>(null);
const draggedIndex = ref<number>(-1);
const isDragging = ref(false);
const dragOverColumn = ref<string | null>(null);
const didDrop = ref(false);

function handleDragStart(event: DragEvent, task: Task, index: number) {
  draggedTask.value = task;
  draggedIndex.value = index;
  isDragging.value = true;
  didDrop.value = false;
  if (!event.dataTransfer) {
    return;
  }
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', task.id);

  // Add visual feedback
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '0.5';
  }

  console.log('Drag started successfully for task:', task.id);
}

function handleDragEnd(event: DragEvent) {
  // If drop event did not fire but we have a target column, perform the move here as a fallback
  if (!didDrop.value && draggedTask.value && dragOverColumn.value) {
    // Use index 0 as default insertion point
    void moveTaskToColumn(draggedTask.value, dragOverColumn.value, 0);
  }

  isDragging.value = false;
  draggedTask.value = null;
  didDrop.value = false;

  // Remove visual feedback
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '1';
  }
}

function handleDragOver(event: DragEvent, statusId: string) {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';

  // Add visual feedback to drop zone
  const target = event.currentTarget as HTMLElement;
  if (target && !target.classList.contains('drag-over')) {
    target.classList.add('drag-over');
  }

  // Set the column being dragged over
  dragOverColumn.value = statusId;
  console.log('Drag over status:', statusId);
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

async function handleDrop(event: DragEvent, targetStatusId: string) {
  event.preventDefault();

  // Remove visual feedback
  const target = event.currentTarget as HTMLElement;
  if (target) {
    target.classList.remove('drag-over');
  }

  // Clear drag over column
  dragOverColumn.value = null;
  didDrop.value = true;

  if (!draggedTask.value) {
    console.log('No dragged task found');
    return;
  }

  console.log('Dropping task:', draggedTask.value.id, 'to status:', targetStatusId);

  // Get drop position (you could enhance this to detect exact position)
  const dropIndex = getDropIndex(event, targetStatusId);

  // Actually move the task to the target status
  const taskToMove = draggedTask.value;
  await moveTaskToColumn(taskToMove, targetStatusId, dropIndex);

  console.log(`Task ${taskToMove.id} moved to ${targetStatusId} status at position ${dropIndex}`);
}

async function moveTaskToColumn(task: Task, targetStatusId: string, dropIndex: number) {
  // Update task status based on target status
  // When you drag a task to a different column, it changes the status
  const newStatus = targetStatusId;

  // Update task status in database
  try {
    console.log('Sending API request:', { taskId: task.id, statusId: newStatus });
    const updatedTask = await taskService.updateTask(task.id, { statusId: newStatus });

    // Force refresh task data from server to ensure we have the latest timestamps
    const freshTaskData = await taskService.getTask(task.id);
    console.log('🔄 Fresh task data from server:', {
      id: freshTaskData.id,
      status: freshTaskData.status,
      startedAt: freshTaskData.startedAt,
      completedAt: freshTaskData.completedAt
    });

    // Update the task in the local array with fresh data from server
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === task.id);
    if (taskIndex !== -1) {
      // Replace with fresh data from server
      tasks.value[taskIndex] = freshTaskData;
      console.log('Task updated in local array with fresh server data');
    }

    // Refresh selectedTask if it's the same task with fresh data
    if (selectedTask.value?.id === task.id) {
      console.log('🔄 Refreshing selectedTask with fresh data from server');
      selectedTask.value = freshTaskData;
      console.log('🔄 Selected task after refresh:', {
        id: selectedTask.value.id,
        status: selectedTask.value.status,
        startedAt: selectedTask.value.startedAt,
        completedAt: selectedTask.value.completedAt
      });
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
      targetStatus: targetStatusId,
      newStatus: newStatus,
      dropIndex: dropIndex,
      startedAt: freshTaskData.startedAt,
      completedAt: freshTaskData.completedAt
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

function getDropIndex(event: DragEvent, targetStatusId: string): number {
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

// Function để update page info khi selectedTask thay đổi
async function updatePageInfo() {
  console.log('updatePageInfo called with selectedTask:', selectedTask.value);

  if (!selectedTask.value?.fileId) {
    console.log('No fileId, setting currentPageInfo to null');
    currentPageInfo.value = null;
    return;
  }

  console.log('Loading file pages for fileId:', selectedTask.value.fileId);
  const pages = await loadFilePagesData(selectedTask.value.fileId);
  console.log('Loaded pages:', pages);

  let totalStringCount = 0;
  let pageNumbers: number[] = [];

  // Check if we have multiple pages selected
  if (selectedTask.value?.pages && Array.isArray(selectedTask.value.pages) && selectedTask.value.pages.length > 0) {
    console.log('Multiple pages selected:', selectedTask.value.pages);

    // Calculate total string count for all selected pages
    for (const pageNum of selectedTask.value.pages) {
      const page = pages.find((p: any) => {
        const pageNumber = Number(p.part);
        const taskPageNumber = Number(pageNum);
        return pageNumber === taskPageNumber;
      });

      if (page) {
        totalStringCount += page.stringCount || 0;
        pageNumbers.push(page.pageNumber || (Number(pageNum) + 1));
      }
    }

    if (pageNumbers.length > 0) {
      currentPageInfo.value = {
        pageNumber: pageNumbers[0], // Show first page number
        stringCount: totalStringCount
      };
      console.log('Set currentPageInfo for multiple pages to:', currentPageInfo.value);
      return;
    }
  }

  // Check for single page
  if (selectedTask.value?.page !== undefined && selectedTask.value?.page !== null) {
    console.log('Single page selected:', selectedTask.value.page);

    // Try to find the page with multiple fallback strategies
    let page = pages.find((p: any) => {
      console.log('Checking page:', p, 'against page:', selectedTask.value?.page);
      // Convert both to numbers for comparison
      const pageNumber = Number(p.part);
      const taskPageNumber = Number(selectedTask.value?.page);
      console.log('Comparing pageNumber:', pageNumber, 'with taskPageNumber:', taskPageNumber);
      return pageNumber === taskPageNumber;
    });

    // If not found, try to find by pageNumber
    if (!page && selectedTask.value.page !== undefined) {
      const taskPageNumber = Number(selectedTask.value.page);
      page = pages.find((p: any) => p.pageNumber === (taskPageNumber + 1));
      console.log('Trying to find by pageNumber, found:', page);
    }

    // If still not found, try to find the first page
    if (!page && pages.length > 0) {
      page = pages[0];
      console.log('Using first page as fallback:', page);
    }

    console.log('Final found page:', page);

    if (page) {
      const taskPageNumber = Number(selectedTask.value.page);
      currentPageInfo.value = {
        pageNumber: page.pageNumber || (taskPageNumber + 1),
        stringCount: page.stringCount
      };
      console.log('Set currentPageInfo for single page to:', currentPageInfo.value);
      return;
    }
  }

  // If no specific pages found, calculate total for all pages
  if (pages.length > 0) {
    console.log('No specific pages found, calculating total for all pages');
    totalStringCount = pages.reduce((sum: number, p: any) => sum + (p.stringCount || 0), 0);
    currentPageInfo.value = {
      pageNumber: pages[0].pageNumber || 1,
      stringCount: totalStringCount
    };
    console.log('Set currentPageInfo for all pages to:', currentPageInfo.value);
    return;
  }

  console.log('No matching pages found, setting currentPageInfo to null');
  currentPageInfo.value = null;
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

function getAvatarUrl(avatarUrl?: string) {
  // Hosting-safe defaults and URL resolution
  // 1) Data-URI default avatar to avoid any base-path or asset hosting issues
  const defaultAvatar =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n' +
      '<circle cx="32" cy="32" r="32" fill="#e5e7eb"/>\n' +
      '<circle cx="32" cy="24" r="12" fill="#cbd5e1"/>\n' +
      '<path d="M16 54c4-10 28-10 32 0" fill="#cbd5e1"/>\n' +
      '</svg>'
    );

  if (!avatarUrl) return defaultAvatar;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  if (avatarUrl.startsWith('data:')) return avatarUrl;

  // 2) Build absolute API base: prefer env, else current origin + /api
  const baseFromEnv = (import.meta.env.VITE_API_URL as string | undefined) || '';
  const apiBase = (baseFromEnv || (window.location.origin + '/api')).replace(/\/$/, '');

  // 3) Normalize known backend return formats
  if (avatarUrl.startsWith('/users/')) return apiBase + avatarUrl;
  if (avatarUrl.startsWith('/uploads/')) return apiBase + '/users' + avatarUrl;
  if (avatarUrl.startsWith('users/')) return apiBase + '/' + avatarUrl;
  if (avatarUrl.startsWith('uploads/')) return apiBase + '/users/' + avatarUrl;

  return defaultAvatar;
}

function getUserDisplayName(user: any): string {
  if (!user) return '';
  const full = (user.fullName || '').toString().trim();
  if (full.length > 0) return full;
  return user.username || '';
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

  // Close reopen dropdown on outside click
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.status-select-wrapper') && showReopenStatusDropdown.value) {
      showReopenStatusDropdown.value = false;
    }
  });

  // Add ESC key listener for task action menu
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && showTaskActionMenu.value) {
      closeTaskActionMenu();
    }
  });

  // Add click outside listener for assignee and reviewer dropdowns
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.assignee-dropdown') && !target.closest('.reviewer-dropdown') &&
      !target.closest('.assignee-dropdown-trigger') && !target.closest('.reviewer-dropdown-trigger')) {
      closeAllDropdowns();
    }
  });

  // Add keyboard event listener for close task modal
  document.addEventListener('keydown', handleKeydown);

  // Auto-refresh progress every 30 seconds when a task is selected
  progressIntervalId = setInterval(() => {
    if (selectedTask.value && !selectedTaskProgressLoading.value) {
      updateSelectedTaskProgress();
    }
  }, 30000);
});

onBeforeUnmount(() => {
  // Không clear data để giữ lại khi re-mount
  // Remove keyboard event listener
  document.removeEventListener('keydown', handleKeydown);

  // Clear progress refresh interval
  if (progressIntervalId) {
    clearInterval(progressIntervalId);
  }
});

// Watch cho projectId và branchId thay đổi - giống như ProjectTranslationTab
watch([() => props.projectId, () => props.branchId], () => {
  console.log('Project ID or Branch ID changed, reloading tasks and files...');
  loadTasks();
  loadProjectFiles();
  loadStatuses();
});

watch(() => selectedTask.value, async (task: Task | null) => {
  if (task && task.createdBy) {
    console.log('createdBy:', task.createdBy);
  }
  // Update page info khi task thay đổi
  updatePageInfo();
  // Update progress khi task thay đổi
  await updateSelectedTaskProgress();
  // Load task history khi task thay đổi
  if (task) {
    await loadTaskHistory(task.id);
  } else {
    taskHistory.value = [];
  }
});

// Workflow management methods
function showWorkflowManagement() {
  activeTab.value = 'workflows';
  showWorkflowManager.value = true;
}

function showStatusManagement() {
  // This function is kept for compatibility but no longer changes tabs
  // Status management is now handled through WorkflowManager
}

function showWorkflowBoardView() {
  activeTab.value = 'board';
}

function handleWorkflowUpdated() {
  // Refresh tasks when workflow is updated
  reloadTasks();
  toast.add({
    severity: 'success',
    summary: 'Workflow Updated',
    detail: 'Workflow has been updated successfully.',
    life: 3000
  });
}

function handleStatusDeleted() {
  // Refresh statuses and tasks when status is deleted
  loadStatuses();
  reloadTasks();
}

function handleStatusCreated() {
  // Refresh statuses when new status is created
  loadStatuses();
  toast.add({
    severity: 'success',
    summary: 'Status Created',
    detail: 'New status has been created successfully.',
    life: 3000
  });
}

function handleStatusUpdated() {
  // Refresh statuses when status is updated
  loadStatuses();
  toast.add({
    severity: 'success',
    summary: 'Status Updated',
    detail: 'Status has been updated successfully.',
    life: 3000
  });
}



// Expose methods for parent component
defineExpose({
  reloadTasks,
  loadProjectFiles,
  refreshAllTaskProgress,
  showWorkflowManagement,
  showStatusManagement,
  showWorkflowBoardView
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

// Function to show close task confirmation modal
function showCloseTaskConfirmation(task: Task) {
  taskToClose.value = task;
  showCloseTaskModal.value = true;
}

// Function to handle close task confirmation
async function confirmCloseTask() {
  if (!taskToClose.value) return;

  isClosingTask.value = true;

  try {
    console.log('Closing task:', taskToClose.value.id, taskToClose.value.title);

    // Call API to close task
    await taskService.closeTask(taskToClose.value.id);

    // Update task status in local array
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === taskToClose.value!.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = { ...tasks.value[taskIndex], status: 'closed' };
    }

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Task Closed',
      detail: `Task "${taskToClose.value.title}" has been closed successfully.`,
      life: 3000
    });

    // Close task action menu
    closeTaskActionMenu();

    // Quay về board task sau khi đóng
    selectedTask.value = null;

    console.log('Task closed successfully:', taskToClose.value.id);
  } catch (error: any) {
    console.error('Failed to close task:', error);

    // Show error message
    toast.add({
      severity: 'error',
      summary: 'Close Failed',
      detail: error.response?.data?.message || 'Failed to close task. Please try again.',
      life: 4000
    });
  } finally {
    // Reset modal state
    showCloseTaskModal.value = false;
    taskToClose.value = null;
    isClosingTask.value = false;
  }
}

// Function to cancel close task
function cancelCloseTask() {
  showCloseTaskModal.value = false;
  taskToClose.value = null;
}

// Function to show reopen task confirmation modal
function showReopenTaskConfirmation(task: Task) {
  taskToReopen.value = task;
  reopenReason.value = '';
  // default selected status: first non-closed status or keep empty
  const firstAvailable = orderedStatuses.value.find((s: any) => !isClosedTypeStatus(s.id));
  reopenTargetStatusId.value = firstAvailable?.id || '';
  showReopenTaskModal.value = true;
}

// Function to handle reopen task confirmation
async function confirmReopenTask() {
  if (!taskToReopen.value) return;

  isReopeningTask.value = true;

  try {
    console.log('Reopening task:', taskToReopen.value.id, taskToReopen.value.title);

    // Call API to reopen task with reason
    await taskService.reopenTask(taskToReopen.value.id, reopenReason.value);

    // If user selected a target status, move the task to that status
    let updatedLocalTask: Task | null = null;
    if (reopenTargetStatusId.value) {
      try {
        updatedLocalTask = await taskService.updateTask(taskToReopen.value.id, {
          statusId: reopenTargetStatusId.value
        } as any);
      } catch (e) {
        console.warn('Failed to set target status after reopen; falling back to default status.', e);
      }
    }

    // Update task status in local array (use updatedLocalTask if available)
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === taskToReopen.value!.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = updatedLocalTask || { ...tasks.value[taskIndex], status: 'pending' };
    }

    // Reload task detail nếu đang xem task detail
    if (selectedTask.value && selectedTask.value.id === taskToReopen.value.id) {
      try {
        const updatedTask = await taskService.getTask(taskToReopen.value.id);
        selectedTask.value = updatedTask;
        // Watch function sẽ tự động reload history
      } catch (error) {
        console.error('Failed to reload task detail:', error);
      }
    }

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Task Reopened',
      detail: `Task "${taskToReopen.value.title}" has been reopened successfully.`,
      life: 3000
    });

    // Close task action menu
    closeTaskActionMenu();

    // Quay về board task sau khi reopen
    selectedTask.value = null;
    activeTab.value = 'board';

    console.log('Task reopened successfully:', taskToReopen.value.id);
  } catch (error: any) {
    console.error('Failed to reopen task:', error);

    // Show error message
    toast.add({
      severity: 'error',
      summary: 'Reopen Failed',
      detail: error.response?.data?.message || 'Failed to reopen task. Please try again.',
      life: 4000
    });
  } finally {
    // Reset modal state
    showReopenTaskModal.value = false;
    taskToReopen.value = null;
    isReopeningTask.value = false;
    reopenReason.value = '';
    reopenTargetStatusId.value = '';
  }
}

// Function to cancel reopen task
function cancelReopenTask() {
  showReopenTaskModal.value = false;
  taskToReopen.value = null;
  reopenReason.value = '';
}

// Handle keyboard events for modal
function handleKeydown(event: KeyboardEvent) {
  if (showCloseTaskModal.value) {
    if (event.key === 'Escape') {
      cancelCloseTask();
    } else if (event.key === 'Enter' && !isClosingTask.value) {
      confirmCloseTask();
    }
  }

  if (showReopenTaskModal.value) {
    if (event.key === 'Escape') {
      cancelReopenTask();
    } else if (event.key === 'Enter' && !isReopeningTask.value) {
      confirmReopenTask();
    }
  }
}



async function closeTask(task: Task) {
  showCloseTaskConfirmation(task);
}

// Function để mở lại task đã đóng
async function reopenTask(task: Task) {
  showReopenTaskConfirmation(task);
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
  const taskIndex = tasks.value.findIndex((t: Task) => t.id === updatedTask.id);
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

// Function to format selected pages for display
function formatSelectedPages(pages: number[]): string {
  if (!pages || pages.length === 0) return '';

  if (pages.length === 1) {
    return `Page ${pages[0] + 1}`;
  }

  // Sort pages and find consecutive ranges
  const sortedPages = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sortedPages[0];
  let end = sortedPages[0];

  for (let i = 1; i < sortedPages.length; i++) {
    if (sortedPages[i] === end + 1) {
      end = sortedPages[i];
    } else {
      if (start === end) {
        ranges.push(`Page ${start + 1}`);
      } else {
        ranges.push(`Pages ${start + 1}-${end + 1}`);
      }
      start = end = sortedPages[i];
    }
  }

  // Add the last range
  if (start === end) {
    ranges.push(`Page ${start + 1}`);
  } else {
    ranges.push(`Pages ${start + 1}-${end + 1}`);
  }

  return ranges.join(', ');
}

// State for assignee and reviewer dropdowns
const showAssigneeDropdown = ref(false);
const showReviewerDropdown = ref(false);
const isUpdatingAssignee = ref(false);
const isUpdatingReviewer = ref(false);
// Swap confirmation state
const swapPrompt = ref<{ context: 'assignee' | 'reviewer'; memberId: string } | null>(null);

// Function to update task assignee
async function updateTaskAssignee(newAssigneeId: string) {
  if (!selectedTask.value || isUpdatingAssignee.value) return;

  // Check if new assignee is already the reviewer
  if (newAssigneeId !== 'none' && selectedTask.value.reviewer && selectedTask.value.reviewer.id === newAssigneeId) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Assignment',
      detail: 'A person cannot be both assignee and reviewer for the same task.',
      life: 4000
    });
    return;
  }

  isUpdatingAssignee.value = true;

  try {
    console.log('Updating task assignee:', selectedTask.value.id, 'to:', newAssigneeId);

    // Call API to update task assignee
    const updatedTask = await taskService.updateTask(selectedTask.value.id, {
      assignedToId: newAssigneeId === 'none' ? undefined : newAssigneeId
    });

    // Update local task data
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === selectedTask.value!.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = updatedTask;
    }

    // Update selected task
    selectedTask.value = updatedTask;

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Assignee Updated',
      detail: 'Task assignee has been updated successfully.',
      life: 3000
    });

    // Close dropdown
    showAssigneeDropdown.value = false;

    console.log('Task assignee updated successfully');
  } catch (error: any) {
    console.error('Failed to update task assignee:', error);

    // Show error message
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: error.response?.data?.message || 'Failed to update task assignee. Please try again.',
      life: 4000
    });
  } finally {
    isUpdatingAssignee.value = false;
  }
}

// Function to update task reviewer
async function updateTaskReviewer(newReviewerId: string) {
  if (!selectedTask.value || isUpdatingReviewer.value) return;

  // Check if new reviewer is already the assignee
  if (newReviewerId !== 'none' && selectedTask.value.assignedTo && selectedTask.value.assignedTo.id === newReviewerId) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Assignment',
      detail: 'A person cannot be both assignee and reviewer for the same task.',
      life: 4000
    });
    return;
  }

  isUpdatingReviewer.value = true;

  try {
    console.log('Updating task reviewer:', selectedTask.value.id, 'to:', newReviewerId);

    // Call API to update task reviewer
    const updatedTask = await taskService.updateTask(selectedTask.value.id, {
      reviewerId: newReviewerId === 'none' ? undefined : newReviewerId
    });

    // Update local task data
    const taskIndex = tasks.value.findIndex((t: Task) => t.id === selectedTask.value!.id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = updatedTask;
    }

    // Update selected task
    selectedTask.value = updatedTask;

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Reviewer Updated',
      detail: 'Task reviewer has been updated successfully.',
      life: 3000
    });

    // Close dropdown
    showReviewerDropdown.value = false;

    console.log('Task reviewer updated successfully');
  } catch (error: any) {
    console.error('Failed to update task reviewer:', error);

    // Show success message
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: error.response?.data?.message || 'Failed to update task reviewer. Please try again.',
      life: 4000
    });
  } finally {
    isUpdatingReviewer.value = false;
  }
}

// Swap roles between current assignee and reviewer in a single update call
async function swapAssigneeAndReviewer(newAssigneeId: string, newReviewerId: string) {
  if (!selectedTask.value) return;
  // Avoid redundant request if ids are the same
  if (newAssigneeId === newReviewerId) return;

  // Lock both operations
  isUpdatingAssignee.value = true;
  isUpdatingReviewer.value = true;

  try {
    const updatedTask = await taskService.updateTask(selectedTask.value.id, {
      assignedToId: newAssigneeId,
      reviewerId: newReviewerId,
    });

    const taskIndex = tasks.value.findIndex((t: Task) => t.id === selectedTask.value!.id);
    if (taskIndex !== -1) tasks.value[taskIndex] = updatedTask;
    selectedTask.value = updatedTask;

    toast.add({
      severity: 'success',
      summary: 'Roles Swapped',
      detail: 'Assignee and reviewer have been swapped successfully.',
      life: 3000,
    });

    showAssigneeDropdown.value = false;
    showReviewerDropdown.value = false;
  } catch (error: any) {
    console.error('Failed to swap roles:', error);
    toast.add({
      severity: 'error',
      summary: 'Swap Failed',
      detail: error?.response?.data?.message || 'Failed to swap assignee and reviewer.',
      life: 4000,
    });
  } finally {
    isUpdatingAssignee.value = false;
    isUpdatingReviewer.value = false;
  }
}

// Wrapper: selecting an assignee; if selecting current reviewer, offer swap
async function handleSelectAssignee(memberId: string) {
  if (!selectedTask.value) return;
  const currentReviewerId = selectedTask.value.reviewer?.id;
  const currentAssigneeId = selectedTask.value.assignedTo?.id;
  if (currentReviewerId && memberId === currentReviewerId && currentAssigneeId) {
    swapPrompt.value = { context: 'assignee', memberId };
  } else {
    await updateTaskAssignee(memberId);
  }
}

// Wrapper: selecting a reviewer; if selecting current assignee, offer swap
async function handleSelectReviewer(memberId: string) {
  if (!selectedTask.value) return;
  const currentReviewerId = selectedTask.value.reviewer?.id;
  const currentAssigneeId = selectedTask.value.assignedTo?.id;
  if (currentAssigneeId && memberId === currentAssigneeId && currentReviewerId) {
    swapPrompt.value = { context: 'reviewer', memberId };
  } else {
    await updateTaskReviewer(memberId);
  }
}

async function confirmSwap() {
  if (!selectedTask.value || !swapPrompt.value) return;
  const currentAssigneeId = selectedTask.value.assignedTo?.id;
  const currentReviewerId = selectedTask.value.reviewer?.id;
  if (swapPrompt.value.context === 'assignee' && currentAssigneeId) {
    await swapAssigneeAndReviewer(swapPrompt.value.memberId, currentAssigneeId);
  } else if (swapPrompt.value.context === 'reviewer' && currentReviewerId) {
    await swapAssigneeAndReviewer(selectedTask.value.assignedTo?.id || '', swapPrompt.value.memberId);
  }
  swapPrompt.value = null;
}

function cancelSwap() {
  swapPrompt.value = null;
}

// Function to toggle assignee dropdown
function toggleAssigneeDropdown() {
  showAssigneeDropdown.value = !showAssigneeDropdown.value;
  if (showAssigneeDropdown.value) {
    showReviewerDropdown.value = false; // Close other dropdown
  }
}

// Function to toggle reviewer dropdown
function toggleReviewerDropdown() {
  showReviewerDropdown.value = !showReviewerDropdown.value;
  if (showReviewerDropdown.value) {
    showAssigneeDropdown.value = false; // Close other dropdown
  }
}

// Function to close all dropdowns
function closeAllDropdowns() {
  showAssigneeDropdown.value = false;
  showReviewerDropdown.value = false;
}

</script>

<template>
  <div class="kanban-tab-wrapper">
    <!-- Task Detail View -->
    <div
      v-if="selectedTask"
      class="task-detail-view"
    >
      <div class="task-detail-header-row">
        <button
          class="back-btn"
          @click="selectedTask = null"
        >
          <i class="pi pi-arrow-left" />
          Board
        </button>
        <div class="task-action-menu-wrapper">
          <button
            class="task-action-menu-btn"
            title="Task actions"
            @click="openTaskActionMenu($event, selectedTask)"
          >
            <i class="pi pi-ellipsis-v" />
          </button>
        </div>
      </div>
      <div class="task-detail-header">
        <span class="task-detail-id">#{{ selectedTask.id }}</span>
        <span class="task-detail-title">{{ getCleanTaskTitle(selectedTask.title) }}</span>
      </div>

      <!-- Task Detail Tabs -->
      <div class="task-detail-tabs">
        <button
          :class="['task-detail-tab-btn', { active: activeTaskDetailTab === 'details' }]"
          @click="activeTaskDetailTab = 'details'"
        >
          Details
        </button>
        <button
          :class="['task-detail-tab-btn', { active: activeTaskDetailTab === 'history' }]"
          @click="activeTaskDetailTab = 'history'"
        >
          History
        </button>
      </div>

      <!-- Details Tab Content -->
      <div
        v-if="activeTaskDetailTab === 'details'"
        class="task-detail-content"
      >
        <div class="task-detail-meta-box">
          <div class="task-detail-meta-col">
            <div class="meta-label">
              DETAILS
            </div>
            <div>Language: <b>{{ selectedTask.language ? getLanguageName(selectedTask.language) : 'Not specified' }}</b></div>
            <div class="progress-bar-bg">
              <div
                v-if="selectedTaskProgressLoading"
                class="progress-loading"
              >
                <i class="pi pi-spin pi-spinner" /> Loading...
              </div>
              <div
                v-else
                class="progress-bar"
                :style="{width: selectedTaskProgress + '%'}"
              />
            </div>
            <div class="progress-text">
              {{ selectedTaskProgressText }}
            </div>
          </div>
          <div class="task-detail-meta-col">
            <div class="meta-label">
              DATES
            </div>
            <div>Created: {{ formatDate(selectedTask.createdAt) }}</div>
            <div>Modified: {{ formatDate(selectedTask.createdAt) }}</div>


            <div v-if="selectedTask.dueDate">
              <span>Due date:</span>
              <span :class="{ 'overdue': isOverdue(selectedTask.dueDate) }">
                <span v-if="isOverdue(selectedTask.dueDate)">⚠️</span>
                {{ formatDateTime(selectedTask.dueDate) }}
              </span>
            </div>
            <div v-else>
              No due date
            </div>
          </div>
          <div class="task-detail-meta-col">
            <div class="meta-label">
              RESOURCES
            </div>
            <div v-if="selectedTask.fileId">
              <div
                class="file-name-container"
                :title="selectedTaskFileName"
              >
                File: <b>{{ selectedTaskTruncatedFileName }}</b>
              </div>
              <div v-if="selectedTask.page !== undefined && selectedTask.page !== null">
                Page: <b>{{ currentPageInfo?.pageNumber || 'Loading...' }}</b> ({{ currentPageInfo?.stringCount || '0' }} strings)
                <!-- Debug info: currentPageInfo = {{ JSON.stringify(currentPageInfo) }}, selectedTask.page = {{ selectedTask.page }} -->
                <!-- Temporary debug info -->
                <div style="font-size: 10px; color: #666; margin-top: 5px;">
                  Debug: page={{ selectedTask.page }}, fileId={{ selectedTask.fileId }}, currentPageInfo={{ JSON.stringify(currentPageInfo) }}
                </div>
              </div>
              <div v-else-if="selectedTask.pages && selectedTask.pages.length > 0">
                Pages: <b>{{ formatSelectedPages(selectedTask.pages) }}</b>
                <!-- Debug: pages={{ JSON.stringify(selectedTask.pages) }} -->
              </div>
              <div v-else-if="selectedTask.page !== undefined && selectedTask.page !== null">
                Pages: <b>Page {{ selectedTask.page + 1 }}</b>
                <!-- Debug: page={{ selectedTask.page }} -->
              </div>
              <div v-else>
                Pages: <b>No file</b>
              </div>
            </div>
            <div v-else>
              <div>Files: <b>0</b></div>
            </div>
          </div>
          <div class="task-detail-meta-col">
            <div class="meta-label">
              AUTHOR
            </div>
            <div class="author-avatar">
              <img
                v-if="selectedTask.createdBy.avatarUrl"
                :src="getAvatarUrl(selectedTask.createdBy.avatarUrl)"
                alt="avatar"
              >
              <span v-else>{{ selectedTask.createdBy.fullName ? selectedTask.createdBy.fullName[0] : selectedTask.createdBy.username[0] }}</span>
            </div>
            <div><b>{{ selectedTask.createdBy.fullName }}</b> {{ selectedTask.createdBy.username }}</div>
          </div>
        </div>
        <div class="task-detail-members">
          <div class="members-title">
            Members
          </div>
          <table class="members-table">
            <thead>
            <tr>
              <th>Assignee</th>
              <th>Reviewer</th>
              <th>Assigned strings</th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td v-if="selectedTask.assignedTo">
                <div class="assignee-dropdown-wrapper">
                  <div
                    class="assignee-dropdown-trigger assignee-info"
                    @click="toggleAssigneeDropdown"
                  >
                    <img
                      :src="getAvatarUrl(selectedTask.assignedTo.avatarUrl)"
                      :alt="getUserDisplayName(selectedTask.assignedTo)"
                      class="assignee-avatar"
                    >
                    <span class="assignee-name">{{ getUserDisplayName(selectedTask.assignedTo) }}</span>
                    <i class="pi pi-chevron-down dropdown-arrow" />
                  </div>

                  <!-- Assignee Dropdown -->
                  <div v-if="showAssigneeDropdown" class="assignee-dropdown">

                    <div class="dropdown-options">
                      <div
                        v-for="member in projectMembers"
                        :key="member.id"
                        class="dropdown-option"
                        :class="{
                          'current-assignee': member.id === selectedTask.assignedTo?.id,
                          'disabled-option': member.id === selectedTask.reviewer?.id
                        }"
                        @click="member.id === selectedTask.reviewer?.id ? handleSelectAssignee(member.id) : updateTaskAssignee(member.id)"
                      >
                        <div class="member-option">
                          <img
                            :src="getAvatarUrl(member.avatarUrl)"
                            :alt="getUserDisplayName(member)"
                            class="member-avatar"
                          >
                          <span class="member-name">{{ getUserDisplayName(member) }}</span>
                          <span v-if="member.id === selectedTask.assignedTo?.id" class="current-badge">Current</span>
                          <span v-if="member.id === selectedTask.reviewer?.id" class="disabled-badge">Already Reviewer</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="isUpdatingAssignee" class="dropdown-loading">
                      <i class="pi pi-spin pi-spinner" /> Updating...
                    </div>
                  </div>
                </div>
              </td>
              <td v-else>
                <div class="assignee-dropdown-wrapper">
                  <div
                    class="assignee-dropdown-trigger empty-assignee"
                    @click="toggleAssigneeDropdown"
                  >
                    <span class="empty-text">Click to assign</span>
                    <i class="pi pi-chevron-down dropdown-arrow" />
                  </div>

                  <!-- Assignee Dropdown for empty assignee -->
                  <div v-if="showAssigneeDropdown" class="assignee-dropdown">

                    <div class="dropdown-options">
                      <div
                        v-for="member in projectMembers"
                        :key="member.id"
                        class="dropdown-option"
                        :class="{ 'disabled-option': member.id === selectedTask.reviewer?.id }"
                        @click="member.id === selectedTask.reviewer?.id ? handleSelectAssignee(member.id) : updateTaskAssignee(member.id)"
                      >
                        <div class="member-option">
                          <img
                            :src="getAvatarUrl(member.avatarUrl)"
                            :alt="getUserDisplayName(member)"
                            class="member-avatar"
                          >
                          <span class="member-name">{{ getUserDisplayName(member) }}</span>
                          <span v-if="member.id === selectedTask.reviewer?.id" class="disabled-badge">Already Reviewer</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="isUpdatingAssignee" class="dropdown-loading">
                      <i class="pi pi-spin pi-spinner" /> Updating...
                    </div>
                  </div>
                </div>
              </td>
              <td v-if="selectedTask.reviewer">
                <div class="reviewer-dropdown-wrapper">
                  <div
                    class="reviewer-dropdown-trigger assignee-info"
                    @click="toggleReviewerDropdown"
                  >
                    <img
                      :src="getAvatarUrl(selectedTask.reviewer.avatarUrl)"
                      :alt="getUserDisplayName(selectedTask.reviewer)"
                      class="assignee-avatar"
                    >
                    <span class="assignee-name">{{ getUserDisplayName(selectedTask.reviewer) }}</span>
                    <i class="pi pi-chevron-down dropdown-arrow" />
                  </div>

                  <!-- Reviewer Dropdown -->
                  <div v-if="showReviewerDropdown" class="reviewer-dropdown">

                    <div class="dropdown-options">
                      <div
                        v-for="member in projectMembers"
                        :key="member.id"
                        class="dropdown-option"
                        :class="{
                          'current-reviewer': member.id === selectedTask.reviewer?.id,
                          'disabled-option': member.id === selectedTask.assignedTo?.id
                        }"
                        @click="member.id === selectedTask.assignedTo?.id ? handleSelectReviewer(member.id) : updateTaskReviewer(member.id)"
                      >
                        <div class="member-option">
                          <img
                            v-if="member.avatarUrl"
                            :src="getAvatarUrl(member.avatarUrl)"
                            :alt="member.fullName"
                            class="member-avatar"
                          >
                          <span
                            v-else
                            class="member-avatar-placeholder"
                          >{{ member.fullName ? member.fullName[0] : member.username[0] }}</span>
                          <span class="member-name">{{ member.fullName || member.username }}</span>
                          <span v-if="member.id === selectedTask.reviewer?.id" class="current-badge">Current</span>
                          <span v-if="member.id === selectedTask.assignedTo?.id" class="disabled-badge">Already Assignee</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="isUpdatingReviewer" class="dropdown-loading">
                      <i class="pi pi-spin pi-spinner" /> Updating...
                    </div>
                  </div>
                </div>
              </td>
              <td v-else>
                <div class="reviewer-dropdown-wrapper">
                  <div
                    class="reviewer-dropdown-trigger empty-reviewer"
                    @click="toggleReviewerDropdown"
                  >
                    <span class="empty-text">Click to assign reviewer</span>
                    <i class="pi pi-chevron-down dropdown-arrow" />
                  </div>

                  <!-- Reviewer Dropdown for empty reviewer -->
                  <div v-if="showReviewerDropdown" class="reviewer-dropdown">

                    <div class="dropdown-options">
                      <div
                        v-for="member in projectMembers"
                        :key="member.id"
                        class="dropdown-option"
                        :class="{ 'disabled-option': member.id === selectedTask.assignedTo?.id }"
                        @click="member.id === selectedTask.assignedTo?.id ? handleSelectReviewer(member.id) : updateTaskReviewer(member.id)"
                      >
                        <div class="member-option">
                          <img
                            v-if="member.avatarUrl"
                            :src="getAvatarUrl(member.avatarUrl)"
                            :alt="member.fullName"
                            class="member-avatar"
                          >
                          <span
                            v-else
                            class="member-avatar-placeholder"
                          >{{ member.fullName ? member.fullName[0] : member.username[0] }}</span>
                          <span class="member-name">{{ member.fullName || member.username }}</span>
                          <span v-if="member.id === selectedTask.assignedTo?.id" class="disabled-badge">Already Assignee</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="isUpdatingReviewer" class="dropdown-loading">
                      <i class="pi pi-spin pi-spinner" /> Updating...
                    </div>
                  </div>
                </div>
              </td>
              <td>
                {{ currentPageInfo?.stringCount !== undefined ? currentPageInfo.stringCount : selectedTaskStringCount }}
              </td>
            </tr>

            </tbody>
          </table>
        </div>

        <!-- Swap Confirm Modal (non-blocking, top-center) -->
        <div v-if="swapPrompt" class="swap-modal">
          <div class="modal">
            <div class="modal-title">Confirm swap</div>
            <div class="modal-body">
              This member holds the other role. Swap assignee and reviewer?
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="cancelSwap">Cancel</button>
              <button class="btn btn-primary" @click="confirmSwap">Swap</button>
            </div>
          </div>
        </div>
      </div>

      <!-- History Tab Content -->
      <div
        v-if="activeTaskDetailTab === 'history'"
        class="task-detail-content"
      >
        <div class="task-history-container">
          <div class="history-header">
            <h3>Task History</h3>
            <div
              v-if="taskHistoryLoading"
              class="history-loading"
            >
              <i class="pi pi-spin pi-spinner" /> Loading history...
            </div>
          </div>

          <div
            v-if="!taskHistoryLoading && taskHistory.length === 0"
            class="no-history"
          >
            <p>No history available for this task.</p>
          </div>

          <div
            v-else-if="!taskHistoryLoading"
            class="history-timeline"
          >
            <div
              v-for="item in taskHistory"
              :key="item.id"
              class="timeline-item"
            >
              <div class="timeline-dot" />
              <div class="timeline-content">
                <div class="timeline-header">
                  <div class="timeline-action">
                    <span class="action-icon">
                      <span v-if="item.action === 'created'">🆕</span>
                      <span v-else-if="item.action === 'status_change'">🔁</span>
                      <span v-else-if="item.action === 'assignment_change'">👤</span>
                      <span v-else-if="item.action === 'due_date_change'">📅</span>
                      <span v-else-if="item.action === 'closed'">✅</span>
                      <span v-else-if="item.action === 'reopened'">🔄</span>
                      <span v-else>ℹ️</span>
                    </span>
                    <span class="action-text">{{ formatHistoryAction(item.action) }}</span>
                  </div>
                  <div class="timeline-time">
                    <span class="time-icon">🕒</span>
                    {{ formatDateOnly(item.performedAt) }} at {{ formatTimeOnly(item.performedAt) }}
                  </div>
                </div>

                <div class="timeline-description">
                  {{ item.description }}
                </div>

                <!-- Hiển thị reason cho reopen action -->
                <div
                  v-if="item.action === 'reopened' && item.reason"
                  class="timeline-reason"
                >
                  <div class="reason-label">
                    📝 Reason:
                  </div>
                  <div class="reason-text">
                    {{ item.reason }}
                  </div>
                </div>

                <div
                  v-if="item.metadata && item.metadata.fromStatus && item.metadata.toStatus"
                  class="timeline-status-change"
                >
                  <div class="status-badges">
                    <span class="status-badge old-status">
                      <span class="status-indicator">
                        <span v-if="item.metadata.fromStatus === 'pending'">🔴</span>
                        <span v-else-if="item.metadata.fromStatus === 'in_progress'">🟡</span>
                        <span v-else-if="item.metadata.fromStatus === 'completed'">🟢</span>
                        <span v-else-if="item.metadata.fromStatus === 'closed'">✅</span>
                        <span v-else>⚪</span>
                      </span>
                      {{ getStatusDisplayName(item.metadata.fromStatus) }}
                    </span>
                    <span class="status-arrow">→</span>
                    <span class="status-badge new-status">
                      <span class="status-indicator">
                        <span v-if="item.metadata.toStatus === 'pending'">🔴</span>
                        <span v-else-if="item.metadata.toStatus === 'in_progress'">🟡</span>
                        <span v-else-if="item.metadata.toStatus === 'completed'">🟢</span>
                        <span v-else-if="item.metadata.toStatus === 'closed'">✅</span>
                        <span v-else>⚪</span>
                      </span>
                      {{ getStatusDisplayName(item.metadata.toStatus) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task View -->
    <div
      v-else-if="showCreateForm"
      class="create-task-view"
    >
      <div class="create-task-header">
        <button
          class="back-btn"
          @click="cancelCreateTask"
        >
          <i class="pi pi-arrow-left" />
          Back to Board
        </button>
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
    <div
      v-else-if="showEditTaskInline"
      class="edit-task-view"
    >
      <div class="edit-task-header">
        <button
          class="back-btn"
          @click="closeEditTaskInline"
        >
          <i class="pi pi-arrow-left" />
          Back to Task Detail
        </button>
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
    <div
      v-else
      class="kanban-board-view"
    >
      <!-- Tabs for Board, All Tasks, Workflows, and Statuses -->
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
          <button
            :class="['tab-btn', { active: activeTab === 'workflows' }]"
            @click="activeTab = 'workflows'"
          >
            Workflows
          </button>

        </div>
        <div class="tabs-right">
          <button
            v-if="canCreateTask && activeTab === 'board'"
            class="create-task-btn-header"
            @click="showCreateTaskForm"
          >
            <i class="pi pi-plus" />
            Create Task
          </button>
        </div>
      </div>

      <!-- Board View -->
      <div v-if="activeTab === 'board'">
        <!-- Dynamic Status Board -->
        <div>

          <!-- Search and Filter Bar -->
          <div class="search-filter-container">
            <!-- Search Section -->
            <div class="search-section">
              <div class="search-input-wrapper">
                <i class="pi pi-search search-icon" />
                <input
                  v-model="search"
                  type="text"
                  placeholder="Search tasks..."
                  class="search-input"
                >
              </div>
              <!-- Filter Button -->
              <button
                class="filter-btn"
                :class="{ active: showFilters }"
                @click="toggleFilters"
              >
                <i class="pi pi-filter" />
                Filters
              </button>
            </div>

            <!-- Filter Section -->
            <div
              v-if="showFilters"
              class="filter-section"
            >
              <!-- Custom Assignee Select -->
              <div class="custom-select-wrapper">
                <div
                  class="custom-select-display filter-select"
                  :class="{ active: activeCustomSelect === 'assignee' }"
                  @click="toggleCustomSelect('assignee')"
                >
                  Assignee: {{ selectedFilters.assignee }}
                  <i class="pi pi-chevron-down custom-select-arrow" />
                </div>
                <div
                  v-if="activeCustomSelect === 'assignee'"
                  class="custom-select-dropdown"
                >
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
                  :class="{ active: activeCustomSelect === 'createdBy' }"
                  @click="toggleCustomSelect('createdBy')"
                >
                  Created by: {{ selectedFilters.createdBy }}
                  <i class="pi pi-chevron-down custom-select-arrow" />
                </div>
                <div
                  v-if="activeCustomSelect === 'createdBy'"
                  class="custom-select-dropdown"
                >
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
                  :class="{ active: activeCustomSelect === 'file' }"
                  @click="toggleCustomSelect('file')"
                >
                  File: {{ selectedFilters.file }}
                  <i class="pi pi-chevron-down custom-select-arrow" />
                </div>
                <div
                  v-if="activeCustomSelect === 'file'"
                  class="custom-select-dropdown"
                >
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
                  class="filter-dropdown-btn"
                  :class="{ active: activeSubDropdown === 'dueDate' }"
                  @click="toggleFilterSelect('dueDate')"
                >
                  Due date: {{ selectedFilters.dueDate }}
                  <i class="pi pi-chevron-down filter-arrow" />
                </button>
                <div
                  v-if="activeSubDropdown === 'dueDate'"
                  class="filter-dropdown-menu"
                >
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
                    <i class="pi pi-times" />
                    Clear Selection
                  </div>
                  <!-- Date Picker for Custom Range -->
                  <div
                    v-if="selectedFilters.dueDate === 'Custom Range'"
                    class="date-picker-container"
                  >
                    <div class="date-picker-calendar">
                      <div class="calendar-header">
                        <button
                          class="calendar-nav-btn"
                          @click="navigateMonth('prev')"
                        >
                          <i class="pi pi-chevron-left" />
                        </button>
                        <div class="calendar-months-title">
                          <span class="month-title">{{ formatMonth(currentMonth) }}</span>
                          <span class="month-title">{{ formatMonth(nextMonth) }}</span>
                        </div>
                        <button
                          class="calendar-nav-btn"
                          @click="navigateMonth('next')"
                        >
                          <i class="pi pi-chevron-right" />
                        </button>
                      </div>
                      <div class="calendar-grid-container">
                        <!-- First Month -->
                        <div class="calendar-month">
                          <div class="calendar-weekdays">
                            <div
                              v-for="day in weekDays"
                              :key="day"
                              class="weekday"
                            >
                              {{ day }}
                            </div>
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
                            <div
                              v-for="day in weekDays"
                              :key="day"
                              class="weekday"
                            >
                              {{ day }}
                            </div>
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
              <button
                class="clear-filter-btn"
                @click="clearFilters"
              >
                <span>✕</span>
                Clear
              </button>
            </div>
          </div>

          <!-- Global Empty State -->
          <div
            v-if="loading"
            class="global-loading-state"
          >
            <div class="loading-icon">
              ⏳
            </div>
            <div class="loading-text">
              Loading tasks...
            </div>
          </div>

          <div
            v-else-if="filteredTasks.length === 0"
            class="global-empty-state"
          >
            <div class="global-empty-icon">
              ⏱️
            </div>
            <div class="global-empty-text">
              No tasks yet
            </div>
            <div class="global-empty-subtext">
              Create your first task to get started with this project
            </div>
            <button
              v-if="canCreateTask"
              class="global-empty-btn"
              @click="showCreateTaskForm"
            >
              <i class="pi pi-plus" />
              Create Task
            </button>
          </div>

          <!-- Kanban Board with Language Grouping (Crowdin style) -->
          <div v-else class="kanban-container">
            <!-- Wrapper to contain scroll completely -->
            <div class="kanban-scroll-wrapper">
              <!-- Scrollable area for status headers and task columns -->
              <div class="kanban-scrollable-area">
                <!-- Inner container that can expand beyond parent -->
                <div class="kanban-inner-container">
                  <!-- Dynamic status headers based on available statuses -->
                  <div class="kanban-status-header-row">
                    <div
                      v-for="status in orderedStatuses"
                      :key="status.id"
                      class="kanban-status-card"
                      :style="{ '--status-color': status.color }"
                      draggable="true"
                      @dragstart="onStatusDragStart($event, status.id)"
                      @dragover="onStatusDragOver($event, status.id); $event.currentTarget && ($event.currentTarget as HTMLElement).classList.add('drag-over')"
                      @drop="onStatusDrop($event, status.id)"
                      @dragend="onStatusDragEnd; $event.currentTarget && ($event.currentTarget as HTMLElement).classList.remove('drag-over')"
                    >
                      <div class="status-bar" :style="{ backgroundColor: status.color }" />
                      <span class="status-title">{{ status.name }}</span>
                      <span
                        v-if="getTasksByStatus(status.id).length"
                        class="status-count"
                      >{{ getTasksByStatus(status.id).length }}</span>

                    </div>
                  </div>

                  <!-- Single Language: Dynamic Column Structure -->
                  <div
                    v-if="!shouldShowLanguageGrouping"
                    class="kanban-board"
                  >
                    <!-- Dynamic columns based on available statuses (ordered) -->
                    <div
                      v-for="status in orderedStatuses"
                      :key="status.id"
                      class="kanban-column"
                      :style="{ borderLeft: '4px solid ' + getStatusColor(status.id) }"
                      @dragover="handleDragOver($event, status.id)"
                      @dragleave="handleDragLeave($event)"
                      @drop="handleDrop($event, status.id)"
                    >
                      <div
                        v-if="isDragging && dragOverColumn === status.id"
                        class="drag-over-title"
                      >
                        <div class="drag-over-title-content">
                          <span class="drag-over-icon">📋</span>
                          <span class="drag-over-text">Move to {{ status.name }}</span>
                        </div>
                      </div>
                      <div
                        v-if="loading"
                        class="kanban-loading"
                      >
                        Loading...
                      </div>
                      <div v-else>
                        <div
                          v-for="(task, idx) in getTasksByStatus(status.id)"
                          :key="task.id"
                          class="task-card-link"
                          @click="() => { console.log('Task card clicked:', task.id); selectTask(task); }"
                        >
                          <div
                            :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]"
                            tabindex="0"
                            draggable="true"
                            @dragstart="handleDragStart($event, task, idx)"
                            @dragend="handleDragEnd($event)"
                            @keydown.enter="selectTask(task)"
                          >
                            <!-- Task card content -->
                            <div
                              class="task-status-badge"
                              :class="[getStatusDisplayName(task.status) || 'unknown', { overdue: task.dueDate && isOverdue(task.dueDate) }]"
                            >
                              <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                              <span v-else>{{ getStatusDisplayName(task.status) }}</span>
                            </div>
                            <div class="crowdin-row-1">
                              <div class="crowdin-col-left">
                                <span class="task-id">#{{ idx + 1 }}</span>
                                <span
                                  class="task-label crowdin-title"
                                  :class="{ clickable: true }"
                                >{{ getCleanTaskTitle(task.title) }}</span>
                              </div>
                            </div>
                            <div class="crowdin-row-2">
                              <div class="crowdin-col-left">
                                <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                              </div>
                            </div>
                            <div
                              v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))"
                              class="crowdin-row-3"
                            >
                              <div class="crowdin-col-left">
                                <span class="arrow">→</span>
                                <span class="due-date-label">
                          <span
                            v-if="isOverdue(task.dueDate)"
                            class="due-icon"
                          >⚠️</span>
                          <span
                            v-else
                            class="due-icon"
                          >⏰</span>
                          Due date:
                          <span
                            class="due-date-value"
                            :class="{ 'overdue': isOverdue(task.dueDate) }"
                          >
                            {{ formatDateTime(task.dueDate) }}
                          </span>
                        </span>
                              </div>
                            </div>
                            <div class="crowdin-row-4">
                              <div class="crowdin-col-left">
                                <div class="task-meta">
                                  <!-- Avatar assignee -->
                                  <div
                                    v-if="task.assignedTo"
                                    class="assignee-info"
                                  >
                                    <img
                                      v-if="task.assignedTo.avatarUrl"
                                      :src="getAvatarUrl(task.assignedTo.avatarUrl)"
                                      :alt="task.assignedTo.fullName"
                                      class="assignee-avatar"
                                      :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)"
                                    >
                                    <span
                                      v-else
                                      class="assignee-avatar-placeholder"
                                      :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)"
                                    >{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                                    <span class="assignee-name">{{ getUserDisplayName(task.assignedTo) }}</span>
                                  </div>
                                  <!-- File info với icon động và tooltip -->
                                  <div
                                    v-if="task.fileId"
                                    class="file-info"
                                  >
                            <span
                              class="file-icon"
                              :title="getFileName(task.fileId)"
                            >{{ getFileIcon(getFileName(task.fileId)) }}</span>
                                    <span
                                      class="file-name"
                                      :title="getFileName(task.fileId)"
                                    >{{ getFileName(task.fileId) }}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div
                              v-if="task.type"
                              class="crowdin-row-5"
                            >
                              <div class="crowdin-col-left">
                                <div class="task-type-tag crowdin-tag">
                                  {{ task.type }}
                                </div>
                              </div>
                            </div>
                            <!-- Close button shown only when column status type is closed -->
                            <div
                              v-if="isClosedTypeStatus(status.id) && task.status !== 'closed'"
                              class="crowdin-row-6"
                            >
                              <div class="crowdin-col-right">
                                <button
                                  class="close-task-btn"
                                  :disabled="task.status === 'closed'"
                                  :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                                  @click.stop="closeTask(task)"
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
                  <div
                    v-else
                    class="kanban-swimlanes"
                  >
                    <div
                      v-for="language in availableLanguages"
                      :key="language"
                      class="language-swimlane"
                    >
                      <!-- Language Header -->
                      <div
                        class="language-swimlane-header"
                        @click="toggleLanguageCollapse(language)"
                      >
                        <i
                          class="language-toggle-icon pi"
                          :class="isLanguageCollapsed(language) ? 'pi-chevron-right collapsed' : 'pi-chevron-up'"
                        />
                        <div class="language-flag">
                          {{ language.substring(0, 2).toUpperCase() }}
                        </div>
                        <span class="language-name">{{ getLanguageName(language) }}</span>
                        <span class="language-count">({{ autoDetectStatuses.reduce((total: number, status: any) => total + (tasksByLanguageAndStatus[language][status.id]?.length || 0), 0) }})</span>
                      </div>

                      <!-- Language Tasks Row -->
                      <div
                        v-if="!isLanguageCollapsed(language)"
                        class="language-swimlane-content"
                      >
                        <!-- Dynamic columns based on available statuses (ordered) -->
                        <div
                          v-for="status in orderedStatuses"
                          :key="status.id"
                          class="kanban-column"
                          :class="`${status.id}-column`"
                          :style="{ borderLeft: '4px solid ' + getStatusColor(status.id) }"
                          @dragover="handleDragOver($event, status.id)"
                          @dragleave="handleDragLeave($event)"
                          @drop="handleDrop($event, status.id)"
                        >
                          <div
                            v-for="(task, idx) in getTasksByStatus(status.id).filter((t: Task) => t.language === language)"
                            :key="task.id"
                            class="task-card-link"
                            @click="selectTask(task)"
                          >
                            <div
                              :class="['task-card', 'crowdin-style', { 'overdue-card': task.dueDate && isOverdue(task.dueDate) }]"
                              tabindex="0"
                              draggable="true"
                              @dragstart="handleDragStart($event, task, idx)"
                              @dragend="handleDragEnd($event)"
                              @keydown.enter="selectTask(task)"
                            >
                              <!-- Task card content -->
                              <div
                                class="task-status-badge"
                                :class="[task.status, { overdue: task.dueDate && isOverdue(task.dueDate) }]"
                              >
                                <span v-if="task.dueDate && isOverdue(task.dueDate)">Overdue</span>
                                <span v-else>{{ getStatusDisplayName(task.status) }}</span>
                              </div>
                              <div class="crowdin-row-1">
                                <div class="crowdin-col-left">
                                  <span class="task-id">#{{ idx + 1 }}</span>
                                  <span
                                    class="task-label crowdin-title"
                                    :class="{ clickable: true }"
                                  >{{ getCleanTaskTitle(task.title) }}</span>
                                </div>
                              </div>
                              <div class="crowdin-row-2">
                                <div class="crowdin-col-left">
                                  <span class="date-text">{{ formatDate(task.createdAt) }}</span>
                                </div>
                              </div>
                              <div
                                v-if="task.dueDate && (isOverdue(task.dueDate) || formatDate(task.dueDate) !== formatDate(task.createdAt))"
                                class="crowdin-row-3"
                              >
                                <div class="crowdin-col-left">
                                  <span class="arrow">→</span>
                                  <span class="due-date-label">
                            <span
                              v-if="isOverdue(task.dueDate)"
                              class="due-icon"
                            >⚠️</span>
                            <span
                              v-else
                              class="due-icon"
                            >⏰</span>
                            Due date:
                            <span
                              class="due-date-value"
                              :class="{ 'overdue': isOverdue(task.dueDate) }"
                            >
                              {{ formatDateTime(task.dueDate) }}
                            </span>
                          </span>
                                </div>
                              </div>
                              <div class="crowdin-row-4">
                                <div class="crowdin-col-left">
                                  <div class="task-meta">
                                    <!-- Avatar assignee -->
                                    <div
                                      v-if="task.assignedTo"
                                      class="assignee-info"
                                    >
                                      <img
                                        v-if="task.assignedTo.avatarUrl"
                                        :src="getAvatarUrl(task.assignedTo.avatarUrl)"
                                        :alt="task.assignedTo.fullName"
                                        class="assignee-avatar"
                                        :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)"
                                      >
                                      <span
                                        v-else
                                        class="assignee-avatar-placeholder"
                                        :title="'Assigned to: ' + (task.assignedTo.fullName || task.assignedTo.username)"
                                      >{{ task.assignedTo.fullName ? task.assignedTo.fullName[0] : task.assignedTo.username[0] }}</span>
                                      <span class="assignee-name">{{ getUserDisplayName(task.assignedTo) }}</span>
                                    </div>
                                    <!-- File info với icon động và tooltip -->
                                    <div
                                      v-if="task.fileId"
                                      class="file-info"
                                    >
                              <span
                                class="file-icon"
                                :title="getFileName(task.fileId)"
                              >{{ getFileIcon(getFileName(task.fileId)) }}</span>
                                      <span
                                        class="file-name"
                                        :title="getFileName(task.fileId)"
                                      >{{ getFileName(task.fileId) }}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                v-if="task.type"
                                class="crowdin-row-5"
                              >
                                <div class="crowdin-col-left">
                                  <div class="task-type-tag crowdin-tag">
                                    {{ task.type }}
                                  </div>
                                </div>
                              </div>
                              <!-- Close button shown only when column status type is closed -->
                              <div
                                v-if="isClosedTypeStatus(status.id) && task.status !== 'closed'"
                                class="crowdin-row-6"
                              >
                                <div class="crowdin-col-right">
                                  <button
                                    class="close-task-btn"
                                    :disabled="task.status === 'closed'"
                                    :title="task.status === 'closed' ? 'Task already closed' : 'Close task'"
                                    @click.stop="closeTask(task)"
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
            </div>
          </div>
        </div>
      </div>

      <!-- Workflows View -->
      <div
        v-else-if="activeTab === 'workflows'"
        class="workflows-view"
      >
        <WorkflowManager
          :project-id="projectId"
          :project-members="projectMembers"
          :project-groups="projectGroups"
          @workflow-updated="handleWorkflowUpdated"
          @status-deleted="handleStatusDeleted"
          @status-created="handleStatusCreated"
          @status-updated="handleStatusUpdated"
        />
      </div>



      <!-- All Tasks View -->
      <div
        v-else-if="activeTab === 'all'"
        class="all-tasks-view"
      >
        <!-- Search and Filter Bar for All Tasks -->
        <div class="search-filter-container">
          <!-- Search Section -->
          <div class="search-section">
            <div class="search-input-wrapper">
              <i class="pi pi-search search-icon" />
              <input
                v-model="search"
                type="text"
                placeholder="Search tasks..."
                class="search-input"
              >
            </div>
            <!-- Filter Button -->
            <button
              class="filter-btn"
              :class="{ active: showFilters }"
              @click="toggleFilters"
            >
              <i class="pi pi-filter" />
              Filters
            </button>
          </div>

          <!-- Filter Section -->
          <div
            v-if="showFilters"
            class="filter-section"
          >
            <!-- Custom Assignee Select -->
            <div class="custom-select-wrapper">
              <div
                class="custom-select-display filter-select"
                :class="{ active: activeCustomSelect === 'assignee' }"
                @click="toggleCustomSelect('assignee')"
              >
                Assignee: {{ selectedFilters.assignee }}
                <i class="pi pi-chevron-down custom-select-arrow" />
              </div>
              <div
                v-if="activeCustomSelect === 'assignee'"
                class="custom-select-dropdown"
              >
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
                :class="{ active: activeCustomSelect === 'createdBy' }"
                @click="toggleCustomSelect('createdBy')"
              >
                Created by: {{ selectedFilters.createdBy }}
                <i class="pi pi-chevron-down custom-select-arrow" />
              </div>
              <div
                v-if="activeCustomSelect === 'createdBy'"
                class="custom-select-dropdown"
              >
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
                :class="{ active: activeCustomSelect === 'file' }"
                @click="toggleCustomSelect('file')"
              >
                File: {{ selectedFilters.file }}
                <i class="pi pi-chevron-down custom-select-arrow" />
              </div>
              <div
                v-if="activeCustomSelect === 'file'"
                class="custom-select-dropdown"
              >
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
                class="filter-dropdown-btn"
                :class="{ active: activeSubDropdown === 'dueDate' }"
                @click="toggleFilterSelect('dueDate')"
              >
                Due date: {{ selectedFilters.dueDate }}
                <i class="pi pi-chevron-down filter-arrow" />
              </button>
              <div
                v-if="activeSubDropdown === 'dueDate'"
                class="filter-dropdown-menu"
              >
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
                  <i class="pi pi-times" />
                  Clear Selection
                </div>
                <!-- Date Picker for Custom Range -->
                <div
                  v-if="selectedFilters.dueDate === 'Custom Range'"
                  class="date-picker-container"
                >
                  <div class="date-picker-calendar">
                    <div class="calendar-header">
                      <button
                        class="calendar-nav-btn"
                        @click="navigateMonth('prev')"
                      >
                        <i class="pi pi-chevron-left" />
                      </button>
                      <div class="calendar-months-title">
                        <span class="month-title">{{ formatMonth(currentMonth) }}</span>
                        <span class="month-title">{{ formatMonth(nextMonth) }}</span>
                      </div>
                      <button
                        class="calendar-nav-btn"
                        @click="navigateMonth('next')"
                      >
                        <i class="pi pi-chevron-right" />
                      </button>
                    </div>
                    <div class="calendar-grid-container">
                      <!-- First Month -->
                      <div class="calendar-month">
                        <div class="calendar-weekdays">
                          <div
                            v-for="day in weekDays"
                            :key="day"
                            class="weekday"
                          >
                            {{ day }}
                          </div>
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
                          <div
                            v-for="day in weekDays"
                            :key="day"
                            class="weekday"
                          >
                            {{ day }}
                          </div>
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
            <button
              class="clear-filter-btn"
              @click="clearFilters"
            >
              <span>✕</span>
              Clear
            </button>
          </div>
        </div>

        <div class="all-tasks-list">
          <div
            v-if="loading"
            class="loading-message"
          >
            Loading tasks...
          </div>
          <div
            v-else-if="filteredTasks.length === 0"
            class="empty-message"
          >
            No tasks found
          </div>
          <div v-else>
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="all-task-item"
              @click="selectTask(task)"
            >
              <div class="task-item-content">
                <div class="task-item-left">
                  <div class="task-item-header">
                    <div class="task-item-title">
                      <span class="task-id">#{{ task.id }}</span>
                      <span class="task-title">{{ getCleanTaskTitle(task.title) }}</span>
                      <span
                        v-if="task.status === 'closed'"
                        class="task-status-inline"
                        :class="task.status"
                      >
                        <i class="pi pi-lock status-icon" />
                        {{ getStatusText(task.status) }}
                      </span>
                    </div>
                  </div>
                  <div class="task-item-details">
                    <div class="task-detail-row">
                      <i class="pi pi-calendar detail-icon" />
                      <span class="task-date">{{ formatDate(task.createdAt) }}</span>
                    </div>
                    <div
                      v-if="task.dueDate"
                      class="task-detail-row"
                    >
                      <i
                        class="pi pi-clock detail-icon"
                        :class="{ 'overdue-icon': isOverdue(task.dueDate) }"
                      />
                      <span
                        class="task-due-date"
                        :class="{ overdue: isOverdue(task.dueDate) }"
                      >
                        Due: {{ formatDateTime(task.dueDate) }}
                      </span>
                    </div>
                    <div
                      v-if="task.assignedTo"
                      class="task-detail-row"
                    >
                      <i class="pi pi-user detail-icon" />
                      <span class="task-assignee">
                        Assigned to: {{ task.assignedTo.fullName || task.assignedTo.username }}
                      </span>
                    </div>
                    <div
                      v-if="task.reviewer"
                      class="task-detail-row"
                    >
                      <i class="pi pi-eye detail-icon" />
                      <span class="task-reviewer">
                        Reviewer: {{ task.reviewer.fullName || task.reviewer.username }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="task-item-right">
                  <button
                    v-if="task.status === 'closed'"
                    class="reopen-btn"
                    title="Reopen task"
                    @click.stop="reopenTask(task)"
                  >
                    <i class="pi pi-refresh" />
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
    <div
      v-if="showTaskActionMenu"
      class="task-action-menu-overlay"
      @click="closeTaskActionMenu"
    >
      <div
        class="task-action-menu"
        :style="{
          left: taskActionMenuPosition.x + 'px',
          top: taskActionMenuPosition.y + 'px'
        }"
        @click.stop
      >
        <button
          class="task-action-item"
          @click="editTask"
        >
          <i class="pi pi-pencil" />
          Edit
        </button>
        <button
          class="task-action-item"
          @click="closeTaskFromMenu"
        >
          <i class="pi pi-times" />
          Close
        </button>
        <button
          class="task-action-item delete"
          @click="openDeleteModal"
        >
          <i class="pi pi-trash" />
          Delete
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Delete Task Modal -->
  <Teleport to="body">
    <div
      v-if="showDeleteModal"
      class="modal-overlay"
      @click="closeDeleteModal"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h3 class="modal-title">
            Delete Task
          </h3>
          <button
            class="modal-close"
            @click="closeDeleteModal"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">
              ⚠️
            </div>
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
            :disabled="isDeleting"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            class="btn-delete"
            :disabled="isDeleting"
            @click="deleteSelectedTask"
          >
            <span
              v-if="isDeleting"
              class="loading-spinner"
            />
            {{ isDeleting ? 'Deleting...' : 'Delete Task' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Close Task Confirmation Modal -->
  <Teleport to="body">
    <div
      v-if="showCloseTaskModal"
      class="modal-overlay"
      @click="cancelCloseTask"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h3>Confirm Close Task</h3>
          <button
            class="modal-close-btn"
            @click="cancelCloseTask"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to close task <strong>"{{ taskToClose?.title }}"</strong>?</p>
          <p class="modal-warning">
            You can reopen this task later from the "All tasks" tab.
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="modal-btn modal-btn-cancel"
            @click="cancelCloseTask"
          >
            Cancel
          </button>
          <button
            class="modal-btn modal-btn-confirm"
            :disabled="isClosingTask"
            @click="confirmCloseTask"
          >
            <span
              v-if="isClosingTask"
              class="loading-spinner"
            />
            {{ isClosingTask ? 'Closing...' : 'Close Task' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Reopen Task Confirmation Modal -->
  <Teleport to="body">
    <div
      v-if="showReopenTaskModal"
      class="modal-overlay"
      @click="cancelReopenTask"
    >
      <div
        class="modal-content reopen-modal"
        @click.stop
      >
        <div class="modal-header">
          <h3>Confirm Reopen Task</h3>
          <button
            class="modal-close-btn"
            @click="cancelReopenTask"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to reopen task <strong>"{{ taskToReopen?.title }}"</strong>?</p>
          <div class="reopen-target-status-section">
            <label class="reopen-reason-label">Target status after reopen:</label>
            <div class="status-select-wrapper" @click.stop="showReopenStatusDropdown = !showReopenStatusDropdown">
              <div class="status-select-display">
                <span
                  v-if="reopenTargetStatusId"
                  class="status-chip"
                  :style="{ borderColor: (availableStatuses.find((s:any)=>s.id===reopenTargetStatusId)?.color) || '#e5e7eb' }"
                >
                  <span
                    class="status-dot"
                    :style="{ background: (availableStatuses.find((s:any)=>s.id===reopenTargetStatusId)?.color) || '#e5e7eb' }"
                  />
                  {{ availableStatuses.find((s:any)=>s.id===reopenTargetStatusId)?.name || 'Select status' }}
                </span>
                <span v-else class="status-placeholder">Select status</span>
                <i class="pi pi-chevron-down select-caret" />
              </div>

              <div v-if="showReopenStatusDropdown" class="status-dropdown" @click.stop>
                <div class="status-options">
                  <div
                    v-for="s in orderedStatuses.filter((s:any)=>!isClosedTypeStatus(s.id))"
                    :key="s.id"
                    class="status-option"
                    @click="reopenTargetStatusId = s.id; showReopenStatusDropdown = false"
                  >
                    <span class="status-dot" :style="{ background: s.color }" />
                    <span class="status-name">{{ s.name }}</span>
                    <span class="status-type">{{ formatStatusTypeLabel(s.type) }}</span>
                    <i v-if="reopenTargetStatusId === s.id" class="pi pi-check selected-icon" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="reopen-reason-section">
            <label
              for="reopen-reason"
              class="reopen-reason-label"
            >Reason for reopening (optional):</label>
            <textarea
              id="reopen-reason"
              v-model="reopenReason"
              class="reopen-reason-input"
              placeholder="Enter the reason for reopening this task..."
              rows="5"
            />
          </div>

        </div>
        <div class="modal-footer">
          <button
            class="modal-btn modal-btn-cancel"
            @click="cancelReopenTask"
          >
            Cancel
          </button>
          <button
            class="modal-btn modal-btn-confirm"
            :disabled="isReopeningTask"
            @click="confirmReopenTask"
          >
            <span
              v-if="isReopeningTask"
              class="loading-spinner"
            />
            {{ isReopeningTask ? 'Reopening...' : 'Reopen Task' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.kanban-tab-wrapper {
  padding: 0 0 1.2em 0;
  zoom: 0.9;
  width: 100%;
  overflow-x: auto;
  /* Allow vertical overflow for dropdowns */
  overflow-y: visible;
}

@supports not (zoom: 1) {
  .kanban-tab-wrapper {
    transform: scale(0.9);
    transform-origin: top left;
  }
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
  width: 100%;
  min-width: max-content;
  overflow-x: auto;
  overflow-y: hidden;
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
  gap: 0.75rem;
}

.all-task-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: auto;
  position: relative;
  overflow: hidden;
}

.all-task-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #e5e7eb;
  transition: background-color 0.2s ease;
}

.all-task-item:hover::before {
  background: #3b82f6;
}

.all-task-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.task-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-height: 60px;
}

.task-item-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
}

.task-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.task-item-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  flex-wrap: wrap;
}

.task-item-status {
  flex-shrink: 0;
}

.task-status-inline {
  padding: 0.2rem 0.6rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.task-status-inline.closed {
  background: #f3f4f6;
  color: #6b7280;
  border-color: #d1d5db;
}

.task-status-inline .status-icon {
  font-size: 0.65rem;
  color: #6b7280;
}

.task-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.task-item-right {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
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

.status-icon {
  font-size: 0.7rem;
}

/* Status icon colors */
.task-status.pending .status-icon {
  color: #3b82f6; /* Blue for pending */
}

.task-status.in_progress .status-icon {
  color: #f59e0b; /* Orange for in progress */
}

.task-status.completed .status-icon {
  color: #10b981; /* Green for completed */
}

.task-status.closed .status-icon {
  color: #6b7280; /* Gray for closed */
}

.task-detail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-icon {
  font-size: 0.8rem;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

/* Icon colors for different types */
.detail-icon.pi-calendar {
  color: #3b82f6; /* Blue for calendar */
}

.detail-icon.pi-clock {
  color: #f59e0b; /* Orange for clock */
}

.detail-icon.pi-user {
  color: #10b981; /* Green for user */
}

.overdue-icon {
  color: #dc2626; /* Red for overdue */
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
  line-height: 1.3;
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

.kanban-container {
  width: 100%;
  /* Remove overflow from container - it will be handled by inner scrollable area */
  overflow: visible;
  /* Ensure container can expand beyond parent */
  position: relative;
  /* Prevent this from affecting the main page layout */
  contain: layout;
  /* Ensure proper positioning */
  z-index: 1;
}

.kanban-scrollable-area {
  /* Create a fixed-width container that can scroll */
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  /* Better scrollbar handling */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  /* Ensure proper flex behavior */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* Create a scrollable context */
  position: relative;
  /* Prevent this from affecting the main page scroll */
  isolation: isolate;
  /* Force this to be a scrollable container */
  contain: layout style paint;
  /* Ensure proper scrolling behavior */
  scrollbar-gutter: stable;
  /* CRITICAL: Prevent scroll chaining */
  overscroll-behavior: contain;
  /* Force scroll containment */
  scroll-snap-type: x mandatory;
  /* Ensure proper scroll behavior */
  scroll-behavior: smooth;
}

/* Custom scrollbar for webkit browsers */
.kanban-scrollable-area::-webkit-scrollbar {
  height: 8px;
}

.kanban-scrollable-area::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.kanban-scrollable-area::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-scrollable-area::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.kanban-scroll-wrapper {
  /* This wrapper contains the scroll completely */
  width: 100%;
  max-width: 100%;
  position: relative;
  /* Force scroll containment */
  contain: layout style paint;
  /* Prevent scroll chaining */
  overscroll-behavior: contain;
  /* Ensure proper positioning */
  z-index: 1;
}

.kanban-inner-container {
  /* This container can expand beyond its parent */
  width: max-content;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* Ensure proper spacing */
  gap: 0;
  /* Force this to expand beyond parent */
  position: relative;
  /* Ensure proper flex behavior */
  flex-shrink: 0;
}

/* Custom scrollbar for webkit browsers */
.kanban-container::-webkit-scrollbar {
  height: 8px;
}

.kanban-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.kanban-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.kanban-status-header-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.8em;
  margin: 0 0 1.2em 0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  padding: 0.4rem 0;
  border-bottom: 1px solid #e2e8f0;
  /* Remove overflow - it's handled by parent scrollable area */
  overflow: visible;
  /* Ensure proper flex behavior and prevent wrapping */
  width: max-content;
  min-width: 100%;
  /* Force horizontal layout */
  flex-direction: row;
  align-items: stretch;
}
.kanban-status-card {
  background: #f7f8fa;
  border-radius: 12px;
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  flex-shrink: 0;
  flex-grow: 0;
  padding: 0.7em 1em 0.6em 1em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  gap: 0.6em;
  box-sizing: border-box;
  /* Ensure no wrapping */
  white-space: nowrap;
  overflow: hidden;
  /* Prevent scroll chaining */
  overscroll-behavior: contain;
}
/* Visual feedback when dragging columns */
.kanban-status-card.drag-over {
  outline: 2px dashed #2563eb;
  outline-offset: 4px;
}
.status-bar {
  width: 18px;
  height: 32px;
  border-radius: 6px;
  margin-bottom: 0;
  margin-left: 0;
}
/* Status bars will now use inline styles from the template */

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

.kanban-board {
  display: flex !important;
  white-space: nowrap !important;
  min-height: 300px !important;
  width: max-content !important;
  margin: 0 !important;
  /* Remove overflow - it's handled by parent scrollable area */
  overflow: visible !important;
  /* Force no wrapping */
  max-width: none !important;
  min-width: 100% !important;
  font-size: 0; /* Remove whitespace between inline-block elements */
  /* Ensure it can expand beyond container */
  position: relative;
  /* Additional flex properties to prevent wrapping */
  flex-wrap: nowrap !important;
  flex-direction: row !important;
  align-items: stretch !important;
  /* Ensure proper width calculation */
  box-sizing: border-box;
  /* Force horizontal layout */
  flex-shrink: 0;
}

/* Custom scrollbar styling for webkit browsers */
.kanban-board::-webkit-scrollbar {
  height: 8px;
}

.kanban-board::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.kanban-board::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-board::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.kanban-column {
  background: #f8fafc !important;
  border-radius: 10px !important;
  padding: 0.5em 0.4em 0.4em 0.4em !important;
  width: 280px !important;
  min-width: 280px !important;
  max-width: 280px !important;
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
  margin-right: 0.8em !important;
  transition: background-color 0.2s ease;
  box-sizing: border-box !important;
  /* Force no wrapping */
  white-space: normal !important;
  font-size: 14px; /* Restore font size */
  /* Ensure proper flex behavior */
  display: flex !important;
  flex-direction: column !important;
  /* Additional properties to prevent wrapping */
  overflow: hidden;
  /* Ensure proper spacing and alignment */
  position: relative;
  /* Last column should not have right margin */
  /* Prevent scroll chaining */
  overscroll-behavior: contain;
}

.kanban-column:last-child {
  margin-right: 0 !important;
}

.kanban-column.drag-over {
  background: #e0f2fe;
  border: 2px dashed #2563eb;
}

/* Dynamic column borders based on status */
.kanban-column.pending-column {
  border-left: 4px solid #ef4444;
}

.kanban-column.in_progress-column {
  border-left: 4px solid #f59e0b;
}

.kanban-column.completed-column {
  border-left: 4px solid #10b981;
}

/* Fallback for other statuses */
.kanban-column:not(.pending-column):not(.in_progress-column):not(.completed-column) {
  border-left: none; /* remove fallback separator */
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
  padding: 0.5em 0.4em 0.4em 0.4em;
  margin-bottom: 0.5em;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  border: 1px solid #22c55e33;
  transition: box-shadow 0.2s, border 0.2s, background 0.2s, opacity 0.2s;
  cursor: pointer;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
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
  cursor: pointer;
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.task-detail-view {
  padding: 0 0 1.2em 0;
  /* Ensure dropdowns can be fully visible */
  overflow: visible;
  min-height: fit-content;
}

.task-detail-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.back-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 50px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  margin-bottom: 0.4rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.back-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
}

.back-btn:hover::before {
  left: 100%;
}

.back-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
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
  border-radius: 50% !important;
  clip-path: circle(50% at 50% 50%);
  display: block;
}
.task-detail-members {
  margin-top: 2em;
}

/* Ensure task detail content can expand for dropdowns */
.task-detail-content {
  overflow: visible;
  min-height: fit-content;
  position: relative;
}

/* Ensure all parent containers allow dropdowns to be visible */
.task-detail-view *,
.task-detail-content *,
.task-detail-members *,
.members-table *,
.assignee-dropdown-wrapper *,
.reviewer-dropdown-wrapper * {
  overflow: visible !important;
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
  /* Remove overflow hidden to allow dropdowns to be visible */
  overflow: visible;
}
.members-table th, .members-table td {
  padding: 0.7em 1em;
  text-align: left;
  color: #374151;
  /* Ensure dropdowns can be positioned relative to table cells */
  position: relative;
  /* Ensure dropdowns can expand outside table cells */
  overflow: visible;
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
    width: 100%;
    display: block !important;
    white-space: nowrap !important;
    overflow-x: auto;
  }
  .kanban-column {
    min-width: 280px; /* Keep fixed width even on mobile */
    width: 280px;
    display: inline-block !important;
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
  font-size: 0.9em;
  margin-left: 0.3em;
  transition: text-decoration 0.2s;
  white-space: pre-line;
  line-height: 1.3;
  max-width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
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
  width: 20px;
  height: 20px;
  border-radius: 50% !important;
  object-fit: cover;
  aspect-ratio: 1 / 1;
  display: inline-block;
  clip-path: circle(50% at 50% 50%);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Ensure task cards don't overflow columns */
.kanban-column .task-card,
.kanban-column .task-card-link {
  max-width: 100% !important;
  width: 100% !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding-left: 0.1em !important;
  padding-right: 0.1em !important;
}

/* Force task card content to stay within bounds */
.kanban-column .task-card * {
  max-width: 100% !important;
  box-sizing: border-box !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
}

/* Additional overflow prevention */
.kanban-column {
  overflow-x: hidden !important;
}

.kanban-column .task-card {
  transform: translateZ(0) !important;
  will-change: transform !important;
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
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.reopen-btn:hover:not(:disabled) {
  background: #1d4ed8;
  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
  transform: translateY(-1px);
}

.reopen-btn i {
  font-size: 0.7rem;
}

/* Responsive design for mobile */
@media (max-width: 768px) {
  .task-item-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .task-item-header {
    width: 100%;
  }

  .task-item-right {
    align-self: flex-end;
  }

  .task-detail-row {
    font-size: 0.8rem;
  }

  .task-title {
    font-size: 0.95rem;
  }
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
  flex-wrap: nowrap;
  gap: 0.8rem;
  padding: 0.8rem 0;
  min-height: 200px;
  width: max-content;
  min-width: 100%;
  margin: 0;
  justify-content: start;
  /* Remove overflow - it's handled by parent scrollable area */
  overflow: visible;
}



.language-swimlane-content .kanban-column {
  background: white;
  border-radius: 6px;
  padding: 0.7rem;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  flex-shrink: 0;
  flex-grow: 0;
  box-sizing: border-box;
}

.language-swimlane-content .task-card {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0.8em 0.6em 0.6em 0.6em;
  box-sizing: border-box;
  overflow: hidden;
}

.language-swimlane-content .task-card-link {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.language-swimlane-content .kanban-column {
  min-height: 100px;
  max-height: none;
  overflow-y: auto;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Column borders are now handled by the dynamic CSS classes above */

/* Ensure proper spacing for multiple columns */
.kanban-status-header-row,
.kanban-board,
.language-swimlane-content {
  /* Prevent wrapping at all costs */
  flex-wrap: nowrap !important;
  /* Ensure proper width calculation */
  width: max-content;
  min-width: 100%;
  /* Better performance */
  will-change: scroll-position;
}

/* Ensure all columns have consistent width */
.kanban-status-card,
.kanban-column,
.language-swimlane-content .kanban-column {
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
}

/* Prevent horizontal scroll from affecting the main page */
.kanban-scrollable-area {
  /* Ensure scroll is contained within this element */
  overscroll-behavior-x: contain;
  overscroll-behavior-y: none;
  /* Prevent scroll chaining */
  scroll-snap-type: x mandatory;
  /* CRITICAL: Force scroll containment */
  contain: layout style paint;
  /* Prevent scroll chaining completely */
  overscroll-behavior: contain;
}

/* Ensure main page is not affected by Kanban scroll */
.kanban-container {
  /* Prevent scroll chaining to main page */
  overscroll-behavior: contain;
  /* Force layout containment */
  contain: layout;
  /* Ensure proper positioning */
  position: relative;
  z-index: 1;
}

/* Ensure proper scroll behavior for each column */
.kanban-status-header-row,
.kanban-board,
.language-swimlane-content {
  /* Prevent scroll chaining */
  overscroll-behavior: contain;
  /* Ensure proper flex behavior */
  scroll-snap-align: start;
}

/* Responsive adjustments for very wide screens */
@media (min-width: 1200px) {
  .kanban-container {
    max-width: none;
  }

  .kanban-status-header-row,
  .kanban-board,
  .language-swimlane-content {
    justify-content: flex-start;
  }
}

/* Ensure scroll is isolated to Kanban board only */
.kanban-scrollable-area {
  /* Prevent scroll from affecting parent containers */
  overscroll-behavior: contain;
  /* Ensure proper scroll containment */
  scroll-behavior: smooth;
  /* Prevent scroll chaining */
  scroll-snap-type: x mandatory;
  /* CRITICAL: Force scroll containment */
  contain: layout style paint;
  /* Prevent scroll chaining completely */
  overscroll-behavior-x: contain;
  overscroll-behavior-y: none;
}

/* Ensure proper scroll behavior for all columns */
.kanban-status-header-row,
.kanban-board,
.language-swimlane-content {
  /* Prevent scroll chaining */
  overscroll-behavior: contain;
  /* Ensure proper flex behavior */
  scroll-snap-align: start;
  /* Prevent wrapping */
  flex-wrap: nowrap !important;
  /* Force scroll containment */
  contain: layout;
  /* Prevent scroll chaining completely */
  overscroll-behavior-x: contain;
  overscroll-behavior-y: none;
}

/* Close Task Modal Styles */
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
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 2rem;
}

.modal-body p {
  margin: 0 0 0.5rem 0;
  color: #374151;
  line-height: 1.5;
}

.modal-warning {
  color: #dc2626 !important;
  font-size: 0.9rem;
  font-weight: 500;
}

.reopen-reason-section {
  margin: 1.5rem 0;
}

.reopen-reason-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #374151;
  font-size: 1rem;
}

.reopen-reason-input {
  width: 100%;
  padding: 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 150px;
  max-height: 250px;
  transition: border-color 0.2s ease;
  line-height: 1.6;
}

.reopen-reason-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.reopen-reason-input::placeholder {
  color: #9ca3af;
}

/* Reopen target status select */
.reopen-target-status-section {
  margin: 1rem 0 0.5rem 0;
}

.status-select-wrapper {
  position: relative;
  max-width: 420px;
}

.status-select-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.status-placeholder {
  color: #9ca3af;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  font-size: 0.85rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.select-caret {
  color: #6b7280;
}

.status-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  z-index: 10000;
}

.status-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.status-search input {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
  outline: none;
}

.status-options {
  max-height: 260px;
  overflow-y: auto;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
}

.status-option:hover {
  background: #f9fafb;
}

.status-name {
  font-weight: 600;
  color: #374151;
}

.status-type {
  margin-left: auto;
  font-size: 0.75rem;
  color: #6b7280;
}

.selected-icon {
  color: #10b981;
}

.no-status-option {
  padding: 0.75rem;
  color: #9ca3af;
  text-align: center;
}

/* Reopen modal font-size adjustments */
.reopen-modal .modal-header h3 {
  font-size: 0.85rem;
}

.reopen-modal .modal-body p {
  font-size: 0.82rem;
}

.reopen-modal .reopen-reason-label {
  font-size: 0.8rem;
}

.reopen-modal .reopen-reason-input {
  font-size: 0.85rem;
}

.reopen-modal .status-select-display,
.reopen-modal .status-option,
.reopen-modal .status-type,
.reopen-modal .status-name,
.reopen-modal .status-placeholder,
.reopen-modal .status-chip {
  font-size: 0.85rem;
}

.reopen-modal .modal-btn {
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
}

.modal-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s ease;
}

.modal-btn-cancel {
  background: white;
  color: #374151;
  border-color: #d1d5db;
}

.modal-btn-cancel:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.modal-btn-confirm {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
}

.modal-btn-confirm:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

/* Reopen modal confirm button - use blue instead of red */
.reopen-modal .modal-btn-confirm {
  background: #3b82f6;
  border-color: #3b82f6;
}

.reopen-modal .modal-btn-confirm:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.modal-btn-confirm:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Task Detail Tabs */
.task-detail-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.task-detail-tab-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.task-detail-tab-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.task-detail-tab-btn.active {
  background: #6366f1;
  color: white;
}

/* Task History Styles */
.task-history-container {
  padding: 0.75rem 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.history-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.history-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.85rem;
}

.no-history {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

/* Timeline Design */
.history-timeline {
  position: relative;
  padding-left: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: timelineFadeIn 0.5s ease-out;
}

@keyframes timelineFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Board Type Toggle */
.board-type-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 8px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  border-color: #6366f1;
  background: #f8fafc;
}

.toggle-btn.active {
  border-color: #6366f1;
  background: #e0e7ff;
  color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.toggle-btn i {
  font-size: 1rem;
}

/* Workflow Board Container */
.workflow-board-container {
  margin-top: 1rem;
}

/* Workflows and Statuses Views */
.workflows-view,
.statuses-view {
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Ẩn trục timeline */
.history-timeline::before {
  display: none;
}

.timeline-item {
  position: relative;
  margin-bottom: 1rem;
  padding-left: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-item:last-child .timeline-dot::after {
  display: none;
}

.timeline-dot {
  position: absolute;
  left: -0.375rem;
  top: 0.375rem;
  width: 12px;
  height: 12px;
  background: #6366f1;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #e5e7eb;
  z-index: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-dot::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 3px;
  height: 1.5rem;
  background: linear-gradient(to bottom, #6366f1 0%, #8b5cf6 100%);
  transform: translateX(-50%);
  border-radius: 0 0 2px 2px;
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.2);
  box-shadow: 0 0 0 3px #e5e7eb, 0 4px 8px rgba(99, 102, 241, 0.3);
}

.timeline-content {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.timeline-content:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-action {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-icon {
  font-size: 1rem;
  line-height: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-text {
  font-weight: 600;
  color: #374151;
  font-size: 0.85rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: right;
  min-width: 120px;
  justify-content: flex-end;
  background: #f3f4f6;
  padding: 0.25rem 0.375rem;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.time-icon {
  font-size: 0.65rem;
  opacity: 0.8;
}

.timeline-description {
  color: #4b5563;
  font-size: 0.8rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

/* Reason styles */
.timeline-reason {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

.reason-label {
  font-weight: 600;
  color: #92400e;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.reason-text {
  color: #78350f;
  font-size: 0.85rem;
  line-height: 1.4;
  font-style: italic;
}

.timeline-status-change {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.status-badges {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.status-badge.old-status {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.status-badge.new-status {
  background: #f0fdf4;
  color: #059669;
  border-color: #bbf7d0;
}

.status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-indicator {
  font-size: 0.7rem;
}

.status-arrow {
  color: #6b7280;
  font-weight: bold;
  font-size: 0.9rem;
  margin: 0 0.25rem;
}

/* Dropdown styles for assignee and reviewer */
.assignee-dropdown-wrapper,
.reviewer-dropdown-wrapper {
  position: relative;
  /* Ensure dropdowns can expand outside their containers */
  overflow: visible;
  z-index: 1;
}

.assignee-dropdown-trigger,
.reviewer-dropdown-trigger {
  cursor: pointer;
  user-select: none;
  padding: 0.75rem;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.assignee-dropdown-trigger:hover,
.reviewer-dropdown-trigger:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dropdown-arrow {
  font-size: 0.75rem;
  color: #6b7280;
  margin-left: 0.5rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.7;
}

.assignee-dropdown-trigger:hover .dropdown-arrow,
.reviewer-dropdown-trigger:hover .dropdown-arrow {
  transform: translateY(1px);
  opacity: 1;
  color: #4b5563;
}

.assignee-dropdown,
.reviewer-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 99999;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  min-width: 320px;
  max-height: 320px;
  overflow-y: auto;
  animation: dropdownFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* Ensure dropdown is visible */
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  /* Ensure dropdown can expand outside any container */
  contain: none;
  isolation: isolate;
  /* Add subtle border */
  border: 1px solid #e5e7eb;
  backdrop-filter: blur(8px);
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}



.dropdown-options {
  padding: 0.5rem 0;
}

.dropdown-option {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f9fafb;
  position: relative;
}

.dropdown-option:hover {
  background: #f8fafc;
  transform: translateX(2px);
}

.dropdown-option:last-child {
  border-bottom: none;
}

.dropdown-option:active {
  transform: translateX(1px);
  background: #e2e8f0;
}



.member-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 32px;
}

.member-avatar,
.member-avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50% !important;
  object-fit: cover;
  aspect-ratio: 1 / 1;
  display: inline-block;
  clip-path: circle(50% at 50% 50%);
}

.member-avatar-placeholder {
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.75rem;
}

.member-name {
  flex: 1;
  font-size: 0.875rem;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.current-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  transition: all 0.2s ease;
}

.current-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
}

.current-assignee,
.current-reviewer {
  background: #f0fdf4;
}

.disabled-option {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f8fafc;
  position: relative;
}

.disabled-option:hover {
  background: #f8fafc;
  cursor: not-allowed;
  transform: none;
}

.disabled-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  pointer-events: none;
}

.disabled-badge {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
  transition: all 0.2s ease;
}

.disabled-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
}

.dropdown-loading {
  padding: 0.75rem 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  border-top: 1px solid #f3f4f6;
}

.dropdown-loading i {
  margin-right: 0.5rem;
}

.swap-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.22);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  z-index: 999;
}

/* Ensure the swap modal has a visible border */
.swap-overlay .modal {
  border: 1px solid #e5e7eb;
}

.swap-modal {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;

  border: 2px solid #4A90E2; /* xanh dương */
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
}


.swap-modal .modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 380px;
  max-width: calc(100vw - 32px);
  padding: 16px;
}

.modal-title {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 8px;
  color: #111827;
}

.modal-body {
  color: #4b5563;
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #e5e7eb;
}

.btn-secondary:hover { background: #e5e7eb; }

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover { background: #4f46e5; }

.empty-assignee,
.empty-reviewer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.empty-assignee:hover,
.empty-reviewer:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.empty-text {
  color: #64748b;
  font-size: 0.875rem;
  font-style: italic;
  font-weight: 500;
  transition: color 0.2s ease;
}

.empty-assignee:hover .empty-text,
.empty-reviewer:hover .empty-text {
  color: #475569;
}


</style>
