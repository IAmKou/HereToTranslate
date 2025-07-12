<script setup lang="ts">
import { ref, onMounted, watch, defineProps, computed } from 'vue';
import axiosInstance from '../api';

const props = defineProps<{ project: any }>();

const roles = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const showCreateRole = ref(false);
const newRoleName = ref('');
const newRolePermissions = ref<string[]>([]);
const creating = ref(false);
const deletingRoleId = ref<string | null>(null);

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

function parsePermissionFlags(bitmask: string | number | bigint | undefined): string[] {
  if (bitmask === undefined || bitmask === null) return [];

  let flags: bigint;

  try {
    if (typeof bitmask === 'bigint') {
      flags = bitmask;
    } else if (typeof bitmask === 'string') {
      flags = BigInt(bitmask);
    } else if (typeof bitmask === 'number') {
      flags = BigInt(bitmask); // convert number to BigInt explicitly
    } else {
      return [];
    }
  } catch (e) {
    console.error('Invalid permissionFlags:', bitmask, e);
    return [];
  }

  return availablePermissions
    .filter((_, index) => {
      const mask = BigInt(1) << BigInt(index);
      return (flags & mask) !== BigInt(0);
    })
    .map(p => p.label);
}


const fetchRoles = async () => {
  if (!props.project?.id) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await axiosInstance.get(
      `/projects/${props.project.id}/roles`
    );
    roles.value = data;
  } catch (err: any) {
    error.value = err.message || 'Failed to load roles.';
  } finally {
    loading.value = false;
  }
};

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
  if (
    !props.project?.id ||
    !newRoleName.value ||
    newRolePermissions.value.length === 0
  )
    return;
  creating.value = true;
  try {
    const permissionFlags = calculatePermissionFlags(newRolePermissions.value);
    await axiosInstance.post(`/projects/${props.project.id}/roles/create`, {
      name: newRoleName.value,
      permissionFlags,
    });
    showCreateRole.value = false;
    newRoleName.value = '';
    newRolePermissions.value = [];
    fetchRoles();
  } catch (err: any) {
    alert('Failed to create role: ' + err.message);
  } finally {
    creating.value = false;
  }
};

const deleteRole = async (roleId: string) => {
  if (!props.project?.id) return;
  if (!confirm('Are you sure you want to delete this role?')) return;
  deletingRoleId.value = roleId;
  try {
    await axiosInstance.delete(`/projects/${props.project.id}/roles/${roleId}`);
    fetchRoles();
  } catch (err: any) {
    alert('Failed to delete role: ' + err.message);
  } finally {
    deletingRoleId.value = null;
  }
};

onMounted(fetchRoles);
watch(() => props.project?.id, fetchRoles);
</script>

<template>
  <div class="project-role-tab">
    <h2>Project Roles</h2>
    <button class="btn btn-primary" @click="showCreateRole = true">
      Create Role
    </button>

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
      <tr v-for="role in roles" :key="role.id">
        <td>{{ role.name }}</td>
        <td>
            <span
              v-for="perm in parsePermissionFlags(role.permissionFlags)"
              :key="perm"
              class="badge"
              style="margin-right: 4px"
            >
              {{ perm }}
            </span>
        </td>
        <td>
          <button
            class="btn btn-danger"
            @click="deleteRole(role.id)"
            :disabled="deletingRoleId === role.id"
          >
            <span v-if="deletingRoleId === role.id">Deleting...</span>
            <span v-else>Delete</span>
          </button>
        </td>
      </tr>
      </tbody>
    </table>

    <div
      v-if="showCreateRole"
      class="modal-overlay"
      @click.self="showCreateRole = false"
    >
      <div class="modal-content">
        <h3>Create New Role</h3>
        <input v-model="newRoleName" placeholder="Role Name" />
        <div>
          <label
            v-for="perm in availablePermissions"
            :key="perm.value"
            style="display: block"
          >
            <input
              type="checkbox"
              :value="perm.value"
              v-model="newRolePermissions"
            />
            {{ perm.label }}
          </label>
        </div>
        <button
          class="btn btn-primary"
          @click="createRole"
          :disabled="creating"
        >
          Create
        </button>
        <button class="btn btn-secondary" @click="showCreateRole = false">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>


<style scoped>
.project-role-tab {
  padding: 2rem;
}
.roles-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.roles-table th,
.roles-table td {
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  text-align: left;
}
.loading {
  color: #3182ce;
  margin: 1rem 0;
}
.error {
  color: #e53e3e;
  margin: 1rem 0;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  min-width: 320px;
  max-width: 90vw;
}
</style>
