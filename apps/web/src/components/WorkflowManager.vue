<template>
  <div class="workflow-manager">
    <!-- Header -->
    <div class="workflow-header">
      <h2>Workflow Management</h2>
      <div class="header-actions">
        <button class="btn-secondary" @click="openStatusManagement">
          <i class="pi pi-tags"></i>
          Manage Statuses
        </button>
        <button class="btn-primary" @click="showCreateWorkflow = true">
          <i class="pi pi-plus"></i>
          Create Workflow
        </button>
      </div>
    </div>

    <!-- Workflow List -->
    <div class="workflow-list" v-if="viewMode === 'list'">
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        Loading workflows...
      </div>

      <div v-else-if="workflows.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No workflows yet</h3>
        <p>Create your first workflow to define how tasks move through different statuses</p>
        <button class="btn-primary" @click="showCreateWorkflow = true">
          Create Workflow
        </button>
      </div>

      <div v-else class="workflow-cards">
        <div
          v-for="workflow in workflows"
          :key="workflow.id"
          class="workflow-card"
          :class="{ 'default': workflow.isDefault }"
        >
          <div class="workflow-card-header">
            <div class="workflow-info">
              <h3>{{ workflow.name }}</h3>
              <p v-if="workflow.description">{{ workflow.description }}</p>
              <div class="workflow-badges">
                <span v-if="workflow.isDefault" class="badge default">Default</span>
                <span v-if="workflow.isActive" class="badge active">Active</span>
                <span v-else class="badge inactive">Inactive</span>
              </div>
            </div>
            <div class="workflow-actions">
              <button
                class="btn-icon"
                @click="viewWorkflow(workflow)"
                title="View workflow"
              >
                <i class="pi pi-eye"></i>
              </button>
              <button
                class="btn-icon"
                @click="editWorkflow(workflow)"
                title="Edit workflow"
              >
                <i class="pi pi-pencil"></i>
              </button>
              <button
                class="btn-icon"
                @click="openTransitionsPage(workflow)"
                title="Manage transitions"
              >
                <i class="pi pi-sitemap"></i>
              </button>
              <button
                v-if="!workflow.isDefault"
                class="btn-icon danger"
                @click="deleteWorkflow(workflow)"
                title="Delete workflow"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>

          <div class="workflow-stats">
            <div class="stat">
              <span class="stat-label">Transitions</span>
              <span class="stat-value">{{ getWorkflowTransitionsCount(workflow.id) }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Tasks using</span>
              <span class="stat-value">{{ getTasksUsingWorkflow(workflow.id) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- In-page Transitions Management View -->
    <div v-else-if="viewMode === 'transitions'" class="transitions-page">
      <div class="transitions-page-header">
        <button class="btn-secondary" @click="backToList">
          <i class="pi pi-arrow-left"></i>
          Back
        </button>
        <h3>Manage Transitions - {{ selectedWorkflow?.name }}</h3>
        <button class="btn-primary" @click="showCreateTransition = true">
          <i class="pi pi-plus"></i>
          Add Transition
        </button>
      </div>

      <div class="transitions-content">
        <div class="transitions-header">
          <h4>Current Transitions</h4>
        </div>

        <div class="transitions-list">
          <div
            v-for="transition in workflowTransitions"
            :key="transition.id"
            class="transition-item"
          >
            <div class="transition-info">
              <div class="transition-name">{{ transition.name }}</div>
              <div class="transition-flow">
                <span class="from-status">{{ transition.fromStatus.name }}</span>
                <i class="pi pi-arrow-right"></i>
                <span class="to-status">{{ transition.toStatus.name }}</span>
              </div>
              <div class="transition-conditions">
                <span class="condition-badge">{{ transition.conditionType }}</span>
              </div>
            </div>

            <div class="transition-actions">
              <button class="btn-icon" @click="editTransition(transition)">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon danger" @click="deleteTransition(transition)">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Inline Create/Edit Transition Form -->
        <div v-if="showCreateTransition || showEditTransition" class="transition-form">
          <h4>{{ showEditTransition ? 'Edit Transition' : 'Create Transition' }}</h4>
          <form @submit.prevent="saveTransition" class="form">
            <div class="form-group">
              <label for="transitionName">Name *</label>
              <input id="transitionName" v-model="transitionForm.name" type="text" required placeholder="Enter transition name" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fromStatus">From Status *</label>
                <select id="fromStatus" v-model="transitionForm.fromStatusId" required>
                  <option value="">Select from status</option>
                  <option v-for="status in availableStatuses" :key="status.id" :value="status.id">{{ status.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label for="toStatus">To Status *</label>
                <select id="toStatus" v-model="transitionForm.toStatusId" required>
                  <option value="">Select to status</option>
                  <option v-for="status in availableStatuses" :key="status.id" :value="status.id">{{ status.name }}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="conditionType">Condition Type</label>
              <select id="conditionType" v-model="transitionForm.conditionType">
                <option value="anyone">Anyone</option>
                <option value="role">Role-based</option>
                <option value="user">User-specific</option>
                <option value="group">Group-based</option>
                <option value="assignee_only">Assignee Only</option>
                <option value="creator_only">Creator Only</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeTransitionForm">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="savingTransition">
                <i v-if="savingTransition" class="pi pi-spin pi-spinner"></i>
                {{ showEditTransition ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Status Management View -->
    <div v-else-if="viewMode === 'status'" class="status-page">


      <!-- Move Tasks Modal (when status has tasks) -->
      <Teleport to="body">
        <div v-if="showMoveTasksModal" class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Move work from {{ statusToDelete?.name }} column</h3>
              <button class="close-btn" @click="closeMoveTasksModal">
                <i class="pi pi-times" style="font-size: 18px; font-weight: bold;">×</i>
              </button>
            </div>

            <div class="modal-body">
              <div class="move-tasks-content">
                <div class="warning-icon">
                  <i class="pi pi-exclamation-triangle"></i>
                </div>
                <p class="move-description">Select a new home for any work with the {{ statusToDelete?.name }} status, including work in the backlog.</p>

                <div class="status-migration">
                  <div class="status-to-delete">
                    <span>This status will be deleted:</span>
                    <div class="status-badge">{{ statusToDelete?.name }}</div>
                  </div>

                  <div class="move-arrow">
                    <i class="pi pi-arrow-right"></i>
                  </div>

                  <div class="status-selection">
                    <span>Move existing work items to:</span>
                    <select v-model="selectedNewStatus" class="status-dropdown">
                      <option value="">Select a status...</option>
                      <option
                        v-for="status in availableStatuses.filter((s: any) => s.id !== statusToDelete?.id)"
                        :key="status.id"
                        :value="status.id"
                      >
                        {{ status.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeMoveTasksModal">
                Cancel
              </button>
              <button
                class="btn btn-danger"
                @click="confirmMoveAndDelete"
                :disabled="!selectedNewStatus || movingTasks"
              >
                <span v-if="movingTasks" class="loading-spinner"></span>
                {{ movingTasks ? 'Moving Tasks...' : 'Move Tasks & Delete Status' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <div class="status-page-header">
        <button class="btn-secondary" @click="backToList">
          <i class="pi pi-arrow-left"></i>
          Back
        </button>
        <h3>Manage Statuses</h3>
        <div class="header-actions">
          <button class="btn-secondary" @click="createDefaultStatuses">
            <i class="pi pi-magic"></i>
            Create Default Statuses
          </button>
          <button class="btn-primary" @click="showCreateStatus = true">
            <i class="pi pi-plus"></i>
            Add Status
          </button>
        </div>
      </div>

      <div class="status-content">
        <div class="status-categories">
          <div class="category-section">
            <h4>To Do</h4>
            <div class="status-list">
              <div
                v-for="status in getStatusesByCategory('todo')"
                :key="status.id"
                class="status-item"
                :class="{ 'start-status': status.isStartStatus }"
              >
                <div class="status-info">
                  <div class="status-color" :style="{ backgroundColor: status.color }"></div>
                  <div class="status-details">
                    <div class="status-name">{{ status.name }}</div>
                    <div class="status-description">{{ status.description }}</div>
                    <div class="status-badges">
                      <span v-if="status.isStartStatus" class="badge start">Start</span>
                      <span v-if="status.isDefault" class="badge default">Default</span>
                      <span v-if="!status.isActive" class="badge inactive">Inactive</span>
                    </div>
                  </div>
                </div>
                <div class="status-actions">
                  <button class="btn-icon" @click="editStatus(status)">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="btn-icon danger" @click="deleteStatus(status)">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="category-section">
            <h4>In Progress</h4>
            <div class="status-list">
              <div
                v-for="status in getStatusesByCategory('in_progress')"
                :key="status.id"
                class="status-item"
              >
                <div class="status-info">
                  <div class="status-color" :style="{ backgroundColor: status.color }"></div>
                  <div class="status-details">
                    <div class="status-name">{{ status.name }}</div>
                    <div class="status-description">{{ status.description }}</div>
                    <div class="status-badges">
                      <span v-if="status.isDefault" class="badge default">Default</span>
                      <span v-if="!status.isActive" class="badge inactive">Inactive</span>
                    </div>
                  </div>
                </div>
                <div class="status-actions">
                  <button class="btn-icon" @click="editStatus(status)">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="btn-icon danger" @click="deleteStatus(status)">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="category-section">
            <h4>Done</h4>
            <div class="status-list">
              <div
                v-for="status in getStatusesByCategory('done')"
                :key="status.id"
                class="status-item"
                :class="{ 'end-status': status.isEndStatus, 'resolved-status': status.isResolved }"
              >
                <div class="status-info">
                  <div class="status-color" :style="{ backgroundColor: status.color }"></div>
                  <div class="status-details">
                    <div class="status-name">{{ status.name }}</div>
                    <div class="status-description">{{ status.description }}</div>
                    <div class="status-badges">
                      <span v-if="status.isEndStatus" class="badge end">End</span>
                      <span v-if="status.isResolved" class="badge resolved">Resolved</span>
                      <span v-if="status.isClosed" class="badge closed">Closed</span>
                      <span v-if="status.isDefault" class="badge default">Default</span>
                      <span v-if="!status.isActive" class="badge inactive">Inactive</span>
                    </div>
                  </div>
                </div>
                <div class="status-actions">
                  <button class="btn-icon" @click="editStatus(status)">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="btn-icon danger" @click="deleteStatus(status)">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Create/Edit Status Form -->
        <div v-if="showCreateStatus || showEditStatus" class="status-form">
          <h4>{{ showEditStatus ? 'Edit Status' : 'Create Status' }}</h4>
          <form @submit.prevent="saveStatus" class="form">
            <div class="form-group">
              <label for="statusName">Name *</label>
              <input id="statusName" v-model="statusForm.name" type="text" required placeholder="Enter status name" />
            </div>
            <div class="form-group">
              <label for="statusDescription">Description</label>
              <textarea id="statusDescription" v-model="statusForm.description" placeholder="Enter status description" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="statusColor">Color *</label>
                <input id="statusColor" v-model="statusForm.color" type="color" required />
              </div>
              <div class="form-group">
                <label for="statusType">Type *</label>
                <select id="statusType" v-model="statusForm.type" required>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div class="form-checkboxes">
              <label class="checkbox-label">
                <input v-model="statusForm.isDefault" type="checkbox" />
                <span class="checkmark"></span>
                Set as default status
              </label>
              <label class="checkbox-label">
                <input v-model="statusForm.isStartStatus" type="checkbox" />
                <span class="checkmark"></span>
                Set as start status
              </label>
              <label class="checkbox-label">
                <input v-model="statusForm.isEndStatus" type="checkbox" />
                <span class="checkmark"></span>
                Set as end status
              </label>
              <label class="checkbox-label">
                <input v-model="statusForm.isResolved" type="checkbox" />
                <span class="checkmark"></span>
                Mark as resolved
              </label>
              <label class="checkbox-label">
                <input v-model="statusForm.isClosed" type="checkbox" />
                <span class="checkmark"></span>
                Mark as closed
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeStatusForm">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="savingStatus">
                <i v-if="savingStatus" class="pi pi-spin pi-spinner"></i>
                {{ showEditStatus ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Create/Edit Workflow Modal -->
    <Teleport to="body">
      <div v-if="showCreateWorkflow || showEditWorkflow" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ showEditWorkflow ? 'Edit Workflow' : 'Create Workflow' }}</h3>
            <button class="btn-icon" @click="closeWorkflowModal" data-close="true">

            </button>
          </div>

          <form @submit.prevent="saveWorkflow" class="workflow-form">
            <div class="form-group">
              <label for="workflowName">Name *</label>
              <input
                id="workflowName"
                v-model="workflowForm.name"
                type="text"
                required
                placeholder="Enter workflow name"
              >
            </div>

            <div class="form-group">
              <label for="workflowDescription">Description</label>
              <textarea
                id="workflowDescription"
                v-model="workflowForm.description"
                placeholder="Enter workflow description"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input
                  v-model="workflowForm.isDefault"
                  type="checkbox"
                >
                <span class="checkmark"></span>
                Set as default workflow for this project
              </label>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeWorkflowModal">
                Cancel
              </button>
              <button type="submit" class="btn-primary" :disabled="saving">
                <i v-if="saving" class="pi pi-spin pi-spinner"></i>
                {{ showEditWorkflow ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Workflow Visualization Modal -->
    <Teleport to="body">
      <div v-if="showWorkflowView" class="modal-overlay">
        <div class="modal workflow-view-modal">
          <div class="modal-header">
            <h3>{{ selectedWorkflow?.name }} - Workflow Visualization</h3>
            <button class="btn-icon" @click="closeWorkflowView" data-close="true">

            </button>
          </div>

          <div class="workflow-visualization">
            <div v-if="workflowVisualizationLoading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              Loading workflow visualization...
            </div>

            <div v-else-if="workflowVisualization" class="workflow-diagram">
              <!-- Status Nodes -->
              <div class="status-nodes">
                <div
                  v-for="node in workflowVisualization.nodes"
                  :key="node.id"
                  class="status-node"
                  :style="{
                  backgroundColor: node.color || '#e0e0e0',
                  left: `${(node.id.charCodeAt(0) % 5) * 20 + 10}%`
                }"
                >
                  <div class="node-content">
                    <div class="node-name">{{ node.name }}</div>
                    <div class="node-type">{{ node.type }}</div>
                  </div>
                </div>
              </div>

              <!-- Transitions -->
              <svg class="transitions-svg">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                  </marker>
                </defs>

                <g v-for="edge in workflowVisualization.edges" :key="edge.id">
                  <line
                    :x1="50"
                    :y1="50"
                    :x2="150"
                    :y2="50"
                    stroke="#666"
                    stroke-width="2"
                    marker-end="url(#arrowhead)"
                  />
                  <text
                    :x="100"
                    :y="45"
                    text-anchor="middle"
                    class="transition-label"
                  >
                    {{ edge.name }}
                  </text>
                </g>
              </svg>
            </div>

            <div class="workflow-actions">
              <button class="btn-secondary" @click="manageTransitionsFromModal">
                <i class="pi pi-cog"></i>
                Manage Transitions
              </button>
              <button class="btn-primary" @click="editWorkflowFromModal">
                <i class="pi pi-pencil"></i>
                Edit Workflow
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Transitions Management Modal -->
    <Teleport to="body">
      <div v-if="showTransitionsModal" class="modal-overlay">
        <div class="modal transitions-modal">
          <div class="modal-header">
            <h3>Manage Transitions - {{ selectedWorkflow?.name }}</h3>
            <button class="btn-icon" @click="closeTransitionsModal" data-close="true">

            </button>
          </div>

          <div class="transitions-content">
            <div class="transitions-header">
              <h4>Current Transitions</h4>
              <button class="btn-primary" @click="showCreateTransition = true">
                <i class="pi pi-plus"></i>
                Add Transition
              </button>
            </div>

            <div class="transitions-list">
              <div
                v-for="transition in workflowTransitions"
                :key="transition.id"
                class="transition-item"
              >
                <div class="transition-info">
                  <div class="transition-name">{{ transition.name }}</div>
                  <div class="transition-flow">
                    <span class="from-status">{{ transition.fromStatus.name }}</span>
                    <i class="pi pi-arrow-right"></i>
                    <span class="to-status">{{ transition.toStatus.name }}</span>
                  </div>
                  <div class="transition-conditions">
                    <span class="condition-badge">{{ transition.conditionType }}</span>
                  </div>
                </div>

                <div class="transition-actions">
                  <button class="btn-icon" @click="editTransition(transition)">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="btn-icon danger" @click="deleteTransition(transition)">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Create/Edit Transition Form -->
          <div v-if="showCreateTransition || showEditTransition" class="transition-form">
            <h4>{{ showEditTransition ? 'Edit Transition' : 'Create Transition' }}</h4>

            <form @submit.prevent="saveTransition" class="form">
              <div class="form-group">
                <label for="transitionName">Name *</label>
                <input
                  id="transitionName"
                  v-model="transitionForm.name"
                  type="text"
                  required
                  placeholder="Enter transition name"
                >
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="fromStatus">From Status *</label>
                  <select id="fromStatus" v-model="transitionForm.fromStatusId" required>
                    <option value="">Select from status</option>
                    <option
                      v-for="status in availableStatuses"
                      :key="status.id"
                      :value="status.id"
                    >
                      {{ status.name }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="toStatus">To Status *</label>
                  <select id="toStatus" v-model="transitionForm.toStatusId" required>
                    <option value="">Select to status</option>
                    <option
                      v-for="status in availableStatuses"
                      :key="status.id"
                      :value="status.id"
                    >
                      {{ status.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="conditionType">Condition Type</label>
                <select id="conditionType" v-model="transitionForm.conditionType">
                  <option value="anyone">Anyone</option>
                  <option value="role">Role-based</option>
                  <option value="user">User-specific</option>
                  <option value="group">Group-based</option>
                  <option value="assignee_only">Assignee Only</option>
                  <option value="creator_only">Creator Only</option>
                </select>
              </div>

              <div class="form-actions">
                <button type="button" class="btn-secondary" @click="closeTransitionForm">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" :disabled="savingTransition">
                  <i v-if="savingTransition" class="pi pi-spin pi-spinner"></i>
                  {{ showEditTransition ? 'Update' : 'Create' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import { Teleport } from 'vue';
import { StatusType, TaskStatus } from '../types/status';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  project: { id: string };
  createdAt: string;
  updatedAt: string;
}



interface WorkflowTransition {
  id: string;
  name: string;
  workflow: { id: string };
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  conditionType: string;
  conditionData?: any;
  isActive: boolean;
  createdAt: string;
}

interface WorkflowVisualization {
  workflow: {
    id: string;
    name: string;
    description?: string;
  };
  nodes: Array<{
    id: string;
    name: string;
    color: string;
    type: string;
    position: number;
  }>;
  edges: Array<{
    id: string;
    name: string;
    from: string;
    to: string;
    conditionType: string;
  }>;
}

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  statusCreated: [];
  statusUpdated: [];
  statusDeleted: [];
}>();

const toast = useToast();

// State
const workflows = ref<Workflow[]>([]);
const taskStatuses = ref<TaskStatus[]>([]);
const workflowTransitions = ref<WorkflowTransition[]>([]);
const loading = ref(false);
const saving = ref(false);
const savingTransition = ref(false);
const savingStatus = ref(false);
// Map to cache transitions count per workflow
const transitionsCountByWorkflow = ref<Record<string, number>>({});
const viewMode = ref<'list' | 'transitions' | 'status'>('list');

// Modal states
const showCreateWorkflow = ref(false);
const showEditWorkflow = ref(false);
const showWorkflowView = ref(false);
const showTransitionsModal = ref(false);
const showCreateTransition = ref(false);
const showEditTransition = ref(false);
const showCreateStatus = ref(false);
const showEditStatus = ref(false);

const deletingStatus = ref(false);
const statusToDelete = ref<TaskStatus | null>(null);
const showMoveTasksModal = ref(false);
const movingTasks = ref(false);
const selectedNewStatus = ref<string>('');

// Selected items
const selectedWorkflow = ref<Workflow | null>(null);
const selectedTransition = ref<WorkflowTransition | null>(null);
const selectedStatus = ref<TaskStatus | null>(null);
const workflowVisualization = ref<WorkflowVisualization | null>(null);
const workflowVisualizationLoading = ref(false);

// Forms
const workflowForm = ref({
  name: '',
  description: '',
  isDefault: false
});

const transitionForm = ref({
  name: '',
  fromStatusId: '',
  toStatusId: '',
  conditionType: 'anyone',
  conditionData: null
});

const statusForm = ref({
  name: '',
  description: '',
  color: '#42526E',
  type: StatusType.TODO,

  isDefault: false,
  isStartStatus: false,
  isEndStatus: false,
  isResolved: false,
  isClosed: false,
});

// Computed
const availableStatuses = computed(() =>
  taskStatuses.value.filter(status => status.isActive)
);

// Methods
async function loadWorkflows() {
  loading.value = true;
  try {
    const { data } = await axiosInstance.get(`/workflows/project/${props.projectId}`);
    workflows.value = data;
    // Load transitions count for each workflow card
    const counts: Record<string, number> = {};
    await Promise.all(
      workflows.value.map(async (wf) => {
        try {
          const { data: tr } = await axiosInstance.get(`/workflows/${wf.id}/transitions`);
          counts[wf.id] = Array.isArray(tr) ? tr.length : 0;
        } catch {
          counts[wf.id] = 0;
        }
      })
    );
    transitionsCountByWorkflow.value = counts;
  } catch (error) {
    console.error('Error loading workflows:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load workflows',
      life: 3000
    });
  } finally {
    loading.value = false;
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

async function loadWorkflowTransitions(workflowId: string) {
  try {
    const { data } = await axiosInstance.get(`/workflows/${workflowId}/transitions`);
    workflowTransitions.value = data;
    // Also refresh count for the card
    transitionsCountByWorkflow.value = {
      ...transitionsCountByWorkflow.value,
      [workflowId]: Array.isArray(data) ? data.length : 0,
    };
  } catch (error) {
    console.error('Error loading workflow transitions:', error);
  }
}

async function loadWorkflowVisualization(workflowId: string) {
  workflowVisualizationLoading.value = true;
  try {
    const { data } = await axiosInstance.get(`/workflows/${workflowId}/visualization`);
    workflowVisualization.value = data;
  } catch (error) {
    console.error('Error loading workflow visualization:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load workflow visualization',
      life: 3000
    });
  } finally {
    workflowVisualizationLoading.value = false;
  }
}

function getWorkflowTransitionsCount(workflowId: string): number {
  return transitionsCountByWorkflow.value[workflowId] ?? 0;
}

function getTasksUsingWorkflow(workflowId: string): number {
  // This would need to be implemented based on your task data structure
  return 0; // Placeholder
}



// Workflow actions
function createWorkflow() {
  workflowForm.value = {
    name: '',
    description: '',
    isDefault: false
  };
  showCreateWorkflow.value = true;
}

function editWorkflow(workflow: Workflow) {
  workflowForm.value = {
    name: workflow.name,
    description: workflow.description || '',
    isDefault: workflow.isDefault
  };
  selectedWorkflow.value = workflow;
  showEditWorkflow.value = true;
}

async function saveWorkflow() {
  saving.value = true;
  try {
    if (showEditWorkflow.value && selectedWorkflow.value) {
      await axiosInstance.put(`/workflows/${selectedWorkflow.value.id}`, workflowForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Workflow updated successfully',
        life: 3000
      });
    } else {
      await axiosInstance.post(`/workflows/project/${props.projectId}`, workflowForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Workflow created successfully',
        life: 3000
      });
    }

    await loadWorkflows();
    closeWorkflowModal();
  } catch (error) {
    console.error('Error saving workflow:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save workflow',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
}

async function deleteWorkflow(workflow: Workflow) {
  if (!confirm(`Are you sure you want to delete workflow "${workflow.name}"?`)) {
    return;
  }

  try {
    await axiosInstance.delete(`/workflows/${workflow.id}`);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Workflow deleted successfully',
      life: 3000
    });
    await loadWorkflows();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete workflow',
      life: 3000
    });
  }
}

function viewWorkflow(workflow: Workflow) {
  selectedWorkflow.value = workflow;
  showWorkflowView.value = true;
  loadWorkflowVisualization(workflow.id);
}

function openTransitionsPage(workflow: Workflow) {
  selectedWorkflow.value = workflow;
  viewMode.value = 'transitions';
  loadWorkflowTransitions(workflow.id);
  loadTaskStatuses(); // Load statuses to populate dropdowns
}

function backToList() {
  viewMode.value = 'list';
  selectedWorkflow.value = null;
  selectedStatus.value = null;
  showCreateTransition.value = false;
  showEditTransition.value = false;
  showCreateStatus.value = false;
  showEditStatus.value = false;
}

function manageTransitions() {
  // Keep compatibility for existing buttons (e.g., from visualization modal)
  if (selectedWorkflow.value) {
    viewMode.value = 'transitions';
    loadWorkflowTransitions(selectedWorkflow.value.id);
  }
}

function manageTransitionsFromModal() {
  // Close current modal first, then open transitions page
  showWorkflowView.value = false;
  workflowVisualization.value = null;
  // Don't clear selectedWorkflow when going to transitions page
  if (selectedWorkflow.value) {
    viewMode.value = 'transitions';
    loadWorkflowTransitions(selectedWorkflow.value.id);
    loadTaskStatuses(); // Load statuses to populate dropdowns
  }
}

function editWorkflowFromModal() {
  // Close current modal first, then open edit modal
  closeWorkflowView();
  if (selectedWorkflow.value) {
    editWorkflow(selectedWorkflow.value);
  }
}

// Transition actions
function createTransition() {
  transitionForm.value = {
    name: '',
    fromStatusId: '',
    toStatusId: '',
    conditionType: 'anyone',
    conditionData: null
  };
  showCreateTransition.value = true;
}

function editTransition(transition: WorkflowTransition) {
  transitionForm.value = {
    name: transition.name,
    fromStatusId: transition.fromStatus.id,
    toStatusId: transition.toStatus.id,
    conditionType: transition.conditionType,
    conditionData: transition.conditionData
  };
  selectedTransition.value = transition;
  showEditTransition.value = true;
}

async function saveTransition() {
  savingTransition.value = true;
  try {
    if (showEditTransition.value && selectedTransition.value) {
      await axiosInstance.put(`/workflows/transitions/${selectedTransition.value.id}`, transitionForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Transition updated successfully',
        life: 3000
      });
    } else {
      await axiosInstance.post(`/workflows/${selectedWorkflow.value!.id}/transitions`, transitionForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Transition created successfully',
        life: 3000
      });
    }

    await loadWorkflowTransitions(selectedWorkflow.value!.id);
    closeTransitionForm();
  } catch (error) {
    console.error('Error saving transition:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save transition',
      life: 3000
    });
  } finally {
    savingTransition.value = false;
  }
}

async function deleteTransition(transition: WorkflowTransition) {
  if (!confirm(`Are you sure you want to delete transition "${transition.name}"?`)) {
    return;
  }

  try {
    await axiosInstance.delete(`/workflows/transitions/${transition.id}`);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Transition deleted successfully',
      life: 3000
    });
    await loadWorkflowTransitions(selectedWorkflow.value!.id);
  } catch (error) {
    console.error('Error deleting transition:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete transition',
      life: 3000
    });
  }
}

// Modal close functions
function closeWorkflowModal() {
  showCreateWorkflow.value = false;
  showEditWorkflow.value = false;
  selectedWorkflow.value = null;
  workflowForm.value = {
    name: '',
    description: '',
    isDefault: false
  };
}

function closeWorkflowView() {
  showWorkflowView.value = false;
  selectedWorkflow.value = null;
  workflowVisualization.value = null;
}

function closeTransitionsModal() {
  showTransitionsModal.value = false;
  showCreateTransition.value = false;
  showEditTransition.value = false;
  selectedTransition.value = null;
  transitionForm.value = {
    name: '',
    fromStatusId: '',
    toStatusId: '',
    conditionType: 'anyone',
    conditionData: null
  };
}

function closeTransitionForm() {
  showCreateTransition.value = false;
  showEditTransition.value = false;
  selectedTransition.value = null;
  transitionForm.value = {
    name: '',
    fromStatusId: '',
    toStatusId: '',
    conditionType: 'anyone',
    conditionData: null
  };
}

// Status management methods
function openStatusManagement() {
  viewMode.value = 'status';
}

const getStatusesByCategory = (category: string) => {
  return taskStatuses.value.filter(status => status.type === category);
};

function editStatus(status: TaskStatus) {
  statusForm.value = {
    name: status.name,
    description: status.description || '',
    color: status.color,
    type: status.type,

    isDefault: status.isDefault,
    isStartStatus: status.isStartStatus,
    isEndStatus: status.isEndStatus,
    isResolved: status.isResolved,
    isClosed: status.isClosed
  };
  selectedStatus.value = status;
  showEditStatus.value = true;
}

async function saveStatus() {
  savingStatus.value = true;
  try {
    if (showEditStatus.value && selectedStatus.value) {
      await axiosInstance.put(`/task-statuses/${selectedStatus.value.id}`, statusForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Status updated successfully',
        life: 3000
      });
    } else {
      await axiosInstance.post(`/task-statuses/project/${props.projectId}`, statusForm.value);

    }

    await loadTaskStatuses();
    closeStatusForm();

    // Emit event to notify parent component
    if (showEditStatus.value && selectedStatus.value) {
      emit('statusUpdated');
    } else {
      emit('statusCreated');
    }
  } catch (error) {
    console.error('Error saving status:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save status',
      life: 3000
    });
  } finally {
    savingStatus.value = false;
  }
}

async function deleteStatus(status: TaskStatus) {
  console.log('🚀 deleteStatus called with:', status);
  statusToDelete.value = status;

  // Try to delete status directly first
  // If it fails with 400 error (has tasks), then show move tasks modal
  console.log('🗑️ Attempting to delete status directly first');
  deletingStatus.value = true;
  try {
    await axiosInstance.delete(`/task-statuses/${status.id}`);
    await loadTaskStatuses();
    emit('statusDeleted');
  } catch (error: any) {
    console.error('❌ Error deleting status:', error);

    // If 400 error, it means status has tasks, show move tasks modal
    if (error.response?.status === 400) {
      console.log('🔄 400 error detected, showing move tasks modal');
      showMoveTasksModal.value = true;
      selectedNewStatus.value = '';
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete status',
        life: 3000
      });
    }
  } finally {
    deletingStatus.value = false;
  }
}



function closeMoveTasksModal() {
  showMoveTasksModal.value = false;
  statusToDelete.value = null;
  selectedNewStatus.value = '';
}

async function confirmMoveAndDelete() {
  console.log('🚀 confirmMoveAndDelete called');
  console.log('📋 Status to delete:', statusToDelete.value);
  console.log('🎯 Selected new status:', selectedNewStatus.value);

  if (!statusToDelete.value || !selectedNewStatus.value) {
    console.log('❌ Missing required data');
    return;
  }

  movingTasks.value = true;
  try {
    console.log('📡 Using new server endpoint to move tasks and delete status...');

    // Use the new server endpoint to move tasks and delete status in one operation
    await axiosInstance.delete(`/task-statuses/${statusToDelete.value.id}/move-tasks`, {
      data: {
        newStatusId: selectedNewStatus.value
      }
    });

    console.log('✅ Tasks moved and status deleted successfully');
    toast.add({
      severity: 'success',
      summary: 'Status Deleted',
      detail: 'Tasks moved and status deleted successfully.',
      life: 3000
    });

    await loadTaskStatuses();
    closeMoveTasksModal();
    emit('statusDeleted');
  } catch (error: any) {
    console.error('❌ Error moving tasks and deleting status:', error);
    console.log('📊 Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to move tasks and delete status',
      life: 3000
    });
  } finally {
    movingTasks.value = false;
  }
}



