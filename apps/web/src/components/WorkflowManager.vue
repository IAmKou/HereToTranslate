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
      <!-- Default Workflow Info Banner -->
      <div v-if="defaultWorkflow" class="default-workflow-banner">
        <div class="banner-content">
          <i class="pi pi-star"></i>
          <div class="banner-text">
            <strong>Default Workflow Active:</strong> {{ defaultWorkflow.name }}
            <span class="banner-description">All tasks in this project will only be able to transition using this workflow's transitions.</span>
          </div>
        </div>
      </div>

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
                <span v-if="workflow.isDefault" class="badge active">Active</span>
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
    </div>

    <!-- Workflow Visualization View -->
    <div v-else-if="viewMode === 'visualization'" class="visualization-page">
      <div class="visualization-page-header">
        <button class="btn-secondary" @click="backToList">
          <i class="pi pi-arrow-left"></i>
          Back
        </button>
        <h3>Workflow Visualization - {{ selectedWorkflow?.name }}</h3>
        <div class="header-actions">
          <button class="btn-secondary" @click="manageTransitionsFromVisualization">
            <i class="pi pi-cog"></i>
            Manage Transitions
          </button>
          <button class="btn-primary" @click="editWorkflowFromVisualization">
            <i class="pi pi-pencil"></i>
            Edit Workflow
          </button>
        </div>
      </div>

      <div class="visualization-content">
        <div v-if="workflowVisualizationLoading" class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          Loading workflow visualization...
        </div>

        <div v-else-if="taskStatuses.length > 0" class="workflow-diagram">
          <!-- New Jira-style Workflow Visualization -->
          <div class="jira-workflow-diagram">
            <div class="workflow-canvas-container">
              <div v-if="workflowNodes.length === 0" class="loading-state">
                <i class="pi pi-spin pi-spinner"></i>
                Loading workflow visualization...
              </div>
              <WorkflowCanvasVueFlow
                v-else
                :nodes="workflowNodes"
                :edges="workflowEdges"
                :selected-node="selectedWorkflowNode"
                @node-select="selectWorkflowNode"
                @viewport-change="updateWorkflowViewport"
                @nodes-update="handleNodesUpdate"
              />
            </div>

            <!-- Transitions Panel -->
            <div class="transitions-panel">
              <h4>Workflow Transitions</h4>
              <div class="transitions-grid">
                <div
                  v-for="transition in workflowTransitions.filter(t => t && t.fromStatus && t.toStatus)"
                  :key="transition.id"
                  class="transition-card"
                >
                  <div class="transition-header">
                    <span class="from-status">{{ transition.fromStatus.name }}</span>
                    <span class="arrow">→</span>
                    <span class="to-status">{{ transition.toStatus.name }}</span>
                  </div>
                  <div class="transition-name">{{ transition.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>No statuses available</h3>
          <p>Create some task statuses to visualize the workflow</p>
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
            <h4>Closed</h4>
            <div class="status-list">
              <div
                v-for="status in getStatusesByCategory('closed')"
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
        <!-- Form content moved to modal below -->
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
              <label for="workflowName">Name <span class="required">*</span></label>
              <input
                id="workflowName"
                v-model="workflowForm.name"
                type="text"
                required
                placeholder="Enter workflow name"
                maxlength="50"
                @input="validateWorkflowForm"
              >
              <div v-if="workflowNameError" class="form-error">
                {{ workflowNameError }}
              </div>
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
              <div v-if="workflowForm.isDefault" class="default-workflow-info">
                <i class="pi pi-info-circle"></i>
                <span>When set as default, all tasks in this project will only be able to transition using this workflow's transitions.</span>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeWorkflowModal">
                Cancel
              </button>
              <button type="submit" class="btn-primary" :disabled="saving || !!workflowNameError || !workflowForm.name.trim()">
                <i v-if="saving" class="pi pi-spin pi-spinner"></i>
                {{ showEditWorkflow ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
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


        </div>
      </div>
    </Teleport>

    <!-- Create/Edit Status Modal -->
    <Teleport to="body">
      <div v-if="showCreateStatus || showEditStatus" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ showEditStatus ? 'Edit Status' : 'Create Status' }}</h3>
            <button class="btn-icon" @click="closeStatusForm" data-close="true">

            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="saveStatus" class="form">
              <div class="form-group">
                <label for="statusName">Name *</label>
                <input
                  id="statusName"
                  v-model="statusForm.name"
                  type="text"
                  required
                  placeholder="Enter status name"
                  maxlength="20"
                  @input="validateStatusForm"
                />
                <div v-if="nameError" class="form-error">{{ nameError }}</div>
                <div class="char-counter">{{ statusForm.name.length }}/20</div>
              </div>
              <div class="form-group">
                <label for="statusDescription">Description</label>
                <textarea
                  id="statusDescription"
                  v-model="statusForm.description"
                  placeholder="Enter status description"
                  rows="3"
                  maxlength="100"
                  @input="validateStatusForm"
                ></textarea>
                <div v-if="descriptionError" class="form-error">{{ descriptionError }}</div>
                <div class="char-counter">{{ statusForm.description.length }}/100</div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="statusColor">Color *</label>
                  <div class="color-input-wrapper">
                    <div class="color-preview" :style="{ backgroundColor: statusForm.color }" @click="($refs.colorInput as HTMLInputElement)?.click()"></div>
                    <input ref="colorInput" id="statusColor" v-model="statusForm.color" type="color" required class="hidden-color-input" />
                    <span class="color-value">{{ statusForm.color }}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label for="statusType">Type *</label>
                  <select id="statusType" v-model="statusForm.type" required>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>


              <p v-if="statusValidationMessage" class="form-error">{{ statusValidationMessage }}</p>
            </form>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeStatusForm">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="saveStatus"
              :disabled="savingStatus || !!statusValidationMessage || !!nameError || !!descriptionError || !statusForm.name.trim()"
            >
              <span v-if="savingStatus" class="loading-spinner"></span>
              {{ showEditStatus ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>



    <!-- Create/Edit Transition Modal -->
    <Teleport to="body">
      <div v-if="showCreateTransition || showEditTransition" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ showEditTransition ? 'Edit Transition' : 'Create Transition' }}</h3>
            <button class="btn-icon" @click="closeTransitionForm" data-close="true">
             
            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="saveTransition" class="form">
              <div class="form-group">
                <label for="transitionName">Name *</label>
                <input
                  id="transitionName"
                  v-model="transitionForm.name"
                  type="text"
                  required
                  placeholder="Enter transition name"
                  maxlength="50"
                  @input="validateTransitionForm"
                />
                <div v-if="transitionNameError" class="form-error">{{ transitionNameError }}</div>
                <div class="char-counter">{{ transitionForm.name.length }}/50</div>
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

            </form>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeTransitionForm">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="saveTransition"
              :disabled="savingTransition || !!transitionNameError || !transitionForm.name.trim()"
            >
              <span v-if="savingTransition" class="loading-spinner"></span>
              {{ showEditTransition ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import { Teleport } from 'vue';
import { StatusType, TaskStatus } from '../types/status';
import WorkflowCanvasVueFlow from './WorkflowCanvasVueFlow.vue';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
// Mermaid.js will be loaded dynamically
let mermaid: any = null;


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
const viewMode = ref<'list' | 'transitions' | 'status' | 'visualization'>('list');

// Modal states
const showCreateWorkflow = ref(false);
const showEditWorkflow = ref(false);

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

// Default statuses confirmation modal

const creatingDefaultStatuses = ref(false);

// Selected items
const selectedWorkflow = ref<Workflow | null>(null);
const selectedTransition = ref<WorkflowTransition | null>(null);
const selectedStatus = ref<TaskStatus | null>(null);
const workflowVisualization = ref<WorkflowVisualization | null>(null);
const workflowVisualizationLoading = ref(false);
const showTransitionLabels = ref(false);
const zoomLevel = ref(1);
const arrowsVisible = ref(true);

// Mermaid.js workflow diagram
const mermaidDiagramDefinition = ref('');
const mermaidKey = ref(0);

// New workflow visualization properties
const workflowNodes = ref<WorkflowNode[]>([]);
const workflowEdges = ref<WorkflowEdge[]>([]);
const selectedWorkflowNode = ref<WorkflowNode | null>(null);

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
  conditionData: null
});

const statusForm = ref({
  name: '',
  description: '',
  color: '#42526E',
  type: StatusType.TODO
});

// Validation for status form
const statusValidationMessage = computed(() => {
  return '';
});

// Character limit validation
const nameError = ref('');
const descriptionError = ref('');
const transitionNameError = ref('');
const workflowNameError = ref('');

function validateStatusForm() {
  // Reset errors
  nameError.value = '';
  descriptionError.value = '';

  // Validate name length
  if (statusForm.value.name.length > 20) {
    nameError.value = 'Name cannot exceed 20 characters';
  }

  // Validate duplicate name
  const currentName = statusForm.value.name.trim().toLowerCase();
  if (currentName) {
    const existingStatus = taskStatuses.value.find((status: TaskStatus) => {
      // Skip current status when editing
      if (showEditStatus.value && selectedStatus.value && status.id === selectedStatus.value.id) {
        return false;
      }
      return status.name.toLowerCase() === currentName;
    });

    if (existingStatus) {
      nameError.value = `Status name "${existingStatus.name}" already exists`;
    }
  }

  // Validate description length
  if (statusForm.value.description.length > 100) {
    descriptionError.value = 'Description cannot exceed 100 characters';
  }

  // Return true if no errors
  return !nameError.value && !descriptionError.value;
}

// Validation for transition form
function validateTransitionForm() {
  // Reset errors
  transitionNameError.value = '';

  // Validate name length
  if (transitionForm.value.name.length > 50) {
    transitionNameError.value = 'Name cannot exceed 50 characters';
    return false;
  }

  // Validate duplicate name
  const currentName = transitionForm.value.name.trim().toLowerCase();
  if (currentName) {
    const existingTransition = workflowTransitions.value.find((transition: WorkflowTransition) => {
      // Skip current transition when editing
      if (showEditTransition.value && selectedTransition.value && transition.id === selectedTransition.value.id) {
        return false;
      }
      return transition.name.toLowerCase() === currentName;
    });

    if (existingTransition) {
      transitionNameError.value = `A transition with this name already exists`;
      return false;
    }
  }

  // Return true if no errors
  return !transitionNameError.value;
}

// Validation for workflow form
function validateWorkflowForm() {
  // Reset errors
  workflowNameError.value = '';

  // Validate name length
  if (workflowForm.value.name.length > 50) {
    workflowNameError.value = 'Name cannot exceed 50 characters';
    return false;
  }

  // Validate duplicate name
  const currentName = workflowForm.value.name.trim().toLowerCase();
  if (currentName) {
    const existingWorkflow = workflows.value.find((workflow: Workflow) => {
      // Skip current workflow when editing
      if (showEditWorkflow.value && selectedWorkflow.value && workflow.id === selectedWorkflow.value.id) {
        return false;
      }
      return workflow.name.toLowerCase() === currentName;
    });

    if (existingWorkflow) {
      workflowNameError.value = 'A workflow with this name already exists';
      return false;
    }
  }

  return true;
}

// Computed
const availableStatuses = computed(() =>
  taskStatuses.value.filter(status => status.isActive)
);

const defaultWorkflow = computed(() =>
  workflows.value.find(workflow => workflow.isDefault)
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
    console.log('Loaded task statuses:', data); // Debug log
  } catch (error) {
    console.error('Error loading task statuses:', error);
  }
}

async function loadWorkflowTransitions(workflowId: string) {
  try {
    const { data } = await axiosInstance.get(`/workflows/${workflowId}/transitions`);
    workflowTransitions.value = data;
    console.log('Loaded transitions:', data); // Debug log
    // Also refresh count for the card
    transitionsCountByWorkflow.value = {
      ...transitionsCountByWorkflow.value,
      [workflowId]: Array.isArray(data) ? data.length : 0,
    };

    // Force render Mermaid diagram after transitions load
    if (taskStatuses.value.length > 0) {
      await regenerateMermaidDiagram();
    }
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





// Workflow actions
function createWorkflow() {
  workflowForm.value = {
    name: '',
    description: '',
    isDefault: false
  };
  // Reset validation errors
  workflowNameError.value = '';
  showCreateWorkflow.value = true;
}

function editWorkflow(workflow: Workflow) {
  workflowForm.value = {
    name: workflow.name,
    description: workflow.description || '',
    isDefault: workflow.isDefault
  };
  selectedWorkflow.value = workflow;
  // Reset validation errors
  workflowNameError.value = '';
  showEditWorkflow.value = true;
}

async function saveWorkflow() {
  // Validate form before saving
  if (!validateWorkflowForm()) {
    return;
  }

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

async function viewWorkflow(workflow: Workflow) {
  console.log('Viewing workflow:', workflow);
  selectedWorkflow.value = workflow;
  viewMode.value = 'visualization';

  try {
    // Load data in parallel for better performance
    console.log('Loading data for workflow:', workflow.id);

    const [visualizationResult, transitionsResult, statusesResult] = await Promise.allSettled([
      loadWorkflowVisualization(workflow.id),
      loadWorkflowTransitions(workflow.id),
      loadTaskStatuses()
    ]);

    console.log('Data loading results:', {
      visualization: visualizationResult.status,
      transitions: transitionsResult.status,
      statuses: statusesResult.status
    });

    // Generate workflow nodes and edges for visualization after data is loaded
    await generateWorkflowVisualization(workflow.id);
  } catch (error) {
    console.error('Error in viewWorkflow:', error);
    // Still try to generate visualization with whatever data we have
    await generateWorkflowVisualization(workflow.id);
  }
}

// New workflow visualization methods
async function generateWorkflowVisualization(workflowId: string) {
  console.log('Generating workflow visualization for:', workflowId);
  console.log('Task statuses:', taskStatuses.value);
  console.log('Workflow transitions:', workflowTransitions.value);

  // Try to load saved visualization data first
  let savedVisualizationData = null;
  try {
    const response = await axiosInstance.get(`/workflows/${workflowId}/visualization`);
    savedVisualizationData = response.data.workflow?.visualizationData;
    console.log('Loaded saved visualization data:', savedVisualizationData);
  } catch (error) {
    console.log('No saved visualization data found, using default positions');
  }

  // Convert task statuses to workflow nodes
  console.log('Task statuses for nodes:', taskStatuses.value);
  if (taskStatuses.value.length > 0) {
    console.log('Creating nodes from real task statuses');

    // Always start with a START node (black, fixed)
    const startNode: WorkflowNode = {
      id: 'start',
      type: 'start',
      position: savedVisualizationData?.nodes?.find((n: any) => n.id === 'start')?.position || { x: 100, y: 200 },
      data: {
        label: 'START',
        status: null,
        category: 'start'
      },
      style: {
        width: 80,
        height: 80,
        borderRadius: 40,
        fillColor: '#000000',
        strokeColor: '#000000',
        strokeWidth: 2
      }
    };

    // Create status nodes with user-defined colors
    const otherNodes: WorkflowNode[] = taskStatuses.value.map((status, index) => {
      console.log('Processing status:', status);
      const savedNode = savedVisualizationData?.nodes?.find((n: any) => n.id === status.id);
      return {
        id: status.id,
        type: 'status',
        position: savedNode?.position || { x: 250 + index * 180, y: 200 },
        data: {
          label: status.name,
          status: status,
          category: status.type
        },
        style: {
          width: 140,
          height: 60,
          borderRadius: 8,
          fillColor: status.color || '#42526E',
          strokeColor: '#dfe1e6',
          strokeWidth: 1
        }
      };
    });

    // Combine START node with other nodes
    workflowNodes.value = [startNode, ...otherNodes];
  } else {
    console.log('No task statuses found, creating empty nodes array');
    workflowNodes.value = [];
  }

  // Convert transitions to workflow edges
  console.log('Workflow transitions for edges:', workflowTransitions.value);
  console.log('Looking for workflow ID:', workflowId);

  if (workflowTransitions.value.length > 0) {
    console.log('Creating edges from real transitions');
    const filteredTransitions = workflowTransitions.value.filter(t => {
      console.log('Checking transition:', t);
      console.log('t.workflow:', t.workflow);
      console.log('t.workflow.id:', t.workflow?.id);
      console.log('workflowId:', workflowId);
      console.log('t.fromStatus:', t.fromStatus);
      console.log('t.toStatus:', t.toStatus);
      // Since workflow property is undefined, just check if fromStatus and toStatus exist
      return t.fromStatus && t.toStatus;
    });

    console.log('Filtered transitions:', filteredTransitions);

    const transitionEdges: WorkflowEdge[] = filteredTransitions.map((transition, index) => ({
      id: `edge-${transition.id}-${index}`, // Unique ID for each edge
      source: transition.fromStatus.id,
      target: transition.toStatus.id,
      label: transition.name || 'Any', // Use transition name if available
      type: 'default',
      style: {
        strokeColor: '#6b778c',
        strokeWidth: 2
      }
    }));

    // Add START edge to first status if we have task statuses
    if (taskStatuses.value.length > 0) {
      const firstStatus = taskStatuses.value[0];
      const startEdge: WorkflowEdge = {
        id: 'start-to-first',
        source: 'start',
        target: firstStatus.id,
        label: 'Start',
        type: 'default',
        style: {
          strokeColor: '#6b778c',
          strokeWidth: 2
        }
      };
      workflowEdges.value = [startEdge, ...transitionEdges];
    } else {
      workflowEdges.value = transitionEdges;
    }
  } else {
    console.log('No transitions found, creating empty edges array');
    workflowEdges.value = [];
  }

  console.log('Generated nodes:', workflowNodes.value);
  console.log('Generated edges:', workflowEdges.value);
}

function selectWorkflowNode(node: WorkflowNode | null) {
  selectedWorkflowNode.value = node;
}

function updateWorkflowViewport(viewport: any) {
  // Handle viewport changes if needed
  console.log('Viewport updated:', viewport);
}

async function handleNodesUpdate(updatedNodes: WorkflowNode[]) {
  workflowNodes.value = updatedNodes;

  // Save visualization data to database
  if (selectedWorkflow.value) {
    try {
      const visualizationData = {
        nodes: updatedNodes.map(node => ({
          id: node.id,
          position: node.position,
          type: node.type,
          data: node.data
        })),
        edges: workflowEdges.value,
        lastUpdated: new Date().toISOString()
      };

      await axiosInstance.put(`/workflows/${selectedWorkflow.value.id}/visualization`, visualizationData);
      console.log('Visualization data saved successfully');
    } catch (error) {
      console.error('Failed to save visualization data:', error);
    }
  }
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
  // Clear visualization data when going back to list
  workflowVisualization.value = null;
}

function manageTransitions() {
  // Keep compatibility for existing buttons (e.g., from visualization modal)
  if (selectedWorkflow.value) {
    viewMode.value = 'transitions';
    loadWorkflowTransitions(selectedWorkflow.value.id);
  }
}



function manageTransitionsFromVisualization() {
  // Switch to transitions page from visualization page
  if (selectedWorkflow.value) {
    viewMode.value = 'transitions';
    loadWorkflowTransitions(selectedWorkflow.value.id);
    loadTaskStatuses(); // Load statuses to populate dropdowns
  }
}

function editWorkflowFromVisualization() {
  // Open edit modal from visualization page
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
    conditionData: null
  };
  // Reset validation errors
  transitionNameError.value = '';
  showCreateTransition.value = true;
}

function editTransition(transition: WorkflowTransition) {
  transitionForm.value = {
    name: transition.name,
    fromStatusId: transition.fromStatus.id,
    toStatusId: transition.toStatus.id,
    conditionData: transition.conditionData
  };
  selectedTransition.value = transition;
  // Reset validation errors
  transitionNameError.value = '';
  showEditTransition.value = true;
}

async function saveTransition() {
  // Validate form before saving
  if (!validateTransitionForm()) {
    return;
  }

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
  // Reset validation errors
  workflowNameError.value = '';
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
    conditionData: null
  };
  // Reset validation errors
  transitionNameError.value = '';
}

function closeTransitionForm() {
  showCreateTransition.value = false;
  showEditTransition.value = false;
  selectedTransition.value = null;
  transitionForm.value = {
    name: '',
    fromStatusId: '',
    toStatusId: '',
    conditionData: null
  };
  // Reset validation errors
  transitionNameError.value = '';
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
    type: status.type
  };
  selectedStatus.value = status;
  showEditStatus.value = true;
}

async function saveStatus() {
  // Validate form before saving
  if (!validateStatusForm()) {
    return;
  }

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
  // Check if basic statuses already exist
  const hasToDoStatus = taskStatuses.value.some((status: TaskStatus) => status.type === StatusType.TODO);
  const hasInProgressStatus = taskStatuses.value.some((status: TaskStatus) => status.type === StatusType.IN_PROGRESS);
  const hasDoneStatus = taskStatuses.value.some((status: TaskStatus) => status.type === StatusType.DONE);
  const hasClosedStatus = taskStatuses.value.some((status: TaskStatus) => status.type === StatusType.CLOSED);

  if (hasToDoStatus && hasInProgressStatus && hasDoneStatus && hasClosedStatus) {
    // Show error message if basic statuses already exist
    toast.add({
      severity: 'error',
      summary: 'Cannot Create',
      detail: 'Basic statuses already exist. Cannot create duplicates.',
      life: 5000
    });
    return;
  }

  // If no existing basic statuses, create them directly
  await confirmCreateDefaultStatuses();
}

async function confirmCreateDefaultStatuses() {
  creatingDefaultStatuses.value = true;
  try {
    const defaultStatuses = [
      {
        name: 'To Do',
        description: 'Task is pending and not yet started',
        color: '#ef4444',
        type: StatusType.TODO,
        isActive: true
      },
      {
        name: 'In Progress',
        description: 'Task is currently being worked on',
        color: '#f59e0b',
        type: StatusType.IN_PROGRESS,
        isActive: true
      },
      {
        name: 'Review',
        description: 'Task is completed and waiting for review',
        color: '#3b82f6',
        type: StatusType.IN_PROGRESS,
        isActive: true
      },
      {
        name: 'Done',
        description: 'Task is completed and approved',
        color: '#10b981',
        type: StatusType.DONE,
        isActive: true
      },
      {
        name: 'Closed',
        description: 'Task is closed and archived',
        color: '#6b7280',
        type: StatusType.CLOSED,
        isActive: true
      }
    ];

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

    // Close modal
    closeDefaultStatusesModal();
  } catch (error) {
    console.error('Error creating default statuses:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create default statuses',
      life: 3000
    });
  } finally {
    creatingDefaultStatuses.value = false;
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
    type: StatusType.TODO
  };
}

