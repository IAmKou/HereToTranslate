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
              <div class="stat-card stat-card-users">
                <div class="stat-icon users">
                  <i class="pi pi-users"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ users.length }}</span>
                  <span class="stat-label">Total Users</span>
                </div>
              </div>
              <div class="stat-card stat-card-active">
                <div class="stat-icon active">
                  <i class="pi pi-check-circle"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ activeUsers }}</span>
                  <span class="stat-label">Active Users</span>
                </div>
              </div>
              <div class="stat-card stat-card-admin">
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
                    <i class="pi pi-search search-animated" />
                    <InputText
                      v-model="filters.global.value"
                      placeholder="Search users..."
                      class="p-inputtext-lg search-input"
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
                    class="p-inputtext-lg status-dropdown filter-dropdown"
                  >
                    <template #value="slotProps">
                      <div class="status-option">
                        <i :class="getStatusIcon(slotProps.value)" class="filter-icon-animated"></i>
                        <span>{{ getStatusLabel(slotProps.value) }}</span>
                      </div>
                    </template>
                    <template #option="slotProps">
                      <div class="status-option">
                        <i :class="getStatusIcon(slotProps.option.value)" class="filter-icon-animated"></i>
                        <span>{{ slotProps.option.label }}</span>
                      </div>
                    </template>
                  </Dropdown>
                  <Dropdown
                    v-model="filters['role.id'].value"
                    :options="roleOptions"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="All Roles"
                    class="p-inputtext-lg role-dropdown filter-dropdown"
                  >
                    <template #value="slotProps">
                      <div class="role-option">
                        <i :class="getRoleIcon(slotProps.value)" class="filter-icon-animated"></i>
                        <span>{{ getRoleLabel(slotProps.value) }}</span>
                      </div>
                    </template>
                    <template #option="slotProps">
                      <div class="role-option">
                        <i :class="getRoleIcon(slotProps.option.id)" class="filter-icon-animated"></i>
                        <span>{{ slotProps.option.name }}</span>
                      </div>
                    </template>
                  </Dropdown>
                  <Button
                    icon="pi pi-filter-slash"
                    class="p-button-outlined p-button-lg clear-btn enhanced-clear-btn"
                    @click="clearFilters"
                    v-tooltip.top="'Clear All Filters'"
                  />
                </div>
              </div>
            </div>

            <!-- Data Table Section -->
            <div class="table-section">
              <DataTable
                :value="paginatedUsers"
                :paginator="false"
                :rows="itemsPerPage"
                :loading="loading"
                filterDisplay="menu"
                :globalFilterFields="['username', 'fullName', 'email', 'phone']"
                responsiveLayout="scroll"
                class="p-datatable-lg enhanced-table"
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
                <template #loading>
                  <div class="skeleton-table">
                    <div v-for="i in 7" :key="i" class="skeleton-row">
                      <div class="skeleton-avatar"></div>
                      <div class="skeleton-cell" style="width: 120px"></div>
                      <div class="skeleton-cell" style="width: 90px"></div>
                      <div class="skeleton-cell" style="width: 80px"></div>
                      <div class="skeleton-cell" style="width: 100px"></div>
                      <div class="skeleton-cell" style="width: 80px"></div>
                      <div class="skeleton-cell" style="width: 120px"></div>
                      <div class="skeleton-action"></div>
                    </div>
                  </div>
                </template>
                <template #empty>
                  <div class="empty-state enhanced-empty-state">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="empty-svg">
                      <circle cx="40" cy="40" r="38" fill="#e0f2fe" stroke="#3b82f6" stroke-width="2"/>
                      <ellipse cx="40" cy="50" rx="18" ry="8" fill="#bae6fd"/>
                      <circle cx="32" cy="36" r="4" fill="#3b82f6"/>
                      <circle cx="48" cy="36" r="4" fill="#3b82f6"/>
                      <rect x="30" y="44" width="20" height="4" rx="2" fill="#38bdf8"/>
                    </svg>
                    <h3>No users found!</h3>
                    <p>Try adjusting your filters or create a new user 😄</p>
                    <Button icon="pi pi-filter-slash" label="Clear Filters" class="p-button-lg p-button-success clear-empty-btn" @click="clearFilters" />
                  </div>
                </template>
                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                <Column field="username" header="Username" sortable>
                  <template #body="{ data }">
                    <div class="user-info">
                      <Avatar
                        v-if="data.avatarUrl"
                        :image="data.avatarUrl"
                        size="large"
                        shape="circle"
                        class="user-avatar enhanced-avatar"
                        :style="{ borderColor: getRoleBorderColor(data.role?.id) }"
                        v-tooltip.top="`<b>${data.fullName}</b><br>${data.email}<br><span class='role-tooltip'>${data.role?.name?.toUpperCase()}</span>`"
                        tooltipOptions="{ escape: false, class: 'avatar-tooltip' }"
                      />
                      <Avatar
                        v-else
                        :label="getInitials(data.fullName)"
                        size="large"
                        shape="circle"
                        class="user-avatar enhanced-avatar"
                        :style="{ backgroundColor: getRandomColor(data.username), borderColor: getRoleBorderColor(data.role?.id) }"
                        v-tooltip.top="`<b>${data.fullName}</b><br>${data.email}<br><span class='role-tooltip'>${data.role?.name?.toUpperCase()}</span>`"
                        tooltipOptions="{ escape: false, class: 'avatar-tooltip' }"
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
                  <template #body="{ data }">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <Tag
                        :severity="data.role.id === 1 ? 'info' : (data.role.id === 2 ? 'warning' : 'success')"
                        :value="data.role.name.toUpperCase()"
                        class="role-tag enhanced-role-tag"
                      >
                        <i :class="getRoleIcon(data.role?.id)" style="margin-right:4px"></i>
                        {{ data.role?.name }}
                      </Tag>
                      <Button
                        v-if="canEditRole(data)"
                        icon="pi pi-pencil"
                        class="p-button-text p-button-rounded p-button-sm role-edit-btn"
                        style="margin-left: 0.2rem;"
                        v-tooltip.top="'Edit Role'"
                        @click="openRoleDialog(data)"
                      />
                    </div>
                  </template>
                </Column>
                <Column field="isActive" header="Status" sortable>
                  <template #body="{ data }">
                    <Tag
                      :severity="data.isActive ? 'success' : 'danger'"
                      :value="data.isActive ? 'Active' : 'Inactive'"
                      class="status-tag enhanced-status-tag"
                    >
                      <i :class="data.isActive ? 'pi pi-check-circle' : 'pi pi-ban'" style="margin-right:4px"></i>
                      {{ data.isActive ? 'Active' : 'Inactive' }}
                    </Tag>
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
                        v-if="canDeactivateUser(slotProps.data)"
                        :icon="slotProps.data.isActive ? 'pi pi-ban' : 'pi pi-check'"
                        :class="['p-button-rounded p-button-text', slotProps.data.isActive ? 'p-button-danger action-ban-btn' : 'p-button-success action-activate-btn', 'ripple-btn', 'action-animated-btn']"
                        v-tooltip.top="slotProps.data.isActive ? 'Deactivate User' : 'Activate User'"
                        @click="confirmStatusChange(slotProps.data)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>

          <!-- Pagination Controls -->
          <div class="pagination-controls">
            <div class="pagination-buttons">
              <button @click="prevPage" :disabled="currentPage === 1" class="btn btn-secondary">
                <i class="pi pi-chevron-left"></i> Previous
              </button>
              <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
              <button @click="nextPage" :disabled="currentPage === totalPages" class="btn btn-secondary">
                Next <i class="pi pi-chevron-right"></i>
              </button>
            </div>
          </div>

          <!-- Toast -->
          <Toast position="top-right" class="enhanced-toast" />

          <!-- Confirmation Dialog -->
          <ConfirmDialog class="enhanced-dialog">
            <template #message="slotProps">
              <div class="confirm-dialog-content animated-dialog">
                <i :class="['pi', slotProps.message.icon, 'dialog-icon-animated']" style="font-size:2.5rem;color:#f59e0b;"></i>
                <span>{{ slotProps.message.message }}</span>
              </div>
            </template>
            <template #accepticon>
              <i class="pi pi-check-circle" style="color:#22c55e;font-size:1.5rem;"></i>
            </template>
            <template #rejecticon>
              <i class="pi pi-times-circle" style="color:#ef4444;font-size:1.5rem;"></i>
            </template>
          </ConfirmDialog>

          <!-- Add Role Edit Dialog after ConfirmDialog -->
          <RoleEditDialog
            v-if="showRoleDialog"
            :user="selectedRoleUser"
            :roleOptions="filteredRoleOptions"
            :loading="loading"
            @close="showRoleDialog = false"
            @confirm="handleRoleEditConfirm"
          />
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
import RoleEditDialog from '../components/RoleEditDialog.vue';

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
const showRoleDialog = ref(false);
const selectedRoleUser = ref<User | null>(null);
const filteredRoleOptions = ref<Role[]>([]);

