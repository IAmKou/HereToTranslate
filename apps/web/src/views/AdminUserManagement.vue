<template>
  <div class="admin-user-management">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1>User Management</h1>
          <p class="subtitle">Manage and monitor user accounts</p>
        </div>
        <div class="header-actions">
          <!-- Removed buttons -->
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="pi pi-users"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ users.length }}</span>
            <span class="stat-label">Total Users</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ activeUsers }}</span>
            <span class="stat-label">Active Users</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
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
                placeholder="Search by username, name, email or phone..."
                class="p-inputtext-lg"
              />
            </span>
          </div>

          <div class="filter-section">
            <div class="filter-group">
              <span class="filter-label">&nbsp;</span>
              <Dropdown
                v-model="filters.isActive.value"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="All Status"
                class="p-inputtext-lg"
              >
                <template #value="slotProps">
                  <div class="status-dropdown-value">
                    <i :class="getStatusIcon(slotProps.value)"></i>
                    <span>{{ getStatusLabel(slotProps.value) }}</span>
                  </div>
                </template>
                <template #option="slotProps">
                  <div class="status-dropdown-option">
                    <i :class="getStatusIcon(slotProps.option.value)"></i>
                    <span>{{ slotProps.option.label }}</span>
                  </div>
                </template>
              </Dropdown>
            </div>

            <div class="filter-group">
              <span class="filter-label">&nbsp;</span>
              <Dropdown
                v-model="filters['role.id'].value"
                :options="roleOptions"
                optionLabel="name"
                optionValue="id"
                placeholder="All Roles"
                class="p-inputtext-lg"
              >
                <template #value="slotProps">
                  <div class="role-dropdown-value">
                    <i :class="getRoleIcon(slotProps.value)"></i>
                    <span>{{ getRoleLabel(slotProps.value) }}</span>
                  </div>
                </template>
                <template #option="slotProps">
                  <div class="role-dropdown-option">
                    <i :class="getRoleIcon(slotProps.option.id)"></i>
                    <span>{{ slotProps.option.name }}</span>
                  </div>
                </template>
              </Dropdown>
            </div>

            <div class="filter-group">
              <Button
                icon="pi pi-filter-slash"
                label="Clear All"
                class="p-button-outlined p-button-lg"
                @click="clearFilters"
                v-tooltip.top="'Clear All Filters'"
                style="margin-top: 2rem"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="table-section">
        <DataTable
          :value="users"
          :paginator="true"
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          :loading="loading"
          :filters="filters"
          filterDisplay="menu"
          :globalFilterFields="['username', 'fullName', 'email', 'phone']"
          responsiveLayout="scroll"
          class="p-datatable-sm"
          v-model:filters1="filters"
          dataKey="id"
          :scrollable="true"
          scrollHeight="calc(100vh - 400px)"
          :virtualScrollerOptions="{ itemSize: 50 }"
          showGridlines
          stripedRows
          removableSort
          sortMode="multiple"
          :selection="selectedUsers"
          @row-select="onRowSelect"
          @row-unselect="onRowUnselect"
          v-model:selection1="selectedUsers"
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
              <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
              <span>Loading users...</span>
            </div>
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

          <Column field="username" header="Username" sortable>
            <template #body="{ data }">
              <div class="user-info">
                <Avatar
                  :label="getInitials(data.fullName)"
                  size="normal"
                  class="mr-2"
                  :style="{ backgroundColor: getRandomColor(data.username) }"
                />
                <div class="user-details">
                  <span class="username">{{ data.username }}</span>
                  <span class="email">{{ data.email }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column field="fullName" header="Full Name" sortable></Column>

          <Column field="phone" header="Phone" sortable>
            <template #body="{ data }">
              <div class="phone-cell">
                <i class="pi pi-phone mr-2"></i>
                {{ data.phone }}
              </div>
            </template>
          </Column>

          <Column field="role" header="Role" sortable>
            <template #body="{ data }">
              <Dropdown
                v-model="data.role.id"
                :options="roleOptions"
                optionLabel="name"
                optionValue="id"
                class="p-inputtext-sm"
                @change="updateUserRole(data.id, data.role.id)"
                :disabled="loading"
              />
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
                <i class="pi pi-calendar mr-2"></i>
                {{ formatDate(data.createdAt) }}
              </div>
            </template>
          </Column>

          <Column header="Actions" :exportable="false" style="min-width: 8rem">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  icon="pi pi-power-off"
                  class="p-button-rounded p-button-text p-button-sm"
                  :class="{ 'p-button-danger': data.isActive, 'p-button-success': !data.isActive }"
                  @click="toggleUserStatus(data.id)"
                  :loading="loading"
                  v-tooltip.top="data.isActive ? 'Deactivate User' : 'Activate User'"
                  style="margin-right: 5rem"
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
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
import { DataTableFilterMetaData } from 'primevue/datatable';

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

const statusOptions = [
  { label: 'All', value: null },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
];

const roleOptions: Role[] = [
  { id: null, name: 'All' },
  { id: 1, name: 'Admin' },
  { id: 2, name: 'Member' }
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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
    users.value = await userService.getAllUsers();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Users loaded successfully',
      life: 3000
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load users',
      life: 3000
    });
    console.error('Error loading users:', err);
  } finally {
    loading.value = false;
  }
};

