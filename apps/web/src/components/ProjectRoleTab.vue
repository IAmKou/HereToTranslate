<script setup lang="ts">
import { ref, onMounted, watch, defineProps, computed } from 'vue';
import axiosInstance from '../api';

const props = defineProps<{ project: any }>();

// Role management state
const roles = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const showCreateRole = ref(false);
const newRoleName = ref('');
const newRolePermissions = ref<string[]>([]);
const creating = ref(false);
const deletingRoleId = ref<string | null>(null);
const roleNameError = ref('');
const permissionsError = ref('');
const showAllPermissionsModal = ref(false);
const selectedRoleForPermissions = ref<any>(null);

// Member management state
const members = ref([]);
const membersLoading = ref(false);
const membersError = ref('');
const userSearch = ref({
  identifier: '',
  loading: false,
  error: '',
  results: [], // now an array
  addingId: null, // id of user being added
});
const showAddUserSection = ref(false);
const showFullRoles = ref<string | null>(null);

// State cho modal assign role
const showAssignRoleModal = ref(false);
const userToAssignRole = ref(null);
const selectedRoleId = ref('');
const assigningRole = ref(false);

const availablePermissions = [
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
  { value: 'ViewThread', label: 'View Thread' },
];

function parsePermissionFlags(bitmask: string | number | bigint | undefined | any): string[] {
  console.log('parsePermissionFlags input:', bitmask, typeof bitmask);

  if (bitmask === undefined || bitmask === null) {
    console.log('bitmask is undefined/null');
    return [];
  }

  // Handle Vue Proxy objects - extract the actual value
  let actualBitmask = bitmask;
  if (typeof bitmask === 'object' && bitmask !== null) {
    // Try to get the actual value from the proxy
    actualBitmask = bitmask.value || bitmask.permissionFlags || bitmask.flags || bitmask;
    console.log('extracted from proxy:', actualBitmask);

    // If the extracted value is still an object, try to get its value
    if (typeof actualBitmask === 'object' && actualBitmask !== null) {
      actualBitmask = actualBitmask.value || actualBitmask._value || actualBitmask.toString();
      console.log('further extracted:', actualBitmask);
    }
  }

  let flags: bigint;

  try {
    if (typeof actualBitmask === 'bigint') {
      flags = actualBitmask;
    } else if (typeof actualBitmask === 'string') {
      flags = BigInt(actualBitmask);
    } else if (typeof actualBitmask === 'number') {
      flags = BigInt(actualBitmask);
    } else {
      console.log('actualBitmask is not a valid type:', typeof actualBitmask, actualBitmask);
      return [];
    }

    console.log('parsed flags:', flags.toString());

    const permissions = availablePermissions
      .filter((_, index) => {
        const mask = BigInt(1) << BigInt(index);
        return (flags & mask) !== BigInt(0);
      })
      .map(p => p.label);

    console.log('parsed permissions:', permissions);
    return permissions;
  } catch (e) {
    console.error('Invalid permissionFlags:', actualBitmask, e);
    return [];
  }
}

// Fetch roles
const fetchRoles = async () => {
  if (!props.project?.id) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await axiosInstance.get(
      `/projects/${props.project.id}/roles`
    );
    console.log('Fetched roles data:', data);
    roles.value = data;
  } catch (err: any) {
    error.value = err.message || 'Failed to load roles.';
  } finally {
    loading.value = false;
  }
};

// Fetch members
const loadMembers = async () => {
  if (!props.project) return;
  membersLoading.value = true;
  membersError.value = '';
  try {
    const { data } = await axiosInstance.get(`/projects/${props.project.id}/members`);
    // Map lại member.roles đúng chuẩn
    const memberMap = {};
    if (data.members) {
      for (const m of data.members) {
        let roles = Array.isArray(m.roles) ? m.roles.filter((r) => r && r.id && r.name) : [];
        memberMap[m.id] = { ...m, roles, selectedRole: '' };
      }
    }
    if (data.projectRoles) {
      for (const role of data.projectRoles) {
        if (role.users) {
          for (const user of role.users) {
            if (!memberMap[user.id]) {
              memberMap[user.id] = { ...user, roles: [], selectedRole: '' };
            }
            if (!memberMap[user.id].roles.some((r) => r.id === role.id)) {
              memberMap[user.id].roles.push({ id: role.id, name: role.name });
            }
          }
        }
      }
    }

    // Add Project Owner role with all permissions for project owner
    if (props.project?.createdBy?.id) {
      const ownerId = props.project.createdBy.id;
      if (memberMap[ownerId]) {
        // Check if Project Owner role already exists
        const hasProjectOwnerRole = memberMap[ownerId].roles.some(r => r.name === 'Project Owner');
        if (!hasProjectOwnerRole) {
          memberMap[ownerId].roles.push({
            id: 'project-owner',
            name: 'Project Owner',
            permissions: availablePermissions.map(p => p.value) // All permissions
          });
        }
      }
    }

    members.value = Object.values(memberMap);

    // Sort members so project owner is always first
    members.value.sort((a, b) => {
      const aIsOwner = a.id === props.project?.createdBy?.id;
      const bIsOwner = b.id === props.project?.createdBy?.id;

      if (aIsOwner && !bIsOwner) return -1;
      if (!aIsOwner && bIsOwner) return 1;

      // If both are owners or both are not owners, sort by name
      return (a.fullName || a.username).localeCompare(b.fullName || b.username);
    });
  } catch (err) {
    membersError.value = err.message || 'Failed to load members.';
  } finally {
    membersLoading.value = false;
  }
};