async function createDefaultStatuses() {
  try {
    const defaultStatuses = [
      {
        name: 'To Do',
        description: 'Task is pending and not yet started',
        color: '#ef4444',
        type: StatusType.TODO,
        isDefault: true,
        isStartStatus: true,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
        isActive: true
      },
      {
        name: 'In Progress',
        description: 'Task is currently being worked on',
        color: '#f59e0b',
        type: StatusType.IN_PROGRESS,
        isDefault: true,
        isStartStatus: false,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
        isActive: true
      },
      {
        name: 'Review',
        description: 'Task is completed and waiting for review',
        color: '#3b82f6',
        type: StatusType.IN_PROGRESS,
        isDefault: true,
        isStartStatus: false,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
        isActive: true
      },
      {
        name: 'Done',
        description: 'Task is completed and approved',
        color: '#10b981',
        type: StatusType.DONE,
        isDefault: true,
        isStartStatus: false,
        isEndStatus: true,
        isResolved: true,
        isClosed: false,
        isActive: true
      },
      {
        name: 'Closed',
        description: 'Task is closed and archived',
        color: '#6b7280',
        type: StatusType.DONE,
        isDefault: true,
        isStartStatus: false,
        isEndStatus: true,
        isResolved: false,
        isClosed: true,
        isActive: true
      }
    ];

    // Check if default statuses already exist
    const existingStatuses = taskStatuses.value.filter(status => status.isDefault);
    if (existingStatuses.length > 0) {
      const confirmCreate = confirm('Default statuses already exist. Do you want to create them again? This may result in duplicates.');
      if (!confirmCreate) {
        return;
      }
    }

    // Create each default status
    for (const statusData of defaultStatuses) {
      try {
        await axiosInstance.post(`/task-statuses/project/${props.projectId}`, statusData);
      } catch (error) {
        console.error(`Error creating status ${statusData.name}:`, error);
      }
    }

    // Reload statuses
    await loadTaskStatuses();

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Default statuses created successfully',
      life: 3000
    });
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

