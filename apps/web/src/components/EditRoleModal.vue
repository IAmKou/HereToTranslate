<template>
  <div class="modal-overlay" @click.self="emitClose">
    <div class="modal-content" style="max-width: 480px; width: 95vw;">
      <div class="modal-header">
        <h3>Edit Role</h3>
        <button class="close-button" @click="emitClose">&times;</button>
      </div>
      <form @submit.prevent="updateRole">
        <div class="form-group">
          <label>Role Name</label>
          <input v-model="form.name" placeholder="Role Name" required />
        </div>
        <div class="form-group">
          <label>Permissions</label>
          <multiselect
            v-model="form.permissionFlags"
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
          <button type="button" class="btn btn-secondary" @click="emitClose">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="updating">
            <span v-if="updating" class="loading-spinner-small"></span>
            <span v-else>Update</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, defineProps, defineEmits, onMounted } from 'vue';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';
import axiosInstance from '../api';

const props = defineProps<{ role: any, projectId: string }>();
const emit = defineEmits(['close', 'updated']);
const emitClose = () => emit('close');

const updating = ref(false);
const form = ref({ name: '', permissionFlags: [], id: '' });

watch(() => props.role, (role) => {
  if (role) {
    let perms = [];
    try {
      perms = Array.isArray(role.permissionFlags)
        ? role.permissionFlags
        : JSON.parse(role.permissionFlags);
    } catch (e) {
      perms = [];
    }
    form.value = { name: role.name, permissionFlags: perms, id: role.id };
  }
}, { immediate: true });

const availablePermissions = ref<any[]>([]);
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
  ManageTranslation: 'Edit and save translations – cho phép sửa và lưu bản dịch',
};
const mappedAvailablePermissions = computed(() =>
  availablePermissions.value.map((p: any) => ({
    ...p,
    description: permissionDescriptionMap[p.value] || p.description || p.value
  }))
);
const groupedPermissions = computed(() => {
  const groups: Record<string, { label: string, permissions: any[] }> = {};
  for (const group of permissionGroups) {
    const perms = mappedAvailablePermissions.value.filter(
      (p: any) => group.values.includes(p.value)
    );
    if (perms.length) {
      groups[group.key] = { label: group.label, permissions: perms };
    }
  }
  // Các quyền chưa nhóm
  const grouped = permissionGroups.flatMap(g => g.values);
  const otherPerms = mappedAvailablePermissions.value.filter(
    (p: any) => !grouped.includes(p.value)
  );
  if (otherPerms.length) {
    groups['other'] = { label: 'Other', permissions: otherPerms };
  }
  return groups;
});
const groupedPermissionOptions = computed(() => {
  return Object.values(groupedPermissions.value).map((group: any) => ({
    label: group.label,
    options: group.permissions.map((p: any) => ({
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

onMounted(async () => {
  try {
    const { data } = await axiosInstance.get(`/permissions`);
    availablePermissions.value = data;
    availablePermissions.value.push({ value: 'ManageTranslation', label: 'ManageTranslation' });
  } catch (err) {
    availablePermissions.value = [];
  }
});

async function updateRole() {
  updating.value = true;
  try {
    await axiosInstance.patch(`/projects/${props.projectId}/roles/${form.value.id}`, {
      ...form.value,
      permissionFlags: JSON.stringify(form.value.permissionFlags),
    });
    emit('updated');
  } catch (err: any) {
    alert('Failed to update role: ' + err.message);
  } finally {
    updating.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
  padding: 1rem;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.25);
  animation: slideUp 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem 1rem 1.5rem;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
}
.modal-header h3 { margin: 0; color: #1a202c; font-size: 1.2rem; font-weight: 700; }
.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: #718096;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  border-radius: 50%;
  transition: all 0.3s ease;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-button:hover { background: #f7fafc; color: #2d3748; transform: rotate(90deg); }
.form-group { margin-bottom: 1.2rem; }
.form-group label { font-weight: 600; color: #2d3748; margin-bottom: 0.5rem; display: block; }
input[type='text'], input, .multiselect__input {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 0.2rem;
}
.permission-multiselect { width: 100%; margin-bottom: 1.2rem; }
.perm-option { display: flex; flex-direction: column; gap: 0.1rem; }
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
.perm-tag-remove { margin-left: 0.5em; cursor: pointer; color: #e53e3e; font-weight: bold; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 2px solid #e2e8f0; background: #f8fafc; flex-shrink: 0; }
.btn { padding: 0.5rem 1.2rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-primary { background: #4299e1; color: white; border: none; }
.btn-primary:hover { background: #3182ce; }
.btn-secondary { background: #e2e8f0; color: #2d3748; border: none; border-radius: 8px; padding: 0.6rem 1.4rem; font-weight: 600; transition: background 0.18s; }
.btn-secondary:hover { background: #cbd5e0; }
.loading-spinner-small { width: 1rem; height: 1rem; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #4299e1; animation: spin 1s linear infinite; margin-right: 0.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