// Professional Jira-style workflow diagram functions
function getNodePositionX(index: number): number {
  // Horizontal layout: nodes spaced evenly across the width
  const nodeWidth = 120;
  const spacing = 200;
  const startX = 100;
  return startX + (index * spacing);
}

function getNodePositionY(index: number): number {
  // All nodes on the same horizontal line
  return 150;
}

function getNodeCenterX(nodeId: string): number {
  // Calculate center X based on fixed positioning
  const activeStatuses = taskStatuses.value.filter(s => s.isActive);
  const nodeIndex = activeStatuses.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) return 0;

  const nodeWidth = 120;
  const spacing = 200;
  const startX = 100;
  const nodeX = startX + (nodeIndex * spacing);
  return nodeX + (nodeWidth / 2);
}

function getNodeCenterY(nodeId: string): number {
  // All nodes are centered at the same Y position
  const nodeHeight = 60;
  const nodeY = 70;
  return nodeY + (nodeHeight / 2);
}

function getLabelX(fromId: string, toId: string): number {
  const fromX = getNodeCenterX(fromId);
  const toX = getNodeCenterX(toId);
  return (fromX + toX) / 2;
}

function getLabelY(fromId: string, toId: string): number {
  const fromY = getNodeCenterY(fromId);
  const toY = getNodeCenterY(toId);
  // Position label slightly above the line
  return (fromY + toY) / 2 - 20;
}