// User search
const searchUser = async () => {
  if (!props.project) return;
  userSearch.value.loading = true;
  userSearch.value.error = '';
  userSearch.value.results = [];
  try {
    console.log('Searching for:', userSearch.value.identifier);
    const { data } = await axiosInstance.post(
      `/projects/${props.project.id}/search-user`,
      { identifier: userSearch.value.identifier }
    );
    console.log('Raw response:', data);

    let rawResults = [];

    // Handle different response formats
    if (data && Array.isArray(data)) {
      rawResults = data;
    } else if (data && data.user && Array.isArray(data.user)) {
      rawResults = data.user;
    } else if (data && data.user && typeof data.user === 'object') {
      rawResults = [data.user];
    } else if (data && data.users && Array.isArray(data.users)) {
      rawResults = data.users;
    } else if (data && typeof data === 'object' && data.id) {
      rawResults = [data];
    } else {
      console.log('No valid results found in response');
      userSearch.value.error = 'No user found.';
    }

    console.log('Processed results:', rawResults);

    // Map backend fields to frontend fields
    userSearch.value.results = rawResults.map(u => ({
      id: u.user_id || u.id || u.userId,
      email: u.user_email || u.email || u.userEmail,
      phone: u.user_phone || u.phone || u.userPhone,
      fullName: u.user_fullName || u.fullName || u.userFullName || u.name,
      username: u.user_username || u.username || u.userUsername,
    }));

    console.log('Final search results:', JSON.stringify(userSearch.value.results, null, 2));

    if (userSearch.value.results.length === 0) {
      userSearch.value.error = 'No user found.';
    }
  } catch (err) {
    console.error('Search error:', err);
    userSearch.value.error = err.message || 'Failed to search user.';
  } finally {
    userSearch.value.loading = false;
  }
};

const addUserToProject = async (user) => {
  if (!props.project || !user) return;
  userSearch.value.addingId = user.id;
  try {
    console.log('Adding user to project:', {
      projectId: props.project.id,
      userId: user.id,
      user: user
    });

    // Try different payload formats that backend might expect
    const payload = {
      identifier: user.id,
      userId: user.id,
      email: user.email,
      userEmail: user.email, // Alternative field name
      userName: user.fullName || user.username,
      // Add more fields that backend might need
      projectId: props.project.id,
    };

    console.log('Sending payload:', payload);

    const response = await axiosInstance.post(`/projects/${props.project.id}/add-user`, payload);

    console.log('Add user response:', response.data);

    // BỎ QUA gọi update-roles
    await loadMembers();
    userSearch.value.results = userSearch.value.results.filter(u => u.id !== user.id);
    userSearch.value.identifier = '';
  } catch (err) {
    console.error('Add user error:', err);
    console.error('Error status:', err.response?.status);
    console.error('Error data:', err.response?.data);
    console.error('Error message:', err.message);

    // Try to show more specific error message
    let errorMsg = 'Failed to add user';
    if (err.response?.data?.message) {
      errorMsg += ': ' + err.response.data.message;
    } else if (err.response?.data?.error) {
      errorMsg += ': ' + err.response.data.error;
    } else if (err.message) {
      errorMsg += ': ' + err.message;
    }

    alert(errorMsg);
  } finally {
    userSearch.value.addingId = null;
  }
};

function displayRoles(member, project) {
  if (!member.roles) return [];
  return member.roles.filter(
    (role) =>
      role &&
      role.name &&
      role.name !== 'Everyone' // Only hide "Everyone" role
  );
}
function getRoleBadgeClass(roleName) {
  if (!roleName) return 'role-badge-default';
  const name = roleName.toLowerCase();
  if (name.includes('owner')) return 'role-badge-owner';
  if (name.includes('admin')) return 'role-badge-admin';
  if (name.includes('mod')) return 'role-badge-mod';
  if (name.includes('everyone')) return 'role-badge-everyone';
  return 'role-badge-default';
}
function getRoleCount(roles) {
  return roles ? roles.length : 0;
}
function sortBy(key) {
  if (!members.value.length) return;
  members.value.sort((a, b) => {
    // Project owner should always be first
    const aIsOwner = a.id === props.project?.createdBy?.id;
    const bIsOwner = b.id === props.project?.createdBy?.id;

    if (aIsOwner && !bIsOwner) return -1;
    if (!aIsOwner && bIsOwner) return 1;

    // If both are owners or both are not owners, apply normal sorting
    if (key === 'name') {
      return (a.fullName || a.username).localeCompare(b.fullName || b.username);
    }
    if (key === 'roles') {
      return getRoleCount(b.roles) - getRoleCount(a.roles);
    }
    return 0;
  });
}

