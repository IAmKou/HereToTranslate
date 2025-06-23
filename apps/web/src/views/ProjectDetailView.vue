<template>
  <div class="project-detail-view">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Loading project...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadProject" class="btn btn-secondary">Try Again</button>
    </div>

    <div v-else-if="project" class="project-content">
      <!-- Project Header -->
      <div class="project-header">
        <div class="project-info">
          <h1>{{ project.name }}</h1>
          <div class="project-meta">
            <span v-if="project.isPublic" class="badge badge-public">Public</span>
            <span v-else class="badge badge-private">Private</span>
            <span class="created-by">Created by {{ project.createdBy.username }}</span>
            <span class="created-date">{{ formatDate(project.createdAt) }}</span>
          </div>
        </div>
        <div class="project-actions">
          <button @click="editProject" class="btn btn-outline">
            <span class="icon">✏️</span>
            Edit Project
          </button>
          <button @click="deleteProject" class="btn btn-danger">
            <span class="icon">🗑️</span>
            Delete Project
          </button>
        </div>
      </div>

      <!-- Project Description -->
      <div class="project-section">
        <h2>Description</h2>
        <p v-if="project.description" class="description">
          {{ project.description }}
        </p>
        <p v-else class="no-description">
          No description provided for this project.
        </p>
      </div>

      <!-- Project Tags -->
      <div v-if="project.tags && project.tags.length > 0" class="project-section">
        <h2>Tags</h2>
        <div class="tags">
          <span
            v-for="tag in project.tags"
            :key="tag.id"
            class="tag"
          >
            {{ tag.name }}
          </span>
        </div>
      </div>

      <!-- Project Statistics -->
      <div class="project-stats">
        <div class="stat-card">
          <div class="stat-number">{{ project.projectRoles?.length || 0 }}</div>
          <div class="stat-label">Roles</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ project.groups?.length || 0 }}</div>
          <div class="stat-label">Groups</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">Files</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">Branches</div>
        </div>
      </div>

      <!-- Management Sections -->
      <div class="management-sections">
        <!-- Add User to Project Section -->
        <div class="management-section">
          <div class="section-header">
            <h2>Add User to Project</h2>
          </div>
          <form @submit.prevent="searchUser" class="add-user-form">
            <div class="form-group">
              <label for="userIdentifier">Search by Email or Name</label>
              <input
                id="userIdentifier"
                v-model="userSearch.identifier"
                type="text"
                required
                class="form-control"
                placeholder="Enter email or full name"
              />
            </div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary" :disabled="userSearch.loading">
                {{ userSearch.loading ? 'Searching...' : 'Search User' }}
              </button>
            </div>
          </form>
          <div v-if="userSearch.error" class="error" style="margin-top: 1rem;">
            <p>{{ userSearch.error }}</p>
          </div>
          <div v-if="userSearch.result" class="found-user" style="margin-top: 1rem;">
            <div class="user-info">
              <span><b>{{ userSearch.result.fullName || userSearch.result.username }}</b> ({{ userSearch.result.email }})</span>
              <button class="btn btn-primary btn-sm" @click="addUserToProject" :disabled="userSearch.adding">
                {{ userSearch.adding ? 'Adding...' : 'Add to Project' }}
              </button>
            </div>
          </div>
        </div>
        <!-- Roles Management -->
        <div class="management-section">
          <div class="section-header">
            <h2>Project Roles</h2>
            <button @click="showCreateRoleModal = true" class="btn btn-primary">
              <span class="icon">+</span>
              Add Role
            </button>
          </div>
          <div v-if="project.projectRoles && project.projectRoles.length > 0" class="roles-list">
            <div
              v-for="role in project.projectRoles"
              :key="role.id"
              class="role-item"
            >
              <div class="role-info">
                <h3>{{ role.name }}</h3>
                <span class="permissions">Permissions: {{ formatPermissions(role.permissionFlags) }}</span>
              </div>
              <div class="role-actions">
                <button @click="editRole(role)" class="btn btn-sm btn-outline">Edit</button>
                <button @click="deleteRole(role.id)" class="btn btn-sm btn-danger">Delete</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-section">
            <p>No roles defined for this project.</p>
            <button @click="showCreateRoleModal = true" class="btn btn-primary">Create First Role</button>
          </div>
        </div>

        <!-- Groups Management -->
        <div class="management-section">
          <div class="section-header">
            <h2>Project Groups</h2>
            <button @click="showCreateGroupModal = true" class="btn btn-primary">
              <span class="icon">+</span>
              Add Group
            </button>
          </div>
          <div v-if="project.groups && project.groups.length > 0" class="groups-list">
            <div
              v-for="group in project.groups"
              :key="group.id"
              class="group-item"
            >
              <div class="group-info">
                <h3>{{ group.name }}</h3>
                <span class="permissions">Permissions: {{ formatPermissions(group.permissionFlags) }}</span>
                <span v-if="group.members" class="members-count">
                  {{ group.members.length }} member{{ group.members.length !== 1 ? 's' : '' }}
                </span>
              </div>
              <div class="group-actions">
                <button @click="editGroup(group)" class="btn btn-sm btn-outline">Edit</button>
                <button @click="deleteGroup(group.id)" class="btn btn-sm btn-danger">Delete</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-section">
            <p>No groups defined for this project.</p>
            <button @click="showCreateGroupModal = true" class="btn btn-primary">Create First Group</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Role Modal -->
    <div v-if="showCreateRoleModal" class="modal-overlay" @click.self="showCreateRoleModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create New Role</h3>
          <button class="close-button" @click="showCreateRoleModal = false">&times;</button>
        </div>
        <form @submit.prevent="createRole">
          <div class="form-group">
            <label for="roleName">Role Name</label>
            <input
              id="roleName"
              v-model="newRole.name"
              type="text"
              required
              class="form-control"
              placeholder="Enter role name"
            />
          </div>
          <div class="form-group">
            <label>Permissions</label>
            <div class="permissions-list">
              <div
                v-for="perm in availablePermissions"
                :key="perm"
                class="checkbox-item"
              >
                <input
                  type="checkbox"
                  :id="perm"
                  :value="perm"
                  v-model="selectedPermissions"
                />
                <label :for="perm">{{ perm }}</label>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-secondary"
              @click="showCreateRoleModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isCreatingRole"
            >
              {{ isCreatingRole ? "Creating..." : "Create Role" }}
            </button>
          </div>
        </form>
      </div>
    </div>


    <!-- Create Group Modal -->
    <div v-if="showCreateGroupModal" class="modal-overlay" @click.self="showCreateGroupModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create New Group</h3>
          <button class="close-button" @click="showCreateGroupModal = false">&times;</button>
        </div>
        <form @submit.prevent="createGroup">
          <div class="form-group">
            <label for="groupName">Group Name</label>
            <input
              id="groupName"
              v-model="newGroup.name"
              type="text"
              required
              class="form-control"
              placeholder="Enter group name"
            >
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showCreateGroupModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isCreatingGroup">
              {{ isCreatingGroup ? 'Creating...' : 'Create Group' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '../services/auth.service'
import { PermissionFlags, PermissionStrings } from '@here-to-translate/common';

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

interface CreateRoleData {
  name: string;
  permissions: string;
}

interface CreateGroupData {
  name: string;
}

const project = ref<Project | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedPermissions = ref<PermissionStrings[]>([]);
const availablePermissions = Object.keys(PermissionFlags).filter(
  (key) =>
    typeof PermissionFlags[key as PermissionStrings] === "bigint" && key !== "None"
) as PermissionStrings[];

// Modal states
const showCreateRoleModal = ref(false)
const showCreateGroupModal = ref(false)
const isCreatingRole = ref(false)
const isCreatingGroup = ref(false)

// Form data
const newRole = ref<CreateRoleData>({
  name: '',
  permissions: ''
})

const newGroup = ref<CreateGroupData>({
  name: '',
})

// User search/add state
const userSearch = ref({
  identifier: '',
  loading: false,
  error: '',
  result: null as null | { id: string; username: string; fullName?: string; email: string },
  adding: false
})

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
    day: 'numeric'
  })
}

