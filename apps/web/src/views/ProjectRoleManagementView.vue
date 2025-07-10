<template>
  <div class="modal-overlay" @click.self="emitClose">
    <div v-if="showCreateRoleModal">
      <transition name="fade-slide">
        <div class="modal-content" style="max-width:900px;width:98vw;">
          <div class="form-card bg-white rounded-xl shadow-md px-6 py-5 w-full max-w-lg mx-auto">
            <h2 class="text-2xl font-semibold text-gray-800 mb-6">Create Role</h2>
            <form @submit.prevent="handleCreateRole">
              <div class="form-group">
                <label for="roleName">Role Name</label>
                <div :class="['input-icon-group', { 'input-error-shake': formError && (!roleForm.name || roleForm.name.length < 3 || !/^[\w\s-]+$/.test(roleForm.name)) }]">
                  <span class="left-icon-container">
                    <span class="input-icon">👤</span>
                  </span>
                  <input
                    id="roleName"
                    v-model="roleForm.name"
                    :disabled="creatingOrUpdatingRole"
                    placeholder="Enter role name"
                    required
                    :class="{ 'input-error-border': formError && (!roleForm.name || roleForm.name.length < 3 || !/^[\w\s-]+$/.test(roleForm.name)) }"
                    ref="roleNameInput"
                  />
                </div>
                <div v-if="formError && !roleForm.name" class="input-error input-error-text">❗ Role name is required</div>
                <div v-else-if="formError && roleForm.name && !/^[\w\s-]+$/.test(roleForm.name)" class="input-error input-error-text">❗ Role name cannot contain special characters</div>
                <div v-else-if="formError && roleForm.name && roleForm.name.length < 3" class="input-error input-error-text">❗ Role name must be at least 3 characters</div>
              </div>
              <div class="form-group">
                <label>Permissions</label>
                <div class="select-all-row">
                  <input type="checkbox" id="selectAllPerms" :checked="allPermissionsSelected" @change="toggleSelectAllPerms" :disabled="creatingOrUpdatingRole" />
                  <label for="selectAllPerms" class="select-all-label">Select All Permissions</label>
                </div>
                <multiselect
                  v-model="permissionFlagsProxy"
                  :options="groupedPermissionOptions"
                  :group-label="'label'"
                  :group-values="'options'"
                  :multiple="true"
                  :close-on-select="false"
                  :clear-on-select="false"
                  :preserve-search="true"
                  :searchable="true"
                  :placeholder="'Select permissions...'"
                  track-by="value"
                  label="label"
                  :custom-label="customPermissionLabel"
                  :show-labels="false"
                  :max-height="350"
                  class="permission-multiselect"
                  :disabled="creatingOrUpdatingRole"
                  :append-to-body="false"
                >
                  <template #option="{ option }">
                    <div v-if="option.label && typeof option.label === 'string' && option.label.trim() !== ''" class="perm-option">
                      <span class="perm-icon">🔐</span>
                      <span class="perm-label">{{ option.label }}</span>
                      <span class="perm-description">{{ option.description }}</span>
                    </div>
                  </template>
                  <template #tag="{ option, remove }">
                    <span v-if="option.label && typeof option.label === 'string' && option.label.trim() !== ''" class="perm-tag">
                      <span class="perm-icon">🔐</span>{{ option.label }}
                      <span class="perm-tag-remove" @click.stop="remove(option)">×</span>
                    </span>
                  </template>
                </multiselect>
                <div v-if="formError && roleForm.permissionFlags.length === 0" class="input-error">Please select at least one permission</div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="() => { showCreateRoleModal = false; emitClose(); }" :disabled="creatingOrUpdatingRole">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="creatingOrUpdatingRole">
                  <span v-if="creatingOrUpdatingRole" class="loading-spinner-small"></span>
                  <span v-else>Create</span>
                </button>
              </div>
            </form>
          </div>
          <transition name="fade-in">
            <div v-if="toastMessage" class="toast-success">{{ toastMessage }}</div>
          </transition>
        </div>
      </transition>
    </div>
    <div v-else class="modal-content" style="max-width:900px;width:95vw;">
      <div class="role-management-view">
        <h1>Project Role Management</h1>
        <div v-if="loading && !props.showCreateRoleModal" class="loading-container">
          <div class="loading-spinner"></div>
          Loading roles...
        </div>
        <div v-else-if="error && !props.showCreateRoleModal" class="error-container">
          <div class="error-content">
            <div class="error-icon">⚠️</div>
            <h3>Error</h3>
            <p>{{ error }}</p>
          </div>
        </div>
        <div v-if="showCreateRoleModal">
          <div class="modal-content">
            <h3>{{ editingRole ? 'Edit Role' : 'Create Role' }}</h3>
            <form @submit.prevent="editingRole ? updateRole() : createRole()">
              <div class="form-group">
                <label>Role Name</label>
                <input v-model="roleForm.name" placeholder="Role Name" required />
              </div>
              <div class="form-group">
                <label>Permissions</label>
                <multiselect
                  v-model="roleForm.permissionFlags"
                  :options="groupedPermissionOptions"
                  :group-label="'label'"
                  :group-values="'options'"
                  :multiple="true"
                  :close-on-select="false"
                  :clear-on-select="false"
                  :preserve-search="true"
                  :searchable="true"
                  :placeholder="'Select permissions...'"
                  track-by="value"
                  label="label"
                  :custom-label="customPermissionLabel"
                  :show-labels="false"
                  :max-height="350"
                  class="permission-multiselect"
                >
                  <template #option="{ option }">
                    <div class="perm-option">
                      <span class="perm-label">{{ option.label }}</span>
                      <span class="perm-description">{{ option.description }}</span>
                    </div>
                  </template>
                  <template #tag="{ option, remove }">
                    <span class="perm-tag">
                      {{ option.label }}
                      <span class="perm-tag-remove" @click.stop="remove(option)">×</span>
                    </span>
                  </template>
                </multiselect>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="() => { showCreateRoleModal = false; emitClose(); }">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="creatingOrUpdatingRole">
                  <span v-if="creatingOrUpdatingRole" class="loading-spinner-small"></span>
                  <span v-else>{{ editingRole ? 'Update' : 'Create' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        <template v-else>
          <div class="roles-header">
            <h2>Roles</h2>
            <!-- Đã xóa nút Add Role ở đây -->
          </div>
          <div class="table-responsive">
            <table v-if="roles.length > 0 && !isMobile" class="roles-table">
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
                <td style="position:relative;">
                    <span
                      class="permission-label"
                      :title="formatPermissionLabel(role.permissionFlags)"
                      @mouseenter="showFullPerms = role.id"
                      @mouseleave="showFullPerms = null"
                    >
                      {{ shortPermissionLabel(role.permissionFlags) }}
                      <span v-if="getPermissionCount(role.permissionFlags) > 3" style="color:#3182ce;">
                        +{{ getPermissionCount(role.permissionFlags) - 3 }} more
                      </span>
                    </span>
                  <div
                    v-if="showFullPerms === role.id && getPermissionCount(role.permissionFlags) > 3"
                    class="discord-perm-tooltip"
                  >
                    {{ formatPermissionLabel(role.permissionFlags) }}
                  </div>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-outline btn-sm" @click="openEditRole(role)">
                      <span class="icon">✏️</span> Edit
                    </button>
                    <button class="btn btn-outline-danger btn-sm" @click="deleteRole(role.id)" :disabled="deletingRoleId === role.id">
                      <span v-if="deletingRoleId === role.id" class="loading-spinner-small"></span>
                      <span v-else><span class="icon">🗑️</span> Delete</span>
                    </button>
                    <button class="btn btn-outline-users btn-sm" @click="viewRoleUsers(role)">
                      <span class="icon">👥</span> Users
                    </button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
            <!-- Card layout for mobile -->
            <div v-else-if="roles.length > 0 && isMobile" class="roles-card-list">
              <div v-for="role in roles" :key="role.id" class="role-card">
                <div><strong>Role:</strong> {{ role.name }}</div>
                <div style="position:relative;"><strong>Permissions:</strong>
                  <span
                    class="permission-label"
                    :title="formatPermissionLabel(role.permissionFlags)"
                    @mouseenter="showFullPerms = role.id"
                    @mouseleave="showFullPerms = null"
                    @click="showFullPerms = showFullPerms === role.id ? null : role.id"
                    style="cursor:pointer;"
                  >
                    {{ shortPermissionLabel(role.permissionFlags) }}
                    <span v-if="getPermissionCount(role.permissionFlags) > 3" style="color:#3182ce;">
                      +{{ getPermissionCount(role.permissionFlags) - 3 }} more
                    </span>
                  </span>
                  <div
                    v-if="showFullPerms === role.id && getPermissionCount(role.permissionFlags) > 3"
                    class="discord-perm-tooltip"
                  >
                    {{ formatPermissionLabel(role.permissionFlags) }}
                  </div>
                </div>
                <div class="action-buttons">
                  <button class="btn btn-menu" @click="toggleActionMenu(role.id)">⋮</button>
                  <div v-if="actionMenuOpen === role.id" class="action-dropdown">
                    <button @click="openEditRole(role)"><span class="icon">✏️</span> Edit</button>
                    <button @click="deleteRole(role.id)"><span class="icon">🗑️</span> Delete</button>
                    <button @click="viewRoleUsers(role)"><span class="icon">👥</span> Users</button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="roles.length === 0" class="empty-section">
              <p>No roles defined for this project.</p>
            </div>
          </div>
          <div v-if="selectedRole" class="role-users-section">
            <h3>Users in Role: {{ selectedRole.name }}</h3>
            <button class="btn btn-secondary" @click="selectedRole = null">Back to Roles</button>
            <div v-if="roleUsersLoading" class="loading">Loading users...</div>
            <div v-else-if="roleUsersError" class="error">{{ roleUsersError }}</div>
            <div class="table-responsive">
              <table v-if="roleUsers.length > 0 && !isMobile" class="users-table">
                <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="member in roleUsers" :key="member.id">
                  <td>{{ member.fullName || '-' }}</td>
                  <td>{{ member.username }}</td>
                  <td style="position:relative;">
                    <span
                      class="role-badges-group"
                      @mouseenter="showFullRoles = member.id"
                      @mouseleave="showFullRoles = null"
                      @click="showFullRoles = showFullRoles === member.id ? null : member.id"
                      style="cursor:pointer;"
                    >
                      <span
                        v-for="(role, idx) in member.roles.slice(0, 3)"
                        :key="role.id"
                        :class="['role-badge', getRoleBadgeClass(role.name)]"
                      >{{ role.name }}</span>
                      <span v-if="getRoleCount(member.roles) > 3" style="color:#3182ce; font-weight:600;">
                        +{{ getRoleCount(member.roles) - 3 }} more
                      </span>
                    </span>
                    <div
                      v-if="showFullRoles === member.id && getRoleCount(member.roles) > 3"
                      class="discord-role-tooltip"
                      style="display:flex; flex-wrap:wrap; gap:0.5em;"
                    >
                      <span
                        v-for="role in member.roles"
                        :key="role.id"
                        :class="['role-badge', getRoleBadgeClass(role.name)]"
                        style="margin-bottom:0.2em;"
                      >{{ role.name }}</span>
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-outline-danger btn-xs" @click="removeUserFromRole(member.id)" :disabled="removingUserId === member.id">
                      <span v-if="removingUserId === member.id" class="loading-spinner-small"></span>
                      <span v-else><span class="icon">🗑️</span> Remove</span>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
              <!-- Card layout for mobile -->
              <div v-else-if="roleUsers.length > 0 && isMobile" class="users-card-list">
                <div v-for="member in roleUsers" :key="member.id" class="user-card">
                  <div><strong>Name:</strong> {{ member.fullName || '-' }}</div>
                  <div><strong>Username:</strong> {{ member.username }}</div>
                  <div class="action-buttons">
                    <button class="btn btn-outline-danger btn-xs" @click="removeUserFromRole(member.id)" :disabled="removingUserId === member.id">
                      <span v-if="removingUserId === member.id" class="loading-spinner-small"></span>
                      <span v-else><span class="icon">🗑️</span> Remove</span>
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="roleUsers.length === 0" class="empty-section">
                <span class="empty-icon">👤</span>
                <p>No users in this role.</p>
              </div>
            </div>

            <div v-if="addUserError" class="input-error">{{ addUserError }}</div>
          </div>
        </template>
        <EditRoleModal
          v-if="showEditRoleModal && editingRoleData"
          :role="editingRoleData"
          :project-id="props.projectId"
          @close="handleEditRoleClose"
          @updated="() => handleEditRoleClose(true)"
        />
        <div class="modal-actions" style="margin-top: 2rem;">
          <button class="btn btn-secondary" @click="emitClose">Close</button>
        </div>
        <div v-if="toastMessage" class="toast-success">{{ toastMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, defineProps, defineEmits, computed, watch } from 'vue';
import axiosInstance from '../api';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';
import EditRoleModal from '../components/EditRoleModal.vue';
import { nextTick } from 'vue';
import { PermissionFlags } from '@here-to-translate/common';
const roleNameInput = ref<HTMLInputElement | null>(null);

const props = defineProps<{ projectId: string, showCreateRoleModal?: boolean }>();
const emit = defineEmits(['close', 'roles-updated']);
const emitClose = () => emit('close');

const loading = ref(true);
const error = ref('');
const roles = ref<any[]>([]);
const showCreateRoleModal = ref(false);
const editingRole = ref(false);
const creatingOrUpdatingRole = ref(false);
const deletingRoleId = ref(null);
const removingUserId = ref(null);
const isMobile = computed(() => window.innerWidth < 700);
const actionMenuOpen = ref(null);
const permissionsLoading = ref(true);
const availablePermissions = ref<any[]>([]);
const permissionSearch = ref('');
const collapsedGroups = ref<Record<string, boolean>>({});
const openedGroupKey = ref<string>('');
const formError = ref(false);
const allPermissionsSelected = computed(() => {
  return roleForm.value.permissionFlags.length === availablePermissions.value.length;
});
function toggleSelectAllPerms(): void {
  if (allPermissionsSelected.value) {
    roleForm.value.permissionFlags = [];
  } else {
    roleForm.value.permissionFlags = availablePermissions.value.map((p: any) => p.value);
  }
}

const permissionGroups = [
  {
    key: 'project',
    label: '🛠 Project Management',
    values: ['ProjectAdmin', 'ManageRoles', 'ManageBranches', 'ManageProjectMetadata', 'ManageGroups'],
  },
  {
    key: 'member',
    label: '👥 Members & Groups',
    values: ['ManageMembers', 'ManageWorkspaces'],
  },
  {
    key: 'discussion',
    label: '💬 Discussions',
    values: ['ManageDiscussions', 'ManageComments', 'PostComment', 'Vote', 'AttachFiles', 'ViewThread'],
  },
  {
    key: 'access',
    label: '🔐 Access Permissions',
    values: ['ViewAudit', 'ReviewCommit', 'PushCommit', 'ReviewRequests', 'ViewRequest', 'ManageWorkspaceMetadata', 'ViewWorkspace', 'ViewProject'],
  },
];

const permissionDescriptionMap: Record<string, string> = {
  ProjectAdmin: 'Project admin - all permissions',
  ManageMembers: 'Manage members – add/remove/change roles',
  ManageBranches: 'Manage project branches',
  ManageRoles: 'Manage roles in the project',
  ManageWorkspaces: 'Manage workspaces',
  ManageGroups: 'Manage project groups',
  ManageProjectMetadata: 'Manage project metadata',
  ManageDiscussions: 'Manage discussions',
  ViewAudit: 'View audit log',
  ReviewCommit: 'Review commits in workspace',
  PushCommit: 'Push commits to workspace',
  ReviewRequests: 'Review requests in workspace',
  ViewRequest: 'View requests in workspace',
  ManageWorkspaceMetadata: 'Manage workspace metadata',
  ViewWorkspace: 'View workspace',
  ManageComments: 'Manage comments in discussions',
  PostComment: 'Post comments',
  Vote: 'Vote in discussions',
  AttachFiles: 'Attach files in discussions',
  ViewThread: 'View discussions',
  ViewProject: 'View project metadata',
};

const mappedAvailablePermissions = computed(() =>
  availablePermissions.value.map((p: any) => ({
    ...p,
    description: permissionDescriptionMap[p.value] || p.description || p.value
  }))
);

const groupedPermissions = computed(() => {
  const search = permissionSearch.value.trim().toLowerCase();
  const groups: Record<string, { label: string, permissions: any[] }> = {};
  for (const group of permissionGroups) {
    const perms = mappedAvailablePermissions.value.filter((p: any) =>
      group.values.includes(p.value) && (!search || p.label.toLowerCase().includes(search) || p.description.toLowerCase().includes(search))
    );
    if (perms.length) {
      groups[group.key] = { label: group.label, permissions: perms };
    }
  }
  // Các quyền chưa nhóm
  const grouped = permissionGroups.flatMap((g: any) => g.values);
  const otherPerms = mappedAvailablePermissions.value.filter((p: any) =>
    !grouped.includes(p.value) && (!search || p.label.toLowerCase().includes(search) || p.description.toLowerCase().includes(search))
  );
  if (otherPerms.length) {
    groups['other'] = { label: 'Other', permissions: otherPerms };
  }
  return groups;
});

watch(groupedPermissions, (groups: Record<string, { label: string, permissions: any[] }>) => {
  const keys = Object.keys(groups);
  if (!keys.includes(openedGroupKey.value)) {
    openedGroupKey.value = keys[0] || '';
  }
}, { immediate: true });

function toggleAllGroup(groupKey: string, checked: boolean): void {
  const group = groupedPermissions.value[groupKey];
  if (!group) return;
  if (checked) {
    roleForm.value.permissionFlags = Array.from(new Set([
      ...roleForm.value.permissionFlags,
      ...group.permissions.map((p: any) => p.value)
    ]));
  } else {
    roleForm.value.permissionFlags = roleForm.value.permissionFlags.filter((f: any) => !group.permissions.some((p: any) => p.value === f));
  }
}

interface RoleForm {
  name: string;
  permissionFlags: string[];
  id?: string;
}
const roleForm = ref<RoleForm>({ name: '', permissionFlags: [] });
const selectedRole = ref<any>(null);
const roleUsers = ref<any[]>([]);
const roleUsersLoading = ref(false);
const roleUsersError = ref('');
const addUserIdentifier = ref('');
const addUserError = ref('');
const addingUser = ref(false);
const toastMessage = ref('');
const showEditRoleModal = ref(false);
const editingRoleData = ref(null);
const showFullPerms = ref<string | null>(null);
const showFullRoles = ref<string | null>(null);

function parsePermissionFlags(raw) {
  // Nếu là reactive object có _value hoặc value
  if (raw && typeof raw === 'object') {
    if ('_value' in raw) return parsePermissionFlags(raw._value);
    if ('value' in raw) return parsePermissionFlags(raw.value);
  }
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (!isNaN(Number(raw))) {
        const num = BigInt(raw);
        return Object.keys(PermissionFlags).filter(
          (k) => typeof PermissionFlags[k] === 'bigint' && (num & PermissionFlags[k]) !== BigInt(0)
        );
      }
    } catch {
      if (!isNaN(Number(raw))) {
        const num = BigInt(raw);
        return Object.keys(PermissionFlags).filter(
          (k) => typeof PermissionFlags[k] === 'bigint' && (num & PermissionFlags[k]) !== BigInt(0)
        );
      }
    }
  }
  return [];
}

function openEditRole(role: any) {
  showCreateRoleModal.value = false;
  editingRoleData.value = role;
  showEditRoleModal.value = true;
  // Log permissionFlags để debug
  console.log('role.permissionFlags:', role.permissionFlags);
  roleForm.value = {
    name: role.name,
    permissionFlags: parsePermissionFlags(role.permissionFlags),
    id: role.id
  };
}
function handleEditRoleClose(reload = false) {
  showEditRoleModal.value = false;
  editingRoleData.value = null;
  showCreateRoleModal.value = false;
  if (reload) {
    loadRoles();
    emit('roles-updated');
  }
  // Mở lại modal quản lý vai trò sau khi đóng modal nhỏ
  setTimeout(() => { showCreateRoleModal.value = false; }, 0); // Đảm bảo không bị flicker
}

const loadRoles = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await axiosInstance.get(`/projects/${props.projectId}/roles`);
    roles.value = data;
  } catch (err: any) {
    error.value = err.message || 'Failed to load roles';
  } finally {
    loading.value = false;
  }
};

