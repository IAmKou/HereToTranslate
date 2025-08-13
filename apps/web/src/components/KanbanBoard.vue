<template>
  <div class="kanban-board-container">
    <!-- Status Headers Row -->
    <div class="kanban-status-headers">
      <div
        v-for="status in statuses"
        :key="status.id"
        class="status-header-card"
        :style="{ '--status-color': status.color }"
        draggable="true"
        @dragstart="onStatusDragStart($event, status.id)"
        @dragover="onStatusDragOver($event, status.id)"
        @drop="onStatusDrop($event, status.id)"
        @dragend="onStatusDragEnd"
      >
        <div class="status-bar" :style="{ backgroundColor: status.color }" />
        <span class="status-title">{{ status.name }}</span>
        <span
          v-if="getTasksByStatus(status.id).length"
          class="status-count"
        >{{ getTasksByStatus(status.id).length }}</span>
        <span v-if="status.id === '3'" class="status-info">
          <i class="pi pi-info-circle" />
        </span>
      </div>
    </div>

    <!-- Task Columns -->
    <div class="kanban-columns-container">
      <div
        v-for="status in statuses"
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
          v-for="(task, idx) in getTasksByStatus(status.id)"
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
                    <span class="assignee-name">{{ task.assignedTo.fullName || task.assignedTo.username }}</span>
                  </div>
                  <!-- File info -->
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Task {
  id: string;
  title: string;
  status: any;
  createdAt: string;
  dueDate?: string;
  assignedTo?: any;
  fileId?: string;
  type?: string;
}