// Helper to get avatar text safely
function getAvatarText(user) {
  const name = user?.fullName || user?.username || user?.email || user?.phone || '';
  return name ? name.charAt(0).toUpperCase() : '?';
}

const permissionBitmaskMap = availablePermissions.reduce((map, perm, index) => {
  map[perm.value] = BigInt(1) << BigInt(index);
  return map;
}, {} as Record<string, bigint>);
function calculatePermissionFlags(permissions: string[]): string {
  return permissions
    .reduce((acc, perm) => {
      return acc | (permissionBitmaskMap[perm] || BigInt(0));
    }, BigInt(0))
    .toString();
}

const createRole = async () => {
  // Clear previous errors
  roleNameError.value = '';
  permissionsError.value = '';

  if (
    !props.project?.id ||
    !newRoleName.value ||
    newRolePermissions.value.length === 0
  )
    return;
  creating.value = true;
  try {
    const permissionFlags = calculatePermissionFlags(newRolePermissions.value);

    console.log('Creating role with data:', {
      projectId: props.project.id,
      name: newRoleName.value,
      permissionFlags: permissionFlags,
      permissions: newRolePermissions.value
    });

    const response = await axiosInstance.post(`/projects/${props.project.id}/roles/create`, {
      name: newRoleName.value,
      permissionFlags: permissionFlags,
      // Try alternative field names
      permissions: newRolePermissions.value,
      permissionFlagsString: permissionFlags.toString()
    });

    console.log('Create role response:', response.data);

    showCreateRole.value = false;
    newRoleName.value = '';
    newRolePermissions.value = [];
    fetchRoles();
  } catch (err: any) {
    console.error('Create role error:', err);
    console.error('Error response:', err.response?.data);

    // Display errors inline
    if (err.response?.data?.message) {
      let errorMsg = err.response.data.message;

      // Handle if message is an array
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0] || errorMsg.join(', ');
      }

      // Format error messages to be more user-friendly
      if (errorMsg.includes('name')) {
        roleNameError.value = errorMsg.replace('name', 'Role name');
      } else if (errorMsg.includes('permission')) {
        permissionsError.value = errorMsg.replace('permission', 'Permission');
      } else {
        roleNameError.value = errorMsg;
      }
    } else if (err.response?.data?.error) {
      let errorMsg = err.response.data.error;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0] || errorMsg.join(', ');
      }
      roleNameError.value = errorMsg.replace('name', 'Role name');
    } else if (err.message) {
      roleNameError.value = err.message;
    } else {
      roleNameError.value = 'Failed to create role';
    }
  } finally {
    creating.value = false;
  }
};

// State cho modal confirm delete
const showDeleteConfirmModal = ref(false);
const roleToDelete = ref(null);

// Function để xóa role
const deleteRole = async (role) => {
  roleToDelete.value = role;
  showDeleteConfirmModal.value = true;
};

// Function để confirm delete
const confirmDeleteRole = async () => {
  if (!roleToDelete.value) return;

  try {
    await axiosInstance.delete(`/projects/${props.project.id}/roles/${roleToDelete.value.id}`);
    await fetchRoles();
    showDeleteConfirmModal.value = false;
    roleToDelete.value = null;
  } catch (err) {
    console.error('Failed to delete role:', err);
    alert('Failed to delete role: ' + err.message);
  }
};

// Function để cancel delete
const cancelDeleteRole = () => {
  showDeleteConfirmModal.value = false;
  roleToDelete.value = null;
};

const showAllPermissions = (role) => {
  selectedRoleForPermissions.value = role;
  showAllPermissionsModal.value = true;
};

// Function để mở modal assign role
const openAssignRoleModal = (user) => {
  userToAssignRole.value = user;
  selectedRoleId.value = '';
  showAssignRoleModal.value = true;
};

// Function để assign role
const assignRoleToUser = async () => {
  if (!selectedRoleId.value || !userToAssignRole.value) return;

  assigningRole.value = true;
  try {
    await axiosInstance.post(`/projects/${props.project.id}/roles/${selectedRoleId.value}/users/add`, {
      userIds: [userToAssignRole.value.id]
    });
    await loadMembers();
    showAssignRoleModal.value = false;
    userToAssignRole.value = null;
    selectedRoleId.value = '';
  } catch (err) {
    console.error('Failed to assign role:', err);
    alert('Failed to assign role: ' + err.message);
  } finally {
    assigningRole.value = false;
  }
};

// Function để close assign role modal
const closeAssignRoleModal = () => {
  showAssignRoleModal.value = false;
  userToAssignRole.value = null;
  selectedRoleId.value = '';
};

