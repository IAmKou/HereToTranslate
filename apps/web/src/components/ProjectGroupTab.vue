<script setup lang="ts">
import { ref, watch } from 'vue';
import axiosInstance from '../api';
const showDeleteConfirmModal = ref(false);
const groupToDelete = ref(null);
const showEditGroupModal = ref(false);
const groupToEdit = ref({ id: null, name: '' });

const props = defineProps({
  project: Object,
});

const groups = ref([]);
const groupsLoading = ref(false);
const groupsError = ref(null);
const showCreateGroupModal = ref(false);
const isCreatingGroup = ref(false);
const newGroup = ref({ name: '' });

const loadGroups = async () => {
  if (!props.project) return;
  groupsLoading.value = true;
  groupsError.value = null;
  try {
    const res = await axiosInstance.get(`/projects/${props.project.id}/groups`);
    groups.value = res.data;
  } catch (error) {
    groupsError.value = error?.response?.data?.message || 'Failed to load groups.';
  } finally {
    groupsLoading.value = false;
  }
};

watch(() => props.project, (newProject) => {
  if (newProject) loadGroups();
}, { immediate: true });

const createGroup = async () => {
  if (!props.project) return;
  isCreatingGroup.value = true;
  try {
    await axiosInstance.post(`/projects/${props.project.id}/groups/create`, newGroup.value);
    await loadGroups();
    showCreateGroupModal.value = false;
    newGroup.value = { name: '' };
  } catch (err) {
    alert('Failed to create group: ' + err.message);
  } finally {
    isCreatingGroup.value = false;
  }
};

const editGroup = (group) => {
  groupToEdit.value = { ...group }; // clone để không ảnh hưởng original
  showEditGroupModal.value = true;
};

const confirmDeleteGroup = (group) => {
  groupToDelete.value = group;
  showDeleteConfirmModal.value = true;
};

const performEditGroup = async () => {
  if (!props.project || !groupToEdit.value.id) return;
  try {
    await axiosInstance.put(`/projects/${props.project.id}/groups/${groupToEdit.value.id}`, {
      name: groupToEdit.value.name,
    });
    await loadGroups();
    showEditGroupModal.value = false;
    groupToEdit.value = { id: null, name: '' };
  } catch (err) {
    alert('Failed to update group: ' + err.message);
  }
};

</script>

<template>
  <div>
    <!-- Project Groups Section -->
    <div class="groups-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">👨‍👩‍👧‍👦</span>
          Project Groups
        </h2>
        <button class="btn btn-primary btn-sm" @click="showCreateGroupModal = true">
          <span class="icon">➕</span> Create Group
        </button>
      </div>
      <div class="groups-content">
        <div v-if="groupsLoading" class="empty-section">
          <div class="empty-icon">⚙️</div>
          <h3>Loading Groups...</h3>
          <p>Please wait while we fetch the project groups.</p>
        </div>
        <div v-else-if="groupsError" class="empty-section">
          <div class="empty-icon">❌</div>
          <h3>Error: {{ groupsError }}</h3>
          <p>Failed to load project groups. Please try again later.</p>
        </div>
        <div v-else-if="groups.length === 0" class="empty-section">
          <div class="empty-icon">👨‍👩‍👧‍👦</div>
          <h3>No Groups</h3>
          <p>No groups have been created for this project yet.</p>
        </div>
        <div v-else class="groups-list">
          <div v-for="group in groups" :key="group.id" class="group-item">
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
              <button class="btn btn-outline btn-sm" @click="editGroup(group)">
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
    <div v-if="showCreateGroupModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Create New Group</h2>
        <form @submit.prevent="createGroup">
          <div class="form-group">
            <label for="newGroupName">Group Name:</label>
            <input type="text" id="newGroupName" v-model="newGroup.name" required />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="isCreatingGroup">
              {{ isCreatingGroup ? 'Creating...' : 'Create Group' }}
            </button>
            <button type="button" class="btn btn-outline" @click="showCreateGroupModal = false">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div v-if="showEditGroupModal" class="modal-overlay">
    <div class="modal-content">
      <h2>Edit Group</h2>
      <form @submit.prevent="performEditGroup">
        <div class="form-group">
          <label for="editGroupName">Group Name:</label>
          <input type="text" id="editGroupName" v-model="groupToEdit.name" required />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn btn-outline" @click="showEditGroupModal = false">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showDeleteConfirmModal" class="modal-overlay">
    <div class="modal-content">
      <h2>Confirm Delete</h2>
      <p>Are you sure you want to delete the group "<strong>{{ groupToDelete?.name }}</strong>"?</p>
      <div class="form-actions">
        <button class="btn btn-confirm" @click="performDeleteGroup">Confirm</button>

        <button class="btn btn-outline" @click="showDeleteConfirmModal = false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.groups-section {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 32px rgba(49,130,206,0.10), 0 2px 8px rgba(76,34,128,0.08);
  padding: 2.2rem 2.2rem 1.5rem 2.2rem;
  margin-bottom: 2.2rem;
  position: relative;
  margin-top: 2em;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #2d3748;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}
.title-icon {
  font-size: 2.2rem;
  width: 3.2rem;
  height: 3.2rem;
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
  border-radius: 15px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  text-align: center;
}

.modal-content h2 {
  color: #2d3748;
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4a5568;
  font-size: 1rem;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  color: #2d3748;
  transition: all 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px #4299e133;
}

.form-actions {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions .btn {
  flex: 1;
  padding: 0.8rem 1.5rem;
}

.form-actions .btn-outline {
  background: #f7fafc;
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

</style>
