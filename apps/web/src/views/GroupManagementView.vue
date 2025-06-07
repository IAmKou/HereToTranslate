<template>
  <div class="group-management">
    <h1 class="page-title">Project Group Management</h1>
    
    <!-- Project Selector -->
    <div class="filter-section">
      <label for="projectFilter">Filter by Project:</label>
      <select 
        id="projectFilter" 
        v-model="selectedProjectId"
        @change="loadGroups"
        class="select-input"
      >
        <option :value="null">All Projects</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">
          {{ project.name }}
        </option>
      </select>
    </div>

    <!-- Create/Edit Group Form -->
    <div class="form-section">
      <h2>{{ editMode ? 'Edit Project Group' : 'Create New Project Group' }}</h2>
      <form @submit.prevent="saveGroup" class="group-form">
        <div class="form-group">
          <label for="groupName">Group Name:</label>
          <input 
            id="groupName" 
            v-model="groupForm.name" 
            type="text" 
            required 
            class="text-input"
          />
        </div>
        
        <div class="form-group" v-if="!editMode">
          <label for="projectId">Project:</label>
          <select 
            id="projectId" 
            v-model="groupForm.project_id" 
            required 
            class="select-input"
          >
            <option value="" disabled>Select a Project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="material-icons">{{ editMode ? 'update' : 'add_circle' }}</span>
            {{ editMode ? 'Update' : 'Create' }}
          </button>
          <button v-if="editMode" type="button" @click="cancelEdit" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>

    <!-- Groups List -->
    <div class="groups-section">
      <h2>Project Groups</h2>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="groups.length === 0" class="no-data">
        <span class="material-icons" style="font-size: 3rem; opacity: 0.5; display: block; margin-bottom: 1rem;">
          groups
        </span>
        No project groups found
        <p v-if="selectedProjectId">Try selecting a different project or create a new group.</p>
        <p v-else>Create your first project group using the form above.</p>
      </div>
      <div v-else class="groups-list">
        <div v-for="group in groups" :key="group.id" class="group-card">
          <div class="group-header">
            <h3>{{ group.name }}</h3>
            <div class="group-actions">
              <button @click="editGroup(group)" class="btn-icon">
                <span class="material-icons">edit</span>
              </button>
              <button @click="confirmDeleteGroup(group)" class="btn-icon btn-danger">
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>
          
          <div class="group-details">
            <p><strong>Project:</strong> {{ group.project.name }}</p>
            
            <!-- Members List -->
            <div class="members-section">
              <h4>Members <span>({{ group.members?.length || 0 }})</span></h4>
              <ul class="members-list">
                <li v-for="member in group.members" :key="member.id" class="member-item">
                  <div class="member-info">
                    <span>{{ member.user.fullName }}</span>
                    <small>{{ member.user.email }}</small>
                  </div>
                  <button @click="confirmRemoveMember(group.id, member.user.id)" class="btn-icon btn-small">
                    <span class="material-icons">person_remove</span>
                  </button>
                </li>
              </ul>
              
              <!-- Add Member Form -->
              <div class="add-member-form">
                <select 
                  v-model="newMemberIds[group.id]" 
                  class="select-input"
                >
                  <option :value="null" disabled>Select User</option>
                  <option v-for="user in availableUsers(group)" :key="user.id" :value="user.id">
                    {{ user.fullName }} ({{ user.email }})
                  </option>
                </select>
                <button 
                  @click="addMember(group.id)" 
                  :disabled="!newMemberIds[group.id]" 
                  class="btn btn-small"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirm" class="modal-overlay">
      <div class="modal-dialog">
        <h3>{{ confirmTitle }}</h3>
        <p>{{ confirmMessage }}</p>
        <div class="modal-actions">
          <button @click="confirmAction" class="btn btn-danger">Confirm</button>
          <button @click="cancelConfirm" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { groupService, Group, CreateGroupRequest } from '../services/group.service';
import { projectService, Project } from '../services/project.service';
import { userService, User } from '../services/user.service';

// State
const groups = ref<Group[]>([]);
const projects = ref<Project[]>([]);
const users = ref<User[]>([]);
const loading = ref(true);
const editMode = ref(false);
const selectedProjectId = ref<number | null>(null);

// Form state
const groupForm = ref<CreateGroupRequest>({
  name: '',
  project_id: 0
});

// Replace the single newMemberId ref
const newMemberIds = ref<Record<number, number | null>>({});

// Current editing group id
const currentGroupId = ref<number | null>(null);

// Confirmation dialog
const showConfirm = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmCallback = ref<() => void>(() => {});

// Load data
onMounted(async () => {
  try {
    await Promise.all([
      loadGroups(),
      loadProjects(),
      loadUsers()
    ]);
  } finally {
    loading.value = false;
  }
});

// Functions
async function loadGroups() {
  try {
    groups.value = await groupService.getGroups(selectedProjectId.value || undefined);
  } catch (error) {
    console.error('Failed to load groups:', error);
  }
}

