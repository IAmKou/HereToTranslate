<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <AdminNavbar />
    <div class="main-content">
      <AdminSidebar v-model:collapsed="isSidebarCollapsed" />
      <div class="content">
        <div class="admin-user-management">
          <!-- Header Section -->
          <div class="page-header">
            <div class="header-content">
              <div class="header-left">
                <h1>User Management</h1>
                <p class="subtitle">Manage and monitor user accounts</p>
              </div>
            </div>

            <!-- Stats Cards -->
            <div class="stats-container">
              <div class="stat-card">
                <div class="stat-icon users">
                  <i class="pi pi-users"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ users.length }}</span>
                  <span class="stat-label">Total Users</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon active">
                  <i class="pi pi-check-circle"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ activeUsers }}</span>
                  <span class="stat-label">Active Users</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon admin">
                  <i class="pi pi-shield"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ adminUsers }}</span>
                  <span class="stat-label">Admin Users</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <!-- Search and Filter Section -->
            <div class="search-filter-section">
              <div class="search-filter-container">
                <div class="search-box">
                  <span class="p-input-icon-left">
                    <i class="pi pi-search" />
                    <InputText
                      v-model="filters.global.value"
                      placeholder="Search users..."
                      class="p-inputtext-lg"
                    />
                  </span>
                </div>

                <div class="filter-section">
                  <Dropdown
                    v-model="filters.isActive.value"
                    :options="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="All Status"
                    class="p-inputtext-lg status-dropdown"
                  >
                    <template #value="slotProps">
                      <div class="status-option">
                        <i :class="getStatusIcon(slotProps.value)"></i>
                        <span>{{ getStatusLabel(slotProps.value) }}</span>
                      </div>
                    </template>
                    <template #option="slotProps">
                      <div class="status-option">
                        <i :class="getStatusIcon(slotProps.option.value)"></i>
                        <span>{{ slotProps.option.label }}</span>
                      </div>
                    </template>
                  </Dropdown>

                  <div class="role-filter-group">
                    <Dropdown
                      :modelValue="filters['role.id'].value"
                      :options="roleOptions"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="All Roles"
                      class="p-inputtext-lg role-dropdown"
                      @change="onRoleFilterChange"
                    >
                      <template #value="slotProps">
                        <div class="role-option">
                          <i :class="getRoleIcon(slotProps.value)"></i>
                          <span>{{ getRoleLabel(slotProps.value) }}</span>
                        </div>
                      </template>
                      <template #option="slotProps">
                        <div class="role-option">
                          <i :class="getRoleIcon(slotProps.option.id)"></i>
                          <span>{{ slotProps.option.name }}</span>
                        </div>
                      </template>
                    </Dropdown>

                    <Button
                      icon="pi pi-filter-slash"
                      class="p-button-outlined p-button-lg clear-btn"
                      @click="clearFilters"
                      v-tooltip.top="'Clear All Filters'"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Data Table Section -->
            <div class="table-section">
              <DataTable
                :value="filteredUsers"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                :loading="loading"
                filterDisplay="menu"
                :globalFilterFields="['username', 'fullName', 'email', 'phone']"
                responsiveLayout="scroll"
                class="p-datatable-lg"
                v-model:filters="filters"
                dataKey="id"
                :scrollable="true"
                scrollHeight="calc(100vh - 400px)"
                :virtualScrollerOptions="{ itemSize: 60 }"
                showGridlines
                stripedRows
                removableSort
                sortMode="multiple"
                @row-select="onRowSelect"
                @row-unselect="onRowUnselect"
                v-model:selection="selectedUsers"
              >
                <template #empty>
                  <div class="empty-state">
                    <i class="pi pi-users empty-icon"></i>
                    <h3>No Users Found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                  </div>
                </template>

                <template #loading>
                  <div class="loading-state">
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>Loading users...</span>
                  </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                <Column field="username" header="Username" sortable>
                  <template #body="{ data }">
                    <div class="user-info">
                      <Avatar
                        :label="getInitials(data.fullName)"
                        size="large"
                        shape="circle"
                        class="user-avatar"
                        :style="{ backgroundColor: getRandomColor(data.username) }"
                      />
                      <div class="user-details">
                        <span class="username">{{ data.username }}</span>
                        <span class="email">{{ data.email }}</span>
                      </div>
                    </div>
                  </template>
                </Column>

                <Column field="fullName" header="Full Name" sortable>
                  <template #body="{ data }">
                    <div class="fullname-cell">{{ data.fullName }}</div>
                  </template>
                </Column>

                <Column field="phone" header="Phone" sortable>
                  <template #body="{ data }">
                    <div class="phone-cell">
                      <i class="pi pi-phone"></i>
                      <span>{{ data.phone || 'Not provided' }}</span>
                    </div>
                  </template>
                </Column>

                <Column field="role" header="Role" sortable>
                  <template #filter="{ filterModel, filterCallback }">
                    <Dropdown
                      v-model="filterModel.value"
                      :options="roleOptions.filter(role => role.id !== null)"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Select Role"
                      class="p-column-filter"
                      @change="filterCallback()"
                    >
                      <template #option="slotProps">
                        <div class="role-option">
                          <i :class="getRoleIcon(slotProps.option.id)"></i>
                          <span>{{ slotProps.option.name }}</span>
                        </div>
                      </template>
                    </Dropdown>
                  </template>
                  <template #body="{ data }">
                    <div class="role-cell">
                      <Dropdown
                        v-model="data.role.id"
                        :options="roleOptions.filter(role => role.id !== null)"
                        optionLabel="name"
                        optionValue="id"
                        class="p-inputtext-sm"
                        @change="updateUserRole(data.id, data.role.id)"
                        :disabled="loading || !isSuperAdmin"
                      >
                        <template #value>
                          <div class="role-option">
                            <i :class="getRoleIcon(data.role?.id)"></i>
                            <span>{{ data.role?.name }}</span>
                          </div>
                        </template>
                        <template #option="slotProps">
                          <div class="role-option">
                            <i :class="getRoleIcon(slotProps.option.id)"></i>
                            <span>{{ slotProps.option.name }}</span>
                          </div>
                        </template>
                      </Dropdown>
                    </div>
                  </template>
                </Column>

                <Column field="isActive" header="Status" sortable>
                  <template #body="{ data }">
                    <Tag
                      :severity="data.isActive ? 'success' : 'danger'"
                      :value="data.isActive ? 'Active' : 'Inactive'"
                      class="status-tag"
                    />
                  </template>
                </Column>

                <Column field="createdAt" header="Created At" sortable>
                  <template #body="{ data }">
                    <div class="date-cell">
                      <i class="pi pi-calendar"></i>
                      <span>{{ formatDate(data.createdAt) }}</span>
                    </div>
                  </template>
                </Column>

                <Column :exportable="false">
                  <template #body="slotProps">
                    <div class="action-buttons">
                      <Button
                        :icon="slotProps.data.isActive ? 'pi pi-ban' : 'pi pi-check'"
                        :class="['p-button-rounded p-button-text',
                          slotProps.data.isActive ? 'p-button-danger' : 'p-button-success']"
                        v-tooltip.top="slotProps.data.isActive ? 'Deactivate User' : 'Activate User'"
                        @click="confirmStatusChange(slotProps.data)"
                        :disabled="!isSuperAdmin"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>

          <!-- Toast -->
          <Toast position="top-right" />

          <!-- Confirmation Dialog -->
          <ConfirmDialog>
            <template #message="slotProps">
              <div class="confirm-dialog-content">
                <i :class="['pi', slotProps.message.icon]"></i>
                <span>{{ slotProps.message.message }}</span>
              </div>
            </template>
          </ConfirmDialog>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Tooltip from 'primevue/tooltip';
