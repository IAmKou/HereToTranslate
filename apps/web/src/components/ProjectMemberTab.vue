<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import axiosInstance from '../api';

const props = defineProps({
  project: Object,
});

// State cho tab Members
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
    members.value = Object.values(memberMap);
  } catch (err) {
    membersError.value = err.message || 'Failed to load members.';
  } finally {
    membersLoading.value = false;
  }
};

watch(() => props.project, (newProject) => {
  if (newProject) loadMembers();
}, { immediate: true });

// User search
const searchUser = async () => {
  if (!props.project) return;
  userSearch.value.loading = true;
  userSearch.value.error = '';
  userSearch.value.results = [];
  try {
    const { data } = await axiosInstance.post(
      `/projects/${props.project.id}/search-user`,
      { identifier: userSearch.value.identifier }
    );
    let rawResults = [];
    if (Array.isArray(data.user) && data.user.length > 0) {
      rawResults = data.user;
    } else if (Array.isArray(data) && data.length > 0) {
      rawResults = data;
    } else if (data.user && typeof data.user === 'object') {
      rawResults = [data.user];
    } else {
      userSearch.value.error = 'No user found.';
    }
    // Map backend fields to frontend fields
    userSearch.value.results = rawResults.map(u => ({
      id: u.user_id || u.id,
      email: u.user_email || u.email,
      phone: u.user_phone || u.phone,
      fullName: u.user_fullName || u.fullName,
      username: u.user_username || u.username,
    }));
    console.log('Search results:', JSON.stringify(userSearch.value.results, null, 2));
  } catch (err) {
    userSearch.value.error = err.message || 'Failed to search user.';
  } finally {
    userSearch.value.loading = false;
  }
};

const addUserToProject = async (user) => {
  if (!props.project || !user) return;
  userSearch.value.addingId = user.id;
  try {
    await axiosInstance.post(`/projects/${props.project.id}/add-user`, {
      identifier: user.id,
    });
    // BỎ QUA gọi update-roles
    await loadMembers();
    userSearch.value.results = userSearch.value.results.filter(u => u.id !== user.id);
    userSearch.value.identifier = '';
  } catch (err) {
    alert('Failed to add user: ' + err.message);
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
      !(member.id === project.createdBy.id && role.name === 'Project Owner')
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
</script>

<template>
  <div class="management-section user-section">
    <div class="section-header">
      <h2 class="section-title">
        <span class="title-icon">➕</span>
        Add User to Project
      </h2>
    </div>
    <div class="section-content">
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
    <div class="members-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">👥</span>
          Project Members
        </h2>
        <div style="margin-left:auto; display: flex; gap: 0.5rem;">
          <button class="btn btn-primary" @click="showAddRoleModal = true">
            <span class="icon">➕</span> Add Role
          </button>
          <button class="btn btn-outline" @click="showRoleModal = true">
            <span class="icon">🛡️</span> Manage Roles
          </button>
        </div>
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
                <!-- Xoá nút edit role ở đây, không render gì nữa -->
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
  </div>
</template>

<style scoped>
.management-section {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 32px rgba(49,130,206,0.10), 0 2px 8px rgba(76,34,128,0.08);
  padding: 2.2rem 2.2rem 1.5rem 2.2rem;
  margin-bottom: 2.2rem;
  position: relative;
}
.user-section {
  margin-bottom: 2.2rem;
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
.section-content {
  background: #f8fafc;
  border-radius: 14px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  margin-bottom: 2rem;
  border: 1.5px solid #e2e8f0;
}
.form-row {
  display: flex;
  gap: 1.2rem;
  align-items: flex-end;
}
.form-group {
  position: relative;
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
  border-radius: 10px;
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
.form-actions {
  display: flex;
  align-items: center;
  gap: 0.7rem;
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
.error-message {
  color: #e53e3e;
  background: #fff5f5;
  border: 1.5px solid #e53e3e;
  border-radius: 8px;
  padding: 0.7rem 1.2rem;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 1rem;
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
.found-user {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  background: #f8fafc;
  border-radius: 10px;
  padding: 1rem 1.5rem;
  margin-top: 1rem;
  box-shadow: 0 2px 8px #3182ce11;
}
.avatar-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}
.members-section {
  margin-top: 2em;
}
.members-content {
  min-height: 120px;
}
.members-list.members-table-responsive {
  overflow-x: auto;
  display: block;
}
.members-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  margin-top: 1rem;
}
.members-table th,
.members-table td {
  border: 1px solid #e2e8f0;
  padding: 1rem;
  text-align: left;
}
.members-table th {
  background: #f1f5f9;
  font-weight: 700;
  color: #2d3748;
  cursor: pointer;
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
  gap: 0.75rem;
}
.user-avatar {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #7f53ac 0%, #4299e1 100%);
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px #3182ce22;
}
.user-info {
  display: flex;
  flex-direction: column;
}
.user-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 1rem;
}
.user-email {
  color: #a0aec0;
  font-size: 0.92rem;
  margin-top: 0.1rem;
}
.role-badge {
  display: inline-block;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 999px;
  padding: 0.25rem 0.9rem;
  font-size: 0.92rem;
  font-weight: 500;
  margin-right: 0.3rem;
  margin-bottom: 0.1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.role-badge:hover {
  background: #c7d2fe;
}
.edit-role-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 50%;
  color: #3182ce;
  cursor: pointer;
  transition: background 0.18s;
  font-size: 1.1rem;
}
.edit-role-btn:hover {
  background: #e0e7ef;
}
.empty-members {
  text-align: center;
  padding: 2em 0;
}
.empty-icon {
  font-size: 2.5em;
  margin-bottom: 0.5em;
}
.user-suggest-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 8px 24px #3182ce22;
  z-index: 20;
  margin: 0;
  padding: 0.2rem 0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
}
.user-suggest-dropdown li {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 1.2rem;
  cursor: pointer;
  font-size: 1rem;
  color: #2d3748;
  transition: background 0.18s, color 0.18s;
}
.user-suggest-dropdown li.active,
.user-suggest-dropdown li:hover {
  background: #f0f6ff;
  color: #3182ce;
}
.suggest-name {
  font-weight: 600;
}
.suggest-email {
  color: #a0aec0;
  font-size: 0.95em;
  margin-left: 0.5rem;
}
.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.1em;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 16px #3182ce18;
  padding: 1.2em 2em;
  background: #fff;
  transition: box-shadow 0.18s, border 0.18s;
}
.user-card:hover {
  box-shadow: 0 8px 32px #3182ce33;
  border-color: #4299e1;
}
.user-card-left {
  display: flex;
  align-items: center;
  gap: 1.3em;
}
.big-avatar {
  width: 3.2rem;
  height: 3.2rem;
  font-size: 1.7rem;
  border: 2.5px solid #e2e8f0;
  box-shadow: 0 2px 8px #3182ce22;
}
.user-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.user-name {
  margin: 0;
  font-size: 1.13rem;
  font-weight: 700;
  color: #2d3748;
}
.user-meta {
  margin: 0.1em 0 0 0;
  font-size: 0.98em;
  color: #6b7280;
  font-weight: 500;
}
.user-add-btn {
  margin-left: 2em;
  min-width: 130px;
  box-shadow: 0 2px 8px #3182ce11;
}
</style>