onMounted(() => {
  fetchRoles();
  loadMembers();
});
watch(() => props.project?.id, () => {
  fetchRoles();
  loadMembers();
});
</script>

<template>
  <div class="project-role-tab">
    <!-- Add User Section -->
    <div class="management-section user-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">➕</span>
          Add User to Project
        </h2>
        <button
          class="btn btn-outline btn-sm toggle-btn"
          @click="showAddUserSection = !showAddUserSection"
          :title="showAddUserSection ? 'Hide add user section' : 'Show add user section'"
        >
          <span class="icon">{{ showAddUserSection ? '−' : '+' }}</span>
          {{ showAddUserSection ? 'Hide' : 'Add User' }}
        </button>
      </div>
      <div v-if="showAddUserSection" class="section-content">
        <form autocomplete="off" class="add-user-form" @submit.prevent="searchUser">
          <div class="form-row">
            <div class="form-group" style="flex: 1; margin-bottom: 0; position: relative;">
              <label for="userIdentifier" class="form-label">
                <span class="label-icon">🔍</span>
                Search by Email or Name
              </label>
              <input
                id="userIdentifier"
                v-model="userSearch.identifier"
                type="text"
                required
                class="form-control"
                placeholder="Enter email or full name"
                autocomplete="off"
              />
            </div>
            <div class="form-actions" style="margin-bottom: 0; align-self: flex-end">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="!userSearch.identifier || userSearch.loading"
                :title="!userSearch.identifier ? 'Please enter a name or email to search' : ''"
              >
                <span v-if="userSearch.loading" class="loading-spinner-small"></span>
                <span v-else class="icon">🔍</span>
                {{ userSearch.loading ? 'Searching...' : 'Search User' }}
              </button>
            </div>
          </div>
        </form>
        <div v-if="userSearch.error" class="error-message">
          <span class="error-icon">❌</span>
          <p>{{ userSearch.error }}</p>
        </div>
        <div v-if="userSearch.results && userSearch.results.length > 0" class="found-user" style="flex-direction: column; align-items: stretch;">
          <div v-for="user in userSearch.results" :key="user.id" class="user-info user-card">
            <div class="user-card-left">
              <div class="user-avatar big-avatar">
                <span class="avatar-text">{{ getAvatarText(user) }}</span>
              </div>
              <div class="user-details">
                <h4 class="user-name">{{ user.fullName || user.username || user.email || user.phone || 'Unknown' }}</h4>
                <p v-if="user.email" class="user-meta">Email: {{ user.email }}</p>
                <p v-if="user.phone" class="user-meta">Phone: {{ user.phone }}</p>
              </div>
            </div>
            <button class="btn btn-primary btn-sm user-add-btn" @click="addUserToProject(user)" :disabled="userSearch.addingId === user.id">
              <span v-if="userSearch.addingId === user.id" class="loading-spinner-small"></span>
              <span v-else class="icon">➕</span>
              {{ userSearch.addingId === user.id ? 'Adding...' : 'Add to Project' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Members Section -->
    <div class="management-section members-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">👥</span>
          Project Members
        </h2>
      </div>
      <div class="members-content">
        <div v-if="membersLoading" class="members-loading">
          <div class="loading-spinner-small"></div>
          <span>Loading members...</span>
        </div>
        <div v-else-if="membersError" class="members-error">
          <span class="error-icon">⚠️</span>
          <span>{{ membersError }}</span>
          <button class="btn btn-outline btn-sm" @click="loadMembers">Retry</button>
        </div>
        <div v-else-if="members && members.length > 0" class="members-list members-table-responsive">
          <table class="members-table">
            <thead>
            <tr>
              <th>No.</th>
              <th @click="sortBy('name')">User</th>
              <th @click="sortBy('roles')">Roles</th>
              <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(member, idx) in members" :key="member.id">
              <td>{{ idx + 1 }}</td>
              <td>
                <div :title="member.fullName + ' - ' + member.email" class="user-cell">
                  <div class="user-avatar">{{ (member.fullName || member.username).charAt(0).toUpperCase() }}</div>
                  <div class="user-info">
                    <div class="user-name">{{ member.fullName || member.username }}</div>
                    <div class="user-email">{{ member.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                  <span
                    class="role-badges-group discord-badge-group"
                    @mouseenter="showFullRoles = member.id"
                    @mouseleave="showFullRoles = null"
                    @click="showFullRoles = showFullRoles === member.id ? null : member.id"
                    style="cursor:pointer;"
                  >
                    <span
                      v-for="(role, idx) in displayRoles(member, props.project).slice(0, 3)"
                      :key="role.id"
                      :class="['role-badge discord-role-badge', getRoleBadgeClass(role.name)]"
                    >{{ role.name }}</span>
                    <span v-if="getRoleCount(displayRoles(member, props.project)) > 3" class="discord-more-badge">
                      +{{ getRoleCount(displayRoles(member, props.project)) - 3 }} more
                    </span>
                  </span>
                <div
                  v-if="showFullRoles === member.id && getRoleCount(displayRoles(member, props.project)) > 3"
                  class="discord-role-tooltip"
                  style="display:flex; flex-wrap:wrap; gap:0.4em; padding:0.7em 1.2em;"
                >
                    <span
                      v-for="role in displayRoles(member, props.project)"
                      :key="role.id"
                      :class="['role-badge discord-role-badge', getRoleBadgeClass(role.name)]"
                      style="margin-bottom:0.2em;"
                    >{{ role.name }}</span>
                </div>
              </td>
              <td>
                <button class="btn btn-outline btn-sm" @click="openAssignRoleModal(member)" :disabled="assigningRole">
                  <span v-if="assigningRole" class="loading-spinner-small"></span>
                  <span v-else class="icon">🔗</span>
                  Assign Role
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-members">
          <div class="empty-icon">👥</div>
          <h3>No Members</h3>
          <p>No members have been added to this project yet.</p>
        </div>
      </div>
    </div>

    <!-- Roles Section -->
    <div class="management-section roles-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">🛡️</span>
          Project Roles
        </h2>
        <button class="btn btn-primary" @click="showCreateRole = true">
          <span class="icon">➕</span> Create Role
        </button>
      </div>

      <div v-if="loading" class="loading">Loading roles...</div>
      <div v-if="error" class="error">{{ error }}</div>

      <table v-if="!loading && roles.length" class="roles-table">
        <thead>
        <tr>
          <th>Name</th>
          <th>Permissions</th>
          <th>Actions</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="role in roles.filter(r => r.name !== 'Everyone')" :key="role.id">
          <td>{{ role.name }}</td>
          <td>
            <div class="permissions-display">
              <span v-if="!role.permissionFlags || parsePermissionFlags(role.permissionFlags).length === 0" class="no-permissions">
                No permissions
              </span>
              <template v-else>
            <span
              v-for="(perm, idx) in parsePermissionFlags(role.permissionFlags).slice(0, 3)"
              :key="perm"
              class="permission-badge"
            >
              {{ perm }}
            </span>
                <span
                  v-if="parsePermissionFlags(role.permissionFlags).length > 3"
                  class="more-permissions"
                  :title="parsePermissionFlags(role.permissionFlags).slice(3).join(', ')"
                  @click="showAllPermissions(role)"
                >
                  +{{ parsePermissionFlags(role.permissionFlags).length - 3 }} more
                </span>
              </template>
            </div>
          </td>
          <td>
            <button
              class="btn btn-danger"
              @click="deleteRole(role)"
              :disabled="deletingRoleId === role.id"
            >
              <span v-if="deletingRoleId === role.id">Deleting...</span>
              <span v-else>Delete</span>
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Role Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateRole"
        class="new-modal-overlay"
        @click.self="showCreateRole = false"
      >
        <div class="new-modal-content">
          <div class="new-modal-header">
            <h3>Create New Role</h3>
            <button class="new-modal-close" @click="showCreateRole = false">×</button>
          </div>

          <div class="new-modal-body">
            <div class="form-group">
              <label for="roleName" class="form-label">
                <span class="label-icon">🏷️</span>
                Role Name
              </label>
              <input
                id="roleName"
                v-model="newRoleName"
                placeholder="Enter role name..."
                class="form-control"
              />
              <div v-if="roleNameError" class="error-message" style="margin-top: 0.5rem;">
                <span class="error-icon">❌</span>
                <p>{{ roleNameError }}</p>
              </div>
            </div>

            <div class="permissions-section">
              <label class="form-label">
                <span class="label-icon">🛡️</span>
                Permissions
              </label>
              <div class="permissions-grid">
                <label
                  v-for="perm in availablePermissions"
                  :key="perm.value"
                  class="permission-item"
                >
                  <input
                    type="checkbox"
                    :value="perm.value"
                    v-model="newRolePermissions"
                    class="permission-checkbox"
                  />
                  <span class="permission-text">{{ perm.label }}</span>
                </label>
              </div>
              <div v-if="permissionsError" class="error-message" style="margin-top: 0.5rem;">
                <span class="error-icon">❌</span>
                <p>{{ permissionsError }}</p>
              </div>
            </div>
          </div>

          <div class="new-modal-footer">
            <button class="btn btn-secondary" @click="showCreateRole = false">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="createRole"
              :disabled="creating || !newRoleName || newRolePermissions.length === 0"
            >
              <span v-if="creating" class="loading-spinner-small"></span>
              <span v-else class="icon">➕</span>
              {{ creating ? 'Creating...' : 'Create Role' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- All Permissions Modal -->
    <Teleport to="body">
      <div
        v-if="showAllPermissionsModal"
        class="new-modal-overlay"
        @click.self="showAllPermissionsModal = false"
      >
        <div class="new-modal-content">
          <div class="new-modal-header">
            <h3>{{ selectedRoleForPermissions?.name || 'All Permissions' }}</h3>
            <button class="new-modal-close" @click="showAllPermissionsModal = false">×</button>
          </div>
          <div class="new-modal-body">
            <div class="permissions-section">
              <label class="form-label">
                <span class="label-icon">🛡️</span>
                All Permissions ({{ parsePermissionFlags(selectedRoleForPermissions?.permissionFlags).length }} total)
              </label>
              <div class="permissions-grid">
                <div
                  v-for="perm in parsePermissionFlags(selectedRoleForPermissions?.permissionFlags)"
                  :key="perm"
                  class="permission-item readonly"
                >
                  <span class="permission-checkbox readonly">✓</span>
                  <span class="permission-text">{{ perm }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="new-modal-footer">
            <button class="btn btn-secondary" @click="showAllPermissionsModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Delete Role Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirmModal"
        class="delete-dialog-modal"
      >
        <div class="modal-overlay" @click="cancelDeleteRole"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Delete Role</h3>
            <button class="close-btn" @click="cancelDeleteRole">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="warning-message">
              <div class="warning-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h4>Are you sure you want to delete the role "{{ roleToDelete?.name }}"?</h4>
              <p>This action cannot be undone.</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="cancelDeleteRole">
              Keep Role
            </button>
            <button
              class="btn btn-danger"
              @click="confirmDeleteRole"
            >
              Delete Role
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Assign Role Modal -->
    <Teleport to="body">
      <div
        v-if="showAssignRoleModal"
        class="new-modal-overlay"
        @click.self="closeAssignRoleModal"
      >
        <div class="new-modal-content">
          <div class="new-modal-header">
            <h3>Assign Role to {{ userToAssignRole?.fullName || userToAssignRole?.username || userToAssignRole?.email || userToAssignRole?.phone || 'User' }}</h3>
            <button class="new-modal-close" @click="closeAssignRoleModal">×</button>
          </div>
          <div class="new-modal-body">
            <div class="form-group">
              <label for="assignRole" class="form-label">
                <span class="label-icon">🛡️</span>
                Select Role
              </label>
              <select
                id="assignRole"
                v-model="selectedRoleId"
                class="form-control"
                :disabled="assigningRole"
              >
                <option value="">Select a role to assign</option>
                <option v-for="role in roles.filter(r => r.name !== 'Everyone')" :key="role.id" :value="role.id">
                  {{ role.name }}
                </option>
              </select>
              <div v-if="!selectedRoleId" class="error-message" style="margin-top: 0.5rem;">
                <span class="error-icon">❌</span>
                <p>Please select a role to assign.</p>
              </div>
            </div>
          </div>
          <div class="new-modal-footer">
            <button class="btn btn-secondary" @click="closeAssignRoleModal">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="assignRoleToUser"
              :disabled="!selectedRoleId || assigningRole"
            >
              <span v-if="assigningRole" class="loading-spinner-small"></span>
              <span v-else class="icon">🔗</span>
              {{ assigningRole ? 'Assigning...' : 'Assign Role' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>


<style scoped>
.project-role-tab {
  padding: 0;
  margin: 0;
}

/* Management Section Styles */
.management-section {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 32px rgba(49,130,206,0.10), 0 2px 8px rgba(76,34,128,0.08);
  padding: 0.6rem 0.6rem 0.4rem 0.6rem;
  margin-bottom: 0.2rem;
  position: relative;
}

/* Bring first section closer to navigation tabs */
.management-section:first-child {
  margin-top: 0;
}

.roles-section {
  margin-bottom: 0.2rem;
}

.user-section {
  margin-bottom: 0.2rem;
}

.members-section {
  margin-top: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.4rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.title-icon {
  font-size: 1.4rem;
  width: 2rem;
  height: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.toggle-btn {
  margin-left: auto;
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.section-content {
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.6rem 0.6rem 0.5rem 0.6rem;
  margin-bottom: 0.6rem;
  border: 1px solid #e2e8f0;
}

/* Form Styles */
.form-row {
  display: flex;
  gap: 0.8rem;
  align-items: flex-end;
}

.form-group {
  position: relative;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
}

.label-icon {
  font-size: 1rem;
  color: #3182ce;
}

.form-control {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66,153,225,0.10);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Button Styles */
.btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.25rem !important;
  font-weight: 600 !important;
  border-radius: 4px !important;
  border: none !important;
  padding: 0.35rem 0.8rem !important;
  font-size: 0.75rem !important;
  cursor: pointer !important;
  transition: all 0.18s !important;
  box-shadow: 0 1px 3px #3182ce11 !important;
}

.btn-primary {
  background: linear-gradient(135deg, #38b2ac 0%, #4299e1 100%) !important;
  color: #fff !important;
  box-shadow: 0 1px 4px #4299e133 !important;
  border: 1px solid #4299e1 !important;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #4299e1 0%, #38b2ac 100%) !important;
  color: #fff !important;
  border-color: #3182ce !important;
  box-shadow: 0 2px 8px #4299e133 !important;
  transform: translateY(-1px) !important;
  filter: brightness(1.02) !important;
}

.btn-outline {
  background: #fff !important;
  color: #2563eb !important;
  border: 1px solid #2563eb !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px #2563eb22 !important;
  transition: all 0.18s !important;
}

.btn-outline:hover {
  background: #2563eb !important;
  color: #fff !important;
  border-color: #1e40af !important;
  box-shadow: 0 2px 6px #2563eb33 !important;
}

.btn-sm {
  font-size: 0.7rem !important;
  padding: 0.25rem 0.5rem !important;
  border-radius: 3px !important;
}

.btn-danger {
  background: #e53e3e !important;
  color: #fff !important;
  border: 1px solid #e53e3e !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px #e53e3e22 !important;
}

.btn-danger:hover {
  background: #c53030 !important;
  color: #fff !important;
  border-color: #a02323 !important;
  box-shadow: 0 2px 6px #e53e3e33 !important;
  transform: translateY(-1px) !important;
}

.btn-secondary {
  background: #718096;
  color: #fff;
  border: 2px solid #718096;
}

.btn-secondary:hover {
  background: #4a5568;
  border-color: #4a5568;
}

/* Error and Loading Styles */
.error-message {
  color: #e53e3e;
  background: #fff5f5;
  border: 1.5px solid #e53e3e;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.error-icon {
  font-size: 1rem;
  color: #e53e3e;
}

.loading-spinner-small {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading {
  color: #3182ce;
  margin: 0.8rem 0;
  font-size: 0.9rem;
}

.error {
  color: #e53e3e;
  margin: 0.8rem 0;
  font-size: 0.9rem;
}

/* User Card Styles */
.found-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.8rem 1.2rem;
  margin-top: 0.8rem;
  box-shadow: 0 2px 6px #3182ce11;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8em;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 3px 12px #3182ce18;
  padding: 1rem 1.5rem;
  background: #fff;
  transition: box-shadow 0.18s, border 0.18s;
}

.user-card:hover {
  box-shadow: 0 6px 24px #3182ce33;
  border-color: #4299e1;
}

.user-card-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.big-avatar {
  width: 2.8rem;
  height: 2.8rem;
  font-size: 1.4rem;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 6px #3182ce22;
}

.user-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.user-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #2d3748;
}

.user-meta {
  margin: 0.1em 0 0 0;
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
}

.user-add-btn {
  margin-left: 1.5em;
  min-width: 110px;
  box-shadow: 0 2px 6px #3182ce11;
}

.avatar-text {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
}

/* Members Table Styles */
.members-content {
  min-height: 100px;
}

.members-list.members-table-responsive {
  overflow-x: auto;
  display: block;
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  margin-top: 0.8rem;
}

.members-table th,
.members-table td {
  border: 1px solid #e2e8f0;
  padding: 0.7rem;
  text-align: left;
  font-size: 0.85rem;
}

.members-table th {
  background: #f1f5f9;
  font-weight: 700;
  color: #2d3748;
  cursor: pointer;
  font-size: 0.9rem;
}

.members-table td {
  vertical-align: middle;
}

.members-table tr:nth-child(even) td {
  background: #f8fafc;
}

.members-table tr:hover td {
  background: #e0e7ef;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-avatar {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #7f53ac 0%, #4299e1 100%);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px #3182ce22;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-email {
  color: #a0aec0;
  font-size: 0.8rem;
  margin-top: 0.1rem;
}

/* Role Badge Styles */
.role-badge {
  display: inline-block;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 500;
  margin-right: 0.2rem;
  margin-bottom: 0.1rem;
  cursor: pointer;
  transition: background 0.18s;
}

.role-badge:hover {
  background: #c7d2fe;
}

.role-badges-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.discord-badge-group {
  position: relative;
}

.discord-more-badge {
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.discord-role-tooltip {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
  z-index: 10;
  margin-top: 0.4rem;
}

/* Empty State */
.empty-members {
  text-align: center;
  padding: 1.5em 0;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5em;
}

/* Roles Table Styles */
.roles-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.6rem;
}

.roles-table th,
.roles-table td {
  border: 1px solid #e2e8f0;
  padding: 0.5rem 0.6rem;
  text-align: left;
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Modal Styles */
.new-modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.6) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 2147483647 !important;
  backdrop-filter: blur(4px) !important;
}

.new-modal-content {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  min-width: 500px;
  max-width: 90vw;
  height: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.new-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem 1rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.new-modal-header h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.4rem;
  font-weight: 700;
}

.new-modal-close {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.new-modal-close:hover {
  background: #e2e8f0;
  color: #4a5568;
}

.new-modal-body {
  padding: 1.5rem 2rem;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.new-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 2rem 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 0.7rem;
  font-size: 1rem;
}

.label-icon {
  font-size: 1.2rem;
  color: #3182ce;
}

.form-control {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66,153,225,0.10);
}

.permissions-section {
  margin-top: 1.5rem;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.8rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  flex: 1;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.permission-item:hover {
  background: #f0f6ff;
  border-color: #4299e1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(66,153,225,0.15);
}

.permission-checkbox {
  width: 1.2rem;
  height: 1.2rem;
  accent-color: #4299e1;
  cursor: pointer;
}

.permission-text {
  font-size: 0.95rem;
  color: #2d3748;
  font-weight: 500;
  flex: 1;
}

.btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  border: none !important;
  padding: 0.8rem 1.5rem !important;
  font-size: 1rem !important;
  cursor: pointer !important;
  transition: all 0.18s !important;
  box-shadow: 0 2px 8px #3182ce11 !important;
}

.btn-primary {
  background: linear-gradient(135deg, #38b2ac 0%, #4299e1 100%) !important;
  color: #fff !important;
  box-shadow: 0 4px 16px #4299e133 !important;
  border: 2px solid #4299e1 !important;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #4299e1 0%, #38b2ac 100%) !important;
  color: #fff !important;
  border-color: #3182ce !important;
  box-shadow: 0 8px 32px #4299e133 !important;
  transform: translateY(-2px) scale(1.04) !important;
  filter: brightness(1.08) !important;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #fff;
  color: #4a5568;
  border: 2px solid #e2e8f0;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: all 0.18s;
}

.btn-secondary:hover {
  background: #f7fafc;
  border-color: #cbd5e0;
  color: #2d3748;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.loading-spinner-small {
  width: 1.2rem;
  height: 1.2rem;
  border: 2.5px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.permissions-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.permission-badge {
  display: inline-block;
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.more-permissions {
  color: #3182ce;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  background: #ebf8ff;
  border: 1px solid #bee3f8;
}

.more-permissions:hover {
  background: #bee3f8;
  color: #2b6cb0;
}

.no-permissions {
  color: #a0aec0;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #f0f6ff;
  border: 1px solid #bee3f8;
}

.permission-item.readonly {
  background: #f0f6ff;
  border-color: #bee3f8;
  cursor: default;
}

.permission-item.readonly:hover {
  background: #f0f6ff;
  border-color: #bee3f8;
  transform: none;
}

.permission-checkbox.readonly {
  color: #38a169;
  font-weight: bold;
  font-size: 0.9rem;
}

/* Specific button overrides for compact design */
.section-header .btn,
.members-section .btn,
.roles-section .btn {
  font-size: 0.8rem !important;
  padding: 0.4rem 0.9rem !important;
  border-radius: 5px !important;
  gap: 0.3rem !important;
  min-height: auto !important;
  height: auto !important;
}

.section-header .btn .icon,
.members-section .btn .icon,
.roles-section .btn .icon {
  font-size: 0.85rem !important;
}

/* Make delete buttons moderately smaller */
.btn-danger {
  font-size: 0.75rem !important;
  padding: 0.3rem 0.6rem !important;
  border-radius: 4px !important;
}

/* Compact form buttons */
.add-user-form .btn,
.create-role-form .btn {
  font-size: 0.8rem !important;
  padding: 0.4rem 0.8rem !important;
  border-radius: 5px !important;
}

/* Compact modal buttons */
.modal-content .btn {
  font-size: 0.8rem !important;
  padding: 0.4rem 0.9rem !important;
  border-radius: 5px !important;
}

/* Compact table action buttons */
.members-table .btn,
.roles-table .btn {
  font-size: 0.75rem !important;
  padding: 0.3rem 0.6rem !important;
  border-radius: 4px !important;
  min-width: auto !important;
  width: auto !important;
}

/* Confirm Delete Modal Styles */
.delete-dialog-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.warning-message {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.warning-icon {
  font-size: 3rem;
  color: #dc2626;
  margin-bottom: 1rem;
}

.warning-message h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-size: 1.125rem;
  font-weight: 600;
}

.warning-message p {
  margin: 0;
  color: #7f1d1d;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  background: #f3f4f6 !important;
  color: #374151 !important;
  border: none !important;
  font-weight: 500 !important;
  box-shadow: none !important;
}

.btn-secondary:hover {
  background: #e5e7eb !important;
  color: #1f2937 !important;
}

.btn-danger {
  background: #dc2626 !important;
  color: white !important;
  border: none !important;
  font-weight: 500 !important;
  box-shadow: none !important;
}

.btn-danger:hover {
  background: #b91c1c !important;
  color: white !important;
}

/* Assign Role Modal Styles */
.new-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.new-modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 450px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

.new-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.new-modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
}

.new-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.new-modal-close:hover {
  background: #e2e8f0;
  color: #4a5568;
}

.new-modal-body {
  padding: 1.5rem;
}

.new-modal-footer {
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
  padding: 1.2rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* Form control for select */
select.form-control {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

select.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66,153,225,0.10);
}

select.form-control:disabled {
  background: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}
</style>
