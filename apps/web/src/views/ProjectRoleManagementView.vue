<template>
  <div class="role-management-page">
    <Navbar />
    <div class="main-container">
      <Sidebar />
      <div class="content-wrapper">
        <div class="role-management-view">
          <h1>Project Role Management</h1>
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            Loading roles...
          </div>
          <div v-else-if="error" class="error-container">
            <div class="error-content">
              <div class="error-icon">⚠️</div>
              <h3>Error</h3>
              <p>{{ error }}</p>
            </div>
          </div>
          <div v-else>
            <div class="roles-header">
              <h2>Roles</h2>
              <button class="btn btn-primary" @click="showCreateRoleModal = true">
                <span class="icon">➕</span> Add Role
              </button>
            </div>
            <div v-if="roles.length === 0" class="empty-section">
              <p>No roles defined for this project.</p>
              <button class="btn btn-primary" @click="showCreateRoleModal = true">Create First Role</button>
            </div>
            <table v-else class="roles-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="role in roles" :key="role.id">
                  <td>{{ role.name }}</td>
                  <td>{{ formatPermissions(role.permissionFlags) }}</td>
                  <td>
                    <button class="btn btn-outline btn-sm" @click="openEditRole(role)">Edit</button>
                    <button class="btn btn-danger btn-sm" @click="deleteRole(role.id)">Delete</button>
                    <button class="btn btn-primary btn-sm" @click="viewRoleUsers(role)">Users</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="selectedRole" class="role-users-section">
              <h3>Users in Role: {{ selectedRole.name }}</h3>
              <button class="btn btn-secondary btn-sm" @click="selectedRole = null">Back to Roles</button>
              <div v-if="roleUsersLoading" class="loading">Loading users...</div>
              <div v-else-if="roleUsersError" class="error">{{ roleUsersError }}</div>
              <table v-else class="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in roleUsers" :key="user.id">
                    <td>{{ user.fullName || '-' }}</td>
                    <td>{{ user.username }}</td>
                    <td>
                      <button class="btn btn-danger btn-sm" @click="removeUserFromRole(user.id)">Remove</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="add-user-to-role">
                <input v-model="addUserIdentifier" placeholder="User ID or email" />
                <button class="btn btn-primary btn-sm" @click="addUserToRole">Add User</button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="showCreateRoleModal" class="modal-overlay" @click.self="showCreateRoleModal = false">
          <div class="modal-content">
            <h3>{{ editingRole ? 'Edit Role' : 'Create Role' }}</h3>
            <form @submit.prevent="editingRole ? updateRole() : createRole()">
              <input v-model="roleForm.name" placeholder="Role Name" required />
              <input v-model="roleForm.permissionFlags" placeholder="Permission Flags (number)" required />
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showCreateRoleModal = false">Cancel</button>
                <button type="submit" class="btn btn-primary">{{ editingRole ? 'Update' : 'Create' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import AppFooter from '../components/AppFooter.vue';

const route = useRoute();
const projectId = route.params.projectId as string;

const loading = ref(true);
const error = ref('');
const roles = ref<any[]>([]);
const showCreateRoleModal = ref(false);
const editingRole = ref(false);
interface RoleForm {
  name: string;
  permissionFlags: string;
  id?: string;
}
const roleForm = ref<RoleForm>({ name: '', permissionFlags: '' });
const selectedRole = ref<any>(null);
const roleUsers = ref<any[]>([]);
const roleUsersLoading = ref(false);
const roleUsersError = ref('');
const addUserIdentifier = ref('');

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const response = await fetch(`/api${endpoint}`, { ...options, headers });
  if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
  return response.json();
};

const loadRoles = async () => {
  loading.value = true;
  error.value = '';
  try {
    roles.value = await apiCall(`/projects/${projectId}/roles`);
  } catch (err: any) {
    error.value = err.message || 'Failed to load roles';
  } finally {
    loading.value = false;
  }
};

const createRole = async () => {
  try {
    await apiCall(`/projects/${projectId}/roles/create`, {
      method: 'POST',
      body: JSON.stringify(roleForm.value),
    });
    showCreateRoleModal.value = false;
    roleForm.value = { name: '', permissionFlags: '' };
    await loadRoles();
  } catch (err: any) {
    alert('Failed to create role: ' + err.message);
  }
};

const openEditRole = (role: any) => {
  editingRole.value = true;
  showCreateRoleModal.value = true;
  roleForm.value = { name: role.name, permissionFlags: role.permissionFlags, id: role.id };
};

const updateRole = async () => {
  try {
    await apiCall(`/projects/${projectId}/roles/${roleForm.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(roleForm.value),
    });
    showCreateRoleModal.value = false;
    editingRole.value = false;
    roleForm.value = { name: '', permissionFlags: '' };
    await loadRoles();
  } catch (err: any) {
    alert('Failed to update role: ' + err.message);
  }
};

const deleteRole = async (roleId: string) => {
  if (!confirm('Are you sure you want to delete this role?')) return;
  try {
    await apiCall(`/projects/${projectId}/roles/${roleId}`, { method: 'DELETE' });
    await loadRoles();
  } catch (err: any) {
    alert('Failed to delete role: ' + err.message);
  }
};

const viewRoleUsers = async (role: any) => {
  selectedRole.value = role;
  roleUsersLoading.value = true;
  roleUsersError.value = '';
  try {
    roleUsers.value = await apiCall(`/projects/${projectId}/roles/${role.id}/users`);
  } catch (err: any) {
    roleUsersError.value = err.message || 'Failed to load users in role';
  } finally {
    roleUsersLoading.value = false;
  }
};

const addUserToRole = async () => {
  if (!selectedRole.value) return;
  try {
    await apiCall(`/projects/${projectId}/roles/${selectedRole.value.id}/users/add`, {
      method: 'POST',
      body: JSON.stringify({ userIds: [addUserIdentifier.value] }),
    });
    addUserIdentifier.value = '';
    await viewRoleUsers(selectedRole.value);
  } catch (err: any) {
    alert('Failed to add user: ' + err.message);
  }
};

const removeUserFromRole = async (userId: string) => {
  if (!selectedRole.value) return;
  try {
    await apiCall(`/projects/${projectId}/roles/${selectedRole.value.id}/users/remove`, {
      method: 'POST',
      body: JSON.stringify({ userIds: [userId] }),
    });
    await viewRoleUsers(selectedRole.value);
  } catch (err: any) {
    alert('Failed to remove user: ' + err.message);
  }
};

const formatPermissions = (flags: string) => flags;

onMounted(() => {
  loadRoles();
});
</script>

<style scoped>
.role-management-page { min-height: 100vh; display: flex; flex-direction: column; }
.main-container { display: flex; flex: 1; }
.content-wrapper { flex: 1; padding: 2rem; }
.role-management-view { max-width: 1200px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); padding: 2rem; }
.roles-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.roles-table, .users-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
.roles-table th, .roles-table td, .users-table th, .users-table td { border: 1px solid #e2e8f0; padding: 0.75rem 1rem; text-align: left; }
.btn { padding: 0.5rem 1rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #4299e1; color: white; border: none; }
.btn-primary:hover { background: #3182ce; }
.btn-outline { background: none; color: #4299e1; border: 2px solid #4299e1; }
.btn-outline:hover { background: #4299e1; color: white; }
.btn-danger { background: #e53e3e; color: white; border: none; }
.btn-danger:hover { background: #c53030; }
.btn-secondary { background: #e2e8f0; color: #2d3748; border: none; }
.btn-sm { font-size: 0.95rem; padding: 0.4rem 0.8rem; }
.loading-container { display: flex; align-items: center; justify-content: center; min-height: 200px; }
.loading-spinner { width: 2rem; height: 2rem; border: 3px solid #e2e8f0; border-radius: 50%; border-top-color: #4299e1; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-container { display: flex; align-items: center; justify-content: center; min-height: 200px; }
.error-content { text-align: center; }
.error-icon { font-size: 2rem; margin-bottom: 1rem; }
.empty-section { text-align: center; padding: 2rem; color: #718096; }
.role-users-section { background: #f8fafc; border-radius: 12px; padding: 1.5rem; margin-top: 2rem; }
.add-user-to-role { display: flex; gap: 1rem; margin-top: 1rem; }
.add-user-to-role input { flex: 1; padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 16px; padding: 2rem; min-width: 320px; max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
</style>