const updateUserRole = async (userId: string, roleId: number) => {
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

const toggleUserStatus = async (userId: string) => {
  confirm.require({
    message: 'Are you sure you want to change this user\'s status?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        loading.value = true;
        await userService.toggleUserStatus(userId);
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User status updated successfully',
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

onMounted(loadUsers);
</script>

<style scoped lang="scss">
.admin-user-management {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 2rem;

  .page-header {
    margin-bottom: 2rem;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;

      .header-left {
        h1 {
          margin: 0;
          color: #1e293b;
          font-size: 1.875rem;
          font-weight: 600;
        }

        .subtitle {
          margin: 0.5rem 0 0;
          color: #64748b;
          font-size: 0.875rem;
        }
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;
      }
    }

    .stats-container {
      display: flex;
      gap: 1rem;

      .stat-card {
        flex: 1;
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;

          i {
            font-size: 1.5rem;
            color: #3b82f6;
            transition: all 0.3s ease;
          }
        }

        .stat-info {
          display: flex;
          flex-direction: column;

          .stat-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
            line-height: 1;
          }

          .stat-label {
            font-size: 0.875rem;
            color: #64748b;
            margin-top: 0.25rem;
          }
        }

        &:hover .stat-icon {
          background: #3b82f6;
          i {
            color: white;
          }
        }
      }
    }
  }

  .main-content {
    .search-filter-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .search-filter-container {
        display: flex;
        align-items: center;
        gap: 1.5rem;

        .search-box {
          flex: 0 0 400px;

          .p-input-icon-left {
            width: 100%;

            .p-inputtext {
              width: 100%;
              border-radius: 8px;
              border: 2px solid #e2e8f0;
              transition: all 0.3s ease;
              padding: 0.75rem 1rem 0.75rem 2.5rem;
              font-size: 1rem;
              background-color: #f8fafc;

              &:hover {
                border-color: #cbd5e1;
                background-color: white;
              }

              &:focus {
                border-color: #3b82f6;
                background-color: white;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
              }
            }

            i {
              color: #64748b;
              left: 1rem;
              font-size: 1rem;
              transition: all 0.3s ease;
            }

            &:hover i {
              color: #3b82f6;
            }
          }
        }

        .filter-section {
          display: flex;
          gap: 1.5rem;
          flex: 1;

          .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;

            .filter-label {
              color: #64748b;
              font-size: 0.875rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            :deep(.p-dropdown) {
              min-width: 180px;
              border-radius: 8px;
              border: 2px solid #e2e8f0;
              transition: all 0.3s ease;
              background-color: #f8fafc;

              &:hover {
                border-color: #cbd5e1;
                background-color: white;
              }

              &:focus {
                border-color: #3b82f6;
                background-color: white;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
              }

              .p-dropdown-label {
                padding: 0.75rem 1rem;
                font-size: 1rem;
              }

              .p-dropdown-trigger {
                width: 3rem;
              }
            }

            .status-dropdown-value,
            .status-dropdown-option,
            .role-dropdown-value,
            .role-dropdown-option {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.25rem 0;

              i {
                font-size: 1rem;
                color: #64748b;
              }

              span {
                font-size: 1rem;
              }
            }

            .status-dropdown-value i,
            .role-dropdown-value i {
              color: #3b82f6;
            }

            .p-button {
              height: 42px;
              border-width: 2px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              font-size: 0.875rem;

              &:hover {
                transform: translateY(-1px);
              }
            }
          }
        }
      }
    }

    .table-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      :deep(.p-datatable) {
        .p-datatable-header {
          background: transparent;
          border: none;
          padding: 0;
          margin-bottom: 1rem;
        }

        .p-datatable-thead > tr > th {
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
          transition: all 0.3s ease;

          &:hover {
            background: #f1f5f9;
          }
        }

        .p-datatable-tbody > tr > td {
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .p-datatable-tbody > tr {
          transition: all 0.3s ease;

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
        gap: 0.75rem;

        .user-details {
          display: flex;
          flex-direction: column;

          .username {
            font-weight: 500;
            color: #1e293b;
          }

          .email {
            font-size: 0.875rem;
            color: #64748b;
          }
        }
      }

      .phone-cell, .date-cell {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #64748b;
      }

      :deep(.p-dropdown) {
        min-width: 120px;
        border-radius: 6px;
      }

      :deep(.p-tag) {
        min-width: 80px;
        text-align: center;
        border-radius: 6px;
        font-weight: 500;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-1px);
        }
      }

      .action-buttons {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        width: 100%;
        height: 100%;
        padding-left: 1rem;

        .p-button {
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 2.5rem;
          min-height: 2.5rem;

          &:hover {
            transform: translateY(-1px);
          }
        }
      }

      .empty-state {
        padding: 3rem;
        text-align: center;
        color: #64748b;

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #cbd5e1;
          transition: all 0.3s ease;
        }

        h3 {
          margin: 0 0 0.5rem;
          color: #1e293b;
        }

        p {
          margin: 0;
          font-size: 0.875rem;
        }

        &:hover .empty-icon {
          transform: scale(1.1);
          color: #3b82f6;
        }
      }

      .loading-state {
        padding: 2rem;
        text-align: center;
        color: #64748b;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;

        i {
          transition: all 0.3s ease;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .admin-user-management {
    padding: 1rem;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 1rem;

        .header-actions {
          width: 100%;
          justify-content: flex-end;
        }
      }

      .stats-container {
        flex-direction: column;

        .stat-card {
          width: 100%;
        }
      }
    }

    .main-content {
      .search-filter-section {
        .search-filter-container {
          flex-direction: column;
          gap: 1rem;

          .search-box {
            flex: 0 0 auto;
            width: 100%;
          }

          .filter-section {
            flex-direction: column;
            width: 100%;
            gap: 1rem;

            .filter-group {
              width: 100%;
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;

              :deep(.p-dropdown) {
                width: 100%;
              }
            }
          }
        }
      }
    }
  }
}
</style>