const loadPermissions = async () => {
  permissionsLoading.value = true;
  try {
    // Hardcode các quyền đúng key với PermissionFlags để test
    availablePermissions.value = [
      { value: 'ProjectAdmin', label: 'Project Admin' },
      { value: 'ManageRoles', label: 'Manage Roles' },
      { value: 'ManageMembers', label: 'Manage Members' },
      { value: 'ManageBranches', label: 'Manage Branches' },
      { value: 'ManageGroups', label: 'Manage Groups' },
      { value: 'ManageProjectMetadata', label: 'Manage Project Metadata' },
      { value: 'ManageWorkspaces', label: 'Manage Workspaces' },
      { value: 'ManageDiscussions', label: 'Manage Discussions' },
      { value: 'ViewAudit', label: 'View Audit' },
      { value: 'ReviewCommit', label: 'Review Commit' },
      { value: 'PushCommit', label: 'Push Commit' },
      { value: 'ReviewRequests', label: 'Review Requests' },
      { value: 'ViewRequest', label: 'View Request' },
      { value: 'ManageWorkspaceMetadata', label: 'Manage Workspace Metadata' },
      { value: 'ViewWorkspace', label: 'View Workspace' },
      { value: 'ViewProject', label: 'View Project' },
      { value: 'ManageComments', label: 'Manage Comments' },
      { value: 'PostComment', label: 'Post Comment' },
      { value: 'Vote', label: 'Vote' },
      { value: 'AttachFiles', label: 'Attach Files' },
      { value: 'ViewThread', label: 'View Thread' }
    ];
    console.log('Hardcoded availablePermissions:', availablePermissions.value);
  } catch (err) {
    console.error('Failed to load permissions:', err);
  } finally {
    permissionsLoading.value = false;
  }
};