const statusOptions = [
  { label: 'All', value: null },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false }
];

const roleOptions: Role[] = computed(() => {
  const currentUser = authService.getUser();
  if (currentUser?.role?.name?.toLowerCase() === 'super_admin') {
    return [
      { id: 1, name: 'Super Admin' },
      { id: 2, name: 'Admin' },
      { id: 3, name: 'Member' }
    ];
  }
  return [
    { id: 2, name: 'Admin' },
    { id: 3, name: 'Member' }
  ];
});

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
  return users.value.filter(user => Number(user.role.id) === 2).length;
});

const currentPage = ref(1);
const itemsPerPage = ref(10);
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage.value));
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredUsers.value.slice(start, end);
});

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
      return user.role && Number(user.role.id) === Number(filters.value['role.id'].value);
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

    // Check if current user is super admin (fix: check role.name or id)
    const currentUser = authService.getUser();
    isSuperAdmin.value =
      currentUser?.role?.name?.toLowerCase() === 'super_admin' ||
      currentUser?.role?.id === 1;
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

const getRoleBorderColor = (roleId: number | null) => {
  if (roleId === 1) return '#8b5cf6'; // Super Admin - tím
  if (roleId === 2) return '#3b82f6'; // Admin - xanh dương
  return '#10b981'; // Member - xanh lá
};