const formatPermissions = (permissions: string) => {
  // This is a simplified version - you might want to decode the permission flags
  return permissions
}

const editProject = () => {
  router.push(`/projects/${project.value?.id}/edit`)
}

const deleteProject = async () => {
  if (!project.value || !confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
    return
  }

  try {
    await apiCall(`/projects/${project.value.id}`, { method: 'DELETE' })
    alert('Project deleted successfully!')
    router.push('/projects')
  } catch (err: any) {
    alert('Failed to delete project: ' + err.message)
  }
}

const createRole = async () => {
  if (!project.value) return;

  isCreatingRole.value = true;

  try {
    const permissionValue = selectedPermissions.value.reduce((acc, key) => {
      return acc | PermissionFlags[key as PermissionStrings];
    }, 0n);

    await apiCall(`/projects/${project.value.id}/roles/create`, {
      method: "POST",
      body: JSON.stringify({
        name: newRole.value.name,
        permissionFlags: permissionValue.toString()
      })
    });
    await loadProject();
    showCreateRoleModal.value = false;
    newRole.value = { name: '', permissions: '' };
    selectedPermissions.value = []; // Reset
  } catch (err: any) {
    alert("Failed to create role: " + err.message);
  } finally {
    isCreatingRole.value = false;
  }
};