import { userService, type User } from '../services/user.service';
import { authService } from '../services/auth.service';
import { DataTableFilterMetaData } from 'primevue/datatable';
import AdminNavbar from '../components/AdminNavbar.vue';
import AdminSidebar from '../components/AdminSidebar.vue';

// Register directives
const vTooltip = Tooltip;

interface Role {
  id: number | null;
  name: string;
}

const users = ref<User[]>([]);
const loading = ref(false);
const toast = useToast();
const confirm = useConfirm();
const selectedUsers = ref<User[]>([]);
const isSuperAdmin = ref(false);
const isSidebarCollapsed = ref(false);

const statusOptions = [
  { label: 'All', value: null },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
];

const roleOptions: Role[] = [
  { id: 2, name: 'Admin' },
  { id: 3, name: 'Member' }
];

interface CustomFilterMeta {
  global: DataTableFilterMetaData;
  isActive: DataTableFilterMetaData;
  'role.id': DataTableFilterMetaData;
}

const filters = ref<CustomFilterMeta>({
  global: { value: null, matchMode: 'contains' },
  isActive: { value: null, matchMode: 'equals' },
  'role.id': { value: null, matchMode: 'equals' }
});

const activeUsers = computed(() => {
  return users.value.filter(user => user.isActive).length;
});