async function loadProjects() {
  try {
    projects.value = await projectService.getProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

async function loadUsers() {
  try {
    users.value = await userService.getUsers();
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

function editGroup(group: Group) {
  editMode.value = true;
  currentGroupId.value = group.id;
  groupForm.value = {
    name: group.name,
    project_id: group.project.id
  };
}

function cancelEdit() {
  editMode.value = false;
  currentGroupId.value = null;
  groupForm.value = {
    name: '',
    project_id: 0
  };
}

async function saveGroup() {
  try {
    if (editMode.value && currentGroupId.value) {
      await groupService.updateGroup(currentGroupId.value, { name: groupForm.value.name });
    } else {
      await groupService.createGroup(groupForm.value);
    }
    
    // Reset form and reload data
    cancelEdit();
    await loadGroups();
  } catch (error) {
    console.error('Failed to save group:', error);
    alert('Failed to save group');
  }
}

function confirmDeleteGroup(group: Group) {
  confirmTitle.value = 'Delete Project Group';
  confirmMessage.value = `Are you sure you want to delete the group "${group.name}"?`;
  confirmCallback.value = async () => {
    try {
      await groupService.deleteGroup(group.id);
      await loadGroups();
      cancelConfirm();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group');
    }
  };
  showConfirm.value = true;
}

function confirmRemoveMember(groupId: number, userId: number) {
  const member = groups.value
    .find(g => g.id === groupId)?.members
    ?.find(m => m.user.id === userId);
  
  if (!member) return;
  
  confirmTitle.value = 'Remove Member';
  confirmMessage.value = `Are you sure you want to remove ${member.user.fullName} from this group?`;
  confirmCallback.value = async () => {
    try {
      await groupService.removeMember(groupId, userId);
      await loadGroups();
      cancelConfirm();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    }
  };
  showConfirm.value = true;
}

async function addMember(groupId: number) {
  const selectedUserId = newMemberIds.value[groupId];
  if (!selectedUserId) return;
  
  try {
    await groupService.addMember(groupId, { userId: selectedUserId });
    // Reset only this group's selection
    newMemberIds.value[groupId] = null;
    await loadGroups();
  } catch (error) {
    console.error('Failed to add member:', error);
    alert('Failed to add member');
  }
}

function confirmAction() {
  confirmCallback.value();
}

function cancelConfirm() {
  showConfirm.value = false;
  confirmTitle.value = '';
  confirmMessage.value = '';
  confirmCallback.value = () => {};
}

// Computed
function availableUsers(group: Group) {
  const currentMemberIds = (group.members || []).map(m => m.user.id);
  return users.value.filter(user => !currentMemberIds.includes(user.id));
}
</script>

<style scoped>
.group-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

.page-title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #1e40af;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.75rem;
}

.filter-section {
  margin-bottom: 2rem;
  background-color: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.form-section {
  background-color: #f0f9ff;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border-left: 4px solid #3b82f6;
}

.form-section h2 {
  margin-top: 0;
  color: #1e40af;
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
}

.group-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #4b5563;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.groups-section {
  margin-top: 2rem;
}

.groups-section h2 {
  color: #1e40af;
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.groups-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.group-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #e5e7eb;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
}

.group-header {
  background-color: #f1f5f9;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.group-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1e3a8a;
}

.group-details {
  padding: 1.25rem;
}

.group-details p {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #4b5563;
}

.group-actions {
  display: flex;
  gap: 0.5rem;
}

.members-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.members-section h4 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4b5563;
}

.members-section h4 span {
  font-size: 0.875rem;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.members-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.member-item:last-child {
  border-bottom: none;
}

.member-item:hover {
  background-color: #f9fafb;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-info span {
  font-weight: 500;
}

.member-info small {
  color: #6b7280;
  font-size: 0.75rem;
}

.add-member-form {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 6px;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

/* Inputs */
.text-input, .select-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  flex: 1;
}

.text-input:focus, .select-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.select-input {
  min-width: 200px;
  background-color: white;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #4b5563;
}

.btn-secondary:hover {
  background-color: #d1d5db;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background-color: #f9fafb;
  transition: background-color 0.2s, color 0.2s;
}

.btn-icon:hover {
  background-color: #f3f4f6;
}

.btn-icon.btn-danger {
  color: #ef4444;
}

.btn-icon.btn-danger:hover {
  background-color: #fee2e2;
}

.btn-icon.btn-small {
  width: 28px;
  height: 28px;
}

/* States */
.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  font-style: italic;
}

.no-data {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
  font-style: italic;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-dialog {
  background-color: white;
  padding: 1.75rem;
  border-radius: 8px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  animation: modalFadeIn 0.2s ease-out;
}

.modal-dialog h3 {
  margin-top: 0;
  color: #1e3a8a;
  font-size: 1.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.75rem;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .groups-list {
    grid-template-columns: 1fr;
  }
  
  .group-management {
    padding: 1rem;
  }
  
  .add-member-form {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>