// Mermaid.js workflow diagram functions
function generateMermaidDiagram(): string {
  if (!taskStatuses.value.length || !workflowTransitions.value.length) {
    return '';
  }

  const activeStatuses = taskStatuses.value.filter(s => s.isActive);
  const activeTransitions = workflowTransitions.value.filter(t => t && t.fromStatus && t.toStatus);

  if (activeStatuses.length === 0 || activeTransitions.length === 0) {
    return '';
  }

  // Create Mermaid flowchart definition
  let mermaidCode = 'graph LR\n';

  // Add nodes
  activeStatuses.forEach((status, index) => {
    const nodeId = `node${index}`;
    const nodeName = status.name.replace(/[^a-zA-Z0-9]/g, '_');
    mermaidCode += `    ${nodeId}[${status.name}]\n`;
  });

  // Add edges with labels if enabled
  activeTransitions.forEach(transition => {
    const fromIndex = activeStatuses.findIndex(s => s.id === transition.fromStatus.id);
    const toIndex = activeStatuses.findIndex(s => s.id === transition.toStatus.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      const fromNode = `node${fromIndex}`;
      const toNode = `node${toIndex}`;

      if (showTransitionLabels.value) {
        mermaidCode += `    ${fromNode} -->|${transition.name}| ${toNode}\n`;
      } else {
        mermaidCode += `    ${fromNode} --> ${toNode}\n`;
      }
    }
  });

  return mermaidCode;
}