interface Status {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface Props {
  statuses: Status[];
  tasks: Task[];
  isDragging?: boolean;
  dragOverColumn?: string;
}

interface Emits {
  (e: 'statusDragStart', event: DragEvent, statusId: string): void;
  (e: 'statusDragOver', event: DragEvent, statusId: string): void;
  (e: 'statusDrop', event: DragEvent, statusId: string): void;
  (e: 'statusDragEnd', event: DragEvent): void;
  (e: 'dragOver', event: DragEvent, statusId: string): void;
  (e: 'dragLeave', event: DragEvent): void;
  (e: 'drop', event: DragEvent, statusId: string): void;
  (e: 'dragStart', event: DragEvent, task: Task, index: number): void;
  (e: 'dragEnd', event: DragEvent): void;
  (e: 'selectTask', task: Task): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Methods
const getTasksByStatus = (statusId: string) => {
  return props.tasks.filter(task =>
    task.status && typeof task.status === 'object' && task.status.id === statusId
  );
};

const getStatusColor = (statusId: string) => {
  const status = props.statuses.find(s => s.id === statusId);
  return status ? status.color : '#6b7280';
};

const getStatusDisplayName = (status: any) => {
  if (typeof status === 'object' && status !== null) {
    return status.name || 'Unknown';
  }
  return status || 'Unknown';
};

const getCleanTaskTitle = (title: string) => {
  return title || 'Untitled Task';
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isOverdue = (dateString: string) => {
  if (!dateString) return false;
  const dueDate = new Date(dateString);
  const now = new Date();
  return dueDate < now;
};

const getAvatarUrl = (url: string) => {
  return url;
};

const getFileName = (fileId: string) => {
  return fileId;
};

const getFileIcon = (fileName: string) => {
  return '📄';
};

// Event handlers
const onStatusDragStart = (event: DragEvent, statusId: string) => {
  emit('statusDragStart', event, statusId);
};

const onStatusDragOver = (event: DragEvent, statusId: string) => {
  emit('statusDragOver', event, statusId);
};

const onStatusDrop = (event: DragEvent, statusId: string) => {
  emit('statusDrop', event, statusId);
};

const onStatusDragEnd = (event: DragEvent) => {
  emit('statusDragEnd', event);
};

const handleDragOver = (event: DragEvent, statusId: string) => {
  emit('dragOver', event, statusId);
};

const handleDragLeave = (event: DragEvent) => {
  emit('dragLeave', event);
};

const handleDrop = (event: DragEvent, statusId: string) => {
  emit('drop', event, statusId);
};

const handleDragStart = (event: DragEvent, task: Task, index: number) => {
  emit('dragStart', event, task, index);
};

const handleDragEnd = (event: DragEvent) => {
  emit('dragEnd', event);
};

const selectTask = (task: Task) => {
  emit('selectTask', task);
};
</script>

<style scoped>
.kanban-board-container {
  width: 100%;
  /* This container will handle its own horizontal scrolling */
  overflow-x: auto;
  overflow-y: hidden;
  /* Better scrollbar handling */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* Custom scrollbar for webkit browsers */
.kanban-board-container::-webkit-scrollbar {
  height: 8px;
}

.kanban-board-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.kanban-board-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-board-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Status Headers */
.kanban-status-headers {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.8em;
  margin: 0 0 1.2em 0;
  padding: 0.4rem 0;
  border-bottom: 1px solid #e2e8f0;
  /* This row can expand beyond container */
  width: max-content;
  min-width: 100%;
}

.status-header-card {
  background: #f7f8fa;
  border-radius: 12px;
  width: 250px;
  min-width: 250px;
  max-width: 250px;
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
  white-space: nowrap;
  overflow: hidden;
}

.status-bar {
  width: 18px;
  height: 32px;
  border-radius: 6px;
  margin-bottom: 0;
  margin-left: 0;
}

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

/* Task Columns */
.kanban-columns-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.8em;
  /* This container can expand beyond parent */
  width: max-content;
  min-width: 100%;
}

.kanban-column {
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.8em;
  width: 250px;
  min-width: 250px;
  max-width: 250px;
  flex-shrink: 0;
  flex-grow: 0;
  margin-right: 0.8em;
  transition: background-color 0.2s ease;
  box-sizing: border-box;
  white-space: normal;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.kanban-column:last-child {
  margin-right: 0;
}

.kanban-column.drag-over {
  background: #e0f2fe;
  border: 2px dashed #2563eb;
}

/* Task Cards */
.task-card-link {
  text-decoration: none;
  color: inherit;
  margin-bottom: 0.8em;
}

.task-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
  cursor: pointer;
}

.task-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.task-status-badge {
  display: inline-block;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 600;
  margin-bottom: 0.5em;
  background: #e0e7ff;
  color: #2563eb;
}

.crowdin-row-1,
.crowdin-row-2,
.crowdin-row-3,
.crowdin-row-4,
.crowdin-row-5 {
  margin-bottom: 0.5em;
}

.crowdin-col-left {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.task-id {
  font-weight: 600;
  color: #2563eb;
  font-size: 0.9em;
}

.task-label {
  font-weight: 600;
  color: #374151;
  flex: 1;
}

.date-text {
  color: #6b7280;
  font-size: 0.875em;
}

.due-date-label {
  color: #6b7280;
  font-size: 0.875em;
  display: flex;
  align-items: center;
  gap: 0.25em;
}

.due-date-value {
  color: #374151;
  font-weight: 500;
}

.due-date-value.overdue {
  color: #dc2626;
}

.arrow {
  color: #6b7280;
  margin-right: 0.25em;
}

.due-icon {
  margin-right: 0.25em;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.assignee-info {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.assignee-avatar,
.assignee-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75em;
  font-weight: 600;
  color: white;
  background: #6b7280;
}

.assignee-name {
  font-size: 0.875em;
  color: #374151;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.file-icon {
  font-size: 1.2em;
}

.file-name {
  font-size: 0.875em;
  color: #6b7280;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-type-tag {
  display: inline-block;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 600;
  background: #f3f4f6;
  color: #374151;
}

.drag-over-title {
  background: #e0f2fe;
  border: 2px dashed #2563eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: center;
}

.drag-over-title-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
}

.drag-over-icon {
  font-size: 1.5em;
}

.drag-over-text {
  color: #2563eb;
  font-weight: 600;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .status-header-card,
  .kanban-column {
    width: 200px;
    min-width: 200px;
    max-width: 200px;
  }
}
</style>