const canDeactivateUser = (user: User) => {
  const currentUser = authService.getUser();
  if (!currentUser) return false;
  // Super admin: được deactivate tất cả trừ chính mình
  if (isSuperAdmin.value) return user.id !== currentUser.id;
  // Admin: chỉ được deactivate member, không phải chính mình
  if (currentUser.role?.name?.toLowerCase() === 'admin') {
    return user.role?.name?.toLowerCase() === 'member' && user.id !== currentUser.id;
  }
  // Member không có quyền
  return false;
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
  filters.value['role.id'].value = Number(event.value);
};

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--;
}

watch(itemsPerPage, () => { currentPage.value = 1; });

function openRoleDialog(user: User) {
  console.log('Open dialog for user:', user);
  selectedRoleUser.value = { ...user };
  filteredRoleOptions.value = roleOptions.value.filter(r => r.id !== user.role.id);
  showRoleDialog.value = true;
}

async function handleRoleEditConfirm(newRoleId: number) {
  if (!selectedRoleUser.value || selectedRoleUser.value.role.id === newRoleId) {
    showRoleDialog.value = false;
    return;
  }
  try {
    loading.value = true;
    await userService.updateUserRole(selectedRoleUser.value.id, newRoleId);
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
  } finally {
    loading.value = false;
    showRoleDialog.value = false;
  }
}

function canEditRole(user: User) {
  const currentUser = authService.getUser();
  // Không cho phép tự đổi role của chính mình
  if (!currentUser || user.id === currentUser.id) return false;
  // Super admin có thể đổi role của bất kỳ user nào (trừ chính họ)
  if (isSuperAdmin.value) return true;
  // Admin chỉ được đổi role của Member
  return user.role.name?.toLowerCase() === 'member';
}

watch(() => filters.value['role.id'].value, (val) => {
  console.log('Role filter changed:', val, typeof val);
});

onMounted(loadUsers);
</script>