async function regenerateMermaidDiagram() {
  mermaidKey.value++;
  await nextTick();

  const mermaidCode = generateMermaidDiagram();
  if (mermaidCode) {
    mermaidDiagramDefinition.value = mermaidCode;

    // Wait for DOM to update, then render Mermaid diagram
    await nextTick();
    try {
      // Ensure Mermaid.js is loaded
      if (!mermaid) {
        await loadMermaid();
      }

      if (mermaid) {
        // Clear existing diagrams first
        const existingDiagrams = document.querySelectorAll('.mermaid svg');
        existingDiagrams.forEach(svg => svg.remove());

        // Initialize new diagram
        mermaid.init('.mermaid');
      }
    } catch (error) {
      console.error('Failed to render Mermaid diagram:', error);
    }
  }
}

// Zoom functions
function zoomIn() {
  if (zoomLevel.value < 2) {
    zoomLevel.value += 0.1
  }
}

function zoomOut() {
  if (zoomLevel.value > 0.3) {
    zoomLevel.value -= 0.1
  }
}

function resetZoom() {
  zoomLevel.value = 1
}

// Initialize Mermaid diagram when data loads
watch([() => taskStatuses.value, () => workflowTransitions.value], async () => {
  if (taskStatuses.value.length > 0 && workflowTransitions.value.length > 0) {
    await regenerateMermaidDiagram();
  }
}, { immediate: true })

