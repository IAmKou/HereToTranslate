<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { workflowService, type WorkflowVisualization } from '../services/workflow.service';
import type { 
  Workflow, 
  WorkflowTransition, 
  TaskStatus, 
  CreateWorkflowDto, 
  UpdateWorkflowDto,
  CreateStatusDto,
  UpdateStatusDto,
  CreateTransitionDto,
  UpdateTransitionDto
} from '../services/task.service';
import { useToast } from 'primevue/usetoast';

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['close', 'workflowCreated', 'workflowUpdated']);

// Reactive state
const loading = ref(false);
const error = ref('');
const workflows = ref<Workflow[]>([]);
const statuses = ref<TaskStatus[]>([]);
const selectedWorkflow = ref<Workflow | null>(null);
const transitions = ref<WorkflowTransition[]>([]);
const visualization = ref<WorkflowVisualization | null>(null);

// UI state
const activeTab = ref<'workflows' | 'statuses' | 'visualization'>('workflows');
const showCreateWorkflow = ref(false);
const showEditWorkflow = ref(false);
const showCreateStatus = ref(false);
const showEditStatus = ref(false);
const showCreateTransition = ref(false);
const showEditTransition = ref(false);

// Form state
const workflowForm = ref<CreateWorkflowDto & { id?: string }>({
  name: '',
  description: '',
  isDefault: false
});

const statusForm = ref<CreateStatusDto & { id?: string }>({
  name: '',
  description: '',
  color: '#42526E',
  type: 'todo',
  position: 0,
  isDefault: false
});

const transitionForm = ref<CreateTransitionDto & { id?: string }>({
  name: '',
  fromStatusId: '',
  toStatusId: '',
  conditionType: 'anyone'
});

// Validation state
const workflowErrors = ref<Record<string, string>>({});
const statusErrors = ref<Record<string, string>>({});
const transitionErrors = ref<Record<string, string>>({});

// Utilities
const toast = useToast();

// Computed properties
const sortedWorkflows = computed(() => {
  return [...workflows.value].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
});

const sortedStatuses = computed(() => {
  return [...statuses.value].sort((a, b) => a.position - b.position);
});

const availableFromStatuses = computed(() => {
  return statuses.value.filter(status => status.isActive);
});

const availableToStatuses = computed(() => {
  if (!transitionForm.value.fromStatusId) return [];
  return statuses.value.filter(status => 
    status.isActive && status.id !== transitionForm.value.fromStatusId
  );
});

const statusTypeOptions = [
  { value: 'todo', label: 'To Do', color: '#42526E' },
  { value: 'in_progress', label: 'In Progress', color: '#0052CC' },
  { value: 'done', label: 'Done', color: '#00875A' }
];

const conditionTypeOptions = [
  { value: 'anyone', label: 'Anyone can transition' },
  { value: 'assignee_only', label: 'Only assignee can transition' },
  { value: 'role_based', label: 'Role-based transition' },
  { value: 'custom', label: 'Custom conditions' }
];

// Methods
async function loadData() {
  loading.value = true;
  error.value = '';
  
  try {
    const [workflowsData, statusesData] = await Promise.all([
      workflowService.getProjectWorkflows(props.projectId),
      workflowService.getProjectStatuses(props.projectId)
    ]);
    
    workflows.value = workflowsData;
    statuses.value = statusesData;
    
    // Select default workflow if available
    if (workflows.value.length > 0 && !selectedWorkflow.value) {
      selectedWorkflow.value = workflows.value.find(w => w.isDefault) || workflows.value[0];
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load workflow data';
    console.error('Error loading workflow data:', err);
  } finally {
    loading.value = false;
  }
}

async function loadTransitions() {
  if (!selectedWorkflow.value) return;
  
  try {
    transitions.value = await workflowService.getWorkflowTransitions(selectedWorkflow.value.id);
  } catch (err: any) {
    console.error('Error loading transitions:', err);
    transitions.value = [];
  }
}

async function loadVisualization() {
  if (!selectedWorkflow.value) return;
  
  try {
    visualization.value = await workflowService.getWorkflowVisualization(selectedWorkflow.value.id);
  } catch (err: any) {
    console.error('Error loading visualization:', err);
    visualization.value = null;
  }
}

// Workflow management
function openCreateWorkflow() {
  workflowForm.value = {
    name: '',
    description: '',
    isDefault: workflows.value.length === 0
  };
  workflowErrors.value = {};
  showCreateWorkflow.value = true;
}

function openEditWorkflow(workflow: Workflow) {
  workflowForm.value = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || '',
    isDefault: workflow.isDefault
  };
  workflowErrors.value = {};
  showEditWorkflow.value = true;
}