const permissionFlagsProxy = computed({
  get() {
    return availablePermissions.value.filter(p => roleForm.value.permissionFlags.includes(p.value));
  },
  set(val) {
    // Convert mọi object option thành string key
    roleForm.value.permissionFlags = (val || []).map((item: any) => {
      let v = item;
      let depth = 0;
      while (v && typeof v === 'object' && 'value' in v && depth < 10) {
        v = v.value;
        depth++;
      }
      return typeof v === 'string' ? v : '';
    }).filter(Boolean);
  }
});

const groupedPermissionOptions = computed(() => {
  return Object.values(groupedPermissions.value).map((group: any) => ({
    label: group.label,
    options: group.permissions
      .filter((p: any) => typeof p.label === 'string' && p.label.trim() !== '')
      .map((p: any) => ({
        ...p,
        value: p.value,
        label: p.label,
        description: p.description
      }))
  }));
});

function customPermissionLabel(option: any) {
  return option.label;
}

function calculatePermissionFlags(selected: string[]): string {
  let flags = BigInt(0);
  selected.forEach((key) => {
    const val = PermissionFlags[key];
    console.log('[CALC FLAG] key:', key, 'val:', val, 'typeof:', typeof val);
    if (val === undefined) {
      console.warn('[CALC FLAG] WARNING: PermissionFlags[' + key + '] is undefined!');
    } else {
      flags = flags | BigInt(val);
      console.log('[CALC FLAG] flags after OR:', flags.toString());
    }
  });
  if (selected.length === 0) {
    console.warn('[CALC FLAG] WARNING: selectedKeys is empty!');
  }
  return flags.toString();
}