function closeStatusForm() {
  showCreateStatus.value = false;
  showEditStatus.value = false;
  selectedStatus.value = null;
  statusForm.value = {
    name: '',
    description: '',
    color: '#42526E',
    type: StatusType.TODO,

    isDefault: false,
    isStartStatus: false,
    isEndStatus: false,
    isResolved: false,
    isClosed: false,
  };
}

// Lifecycle
onMounted(() => {
  loadWorkflows();
  loadTaskStatuses();
});

watch(() => props.projectId, () => {
  if (props.projectId) {
    loadWorkflows();
    loadTaskStatuses();
  }
});
</script>

<style scoped>
.workflow-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.workflow-header h2 {
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
}

.btn-icon:hover {
  background: #f8f9fa;
  color: #333;
}

.btn-icon.danger:hover {
  background: #f8d7da;
  color: #721c24;
}

/* Ensure close button shows X icon correctly */
.btn-icon .pi-times::before {
  content: "×";
  font-family: inherit;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

/* Fallback for close button */
.btn-icon[data-close="true"]::before {
  content: "×";
  font-family: inherit;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
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

/* Workflow Cards */
.workflow-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.workflow-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.workflow-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.workflow-card.default {
  border-color: #007bff;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
}

.workflow-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.workflow-info h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 18px;
}

.workflow-info p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
}