<style lang="scss" scoped>
.layout-wrapper .main-content {
  transition: margin-left 0.2s;
  margin-left: 9rem;
}
.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 8rem;
}
.admin-user-management {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 1rem 1.5rem 0.5rem 1.5rem;

  .page-header {
    margin-bottom: 1rem;
    margin-left: 10rem;
    .header-content {
      margin-bottom: 1rem;
    }

    .stats-container {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      .stat-card {
        border-radius: 1.5rem;
        box-shadow: 0 8px 32px rgba(59,130,246,0.18);
        padding: 2rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
        &:hover {
          transform: translateY(-6px) scale(1.05);
          box-shadow: 0 16px 48px rgba(59,130,246,0.22);
          .stat-icon i {
            animation: bounce 0.5s;
          }
        }
        .stat-icon {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          i {
            font-size: 2rem;
            color: #fff;
            transition: transform 0.2s;
          }
        }
        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 0.2rem;
        }
        .stat-label {
          font-size: 1rem;
          opacity: 0.85;
          letter-spacing: 0.5px;
        }
      }
      .stat-card-users {
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      }
      .stat-card-active {
        background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
      }
      .stat-card-admin {
        background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
      }
    }
  }

  .main-content {
    .search-filter-section {
      background: rgba(255,255,255,0.7);
      border-radius: 2rem;
      padding: 1.5rem 2.5rem;
      margin-bottom: 1.2rem;
      box-shadow: 0 8px 32px rgba(59,130,246,0.13);
      backdrop-filter: blur(8px);
      border: 1.5px solid rgba(59,130,246,0.13);

      .search-filter-container {
        display: flex;
        align-items: center;
        gap: 2rem;

        .search-box {
          min-width: 260px;
          max-width: 340px;
          .search-input {
            border-radius: 2.5rem;
            background: rgba(241,245,249,0.85);
            border: 2px solid #e0e7ef;
            padding: 1.1rem 1.7rem 1.1rem 3.2rem;
            font-size: 1.15rem;
            box-shadow: 0 4px 16px rgba(59,130,246,0.10);
            transition: all 0.3s;
            &:focus {
              border-color: #6366f1;
              background: rgba(255,255,255,0.95);
              box-shadow: 0 0 0 3px rgba(99,102,241,0.13);
            }
          }
          .pi-search {
            left: 1.5rem;
            color: #6366f1;
            font-size: 1.4rem;
            filter: drop-shadow(0 0 4px #6366f1aa);
          }
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 1;

          .filter-dropdown {
            min-width: 170px;
            border-radius: 1.5rem;
            background: rgba(241,245,249,0.85);
            border: 1.5px solid #e0e7ef;
            font-size: 1.12rem;
            box-shadow: 0 2px 12px rgba(139,92,246,0.10);
            transition: all 0.3s;
            &:hover, &.p-focus {
              border-color: #6366f1;
              background: rgba(255,255,255,0.95);
              box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
            }
            .p-dropdown-label {
              padding: 1rem 1.3rem;
            }
          }

          .status-option, .role-option {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            .filter-icon-animated {
              font-size: 1.2rem;
              background: linear-gradient(90deg, #6366f1, #38bdf8);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              filter: drop-shadow(0 0 4px #6366f1aa);
              transition: filter 0.2s, transform 0.2s;
            }
          }

          .enhanced-clear-btn {
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            color: #fff;
            border-radius: 50%;
            width: 3.2rem;
            height: 3.2rem;
            font-size: 1.5rem;
            box-shadow: 0 4px 16px rgba(245,158,11,0.18);
            border: 2.5px solid #fff;
            transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            &:hover {
              background: linear-gradient(135deg, #ef4444, #f59e0b);
              transform: scale(1.13) rotate(-10deg);
              box-shadow: 0 8px 32px rgba(245,158,11,0.22);
            }
          }
        }
      }
    }

    .table-section {
      background: white;
      border-radius: 1rem;
      padding: 0.5rem 0.7rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      animation: fadeIn 0.7s;

      :deep(.p-datatable) {
        .p-datatable-header {
          background: transparent;
          border: none;
          padding: 0 0 1rem 0;
        }

        .p-datatable-thead > tr > th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #f8fafc;
          box-shadow: 0 2px 8px rgba(59,130,246,0.04);
          font-size: 1.05rem;
          letter-spacing: 0.5px;
        }

        .p-datatable-tbody > tr {
          transition: background 0.2s, border-left 0.2s, box-shadow 0.2s, transform 0.25s, opacity 0.5s;
          opacity: 0;
          transform: translateY(20px) scale(0.98);
          animation: fadeInRow 0.7s forwards;
          animation-delay: calc(var(--row-index, 0) * 60ms);
          &:hover {
            background: #e0f2fe;
            border-left: 5px solid #8b5cf6;
            box-shadow: 0 4px 16px rgba(59,130,246,0.13);
            transform: scale(1.012);
          }
          td:first-child { border-radius: 0.5rem 0 0 0.5rem; }
          td:last-child { border-radius: 0 0.5rem 0.5rem 0; }
        }

        :deep(.p-datatable-thead > tr > th),
        :deep(.p-datatable-tbody > tr > td) {
          padding: 0.85rem 0.7rem !important;
          vertical-align: middle;
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
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(59,130,246,0.10);
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
          border-radius: 1rem;
          border: none;
          font-weight: 700;
          text-transform: uppercase;
          background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%);
          color: #fff;
          padding: 0.2rem 0.8rem;
          i {
            margin-right: 0.3rem;
          }
        }
      }

      .status-tag {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        i {
          font-size: 1rem;
        }
      }

      .action-buttons {
        display: flex;
        justify-content: center;
        gap: 0.5rem;

        :deep(.p-button) {
          width: 2.5rem;
          height: 2.5rem;
          font-size: 1.3rem;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(59,130,246,0.10);
          &:hover {
            background: linear-gradient(135deg, #10b981, #3b82f6);
            color: #fff;
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
          font-weight: 700;
          margin: 0 0 0.5rem;
          font-size: 1.2rem;
        }

        p {
          margin: 0;
          font-size: 0.95rem;
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

        :deep(.filter-dropdown) {
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
      border-radius: 1.5rem;
      padding: 0.5rem;
      .user-info .user-details .email {
        display: none;
      }
      .p-datatable-thead > tr > th:nth-child(3),
      .p-datatable-tbody > tr > td:nth-child(3) {
        display: none;
      }
    }

    .action-buttons {
      flex-direction: column;
      align-items: center;
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

@keyframes bounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.2); }
  60% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

@keyframes fadeInRow {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

// Confirmation Dialog Styling
.confirm-dialog-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;

  i {
    font-size: 2.5rem;
    color: #f59e0b;
  }

  span {
    color: #1e293b;
    font-size: 1rem;
    line-height: 1.5;
  }
}

// Font styling
body, .admin-user-management {
  font-family: 'Inter', 'Nunito', 'Poppins', Arial, sans-serif;
  letter-spacing: 0.01em;
}

/* ===== Modern Light Table UI/UX ===== */
.admin-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.2rem;
  h1 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    color: #1e293b;
  }
  .subtitle {
    color: #64748b;
    font-size: 1.08rem;
    margin-top: 0.2rem;
    font-weight: 400;
  }
  .toolbar {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    .add-btn {
      background: #2563eb;
      color: #fff;
      border-radius: 0.7rem;
      font-weight: 700;
      padding: 0.5rem 1.2rem;
      font-size: 1.05rem;
      box-shadow: 0 2px 8px rgba(37,99,235,0.08);
      &:hover { background: #1d4ed8; }
    }
  }
}
.table-section {
  background: #fff;
  border-radius: 1.2rem;
  box-shadow: 0 2px 12px rgba(30,41,59,0.06);
  overflow: hidden;
  .p-datatable-thead > tr > th {
    background: #f8fafc;
    font-weight: 700;
    font-size: 1.08rem;
    color: #1e293b;
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem 0.7rem;
  }
  .p-datatable-tbody > tr {
    transition: background 0.18s;
    &:hover {
      background: #f1f5f9;
    }
    td {
      padding: 1rem 0.7rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 1.04rem;
      vertical-align: middle;
    }
    td:first-child { border-radius: 0.7rem 0 0 0.7rem; }
    td:last-child { border-radius: 0 0.7rem 0.7rem 0; }
  }
  .user-avatar {
    width: 2.2rem;
    height: 2.2rem;
    font-size: 1.1rem;
    font-weight: 700;
    margin-right: 0.7rem;
  }
  .status-tag {
    background: #dcfce7;
    color: #166534;
    border-radius: 0.5rem;
    font-weight: 600;
    padding: 0.2rem 0.9rem;
    font-size: 0.98rem;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    i { color: #22c55e; }
  }
  .role-tag {
    background: #eff6ff;
    color: #2563eb;
    border-radius: 0.5rem;
    font-weight: 600;
    padding: 0.2rem 0.9rem;
    font-size: 0.98rem;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    i { color: #2563eb; }
  }
  .action-btns {
    display: flex;
    gap: 0.5rem;
    .p-button {
      border-radius: 0.5rem;
      padding: 0.4rem 0.7rem;
      font-size: 1.1rem;
      background: #f3f4f6;
      color: #334155;
      border: none;
      &:hover { background: #e0e7ef; }
    }
    .delete-btn { color: #ef4444; }
  }
}
body, .admin-user-management {
  background: #f8fafc;
  color: #1e293b;
  font-family: 'Inter', 'Nunito', 'Poppins', Arial, sans-serif;
}
.enhanced-table {
  :deep(.p-datatable-thead > tr > th) {
    background: #f8fafc;
    font-weight: 700;
    font-size: 1.12rem;
    color: #1e293b;
    border-bottom: 1px solid #e5e7eb;
    padding: 1.1rem 1rem;
    text-align: center;
  }
  :deep(.p-datatable-tbody > tr > td) {
    padding: 1.1rem 1rem;
    font-size: 1.08rem;
    vertical-align: middle;
    background: #fff;
    border-bottom: 1px solid #f1f5f9;
    text-align: center;
  }
  :deep(.p-datatable-tbody > tr > td:nth-child(2)),
  :deep(.p-datatable-tbody > tr > td:nth-child(3)),
  :deep(.p-datatable-tbody > tr > td:nth-child(4)) {
    text-align: left;
  }
  :deep(.p-datatable-tbody > tr > td:nth-child(1)) {
    text-align: center;
  }
  :deep(.p-datatable-tbody > tr > td:nth-child(5)),
  :deep(.p-datatable-tbody > tr > td:nth-child(6)),
  :deep(.p-datatable-tbody > tr > td:nth-child(7)),
  :deep(.p-datatable-tbody > tr > td:last-child) {
    text-align: center;
  }
  :deep(.user-details .username) {
    color: #1e293b;
    font-weight: 800;
    font-size: 1.08rem;
  }
  :deep(.user-details .email) {
    color: #64748b;
    font-size: 0.97rem;
  }
  :deep(.role-tag) {
    font-size: 1.04rem;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #3b82f6;
  }
  :deep(.status-tag) {
    font-size: 1.04rem;
    font-weight: 700;
    color: #22c55e;
  }
  :deep(.p-datatable-tbody > tr) {
    transition: background 0.2s, border-left 0.2s, box-shadow 0.2s, transform 0.25s, opacity 0.5s;
    opacity: 0;
    transform: translateY(20px) scale(0.98);
    animation: fadeInRow 0.7s forwards;
    animation-delay: calc(var(--row-index, 0) * 60ms);
    &:hover {
      background: #e0f2fe;
      border-left: 5px solid #8b5cf6;
      box-shadow: 0 4px 16px rgba(59,130,246,0.13);
      transform: scale(1.012);
    }
    td:first-child { border-radius: 0.5rem 0 0 0.5rem; }
    td:last-child { border-radius: 0 0.5rem 0.5rem 0; }
  }
}
.enhanced-avatar {
  box-shadow: 0 2px 8px rgba(59,130,246,0.18);
  border: 2.5px solid #fff;
  transition: border-color 0.3s;
}
.enhanced-role-tag {
  background: #eff6ff;
  color: #2563eb;
  border-radius: 0.5rem;
  font-weight: 600;
  padding: 0.2rem 0.9rem;
  font-size: 0.98rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  i { color: #2563eb; }
}
.enhanced-status-tag {
  background: #dcfce7;
  color: #166534;
  border-radius: 0.5rem;
  font-weight: 600;
  padding: 0.2rem 0.9rem;
  font-size: 0.98rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  i { color: #22c55e; }
}
.ripple-btn {
  position: relative;
  overflow: hidden;
  transition: background 0.2s, color 0.2s, transform 0.1s;
  &:active {
    transform: scale(0.96);
  }
}
@media (max-width: 768px) {
  .enhanced-table {
    :deep(.p-datatable-thead > tr > th:nth-child(3)),
    :deep(.p-datatable-tbody > tr > td:nth-child(3)),
    :deep(.p-datatable-thead > tr > th:nth-child(4)),
    :deep(.p-datatable-tbody > tr > td:nth-child(4)),
    :deep(.p-datatable-thead > tr > th:nth-child(5)),
    :deep(.p-datatable-tbody > tr > td:nth-child(5)),
    :deep(.p-datatable-thead > tr > th:nth-child(7)),
    :deep(.p-datatable-tbody > tr > td:nth-child(7)) {
      display: none !important;
    }
    :deep(.action-animated-btn) {
      width: 3rem !important;
      height: 3rem !important;
      font-size: 2rem !important;
    }
  }
}
.enhanced-toast {
  :deep(.p-toast-message) {
    animation: fadeInToast 0.5s;
    border-radius: 1rem;
    box-shadow: 0 4px 24px rgba(59,130,246,0.13);
    .p-toast-message-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      .p-toast-message-icon {
        font-size: 2rem;
        margin-right: 0.5rem;
      }
    }
  }
}
@keyframes fadeInToast {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
.enhanced-dialog {
  :deep(.p-dialog) {
    animation: dialogPopIn 0.4s;
    border-radius: 1.2rem;
    .p-dialog-header {
      background: #fef3c7;
      color: #b45309;
      border-radius: 1.2rem 1.2rem 0 0;
    }
    .p-dialog-footer {
      .p-confirm-dialog-accept {
        background: linear-gradient(90deg, #10b981, #3b82f6);
        color: #fff;
        font-weight: 700;
        border-radius: 0.7rem;
        font-size: 1.1rem;
        box-shadow: 0 2px 8px rgba(16,185,129,0.10);
        &:hover { background: linear-gradient(90deg, #3b82f6, #10b981); }
      }
      .p-confirm-dialog-reject {
        background: #ef4444;
        color: #fff;
        font-weight: 700;
        border-radius: 0.7rem;
        font-size: 1.1rem;
        box-shadow: 0 2px 8px rgba(239,68,68,0.10);
        &:hover { background: #b91c1c; }
      }
    }
  }
  .animated-dialog {
    animation: dialogPopIn 0.4s;
  }
  .dialog-icon-animated {
    animation: iconBounce 0.7s;
  }
}
@keyframes dialogPopIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes iconBounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.3); }
  60% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
.skeleton-table {
  padding: 2rem 0.5rem;
  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-bottom: 1.1rem;
    animation: fadeIn 0.7s;
  }
  .skeleton-avatar {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    border: 2px solid #e0e7ef;
    background: linear-gradient(90deg, #f1f5f9 25%, #e0e7ef 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: skeletonShine 1.2s infinite linear;
  }
  .skeleton-cell {
    height: 1.2rem;
    border-radius: 0.5rem;
    background: linear-gradient(90deg, #f1f5f9 25%, #e0e7ef 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: skeletonShine 1.2s infinite linear;
  }
  .skeleton-action {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    background: linear-gradient(90deg, #f1f5f9 25%, #e0e7ef 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: skeletonShine 1.2s infinite linear;
  }
}
@keyframes skeletonShine {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.enhanced-empty-state {
  padding: 2.5rem 1rem 2rem 1rem;
  text-align: center;
  color: #64748b;
  .empty-svg {
    margin-bottom: 1.2rem;
    animation: emptyBounce 1.2s infinite alternate;
  }
  h3 {
    color: #1e293b;
    font-weight: 800;
    margin: 0 0 0.5rem;
    font-size: 1.35rem;
  }
  p {
    margin: 0 0 1.2rem 0;
    font-size: 1.05rem;
    color: #64748b;
    animation: textFade 2s infinite alternate;
  }
  .clear-empty-btn {
    background: linear-gradient(90deg, #10b981, #3b82f6);
    color: #fff;
    font-weight: 700;
    border-radius: 0.7rem;
    font-size: 1.1rem;
    box-shadow: 0 2px 8px rgba(16,185,129,0.10);
    &:hover { background: linear-gradient(90deg, #3b82f6, #10b981); }
  }
}
@keyframes emptyBounce {
  0% { transform: translateY(0); }
  100% { transform: translateY(-10px) scale(1.08); }
}
@keyframes textFade {
  0% { color: #64748b; }
  100% { color: #3b82f6; }
}
.avatar-tooltip {
  font-size: 1rem;
  .role-tooltip {
    color: #8b5cf6;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}
.action-animated-btn {
  font-size: 1.5rem !important;
  transition: background 0.2s, color 0.2s, transform 0.1s;
  &:active {
    animation: rippleEffect 0.4s;
  }
}
.action-ban-btn {
  background: #ef4444 !important;
  color: #fff !important;
  &:hover {
    background: linear-gradient(90deg, #f59e0b, #ef4444) !important;
    color: #fff !important;
    animation: shakeX 0.4s;
  }
}
.action-activate-btn {
  background: #22c55e !important;
  color: #fff !important;
  &:hover {
    background: linear-gradient(90deg, #3b82f6, #10b981) !important;
    color: #fff !important;
    animation: pulseBtn 0.4s;
  }
}
@keyframes rippleEffect {
  0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.15); }
  100% { box-shadow: 0 0 0 16px rgba(59,130,246,0); }
}
@keyframes shakeX {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
@keyframes pulseBtn {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
@media (max-width: 768px) {
  .action-animated-btn {
    width: 3rem !important;
    height: 3rem !important;
    font-size: 2rem !important;
  }
}
.pagination-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.2rem;
  background: #f8fafc;
  border-radius: 1rem;
  padding: 0.7rem 1.2rem;
  box-shadow: 0 1px 3px rgba(59,130,246,0.07);
  .pagination-buttons {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    justify-content: center;
    .btn {
      border-radius: 0.7rem;
      font-weight: 700;
      padding: 0.4rem 1.1rem;
      font-size: 1.05rem;
      background: #f3f4f6;
      color: #334155;
      border: none;
      transition: background 0.2s;
      &:hover:not(:disabled) { background: #e0e7ef; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .page-info {
      font-size: 1.08rem;
      font-weight: 700;
      color: #3b82f6;
      margin: 0 0.7rem;
    }
  }
}
.search-filter-section {
  background: rgba(255,255,255,0.7);
  border-radius: 2rem;
  padding: 1.5rem 2.5rem;
  margin-bottom: 1.2rem;
  box-shadow: 0 8px 32px rgba(59,130,246,0.13);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(59,130,246,0.13);

  .search-filter-container {
    display: flex;
    align-items: center;
    gap: 2rem;

    .search-box {
      min-width: 260px;
      max-width: 340px;
      .search-input {
        border-radius: 2.5rem;
        background: rgba(241,245,249,0.85);
        border: 2px solid #e0e7ef;
        padding: 1.1rem 1.7rem 1.1rem 3.2rem;
        font-size: 1.15rem;
        box-shadow: 0 4px 16px rgba(59,130,246,0.10);
        transition: all 0.3s;
        &:focus {
          border-color: #6366f1;
          background: rgba(255,255,255,0.95);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.13);
        }
      }
      .pi-search {
        left: 1.5rem;
        color: #6366f1;
        font-size: 1.4rem;
        filter: drop-shadow(0 0 4px #6366f1aa);
      }
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex: 1;

      .filter-dropdown {
        min-width: 170px;
        border-radius: 1.5rem;
        background: rgba(241,245,249,0.85);
        border: 1.5px solid #e0e7ef;
        font-size: 1.12rem;
        box-shadow: 0 2px 12px rgba(139,92,246,0.10);
        transition: all 0.3s;
        &:hover, &.p-focus {
          border-color: #6366f1;
          background: rgba(255,255,255,0.95);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
        }
        .p-dropdown-label {
          padding: 1rem 1.3rem;
        }
      }

      .status-option, .role-option {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        .filter-icon-animated {
          font-size: 1.2rem;
          background: linear-gradient(90deg, #6366f1, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 4px #6366f1aa);
          transition: filter 0.2s, transform 0.2s;
        }
      }

      .enhanced-clear-btn {
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: #fff;
        border-radius: 50%;
        width: 3.2rem;
        height: 3.2rem;
        font-size: 1.5rem;
        box-shadow: 0 4px 16px rgba(245,158,11,0.18);
        border: 2.5px solid #fff;
        transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        &:hover {
          background: linear-gradient(135deg, #ef4444, #f59e0b);
          transform: scale(1.13) rotate(-10deg);
          box-shadow: 0 8px 32px rgba(245,158,11,0.22);
        }
      }
    }
  }
}

@media (max-width: 900px) {
  .search-filter-section .search-filter-container {
    flex-direction: column;
    gap: 1.5rem;
    .filter-section {
      width: 100%;
      flex-wrap: wrap;
      gap: 1.2rem;
      .filter-dropdown, .enhanced-clear-btn {
        width: 100%;
        min-width: unset;
      }
    }
  }
}
</style>