const createGroup = async () => {
  if (!project.value) return

  isCreatingGroup.value = true
  try {
    await apiCall(`/projects/${project.value.id}/groups/create`, {
      method: 'POST',
      body: JSON.stringify(newGroup.value)
    })
    await loadProject() // Reload project to get updated groups
    showCreateGroupModal.value = false
    newGroup.value = { name: ''}
  } catch (err: any) {
    alert('Failed to create group: ' + err.message)
  } finally {
    isCreatingGroup.value = false
  }
}

const editRole = (role: any) => {
  // Navigate to role edit page or open edit modal
  console.log('Edit role:', role)
}

const deleteRole = async (roleId: string) => {
  if (!project.value || !confirm('Are you sure you want to delete this role?')) {
    return
  }

  try {
    await apiCall(`/projects/${project.value.id}/roles/${roleId}`, { method: 'DELETE' })
    await loadProject() // Reload project to get updated roles
  } catch (err: any) {
    alert('Failed to delete role: ' + err.message)
  }
}

const editGroup = (group: any) => {
  // Navigate to group edit page or open edit modal
  console.log('Edit group:', group)
}

const deleteGroup = async (groupId: string) => {
  if (!project.value || !confirm('Are you sure you want to delete this group?')) {
    return
  }

  try {
    await apiCall(`/projects/${project.value.id}/groups/${groupId}`, { method: 'DELETE' })
    await loadProject() // Reload project to get updated groups
  } catch (err: any) {
    alert('Failed to delete group: ' + err.message)
  }
}

const searchUser = async () => {
  if (!project.value) return;
  userSearch.value.loading = true;
  userSearch.value.error = '';
  userSearch.value.result = null;
  try {
    const res = await apiCall(`/projects/${project.value.id}/search-user`, {
      method: 'POST',
      body: JSON.stringify({ identifier: userSearch.value.identifier })
    });
    if (res.user) {
      userSearch.value.result = res.user;
    } else {
      userSearch.value.error = 'No user found.';
    }
  } catch (err: any) {
    userSearch.value.error = err.message || 'Failed to search user.';
  } finally {
    userSearch.value.loading = false;
  }
}

const addUserToProject = async () => {
  if (!project.value || !userSearch.value.result) return;
  userSearch.value.adding = true;
  try {
    await apiCall(`/projects/${project.value.id}/add-user`, {
      method: 'POST',
      body: JSON.stringify({ identifier: userSearch.value.result.email })
    });
    await loadProject();
    alert('User added to project!');
    userSearch.value.result = null;
    userSearch.value.identifier = '';
  } catch (err: any) {
    alert('Failed to add user: ' + err.message);
  } finally {
    userSearch.value.adding = false;
  }
}

onMounted(() => {
  loadProject()
})
</script>

<style scoped>
.project-detail-view {
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

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.project-info h1 {
  margin: 0 0 1rem 0;
  color: #1a202c;
  font-size: 2.5rem;
  font-weight: 700;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
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

.created-by,
.created-date {
  color: #718096;
  font-size: 0.875rem;
}

.project-actions {
  display: flex;
  gap: 1rem;
}

.project-section {
  margin-bottom: 2rem;
}

.project-section h2 {
  color: #2d3748;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.description {
  color: #4a5568;
  line-height: 1.6;
  font-size: 1rem;
}

.no-description {
  color: #a0aec0;
  font-style: italic;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.5rem 0.75rem;
  background-color: #edf2f7;
  color: #4a5568;
  border-radius: 6px;
  font-size: 0.875rem;
}

.project-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #4299e1;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #718096;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.management-sections {
  display: grid;
  gap: 2rem;
}

.management-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
}

.roles-list,
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-item,
.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.role-info,
.group-info h3 {
  margin: 0 0 0.25rem 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.permissions {
  color: #718096;
  font-size: 0.875rem;
}

.members-count {
  color: #4299e1;
  font-size: 0.875rem;
  font-weight: 500;
}

.role-actions,
.group-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-section {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.empty-section p {
  margin: 0 0 1rem 0;
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

.btn-primary {
  background-color: #4299e1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3182ce;
}

.btn-secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background-color: #cbd5e0;
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

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.icon {
  font-size: 1rem;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #718096;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #f7fafc;
  color: #2d3748;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  color: #2d3748;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background-color: #f8fafc;
  color: #2d3748;
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  background-color: white;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .project-detail-view {
    padding: 1rem;
  }

  .project-header {
    flex-direction: column;
    align-items: stretch;
  }

  .project-info h1 {
    font-size: 2rem;
  }

  .project-actions {
    justify-content: stretch;
  }

  .project-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .role-item,
  .group-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .role-actions,
  .group-actions {
    justify-content: center;
  }
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.add-user-form {
  margin-bottom: 1rem;
}
.found-user {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