.workflow-badges {
  display: flex;
  gap: 8px;
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

.workflow-actions {
  display: flex;
  gap: 4px;
}

.workflow-stats {
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
  z-index: 20000;
}

.modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.workflow-view-modal {
  max-width: 900px;
}

.transitions-modal {
  max-width: 800px;
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
.workflow-form, .form {
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

/* Workflow Visualization */
.workflow-visualization {
  padding: 20px;
}

.workflow-diagram {
  position: relative;
  height: 200px;
  margin: 20px 0;
}

.status-nodes {
  position: relative;
  height: 100px;
}

.status-node {
  position: absolute;
  top: 20px;
  width: 120px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.node-content {
  padding: 8px;
}

.node-name {
  font-size: 14px;
  margin-bottom: 4px;
}

.node-type {
  font-size: 12px;
  opacity: 0.8;
}

.transitions-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.transition-label {
  font-size: 12px;
  fill: #666;
}

.workflow-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

/* Transitions Management */
.transitions-content {
  padding: 20px;
}

.transitions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.transitions-header h4 {
  margin: 0;
  color: #333;
}

.transitions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transition-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.transition-info {
  flex: 1;
}

.transition-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.transition-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.transition-conditions {
  margin-top: 8px;
}

.condition-badge {
  background: #e9ecef;
  color: #495057;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.transition-actions {
  display: flex;
  gap: 4px;
}

.transition-form {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.transition-form h4 {
  margin: 0 0 20px 0;
  color: #333;
}

/* Status Management */
.status-page {
  padding: 20px;
}

.status-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.status-page-header .header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.status-details {
  flex: 1;
}

.status-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.status-description {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.status-badges {
  display: flex;
  gap: 8px;
}

.badge.start {
  background: #28a745;
  color: white;
}

.badge.end {
  background: #007bff;
  color: white;
}

.badge.resolved {
  background: #28a745;
  color: white;
}

.badge.closed {
  background: #dc3545;
  color: white;
}

.status-actions {
  display: flex;
  gap: 4px;
}

.status-form {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.status-form h4 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
}

.form-checkboxes .checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.form-checkboxes .checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .workflow-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .workflow-cards {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal {
    width: 95%;
    margin: 20px;
  }
}

/* Delete Status Modal Styles - Updated to use modal-overlay */

.modal-content {
  pointer-events: auto;
  background: white;
  border-radius: 16px;
  width: 80%;
  max-width: 450px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  z-index: 200;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 16px 16px 0 0;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.warning-message {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #fef2f2;
  border-radius: 12px;
  border: 1px solid #fecaca;
}

.warning-icon {
  font-size: 3rem;
  color: #dc2626;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
  background: #fef2f2;
  border-radius: 50%;
  margin: 0 auto 1rem auto;
  border: 2px solid #fecaca;
}

.warning-message h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-size: 1.125rem;
  font-weight: 600;
}

.warning-message p {
  margin: 0;
  color: #7f1d1d;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 16px 16px;
  background: #f8fafc;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-danger:disabled {
  background: #fca5a5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
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

/* Move Tasks Modal Styles */
.move-tasks-content {
  text-align: center;
}

.move-description {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 14px;
}

.status-migration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.status-to-delete, .status-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.status-badge {
  background: #007bff;
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-weight: 500;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.move-arrow {
  font-size: 24px;
  color: #666;
}

.status-dropdown {
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  min-width: 150px;
  background: white;
}

.status-dropdown:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Toast Message z-index fix */
:deep(.p-toast) {
  z-index: 10001 !important;
}

:deep(.p-toast-message) {
  z-index: 10001 !important;
}

/* Global toast z-index fix */
.p-toast {
  z-index: 10001 !important;
}

.p-toast-message {
  z-index: 10001 !important;
}

/* Force toast above modal */
.p-toast,
.p-toast-message,
.p-toast-message-content {
  z-index: 10001 !important;
  position: relative !important;
}
</style>
