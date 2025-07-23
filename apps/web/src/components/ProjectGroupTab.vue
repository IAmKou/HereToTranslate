<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.min.css';
import 'primeicons/primeicons.css';
const toast = useToast();
// Không fetch API ở đây nữa, chỉ nhận props
const showDeleteConfirmModal = ref(false);
const groupToDelete = ref(null);
const showEditGroupModal = ref(false);
const editGroupName = ref('');
const editingGroup = ref(null);
const editGroupNameError = ref('');
const isEditingGroup = ref(false);

const emit = defineEmits(['create-group', 'edit-group', 'delete-group']);

const props = defineProps({
  project: Object,
  groups: { type: Array, default: () => [] },
  groupsLoading: { type: Boolean, default: false },
  groupsError: { type: String, default: '' },
  members: { type: Array, default: undefined }, // nhận thêm prop members
});

const showCreateGroupModal = ref(false);
const isCreatingGroup = ref(false);
const newGroup = ref({ name: '' });
const groupNameError = ref('');
const isDeleting = ref(false);
// Thêm state cho chọn thành viên khi tạo group
// Thay selectedUserIds bằng selectedMembers (array object)
const selectedMembers = ref([]);

const memberOptions = computed(() =>
  (props.members ?? props.project?.members ?? []).map((m: any) => ({
    ...m,
    label: `${m.fullName || m.username} (${m.email})`,
    value: m.id,
  }))
);

function openCreateGroupModal() {
  showCreateGroupModal.value = true;
  groupNameError.value = '';
  newGroup.value.name = '';
  setTimeout(() => {
    const input = document.getElementById('newGroupName');
    if (input) input.focus();
  }, 100);
}

function closeCreateGroupModal() {
  showCreateGroupModal.value = false;
  groupNameError.value = '';
}

const handleEsc = (e: KeyboardEvent) => {
  if (showCreateGroupModal.value && e.key === 'Escape') {
    closeCreateGroupModal();
  }
};
onMounted(() => {
  window.addEventListener('keydown', handleEsc);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEsc);
});

const createGroup = async () => {
  groupNameError.value = '';
  if (!newGroup.value.name.trim()) {
    groupNameError.value = '⚠️ Group name is required.';
    return;
  }
  isCreatingGroup.value = true;
  try {
    // 1. Tạo group
    const res = await emit('create-group', { ...newGroup.value });
    let groupId: string | number | null = null;
    if (res && res.id) {
      groupId = res.id;
    } else if (props.groups && props.groups.length > 0) {
      groupId = props.groups[props.groups.length - 1].id;
    }
    // 2. Nếu có chọn thành viên, gọi API assign
    const userIds = selectedMembers.value.map((m: any) => m.id);
    if (props.project && groupId && userIds.length > 0) {
      await axiosInstance.post(`/projects/${props.project.id}/groups/${groupId}/users/add`, {
        userIds
      });
    }
    showCreateGroupModal.value = false;
    newGroup.value = { name: '' };
    selectedMembers.value = [];
    toast.add({ severity: 'success', summary: 'Success', detail: 'Group created successfully!', life: 2200 });
  } catch (err: any) {
    alert('Failed to create group: ' + err.message);
  } finally {
    isCreatingGroup.value = false;
  }
};

function handleInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    createGroup();
  }
}

const editGroup = (group: any) => {
  emit('edit-group', group);
};

const openEditGroupModal = (group: any) => {
  editingGroup.value = group;
  editGroupName.value = group.name;
  editGroupNameError.value = '';
  showEditGroupModal.value = true;
  setTimeout(() => {
    const input = document.getElementById('editGroupName');
    if (input) input.focus();
  }, 100);
};

const closeEditGroupModal = () => {
  showEditGroupModal.value = false;
  editGroupNameError.value = '';
};

const handleEditGroupKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    performEditGroup();
  }
  if (e.key === 'Escape') {
    closeEditGroupModal();
  }
};

const performEditGroup = async () => {
  editGroupNameError.value = '';
  if (!editGroupName.value.trim()) {
    editGroupNameError.value = '⚠️ Group name is required.';
    return;
  }
  isEditingGroup.value = true;
  try {
    await emit('edit-group', { id: editingGroup.value.id, name: editGroupName.value });
    showEditGroupModal.value = false;
    editingGroup.value = null;
    editGroupName.value = '';
    toast.add({ severity: 'success', summary: 'Success', detail: 'Group updated successfully!', life: 2000 });
  } catch (err: any) {
    alert('Failed to update group: ' + err.message);
  } finally {
    isEditingGroup.value = false;
  }
};

