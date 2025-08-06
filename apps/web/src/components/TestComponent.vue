<template>
  <div class="kanban-board">
    <!-- Header -->
    <div class="board-header">
      <h2 class="board-title">{{ workflow?.name || 'Kanban Board' }}</h2>
      <div class="board-actions">
        <button @click="showCreateTask = true" class="btn btn-primary">
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
            <div class="task-priority" :class="`priority-${task.priority}`">
              <span class="priority-icon"></span>
            </div>

            <!-- Task Content -->
            <div class="task-content">
              <h4 class="task-title">{{ task.title }}</h4>
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
                  :src="task.assignedTo.avatarUrl"
                  :alt="task.assignedTo.fullName"
                  class="avatar"
                >
                <div v-else class="avatar avatar-placeholder">
                  {{ getInitials(task.assignedTo?.fullName) }}
                </div>
              </div>
              <div class="task-actions">
                <button @click.stop="showTaskMenu(task)" class="task-menu-btn">
                  <i class="icon-more"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Add Task Button in Column -->
          <button
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
    <div v-if="selectedTask" class="modal-overlay" @click="closeTaskDetail">
      <div class="modal-content task-detail-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedTask.title }}</h3>
          <button @click="closeTaskDetail" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="task-info">
            <div class="info-row">
              <label>Status:</label>
              <div class="status-badge" :style="{ backgroundColor: selectedTask.status.color }">
                {{ selectedTask.status.name }}
              </div>
            </div>

            <div class="info-row">
              <label>Priority:</label>
              <span class="priority-badge" :class="`priority-${selectedTask.priority}`">
                {{ selectedTask.priority }}
              </span>
            </div>

            <div v-if="selectedTask.assignedTo" class="info-row">
              <label>Assignee:</label>
              <div class="assignee-info">
                <img
                  v-if="selectedTask.assignedTo.avatarUrl"
                  :src="selectedTask.assignedTo.avatarUrl"
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
            <div class="history-list">
              <div v-for="entry in taskHistory" :key="entry.id" class="history-entry">
                <div class="history-icon">
                  <i class="icon-arrow-right"></i>
                </div>
                <div class="history-content">
                  <p>
                    <strong>{{ entry.changedBy.fullName }}</strong>
                    moved this task from
                    <span v-if="entry.fromStatus" class="status-name">{{ entry.fromStatus.name }}</span>
                    <span v-else>created</span>
                    to
                    <span class="status-name">{{ entry.toStatus.name }}</span>
                  </p>
                  <small>{{ formatDateTime(entry.createdAt) }}</small>
                  <p v-if="entry.comment" class="history-comment">{{ entry.comment }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KanbanBoard',
  props: {
    projectId: {
      type: String,
      required: true
    },
    workflowId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      loading: true,
      statuses: [],
      tasks: [],
      workflow: null,
      selectedTask: null,
      availableTransitions: [],
      taskHistory: [],
      showCreateTask: false,
      draggedTask: null
    }
  },
  async mounted() {
    await this.loadBoard()
  },
  methods: {
    async loadBoard() {
      try {
        this.loading = true

        // Load statuses
        const statusesResponse = await this.$api.get(`/projects/${this.projectId}/statuses`)
        this.statuses = statusesResponse.data

        // Load tasks
        const tasksResponse = await this.$api.get(`/projects/${this.projectId}/tasks`)
        this.tasks = tasksResponse.data

        // Load workflow if specified
        if (this.workflowId) {
          const workflowResponse = await this.$api.get(`/projects/${this.projectId}/workflows/${this.workflowId}`)
          this.workflow = workflowResponse.data
        }

      } catch (error) {
        console.error('Failed to load board:', error)
        this.$toast.error('Failed to load kanban board')
      } finally {
        this.loading = false
      }
    },

    async refreshBoard() {
      await this.loadBoard()
    },

    getTasksByStatus(statusId) {
      return this.tasks.filter(task => task.status.id === statusId)
    },

    onDragStart(event, task) {
      this.draggedTask = task
      event.dataTransfer.effectAllowed = 'move'
    },

    async onDrop(event, toStatusId) {
      event.preventDefault()

      if (!this.draggedTask || this.draggedTask.status.id === toStatusId) {
        return
      }

      try {
        await this.$api.post(`/tasks/${this.draggedTask.id}/transition`, {
          toStatusId: toStatusId
        })

        // Update task status locally
        const task = this.tasks.find(t => t.id === this.draggedTask.id)
        if (task) {
          const newStatus = this.statuses.find(s => s.id === toStatusId)
          task.status = newStatus
        }

        this.$toast.success('Task moved successfully')

      } catch (error) {
        console.error('Failed to move task:', error)
        this.$toast.error('Failed to move task')
      } finally {
        this.draggedTask = null
      }
    },

    async selectTask(task) {
      this.selectedTask = task

      try {
        // Load available transitions
        const transitionsResponse = await this.$api.get(`/tasks/${task.id}/available-transitions`)
        this.availableTransitions = transitionsResponse.data

        // Load task history
        const historyResponse = await this.$api.get(`/tasks/${task.id}/history`)
        this.taskHistory = historyResponse.data

      } catch (error) {
        console.error('Failed to load task details:', error)
      }
    },

    closeTaskDetail() {
      this.selectedTask = null
      this.availableTransitions = []
      this.taskHistory = []
    },

    async transitionTask(taskId, toStatusId) {
      try {
        await this.$api.post(`/tasks/${taskId}/transition`, {
          toStatusId: toStatusId
        })

        // Update task status locally
        const task = this.tasks.find(t => t.id === taskId)
        if (task) {
          const newStatus = this.statuses.find(s => s.id === toStatusId)
          task.status = newStatus
        }

        // Update selected task if it's the same
        if (this.selectedTask?.id === taskId) {
          this.selectedTask.status = this.statuses.find(s => s.id === toStatusId)
          // Reload transitions and history
          await this.selectTask(this.selectedTask)
        }

        this.$toast.success('Task status updated')

      } catch (error) {
        console.error('Failed to transition task:', error)
        this.$toast.error('Failed to update task status')
      }
    },

    createTaskInStatus(statusId) {
      // Emit event to parent component or navigate to create task page
      this.$emit('create-task', { statusId })
    },

    showTaskMenu(task) {
      // Show context menu for task actions
      console.log('Show task menu for:', task)
    },

    showColumnMenu(status) {
      // Show context menu for column actions
      console.log('Show column menu for:', status)
    },

    getInitials(fullName) {
      if (!fullName) return '?'
      return fullName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },

    isOverdue(dueDate) {
      return new Date(dueDate) < new Date()
    },

    formatDate(date) {
      return new Date(date).toLocaleDateString()
    },

    formatDateTime(date) {
      return new Date(date).toLocaleString()
    }
  }
}
</script>

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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 1rem;
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

.status-name {
  font-weight: 600;
}

.history-comment {
  margin-top: 0.5rem !important;
  padding: 0.5rem;
  background: #f4f5f7;
  border-radius: 4px;
  font-style: italic;
}

/* Icon placeholders */
.icon-plus::before { content: '+'; }
.icon-refresh::before { content: '⟲'; }
.icon-more::before { content: '⋯'; }
.icon-close::before { content: '×'; }
.icon-calendar::before { content: '📅'; }
.icon-arrow-right::before { content: '→'; }
</style>