function validateWorkflowForm(): boolean {
  workflowErrors.value = {};
  
  const nameError = workflowService.validateWorkflowName(workflowForm.value.name);
  if (nameError) {
    workflowErrors.value.name = nameError;
  }
  
  return Object.keys(workflowErrors.value).length === 0;
}

async function saveWorkflow() {
  if (!validateWorkflowForm()) return;
  
  loading.value = true;
  try {
    if (workflowForm.value.id) {
      // Update existing workflow
      const updated = await workflowService.updateWorkflow(workflowForm.value.id, {
        name: workflowForm.value.name,
        description: workflowForm.value.description,
        isDefault: workflowForm.value.isDefault
      });
      
      const index = workflows.value.findIndex(w => w.id === updated.id);
      if (index !== -1) {
        workflows.value[index] = updated;
      }
      
      if (selectedWorkflow.value?.id === updated.id) {
        selectedWorkflow.value = updated;
      }
      
      emit('workflowUpdated', updated);
      toast.add({
        severity: 'success',
        summary: 'Workflow Updated',
        detail: 'Workflow has been updated successfully',
        life: 3000
      });
    } else {
      // Create new workflow
      const created = await workflowService.createWorkflow(props.projectId, {
        name: workflowForm.value.name,
        description: workflowForm.value.description,
        isDefault: workflowForm.value.isDefault
      });
      
      workflows.value.push(created);
      selectedWorkflow.value = created;
      
      emit('workflowCreated', created);
      toast.add({
        severity: 'success',
        summary: 'Workflow Created',
        detail: 'Workflow has been created successfully',
        life: 3000
      });
    }
    
    showCreateWorkflow.value = false;
    showEditWorkflow.value = false;
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: err.message || 'Failed to save workflow',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

async function deleteWorkflow(workflow: Workflow) {
  if (!confirm(`Are you sure you want to delete the workflow "${workflow.name}"?`)) {
    return;
  }
  
  loading.value = true;
  try {
    await workflowService.deleteWorkflow(workflow.id);
    workflows.value = workflows.value.filter(w => w.id !== workflow.id);
    
    if (selectedWorkflow.value?.id === workflow.id) {
      selectedWorkflow.value = workflows.value[0] || null;
    }
    
    toast.add({
      severity: 'success',
      summary: 'Workflow Deleted',
      detail: 'Workflow has been deleted successfully',
      life: 3000
    });
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: err.message || 'Failed to delete workflow',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

// Status management
function openCreateStatus() {
  statusForm.value = {
    name: '',
    description: '',
    color: '#42526E',
    type: 'todo',
    position: statuses.value.length,
    isDefault: statuses.value.length === 0
  };
  statusErrors.value = {};
  showCreateStatus.value = true;
}

function openEditStatus(status: TaskStatus) {
  statusForm.value = {
    id: status.id,
    name: status.name,
    description: status.description || '',
    color: status.color,
    type: status.type,
    position: status.position,
    isDefault: status.isDefault
  };
  statusErrors.value = {};
  showEditStatus.value = true;
}

function validateStatusForm(): boolean {
  statusErrors.value = {};
  
  const nameError = workflowService.validateStatusName(statusForm.value.name);
  if (nameError) {
    statusErrors.value.name = nameError;
  }
  
  return Object.keys(statusErrors.value).length === 0;
}

async function saveStatus() {
  if (!validateStatusForm()) return;
  
  loading.value = true;
  try {
    if (statusForm.value.id) {
      // Update existing status
      const updated = await workflowService.updateStatus(statusForm.value.id, {
        name: statusForm.value.name,
        description: statusForm.value.description,
        color: statusForm.value.color,
        type: statusForm.value.type,
        isDefault: statusForm.value.isDefault
      });
      
      const index = statuses.value.findIndex(s => s.id === updated.id);
      if (index !== -1) {
        statuses.value[index] = updated;
      }
      
      toast.add({
        severity: 'success',
        summary: 'Status Updated',
        detail: 'Status has been updated successfully',
        life: 3000
      });
    } else {
      // Create new status
      const created = await workflowService.createStatus(props.projectId, {
        name: statusForm.value.name,
        description: statusForm.value.description,
        color: statusForm.value.color,
        type: statusForm.value.type,
        position: statusForm.value.position,
        isDefault: statusForm.value.isDefault
      });
      
      statuses.value.push(created);
      
      toast.add({
        severity: 'success',
        summary: 'Status Created',
        detail: 'Status has been created successfully',
        life: 3000
      });
    }
    
    showCreateStatus.value = false;
    showEditStatus.value = false;
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: err.message || 'Failed to save status',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

async function deleteStatus(status: TaskStatus) {
  if (!confirm(`Are you sure you want to delete the status "${status.name}"?`)) {
    return;
  }
  
  loading.value = true;
  try {
    await workflowService.deleteStatus(status.id);
    statuses.value = statuses.value.filter(s => s.id !== status.id);
    
    toast.add({
      severity: 'success',
      summary: 'Status Deleted',
      detail: 'Status has been deleted successfully',
      life: 3000
    });
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: err.message || 'Failed to delete status',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

// Transition management
function openCreateTransition() {
  transitionForm.value = {
    name: '',
    fromStatusId: '',
    toStatusId: '',
    conditionType: 'anyone'
  };
  transitionErrors.value = {};
  showCreateTransition.value = true;
}

function openEditTransition(transition: WorkflowTransition) {
  transitionForm.value = {
    id: transition.id,
    name: transition.name,
    fromStatusId: transition.fromStatus.id,
    toStatusId: transition.toStatus.id,
    conditionType: transition.conditionType
  };
  transitionErrors.value = {};
  showEditTransition.value = true;
}

function validateTransitionForm(): boolean {
  transitionErrors.value = {};
  
  const nameError = workflowService.validateTransitionName(transitionForm.value.name);
  if (nameError) {
    transitionErrors.value.name = nameError;
  }
  
  if (!transitionForm.value.fromStatusId) {
    transitionErrors.value.fromStatusId = 'From status is required';
  }
  
  if (!transitionForm.value.toStatusId) {
    transitionErrors.value.toStatusId = 'To status is required';
  }
  
  if (transitionForm.value.fromStatusId === transitionForm.value.toStatusId) {
    transitionErrors.value.toStatusId = 'From and to status cannot be the same';
  }
  
  return Object.keys(transitionErrors.value).length === 0;
}

async function saveTransition() {
  if (!validateTransitionForm() || !selectedWorkflow.value) return;
  
  loading.value = true;
  try {
    if (transitionForm.value.id) {
      // Update existing transition
      const updated = await workflowService.updateTransition(transitionForm.value.id, {
        name: transitionForm.value.name,
        fromStatusId: transitionForm.value.fromStatusId,
        toStatusId: transitionForm.value.toStatusId,
        conditionType: transitionForm.value.conditionType
      });
      
      const index = transitions.value.findIndex(t => t.id === updated.id);
      if (index !== -1) {
        transitions.value[index] = updated;
      }
      
      toast.add({
        severity: 'success',
        summary: 'Transition Updated',
        detail: 'Transition has been updated successfully',
        life: 3000
      });
    } else {
      // Create new transition
      const created = await workflowService.createTransition(selectedWorkflow.value.id, {
        name: transitionForm.value.name,
        fromStatusId: transitionForm.value.fromStatusId,
        toStatusId: transitionForm.value.toStatusId,
        conditionType: transitionForm.value.conditionType
      });
      
      transitions.value.push(created);
      
      toast.add({
        severity: 'success',
        summary: 'Transition Created',
        detail: 'Transition has been created successfully',
        life: 3000
      });
    }
    
    showCreateTransition.value = false;
    showEditTransition.value = false;
    
    // Reload visualization if on that tab
    if (activeTab.value === 'visualization') {
      await loadVisualization();
    }
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: err.message || 'Failed to save transition',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

async function deleteTransition(transition: WorkflowTransition) {
  if (!confirm(`Are you sure you want to delete the transition "${transition.name}"?`)) {
    return;
  }
  
  loading.value = true;
  try {
    await workflowService.deleteTransition(transition.id);
    transitions.value = transitions.value.filter(t => t.id !== transition.id);
    
    toast.add({
      severity: 'success',
      summary: 'Transition Deleted',
      detail: 'Transition has been deleted successfully',
      life: 3000
    });
    
    // Reload visualization if on that tab
    if (activeTab.value === 'visualization') {
      await loadVisualization();
    }
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: err.message || 'Failed to delete transition',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

// Utility functions
function getStatusName(statusId: string): string {
  const status = statuses.value.find(s => s.id === statusId);
  return status ? status.name : 'Unknown Status';
}

function getStatusColor(statusId: string): string {
  const status = statuses.value.find(s => s.id === statusId);
  return status ? status.color : '#42526E';
}

function generateTransitionName() {
  if (transitionForm.value.fromStatusId && transitionForm.value.toStatusId) {
    const fromName = getStatusName(transitionForm.value.fromStatusId);
    const toName = getStatusName(transitionForm.value.toStatusId);
    transitionForm.value.name = `${fromName} → ${toName}`;
  }
}

async function initializeWorkflow() {
  if (!confirm('This will create default statuses and workflow for this project. Continue?')) {
    return;
  }
  
  loading.value = true;
  try {
    const result = await workflowService.initializeProjectWorkflow(props.projectId);
    
    workflows.value = [result.workflow];
    statuses.value = result.statuses;
    selectedWorkflow.value = result.workflow;
    transitions.value = result.transitions;
    
    toast.add({
      severity: 'success',
      summary: 'Workflow Initialized',
      detail: result.message,
      life: 3000
    });
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Initialization Failed',
      detail: err.message || 'Failed to initialize workflow',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  if (props.visible) {
    loadData();
  }
});

// Watchers
watch(() => props.visible, (visible) => {
  if (visible) {
    loadData();
  }
});

watch(selectedWorkflow, async (workflow) => {
  if (workflow) {
    await loadTransitions();
    if (activeTab.value === 'visualization') {
      await loadVisualization();
    }
  }
});

watch(activeTab, async (tab) => {
  if (tab === 'visualization' && selectedWorkflow.value) {
    await loadVisualization();
  }
});

watch(() => transitionForm.value.fromStatusId, generateTransitionName);
watch(() => transitionForm.value.toStatusId, generateTransitionName);
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="emit('close')">
    <div class="modal-content workflow-management" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h2>Workflow Management</h2>
        <button @click="emit('close')" class="close-btn">
          <i class="icon-close"></i>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading workflow data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button @click="loadData" class="btn btn-primary">Retry</button>
      </div>

      <!-- Main Content -->
      <div v-else class="modal-body">
        <!-- Empty State -->
        <div v-if="workflows.length === 0 && statuses.length === 0" class="empty-state">
          <div class="empty-icon">🔄</div>
          <h3>No Workflow Configured</h3>
          <p>This project doesn't have any workflow configured yet.</p>
          <button @click="initializeWorkflow" class="btn btn-primary">
            <i class="icon-plus"></i>
            Initialize Default Workflow
          </button>
        </div>

        <!-- Workflow Content -->
        <div v-else class="workflow-content">
          <!-- Tabs -->
          <div class="tabs">
            <button 
              @click="activeTab = 'workflows'" 
              :class="{ active: activeTab === 'workflows' }"
              class="tab-btn"
            >
              Workflows
            </button>
            <button 
              @click="activeTab = 'statuses'" 
              :class="{ active: activeTab === 'statuses' }"
              class="tab-btn"
            >
              Statuses
            </button>
            <button 
              @click="activeTab = 'visualization'" 
              :class="{ active: activeTab === 'visualization' }"
              class="tab-btn"
              :disabled="!selectedWorkflow"
            >
              Visualization
            </button>
          </div>

          <!-- Workflows Tab -->
          <div v-if="activeTab === 'workflows'" class="tab-content">
            <div class="section-header">
              <h3>Workflows</h3>
              <button @click="openCreateWorkflow" class="btn btn-primary">
                <i class="icon-plus"></i>
                Create Workflow
              </button>
            </div>

            <div class="workflows-list">
              <div 
                v-for="workflow in sortedWorkflows" 
                :key="workflow.id"
                class="workflow-item"
                :class="{ selected: selectedWorkflow?.id === workflow.id }"
                @click="selectedWorkflow = workflow"
              >
                <div class="workflow-info">
                  <h4>
                    {{ workflow.name }}
                    <span v-if="workflow.isDefault" class="default-badge">Default</span>
                  </h4>
                  <p v-if="workflow.description">{{ workflow.description }}</p>
                </div>
                <div class="workflow-actions">
                  <button @click.stop="openEditWorkflow(workflow)" class="btn-icon">
                    <i class="icon-edit"></i>
                  </button>
                  <button 
                    @click.stop="deleteWorkflow(workflow)" 
                    class="btn-icon delete"
                    :disabled="workflow.isDefault"
                  >
                    <i class="icon-delete"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Transitions for selected workflow -->
            <div v-if="selectedWorkflow" class="transitions-section">
              <div class="section-header">
                <h4>Transitions for "{{ selectedWorkflow.name }}"</h4>
                <button @click="openCreateTransition" class="btn btn-secondary">
                  <i class="icon-plus"></i>
                  Add Transition
                </button>
              </div>

              <div class="transitions-list">
                <div 
                  v-for="transition in transitions" 
                  :key="transition.id"
                  class="transition-item"
                >
                  <div class="transition-info">
                    <h5>{{ transition.name }}</h5>
                    <div class="transition-flow">
                      <span 
                        class="status-badge" 
                        :style="{ backgroundColor: transition.fromStatus.color }"
                      >
                        {{ transition.fromStatus.name }}
                      </span>
                      <i class="icon-arrow-right"></i>
                      <span 
                        class="status-badge" 
                        :style="{ backgroundColor: transition.toStatus.color }"
                      >
                        {{ transition.toStatus.name }}
                      </span>
                    </div>
                    <small>{{ transition.conditionType.replace('_', ' ') }}</small>
                  </div>
                  <div class="transition-actions">
                    <button @click="openEditTransition(transition)" class="btn-icon">
                      <i class="icon-edit"></i>
                    </button>
                    <button @click="deleteTransition(transition)" class="btn-icon delete">
                      <i class="icon-delete"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Statuses Tab -->
          <div v-if="activeTab === 'statuses'" class="tab-content">
            <div class="section-header">
              <h3>Statuses</h3>
              <button @click="openCreateStatus" class="btn btn-primary">
                <i class="icon-plus"></i>
                Create Status
              </button>
            </div>

            <div class="statuses-list">
              <div 
                v-for="status in sortedStatuses" 
                :key="status.id"
                class="status-item"
              >
                <div class="status-info">
                  <div class="status-header">
                    <span 
                      class="status-indicator" 
                      :style="{ backgroundColor: status.color }"
                    ></span>
                    <h4>
                      {{ status.name }}
                      <span v-if="status.isDefault" class="default-badge">Default</span>
                    </h4>
                    <span class="status-type">{{ workflowService.getStatusTypeLabel(status.type) }}</span>
                  </div>
                  <p v-if="status.description">{{ status.description }}</p>
                </div>
                <div class="status-actions">
                  <button @click="openEditStatus(status)" class="btn-icon">
                    <i class="icon-edit"></i>
                  </button>
                  <button 
                    @click="deleteStatus(status)" 
                    class="btn-icon delete"
                    :disabled="status.isDefault"
                  >
                    <i class="icon-delete"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Visualization Tab -->
          <div v-if="activeTab === 'visualization'" class="tab-content">
            <div class="section-header">
              <h3>Workflow Visualization</h3>
              <select v-model="selectedWorkflow" class="workflow-select">
                <option v-for="workflow in workflows" :key="workflow.id" :value="workflow">
                  {{ workflow.name }}
                </option>
              </select>
            </div>

            <div v-if="visualization" class="visualization-container">
              <div class="workflow-diagram">
                <div 
                  v-for="node in visualization.nodes" 
                  :key="node.id"
                  class="workflow-node"
                  :style="{ backgroundColor: node.color }"
                >
                  <h5>{{ node.name }}</h5>
                  <small>{{ workflowService.getStatusTypeLabel(node.type as any) }}</small>
                </div>
              </div>
              
              <div class="transitions-info">
                <h4>Available Transitions</h4>
                <div class="transition-list">
                  <div 
                    v-for="edge in visualization.edges" 
                    :key="edge.id"
                    class="transition-edge"
                  >
                    <span>{{ edge.name }}</span>
                    <small>({{ edge.conditionType.replace('_', ' ') }})</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Workflow Modal -->
    <div v-if="showCreateWorkflow || showEditWorkflow" class="modal-overlay" @click="showCreateWorkflow = showEditWorkflow = false">
      <div class="modal-content form-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showCreateWorkflow ? 'Create Workflow' : 'Edit Workflow' }}</h3>
          <button @click="showCreateWorkflow = showEditWorkflow = false" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveWorkflow">
            <div class="form-group">
              <label for="workflow-name">Name *</label>
              <input 
                id="workflow-name"
                v-model="workflowForm.name" 
                type="text" 
                class="form-input"
                :class="{ error: workflowErrors.name }"
                placeholder="Enter workflow name"
              >
              <span v-if="workflowErrors.name" class="error-text">{{ workflowErrors.name }}</span>
            </div>
            
            <div class="form-group">
              <label for="workflow-description">Description</label>
              <textarea 
                id="workflow-description"
                v-model="workflowForm.description" 
                class="form-textarea"
                placeholder="Enter workflow description"
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  v-model="workflowForm.isDefault" 
                  type="checkbox"
                  :disabled="workflows.length === 0"
                >
                Set as default workflow
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="showCreateWorkflow = showEditWorkflow = false" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="saveWorkflow" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : (showCreateWorkflow ? 'Create' : 'Update') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Status Modal -->
    <div v-if="showCreateStatus || showEditStatus" class="modal-overlay" @click="showCreateStatus = showEditStatus = false">
      <div class="modal-content form-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showCreateStatus ? 'Create Status' : 'Edit Status' }}</h3>
          <button @click="showCreateStatus = showEditStatus = false" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveStatus">
            <div class="form-group">
              <label for="status-name">Name *</label>
              <input 
                id="status-name"
                v-model="statusForm.name" 
                type="text" 
                class="form-input"
                :class="{ error: statusErrors.name }"
                placeholder="Enter status name"
              >
              <span v-if="statusErrors.name" class="error-text">{{ statusErrors.name }}</span>
            </div>
            
            <div class="form-group">
              <label for="status-description">Description</label>
              <textarea 
                id="status-description"
                v-model="statusForm.description" 
                class="form-textarea"
                placeholder="Enter status description"
                rows="2"
              ></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="status-type">Type *</label>
                <select 
                  id="status-type"
                  v-model="statusForm.type" 
                  class="form-select"
                >
                  <option v-for="option in statusTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="status-color">Color *</label>
                <input 
                  id="status-color"
                  v-model="statusForm.color" 
                  type="color" 
                  class="form-color"
                >
              </div>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  v-model="statusForm.isDefault" 
                  type="checkbox"
                  :disabled="statuses.length === 0"
                >
                Set as default status
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="showCreateStatus = showEditStatus = false" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="saveStatus" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : (showCreateStatus ? 'Create' : 'Update') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Transition Modal -->
    <div v-if="showCreateTransition || showEditTransition" class="modal-overlay" @click="showCreateTransition = showEditTransition = false">
      <div class="modal-content form-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showCreateTransition ? 'Create Transition' : 'Edit Transition' }}</h3>
          <button @click="showCreateTransition = showEditTransition = false" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveTransition">
            <div class="form-group">
              <label for="transition-name">Name *</label>
              <input 
                id="transition-name"
                v-model="transitionForm.name" 
                type="text" 
                class="form-input"
                :class="{ error: transitionErrors.name }"
                placeholder="Enter transition name"
              >
              <span v-if="transitionErrors.name" class="error-text">{{ transitionErrors.name }}</span>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="from-status">From Status *</label>
                <select 
                  id="from-status"
                  v-model="transitionForm.fromStatusId" 
                  class="form-select"
                  :class="{ error: transitionErrors.fromStatusId }"
                >
                  <option value="">Select from status</option>
                  <option v-for="status in availableFromStatuses" :key="status.id" :value="status.id">
                    {{ status.name }}
                  </option>
                </select>
                <span v-if="transitionErrors.fromStatusId" class="error-text">{{ transitionErrors.fromStatusId }}</span>
              </div>
              
              <div class="form-group">
                <label for="to-status">To Status *</label>
                <select 
                  id="to-status"
                  v-model="transitionForm.toStatusId" 
                  class="form-select"
                  :class="{ error: transitionErrors.toStatusId }"
                >
                  <option value="">Select to status</option>
                  <option v-for="status in availableToStatuses" :key="status.id" :value="status.id">
                    {{ status.name }}
                  </option>
                </select>
                <span v-if="transitionErrors.toStatusId" class="error-text">{{ transitionErrors.toStatusId }}</span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="condition-type">Condition Type</label>
              <select 
                id="condition-type"
                v-model="transitionForm.conditionType" 
                class="form-select"
              >
                <option v-for="option in conditionTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="showCreateTransition = showEditTransition = false" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="saveTransition" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : (showCreateTransition ? 'Create' : 'Update') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-management {
  max-width: 1200px;
  width: 95%;
  max-height: 90vh;
}

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
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e1e4e8;
  background: #f8f9fa;
}

.modal-header h2,
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
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
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

.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e1e4e8;
  margin-bottom: 2rem;
}

.tab-btn {
  background: none;
  border: none;
  padding: 1rem 1.5rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #6b778c;
  font-weight: 500;
}

.tab-btn.active {
  color: #0052cc;
  border-bottom-color: #0052cc;
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3,
.section-header h4 {
  margin: 0;
  color: #172b4d;
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
  transition: all 0.2s;
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

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  color: #6b778c;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f4f5f7;
}

.btn-icon.delete {
  color: #de350b;
}

.btn-icon.delete:hover {
  background: #ffebe6;
}

.workflows-list,
.statuses-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.workflow-item,
.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.workflow-item:hover,
.status-item:hover {
  border-color: #0052cc;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.workflow-item.selected {
  border-color: #0052cc;
  background: #f0f8ff;
}

.workflow-info h4,
.status-info h4 {
  margin: 0 0 0.5rem 0;
  color: #172b4d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.workflow-info p,
.status-info p {
  margin: 0;
  color: #6b778c;
  font-size: 0.9rem;
}

.default-badge {
  background: #00875a;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.workflow-actions,
.status-actions {
  display: flex;
  gap: 0.5rem;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-type {
  background: #dfe1e6;
  color: #42526e;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.transitions-section {
  border-top: 1px solid #e1e4e8;
  padding-top: 2rem;
}

.transitions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transition-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
}

.transition-info h5 {
  margin: 0 0 0.5rem 0;
  color: #172b4d;
}

.transition-flow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.status-badge {
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.transition-actions {
  display: flex;
  gap: 0.5rem;
}

.workflow-select {
  padding: 0.5rem;
  border: 1px solid #dfe1e6;
  border-radius: 4px;
  background: white;
}

.visualization-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.workflow-diagram {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 2rem;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  background: #f8f9fa;
}

.workflow-node {
  padding: 1rem;
  border-radius: 6px;
  color: white;
  text-align: center;
  min-width: 120px;
}

.workflow-node h5 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.workflow-node small {
  opacity: 0.8;
}

.transitions-info {
  padding: 1rem;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
}

.transitions-info h4 {
  margin: 0 0 1rem 0;
  color: #172b4d;
}

.transition-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.transition-edge {
  padding: 0.5rem;
  background: #f4f5f7;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.transition-edge small {
  color: #6b778c;
  font-style: italic;
}

.form-modal {
  max-width: 500px;
  width: 90%;
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
  color: #172b4d;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #dfe1e6;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #0052cc;
}

.form-input.error,
.form-textarea.error,
.form-select.error {
  border-color: #de350b;
}

.form-color {
  width: 60px;
  height: 40px;
  border: 1px solid #dfe1e6;
  border-radius: 4px;
  cursor: pointer;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.error-text {
  color: #de350b;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: block;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1.5rem;
  border-top: 1px solid #e1e4e8;
  background: #f8f9fa;
}

/* Icon placeholders */
.icon-close::before { content: '×'; }
.icon-plus::before { content: '+'; }
.icon-edit::before { content: '✏️'; }
.icon-delete::before { content: '🗑️'; }
.icon-arrow-right::before { content: '→'; }
</style>