async function handleCreateRole() {
  formError.value = false;
  if (!roleForm.value.name || roleForm.value.permissionFlags.length === 0) {
    formError.value = true;
    return;
  }
  if (!/^[\w\s-]+$/.test(roleForm.value.name)) {
    formError.value = true;
    return;
  }
  if (roleForm.value.name.length < 3) {
    formError.value = true;
    return;
  }
  creatingOrUpdatingRole.value = true;
  try {
    await axiosInstance.post(`/projects/${props.projectId}/roles/create`, {
      name: roleForm.value.name,
      permissionFlags: calculatePermissionFlags(roleForm.value.permissionFlags)
    });
    showCreateRoleModal.value = false;
    roleForm.value = { name: '', permissionFlags: [] };
    emit('roles-updated');
    showToast('Role created successfully!');
    setTimeout(() => emitClose(), 1200);
  } catch (err: any) {
    alert('Failed to create role: ' + err.message);
  } finally {
    creatingOrUpdatingRole.value = false;
  }
}

// Focus input khi lỗi
watch(() => formError.value && !roleForm.value.name, (hasError: boolean) => {
  if (hasError && roleNameInput.value) {
    nextTick(() => roleNameInput.value?.focus());
  }
});

// Thêm watch log cho roleForm.permissionFlags
watch(() => roleForm.value.permissionFlags, (val) => {
  console.log('permissionFlags changed:', val);
});