const adminUsers = computed(() => {
  return users.value.filter(user => user.role.id === 1).length;
});

ref(null);

const filteredUsers = computed(() => {
  let result = users.value;

  // Apply global search filter
  if (filters.value.global.value) {
    const searchTerm = filters.value.global.value.toLowerCase();
    result = result.filter(user =>
      user.username.toLowerCase().includes(searchTerm) ||
      user.fullName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      (user.phone && user.phone.toLowerCase().includes(searchTerm))
    );
  }

  // Apply status filter
  if (filters.value.isActive.value !== null) {
    result = result.filter(user => user.isActive === filters.value.isActive.value);
  }

  // Apply role filter
  if (filters.value['role.id'].value !== null) {
    result = result.filter(user => {
      return user.role && user.role.id === filters.value['role.id'].value;
    });
  }

  return result;
});

const getRandomColor = (seed: string) => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

const getInitials = (name: string) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

const formatDate = (dateValue: Date) => {
  if (!dateValue) return 'N/A';
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return 'N/A';
  }
};

const clearFilters = () => {
  filters.value = {
    global: { value: null, matchMode: 'contains' },
    isActive: { value: null, matchMode: 'equals' },
    'role.id': { value: null, matchMode: 'equals' }
  };
};

const loadUsers = async () => {
  try {
    loading.value = true;
    const response = await userService.getAllUsers();
    console.log('Raw response from API:', response);

    // Log each user's createdAt field
    response.forEach(user => {
      console.log(`User ${user.id} createdAt:`, {
        raw: user.createdAt,
        type: typeof user.createdAt,
        isDate: user.createdAt instanceof Date,
        parsed: new Date(user.createdAt)
      });
    });

    users.value = response;

    // Check if current user is super admin
    const currentUser = authService.getUser();
    isSuperAdmin.value = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
    console.log('isSuperAdmin:', isSuperAdmin.value, 'currentUser:', currentUser);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Users loaded successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Error loading users:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load users',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const updateUserRole = async (userId: string, roleId: number) => {
  if (!isSuperAdmin.value) {
    toast.add({
      severity: 'error',
      summary: 'Permission Denied',
      detail: 'Only super admins can change user roles',
      life: 3000
    });
    return;
  }

  try {
    loading.value = true;
    await userService.updateUserRole(userId, roleId);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User role updated successfully',
      life: 3000
    });
    await loadUsers();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update user role',
      life: 3000
    });
    console.error('Error updating user role:', err);
  } finally {
    loading.value = false;
  }
};

const onRowSelect = (event: any) => {
  toast.add({
    severity: 'info',
    summary: 'User Selected',
    detail: `${event.data.username} has been selected`,
    life: 3000
  });
};

