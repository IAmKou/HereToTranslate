<template>
  <div class="project-manage-view">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Loading project...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadProject" class="btn btn-secondary">Try Again</button>
    </div>

    <div v-else-if="project" class="manage-content">
      <div class="manage-header">
        <div class="header-info">
          <h1>Manage Project</h1>
          <p class="subtitle">{{ project.name }}</p>
        </div>
        <router-link :to="`/projects/${project.id}`" class="btn btn-outline">
          ← Back to Project
        </router-link>
      </div>

      <div class="manage-sections">
        <!-- Project Overview -->
        <div class="manage-section">
          <h2>Project Overview</h2>
          <div class="overview-grid">
            <div class="overview-item">
              <div class="overview-label">Status</div>
              <div class="overview-value">
                <span v-if="project.isPublic" class="badge badge-public">Public</span>
                <span v-else class="badge badge-private">Private</span>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-label">Created</div>
              <div class="overview-value">{{ formatDate(project.createdAt) }}</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">Owner</div>
              <div class="overview-value">{{ project.createdBy.username }}</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">Tags</div>
              <div class="overview-value">
                <span v-if="project.tags && project.tags.length > 0">
                  {{ project.tags.length }} tag{{ project.tags.length !== 1 ? 's' : '' }}
                </span>
                <span v-else class="no-tags">No tags</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="manage-section">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <button @click="editProject" class="action-card">
              <div class="action-icon">✏️</div>
              <div class="action-title">Edit Project</div>
              <div class="action-description">Update project details and settings</div>
            </button>
            <button @click="manageRoles" class="action-card">
              <div class="action-icon">👥</div>
              <div class="action-title">Manage Roles</div>
              <div class="action-description">Configure user roles and permissions</div>
            </button>
            <button @click="manageGroups" class="action-card">
              <div class="action-icon">🏷️</div>
              <div class="action-title">Manage Groups</div>
              <div class="action-description">Organize users into groups</div>
            </button>
            <button @click="manageFiles" class="action-card">
              <div class="action-icon">📁</div>
              <div class="action-title">Manage Files</div>
              <div class="action-description">Upload and organize project files</div>
            </button>
            <button @click="viewAnalytics" class="action-card">
              <div class="action-icon">📊</div>
              <div class="action-title">View Analytics</div>
              <div class="action-description">Project statistics and insights</div>
            </button>
            <button @click="exportProject" class="action-card">
              <div class="action-icon">📤</div>
              <div class="action-title">Export Project</div>
              <div class="action-description">Download project data</div>
            </button>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="manage-section">
          <h2>Recent Activity</h2>
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon">📝</div>
              <div class="activity-content">
                <div class="activity-title">Project created</div>
                <div class="activity-meta">{{ formatDate(project.createdAt) }} by {{ project.createdBy.username }}</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon">⚙️</div>
              <div class="activity-content">
                <div class="activity-title">Project settings updated</div>
                <div class="activity-meta">Last modified: {{ formatDate(project.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="manage-section danger-zone">
          <h2>Danger Zone</h2>
          <div class="danger-actions">
            <div class="danger-item">
              <div class="danger-info">
                <h3>Delete Project</h3>
                <p>Permanently delete this project and all its data. This action cannot be undone.</p>
              </div>
              <button @click="deleteProject" class="btn btn-danger">
                Delete Project
              </button>
            </div>
            <div class="danger-item">
              <div class="danger-info">
                <h3>Transfer Ownership</h3>
                <p>Transfer project ownership to another user. You will lose admin privileges.</p>
              </div>
              <button @click="transferOwnership" class="btn btn-warning">
                Transfer Ownership
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '../services/auth.service'

const route = useRoute()
const router = useRouter()

// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  tags?: Array<{ id: string; name: string }>;
  projectRoles?: ProjectRole[];
  groups?: ProjectGroup[];
}

interface ProjectRole {
  id: string;
  name: string;
  permissionFlags: string;
}

interface ProjectGroup {
  id: string;
  name: string;
  permissionFlags: string;
  members?: Array<{ id: string; username: string; fullName?: string }>;
}

const project = ref<Project | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = authService.getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}

const loadProject = async () => {
  try {
    loading.value = true
    error.value = null
    const projectId = route.params.projectId as string
    project.value = await apiCall(`/projects/${projectId}`)
  } catch (err: any) {
    error.value = err.message || 'Failed to load project'
    console.error('Error loading project:', err)
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const editProject = () => {
  router.push(`/projects/${project.value?.id}/edit`)
}

const manageRoles = () => {
  // Navigate to roles management or open modal
  console.log('Manage roles')
}

const manageGroups = () => {
  // Navigate to groups management or open modal
  console.log('Manage groups')
}

const manageFiles = () => {
  // Navigate to file management
  console.log('Manage files')
}

const viewAnalytics = () => {
  // Navigate to analytics view
  console.log('View analytics')
}

const exportProject = () => {
  // Export project data
  console.log('Export project')
}

const deleteProject = async () => {
  if (!project.value || !confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
    return
  }

  try {
    await apiCall(`/projects/${project.value.id}`, { method: 'DELETE' })
    alert('Project deleted successfully')
    router.push('/projects')
  } catch (err: any) {
    alert('Failed to delete project: ' + err.message)
  }
}

const transferOwnership = () => {
  // Open transfer ownership modal
  console.log('Transfer ownership')
}

onMounted(() => {
  loadProject()
})
</script>

<style scoped>
.project-manage-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.loading,
.error {
  text-align: center;
  padding: 3rem 2rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.manage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-info h1 {
  margin: 0 0 0.5rem 0;
  color: #1a202c;
  font-size: 2rem;
  font-weight: 600;
}

.subtitle {
  color: #718096;
  margin: 0;
  font-size: 1.1rem;
}

.manage-sections {
  display: grid;
  gap: 2rem;
}

.manage-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.manage-section h2 {
  margin: 0 0 1.5rem 0;
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.overview-item {
  padding: 1rem;
  background-color: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.overview-label {
  color: #718096;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.overview-value {
  color: #2d3748;
  font-weight: 500;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-public {
  background-color: #c6f6d5;
  color: #22543d;
}

.badge-private {
  background-color: #fed7d7;
  color: #742a2a;
}

.no-tags {
  color: #a0aec0;
  font-style: italic;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem;
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.action-card:hover {
  background-color: #edf2f7;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.action-title {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.action-description {
  color: #718096;
  font-size: 0.875rem;
  line-height: 1.4;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.activity-icon {
  font-size: 1.5rem;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.activity-meta {
  color: #718096;
  font-size: 0.875rem;
}

.danger-zone {
  border-color: #fed7d7;
  background-color: #fff5f5;
}

.danger-zone h2 {
  color: #c53030;
}

.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.danger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background-color: white;
  border-radius: 8px;
  border: 1px solid #fed7d7;
  gap: 2rem;
}

.danger-info h3 {
  margin: 0 0 0.5rem 0;
  color: #c53030;
  font-size: 1rem;
  font-weight: 600;
}

.danger-info p {
  margin: 0;
  color: #742a2a;
  font-size: 0.875rem;
  line-height: 1.4;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-outline {
  background-color: transparent;
  color: #4299e1;
  border: 1px solid #4299e1;
}

.btn-outline:hover {
  background-color: #4299e1;
  color: white;
}

.btn-danger {
  background-color: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background-color: #c53030;
}

.btn-warning {
  background-color: #ed8936;
  color: white;
}

.btn-warning:hover {
  background-color: #dd6b20;
}

@media (max-width: 768px) {
  .project-manage-view {
    padding: 1rem;
  }

  .manage-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-info h1 {
    font-size: 1.75rem;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .danger-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style> 