onMounted(() => {
  if (props.showCreateRoleModal) {
    showCreateRoleModal.value = true;
  } else {
    loadRoles();
  }
  loadPermissions();
  // Mặc định chỉ mở nhóm đầu tiên, các nhóm còn lại đóng
  const keys = Object.keys(groupedPermissions.value);
  if (keys.length) {
    collapsedGroups.value = Object.fromEntries(keys.map((k, i) => [k, i !== 0]));
  }
  console.log('=== DEBUG PermissionFlags at FE ===');
  console.log('PermissionFlags object:', PermissionFlags);
  console.log('typeof PermissionFlags:', typeof PermissionFlags);
  console.log('PermissionFlags keys:', Object.keys(PermissionFlags));
});

function toggleGroupCollapse(groupKey: string) {
  openedGroupKey.value = openedGroupKey.value === groupKey ? '' : groupKey;
}

// Định nghĩa lại hàm formatPermissionLabel để dùng cho table
function formatPermissionLabel(flags: any): string {
  // Nếu là reactive object có _value hoặc value
  if (flags && typeof flags === 'object') {
    if ('_value' in flags) return formatPermissionLabel(flags._value);
    if ('value' in flags) return formatPermissionLabel(flags.value);
  }
  let arr: string[] = [];
  if (Array.isArray(flags)) arr = flags;
  else if (!isNaN(Number(flags))) {
    const num = BigInt(flags);
    arr = Object.keys(PermissionFlags).filter(
      (k) => typeof PermissionFlags[k] === 'bigint' && (num & PermissionFlags[k]) !== BigInt(0)
    );
  } else {
    try {
      arr = JSON.parse(flags);
    } catch {
      arr = [];
    }
  }
  if (arr.length === 0) return 'None';
  return arr.map((p: string) => availablePermissions.value.find((ap: any) => ap.value === p)?.label || p).join(', ');
}

