<template>
  <div class="user-management">
    <h1 class="page-title">User Management</h1>
    
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading users...</p>
    </div>
    
    <!-- Error state -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="loadUsers" class="retry-button">Retry</button>
    </div>
    
    <!-- User table (View list of accounts) -->
    <div v-if="!loading && !error" class="user-table-container">
      <div class="table-controls">
        <div class="search-box">
          <input type="text" v-model="searchQuery" placeholder="Search users..." class="search-input">
          <span class="search-icon">🔍</span>
        </div>
      </div>
      <table class="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(user, index) in filteredUsers" :key="String(user.id)" 
              @click="selectUser(user)" 
              :class="{ 'selected-row': selectedUser?.id === user.id, 'row-even': index % 2 === 0 }">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.fullName }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.phone || '-' }}</td>
            <td>
              <span class="role-badge" :class="getRoleBadgeClass(user.role.name)">
                {{ user.role.name }}
              </span>
            </td>
            <td>
              <span class="status-indicator" :class="user.isActive ? 'active' : 'inactive'">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="actions-cell">
              <button @click.stop="openRoleModal(user)" class="edit-button">
                <span class="button-icon">✏️</span>
                <span>Edit Role</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="table-pagination">
        <button @click="prevPage" :disabled="currentPage === 1" class="pagination-button">Previous</button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-button">Next</button>
      </div>
    </div>
    
    <!-- User Detail Sidebar (View user detail) -->
    <div v-if="selectedUser" class="user-detail-sidebar" :class="{ 'is-open': selectedUser }">
      <div class="sidebar-header">
        <h2>User Details</h2>
        <button @click="selectedUser = null" class="close-button">×</button>
      </div>
      
      <div class="user-details">
        <div class="avatar-section">
          <div class="user-avatar">
            {{ getUserInitials(selectedUser) }}
          </div>
          <h3>{{ selectedUser.fullName }}</h3>
          <p class="role-badge" :class="{'admin-role': selectedUser.role.name === 'ADMIN'}">
            {{ selectedUser.role.name }}
          </p>
        </div>
        
        <div class="detail-section">
          <div class="detail-item">
            <span class="detail-label">Username:</span>
            <span class="detail-value">{{ selectedUser.username }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email:</span>
            <span class="detail-value">{{ selectedUser.email }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">{{ selectedUser.phone }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status:</span>
            <span class="detail-value">{{ selectedUser.isActive ? 'Active' : 'Inactive' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created:</span>
            <span class="detail-value">{{ formatDate(selectedUser.createdAt) }}</span>
          </div>
        </div>
        
        <div class="action-section">
          <button @click="openRoleModal(selectedUser)" class="action-button">
            Change Role
          </button>
        </div>
      </div>
    </div>
    
    <!-- Edit Role Modal -->
    <div v-if="showRoleModal" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Edit User Role</h3>
          <button @click="showRoleModal = false" class="close-button">×</button>
        </div>
        
        <div class="modal-body">
          <p>Change role for user: <strong>{{ userToEdit?.fullName }}</strong></p>
          
          <div class="form-group">
            <label for="role-select">Select Role:</label>
            <div v-if="rolesLoading" class="loading-indicator">Loading roles...</div>
            <select v-else id="role-select" v-model="selectedRoleId" class="role-select">
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="showRoleModal = false" class="cancel-button">Cancel</button>
          <button 
            @click="updateRole" 
            class="save-button"
            :disabled="updateLoading || selectedRoleId === userToEdit?.role.id"
          >
            <span v-if="updateLoading" class="button-spinner"></span>
            <span>{{ updateLoading ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Admin Navigation Link (for Sidebar.vue) -->
    <router-link 
      v-if="isAdmin" 
      to="/admin/users" 
      class="menu-item"
    >
      <span class="material-icons">manage_accounts</span>
      <span>User Management</span>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { userService, User } from '../services/user.service';
import { authService } from '../services/auth.service';

// State
const users = ref<User[]>([]);
const loading = ref(false);
const error = ref('');
const selectedUser = ref<User | null>(null);
const showRoleModal = ref(false);
const userToEdit = ref<User | null>(null);
const selectedRoleId = ref<number | null>(null);
const updateLoading = ref(false);
const roles = ref<{id: number, name: string}[]>([]);
const rolesLoading = ref(false);
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;

// Computed property for admin check
const isAdmin = computed(() => {
  return authService.getUser()?.role === 'admin';
});

// Computed property for filtered users
const filteredUsers = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const filtered = users.value.filter(user => 
    user.username.toLowerCase().includes(query) ||
    user.fullName.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query)
  );
  
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filtered.slice(start, end);
});

// Computed property for total pages
const totalPages = computed(() => {
  const filtered = users.value.filter(user => {
    const query = searchQuery.value.toLowerCase();
    return user.username.toLowerCase().includes(query) ||
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query);
  });
  return Math.ceil(filtered.length / itemsPerPage);
});

// Load users on component mount
onMounted(() => {
  loadUsers();
  loadRoles();
});

// Methods
const loadRoles = async () => {
  try {
    rolesLoading.value = true;
    roles.value = await userService.getRoles();
  } catch (err) {
    console.error('Failed to load roles:', err);
    error.value = 'Failed to load roles. Please try again.';
  } finally {
    rolesLoading.value = false;
  }
};

const loadUsers = async () => {
  try {
    loading.value = true;
    error.value = '';
    users.value = await userService.getUsers();
  } catch (err) {
    console.error('Failed to load users:', err);
    error.value = 'Failed to load users. Please try again.';
  } finally {
    loading.value = false;
  }
};

const selectUser = (user: User) => {
  selectedUser.value = user;
};

const openRoleModal = (user: User) => {
  userToEdit.value = user;
  selectedRoleId.value = user.role.id;
  showRoleModal.value = true;
};

const updateRole = async () => {
  if (!userToEdit.value || !selectedRoleId.value) return;
  
  try {
    updateLoading.value = true;
    
    const updatedUser = await userService.updateUserRole(
      userToEdit.value.id,
      selectedRoleId.value
    );
    
    // Update user in the list
    const index = users.value.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
    
    // Update selected user if it's the same one
    if (selectedUser.value && selectedUser.value.id === updatedUser.id) {
      selectedUser.value = updatedUser;
    }
    
    showRoleModal.value = false;
    userToEdit.value = null;
    
  } catch (err) {
    console.error('Failed to update role:', err);
    error.value = 'Failed to update user role. Please try again.';
  } finally {
    updateLoading.value = false;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getUserInitials = (user: User) => {
  if (!user.fullName) return '';
  return user.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const getRoleBadgeClass = (roleName: string) => {
  switch(roleName) {
    case 'ADMIN': return 'admin-role';
    case 'MEMBER': return 'member-role';
    default: return '';
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};
</script>

<style scoped>
.user-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  position: relative;
}

.page-title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #333;
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error message */
.error-message {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
}

.retry-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}

/* User table */
.user-table-container {
  overflow-x: auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  margin-bottom: 2rem;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid #e9ecef;
  position: sticky;
  top: 0;
  z-index: 10;
}

.user-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

.user-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-table tbody tr:hover {
  background-color: #f5f5f5;
}

.row-even {
  background-color: #fafafa;
}

.selected-row {
  background-color: #e3f2fd !important;
  border-left: 4px solid #2196f3;
}

.role-badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.admin-role {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.member-role {
  background-color: #e3f2fd;
  color: #1565c0;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-indicator.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-indicator.active::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #2e7d32;
  margin-right: 6px;
}

.status-indicator.inactive {
  background-color: #ffebee;
  color: #c62828;
}

.status-indicator.inactive::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #c62828;
  margin-right: 6px;
}

.actions-cell {
  white-space: nowrap;
}

.edit-button {
  display: inline-flex;
  align-items: center;
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s, transform 0.1s;
}

.edit-button:hover {
  background-color: #1976d2;
  transform: translateY(-1px);
}

.edit-button:active {
  transform: translateY(0);
}

.button-icon {
  margin-right: 6px;
}

.table-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-top: 1px solid #eee;
}

.pagination-button {
  background-color: #fff;
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  margin: 0 1rem;
  font-size: 0.9rem;
  color: #666;
}

/* User Detail Sidebar */
.user-detail-sidebar {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100vh;
  background-color: white;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: right 0.3s ease-in-out;
  overflow-y: auto;
}

.user-detail-sidebar.is-open {
  right: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.user-details {
  padding: 1.5rem;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.detail-section {
  margin-bottom: 2rem;
}

.detail-item {
  margin-bottom: 1rem;
  display: flex;
}

.detail-label {
  font-weight: 600;
  width: 100px;
  color: #666;
}

.detail-value {
  flex: 1;
}

.action-section {
  display: flex;
  justify-content: center;
}

.action-button {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.action-button:hover {
  background-color: #1976d2;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.modal-container {
  background-color: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-top: 1rem;
}

.role-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 0.5rem;
  font-size: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #eee;
  gap: 1rem;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #333;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.save-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
}

.save-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.button-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

/* Table controls */
.table-controls {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.search-box {
  position: relative;
  width: 300px;
}

.search-input {
  width: 100%;
  padding: 0.6rem 1rem 0.6rem 2.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
  outline: none;
}

.search-icon {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
}
</style>