// Calculate CSS positioning for connections
function getConnectionStyle(fromId: string, toId: string) {
  const fromNode = document.getElementById(`workflow-node-${fromId}`)
  const toNode = document.getElementById(`workflow-node-${toId}`)

  if (!fromNode || !toNode) return {}

  const fromRect = fromNode.getBoundingClientRect()
  const toRect = toNode.getBoundingClientRect()
  const container = document.querySelector('.workflow-diagram-container')

  if (!container) return {}

  const containerRect = container.getBoundingClientRect()

  const fromX = fromRect.left - containerRect.left + fromRect.width / 2
  const fromY = fromRect.top - containerRect.top + fromRect.height / 2
  const toX = toRect.left - containerRect.left + toRect.width / 2
  const toY = toRect.top - containerRect.top + toRect.height / 2

  const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2))
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI

  return {
    left: `${fromX}px`,
    top: `${fromY}px`,
    width: `${length}px`,
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 50%'
  }
}

// Function to load Mermaid.js dynamically
async function loadMermaid() {
  if (typeof mermaid !== 'undefined') return mermaid;

  try {
    // Load Mermaid.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
    script.async = true;

    return new Promise((resolve, reject) => {
      script.onload = () => {
        mermaid = (window as any).mermaid;
        if (mermaid) {
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            }
          });
          resolve(mermaid);
        } else {
          reject(new Error('Mermaid.js failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Mermaid.js'));
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Error loading Mermaid.js:', error);
    return null;
  }
}

// Lifecycle
onMounted(async () => {
  // Load Mermaid.js first
  await loadMermaid();

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

/* Form Error Message */
.form-error {
  color: #dc2626;
  font-size: 0.74375rem;
  margin: 8.5px 0;
  padding: 6.8px 10.2px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 5.1px;
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
  width: 90vw;
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
  padding: 17px;
}

.form-group {
  margin-bottom: 17px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 17px;
}

.form-group label {
  display: block;
  margin-bottom: 5.1px;
  color: #333;
  font-weight: 500;
  font-size: 0.8rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8.5px;
  border: 1px solid #ddd;
  border-radius: 3.4px;
  font-size: 15px;
}

.form-group textarea {
  resize: vertical;
  min-height: 68px;
}

.char-counter {
  font-size: 0.6375rem;
  color: #666;
  text-align: right;
  margin-top: 3.4px;
  font-style: italic;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6.8px;
  cursor: pointer;
  font-size: 0.7225rem;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  transform: scale(0.85);
}

.form-actions {
  display: flex;
  gap: 10.2px;
  justify-content: flex-end;
  margin-top: 20.4px;
}

/* Workflow Visualization */
.workflow-visualization {
  padding: 20px;
  overflow-x: auto;
  max-width: 100%;
  min-height: 600px;
}

.workflow-diagram {
  position: relative;
  min-height: 600px;
  margin: 20px 0;
  width: 100%;
  overflow: visible;
  background: transparent;
  border-radius: 12px;
  padding: 20px;
  border: none;
}

.jira-workflow-diagram {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.workflow-controls {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-item input[type="checkbox"] {
  margin: 0;
}

.control-item label {
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
}

.zoom-btn:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.zoom-btn i {
  font-size: 12px;
  color: #666;
}

.zoom-level {
  font-size: 12px;
  color: #666;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.workflow-diagram-container {
  position: relative;
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  min-height: 400px;
  overflow: auto;
}

.mermaid-diagram {
  width: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.mermaid {
  width: 100%;
  text-align: center;
}

.loading-mermaid {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-size: 14px;
}

.diagram-controls {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.workflow-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.workflow-connections {
  pointer-events: none;
}

.connection-line {
  stroke-dasharray: none;
  transition: stroke 0.2s ease;
}

.connection-line:hover {
  stroke: #007bff;
  stroke-width: 3;
}

.transition-label {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.workflow-nodes {
  position: relative;
  z-index: 2;
  transform-origin: center center;
  transition: transform 0.2s ease;
}

.workflow-node {
  min-width: 80px;
  max-width: 100px;
  padding: 12px 16px;
  border-radius: 6px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  color: white;
  font-weight: 600;
}

.workflow-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.node-label {
  font-size: 14px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}



.transition-label {
  font-size: 11px;
  font-weight: 600;
  fill: #333;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
}

.transitions-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  margin-top: 20px;
}

.transitions-panel h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.transitions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.transition-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.transition-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.transition-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.from-status, .to-status {
  background: #007bff;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.arrow {
  font-size: 16px;
  color: #666;
  font-weight: bold;
}

.transition-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}



.workflow-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
  padding: 20px 0;
  border-top: 1px solid #e0e0e0;
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

/* Workflow Visualization Page */
.visualization-page {
  padding: 20px;
}

.visualization-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.visualization-page-header h3 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.visualization-content {
  min-height: 500px;
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
  gap: 12.75px;
  margin-top: 12.75px;
}

.form-checkboxes .checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 6.8px;
  font-size: 0.7225rem;
}

.form-checkboxes .checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  transform: scale(0.85);
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

/* View Toggle Styles */
.view-toggle-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  gap: 4px;
  background: #f4f5f7;
  border-radius: 6px;
  padding: 4px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #6b778c;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  color: #172b4d;
}

.toggle-btn.active {
  background: white;
  color: #172b4d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.visual-editor {
  height: 100vh;
  width: 100%;
}

/* Delete Status Modal Styles - Updated to use modal-overlay */

.modal-content {
  pointer-events: auto;
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  z-index: 200;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 0, 0, 0.1);
  transform: scale(0.85);
  transform-origin: center center;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 16px 16px 0 0;
  background: #f8fafc;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.0rem;
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
  padding: 0.85rem;
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
  gap: 0.6375rem;
  padding: 0.85rem;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 16px 16px;
  background: #f8fafc;
}

.btn {
  padding: 0.51rem 1.02rem;
  border-radius: 5.1px;
  font-weight: 500;
  font-size: 0.68rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.34rem;
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

/* Workflow Canvas Container Styles */
.workflow-canvas-container {
  width: 100%;
  height: 600px;
  border: none;
  border-radius: 8px;
  background: transparent;
  overflow: visible;
  position: relative;
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

/* Color Input Styles */
.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f8f9fa;
  position: relative;
}

.color-preview {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  border: 3px solid #fff;
  box-shadow: 0 3px 8px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.color-preview:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.color-preview::after {
  content: "🎨";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.2s;
}

.color-preview:hover::after {
  opacity: 1;
}

.hidden-color-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.color-value {
  font-family: monospace;
  font-size: 14px;
  color: #666;
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  min-width: 80px;
  text-align: center;
}





.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.required {
  color: #dc2626;
  font-weight: bold;
}

.default-workflow-info {
  margin-top: 8px;
  padding: 8px 12px;
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #1976d2;
}

.default-workflow-info i {
  margin-top: 1px;
  font-size: 14px;
}

.default-workflow-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-content i {
  font-size: 20px;
  color: #ffd700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.banner-text {
  color: white;
  flex: 1;
}

.banner-text strong {
  font-size: 16px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.banner-description {
  font-size: 13px;
  opacity: 0.9;
  display: block;
}
</style>