function shortPermissionLabel(flags: any): string {
  let arr = formatPermissionLabel(flags).split(', ');
  return arr.slice(0, 3).join(', ');
}
function getPermissionCount(flags: any): number {
  return formatPermissionLabel(flags).split(', ').length;
}
function shortRoleLabel(roles: any[]): string {
  if (!roles || !roles.length) return '';
  return roles.slice(0, 3).map(r => r.name).join(', ');
}
function getRoleCount(roles: any[]): number {
  return roles ? roles.length : 0;
}

function getRoleBadgeClass(roleName: string) {
  if (!roleName) return 'role-badge-default';
  const name = roleName.toLowerCase();
  if (name.includes('owner')) return 'role-badge-owner';
  if (name.includes('admin')) return 'role-badge-admin';
  if (name.includes('mod')) return 'role-badge-mod';
  if (name.includes('everyone')) return 'role-badge-everyone';
  return 'role-badge-default';
}

// Expose đúng các hàm cần thiết
function addUserToRole(identifier: string) {
  addingUser.value = true;
  addUserError.value = '';
  if (!identifier) {
    addUserError.value = 'User identifier is required.';
    addingUser.value = false;
    return;
  }
  axiosInstance.post(`/projects/${props.projectId}/roles/${editingRoleData.value.id}/add-user`, { identifier })
    .then(() => {
      showToast('User added to role successfully!');
      loadRoleUsers();
    })
    .catch((err: any) => {
      addUserError.value = err.message || 'Failed to add user to role.';
    })
    .finally(() => {
      addingUser.value = false;
    });
}

function removeUserFromRole(userId: string) {
  removingUserId.value = userId;
  axiosInstance.delete(`/projects/${props.projectId}/roles/${editingRoleData.value.id}/remove-user/${userId}`)
    .then(() => {
      showToast('User removed from role successfully!');
      loadRoleUsers();
    })
    .catch((err: any) => {
      alert('Failed to remove user from role: ' + err.message);
    })
    .finally(() => {
      removingUserId.value = null;
    });
}

function deleteRole(roleId: string) {
  deletingRoleId.value = roleId;
  axiosInstance.delete(`/projects/${props.projectId}/roles/${roleId}`)
    .then(() => {
      showToast('Role deleted successfully!');
      loadRoles();
      selectedRole.value = null;
    })
    .catch((err: any) => {
      alert('Failed to delete role: ' + err.message);
    })
    .finally(() => {
      deletingRoleId.value = null;
    });
}

function viewRoleUsers(role: any) {
  selectedRole.value = role;
  loadRoleUsers();
}

async function loadRoleUsers() {
  roleUsersLoading.value = true;
  roleUsersError.value = '';
  try {
    const { data } = await axiosInstance.get(`/projects/${props.projectId}/roles/${selectedRole.value.id}/users`);
    roleUsers.value = data;
  } catch (err: any) {
    roleUsersError.value = err.message || 'Failed to load users for this role.';
  } finally {
    roleUsersLoading.value = false;
  }
}

function createRole() {
  showCreateRoleModal.value = true;
  editingRole.value = false;
  roleForm.value = { name: '', permissionFlags: [] };
  formError.value = false;
  // Mở lại modal quản lý vai trò sau khi đóng modal nhỏ
  setTimeout(() => { showCreateRoleModal.value = false; }, 0); // Đảm bảo không bị flicker
}

function updateRole() {
  if (!editingRoleData.value || !editingRoleData.value.id) return;
  creatingOrUpdatingRole.value = true;
  axiosInstance.put(`/projects/${props.projectId}/roles/${editingRoleData.value.id}`, {
    name: roleForm.value.name,
    permissionFlags: calculatePermissionFlags(roleForm.value.permissionFlags)
  })
    .then(() => {
      showToast('Role updated successfully!');
      handleEditRoleClose(true);
    })
    .catch((err: any) => {
      alert('Failed to update role: ' + err.message);
    })
    .finally(() => {
      creatingOrUpdatingRole.value = false;
    });
}

// Định nghĩa hàm showToast để hiển thị thông báo thành công/thất bại
function showToast(msg: string) {
  toastMessage.value = msg;
  setTimeout(() => { toastMessage.value = ''; }, 2500);
}

defineExpose({
  emitClose,
  loading,
  error,
  roles,
  showCreateRoleModal,
  formatPermissionLabel,
  openEditRole,
  deleteRole,
  viewRoleUsers,
  selectedRole,
  roleUsersLoading,
  roleUsersError,
  roleUsers,
  removeUserFromRole,
  addUserIdentifier,
  addUserToRole,
  editingRole,
  roleForm,
  updateRole,
  createRole
});
</script>

