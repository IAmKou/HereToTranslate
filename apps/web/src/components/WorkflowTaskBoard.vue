<template>
  <div class="workflow-task-board">
    <!-- Workflow Header -->
    <div class="workflow-header">
      <div class="workflow-info">
        <h2>{{ currentWorkflow?.name || 'Default Workflow' }}</h2>
        <p v-if="currentWorkflow?.description">{{ currentWorkflow.description }}</p>
      </div>
      <div class="workflow-actions">
        <button class="btn-secondary" @click="showWorkflowSelector = true">
          <i class="pi pi-exchange"></i>
          Change Workflow
        </button>
        <button class="btn-primary" @click="showCreateTask = true">
          <i class="pi pi-plus"></i>
          Create Task
        </button>
      </div>
    </div>

    <!-- Workflow Selector Modal -->
    <div v-if="showWorkflowSelector" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Select Workflow</h3>
          <button class="btn-icon" @click="showWorkflowSelector = false">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="workflow-selector">
          <div
            v-for="workflow in availableWorkflows"
            :key="workflow.id"
            class="workflow-option"
            :class="{ 'selected': currentWorkflow?.id === workflow.id }"
            @click="selectWorkflow(workflow)"
          >
            <div class="workflow-option-info">
              <h4>{{ workflow.name }}</h4>
              <p v-if="workflow.description">{{ workflow.description }}</p>
              <div class="workflow-option-badges">
                <span v-if="workflow.isDefault" class="badge default">Default</span>
                <span v-if="workflow.isActive" class="badge active">Active</span>
              </div>
            </div>
            <div class="workflow-option-stats">
              <span class="stat">{{ getWorkflowTransitionsCount(workflow.id) }} transitions</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Board -->
    <div class="task-board">
      <div class="board-columns">
        <div
          v-for="status in sortedStatuses"
          :key="status.id"
          class="board-column"
          :class="{ 'empty': getTasksInStatus(status.id).length === 0 }"
          @dragover="handleDragOver($event, status.id)"
          @dragleave="handleDragLeave($event)"
          @drop="handleDrop($event, status.id)"
        >
          <!-- Column Header -->
          <div class="column-header">
            <div class="column-title">
              <div class="status-indicator" :style="{ backgroundColor: status.color }"></div>
              <h3>{{ status.name }}</h3>
              <span class="task-count">{{ getTasksInStatus(status.id).length }}</span>
            </div>
            <div class="column-actions">
              <button class="btn-icon" @click="addTaskToStatus(status)">
                <i class="pi pi-plus"></i>
              </button>
            </div>
          </div>

          <!-- Drag Over Indicator -->
          <div
            v-if="isDragging && dragOverStatus === status.id"
            class="drag-over-indicator"
          >
            <div class="drag-over-content">
              <i class="pi pi-arrow-down"></i>
              <span>Drop task here</span>
            </div>
          </div>

          <!-- Tasks in Column -->
          <div class="column-tasks">
            <div
              v-for="task in getTasksInStatus(status.id)"
              :key="task.id"
              class="task-card"
              :class="{ 'overdue': isTaskOverdue(task) }"
              draggable="true"
              @dragstart="handleDragStart($event, task)"
              @dragend="handleDragEnd($event)"
              @click="selectTask(task)"
            >
              <div class="task-header">
                <div class="task-priority" :class="getPriorityClass(task.priority)">
                  {{ task.priority }}
                </div>
                <div class="task-actions">
                  <button class="btn-icon" @click.stop="showTaskMenu($event, task)">
                    <i class="pi pi-ellipsis-v"></i>
                  </button>
                </div>
              </div>

              <div class="task-content">
                <h4 class="task-title">{{ task.title }}</h4>
                <p v-if="task.description" class="task-description">{{ task.description }}</p>

                <div class="task-meta">
                  <div class="task-assignee" v-if="task.assignedTo">
                    <img
                      v-if="task.assignedTo.avatarUrl"
                      :src="getAvatarUrl(task.assignedTo.avatarUrl)"
                      :alt="task.assignedTo.fullName"
                      class="assignee-avatar"
                    >
                    <span v-else class="assignee-avatar-placeholder">
                      {{ task.assignedTo.fullName?.[0] || task.assignedTo.username?.[0] }}
                    </span>
                    <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                  </div>

                  <div class="task-due-date" v-if="task.dueDate">
                    <i class="pi pi-calendar"></i>
                    <span :class="{ 'overdue': isTaskOverdue(task) }">
                      {{ formatDueDate(task.dueDate) }}
                    </span>
                  </div>
                </div>

                <div class="task-progress" v-if="task.progress !== undefined">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: `${task.progress}%` }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ task.progress }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Context Menu -->
    <div
      v-if="showTaskMenuVisible"
      class="task-context-menu"
      :style="{ left: taskMenuPosition.x + 'px', top: taskMenuPosition.y + 'px' }"
    >
      <div class="menu-item" @click="editTask">
        <i class="pi pi-pencil"></i>
        Edit Task
      </div>
      <div class="menu-item" @click="moveTask">
        <i class="pi pi-arrow-right"></i>
        Move Task
      </div>
      <div class="menu-item" @click="duplicateTask">
        <i class="pi pi-copy"></i>
        Duplicate Task
      </div>
      <div class="menu-item danger" @click="deleteTask">
        <i class="pi pi-trash"></i>
        Delete Task
      </div>
    </div>

    <!-- Task Detail Modal -->
    <div v-if="showTaskDetail" class="modal-overlay">
      <div class="modal task-detail-modal">
        <div class="modal-header">
          <h3>Task Details</h3>
          <button class="btn-icon" @click="showTaskDetail = false">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="task-detail-content" v-if="selectedTask">
          <div class="task-detail-section">
            <h4>Basic Information</h4>
            <div class="detail-row">
              <span class="detail-label">Title:</span>
              <span class="detail-value">{{ selectedTask.title }}</span>
            </div>
            <div class="detail-row" v-if="selectedTask.description">
              <span class="detail-label">Description:</span>
              <span class="detail-value">{{ selectedTask.description }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span
                  class="status-badge"
                  :style="{ backgroundColor: getStatusColor(selectedTask.status) }"
                >
                  {{ getStatusName(selectedTask.status) }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Priority:</span>
              <span class="detail-value">
                <span class="priority-badge" :class="getPriorityClass(selectedTask.priority)">
                  {{ selectedTask.priority }}
                </span>
              </span>
            </div>
          </div>

          <div class="task-detail-section">
            <h4>Assignment</h4>
            <div class="detail-row" v-if="selectedTask.assignedTo">
              <span class="detail-label">Assigned to:</span>
              <span class="detail-value">{{ selectedTask.assignedTo.fullName || selectedTask.assignedTo.username }}</span>
            </div>
            <div class="detail-row" v-else>
              <span class="detail-label">Assigned to:</span>
              <span class="detail-value">Unassigned</span>
            </div>
          </div>

          <div class="task-detail-section">
            <h4>Timeline</h4>
            <div class="detail-row">
              <span class="detail-label">Created:</span>
              <span class="detail-value">{{ formatDate(selectedTask.createdAt) }}</span>
            </div>
            <div class="detail-row" v-if="selectedTask.dueDate">
              <span class="detail-label">Due date:</span>
              <span class="detail-value" :class="{ 'overdue': isTaskOverdue(selectedTask) }">
                {{ formatDueDate(selectedTask.dueDate) }}
              </span>
            </div>
          </div>

          <div class="task-detail-actions">
            <button class="btn-secondary" @click="editTask">
              <i class="pi pi-pencil"></i>
              Edit Task
            </button>
            <button class="btn-primary" @click="moveTask">
              <i class="pi pi-arrow-right"></i>
              Move Task
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <div v-if="showCreateTask" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Create New Task</h3>
          <button class="btn-icon" @click="showCreateTask = false">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <form @submit.prevent="createTask" class="create-task-form">
          <div class="form-group">
            <label for="taskTitle">Title *</label>
            <input
              id="taskTitle"
              v-model="newTask.title"
              type="text"
              required
              placeholder="Enter task title"
            >
          </div>

          <div class="form-group">
            <label for="taskDescription">Description</label>
            <textarea
              id="taskDescription"
              v-model="newTask.description"
              placeholder="Enter task description"
              rows="3"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="taskStatus">Initial Status *</label>
              <select id="taskStatus" v-model="newTask.statusId" required>
                <option value="">Select status</option>
                <option
                  v-for="status in sortedStatuses"
                  :key="status.id"
                  :value="status.id"
                >
                  {{ status.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="taskPriority">Priority</label>
              <select id="taskPriority" v-model="newTask.priority">
                <option value="lowest">Lowest</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="highest">Highest</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="taskAssignee">Assignee</label>
              <select id="taskAssignee" v-model="newTask.assigneeId">
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
              <label for="taskDueDate">Due Date</label>
              <input
                id="taskDueDate"
                v-model="newTask.dueDate"
                type="datetime-local"
              >
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showCreateTask = false">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="creating">
              <i v-if="creating" class="pi pi-spin pi-spinner"></i>
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import { Task } from '../services/task.service';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
}

interface TaskStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  isActive: boolean;
}



interface ProjectMember {
  id: string;
  fullName?: string;
  username: string;
}

const props = defineProps<{
  projectId: string;
  projectMembers: ProjectMember[];
}>();

const toast = useToast();

// State
const workflows = ref<Workflow[]>([]);
const taskStatuses = ref<TaskStatus[]>([]);
const tasks = ref<Task[]>([]);
const loading = ref(false);
const creating = ref(false);

// Modal states
const showWorkflowSelector = ref(false);
const showCreateTask = ref(false);
const showTaskDetail = ref(false);

// UI states
const isDragging = ref(false);
const dragOverStatus = ref<string | null>(null);
const showTaskMenuVisible = ref(false);
const taskMenuPosition = ref({ x: 0, y: 0 });
const selectedTask = ref<Task | null>(null);
const currentWorkflow = ref<Workflow | null>(null);

// Forms
const newTask = ref({
  title: '',
  description: '',
  statusId: '',
  priority: 'medium',
  assigneeId: '',
  dueDate: ''
});

// Computed
const availableWorkflows = computed(() =>
  workflows.value.filter(w => w.isActive)
);

const sortedStatuses = computed(() =>
  [...taskStatuses.value].filter(s => s.isActive).sort((a, b) => a.position - b.position)
);

// Methods
async function loadWorkflows() {
  try {
    const { data } = await axiosInstance.get(`/workflows/project/${props.projectId}`);
    workflows.value = data;

    // Set default workflow
    const defaultWorkflow = data.find((w: Workflow) => w.isDefault);
    if (defaultWorkflow) {
      currentWorkflow.value = defaultWorkflow;
    }
  } catch (error) {
    console.error('Error loading workflows:', error);
  }
}

async function loadTaskStatuses() {
  try {
    const { data } = await axiosInstance.get(`/task-statuses/project/${props.projectId}`);
    taskStatuses.value = data;
  } catch (error) {
    console.error('Error loading task statuses:', error);
  }
}

async function loadTasks() {
  loading.value = true;
  try {
    const { data } = await axiosInstance.get(`/tasks/project/${props.projectId}`);
    tasks.value = data;
  } catch (error) {
    console.error('Error loading tasks:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load tasks',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

function getWorkflowTransitionsCount(workflowId: string): number {
  // This would need to be implemented based on your workflow data structure
  return 0; // Placeholder
}

function getTasksInStatus(statusId: string): Task[] {
  return tasks.value.filter(task => task.status === statusId);
}

function getStatusColor(statusId: string): string {
  const status = taskStatuses.value.find(s => s.id === statusId);
  return status?.color || '#e0e0e0';
}

function getStatusName(statusId: string): string {
  const status = taskStatuses.value.find(s => s.id === statusId);
  return status?.name || 'Unknown';
}

function getPriorityClass(priority: string): string {
  return `priority-${priority}`;
}

function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date();
}

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d overdue`;
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else {
    return `${diffDays}d`;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getAvatarUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';
  return base + url;
}

// Workflow actions
function selectWorkflow(workflow: Workflow) {
  currentWorkflow.value = workflow;
  showWorkflowSelector.value = false;
  toast.add({
    severity: 'success',
    summary: 'Workflow Changed',
    detail: `Switched to "${workflow.name}" workflow`,
    life: 3000
  });
}

// Task actions
function addTaskToStatus(status: TaskStatus) {
  newTask.value.statusId = status.id;
  showCreateTask.value = true;
}

function selectTask(task: Task) {
  selectedTask.value = task;
  showTaskDetail.value = true;
}

function showTaskMenu(event: MouseEvent, task: Task) {
  event.stopPropagation();
  selectedTask.value = task;
  taskMenuPosition.value = { x: event.clientX, y: event.clientY };
  showTaskMenuVisible.value = true;
}

function editTask() {
  // Implementation for editing task
  console.log('Edit task:', selectedTask.value);
  showTaskDetail.value = false;
  showTaskMenuVisible.value = false;
}

function moveTask() {
  // Implementation for moving task
  console.log('Move task:', selectedTask.value);
  showTaskDetail.value = false;
  showTaskMenuVisible.value = false;
}

function duplicateTask() {
  // Implementation for duplicating task
  console.log('Duplicate task:', selectedTask.value);
  showTaskMenuVisible.value = false;
}

async function deleteTask() {
  if (!selectedTask.value) return;

  if (!confirm(`Are you sure you want to delete task "${selectedTask.value.title}"?`)) {
    return;
  }

  try {
    await axiosInstance.delete(`/tasks/${selectedTask.value.id}`);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Task deleted successfully',
      life: 3000
    });
    await loadTasks();
  } catch (error) {
    console.error('Error deleting task:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete task',
      life: 3000
    });
  }

  showTaskMenuVisible.value = false;
  showTaskDetail.value = false;
}

async function createTask() {
  creating.value = true;
  try {
    const taskData = {
      ...newTask.value,
      projectId: props.projectId
    };

    await axiosInstance.post('/tasks', taskData);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Task created successfully',
      life: 3000
    });

    await loadTasks();
    showCreateTask.value = false;

    // Reset form
    newTask.value = {
      title: '',
      description: '',
      statusId: '',
      priority: 'medium',
      assigneeId: '',
      dueDate: ''
    };
  } catch (error) {
    console.error('Error creating task:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create task',
      life: 3000
    });
  } finally {
    creating.value = false;
  }
}

// Drag and Drop
function handleDragStart(event: DragEvent, task: Task) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  }
  isDragging.value = true;
}

function handleDragEnd(event: DragEvent) {
  isDragging.value = false;
  dragOverStatus.value = null;
}

function handleDragOver(event: DragEvent, statusId: string) {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
  dragOverStatus.value = statusId;
}

function handleDragLeave(event: DragEvent) {
  dragOverStatus.value = null;
}

async function handleDrop(event: DragEvent, targetStatusId: string) {
  event.preventDefault();

  const taskId = event.dataTransfer?.getData('text/plain');
  if (!taskId) return;

  try {
    await axiosInstance.put(`/tasks/${taskId}`, { status: targetStatusId });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Task moved successfully',
      life: 3000
    });

    await loadTasks();
  } catch (error) {
    console.error('Error moving task:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to move task',
      life: 3000
    });
  }

  dragOverStatus.value = null;
}

// Click outside handlers
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  if (!target.closest('.task-context-menu')) {
    showTaskMenuVisible.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadWorkflows();
  loadTaskStatuses();
  loadTasks();

  document.addEventListener('click', handleClickOutside);
});

watch(() => props.projectId, () => {
  if (props.projectId) {
    loadWorkflows();
    loadTaskStatuses();
    loadTasks();
  }
});
</script>

<style scoped>
.workflow-task-board {
  padding: 20px;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.workflow-info h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.workflow-info p {
  margin: 0;
  color: #666;
}

.workflow-actions {
  display: flex;
  gap: 12px;
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

/* Task Board */
.task-board {
  flex: 1;
  overflow: hidden;
}

.board-columns {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow-x: auto;
  padding-bottom: 20px;
}

.board-column {
  min-width: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.board-column.empty {
  border-color: #e9ecef;
}

.board-column:hover {
  border-color: #dee2e6;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.column-title h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.task-count {
  background: #e9ecef;
  color: #495057;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.column-tasks {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Drag Over Indicator */
.drag-over-indicator {
  border: 2px dashed #007bff;
  border-radius: 6px;
  margin: 8px 0;
  padding: 20px;
  text-align: center;
  background: rgba(0, 123, 255, 0.1);
}

.drag-over-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #007bff;
}

.drag-over-content i {
  font-size: 24px;
}

/* Task Cards */
.task-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.task-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.task-card.overdue {
  border-color: #dc3545;
  background: #fff5f5;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-priority {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.priority-lowest { background: #e9ecef; color: #495057; }
.priority-low { background: #d4edda; color: #155724; }
.priority-medium { background: #fff3cd; color: #856404; }
.priority-high { background: #f8d7da; color: #721c24; }
.priority-highest { background: #f8d7da; color: #721c24; }

.task-content h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
  line-height: 1.4;
}

.task-description {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assignee-avatar,
.assignee-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
}

.assignee-avatar {
  object-fit: cover;
}

.assignee-avatar-placeholder {
  background: #e9ecef;
  color: #495057;
}

.assignee-name {
  font-size: 12px;
  color: #666;
}

.task-due-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.task-due-date.overdue {
  color: #dc3545;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #666;
  min-width: 30px;
}

/* Context Menu */
.task-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 160px;
}

.menu-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background: #f8f9fa;
}

.menu-item.danger {
  color: #dc3545;
}

.menu-item.danger:hover {
  background: #fff5f5;
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

.task-detail-modal {
  max-width: 700px;
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

/* Workflow Selector */
.workflow-selector {
  padding: 20px;
}

.workflow-option {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.workflow-option:hover {
  border-color: #007bff;
  background: #f8f9ff;
}

.workflow-option.selected {
  border-color: #007bff;
  background: #f0f8ff;
}

.workflow-option-info h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.workflow-option-info p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
}

.workflow-option-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
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

.workflow-option-stats {
  margin-top: 12px;
}

.stat {
  font-size: 12px;
  color: #666;
}

/* Task Detail */
.task-detail-content {
  padding: 20px;
}

.task-detail-section {
  margin-bottom: 24px;
}

.task-detail-section h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f8f9fa;
}

.detail-label {
  font-weight: 500;
  color: #666;
}

.detail-value {
  color: #333;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.task-detail-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

/* Create Task Form */
.create-task-form {
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

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .workflow-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .workflow-actions {
    flex-direction: column;
  }

  .board-columns {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .board-column {
    min-width: auto;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal {
    width: 95%;
    margin: 20px;
  }
}
</style>
