<template>
  <div class="project-manage-page">
    <!-- Navbar -->
    <Navbar />

    <div class="main-container">
      <!-- Sidebar -->
      <Sidebar />

      <!-- Main Content -->
      <div class="content-wrapper">
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
                      <span v-if="!project.isPrivate" class="badge badge-public">Public</span>
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
                        <span v-for="tag in project.tags" :key="tag.id" class="tag-badge">
                          <span class="tag-icon">#</span>{{ tag.name }}
                        </span>
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
                  <button @click="manageFiles" class="action-card">
                    <div class="action-icon">📁</div>
                    <div class="action-title">Manage Files</div>
                    <div class="action-description">Upload and organize project files</div>
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
                  <div v-if="!project.isSyncedFromRequest" class="danger-item">
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
      </div>
    </div>

    <!-- Footer -->
    <AppFooter />

    <!-- Modern Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modern-modal-overlay">
      <div class="modern-modal">
        <div class="modal-header">
          <div class="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="modal-title">Delete Project</h3>
          <p class="modal-description">This action cannot be undone. This will permanently delete the project and remove all associated data.</p>
        </div>

        <div class="modal-content">
          <div class="warning-box">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              <strong>Warning:</strong> All project files, translations, and team data will be permanently lost.
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="btn-cancel">
            Cancel
          </button>
          <button @click="confirmDelete" class="btn-delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Delete Project
          </button>
        </div>
      </div>
    </div>

    <!-- Transfer Ownership Modal -->
    <div v-if="showTransferModal" class="modern-modal-overlay">
      <div class="modern-modal">
        <div class="modal-header">
          <div class="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="modal-title">Transfer Project Ownership</h3>
          <p class="modal-description">Enter the email address of the new owner for this project.</p>
        </div>

        <div class="modal-content">
          <input type="email" v-model="transferToUser" placeholder="Enter email address" class="transfer-input" />
        </div>

        <div class="modal-actions">
          <button @click="showTransferModal = false" class="btn-cancel">
            Cancel
          </button>
          <button @click="confirmTransferInput" class="btn-delete">
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Transfer Ownership Confirmation Modal -->
    <div v-if="showTransferConfirm" class="modern-modal-overlay">
      <div class="modern-modal">
        <div class="modal-header">
          <div class="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="modal-title">Confirm Transfer</h3>
          <p class="modal-description">Are you sure you want to transfer ownership of this project to {{ transferConfirmData?.username }} ({{ transferConfirmData?.email }})?</p>
        </div>

        <div class="modal-content">
          <div class="warning-box">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              <strong>Warning:</strong> This action cannot be undone. You will lose admin privileges.
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showTransferConfirm = false" class="btn-cancel">
            Cancel
          </button>
          <button @click="confirmTransfer" :disabled="isTransferring" class="btn-delete">
            {{ isTransferring ? 'Transferring...' : 'Confirm Transfer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axiosInstance from '../api'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import AppFooter from '../components/AppFooter.vue'
import { useToast } from "vue-toastification";

const route = useRoute()
const router = useRouter()
const toast = useToast();

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
  requestId?: string; // ID of the request this project was synced from
  isSyncedFromRequest?: boolean; // Flag to indicate if project was synced from request
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
const showDeleteConfirm = ref(false);
const showTransferModal = ref(false);
const transferToUser = ref('');
const isTransferring = ref(false);
const showTransferConfirm = ref(false);
const transferConfirmData = ref<{email: string, username: string} | null>(null);

const loadProject = async () => {
  try {
    loading.value = true
    error.value = null
    const projectId = route.params.projectId as string
    const { data } = await axiosInstance.get(`/projects/${projectId}`)
    project.value = data
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
  router.push(`/projects/${project.value?.id}?tab=roles`)
}

const manageFiles = () => {
  router.push(`/projects/${project.value?.id}?tab=files`)
}

const exportProject = () => {
  router.push(`/projects/${project.value?.id}?tab=translation`)
}

const deleteProject = () => {
  showDeleteConfirm.value = true;
}

const confirmDelete = async () => {
  if (!project.value) return;
  try {
    await axiosInstance.delete(`/projects/${project.value.id}`)
    toast.success('Project deleted successfully');
    router.push('/projects')
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || err.message || 'Failed to delete project';
    toast.error(errorMessage);
  } finally {
    showDeleteConfirm.value = false;
  }
};

const transferOwnership = () => {
  // Open transfer ownership modal
  showTransferModal.value = true;
}

const confirmTransferInput = async () => {
  if (!transferToUser.value) return;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(transferToUser.value)) {
    toast.error('Please enter a valid email address');
    return;
  }

  // Go directly to confirmation since we can't verify user existence yet
  transferConfirmData.value = {
    email: transferToUser.value,
    username: transferToUser.value.split('@')[0] // Use email prefix as username
  };
  showTransferModal.value = false;
  showTransferConfirm.value = true;
}

const confirmTransfer = async () => {
  if (!project.value || !transferConfirmData.value) return;

  isTransferring.value = true;

  try {
    await axiosInstance.patch(`/projects/${project.value.id}/transfer-ownership`, {
      email: transferConfirmData.value.email
    });

    toast.success(`Project ownership transferred successfully to ${transferConfirmData.value.username}`);
    showTransferConfirm.value = false;
    transferConfirmData.value = null;
    transferToUser.value = '';

    // Redirect to dashboard since old owner loses access to the project
    router.push('/projects');
  } catch (err: any) {
    // Extract error message from backend response
    let errorMessage = 'Failed to transfer ownership';

    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }

    toast.error(errorMessage);
  } finally {
    isTransferring.value = false;
  }
};

onMounted(() => {
  loadProject()
})
</script>

<style scoped>
/* Page Layout */
.project-manage-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.main-container {
  display: flex;
  flex: 1;
  min-height: 0;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 1.2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  margin-left: 15rem;
}

.project-manage-view {
  max-width: none;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1.2rem;
}

/* Loading and Error States */
.loading,
.error {
  text-align: center;
  padding: 1.8rem 1.2rem;
}

.loading-spinner {
  width: 1.2rem;
  height: 1.2rem;
  border: 1.8px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  margin: 0 auto 0.6rem;
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
  margin-bottom: 1.2rem;
  gap: 1.2rem;
  padding: 1.2rem;
}

.header-info h1 {
  margin: 0 0 0.3rem 0;
  color: #1a202c;
  font-size: 1.2rem;
  font-weight: 600;
}

.subtitle {
  color: #718096;
  margin: 0;
  font-size: 0.66rem;
}

.manage-sections {
  display: grid;
  gap: 1.2rem;
  padding: 0 1.2rem 1.2rem 1.2rem;
}

.manage-section {
  background: white;
  padding: 0.9rem;
  border-radius: 7.2px;
  box-shadow: 0 1.2px 4.8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.manage-section h2 {
  margin: 0 0 0.9rem 0;
  color: #2d3748;
  font-size: 0.75rem;
  font-weight: 600;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.6rem;
}

.overview-item {
  padding: 0.6rem;
  background-color: #f7fafc;
  border-radius: 4.8px;
  border: 1px solid #e2e8f0;
}

.overview-label {
  color: #718096;
  font-size: 0.525rem;
  font-weight: 500;
  margin-bottom: 0.3rem;
}

.overview-value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.12rem;
}

.badge {
  padding: 0.15rem 0.3rem;
  border-radius: 2.4px;
  font-size: 0.45rem;
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
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.9rem;
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4.8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.action-card:hover {
  background-color: #edf2f7;
  transform: translateY(-1.2px);
  box-shadow: 0 2.4px 7.2px rgba(0, 0, 0, 0.1);
}

.action-icon {
  font-size: 1.2rem;
  margin-bottom: 0.6rem;
}

.action-title {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.3rem;
}

.action-description {
  color: #718096;
  font-size: 0.525rem;
  line-height: 1.4;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem;
  background-color: #f7fafc;
  border-radius: 4.8px;
  border: 1px solid #e2e8f0;
}

.activity-icon {
  font-size: 0.9rem;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 0.15rem;
}

.activity-meta {
  color: #718096;
  font-size: 0.525rem;
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
  gap: 0.9rem;
}

.danger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem;
  background-color: white;
  border-radius: 4.8px;
  border: 1px solid #fed7d7;
  gap: 1.2rem;
}

.danger-info h3 {
  margin: 0 0 0.3rem 0;
  color: #c53030;
  font-size: 0.6rem;
  font-weight: 600;
}

.danger-info p {
  margin: 0;
  color: #742a2a;
  font-size: 0.525rem;
  line-height: 1.4;
}

.btn {
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: 4.8px;
  font-size: 0.6rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
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

.btn-delete:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-delete:disabled:hover {
  background-color: #9ca3af;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 0.6rem;
  }

  .manage-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    padding: 0.6rem;
  }

  .manage-sections {
    padding: 0 0.6rem 0.6rem 0.6rem;
  }

  .header-info h1 {
    font-size: 1.05rem;
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
    gap: 0.6rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}

.modern-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modern-modal {
  background: white;
  padding: 1.2rem;
  border-radius: 7.2px;
  box-shadow: 0 1.2px 9.6px rgba(0,0,0,0.2);
  min-width: 180px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.2rem;
}

.modal-icon {
  width: 48px;
  height: 48px;
  background-color: #fef3f2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.6rem;
}

.modal-icon svg {
  fill: #ef4444;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.3rem;
}

.modal-description {
  font-size: 0.6rem;
  color: #718096;
  margin-bottom: 1.2rem;
}

.modal-content {
  margin-bottom: 1.2rem;
  padding: 0.9rem;
  background-color: #fffbeb;
  border-radius: 4.8px;
  border: 1px solid #fcd34d;
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #92400e;
}

.warning-icon {
  font-size: 1.2rem;
}

.warning-text {
  font-size: 0.525rem;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
}

.btn-cancel {
  flex: 1;
  padding: 0.45rem 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 4.8px;
  font-size: 0.6rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  color: #4a5568;
  background-color: #edf2f7;
}

.btn-cancel:hover {
  background-color: #e2e8f0;
  border-color: #cbd5e0;
}

.btn-delete {
  flex: 1;
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: 4.8px;
  font-size: 0.6rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  color: white;
  background-color: #ef4444;
}

.btn-delete:hover {
  background-color: #dc2626;
}

.btn-delete:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-delete:disabled:hover {
  background-color: #9ca3af;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(90deg, #e2e8f0 60%, #c3cfe2 100%);
  color: #22577a;
  border-radius: 9.6px;
  padding: 0.15rem 0.6rem 0.15rem 0.42rem;
  margin: 0.12rem 0.3rem 0.12rem 0;
  font-size: 0.57rem;
  font-weight: 600;
  box-shadow: 0 1.2px 4.8px rgba(66,153,225,0.07);
  border: 0.9px solid #b5c7d3;
  transition: background 0.2s;
}

.tag-badge .tag-icon {
  margin-right: 0.24em;
  color: #4299e1;
  font-size: 0.66em;
}

.transfer-input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 4.8px;
  font-size: 0.6rem;
  margin-bottom: 1.2rem;
  box-sizing: border-box;
}

.transfer-input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 2px #4299e1;
}
</style>