<style scoped>
.role-management-view { max-width: 1200px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); padding: 2rem; }
.roles-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.table-responsive { width: 100%; overflow-x: auto; }
.roles-table, .users-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
.roles-table th, .roles-table td, .users-table th, .users-table td { border: 1px solid #e2e8f0; padding: 0.9rem 1.3rem; text-align: left; vertical-align: middle; }
.roles-table td, .users-table td { text-align: left; }
.action-buttons { display: flex; gap: 0.5rem; align-items: center; justify-content: flex-start; }
.roles-table tr:hover, .users-table tr:hover { background: #f0f6ff; transition: background 0.18s; }
.btn { padding: 0.6rem 1.4rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-primary { background: linear-gradient(135deg, #4299e1 0%, #2563eb 100%) !important; color: #fff !important; border: none; box-shadow: 0 4px 16px #4299e133; transition: all 0.15s; }
.btn-primary:hover:not(:disabled) { background: #2563eb !important; color: #fff !important; filter: brightness(1.08); box-shadow: 0 8px 20px #2563eb44; transition: all 0.15s; }
.btn-outline { background: #f7fafc; color: #2563eb; border: 2px solid #2563eb; }
.btn-outline:hover { background: #2563eb; color: #fff; }
.btn-outline-danger { background: #fff; color: #e53e3e; border: 2px solid #e53e3e; }
.btn-outline-danger:hover { background: #e53e3e; color: #fff; }
.btn-outline-users { background: #fff; color: #4299e1; border: 2px solid #4299e1; }
.btn-outline-users:hover { background: #4299e1; color: #fff; }
.btn-xs { font-size: 0.92rem; padding: 0.3rem 0.7rem; }
.btn-secondary { background: #e2e8f0; color: #2d3748; border: none; border-radius: 8px; padding: 0.6rem 1.4rem; font-weight: 600; transition: background 0.18s; }
.btn-secondary:hover { background: #cbd5e0; }
.btn-menu { background: #f7fafc; border: 2px solid #e2e8f0; color: #2d3748; border-radius: 8px; font-size: 1.3rem; padding: 0.4rem 0.9rem; }
.btn-menu:active, .btn-menu:focus { background: #e2e8f0; }
.action-dropdown { position: absolute; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 16px #3182ce22; z-index: 10; min-width: 120px; right: 0; top: 2.5rem; display: flex; flex-direction: column; }
.action-dropdown button { background: none; border: none; color: #2d3748; padding: 0.8rem 1.2rem; text-align: left; font-size: 1rem; cursor: pointer; transition: background 0.18s; }
.action-dropdown button:hover { background: #f0f6ff; color: #3182ce; }
.empty-section { text-align: center; padding: 2rem; color: #718096; }
.empty-icon { font-size: 2.2rem; margin-bottom: 0.5rem; display: block; }
.permission-label {
  background: #f0fff4;
  color: #276749;
  border-radius: 8px;
  padding: 0.2rem 0.7rem;
  font-size: 0.98em;
  font-weight: 600;
  cursor: pointer;
  position: relative;
}
.input-group { display: flex; align-items: center; background: #f7fafc; border-radius: 8px; border: 2px solid #e2e8f0; padding: 0.5rem 1rem; transition: border 0.2s, box-shadow 0.2s; position: relative; flex: 1; }
.input-icon { font-size: 1.2rem; color: #a0aec0; margin-right: 0.1rem; }
.input-group input { border: none; background: transparent; outline: none; flex: 1; font-size: 1rem; color: #2d3748; padding: 0.9rem 1.1rem 0.9rem 0.1rem; }
.input-error { color: #e53e3e; font-size: 0.98em; margin-top: 0.5rem; }
.loading-spinner-small { width: 1rem; height: 1rem; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: #4299e1; animation: spin 1s linear infinite; margin-right: 0.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-success { position: fixed; top: 2.5rem; right: 2.5rem; background: linear-gradient(90deg, #38a169 0%, #48bb78 100%); color: #fff; padding: 1rem 2.2rem; border-radius: 2rem; font-size: 1.1rem; font-weight: 700; box-shadow: 0 8px 32px rgba(56, 178, 172, 0.18); z-index: 9999; display: flex; align-items: center; gap: 0.7rem; animation: fadeInUp 0.3s; }
@keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.permissions-checkbox-group { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem; }
.perm-checkbox { display: flex; align-items: center; gap: 0.5rem; background: #f7fafc; border-radius: 6px; padding: 0.3rem 0.8rem; }
.perm-checkbox input[type='checkbox'] { margin-right: 0.3rem; }
.permissions-loading { display: flex; align-items: center; gap: 0.5rem; color: #718096; font-size: 0.9rem; }
.perm-label { font-weight: 600; color: #2d3748; }
.perm-description { font-size: 0.85rem; color: #718096; margin-left: 0.5rem; }
.form-group { margin-bottom: 1.2rem; }
/* Card layout for mobile */
@media (max-width: 700px) {
  .roles-table, .users-table, .table-responsive { display: none; }
  .roles-card-list, .users-card-list { display: block; }
  .role-card, .user-card { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #3182ce11; padding: 1rem; margin-bottom: 1.2rem; position: relative; }
  .action-buttons { justify-content: flex-start; position: relative; }
  .btn-menu { margin-left: auto; }
}
.permission-search {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  font-size: 1rem;
}
.permission-group { margin-bottom: 2rem; }
.permission-group-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.7rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3rem; }
.permission-group-header h4 { font-size: 1.1rem; font-weight: 700; margin: 0; flex: 1; }
.permission-grid { display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 1rem; }
@media (min-width: 600px) { .permission-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 900px) { .permission-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.permission-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #f7fafc;
  cursor: pointer;
  transition: box-shadow 0.18s, background 0.18s, border 0.18s;
  position: relative;
}
.permission-card.checked {
  border-color: #4299e1;
  background: #ebf8ff;
  box-shadow: 0 2px 8px #3182ce22;
}
.permission-card:hover {
  background: #e6f0fa;
  border-color: #4299e1;
}
.permission-card input[type='checkbox'] {
  margin-top: 0.2rem;
  accent-color: #4299e1;
  width: 1.2rem;
  height: 1.2rem;
}
.perm-card-content { display: flex; flex-direction: column; gap: 0.2rem; }
.perm-label { font-weight: 700; color: #2d3748; font-size: 1rem; }
.perm-description { font-size: 0.95rem; color: #718096; }
.btn-link { background: none; border: none; color: #4299e1; text-decoration: underline; cursor: pointer; padding: 0.2rem 0.7rem; font-size: 0.98rem; }
.btn-link:hover { color: #2563eb; background: #e6f0fa; border-radius: 6px; }
.collapse-icon {
  font-size: 1.1rem;
  margin-right: 0.5rem;
  color: #4299e1;
  user-select: none;
}
.fade-enter-active, .fade-leave-active { transition: all 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; max-height: 0; }
.fade-enter-to, .fade-leave-from { opacity: 1; max-height: 1000px; }
.permission-multiselect {
  width: 100%;
  margin-bottom: 1.2rem;
}
.perm-option {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.perm-label { font-weight: 700; color: #2d3748; font-size: 1rem; }
.perm-description { font-size: 0.95rem; color: #718096; }
.perm-tag {
  display: inline-flex;
  align-items: center;
  background: #ebf8ff;
  color: #2563eb;
  border-radius: 8px;
  padding: 0.2rem 0.7rem;
  margin-right: 0.5rem;
  font-size: 0.98em;
}
.perm-tag-remove {
  margin-left: 0.5em;
  cursor: pointer;
  color: #e53e3e;
  font-weight: bold;
}
.create-role-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(49,130,206,0.13);
  padding: 2.2rem 2rem 2rem 2rem;
  max-width: 800px;
  margin: 0 auto;
  animation: fadeInCard 0.4s;
}
@keyframes fadeInCard {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 900px) {
  .create-role-card {
    max-width: 98vw;
    padding: 1.2rem 0.5rem 1.5rem 0.5rem;
  }
}
.form-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #2d3748;
  text-align: left;
}
.input-icon-group {
  display: flex;
  align-items: center;
  background: #f7fafc;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  padding: 0;
  transition: border 0.2s, box-shadow 0.2s;
}
.left-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0.9rem;
  padding-right: 0.3rem;
  height: 100%;
}
.input-icon-group input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 1rem;
  color: #2d3748;
  padding: 0.9rem 1.1rem 0.9rem 0.1rem;
}
.select-all-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.select-all-label {
  font-size: 0.98rem;
  color: #2d3748;
  cursor: pointer;
}
.input-error {
  color: #e53e3e;
  font-size: 0.98em;
  margin-top: 0.3rem;
  margin-bottom: 0.2rem;
}
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 1, 0.7, 1.2);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}
.fade-slide-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.fade-in-enter-active, .fade-in-leave-active { transition: opacity 0.25s; }
.fade-in-enter-from, .fade-in-leave-to { opacity: 0; }
/* Giới hạn dropdown multiselect không vượt quá modal */
.permission-multiselect .multiselect__content-wrapper {
  max-width: 100vw !important;
  width: 100% !important;
  min-width: 0 !important;
  left: 0 !important;
  right: 0 !important;
  box-sizing: border-box;
  z-index: 9999 !important;
  overflow-x: auto;
}
@media (max-width: 900px) {
  .permission-multiselect .multiselect__content-wrapper {
    max-width: 98vw !important;
  }
}
.form-card {
  margin: 0 auto;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(49,130,206,0.13);
  padding: 2.2rem 2rem 2rem 2rem;
  max-width: 500px;
}
.input-error-shake {
  animation: shake 0.22s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}
.input-error-border {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 2px #ef444433 !important;
}
.input-error-text {
  color: #dc2626 !important;
  font-weight: 600;
  margin-top: 0.3rem;
}
.permission-multiselect .multiselect__input,
.permission-multiselect .multiselect__placeholder {
  color: #a0aec0 !important; /* text-gray-400 */
  font-style: italic;
}
.discord-perm-tooltip {
  position: absolute;
  background: #23272a;
  color: #fff;
  padding: 0.7em 1.2em;
  border-radius: 8px;
  font-size: 0.98em;
  z-index: 100;
  box-shadow: 0 4px 16px #0005;
  white-space: pre-line;
  max-width: 320px;
  left: 0;
  top: 2.2em;
}
.discord-role-tooltip {
  position: absolute;
  background: #23272a;
  color: #fff;
  padding: 0.7em 1.2em;
  border-radius: 8px;
  font-size: 0.98em;
  z-index: 100;
  box-shadow: 0 4px 16px #0005;
  white-space: pre-line;
  max-width: 320px;
  left: 0;
  top: 2.2em;
}
.role-label {
  background: #f0f4ff;
  color: #2563eb;
  border-radius: 8px;
  padding: 0.2rem 0.7rem;
  font-size: 0.98em;
  font-weight: 600;
  cursor: pointer;
  position: relative;
}
.role-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 0.18em 0.9em;
  font-size: 0.95em;
  font-weight: 700;
  margin-right: 0.3em;
  margin-bottom: 0.1em;
  background: #f3f3f3;
  color: #333;
  border: 1.5px solid #e2e8f0;
  letter-spacing: 0.04em;
}
.role-badge-owner { background: #fefcbf; color: #b7791f; border-color: #b7791f; }
.role-badge-admin { background: #bee3f8; color: #2b6cb0; border-color: #2b6cb0; }
.role-badge-mod { background: #c6f6d5; color: #276749; border-color: #276749; }
.role-badge-everyone { background: #ede9fe; color: #7c3aed; border-color: #7c3aed; }
.role-badge-default { background: #f3f3f3; color: #333; border-color: #e2e8f0; }
.role-badges-group { display: inline-block; }
</style>
