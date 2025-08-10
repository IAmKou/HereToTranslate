<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { workflowService } from '../services/workflow.service';
import type { Workflow, TaskStatus } from '../services/task.service';
import { useToast } from 'primevue/usetoast';
import WorkflowManagement from './WorkflowManagement.vue';

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
});

// Reactive state
const loading = ref(false);
const error = ref('');
const workflows = ref<Workflow[]>([]);
const statuses = ref<TaskStatus[]>([]);
const defaultWorkflow = ref<Workflow | null>(null);
const showWorkflowManagement = ref(false);

// Statistics
const stats = ref({
  totalWorkflows: 0,
  totalStatuses: 0,
  totalTransitions: 0,
  activeWorkflows: 0
});

// Utilities
const toast = useToast();

// Computed properties
const hasWorkflows = computed(() => workflows.value.length > 0);
const hasStatuses = computed(() => statuses.value.length > 0);
const isConfigured = computed(() => hasWorkflows.value && hasStatuses.value);

const statusesByType = computed(() => {
  const grouped = {
    todo: statuses.value.filter(s => s.type === 'todo'),
    in_progress: statuses.value.filter(s => s.type === 'in_progress'),
    done: statuses.value.filter(s => s.type === 'done')
  };
  return grouped;
});

// Methods
async function loadWorkflowSettings() {
  loading.value = true;
  error.value = '';
  
  try {
    const [workflowsData, statusesData] = await Promise.all([
      workflowService.getProjectWorkflows(props.projectId),
      workflowService.getProjectStatuses(props.projectId)
    ]);
    
    workflows.value = workflowsData;
    statuses.value = statusesData;
    defaultWorkflow.value = workflows.value.find(w => w.isDefault) || null;
    
    // Calculate statistics
    stats.value = {
      totalWorkflows: workflows.value.length,
      totalStatuses: statuses.value.length,
      totalTransitions: 0, // Will be calculated when needed
      activeWorkflows: workflows.value.filter(w => w.isActive).length
    };
    
    // Load transition count for default workflow
    if (defaultWorkflow.value) {
      try {
        const transitions = await workflowService.getWorkflowTransitions(defaultWorkflow.value.id);
        stats.value.totalTransitions = transitions.length;
      } catch (err) {
        console.warn('Could not load transitions count:', err);
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load workflow settings';
    console.error('Error loading workflow settings:', err);
  } finally {
    loading.value = false;
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
    defaultWorkflow.value = result.workflow;
    
    // Update statistics
    stats.value = {
      totalWorkflows: 1,
      totalStatuses: result.statuses.length,
      totalTransitions: result.transitions.length,
      activeWorkflows: 1
    };
    
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

async function setDefaultWorkflow(workflow: Workflow) {
  if (workflow.isDefault) return;
  
  loading.value = true;
  try {
    await workflowService.updateWorkflow(workflow.id, { isDefault: true });
    
    // Update local state
    workflows.value = workflows.value.map(w => ({
      ...w,
      isDefault: w.id === workflow.id
    }));
    defaultWorkflow.value = workflow;
    
    toast.add({
      severity: 'success',
      summary: 'Default Workflow Updated',
      detail: `"${workflow.name}" is now the default workflow`,
      life: 3000
    });
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: err.message || 'Failed to update default workflow',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

function openWorkflowManagement() {
  showWorkflowManagement.value = true;
}

function handleWorkflowCreated(workflow: Workflow) {
  workflows.value.push(workflow);
  if (workflow.isDefault) {
    defaultWorkflow.value = workflow;
  }
  stats.value.totalWorkflows++;
  if (workflow.isActive) {
    stats.value.activeWorkflows++;
  }
}

function handleWorkflowUpdated(workflow: Workflow) {
  const index = workflows.value.findIndex(w => w.id === workflow.id);
  if (index !== -1) {
    workflows.value[index] = workflow;
    if (workflow.isDefault) {
      defaultWorkflow.value = workflow;
    }
  }
}

function getStatusTypeLabel(type: 'todo' | 'in_progress' | 'done'): string {
  const labels = {
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'done': 'Done'
  };
  return labels[type];
}

function getStatusTypeColor(type: 'todo' | 'in_progress' | 'done'): string {
  const colors = {
    'todo': '#42526E',
    'in_progress': '#0052CC',
    'done': '#00875A'
  };
  return colors[type];
}

// Lifecycle
onMounted(() => {
  loadWorkflowSettings();
});
</script>

<template>
  <div class="workflow-settings">
    <div class="settings-header">
      <h3>Workflow Settings</h3>
      <p>Configure workflows and statuses for this project</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading workflow settings...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="loadWorkflowSettings" class="btn btn-primary">Retry</button>
    </div>

    <!-- Not Configured State -->
    <div v-else-if="!isConfigured" class="not-configured">
      <div class="empty-icon">🔄</div>
      <h4>Workflow Not Configured</h4>
      <p>This project doesn't have any workflow configured yet. Initialize a default workflow to get started.</p>
      <div class="actions">
        <button @click="initializeWorkflow" class="btn btn-primary">
          <i class="icon-plus"></i>
          Initialize Default Workflow
        </button>
        <button @click="openWorkflowManagement" class="btn btn-secondary">
          <i class="icon-settings"></i>
          Advanced Configuration
        </button>
      </div>
    </div>

    <!-- Configured State -->
    <div v-else class="workflow-overview">
      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🔄</div>
          <div class="stat-info">
            <h4>{{ stats.totalWorkflows }}</h4>
            <p>Workflows</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <h4>{{ stats.totalStatuses }}</h4>
            <p>Statuses</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔀</div>
          <div class="stat-info">
            <h4>{{ stats.totalTransitions }}</h4>
            <p>Transitions</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <h4>{{ stats.activeWorkflows }}</h4>
            <p>Active</p>
          </div>
        </div>
      </div>

      <!-- Default Workflow Section -->
      <div class="section">
        <div class="section-header">
          <h4>Default Workflow</h4>
          <button @click="openWorkflowManagement" class="btn btn-secondary">
            <i class="icon-settings"></i>
            Manage Workflows
          </button>
        </div>
        
        <div v-if="defaultWorkflow" class="default-workflow-card">
          <div class="workflow-info">
            <h5>{{ defaultWorkflow.name }}</h5>
            <p v-if="defaultWorkflow.description">{{ defaultWorkflow.description }}</p>
            <div class="workflow-meta">
              <span class="meta-item">
                <i class="icon-calendar"></i>
                Created {{ new Date(defaultWorkflow.createdAt).toLocaleDateString() }}
              </span>
              <span class="meta-item">
                <i class="icon-edit"></i>
                Updated {{ new Date(defaultWorkflow.updatedAt).toLocaleDateString() }}
              </span>
            </div>
          </div>
          <div class="workflow-badge">
            <span class="default-badge">Default</span>
          </div>
        </div>
        
        <!-- Alternative Workflows -->
        <div v-if="workflows.length > 1" class="alternative-workflows">
          <h5>Other Workflows</h5>
          <div class="workflow-list">
            <div 
              v-for="workflow in workflows.filter(w => !w.isDefault)" 
              :key="workflow.id"
              class="workflow-item"
            >
              <div class="workflow-info">
                <span class="workflow-name">{{ workflow.name }}</span>
                <small v-if="workflow.description">{{ workflow.description }}</small>
              </div>
              <button 
                @click="setDefaultWorkflow(workflow)" 
                class="btn btn-sm btn-outline"
                :disabled="loading"
              >
                Set as Default
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Statuses Overview -->
      <div class="section">
        <div class="section-header">
          <h4>Status Overview</h4>
          <span class="status-count">{{ statuses.length }} statuses</span>
        </div>
        
        <div class="statuses-overview">
          <div 
            v-for="(statusList, type) in statusesByType" 
            :key="type"
            class="status-type-group"
          >
            <div class="status-type-header">
              <span 
                class="type-indicator" 
                :style="{ backgroundColor: getStatusTypeColor(type as any) }"
              ></span>
              <h5>{{ getStatusTypeLabel(type as any) }}</h5>
              <span class="count">({{ statusList.length }})</span>
            </div>
            
            <div class="status-list">
              <div 
                v-for="status in statusList" 
                :key="status.id"
                class="status-item"
              >
                <span 
                  class="status-color" 
                  :style="{ backgroundColor: status.color }"
                ></span>
                <span class="status-name">{{ status.name }}</span>
                <span v-if="status.isDefault" class="default-badge small">Default</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <div class="section-header">
          <h4>Quick Actions</h4>
        </div>
        
        <div class="quick-actions">
          <button @click="openWorkflowManagement" class="action-card">
            <div class="action-icon">⚙️</div>
            <div class="action-info">
              <h5>Manage Workflows</h5>
              <p>Create, edit, and configure workflows and statuses</p>
            </div>
          </button>
          
          <button @click="loadWorkflowSettings" class="action-card">
            <div class="action-icon">🔄</div>
            <div class="action-info">
              <h5>Refresh Settings</h5>
              <p>Reload workflow configuration from server</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Workflow Management Modal -->
    <WorkflowManagement
      v-if="showWorkflowManagement"
      :visible="showWorkflowManagement"
      :project-id="projectId"
      @close="showWorkflowManagement = false"
      @workflow-created="handleWorkflowCreated"
      @workflow-updated="handleWorkflowUpdated"
    />
  </div>
</template>

<style scoped>
.workflow-settings {
  padding: 1.5rem;
  max-width: 1200px;
}

.settings-header {
  margin-bottom: 2rem;
}

.settings-header h3 {
  margin: 0 0 0.5rem 0;
  color: #172b4d;
  font-size: 1.5rem;
}

.settings-header p {
  margin: 0;
  color: #6b778c;
  font-size: 1rem;
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

.error-icon {
  font-size: 3rem;
}

.not-configured {
  text-align: center;
  padding: 3rem;
  border: 2px dashed #dfe1e6;
  border-radius: 8px;
  background: #f8f9fa;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.not-configured h4 {
  margin: 0 0 1rem 0;
  color: #172b4d;
}

.not-configured p {
  margin: 0 0 2rem 0;
  color: #6b778c;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-primary {
  background: #0052cc;
  color: white;
}

.btn-primary:hover {
  background: #0747a6;
}

.btn-secondary {
  background: #f4f5f7;
  color: #42526e;
  border: 1px solid #dfe1e6;
}

.btn-secondary:hover {
  background: #ebecf0;
}

.btn-outline {
  background: transparent;
  color: #0052cc;
  border: 1px solid #0052cc;
}

.btn-outline:hover {
  background: #f0f8ff;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 2rem;
  opacity: 0.8;
}

.stat-info h4 {
  margin: 0;
  font-size: 1.5rem;
  color: #172b4d;
}

.stat-info p {
  margin: 0;
  color: #6b778c;
  font-size: 0.9rem;
}

.section {
  margin-bottom: 2rem;
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e1e4e8;
  background: #f8f9fa;
}

.section-header h4 {
  margin: 0;
  color: #172b4d;
}

.status-count {
  color: #6b778c;
  font-size: 0.9rem;
}

.default-workflow-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
}

.workflow-info h5 {
  margin: 0 0 0.5rem 0;
  color: #172b4d;
  font-size: 1.1rem;
}

.workflow-info p {
  margin: 0 0 1rem 0;
  color: #6b778c;
}

.workflow-meta {
  display: flex;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #6b778c;
  font-size: 0.8rem;
}

.default-badge {
  background: #00875a;
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.default-badge.small {
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
}

.alternative-workflows {
  padding: 1.5rem;
  border-top: 1px solid #e1e4e8;
}

.alternative-workflows h5 {
  margin: 0 0 1rem 0;
  color: #172b4d;
}

.workflow-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.workflow-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.workflow-name {
  font-weight: 500;
  color: #172b4d;
}

.workflow-item small {
  display: block;
  color: #6b778c;
  margin-top: 0.25rem;
}

.statuses-overview {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.status-type-group {
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  overflow: hidden;
}

.status-type-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e4e8;
}

.type-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-type-header h5 {
  margin: 0;
  color: #172b4d;
  flex: 1;
}

.count {
  color: #6b778c;
  font-size: 0.9rem;
}

.status-list {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.status-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-name {
  flex: 1;
  color: #172b4d;
  font-weight: 500;
}

.quick-actions {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.action-card:hover {
  background: #ebecf0;
  border-color: #0052cc;
}

.action-icon {
  font-size: 1.5rem;
  opacity: 0.8;
}

.action-info h5 {
  margin: 0 0 0.5rem 0;
  color: #172b4d;
}

.action-info p {
  margin: 0;
  color: #6b778c;
  font-size: 0.9rem;
}

/* Icon placeholders */
.icon-plus::before { content: '+'; }
.icon-settings::before { content: '⚙️'; }
.icon-calendar::before { content: '📅'; }
.icon-edit::before { content: '✏️'; }
</style>