const onRowUnselect = (event: any) => {
  toast.add({
    severity: 'info',
    summary: 'User Unselected',
    detail: `${event.data.username} has been unselected`,
    life: 3000
  });
};

const getStatusIcon = (value: boolean | null) => {
  if (value === null) return 'pi pi-filter';
  return value ? 'pi pi-check-circle' : 'pi pi-times-circle';
};

const getStatusLabel = (value: boolean | null) => {
  if (value === null) return 'All Status';
  return value ? 'Active' : 'Inactive';
};

const getRoleIcon = (roleId: number | null) => {
  if (roleId === null) return 'pi pi-filter';
  return roleId === 1 ? 'pi pi-shield' : 'pi pi-user';
};

const getRoleLabel = (roleId: number | null) => {
  if (roleId === null) return 'All Roles';
  return roleId === 1 ? 'Admin' : 'Member';
};

const confirmStatusChange = (user: User) => {
  confirm.require({
    message: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} this user?`,
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        loading.value = true;
        await userService.toggleUserStatus(user.id);
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: `User status updated successfully`,
          life: 3000
        });
        await loadUsers();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update user status',
          life: 3000
        });
        console.error('Error toggling user status:', err);
      } finally {
        loading.value = false;
      }
    }
  });
};

const onRoleFilterChange = (event: any) => {
  console.log('Role filter changed:', event.value);
  filters.value['role.id'].value = event.value;
};

// Add a watch to debug filter changes
watch(filters, (newValue) => {
  console.log('Filters changed:', newValue);
}, { deep: true });

onMounted(loadUsers);
</script>

<style lang="scss" scoped>
.layout-wrapper .main-content {
  transition: margin-left 0.2s;
  margin-left: 260px;
}
.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
}
.admin-user-management {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 2rem;

  .page-header {
    margin-bottom: 2rem;

    .header-content {
      margin-bottom: 2rem;

      .header-left {
        h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }

        .subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin-top: 0.5rem;
        }
      }
    }

    .stats-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;

      .stat-card {
        background: white;
        border-radius: 1rem;
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;

          i {
            font-size: 1.1rem;
            color: white;
          }

          &.users {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
          }

          &.active {
            background: linear-gradient(135deg, #10b981, #059669);
          }

          &.admin {
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          }
        }

        .stat-info {
          display: flex;
          flex-direction: column;

          .stat-value {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1e293b;
            line-height: 1;
          }

          .stat-label {
            color: #64748b;
            font-size: 0.8rem;
            margin-top: 0.25rem;
          }
        }
      }
    }
  }

  .main-content {
    .search-filter-section {
      background: white;
      border-radius: 1rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      .search-filter-container {
        display: flex;
        align-items: center;
        gap: 1.5rem;

        .search-box {
          min-width: 200px;
          max-width: 250px;

          :deep(.p-input-icon-left) {
            width: 100%;

            i {
              color: #64748b;
              left: 1rem;
            }

            input {
              width: 100%;
              padding: 0.5rem 0.8rem 0.5rem 2rem;
              border-radius: 0.5rem;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              transition: all 0.3s ease;

              &:hover {
                border-color: #cbd5e1;
                background: white;
              }

              &:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                background: white;
              }
            }
          }
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;

          :deep(.p-dropdown) {
            min-width: 120px;
            border-radius: 0.5rem;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            transition: all 0.3s ease;

            &:hover {
              border-color: #cbd5e1;
              background: white;
            }

            &:focus {
              border-color: #3b82f6;
              box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
              background: white;
            }

            .p-dropdown-label {
              padding: 0.75rem 1rem;
            }
          }

          .status-option, .role-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;

            i {
              font-size: 0.95rem;
            }
          }

          .role-filter-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;

            .clear-btn {
              width: 32px;
              height: 32px;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-width: 1px;
              transition: all 0.3s ease;

              &:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }

              i {
                font-size: 0.95rem;
              }
            }
          }
        }
      }
    }

    .table-section {
      background: white;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      :deep(.p-datatable) {
        .p-datatable-header {
          background: transparent;
          border: none;
          padding: 0 0 1rem 0;
        }

        .p-datatable-thead > tr > th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          padding: 0.7rem;
          border-bottom: 2px solid #e2e8f0;
          transition: all 0.3s ease;

          &:hover {
            background: #f1f5f9;
          }
        }

        .p-datatable-tbody > tr {
          transition: all 0.3s ease;

          > td {
            padding: 0.7rem;
            border-bottom: 1px solid #e2e8f0;
          }

          &:hover {
            background: #f8fafc;
            transform: translateY(-1px);
          }

          &.p-highlight {
            background: #eff6ff;
          }
        }
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 0.6rem;

        .user-avatar {
          width: 1.7rem;
          height: 1.7rem;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .user-details {
          display: flex;
          flex-direction: column;

          .username {
            color: #1e293b;
            font-weight: 500;
            font-size: 0.97rem;
          }

          .email {
            color: #64748b;
            font-size: 0.85rem;
          }
        }
      }

      .fullname-cell, .phone-cell, .date-cell {
        font-size: 0.97rem;
        i {
          font-size: 0.95rem;
        }
      }

      .role-cell {
        :deep(.p-dropdown) {
          min-width: 140px;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          transition: all 0.3s ease;

          &:hover:not(:disabled) {
            border-color: #cbd5e1;
            background: white;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }

        .role-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem;

          i {
            font-size: 0.95rem;
            &.pi-shield-plus {
              color: #8b5cf6;
            }
            &.pi-shield {
              color: #3b82f6;
            }
            &.pi-user {
              color: #10b981;
            }
          }

          span {
            color: #1e293b;
            font-weight: 500;
          }
        }
      }

      :deep(.status-tag) {
        border-radius: 0.375rem;
        padding: 0.18rem 0.5rem;
        font-weight: 500;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;

        &.p-tag-success {
          background: #dcfce7;
          color: #166534;
        }

        &.p-tag-danger {
          background: #fee2e2;
          color: #991b1b;
        }
      }

      .action-buttons {
        display: flex;
        justify-content: center;
        gap: 0.5rem;

        :deep(.p-button) {
          width: 1.7rem;
          height: 1.7rem;
          transition: all 0.3s ease;

          &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      .empty-state, .loading-state {
        padding: 2rem;
        text-align: center;
        color: #64748b;

        i {
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #94a3b8;
        }

        h3 {
          color: #1e293b;
          font-weight: 600;
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
        }

        p {
          margin: 0;
          font-size: 0.875rem;
        }
      }
    }
  }
}

// Responsive Design
@media (max-width: 1024px) {
  .admin-user-management {
    padding: 1rem;

    .stats-container {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    .search-filter-container {
      flex-direction: column;
      gap: 1rem;

      .search-box {
        width: 100%;
        max-width: 100%;
      }

      .filter-section {
        width: 100%;
        flex-wrap: wrap;
        gap: 1rem;

        :deep(.p-dropdown) {
          flex: 1;
          min-width: 160px;
        }

        .role-filter-group {
          flex: 1;
          display: flex;
          gap: 0.5rem;

          .role-dropdown {
            flex: 1;
          }

          .clear-btn {
            width: 42px;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .admin-user-management {
    .page-header {
      .header-content {
        flex-direction: column;
        gap: 1rem;
      }
    }

    .table-section {
      :deep(.p-datatable) {
        .p-datatable-tbody > tr > td {
          padding: 0.75rem;
        }
      }

      .user-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;

        .user-details {
          .email {
            display: none;
          }
        }
      }

      .action-buttons {
        flex-direction: column;
        align-items: center;
      }
    }
  }
}

// Animation Keyframes
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Confirmation Dialog Styling
.confirm-dialog-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;

  i {
    font-size: 1.5rem;
    color: #f59e0b;
  }

  span {
    color: #1e293b;
    font-size: 1rem;
    line-height: 1.5;
  }
}
</style>
