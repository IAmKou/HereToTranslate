<template>
  <div class="admin-user-management">
    <h1>User Management</h1>

    <div class="user-list">
      <table v-if="users.length > 0">
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.fullName }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.phone }}</td>
            <td>
              <select
                v-model="user.role.id"
                @change="updateUserRole(user.id, user.role.id)"
                :disabled="loading"
              >
                <option :value="1">Admin</option>
                <option :value="2">Member</option>
              </select>
            </td>
            <td>
              <span :class="['status-badge', user.isActive ? 'active' : 'inactive']">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <button
                @click="toggleUserStatus(user.id)"
                :disabled="loading"
                class="toggle-status-btn"
                :class="{ 'deactivate': user.isActive, 'activate': !user.isActive }"
              >
                {{ user.isActive ? 'Deactivate' : 'Activate' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="no-users">
        No users found
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { userService, type User } from '../services/user.service';

export default defineComponent({
  name: 'AdminUserManagement',
  setup() {
    const users = ref<User[]>([]);
    const loading = ref(false);
    const error = ref('');

    const loadUsers = async () => {
      try {
        loading.value = true;
        error.value = '';
        users.value = await userService.getAllUsers();
      } catch (err) {
        error.value = 'Failed to load users. Please try again.';
        console.error('Error loading users:', err);
      } finally {
        loading.value = false;
      }
    };

    const updateUserRole = async (userId: string, role: number) => {
      try {
        loading.value = true;
        error.value = '';
        await userService.updateUserRole(userId, role);
        await loadUsers(); // Reload the list to ensure consistency
      } catch (err) {
        error.value = 'Failed to update user role. Please try again.';
        console.error('Error updating user role:', err);
      } finally {
        loading.value = false;
      }
    };

    const toggleUserStatus = async (userId: string) => {
      try {
        loading.value = true;
        error.value = '';
        await userService.toggleUserStatus(userId);
        await loadUsers(); // Reload the list to ensure consistency
      } catch (err) {
        error.value = 'Failed to toggle user status. Please try again.';
        console.error('Error toggling user status:', err);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    onMounted(loadUsers);

    return {
      users,
      loading,
      error,
      updateUserRole,
      toggleUserStatus,
      formatDate
    };
  }
});
</script>

<style scoped lang="scss">
.admin-user-management {
  padding: 2rem;

  h1 {
    margin-bottom: 2rem;
    color: #2c3e50;
  }

  .user-list {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #eee;
      }

      th {
        background-color: #f8f9fa;
        font-weight: 600;
      }

      select {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
      }
    }
  }

  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;

    &.active {
      background-color: #e6f4ea;
      color: #1e7e34;
    }

    &.inactive {
      background-color: #fbe9e7;
      color: #d32f2f;
    }
  }

  .toggle-status-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    &.deactivate {
      background-color: #fbe9e7;
      color: #d32f2f;

      &:hover:not(:disabled) {
        background-color: #ffcdd2;
      }
    }

    &.activate {
      background-color: #e6f4ea;
      color: #1e7e34;

      &:hover:not(:disabled) {
        background-color: #c8e6c9;
      }
    }
  }

  .error-message {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #fbe9e7;
    color: #d32f2f;
    border-radius: 4px;
  }

  .no-users {
    padding: 2rem;
    text-align: center;
    color: #666;
  }
}
</style>