const confirmDeleteGroup = (group: any) => {
  groupToDelete.value = group;
  showDeleteConfirmModal.value = true;
};
const handleDeleteGroup = async () => {
  if (!props.project || !groupToDelete.value?.id) return;
  isDeleting.value = true;
  try {
    await axiosInstance.delete(`/projects/${props.project.id}/groups/${groupToDelete.value.id}`);
    showDeleteConfirmModal.value = false;
    groupToDelete.value = null;
    await emit('refresh-groups');
    toast.add({ severity: 'success', summary: 'Success', detail: 'Group deleted successfully!', life: 2000 });
  } catch (err: any) {
    alert('Failed to delete group: ' + err.message);
  } finally {
    isDeleting.value = false;
  }
};
const cancelDeleteGroup = () => {
  showDeleteConfirmModal.value = false;
  groupToDelete.value = null;
};

const performDeleteGroup = async () => {
  if (!props.project || !groupToDelete.value?.id) return;
  try {
    await emit('delete-group', { ...groupToDelete.value });
    showDeleteConfirmModal.value = false;
    groupToDelete.value = null;
  } catch (err: any) {
    alert('Failed to delete group: ' + err.message);
  }
};
</script>

<template>
  <div>
    <!-- Project Groups Section -->
    <div class="groups-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">
            <!-- Heroicons: Users -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="22" height="22">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0zm6 13v-2a4 4 0 00-3-3.87M6 10a4 4 0 00-3 3.87V20" />
            </svg>
          </span>
          Project Groups
        </h2>
        <button class="btn btn-primary btn-sm" @click="openCreateGroupModal">
          <span class="icon">➕</span> Create Group
        </button>
      </div>
      <div class="groups-content">
        <div v-if="props.groupsLoading" class="empty-section">
          <div class="empty-icon">⚙️</div>
          <h3>Loading Groups...</h3>
          <p>Please wait while we fetch the project groups.</p>
        </div>
        <div v-else-if="props.groupsError" class="empty-section">
          <div class="empty-icon">❌</div>
          <h3>Error: {{ props.groupsError }}</h3>
          <p>Failed to load project groups. Please try again later.</p>
        </div>
        <div v-else-if="props.groups.length === 0" class="empty-section">
          <div class="empty-icon">
            <!-- Heroicons: Users -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="38" height="38">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0zm6 13v-2a4 4 0 00-3-3.87M6 10a4 4 0 00-3 3.87V20" />
            </svg>
          </div>
          <h3>No Groups</h3>
          <p>No groups have been created for this project yet.</p>
        </div>
        <div v-else class="groups-list">
          <div v-for="group in props.groups" :key="group.id" class="group-item">
            <div class="group-info">
              <div class="group-header">
                <span class="group-name">{{ group.name }}</span>
                <span class="group-badge">{{ group.permissionFlags }}</span>
              </div>
              <div class="members-info">
                <span class="members-count">
                  <span class="count-icon">👤</span>
                  {{ group.members?.length || 0 }} members
                </span>
              </div>
            </div>
            <div class="group-actions">
              <button class="btn btn-outline btn-sm" @click="openEditGroupModal(group)">
                <span class="icon">✏️</span> Edit
              </button>
              <button class="btn btn-danger btn-sm" @click="confirmDeleteGroup(group)">
                <span class="icon">🗑️</span> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal tạo group (nếu cần) sẽ render ở ProjectDetailView.vue -->
    <Teleport to="body">
      <div v-if="showCreateGroupModal" class="global-modal-overlay-fixed"></div>
      <div v-if="showCreateGroupModal" class="modal-portal">
        <div class="modal-content group-modal-harmonize">
          <div class="modal-title-harmonize">
            <span class="modal-title-icon-harmonize">👥</span>
            <h2 class="modal-title-text-harmonize">Create New Group</h2>
          </div>
          <div class="modal-title-desc-harmonize">Organize your projects by creating a new group.</div>
          <form @submit.prevent="createGroup">
            <div class="form-group input-icon-group-harmonize" style="margin-bottom: 18px;">
              <label for="newGroupName" style="margin-bottom: 8px;">Group Name:</label>
              <span class="input-icon-harmonize">👥</span>
              <input
                type="text"
                id="newGroupName"
                v-model="newGroup.name"
                :placeholder="'Enter group name…'"
                :class="{ error: groupNameError }"
                @keydown="handleInputKeydown"
                autocomplete="off"
              />
              <div v-if="groupNameError" class="input-error">{{ groupNameError }}</div>
            </div>
            <!-- Multiselect chọn thành viên giống chọn tag -->
            <div class="form-group input-icon-group-harmonize" style="position: relative; margin-bottom: 22px;">
              <label for="groupMembers" style="margin-bottom: 8px;">Group Members:</label>
              <Multiselect
                id="groupMembers"
                v-model="selectedMembers"
                :options="memberOptions"
                :multiple="true"
                :close-on-select="false"
                :clear-on-select="false"
                :preserve-search="true"
                placeholder="Select members..."
                label="label"
                track-by="id"
                class="multiselect-custom"
                :show-labels="false"
              />
              <div class="form-hint" style="font-size: 12px; color: #999; margin-top: 8px;">
                You can select multiple members for this group
              </div>
            </div>
            <div class="form-actions form-actions-harmonize">
              <button type="submit" class="btn btn-primary btn-action-harmonize" :disabled="isCreatingGroup" style="padding: 0.5rem 1.2rem;">
                <span class="btn-action-icon-harmonize"><i class="pi pi-check"></i></span>
                <span v-if="isCreatingGroup" class="loading-spinner-small"></span>
                {{ isCreatingGroup ? 'Creating…' : 'Create Group' }}
              </button>
              <button type="button" class="btn btn-outline btn-cancel-harmonize" @click="closeCreateGroupModal" style="border: 1.2px solid #e0e0e0; color: #888; background: #fff;">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
    <!-- Thêm modal xác nhận xóa group vào template -->
    <Teleport to="body">
      <div v-if="showDeleteConfirmModal" class="delete-dialog-modal">
        <div class="modal-overlay" @click="cancelDeleteGroup"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Delete Group</h3>
            <button class="close-btn" @click="cancelDeleteGroup">×</button>
          </div>
          <div class="modal-body">
            <div class="warning-message">
              <div class="warning-icon"><i class="pi pi-exclamation-triangle"></i></div>
              <h4>Are you sure you want to delete the group "{{ groupToDelete?.name }}"?</h4>
              <p>This action cannot be undone.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="cancelDeleteGroup" :disabled="isDeleting">Keep Group</button>
            <button class="btn btn-danger" @click="handleDeleteGroup" :disabled="isDeleting">
              <span v-if="isDeleting" class="loading-spinner-small"></span>
              {{ isDeleting ? 'Deleting...' : 'Delete Group' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Thêm modal edit group vào template -->
    <Teleport to="body">
      <div v-if="showEditGroupModal" class="modal-overlay" @click.self="closeEditGroupModal">
        <div class="modal-content group-modal-harmonize">
          <div class="modal-title-harmonize">
            <span class="modal-title-icon-harmonize">👥</span>
            <h2 class="modal-title-text-harmonize">Edit Group</h2>
          </div>
          <div class="modal-title-desc-harmonize">Update the group name below.</div>
          <form @submit.prevent="performEditGroup">
            <div class="form-group input-icon-group-harmonize">
              <label for="editGroupName">Group Name:</label>
              <span class="input-icon-harmonize">👥</span>
              <input
                type="text"
                id="editGroupName"
                v-model="editGroupName"
                :placeholder="'Enter group name…'"
                :class="{ error: editGroupNameError }"
                @keydown="handleEditGroupKeydown"
                autocomplete="off"
              />
              <div v-if="editGroupNameError" class="input-error">{{ editGroupNameError }}</div>
            </div>
            <div class="form-actions form-actions-harmonize">
              <button type="submit" class="btn btn-primary btn-action-harmonize" :disabled="isEditingGroup">
                <span class="btn-action-icon-harmonize">✏️</span>
                <span v-if="isEditingGroup" class="loading-spinner-small"></span>
                {{ isEditingGroup ? 'Saving…' : 'Save Changes' }}
              </button>
              <button type="button" class="btn btn-outline btn-cancel-harmonize" @click="closeEditGroupModal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.groups-section {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 32px rgba(49,130,206,0.10), 0 2px 8px rgba(76,34,128,0.08);
  padding: 1.2rem 1.2rem 1rem 1.2rem; /* giảm padding cho gọn */
  margin-bottom: 2.2rem;
  position: relative;
  margin-top: 2em;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.8rem; /* giảm gap */
  margin-bottom: 1rem;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #2d3748;
  font-size: 1.1rem; /* nhỏ hơn */
  font-weight: 700;
  margin: 0;
}
.title-icon {
  font-size: 1.5rem; /* nhỏ hơn */
  width: 2.2rem;
  height: 2.2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.groups-content {
  min-height: 120px;
}
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1.5rem 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}
.group-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
.group-info {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 1em;
  margin-bottom: 0.5rem;
}
.group-name {
  font-weight: 600;
  font-size: 1.1em;
  color: #2d3748;
}
.group-badge {
  background: #fef5e7;
  color: #c05621;
  border-radius: 0.5em;
  padding: 0.2em 0.7em;
  font-size: 0.95em;
  font-weight: 500;
}
.members-info {
  font-size: 0.97em;
  color: #4a5568;
  margin-top: 0.5rem;
}
.members-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4299e1;
  font-size: 0.875rem;
  font-weight: 500;
}
.count-icon {
  font-size: 1rem;
}
.group-actions {
  display: flex;
  gap: 0.7em;
}
.empty-section {
  text-align: center;
  padding: 2em 0;
}
.empty-icon {
  font-size: 2.5em;
  margin-bottom: 0.5em;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.18s;
  box-shadow: 0 2px 8px #3182ce11;
}
.btn-primary {
  background: linear-gradient(135deg, #38b2ac 0%, #4299e1 100%);
  color: #fff;
  box-shadow: 0 4px 16px #4299e133;
  border: 2px solid #4299e1;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #4299e1 0%, #38b2ac 100%);
  color: #fff;
  border-color: #3182ce;
  box-shadow: 0 8px 32px #4299e133;
  transform: translateY(-2px) scale(1.04);
  filter: brightness(1.08);
}
.btn-outline {
  background: #fff;
  color: #2563eb;
  border: 2px solid #2563eb;
  font-weight: 700;
  box-shadow: 0 2px 8px #2563eb22;
  transition: all 0.18s;
}
.btn-outline:hover {
  background: #2563eb;
  color: #fff;
  border-color: #1e40af;
  box-shadow: 0 6px 24px #2563eb33;
}
.btn-sm {
  font-size: 0.95em;
  padding: 0.5em 1.1em;
  border-radius: 8px;
}
.btn.btn-primary.btn-sm {
  font-size: 0.92rem;
  padding: 0.28rem 0.7rem;
  border-radius: 7px;
  min-width: 80px;
  height: 1.7rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.btn .icon {
  font-size: 0.95rem;
  margin-right: 0.13rem;
}
@media (max-width: 700px) {
  .groups-section {
    padding: 0.7rem 0.3rem 0.7rem 0.3rem;
  }
  .section-header {
    gap: 0.5rem;
    margin-bottom: 0.7rem;
  }
  .section-title {
    font-size: 1rem;
    gap: 0.5rem;
  }
  .title-icon {
    font-size: 1.1rem;
    width: 1.5rem;
    height: 1.5rem;
  }
  .btn.btn-primary.btn-sm {
    font-size: 0.88rem;
    padding: 0.18rem 0.5rem;
    min-width: 60px;
    height: 1.3rem;
  }
  .btn .icon {
    font-size: 0.8rem;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 20px;
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  box-shadow: 0 25px 50px rgba(0,0,0,0.18);
  width: 95%;
  max-width: 420px;
  text-align: center;
}
.modal-content h2 {
  color: #22223b;
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 2rem;
  letter-spacing: 0.01em;
}
.form-group label {
  display: block;
  margin-bottom: 0.7rem;
  color: #4a5568;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: left;
}
.form-group input {
  width: 100%;
  padding: 1.1rem 1.2rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1.1rem;
  color: #22223b;
  background: #f8fafc;
  transition: border 0.2s, box-shadow 0.2s;
  margin-bottom: 1.5rem;
}
.form-group input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px #4299e122;
}
.form-actions {
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-top: 1.2rem;
}
.form-actions .btn {
  flex: 1;
  padding: 0.8rem 1.5rem;
}
.form-actions .btn-outline {
  background: #f8fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  font-weight: 600;
  box-shadow: none;
}
.form-actions .btn-outline:hover {
  background: #edf2f7;
  color: #2d3748;
  border-color: #cbd5e0;
  box-shadow: none;
}
/* Center buttons in confirmation modal */
.form-actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin: 2rem auto 0 auto;
  width: fit-content;
}

/* Green Confirm button */
.btn-confirm {
  background: linear-gradient(135deg, #48bb78, #38a169); /* green gradient */
  color: white;
  border: none;
  font-weight: 600;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.btn-confirm:hover {
  background: linear-gradient(135deg, #38a169, #2f855a);
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 6px 16px rgba(72, 187, 120, 0.3);
}
@media (max-width: 700px) {
  .modal-content {
    padding: 1.2rem 0.7rem 1rem 0.7rem;
    max-width: 98vw;
  }
  .form-group input {
    font-size: 1rem;
    padding: 0.8rem 0.7rem;
  }
  .btn-primary, .btn-outline {
    font-size: 1rem;
    padding: 0.7rem 1.1rem;
  }
}
.input-icon-group {
  position: relative;
}
.input-icon {
  position: absolute;
  left: 1.1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
  color: #4299e1;
  pointer-events: none;
  z-index: 2;
}
.input-icon-group input {
  padding-left: 2.5rem !important;
}
.input-error {
  color: #e53e3e;
  font-size: 0.98rem;
  margin-top: 0.3rem;
  text-align: left;
}
.input-icon-group input.error {
  border-color: #e53e3e;
}
.input-icon-group input:focus {
  border-color: #4299e1;
  box-shadow: 0 0 0 3px #4299e122;
}
.toast-success {
  position: fixed;
  left: 50%;
  bottom: 2.5rem;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #38b2ac 0%, #7f53ac 100%);
  color: #fff;
  padding: 0.9rem 2.2rem;
  border-radius: 2rem;
  font-size: 1.1rem;
  font-weight: 700;
  box-shadow: 0 8px 32px rgba(56, 178, 172, 0.18);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  animation: fadeInUp 0.3s;
}
.toast-icon {
  font-size: 1.5em;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
.loading-spinner-small {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.group-modal-upgrade {
  padding: 1.5rem !important; /* 24px */
  box-shadow: 0 16px 48px 0 rgba(49, 130, 206, 0.18), 0 2px 8px rgba(76, 34, 128, 0.10) !important;
  border-radius: 24px !important;
  min-width: 320px;
  max-width: 400px;
}
.modal-title-upgrade {
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}
.modal-title-icon {
  font-size: 2.3rem;
  margin-top: 0.1rem;
  color: #4299e1;
  flex-shrink: 0;
}
.modal-title-text {
  font-size: 1.13rem; /* 18px */
  font-weight: 800;
  margin: 0 0 0.18rem 0;
  color: #1a202c;
  letter-spacing: 0.01em;
}
.modal-title-desc {
  font-size: 0.98rem; /* 14px */
  color: #4a5568;
  margin-bottom: 0.18rem;
  font-weight: 400;
}
.input-icon-group input {
  border-radius: 12px !important;
  font-size: 0.98rem; /* 14px */
  background: #f8fafc;
  border: 2.5px solid #e2e8f0;
  transition: border 0.18s, box-shadow 0.18s;
  padding: 10px 14px !important;
}
.btn.btn-primary.btn-action {
  font-size: 0.98rem; /* 14px */
  padding: 10px 20px;
  border-radius: 14px;
  box-shadow: 0 4px 16px #4299e133;
  padding: 0.95rem 2.3rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  transition: filter 0.18s, box-shadow 0.18s;
}
.btn.btn-primary.btn-action:hover:not(:disabled) {
  filter: brightness(1.10);
  box-shadow: 0 8px 32px #4299e144;
}
.btn-action-icon {
  font-size: 1.2rem;
  margin-right: 0.1rem;
}
.btn-cancel {
  border: 2px solid #e2e8f0 !important;
  color: #4a5568 !important;
  background: #f8fafc !important;
  font-weight: 700;
  border-radius: 14px;
  font-size: 0.98rem; /* 14px */
  padding: 10px 20px;
  transition: background 0.18s, color 0.18s, border 0.18s;
}
.btn-cancel:hover {
  background: #edf2f7 !important;
  color: #2d3748 !important;
  border-color: #cbd5e0 !important;
}
.form-group {
  margin-bottom: 1.2rem;
}
.form-actions {
  margin-top: 1.2rem;
  gap: 1.1rem;
}
@media (max-width: 700px) {
  .group-modal-upgrade {
    padding: 0.7rem !important;
    min-width: 90vw;
    max-width: 98vw;
  }
  .modal-title-text {
    font-size: 1rem;
  }
  .modal-title-icon {
    font-size: 1.2rem;
  }
  .form-actions {
    gap: 0.5rem;
  }
}
.group-modal-tinhchinh {
  padding: 24px !important;
  box-shadow: 0 8px 32px 0 rgba(49,130,206,0.10), 0 2px 8px rgba(76,34,128,0.06) !important;
  border-radius: 14px !important;
  min-width: 320px;
  max-width: 400px;
}
.modal-title-tinhchinh {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
  justify-content: center;
}
.modal-title-icon-tinhchinh {
  font-size: 1.3rem;
  color: #4299e1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-title-text-tinhchinh {
  font-size: 1.13rem; /* 18px */
  font-weight: 700;
  margin: 0 0 0.1rem 0;
  color: #1a202c;
  letter-spacing: 0.01em;
  text-align: left;
}
.modal-title-desc-tinhchinh {
  font-size: 0.98rem; /* 14px */
  color: #666;
  margin-bottom: 0.1rem;
  font-weight: 400;
  line-height: 20px;
  text-align: left;
}
.input-icon-group-tinhchinh {
  position: relative;
}
.input-icon-tinhchinh {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #4299e1;
  pointer-events: none;
  z-index: 2;
}
.input-icon-group-tinhchinh input {
  border-radius: 9px !important;
  font-size: 0.98rem; /* 14px */
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  transition: border 0.18s, box-shadow 0.18s;
  padding: 10px 14px 10px 2.2rem !important;
  color: #222;
}
.input-icon-group-tinhchinh input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #4299e144;
}
.input-icon-group-tinhchinh input::placeholder {
  color: #aaa;
  opacity: 1;
}
.btn.btn-primary.btn-action-tinhchinh {
  font-size: 0.98rem; /* 14px */
  padding: 10px 18px;
  border-radius: 10px;
  background: linear-gradient(90deg, #38b2ac 0%, #4299e1 100%) !important;
  color: #fff !important;
  font-weight: 700;
  box-shadow: 0 2px 8px #4299e122;
  transition: filter 0.18s, box-shadow 0.18s;
}
.btn.btn-primary.btn-action-tinhchinh:hover:not(:disabled) {
  filter: brightness(1.08);
  box-shadow: 0 6px 18px #4299e133;
}
.btn-action-icon {
  font-size: 1.1rem;
  margin-right: 0.1rem;
}
.btn-cancel-tinhchinh {
  font-size: 0.98rem; /* 14px */
  padding: 10px 18px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0 !important;
  color: #555 !important;
  background: #fff !important;
  font-weight: 600;
  transition: background 0.18s, color 0.18s, border 0.18s;
}
.btn-cancel-tinhchinh:hover {
  background: #f8fafc !important;
  color: #222 !important;
  border-color: #cbd5e0 !important;
}
.form-group {
  margin-bottom: 1.1rem;
}
.form-actions {
  margin-top: 1.1rem;
  gap: 1rem;
}
@media (max-width: 700px) {
  .group-modal-tinhchinh {
    padding: 0.7rem !important;
    min-width: 90vw;
    max-width: 98vw;
  }
  .modal-title-text-tinhchinh {
    font-size: 1rem;
  }
  .modal-title-icon-tinhchinh {
    font-size: 1rem;
  }
  .form-actions {
    gap: 0.5rem;
  }
}
.group-modal-harmonize {
  min-width: 380px;
  max-width: 480px;
  padding: 28px !important;
  border-radius: 16px !important;
  box-shadow: 0 6px 24px 0 rgba(49,130,206,0.09), 0 2px 8px rgba(76,34,128,0.05) !important;
  background: #fff;
  text-align: center;
}
.modal-title-harmonize {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 0.5rem;
}
.modal-title-icon-harmonize {
  font-size: 1.1rem;
  color: #4299e1;
  margin-bottom: 0.1rem;
}
.modal-title-text-harmonize {
  font-size: 1.18rem; /* 18px */
  font-weight: 700;
  margin: 0;
  color: #1a202c;
  letter-spacing: 0.01em;
  text-align: center;
}
.modal-title-desc-harmonize {
  font-size: 0.97rem; /* 14px */
  color: #666;
  margin-bottom: 0.7rem;
  font-weight: 400;
  line-height: 20px;
  text-align: center;
}
.input-icon-group-harmonize {
  position: relative;
  margin-bottom: 0.7rem;
}
.input-icon-harmonize {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  color: #4299e1;
  pointer-events: none;
  z-index: 2;
}
.input-icon-group-harmonize input {
  border-radius: 8px !important;
  font-size: 0.97rem; /* 14px */
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  transition: border 0.18s, box-shadow 0.18s;
  padding: 8px 12px 8px 2rem !important;
  color: #222;
  text-align: center;
}
.input-icon-group-harmonize input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #4299e144;
}
.input-icon-group-harmonize input::placeholder {
  color: #aaa;
  opacity: 1;
}
.btn.btn-primary.btn-action-harmonize {
  font-size: 0.95rem; /* 13.5px */
  padding: 8px 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, #38b2ac 0%, #4299e1 100%) !important;
  color: #fff !important;
  font-weight: 700;
  box-shadow: 0 1.5px 6px #4299e122;
  transition: filter 0.18s, box-shadow 0.18s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-width: 130px;
  white-space: nowrap;
}
.btn.btn-primary.btn-action-harmonize:hover:not(:disabled) {
  filter: brightness(1.07);
  box-shadow: 0 4px 12px #4299e133;
}
.btn-action-icon-harmonize {
  font-size: 1rem;
  margin-right: 0.08rem;
}
.btn-cancel-harmonize {
  font-size: 0.95rem; /* 13.5px */
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.2px solid #e2e8f0 !important;
  color: #555 !important;
  background: #fff !important;
  font-weight: 600;
  transition: background 0.18s, color 0.18s, border 0.18s;
}
.btn-cancel-harmonize:hover {
  background: #f8fafc !important;
  color: #222 !important;
  border-color: #cbd5e0 !important;
}
.form-group {
  margin-bottom: 0.7rem;
}
.form-actions-harmonize {
  margin-top: 0.7rem;
  gap: 0.7rem;
  display: flex;
  justify-content: center;
  flex-wrap: nowrap;
}
@media (max-width: 700px) {
  .group-modal-harmonize {
    padding: 0.6rem !important;
    min-width: 90vw;
    max-width: 98vw;
  }
  .modal-title-text-harmonize {
    font-size: 1rem;
  }
  .modal-title-icon-harmonize {
    font-size: 0.8rem;
  }
  .form-actions-harmonize {
    gap: 0.4rem;
  }
}
.delete-dialog-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  position: relative;
  z-index: 10000;
  margin: auto;
  display: block;
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  padding: 0;
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
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  min-width: 90px !important;
  justify-content: center !important;
}
.btn-danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-danger:hover {
  background: #b91c1c !important;
  color: white !important;
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
@media (max-width: 600px) {
  .modal-content {
    max-width: 98vw;
    padding: 0;
  }
  .modal-header, .modal-footer, .modal-body {
    padding: 1rem;
  }
  .warning-message {
    padding: 1rem;
  }
}
.member-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
}
.member-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  background: #eee;
}
.member-name {
  font-weight: 500;
}
.member-email {
  color: #888;
  font-size: 0.95em;
}
.member-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f7f7f7;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 2px 8px;
  margin: 2px 4px 2px 0;
}
.member-chip i {
  font-size: 1em;
  color: #888;
  cursor: pointer;
}
/* Fix icon đè lên placeholder trong vue-multiselect - tăng độ ưu tiên */
.form-group.input-icon-group-harmonize .multiselect__tags,
.form-group.input-icon-group-harmonize .multiselect__input,
.form-group.input-icon-group-harmonize .multiselect__single {
  padding-left: 2.2rem !important;
  box-sizing: border-box;
}
.global-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 41, 59, 0.32);
  z-index: 2000;
  backdrop-filter: blur(2px);
  pointer-events: auto;
}
.modal-content.group-modal-harmonize {
  z-index: 2100;
}
</style>

<style>
.global-modal-overlay-fixed {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 41, 59, 0.32);
  z-index: 9999;
  backdrop-filter: blur(2px);
  pointer-events: auto;
}
.modal-portal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content.group-modal-harmonize {
  z-index: 10001;
}
</style>
