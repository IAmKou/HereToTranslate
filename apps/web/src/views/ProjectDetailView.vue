<template>
  <div class="project-detail-page">
    <!-- Navbar -->
    <Navbar />

    <div class="main-container">
      <!-- Sidebar -->
      <Sidebar />

      <!-- Main Content -->
      <div class="content-wrapper" @click="closeDropdowns">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-content">
            <div class="page-title-section">
              <h1 class="page-title">
                <span class="page-icon">📋</span>
                Project Details
              </h1>
              <p class="page-subtitle">
                View and manage project information, members, and settings
              </p>
            </div>
            <div class="page-actions">
              <router-link to="/projects" class="btn btn-outline btn-back">
                <span class="icon">←</span>
                Back to Projects
              </router-link>
            </div>
          </div>
        </div>

        <div class="project-detail-view">
          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <h3>Loading Project</h3>
              <p>Please wait while we fetch the project details...</p>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-container">
            <div class="error-content">
              <div class="error-icon">⚠️</div>
              <h3>Oops! Something went wrong</h3>
              <p>{{ error }}</p>
              <button @click="loadProject" class="btn btn-primary btn-retry">
                <span class="icon">🔄</span>
                Try Again
              </button>
            </div>
          </div>

          <!-- Project Content -->
          <div v-else-if="project" class="project-content">
            <!-- Enhanced Project Header -->
            <div class="project-header glassy-header">
              <div class="project-header-left">
                <div class="creator-avatar">
                  <template v-if="project.createdBy.avatarUrl">
                    <img
                      :src="project.createdBy.avatarUrl"
                      alt="Avatar"
                      class="avatar-img"
                    />
                  </template>
                  <template v-else>
                    <svg
                      class="avatar-placeholder"
                      fill="none"
                      height="48"
                      viewBox="0 0 48 48"
                      width="48"
                    >
                      <circle
                        cx="24"
                        cy="24"
                        fill="url(#avatarGradient)"
                        r="24"
                      />
                      <path
                        d="M24 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm0 3c-4.418 0-13 2.238-13 6.667V39h26v-4.333C37 30.238 28.418 28 24 28z"
                        fill="#fff"
                        fill-opacity=".7"
                      />
                    </svg>
                    <svg width="0" height="0">
                      <defs>
                        <linearGradient
                          id="avatarGradient"
                          x1="0"
                          x2="1"
                          y1="0"
                          y2="1"
                        >
                          <stop offset="0%" stop-color="#7f53ac" />
                          <stop offset="100%" stop-color="#4299e1" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </template>
                </div>
                <div class="creator-info-block">
                  <div class="project-title-row">
                    <h1 class="project-title">
                      {{ project.name }}
                      <span
                        v-if="project.isPrivate"
                        class="badge badge-private-new"
                        title="Private"
                      >
                        <span class="badge-icon"
                        ><svg
                          fill="none"
                          height="16"
                          viewBox="0 0 20 20"
                          width="16"
                        >
                            <path
                              d="M6 9V7a4 4 0 118 0v2"
                              stroke="#b7791f"
                              stroke-width="1.5"
                            />
                            <rect
                              fill="#fefcbf"
                              height="7"
                              rx="2"
                              stroke="#b7791f"
                              stroke-width="1.5"
                              width="12"
                              x="4"
                              y="9"
                            />
                            <circle
                              cx="10"
                              cy="13"
                              fill="#b7791f"
                              r="1.5"
                            /></svg
                        ></span>
                        <span class="badge-text">Private</span>
                      </span>
                      <span
                        v-else
                        class="badge badge-public-new"
                        title="Public"
                      >
                        <span class="badge-icon">🌍</span>
                        <span class="badge-text">Public</span>
                      </span>
                    </h1>
                  </div>
                  <div class="project-meta-row">
                    <div class="meta-item">
                      <span class="meta-icon">👤</span>
                      <span class="meta-text">
                        {{
                          project.createdBy.fullName ||
                          project.createdBy.username
                        }}
                      </span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-icon">📅</span>
                      <span class="meta-text">{{
                          formatDate(project.createdAt)
                        }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="project-actions actions-dropdown-wrapper">
                <div class="actions-dropdown" v-if="!showActionsMenu">
                  <button
                    class="btn btn-outline icon-btn"
                    @click="showActionsMenu = true"
                  >
                    <span class="icon">⋮</span>
                  </button>
                </div>
                <div class="actions-dropdown-menu" v-if="showActionsMenu">
                  <button class="dropdown-action" @click="goToManage">
                    <span class="icon">⚙️</span> Manage Project
                  </button>
                  <button class="dropdown-action" @click="editProject">
                    <span class="icon">✏️</span> Edit Project
                  </button>
                  <button
                    class="dropdown-action danger"
                    @click="openDeleteModal"
                  >
                    <span class="icon">🗑️</span> Delete Project
                  </button>
                  <button
                    class="dropdown-action close"
                    @click="showActionsMenu = false"
                  >
                    Close
                  </button>
                </div>
                <div class="actions-desktop" v-if="!isMobile">
                  <router-link
                    v-if="isProjectOwner || isProjectAdmin"
                    :to="`/projects/${project.id}/manage`"
                    class="btn btn-primary btn-manage"
                  >
                    <span class="icon">⚙️</span> Manage Project
                  </router-link>
                  <span
                    v-else
                    class="btn btn-primary btn-manage"
                    style="opacity:0.5; cursor:not-allowed; pointer-events: none;"
                  >
                    <span class="icon">⚙️</span> Manage Project
                  </span>
                  <button @click="editProject" class="btn btn-outline" :disabled="!(isProjectOwner || isProjectAdmin)">
                    <span class="icon">✏️</span> Edit Project
                  </button>
                  <button @click="openDeleteModal" class="btn btn-danger" :disabled="!isProjectOwner">
                    <span class="icon">🗑️</span> Delete Project
                  </button>
                </div>
              </div>
            </div>

            <!-- Stat Cards ngay sau Header -->
            <div class="project-stats">
              <div
                class="stat-card stat-card-clickable"
                title="View Roles & Members"
                @click="activeTab = 'members'"
              >
                <div class="stat-icon stat-icon-circle">👥</div>
                <div class="stat-number">
                  {{ actualRoleCount }}
                </div>
                <div class="stat-label">Roles</div>
              </div>
              <div
                class="stat-card stat-card-clickable"
                title="View Groups"
                @click="activeTab = 'groups'"
              >
                <div class="stat-icon stat-icon-circle">👨‍👩‍👧‍👦</div>
                <div class="stat-number">{{ project.groups?.length || 0 }}</div>
                <div class="stat-label">Groups</div>
              </div>
              <div
                class="stat-card stat-card-clickable"
                title="View Files"
                @click="scrollToFiles"
              >
                <div class="stat-icon stat-icon-circle">📁</div>
                <div class="stat-number">{{ projectFiles.length }}</div>
                <div class="stat-label">Files</div>
              </div>
              <div
                class="stat-card stat-card-clickable"
                title="Branches"
                @click="window.alert('Branch detail coming soon!')"
              >
                <div class="stat-icon stat-icon-circle">🌿</div>
                <div class="stat-number">{{ branches.length }}</div>
                <div class="stat-label">Branches</div>
              </div>
            </div>

            <!-- Project Members + Add User lên ngay sau Stat Cards -->
            <div class="management-sections">
              <!-- Tabs Navigation giữ nguyên -->
              <div class="tabs">
                <button
                  :class="['tab', { active: activeTab === 'description' }]"
                  @click="activeTab = 'description'"
                >
                  Description
                </button>
                <button
                  :class="['tab', { active: activeTab === 'members' }]"
                  @click="activeTab = 'members'"
                >
                  Members
                </button>
                <button
                  :class="['tab', { active: activeTab === 'roles' }]"
                  @click="activeTab = 'roles'"
                >
                  Roles
                </button>
                <button
                  :class="['tab', { active: activeTab === 'groups' }]"
                  @click="activeTab = 'groups'"
                >
                  Groups
                </button>
                <button
                  :class="['tab', { active: activeTab === 'discussions' }]"
                  @click="activeTab = 'discussions'"
                >
                  Discussions
                </button>
                <button
                  :class="['tab', { active: activeTab === 'files' }]"
                  @click="activeTab = 'files'"
                >
                  Files
                </button>
                <button
                  :class="['tab', { active: activeTab === 'translation' }]"
                  @click="activeTab = 'translation'"
                >
                  Translations
                </button>
                <button
                  :class="['tab', { active: activeTab === 'commits' }]"
                  @click="activeTab = 'commits'"
                >
                  Commits
                </button>
                <button
                  :class="['tab', { active: activeTab === 'task' }]"
                  @click="activeTab = 'task'"
                >
                  Tasks
                </button>
              </div>
              <transition name="fade-tab" mode="out-in">

                <ProjectMemberTab
                  v-if="activeTab === 'members'"
                  :project="project"
                  :members="members"
                  :current-user="currentUser"
                />
                <ProjectRoleTab
                  v-else-if="activeTab === 'roles'"
                  :project="project"
                />
                <ProjectGroupTab
                  v-else-if="activeTab === 'groups'"
                  :project="project"
                  :groups="groups"
                  :groups-loading="groupsLoading"
                  :groups-error="groupsError"
                  :members="members"
                  @create-group="handleCreateGroup"
                  @edit-group="handleEditGroup"
                  @delete-group="handleDeleteGroup"
                />
                <ProjectDisscusionTab
                  v-else-if="activeTab === 'discussions'"
                  :project-id="Number(project.id)"
                  :can-create-discussion="canCreateDiscussion"
                  :can-manage-discussions="canManageDiscussions"
                  :project="project"
                  :members="members"
                  :current-user="currentUser"
                />
                <ProjectFileTab
                  v-else-if="activeTab === 'files'"
                  :project-id="project.id"
                  :branch-id="selectedBranchId"
                  :project-files="projectFiles"
                  :files-loading="filesLoading"
                  :files-error="filesError || ''"
                  :is-image="isImage"
                  :is-p-d-f="isPDF"
                  :download-file="downloadFile"
                  :load-files="loadFiles"
                  :project="project"
                  :members="members"
                  :current-user="currentUser"
                  key="files"
                />
                <ProjectTranslationTab
                  v-else-if="activeTab === 'translation'"
                  :project-id="project.id"
                  :branch-id="selectedBranchId"
                  :project="project"
                  :members="members"
                  :current-user="currentUser"
                  key="translation"
                />
                <ProjectCommitTab
                  v-else-if="activeTab === 'commits'"
                  :project-id="project.id"
                  :branch-id="selectedBranchId"
                  :project="project"
                  :members="members"
                  :current-user="currentUser"
                  key="commits"
                />
                <ProjectTaskTab
                  v-else-if="activeTab === 'task'"
                  :tasks="tasks"
                  :loading="tasksLoading"
                  :error="tasksError"
                  :on-reload="loadTasks"
                  custom-title="Tasks"
                />

                <!-- Tab Description giữ nguyên như cũ -->
                <div v-else-if="activeTab === 'description'" key="description">
                  <!-- Project Description Section -->
                  <div class="project-section description-section">
                    <div class="section-header">
                      <h2 class="section-title">
                        <span class="title-icon">📝</span>
                        Description
                      </h2>
                      <button
                        v-if="canEditDescription && !editingDescription"
                        class="edit-desc-btn"
                        @click="startEditDescription"
                      >
                        <span class="icon">✏️</span>
                      </button>
                    </div>
                    <div class="description-content improved-desc-box">
                      <template v-if="editingDescription">
                        <textarea
                          v-model="editedDescription"
                          :maxlength="maxDescriptionLength"
                          class="desc-textarea"
                          rows="3"
                          @input="updateCharCount"
                        />
                        <div
                          :class="{ 'over-limit': descriptionOverLimit }"
                          class="desc-char-count"
                        >
                          {{ descriptionCharCount }}/{{ maxDescriptionLength }}
                          characters
                        </div>
                        <div class="desc-edit-actions">
                          <button
                            :disabled="descriptionOverLimit"
                            class="btn btn-primary btn-sm"
                            @click="saveDescription"
                          >
                            Save
                          </button>
                          <button
                            class="btn btn-secondary btn-sm"
                            @click="cancelEditDescription"
                          >
                            Cancel
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        <div
                          v-if="project.description"
                          class="description desc-plain"
                        >
                          <span v-html="project.description"></span>
                          <button
                            v-if="canEditDescription"
                            class="edit-desc-btn"
                            title="Edit description"
                            @click="startEditDescription"
                          >
                            <span class="icon">✏️</span>
                          </button>
                        </div>
                        <div v-else class="no-description">
                          <span class="no-content-icon">📄</span>
                          <p>No description provided for this project.</p>
                          <button
                            v-if="canEditDescription"
                            class="edit-desc-btn"
                            title="Edit description"
                            @click="startEditDescription"
                          >
                            <span class="icon">✏️</span>
                          </button>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

              </transition>
            </div>
          </div>
        </div>
        <!-- Footer -->
        <AppFooter />

        <!-- Enhanced Create Group Modal -->
        <div
          v-if="showCreateGroupModal"
          class="modal-overlay"
          @click.self="showCreateGroupModal = false"
        >
          <div class="modal-content group-modal">
            <div class="modal-header">
              <div class="modal-title">
                <div class="title-icon">👨‍👩‍👧‍👦</div>
                <h3>Create New Group</h3>
              </div>
              <button
                class="close-button"
                @click="showCreateGroupModal = false"
              >
                &times;
              </button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="createGroup" class="group-form">
                <div class="form-group">
                  <label for="groupName" class="form-label">
                    <span class="label-text">Group Name</span>
                    <span class="required">*</span>
                  </label>
                  <input
                    id="groupName"
                    v-model="newGroup.name"
                    type="text"
                    required
                    class="form-control"
                    placeholder="Enter group name"
                  />
                  <div class="form-hint">
                    Choose a descriptive name for this group
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showCreateGroupModal = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                @click="createGroup"
                :disabled="isCreatingGroup"
              >
                <span
                  v-if="isCreatingGroup"
                  class="loading-spinner-small"
                ></span>
                {{ isCreatingGroup ? 'Creating...' : 'Create Group' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Delete Project Modal -->
        <div
          v-if="showDeleteModal"
          class="modal-overlay"
          @click.self="showDeleteModal = false"
        >
          <div class="modal-content">
            <div class="modal-header">
              <h3>Delete Project</h3>
            </div>
            <div class="modal-body">
              <p>
                Are you sure you want to delete this project? This action cannot
                be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-secondary"
                @click="showDeleteModal = false"
              >
                Cancel
              </button>
              <button class="btn btn-danger" @click="confirmDeleteProject">
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Success Modal -->
        <div v-if="showSuccessModal" class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Project Deleted</h3>
            </div>
            <div class="modal-body">
              <p>Project deleted successfully!</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" @click="handleSuccessModalOk">
                OK
              </button>
            </div>
          </div>
        </div>

        <!-- Add User Success Modal -->
        <div v-if="showAddUserSuccessModal" class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>User Added</h3>
            </div>
            <div class="modal-body">
              <p>User added to project!</p>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-primary"
                @click="showAddUserSuccessModal = false"
              >
                OK
              </button>
            </div>
          </div>
        </div>

        <!-- Toast Success -->
        <div v-if="showSavedSnackbar" class="toast-success">
          <span class="toast-icon">✅</span>
          <span>Saved successfully!</span>
        </div>

        <ProjectRoleManagementView
          v-if="showRoleModal"
          :project-id="project?.id"
          @close="showRoleModal = false"
          @roles-updated="handleRolesUpdated"
        />

        <div v-if="showEditUserRoleModal" class="modal-overlay" @click.self="showEditUserRoleModal = false">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Edit Roles for {{ memberToEdit?.fullName || memberToEdit?.username }}</h3>
            </div>
            <div class="modal-body">
              <div v-if="project && project.projectRoles">
                <input v-model="roleSearch" placeholder="Search roles..." class="role-search-box" />
                <div class="role-grid">
                  <label v-for="role in filteredRoles" :key="role.id" class="role-card" :class="{ selected: selectedRoles.includes(role.id) }">
                    <input type="checkbox" :value="role.id" v-model="selectedRoles" />
                    <span class="role-name">{{ role.name }}</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="showEditUserRoleModal = false">Cancel</button>
              <button class="btn btn-primary" @click="saveUserRoles" :disabled="!memberToEdit">Save</button>
            </div>
          </div>
        </div>

        <ProjectRoleManagementView
          v-if="showAddRoleModal"
          :project-id="project?.id"
          :show-create-role-modal="true"
          @close="showAddRoleModal = false"
          @roles-updated="handleRolesUpdated"
        />

        <!-- Thêm modal xác nhận xóa group vào template (nếu chưa có) -->
        <div v-if="showDeleteConfirmModal" class="modal-overlay" @click.self="showDeleteConfirmModal = false">
          <div class="modal-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete the group "<strong>{{ groupToDelete?.name }}</strong>"?</p>
            <div class="form-actions">
              <button class="btn btn-confirm" @click="confirmDeleteGroup">Confirm</button>
              <button class="btn btn-outline" @click="showDeleteConfirmModal = false">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '../api';
import { PermissionFlags, PermissionStrings } from '@here-to-translate/common';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import AppFooter from '../components/AppFooter.vue';
import ProjectDisscusionTab from '../components/ProjectDisscusionTab.vue';
import ProjectRoleManagementView from './ProjectRoleManagementView.vue';
import ProjectMemberTab from '../components/ProjectMemberTab.vue';
import ProjectGroupTab from '../components/ProjectGroupTab.vue';
import ProjectTranslationTab from '../components/ProjectTranslationTab.vue';
import ProjectCommitTab from '../components/ProjectCommitTab.vue';
import ProjectTaskTab from '../components/ProjectTaskTab.vue';
import ProjectFileTab from '../components/ProjectFileTab.vue';
import ProjectRoleTab from '../components/ProjectRoleTab.vue';
import type { Ref } from 'vue';
import { useAuthStore } from '../store/auth';
const authStore = useAuthStore();

const route = useRoute();
const router = useRouter();


// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  tags?: Array<{ id: string; name: string }>;
  projectRoles?: ProjectRole[];
  groups?: ProjectGroup[];
}

interface ProjectRole {
  id: string;
  name: string;
  permissionFlags: string;
}

interface ProjectGroup {
  id: string;
  name: string;
  permissionFlags: string;
  members?: Array<{ id: string; username: string; fullName?: string }>;
}

interface ProjectFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploader: {
    id: string;
    username: string;
    fullName?: string;
  };
}

interface CreateGroupData {
  name: string;
}

const project = ref<Project | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const selectedPermissions = ref<PermissionStrings[]>([]);
const availablePermissions = Object.keys(PermissionFlags).filter(
  (key) =>
    typeof PermissionFlags[key as PermissionStrings] === 'bigint' &&
    key !== 'None'
) as PermissionStrings[];

// Modal states
const showCreateGroupModal = ref(false);
const isCreatingGroup = ref(false);
const showDeleteModal = ref(false);
const showSuccessModal = ref(false);
const showAddUserSuccessModal = ref(false);
const showRoleModal = ref(false);
const showEditUserRoleModal = ref(false);
const memberToEdit = ref<any>(null);
const selectedRoles = ref<string[]>([]);
const showAddRoleModal = ref(false);

// Form data
const newGroup = ref<CreateGroupData>({
  name: '',
});

// User search/add state
const userSearch = ref({
  identifier: '',
  loading: false,
  error: '',
  result: null as null | {
    id: string;
    username: string;
    fullName?: string;
    email: string;
  },
  adding: false,
});

// Members tab state
const members = ref<
  Array<{
    id: string;
    username: string;
    fullName?: string;
    email: string;
    roles: Array<{ id: string; name: string }>;
    selectedRole: string;
  }>
>([]);
const membersLoading = ref(false);
const membersError = ref('');

type TabType = 'details' | 'members' | 'groups' | 'discussions' | 'description' | 'files' | 'translation' | 'commits' | 'task' | 'roles';
const activeTab = ref<TabType>('description');

const isAllSelected = ref(false);

// File-related variables
const projectFiles = ref<ProjectFile[]>([]);
const filesLoading = ref(false);
const filesError = ref<string | null>(null);

// Dropdown states
const activeRoleDropdown = ref<string | null>(null);
const activeGroupDropdown = ref<string | null>(null);

// Watch for changes in selected permissions to update select all state
watch(
  selectedPermissions,
  (newSelection: PermissionStrings[]) => {
    isAllSelected.value = newSelection.length === availablePermissions.length;
  },
  { deep: true }
);

watch(
  () => activeTab.value,
  (newTab) => {
    if (newTab === 'groups') {
      loadGroups();
    }
  },
  { immediate: true }
);

// Watch for changes in available permissions to update select all state
watch(availablePermissions, () => {
  isAllSelected.value =
    selectedPermissions.value.length === availablePermissions.length;
});

// Watch project, tự động gọi loadFiles khi project có dữ liệu
watch(project, (newProject) => {
  if (newProject && newProject.id) {
    console.log('project.value changed, calling loadFiles & loadBranches');
    loadFiles();
    loadBranches();
  }
});

const loadProject = async () => {
  try {
    loading.value = true;
    error.value = null;
    const projectId = route.params.projectId as string;
    const { data } = await axiosInstance.get(`/projects/${projectId}`);
    project.value = data;
    await loadMembers(); // Đảm bảo members luôn có dữ liệu sau khi load project
    console.log('members:', members.value); // Log dữ liệu members để debug
  } catch (err: any) {
    error.value = err.message || 'Failed to load project';
    console.error('Error loading project:', err);
  } finally {
    loading.value = false;
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatPermissions = (permissions: string) => {
  // This is a simplified version - you might want to decode the permission flags
  return permissions;
};

const editProject = () => {
  router.push(`/projects/${project.value?.id}/edit`);
};

const openDeleteModal = () => {
  showDeleteModal.value = true;
};

const confirmDeleteProject = async () => {
  if (!project.value) return;
  try {
    await axiosInstance.delete(`/projects/${project.value.id}`);
    showDeleteModal.value = false;
    showSuccessModal.value = true;
  } catch (err: any) {
    alert('Failed to delete project: ' + err.message);
    showDeleteModal.value = false;
  }
};

const handleSuccessModalOk = () => {
  showSuccessModal.value = false;
  router.push('/projects');
};
const groups = ref<ProjectGroup[]>([]);
const groupsLoading = ref(false);
const groupsError = ref<string | null>(null);
const createGroup = async () => {
  if (!project.value) return;

  isCreatingGroup.value = true;
  try {
    await axiosInstance.post(`/projects/${project.value.id}/groups/create`, newGroup.value);
    await loadProject(); // Reload project to get updated groups
    showCreateGroupModal.value = false;
    newGroup.value = { name: '' };
  } catch (err: any) {
    alert('Failed to create group: ' + err.message);
  } finally {
    isCreatingGroup.value = false;
  }
};

const loadGroups = async () => {
  if (!project.value) return;
  groupsLoading.value = true;
  groupsError.value = null;
  try {
    const res = await axiosInstance.get(`/projects/${project.value.id}/groups`);
    groups.value = res.data;
  } catch (error: any) {
    groupsError.value = error?.response?.data?.message || 'Failed to load groups.';
  } finally {
    groupsLoading.value = false;
  }
};

const editGroup = (group: any) => {
  // Navigate to group edit page or open edit modal
  console.log('Edit group:', group);
};

const deleteGroup = async (groupId: string) => {
  if (
    !project.value ||
    !confirm('Are you sure you want to delete this group?')
  ) {
    return;
  }

  try {
    await axiosInstance.delete(
      `/projects/${project.value.id}/groups/${groupId}`
    );
    await loadProject(); // Reload project to get updated groups
  } catch (err: any) {
    alert('Failed to delete group: ' + err.message);
  }
};

const searchUser = async () => {
  if (!project.value) return;
  userSearch.value.loading = true;
  userSearch.value.error = '';
  userSearch.value.result = null;
  try {
    const { data } = await axiosInstance.post(
      `/projects/${project.value.id}/search-user`,
      { identifier: userSearch.value.identifier }
    );
    if (data.user) {
      userSearch.value.result = data.user;
    } else {
      userSearch.value.error = 'No user found.';
    }
  } catch (err: any) {
    userSearch.value.error = err.message || 'Failed to search user.';
  } finally {
    userSearch.value.loading = false;
  }
};
const addUserToProject = async () => {
  if (!project.value || !userSearch.value.result) return;
  userSearch.value.adding = true;
  try {
    await axiosInstance.post(`/projects/${project.value.id}/add-user`, {
      identifier: userSearch.value.result.email,
    });
    // Sau khi thêm user, gán role Everyone nếu có
    const everyoneRole = project.value.projectRoles?.find((r: any) => r.name === 'Everyone');
    if (everyoneRole) {
      // Gọi API gán role cho user mới
      await axiosInstance.post(`/projects/${project.value.id}/members/${userSearch.value.result.id}/update-roles`, {
        roleIds: [everyoneRole.id]
      });
    }
    await loadProject();
    showAddUserSuccessModal.value = true;
    userSearch.value.result = null;
    userSearch.value.identifier = '';
  } catch (err: any) {
    alert('Failed to add user: ' + err.message);
  } finally {
    userSearch.value.adding = false;
  }
};

const toggleGroupDropdown = (groupId: string) => {
  if (activeGroupDropdown.value === groupId) {
    activeGroupDropdown.value = null;
  } else {
    activeGroupDropdown.value = groupId;
    activeRoleDropdown.value = null; // Close other dropdowns
  }
};

function closeDropdowns() {
  activeRoleDropdown.value = null;
  activeGroupDropdown.value = null;
}

const loadMembers = async () => {
  if (!project.value) return;
  membersLoading.value = true;
  membersError.value = '';
  try {
    const projectId = route.params.projectId as string;
    const { data } = await axiosInstance.get(`/projects/${projectId}/members`);
    // Map lại roles cho từng member để đảm bảo có trường permissions
    const roleMap: Record<string, any> = {};
    if (data.projectRoles) {
      for (const role of data.projectRoles) {
        roleMap[role.id] = role; // role phải có permissions
      }
    }
    const memberMap: Record<string, any> = {};
    if (data.members) {
      for (const m of data.members) {
        // Nếu API trả về roles lồng trong user
        console.log('roleMap:', roleMap);
        let roles = Array.isArray(m.roles)
          ? m.roles.filter((r: any) => r && r.id && r.name).map((r: any) => {
            const permissionFlags = r.permissionFlags ?? roleMap[r.id]?.permissionFlags;
            let perms = r.permissions;
            // Nếu không có permissions, lấy từ roleMap
            if ((!perms || perms.length === 0) && roleMap[r.id]?.permissionFlags) {
              perms = parsePermissionFlags(roleMap[r.id].permissionFlags);
            }
            if (!perms || perms.length === 0) {
              perms = parsePermissionFlags(permissionFlags);
            }
            if (!perms) perms = [];
            return {
              ...r,
              permissions: perms,
              permissionFlags
            };
          })
          : [];
        memberMap[m.id] = { ...m, roles, selectedRole: '' };
      }
    }
    // Nếu API trả về projectRoles có users, map lại roles cho từng user
    if (data.projectRoles) {
      for (const role of data.projectRoles) {
        if (role.users) {
          for (const user of role.users) {
            if (!memberMap[user.id]) {
              memberMap[user.id] = { ...user, roles: [], selectedRole: '' };
            }
            // Nếu đã có role này, merge lại permissions và permissionFlags
            const existingRole = memberMap[user.id].roles.find((r: any) => r.id === role.id);
            if (existingRole) {
              existingRole.permissions = parsePermissionFlags(role.permissionFlags);
              existingRole.permissionFlags = role.permissionFlags;
            } else {
              memberMap[user.id].roles.push({
                id: role.id,
                name: role.name,
                permissions: parsePermissionFlags(role.permissionFlags),
                permissionFlags: role.permissionFlags
              });
            }
          }
        }
      }
    }
    // Log để debug nếu roles bị rỗng
    Object.values(memberMap).forEach((m: any) => {
      if (!m.roles || m.roles.length === 0) {
        console.warn('User has no roles:', m);
      }
    });
    members.value = Object.values(memberMap);
    console.log('members (with permissions):', members.value);
  } catch (err: any) {
    membersError.value = err.message || 'Failed to load members.';
  } finally {
    membersLoading.value = false;
  }
};

watch(activeTab, (tab: string) => {
  if (tab === 'members') loadMembers();
  else if (tab === 'files') loadFiles();
  else if (tab === 'groups') {
    console.log('[DEBUG] groups:', groups.value);
    console.log('[DEBUG] groupsLoading:', groupsLoading.value);
    console.log('[DEBUG] groupsError:', groupsError.value);
    loadGroups();
  }
  // Có thể thêm các tab khác nếu cần
});

const currentUser = ref<any>(null);

const fetchCurrentUser = async () => {
  try {
    currentUser.value = await authStore.getCurrentUser();
  } catch (e) {
    currentUser.value = null;
  }
};

onMounted(async () => {
  await fetchCurrentUser();
  loadProject();
  loadBranches();
});

defineExpose({ closeDropdowns });
loadProject();

// File handling functions
const loadFiles = async () => {
  if (!project.value) {
    console.warn('loadFiles: project.value is null, cannot load files');
    return;
  }
  try {
    filesLoading.value = true;
    filesError.value = null;
    console.log('Call API: /files/project/' + project.value.id);
    // Thêm query string random để tránh cache
    const { data } = await axiosInstance.get(
      `/files/project/${project.value.id}?t=${Date.now()}`
    );
    console.log('API /files/project response:', data);
    // Luôn gán lại mảng mới để Vue nhận ra thay đổi
    projectFiles.value = Array.isArray(data) ? [...data] : [];
    console.log(
      'Files loaded for project',
      project.value.id,
      ':',
      projectFiles.value
    );
  } catch (err: any) {
    filesError.value = err.message || 'Failed to load files';
    console.error('Error loading files:', err);
  } finally {
    filesLoading.value = false;
  }
};

const refreshFiles = () => {
  console.log('Refresh button clicked, calling loadFiles');
  loadFiles();
};

const downloadFile = (file) => {
  const id = file.fileId || file.id;
  window.open(`/api/files/${id}/download`, '_blank');
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Computed properties for discussion permissions
const canCreateDiscussion = computed(() => {
  // TODO: Implement proper permission checking based on user roles
  return true; // For now, allow all authenticated users
});

const canManageDiscussions = computed(() => {
  // TODO: Implement proper permission checking based on user roles
  return true; // For now, allow all authenticated users
});

const editingDescription = ref(false);
const editedDescription = ref('');
const maxDescriptionLength = 500;
const descriptionCharCount = computed(() => editedDescription.value.length);
const descriptionOverLimit = computed(
  () => descriptionCharCount.value > maxDescriptionLength
);
// For demo, allow editing always. Replace with real permission check.
const canEditDescription = computed(() => true);

function startEditDescription() {
  editedDescription.value = project.value?.description || '';
  editingDescription.value = true;
}
function cancelEditDescription() {
  editingDescription.value = false;
}
function updateCharCount() {
  if (editedDescription.value.length > maxDescriptionLength) {
    editedDescription.value = editedDescription.value.slice(
      0,
      maxDescriptionLength
    );
  }
}
async function saveDescription() {
  if (!project.value) return;
  try {
    await axiosInstance.patch(`/projects/${project.value.id}`, {
      description: editedDescription.value,
    });
    project.value.description = editedDescription.value;
    editingDescription.value = false;
    showSavedSnackbar.value = true;
    setTimeout(() => {
      showSavedSnackbar.value = false;
    }, 2500);
  } catch (err: any) {
    alert('Failed to update description: ' + err.message);
  }
}

const fileMenuOpen = ref<string | null>(null);
function toggleFileMenu(fileId: string) {
  fileMenuOpen.value = fileMenuOpen.value === fileId ? null : fileId;
}
function closeFileMenus() {
  fileMenuOpen.value = null;
}
function isImage(file: ProjectFile) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);
}
function isPDF(file: ProjectFile) {
  return /\.pdf$/i.test(file.fileName);
}
function previewFile(file: ProjectFile) {
  // Mở xem trước ảnh hoặc PDF
  window.open(`/api/files/${file.id}/preview`, '_blank');
}

const showActionsMenu = ref(false);
const isMobile = computed(() => window.innerWidth < 768);
function goToManage() {
  router.push(`/projects/${project.value?.id}/manage`);
  showActionsMenu.value = false;
}

const showSavedSnackbar = ref(false);

const inputFocused = ref(false);

function getRoleDescription(roleName: string) {
  if (roleName === 'Admin')
    return 'Full permissions: manage project, members, settings.';
  if (roleName === 'Editor') return 'Can edit content, but not manage members.';
  if (roleName === 'Viewer') return 'Read-only access.';
  return 'Project role';
}
function editRoles(member: any) {
  memberToEdit.value = member;
  selectedRoles.value = (member.roles || []).filter((r: any) => r && r.id && r.name).map((r: any) => r.id);
  showEditUserRoleModal.value = true;
}
function sortBy(field: string) {
  // TODO: Implement sorting logic
}

function scrollToFiles() {
  const el = document.querySelector('.files-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const userSuggestList = ref<any[]>([]);
const userSuggestActiveIdx = ref(-1);

async function handleUserSuggest() {
  userSuggestActiveIdx.value = -1;
  userSuggestList.value = [];
  if (!userSearch.value.identifier || userSearch.value.identifier.length < 2)
    return;
  try {
    const { data } = await axiosInstance.post(`/users/suggest`, {
      q: userSearch.value.identifier,
    });
    userSuggestList.value = data.users || [];
  } catch (e) {
    userSuggestList.value = [];
  }
}
function moveSuggest(dir: number) {
  if (!userSuggestList.value.length) return;
  let idx = userSuggestActiveIdx.value + dir;
  if (idx < 0) idx = userSuggestList.value.length - 1;
  if (idx >= userSuggestList.value.length) idx = 0;
  userSuggestActiveIdx.value = idx;
}
function selectUserSuggest(idx?: number) {
  if (typeof idx !== 'number') idx = userSuggestActiveIdx.value;
  if (idx < 0 || idx >= userSuggestList.value.length) return;
  const user = userSuggestList.value[idx];
  userSearch.value.identifier = user.email;
  userSuggestList.value = [];
  userSuggestActiveIdx.value = -1;
  nextTick(() => {
    // Tự động submit form khi chọn suggest
    searchUser();
  });
}

function handleRolesUpdated() {
  loadProject(); // Cập nhật lại project để số role mới được cập nhật lên card
  loadMembers();
}

async function saveUserRoles() {
  if (!project.value || !memberToEdit.value) return;
  // Lấy danh sách role hiện tại của user từ backend (chắc chắn)
  const oldRoleIds: string[] = (memberToEdit.value.roles || []).filter((r: any) => r && r.id).map((r: any) => r.id);
  const newRoleIds: string[] = selectedRoles.value;
  // Chỉ add nếu user chưa có role đó
  const rolesToAdd = newRoleIds.filter((id) => !oldRoleIds.includes(id));
  // Chỉ remove nếu user thực sự có role đó
  const rolesToRemove = oldRoleIds.filter((id) => !newRoleIds.includes(id));
  console.log('oldRoleIds:', oldRoleIds);
  console.log('newRoleIds:', newRoleIds);
  console.log('rolesToAdd:', rolesToAdd);
  console.log('rolesToRemove:', rolesToRemove);
  try {
    for (const roleId of rolesToAdd) {
      await axiosInstance.post(`/projects/${project.value.id}/roles/${roleId}/users/add`, {
        userIds: [memberToEdit.value.id],
      });
    }
    for (const roleId of rolesToRemove) {
      await axiosInstance.post(`/projects/${project.value.id}/roles/${roleId}/users/remove`, {
        userIds: [memberToEdit.value.id],
      });
    }
    showEditUserRoleModal.value = false;
    await loadMembers();
    showSavedSnackbar.value = true;
    setTimeout(() => (showSavedSnackbar.value = false), 2000);
  } catch (err: any) {
    alert('Failed to update roles: ' + (err?.message || err));
  }
}

const roleSearch = ref('');
const filteredRoles = computed(() => {
  if (!project.value?.projectRoles) return [];
  // Log để debug dữ liệu roles
  console.log('projectRoles:', project.value.projectRoles);
  // Lọc role hợp lệ (có id và name)
  const validRoles = project.value.projectRoles.filter((r: any) => r && r.id && r.name);
  if (!roleSearch.value) return validRoles;
  return validRoles.filter((r: any) => r.name.toLowerCase().includes(roleSearch.value.toLowerCase()));
});

// Thêm log để debug filteredRoles và selectedRoles khi mở modal edit roles
watch(filteredRoles, (val: any[]) => {
  console.log('filteredRoles:', val);
});
watch(selectedRoles, (val: string[]) => {
  console.log('selectedRoles:', val);
});

function displayRoles(member: any, project: Project) {
  if (!member.roles) return [];
  return member.roles.filter(
    (role: any) =>
      role &&
      role.name &&
      !(member.id === project.createdBy.id && role.name === 'Project Owner')
  );
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
const showFullRoles = ref<string | null>(null);
function getRoleCount(roles: any[]): number {
  return roles ? roles.length : 0;
}

const branches = ref<any[]>([]);
const selectedBranchId = ref<string | number | null>(null);

async function loadBranches() {
  if (!project.value?.id) return;
  try {
    // Gọi đúng API backend lấy branch cho project
    const res = await axiosInstance.get(`/projects/${project.value.id}/branches`);
    console.log('API /branches response:', res.data);
    branches.value = Array.isArray(res.data) ? res.data : (res.data.branches || []);
    selectedBranchId.value = branches.value.length > 0 ? String(branches.value[0].id) : null;
    console.log('Branches:', branches.value, 'Selected:', selectedBranchId.value, typeof selectedBranchId.value, 'Count:', branches.value.length);
    if (branches.value.length === 0) {
      // Hiển thị log chi tiết nếu không có branch
      window.alert('Branches array is empty! Response: ' + JSON.stringify(res.data));
    }
  } catch (e) {
    branches.value = [];
    selectedBranchId.value = null;
    console.error('Error loading branches:', e);
  }
}

onMounted(() => {
  loadProject();
  loadBranches();
});

// Add computed property for actual role count
// Computed property for actual role count
const actualRoleCount = computed(() => {
  // Get all project roles
  const roles = project.value?.projectRoles || [];

  // Count only actual roles (excluding system roles like Everyone)
  // But include Project Owner role since it's shown in the table
  const visibleRoles = roles.filter((role: any) => {
    // Filter out system roles except Project Owner
    return role.name !== 'Everyone';
  });

  // Log for debugging
  console.log('All roles:', roles);
  console.log('Visible roles:', visibleRoles);

  return visibleRoles.length;
});

// Helper: Parse permissionFlags thành mảng quyền string
function parsePermissionFlags(bitmask: string | number | bigint | undefined | any): string[] {
  // Xử lý proxy hoặc BigInt object
  let flags: bigint = BigInt(0);
  if (bitmask === undefined || bitmask === null) return [];
  if (typeof bitmask === 'object' && ('_value' in bitmask)) {
    flags = BigInt(bitmask._value);
  } else if (typeof bitmask === 'object' && ('value' in bitmask)) {
    flags = BigInt(bitmask.value);
  } else {
    flags = BigInt(bitmask);
  }
  // Danh sách key quyền đúng thứ tự (không phải label)
  const availablePermissions = [
    'ProjectAdmin', 'ManageRoles', 'ManageMembers', 'ManageBranches', 'ManageGroups',
    'ManageProjectMetadata', 'ManageWorkspaces', 'ManageDiscussions', 'ViewAudit',
    'ReviewCommit', 'PushCommit', 'ReviewRequests', 'ViewRequest', 'ManageWorkspaceMetadata',
    'ViewWorkspace', 'ViewProject', 'ManageComments', 'PostComment', 'Vote', 'AttachFiles', 'ViewThread'
  ];
  // Trả về đúng key (không phải label, không có dấu cách)
  return availablePermissions.filter((_, idx) => ((flags >> BigInt(idx)) & BigInt(1)) !== BigInt(0));
}

// Thêm computed kiểm tra Project Owner
const isProjectOwner = computed(() => {
  return project.value && currentUser.value && String(project.value.createdBy.id) === String(currentUser.value.id);
});

// Thêm computed kiểm tra Project Admin
const isProjectAdmin = computed(() => {
  if (!project.value || !currentUser.value) return false;
  // Kiểm tra roles của currentUser trong project
  const member = members.value.find((m: any) => String(m.id) === String(currentUser.value.id));
  if (!member || !member.roles) return false;
  return member.roles.some((r: any) => r.name && r.name.toLowerCase().includes('admin'));
});

// Thêm các handler ở script:
const handleCreateGroup = async (group) => {
  if (!project.value) return;
  await axiosInstance.post(`/projects/${project.value.id}/groups/create`, group);
  await loadGroups();
};
const handleEditGroup = async (group) => {
  if (!project.value || !group.id) return;
  await axiosInstance.patch(`/projects/${project.value.id}/groups/${group.id}`, { name: group.name });
  await loadGroups();
};
const handleDeleteGroup = async (group) => {
  if (!project.value || !group.id) return;
  await axiosInstance.delete(`/projects/${project.value.id}/groups/${group.id}`);
  await loadGroups();
};

// Thêm hàm confirmDeleteGroup vào script
const confirmDeleteGroup = async () => {
  if (!project.value || !groupToDelete.value?.id) return;
  try {
    await axiosInstance.delete(`/projects/${project.value.id}/groups/${groupToDelete.value.id}`);
    showDeleteConfirmModal.value = false;
    await loadGroups();
    toast.add({ severity: 'success', summary: 'Success', detail: 'Group deleted successfully!', life: 2000 });
  } catch (err) {
    alert('Failed to delete group: ' + err.message);
  }
};





const groupToDelete = ref<ProjectGroup | null>(null);
const showDeleteConfirmModal = ref(false);

const toast = ref(null);
</script>

<style scoped>
:root {
  --color-secondary: #38b2ac;
}
/* Page Layout */
.project-detail-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-size: 15px;
}

.main-container {
  display: flex;
  flex: 1;
  min-height: 0;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2rem 2rem 17rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  margin-right: 0;
}

/* Page Header */
.page-header {
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  overflow: hidden;
}

.page-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.page-title-section {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

.page-actions {
  display: flex;
  gap: 1rem;
}

.btn-back {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.project-detail-view {
  max-width: 1700px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(76, 34, 128, 0.18),
  0 2px 8px rgba(49, 130, 206, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
  position: relative;
}
.project-detail-view::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(120deg, #f3f0ff 0%, #e6f0fa 100%);
  opacity: 0.7;
  z-index: 0;
  pointer-events: none;
  border-radius: 20px;
}
.project-detail-view > * {
  position: relative;
  z-index: 1;
}
.project-content {
  background: white;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(49, 130, 206, 0.13),
  0 2px 8px rgba(76, 34, 128, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
  position: relative;
}

/* Nút chính */
.btn-manage {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); /* Xanh lá nổi bật hơn */
  border: 2.5px solid #22c55e;
  color: white;
  box-shadow: 0 4px 16px #22c55e33;
  font-weight: 700;
  transition: all 0.22s cubic-bezier(0.4, 1, 0.7, 1.2);
}
.btn-manage:hover {
  background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
  border-color: #16a34a;
  color: #fff;
  box-shadow: 0 8px 32px #22c55e33;
  transform: translateY(-2px) scale(1.04);
  filter: brightness(1.08);
}
.btn-outline {
  background: #fff;
  color: #2563eb;
  border: 2.5px solid #2563eb;
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
.btn-danger {
  background: linear-gradient(135deg, #e53e3e 0%, #b91c1c 100%);
  color: #fff;
  border: 2.5px solid #b91c1c;
  font-weight: 700;
  box-shadow: 0 4px 16px #e53e3e33;
  transition: all 0.18s;
}
.btn-danger:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%);
  color: #fff;
  border-color: #7f1d1d;
  box-shadow: 0 8px 32px #e53e3e44;
  transform: scale(1.04);
}

/* Badge Public/Private */
.badge-public {
  background: linear-gradient(135deg, #38a169 0%, #22543d 100%);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px #38a16933;
  border: 1.5px solid #22543d;
}
.badge-private {
  background: linear-gradient(135deg, #e53e3e 0%, #7f1d1d 100%);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px #e53e3e33;
  border: 1.5px solid #7f1d1d;
}
.badge-icon {
  filter: drop-shadow(0 2px 4px #0002);
}

/* Header icon contrast */
.page-icon,
.title-icon,
.meta-icon,
.icon {
  color: #4f2c8c !important;
  filter: drop-shadow(0 2px 4px #7f53ac22);
}

/* Loading and Error States */
.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  text-align: center;
}

.loading-content,
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
}

.loading-content h3 {
  color: #2d3748;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.loading-content p {
  color: #718096;
  margin: 0;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-content h3 {
  color: #e53e3e;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.error-content p {
  color: #718096;
  margin: 0;
}

.btn-retry {
  margin-top: 1rem;
}

/* Project Content */
.project-content {
  background: white;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(49, 130, 206, 0.13),
  0 2px 8px rgba(76, 34, 128, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
  position: relative;
}

/* Enhanced Project Header */
.project-header {
  position: relative;
  background: linear-gradient(135deg, #4f2c8c 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem 1.5rem 2rem;
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  border-radius: 0 0 32px 32px;
  box-shadow: 0 10px 40px rgba(76, 34, 128, 0.18);
  overflow: visible;
}

.glassy-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border-radius: 0 0 32px 32px;
  z-index: 0;
}

.project-header > * {
  position: relative;
  z-index: 1;
}

.project-header-left {
  display: flex;
  align-items: center;
  margin-right: 1.5rem;
}

.creator-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  border: 3px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 48px;
  height: 48px;
  display: block;
}

.creator-info-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-left: 1.2rem;
}

.project-title-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.project-title {
  margin: 0;
  color: white;
  font-size: 1.8rem;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.project-badges {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.75rem;
}

.project-meta-row {
  display: flex;
  gap: 2.5rem;
  margin-top: 0.5rem;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  opacity: 0.85;
}

.meta-icon {
  font-size: 1.2rem;
  opacity: 0.8;
}

.meta-text {
  font-size: 1rem;
  opacity: 0.9;
}

.meta-text strong {
  color: #fff;
  font-weight: 700;
}

@media (max-width: 768px) {
  .project-header {
    flex-direction: column;
    align-items: stretch;
    padding: 2rem 1rem 1.5rem 1rem;
    gap: 1.5rem;
  }
  .project-header-left {
    justify-content: center;
    margin-right: 0;
    margin-bottom: 1rem;
  }
  .project-header-main {
    align-items: center;
    text-align: center;
  }
  .project-title-section {
    align-items: center;
  }
  .project-meta-row {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
}

.project-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 200px;
}

.btn-manage {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); /* Xanh lá nổi bật hơn */
  border: 2.5px solid #22c55e;
  color: white;
  box-shadow: 0 4px 16px #22c55e33;
  font-weight: 700;
  transition: all 0.22s cubic-bezier(0.4, 1, 0.7, 1.2);
}

.btn-manage:hover {
  background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
  border-color: #16a34a;
  color: #fff;
  box-shadow: 0 8px 32px #22c55e33;
  transform: translateY(-2px) scale(1.04);
  filter: brightness(1.08);
}

/* Project Sections */
.project-section {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.project-section:last-child {
  border-bottom: none;
}

.description-section {
  background: #f8fafc;
}

.tags-section {
  background: white;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 600;
}

.title-icon {
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.description-content {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.description {
  color: #4a5568;
  line-height: 1.7;
  font-size: 1.1rem;
  margin: 0;
}

.no-description {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #a0aec0;
  font-style: italic;
}

.no-content-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tag {
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, var(--color-secondary) 0%, #7f53ac 100%);
  color: white;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Project Files */
.files-section {
  background: #f8fafc;
}

.files-content {
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.files-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
}

.files-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.file-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.file-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.file-details {
  flex: 1;
}

.file-name {
  margin: 0 0 0.25rem 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.file-meta {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

.file-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-outline {
  background: transparent;
  color: #4299e1;
  border: 2px solid #4299e1;
}

.btn-outline:hover {
  background: #4299e1;
  color: white;
  transform: translateY(-2px);
}

.no-files {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

/* Enhanced Project Statistics */
.project-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.stat-card {
  background: white;
  padding: 0.75rem;
  border-radius: 1rem;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 1, 0.7, 1.2);
  position: relative;
  overflow: hidden;
  cursor: default;
}
.stat-card-clickable {
  cursor: pointer;
}
.stat-card-clickable:hover {
  transform: scale(1.045) translateY(-6px);
  box-shadow: 0 18px 40px rgba(49, 130, 206, 0.18),
  0 2px 8px rgba(76, 34, 128, 0.1);
  z-index: 2;
}
.stat-icon {
  font-size: 1.8rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-icon-circle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3f6fa 0%, #e6f0fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem auto;
  box-shadow: 0 2px 8px #3182ce11;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: #4299e1;
  margin-bottom: 0.25rem;
  text-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
}

.stat-label {
  color: #718096;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

/* Management Sections */
.management-sections {
  display: grid;
  gap: 2rem;
  padding: 2rem;
  background: #f8fafc;
}

.management-section {
  background: white;
  padding: 1rem;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.management-section:hover {
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
}

.user-section {
  border-left: 4px solid #4299e1;
}

.roles-section {
  border-left: 4px solid #48bb78;
}

.groups-section {
  border-left: 4px solid #ed8936;
}

.section-content {
  width: 100%;
}

/* Enhanced Forms */
.add-user-form {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.form-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
}

.form-group {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.label-icon {
  font-size: 1.25rem;
}

.form-control {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background-color: white;
  color: #2d3748;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66, 153, 225, 0.1);
  transform: translateY(-1px);
}

.form-control:disabled {
  background-color: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}

.form-hint {
  color: #718096;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.form-actions {
  margin-top: 0;
}

/* Error Messages */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #feb2b2;
  margin-top: 1rem;
}

.error-icon {
  font-size: 1.25rem;
}

/* Found User */
.found-user {
  background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
  border: 2px solid #9ae6b4;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.user-avatar {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.avatar-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.user-details {
  flex: 1;
}

.user-details h4 {
  margin: 0 0 0.25rem 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.user-details p {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

/* Enhanced Lists */
.roles-list,
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-item,
.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
  overflow: visible;
}

.role-item:hover,
.group-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.role-info,
.group-info {
  flex: 1;
}

.role-header,
.group-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.role-name,
.group-name {
  margin: 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.role-badge,
.group-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge {
  background: #bee3f8;
  color: #2b6cb0;
}

.group-badge {
  background: #fef5e7;
  color: #c05621;
}

.permissions {
  color: #718096;
  font-size: 0.9rem;
  margin: 0;
}

.members-info {
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

.role-actions,
.group-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.role-actions .dropdown,
.group-actions .dropdown {
  margin-left: auto;
}

/* Dropdown Styles */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  color: #4a5568;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  justify-content: center;
}

.dropdown-toggle:hover {
  border-color: #4299e1;
  background: #f7fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.15);
}

.dropdown-arrow {
  font-size: 0.75rem;
  transition: transform 0.3s ease;
}

.dropdown-toggle:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: auto;
  left: 0;
  min-width: 140px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  margin-top: 0.5rem;
  overflow: visible;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-menu::before {
  content: '';
  position: absolute;
  top: -6px;
  right: auto;
  left: 20px;
  width: 12px;
  height: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-right: none;
  transform: rotate(45deg);
  z-index: -1;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #4a5568;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.dropdown-item:first-child {
  border-radius: 8px 8px 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 8px 8px;
}

.dropdown-item-danger {
  color: #e53e3e;
}

.dropdown-item-danger:hover {
  background: #fed7d7;
  color: #c53030;
}

.dropdown-item .icon {
  font-size: 1rem;
  width: 16px;
  text-align: center;
}

/* Empty States */
.empty-section {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-section h3 {
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-section p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: 1.6;
}

/* Enhanced Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary,
.btn-primary:active,
.btn-primary:focus {
  background: linear-gradient(135deg, #38a169 0%, #48bb78 100%) !important;
  color: #fff !important;
  border: none;
  box-shadow: 0 4px 16px #38a16933;
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%) !important;
  color: #fff !important;
  filter: brightness(1.08);
  box-shadow: 0 8px 20px #38a16944;
}
.btn-primary:disabled,
.btn[disabled].btn-primary {
  background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%) !important;
  color: #a0aec0 !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
  border: none !important;
  box-shadow: none !important;
}

.btn-secondary {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
  color: #4a5568;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #4299e1;
  border: 2px solid #4299e1;
}

.btn-outline:hover {
  background: #4299e1;
  color: #fff;
  border-color: #1e40af;
  box-shadow: 0 6px 24px #2563eb33;
}

.btn-danger {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  color: white;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #c53030 0%, #9b2c2c 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(229, 62, 62, 0.3);
}

.btn-sm {
  padding: 0.625rem 1.25rem;
  font-size: 0.95rem;
}

.btn-add {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.btn-add:hover {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(72, 187, 120, 0.3);
}

.icon {
  font-size: 1.1rem;
}

/* Enhanced Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
  padding: 1rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.group-modal {
  max-width: 700px;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-title .title-icon {
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.modal-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 1.2rem;
  font-weight: 700;
}

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

.close-button:hover {
  background: #f7fafc;
  color: #2d3748;
  transform: rotate(90deg);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

/* Enhanced Form Styles */
.group-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.label-text {
  color: #2d3748;
}

.required {
  color: #e53e3e;
  font-weight: 700;
}

.form-control {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66, 153, 225, 0.1);
  transform: translateY(-1px);
}

.form-control:disabled {
  background-color: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}

.form-hint {
  color: #718096;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.form-actions {
  margin-top: 0;
}

/* Error Messages */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #feb2b2;
  margin-top: 1rem;
}

.error-icon {
  font-size: 1.25rem;
}

/* Found User */
.found-user {
  background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
  border: 2px solid #9ae6b4;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.user-avatar {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.avatar-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.user-details {
  flex: 1;
}

.user-details h4 {
  margin: 0 0 0.25rem 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.user-details p {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

/* Enhanced Lists */
.roles-list,
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-item,
.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
  overflow: visible;
}

.role-item:hover,
.group-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.role-info,
.group-info {
  flex: 1;
}

.role-header,
.group-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.role-name,
.group-name {
  margin: 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.role-badge,
.group-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge {
  background: #bee3f8;
  color: #2b6cb0;
}

.group-badge {
  background: #fef5e7;
  color: #c05621;
}

.permissions {
  color: #718096;
  font-size: 0.9rem;
  margin: 0;
}

.members-info {
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

.role-actions,
.group-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.role-actions .dropdown,
.group-actions .dropdown {
  margin-left: auto;
}

/* Dropdown Styles */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  color: #4a5568;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  justify-content: center;
}

.dropdown-toggle:hover {
  border-color: #4299e1;
  background: #f7fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.15);
}

.dropdown-arrow {
  font-size: 0.75rem;
  transition: transform 0.3s ease;
}

.dropdown-toggle:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: auto;
  left: 0;
  min-width: 140px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  margin-top: 0.5rem;
  overflow: visible;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-menu::before {
  content: '';
  position: absolute;
  top: -6px;
  right: auto;
  left: 20px;
  width: 12px;
  height: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-right: none;
  transform: rotate(45deg);
  z-index: -1;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #4a5568;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.dropdown-item:first-child {
  border-radius: 8px 8px 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 8px 8px;
}

.dropdown-item-danger {
  color: #e53e3e;
}

.dropdown-item-danger:hover {
  background: #fed7d7;
  color: #c53030;
}

.dropdown-item .icon {
  font-size: 1rem;
  width: 16px;
  text-align: center;
}

/* Empty States */
.empty-section {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-section h3 {
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-section p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: 1.6;
}

/* Enhanced Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary,
.btn-primary:active,
.btn-primary:focus {
  background: linear-gradient(135deg, #38a169 0%, #48bb78 100%) !important;
  color: #fff !important;
  border: none;
  box-shadow: 0 4px 16px #38a16933;
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%) !important;
  color: #fff !important;
  filter: brightness(1.08);
  box-shadow: 0 8px 20px #38a16944;
}
.btn-primary:disabled,
.btn[disabled].btn-primary {
  background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%) !important;
  color: #a0aec0 !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
  border: none !important;
  box-shadow: none !important;
}

.btn-secondary {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
  color: #4a5568;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #4299e1;
  border: 2px solid #4299e1;
}

.btn-outline:hover {
  background: #4299e1;
  color: #fff;
  border-color: #1e40af;
  box-shadow: 0 6px 24px #2563eb33;
}

.btn-danger {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  color: white;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #c53030 0%, #9b2c2c 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(229, 62, 62, 0.3);
}

.btn-sm {
  padding: 0.625rem 1.25rem;
  font-size: 0.95rem;
}

.btn-add {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.btn-add:hover {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(72, 187, 120, 0.3);
}

.icon {
  font-size: 1.1rem;
}

/* Enhanced Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
  padding: 1rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.group-modal {
  max-width: 700px;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-title .title-icon {
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.modal-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 1.2rem;
  font-weight: 700;
}

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

.close-button:hover {
  background: #f7fafc;
  color: #2d3748;
  transform: rotate(90deg);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

/* Enhanced Form Styles */
.group-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.label-text {
  color: #2d3748;
}

.required {
  color: #e53e3e;
  font-weight: 700;
}

.form-control {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66, 153, 225, 0.1);
  transform: translateY(-1px);
}

.form-control:disabled {
  background-color: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}

.form-hint {
  color: #718096;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.form-actions {
  margin-top: 0;
}

/* Error Messages */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #feb2b2;
  margin-top: 1rem;
}

.error-icon {
  font-size: 1.25rem;
}

/* Found User */
.found-user {
  background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
  border: 2px solid #9ae6b4;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.user-avatar {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.avatar-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.user-details {
  flex: 1;
}

.user-details h4 {
  margin: 0 0 0.25rem 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.user-details p {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

/* Enhanced Lists */
.roles-list,
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-item,
.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
  overflow: visible;
}

.role-item:hover,
.group-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.role-info,
.group-info {
  flex: 1;
}

.role-header,
.group-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.role-name,
.group-name {
  margin: 0;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.role-badge,
.group-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge {
  background: #bee3f8;
  color: #2b6cb0;
}

.group-badge {
  background: #fef5e7;
  color: #c05621;
}

.permissions {
  color: #718096;
  font-size: 0.9rem;
  margin: 0;
}

.members-info {
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

.role-actions,
.group-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.role-actions .dropdown,
.group-actions .dropdown {
  margin-left: auto;
}

/* Dropdown Styles */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  color: #4a5568;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  justify-content: center;
}

.dropdown-toggle:hover {
  border-color: #4299e1;
  background: #f7fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.15);
}

.dropdown-arrow {
  font-size: 0.75rem;
  transition: transform 0.3s ease;
}

.dropdown-toggle:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: auto;
  left: 0;
  min-width: 140px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  margin-top: 0.5rem;
  overflow: visible;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-menu::before {
  content: '';
  position: absolute;
  top: -6px;
  right: auto;
  left: 20px;
  width: 12px;
  height: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-right: none;
  transform: rotate(45deg);
  z-index: -1;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #4a5568;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.dropdown-item:first-child {
  border-radius: 8px 8px 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 8px 8px;
}

.dropdown-item-danger {
  color: #e53e3e;
}

.dropdown-item-danger:hover {
  background: #fed7d7;
  color: #c53030;
}

.dropdown-item .icon {
  font-size: 1rem;
  width: 16px;
  text-align: center;
}

/* Empty States */
.empty-section {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-section h3 {
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-section p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: 1.6;
}

/* Enhanced Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary,
.btn-primary:active,
.btn-primary:focus {
  background: linear-gradient(135deg, #38a169 0%, #48bb78 100%) !important;
  color: #fff !important;
  border: none;
  box-shadow: 0 4px 16px #38a16933;
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%) !important;
  color: #fff !important;
  filter: brightness(1.08);
  box-shadow: 0 8px 20px #38a16944;
}
.btn-primary:disabled,
.btn[disabled].btn-primary {
  background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%) !important;
  color: #a0aec0 !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
  border: none !important;
  box-shadow: none !important;
}

.btn-secondary {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
  color: #4a5568;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #4299e1;
  border: 2px solid #4299e1;
}

.btn-outline:hover {
  background: #4299e1;
  color: #fff;
  border-color: #1e40af;
  box-shadow: 0 6px 24px #2563eb33;
}

.btn-danger {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  color: white;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #c53030 0%, #9b2c2c 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(229, 62, 62, 0.3);
}

.btn-sm {
  padding: 0.625rem 1.25rem;
  font-size: 0.95rem;
}

.btn-add {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.btn-add:hover {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(72, 187, 120, 0.3);
}

.icon {
  font-size: 1.1rem;
}

/* Enhanced Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
  padding: 1rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.group-modal {
  max-width: 700px;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-title .title-icon {
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.modal-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 1.2rem;
  font-weight: 700;
}

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

.close-button:hover {
  background: #f7fafc;
  color: #2d3748;
  transform: rotate(90deg);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

/* Enhanced Form Styles */
.group-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.label-text {
  color: #2d3748;
}

.required {
  color: #e53e3e;
  font-weight: 700;
}

.form-control {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66, 153, 225, 0.1);
  transform: translateY(-1px);
}

.form-control:disabled {
  background-color: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}

.form-hint {
  color: #718096;
  font-size: 0.9rem;
  margin-top: 0.75rem;
  line-height: 1.5;
}

/* Enhanced Permissions Container */
.permissions-container {
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.permissions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-bottom: 1px solid #e2e8f0;
  gap: 1rem;
}

.select-all-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-all-btn:hover {
  background: linear-gradient(135deg, #3182ce 0%, #2c5aa0 100%);
  transform: translateY(-1px);
}

.permissions-search {
  flex: 1;
  max-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.permissions-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 1rem;
}

.permission-item {
  margin-bottom: 0.75rem;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.permission-item:hover {
  background: #f7fafc;
}

.permission-item.selected {
  background: linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%);
  border: 1px solid #90cdf4;
}

.permission-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  position: relative;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.permission-checkbox:hover {
  background: rgba(66, 153, 225, 0.05);
}

.permission-checkbox input[type='checkbox'] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  height: 20px;
  width: 20px;
  background: white;
  border: 2px solid #cbd5e0;
  border-radius: 6px;
  position: relative;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.3s ease;
}

.permission-checkbox:hover .checkmark {
  border-color: #4299e1;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.1);
}

.permission-checkbox input:checked ~ .checkmark {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  border-color: #4299e1;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
}

.checkmark:after {
  content: '';
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.permission-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.permission-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.permission-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 1rem;
}

.permission-description {
  color: #718096;
  font-size: 0.875rem;
  line-height: 1.5;
}

.no-permissions {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

.no-permissions-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-permissions p {
  margin: 0;
  font-size: 1rem;
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

/* Responsive Design */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 1rem;
  }

  .page-header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .page-title {
    font-size: 1.5rem;
    justify-content: center;
  }

  .page-icon {
    font-size: 2rem;
    width: 3rem;
    height: 3rem;
  }

  .page-subtitle {
    text-align: center;
    font-size: 1rem;
  }

  .page-actions {
    justify-content: center;
  }

  .project-header {
    flex-direction: column;
    align-items: stretch;
    padding: 2rem 1.5rem;
  }

  .project-title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .project-title {
    font-size: 2rem;
  }

  .project-actions {
    flex-direction: column;
    min-width: auto;
  }

  .project-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 1.5rem;
  }

  .stat-card {
    padding: 1.5rem;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .role-item,
  .group-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .role-actions,
  .group-actions {
    justify-content: center;
  }

  /* Modal responsive styles */
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
    margin: 0;
  }

  .group-modal {
    width: 95%;
    max-width: none;
    max-height: 95vh;
  }

  .modal-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1.5rem;
  }

  .modal-title {
    justify-content: center;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    padding: 1.5rem;
  }

  .permissions-header {
    flex-direction: column;
    gap: 1rem;
  }

  .permissions-search {
    max-width: none;
  }

  .permissions-list {
    max-height: 250px;
  }

  .permission-checkbox {
    padding: 0.75rem;
  }

  .modal-footer {
    flex-direction: column-reverse;
    gap: 1rem;
  }

  .modal-footer .btn {
    width: 100%;
    justify-content: center;
  }

  .found-user {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .user-info {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .project-stats {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 1.25rem;
  }

  .stat-number {
    font-size: 2rem;
  }

  .stat-icon {
    font-size: 2rem;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    padding: 1rem;
  }

  .permissions-list {
    max-height: 200px;
  }
}

.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  position: relative;
  background: #f8fafc;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 2px 8px #3182ce11;
  padding: 0.5rem 1rem 0 1rem;
}
.tab {
  position: relative;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px 12px 0 0;
  font-size: 1rem;
  font-weight: 500;
  background: #e2e8f0;
  color: #4a5568;
  cursor: pointer;
  transition: background 0.22s, color 0.22s, box-shadow 0.22s;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  overflow: visible;
  z-index: 1;
}
.tab.active {
  background: #fff;
  color: #3182ce;
  font-weight: 700;
  z-index: 2;
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 0;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #4299e1 0%, #7f53ac 100%);
  box-shadow: 0 2px 8px #3182ce33;
  transition: all 0.3s;
  animation: tabUnderlineIn 0.3s;
}
@keyframes tabUnderlineIn {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 64%;
    opacity: 1;
  }
}
.tab:hover:not(.active) {
  background: #dbeafe;
  color: #2563eb;
  box-shadow: 0 4px 16px #3182ce22;
  z-index: 2;
}
.members-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.members-table th,
.members-table td {
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  text-align: left;
}
.role-badge {
  display: inline-block;
  background: #edf2f7;
  color: #4299e1;
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
  margin-right: 0.25rem;
  font-size: 0.9em;
}

/* Members Section Styles */
.members-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.members-content {
  margin-top: 1.5rem;
}

.members-loading,
.members-error {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: #718096;
}

.members-list {
  background: #f7fafc;
  border-radius: 8px;
  overflow: hidden;
}

.members-table {
  width: 100%;
  border-collapse: collapse;
}

.members-table th {
  background: #edf2f7;
  color: #2d3748;
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
}

.members-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: white;
}

.members-table tr:hover td {
  background: #f7fafc;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.member-name {
  font-weight: 600;
  color: #2d3748;
}

.member-email {
  font-size: 0.875rem;
  color: #718096;
}

.member-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-members {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

.empty-members .empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-members h3 {
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-members p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
}

.improved-desc-box {
  background: #f9fafb;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem 1.5rem 1.5rem 1.5rem;
  position: relative;
  min-height: 80px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.edit-desc-btn {
  background: none;
  border: none;
  color: #3182ce;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s;
  opacity: 0.5;
  pointer-events: none;
}
.edit-desc-btn:hover {
  background: #edf2f7;
  color: #2b6cb0;
  opacity: 1;
}
.description-content.improved-desc-box .edit-desc-btn {
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s;
}
.description-content.improved-desc-box:hover .edit-desc-btn {
  opacity: 1;
  pointer-events: auto;
}
.desc-textarea {
  width: 100%;
  min-height: 80px;
  max-height: 300px;
  border: 1.5px solid #cbd5e0;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1rem;
  font-family: inherit;
  background: #fff;
  color: #2d3748;
  margin-bottom: 0.5rem;
  resize: vertical;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: border 0.18s;
}
.desc-textarea:focus {
  border-color: #3182ce;
}
.desc-char-count {
  font-size: 0.95rem;
  color: #718096;
  margin-top: 0.2rem;
  text-align: right;
}
.desc-char-count.over-limit {
  color: #e53e3e;
  font-weight: 600;
}
.desc-edit-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.file-hoverable {
  transition: box-shadow 0.22s, border 0.22s, background 0.22s;
  cursor: pointer;
  position: relative;
  background: #f8fafc;
}
.file-hoverable:hover {
  box-shadow: 0 8px 32px rgba(49, 130, 206, 0.18);
  border: 2.5px solid #3182ce;
  background: #e6f0fa;
  z-index: 2;
}
.file-hoverable:active {
  background: #dbeafe;
  border-color: #2563eb;
}
.file-download-icon {
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  pointer-events: none;
  transition: opacity 0.18s;
}
.file-hoverable:hover .file-download-icon {
  opacity: 1;
  filter: drop-shadow(0 2px 6px #3182ce33);
}
.file-thumb {
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 10px;
  background: #f3f6fa;
}
.file-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.pdf-icon {
  font-weight: bold;
  color: #e53e3e;
  background: #fff5f5;
  border: 1.5px solid #e53e3e;
  border-radius: 6px;
  padding: 0.25rem 0.7rem;
  font-size: 1rem;
  letter-spacing: 1px;
}
.file-name {
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
}
.file-menu-wrapper {
  position: relative;
  display: inline-block;
}
.file-menu-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #718096;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}
.file-menu-btn:hover {
  background: #edf2f7;
  color: #2b6cb0;
}
.file-menu {
  position: absolute;
  top: 2.2rem;
  right: 0;
  min-width: 130px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.13);
  z-index: 10;
  padding: 0.5rem 0;
}
.file-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.file-menu li {
  padding: 0.7rem 1.2rem;
  cursor: pointer;
  color: #2d3748;
  transition: background 0.18s, color 0.18s;
}
.file-menu li:hover {
  background: #f3f6fa;
  color: #3182ce;
}
.file-menu li.danger {
  color: #e53e3e;
}
.file-menu li.danger:hover {
  background: #fff5f5;
  color: #c53030;
}

.badge-private-new {
  background: #fefcbf;
  color: #b7791f;
  border: 1.5px solid #b7791f;
  font-weight: 700;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.95rem;
  padding: 0.18rem 0.7rem 0.18rem 0.5rem;
  margin-left: 0.7rem;
  box-shadow: 0 2px 8px #f6e05e33;
}

.badge-public-new {
  background: linear-gradient(135deg, #38a169 0%, #22543d 100%);
  color: #fff;
  font-weight: 700;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.95rem;
  padding: 0.18rem 0.7rem 0.18rem 0.5rem;
  margin-left: 0.7rem;
  box-shadow: 0 2px 8px #38a16933;
}

.badge-icon {
  display: inline-flex;
  align-items: center;
  font-size: 1.1em;
  margin-right: 0.2em;
}

.badge-text {
  font-size: 0.98em;
}

.actions-dropdown-wrapper {
  display: flex;
  align-items: flex-start;
  position: relative;
}

.actions-dropdown {
  display: none;
}

.actions-dropdown-menu {
  position: absolute;
  top: 2.5rem;
  right: 0;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.13);
  z-index: 10;
  min-width: 180px;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dropdown-action {
  background: none;
  border: none;
  color: #2d3748;
  font-size: 1rem;
  text-align: left;
  padding: 0.7rem 1.2rem;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  border-radius: 6px;
}

.dropdown-action:hover {
  background: #f3f6fa;
  color: #3182ce;
}

.dropdown-action.danger {
  color: #e53e3e;
}

.dropdown-action.danger:hover {
  background: #fff5f5;
  color: #c53030;
}

.dropdown-action.close {
  color: #718096;
  font-size: 0.95em;
}

.actions-desktop {
  display: flex;
  gap: 1rem;
}

.icon-btn {
  padding: 0.5rem 0.7rem;
  font-size: 1.3rem;
  border-radius: 8px;
  background: #fff;
  border: 2px solid #e2e8f0;
  color: #4a5568;
  box-shadow: 0 2px 8px #2563eb22;
  transition: all 0.18s;
}

.icon-btn:hover {
  background: #f7fafc;
  color: #3182ce;
  border-color: #3182ce;
}

@media (max-width: 900px) {
  .actions-desktop {
    display: none;
  }
  .actions-dropdown {
    display: block;
  }
}

@media (min-width: 901px) {
  .actions-dropdown {
    display: none;
  }
  .actions-desktop {
    display: flex;
  }
}

/* Snackbar/Toast */
.saved-snackbar {
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

.tabs-enhanced {
  position: relative;
  background: #f8fafc;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 2px 8px #3182ce11;
  padding: 0.5rem 1rem 0 1rem;
  margin-bottom: 2rem;
}
.tab {
  position: relative;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px 12px 0 0;
  font-size: 1rem;
  font-weight: 500;
  background: #e2e8f0;
  color: #4a5568;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  overflow: visible;
}
.tab.active {
  background: #fff;
  color: #3182ce;
  font-weight: 700;
  z-index: 2;
}
.tab-icon {
  font-size: 1.2em;
}
.tab-underline {
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #4299e1 0%, #7f53ac 100%);
  border-radius: 2px;
  transition: all 0.3s;
  animation: tabUnderlineIn 0.3s;
}
@keyframes tabUnderlineIn {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 60%;
    opacity: 1;
  }
}
.add-user-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px #3182ce11;
  padding: 2rem 1.5rem;
  max-width: 480px;
  margin: 0 auto 2rem auto;
  border: 1.5px solid #e2e8f0;
}
.add-user-header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1.5rem;
}
.add-user-icon {
  font-size: 2.2rem;
}
.add-user-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
}
.add-user-form-enhanced {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 0.5rem;
}
.add-user-input-group {
  display: flex;
  align-items: center;
  background: #f7fafc;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  padding: 0.5rem 1rem;
  transition: border 0.2s, box-shadow 0.2s;
  position: relative;
  flex: 1;
}
.add-user-input-group.focused {
  border-color: #4299e1;
  box-shadow: 0 0 0 3px #4299e122;
}
.input-icon {
  font-size: 1.2rem;
  color: #a0aec0;
  margin-right: 0.7rem;
}
.add-user-input-group input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 1rem;
  color: #2d3748;
  padding: 0.5rem 0;
}
.btn[disabled] {
  background: #e2e8f0 !important;
  color: #a0aec0 !important;
  cursor: not-allowed !important;
  border: none !important;
}
@media (max-width: 600px) {
  .add-user-card {
    padding: 1rem 0.5rem;
    max-width: 100%;
  }
  .add-user-form-enhanced {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  .add-user-input-group {
    width: 100%;
  }
  .btn {
    width: 100%;
    margin-top: 0.7rem;
  }
}

.members-table-responsive {
  overflow-x: auto;
  display: block;
}
.members-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}
.members-table tr:nth-child(even) td {
  background: #f8fafc;
}
.members-table tr:hover td {
  background: #e0e7ef;
}
.members-table th {
  background: #f1f5f9;
  font-weight: 700;
  color: #2d3748;
  padding: 1rem;
  text-align: left;
  position: relative;
  cursor: pointer;
}
.members-table td {
  padding: 1rem;
  vertical-align: middle;
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
@media (max-width: 700px) {
  .members-table {
    min-width: 500px;
  }
}

.btn-primary:disabled,
.btn[disabled].btn-primary {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%) !important;
  color: #a0aec0 !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
  border: none !important;
  box-shadow: none !important;
}

/* Toast Success */
.toast-success {
  position: fixed;
  top: 2.5rem;
  right: 2.5rem;
  background: linear-gradient(90deg, #38a169 0%, #48bb78 100%);
  color: #fff;
  padding: 1rem 2.2rem;
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
@media (max-width: 600px) {
  .toast-success {
    right: 0.7rem;
    left: 0.7rem;
    top: 1.2rem;
    padding: 0.8rem 1.2rem;
    font-size: 1rem;
  }
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

/* Thêm hiệu ứng transition cho tab và list */
.fade-tab-enter-active,
.fade-tab-leave-active {
  transition: opacity 0.28s cubic-bezier(0.4, 1, 0.7, 1.2);
}
.fade-tab-enter-from,
.fade-tab-leave-to {
  opacity: 0;
}
.fade-list-enter-active,
.fade-list-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 1, 0.7, 1.2);
}
.fade-list-enter-from,
.fade-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.description,
.desc-plain {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}

.role-search-box {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 1rem;
}
.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}
.role-card {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  background: #f7fafc;
  border-radius: 10px;
  border: 2px solid #e2e8f0;
  padding: 1rem 1rem 1rem 0.8rem;
  cursor: pointer;
  transition: box-shadow 0.18s, border 0.18s, background 0.18s;
  position: relative;
}
.role-card.selected {
  border-color: #4299e1;
  background: #ebf8ff;
  box-shadow: 0 2px 8px #3182ce22;
}
.role-card:hover {
  border-color: #4299e1;
  background: #e6f0fa;
}
.role-card input[type='checkbox'] {
  margin-top: 3px;
}
.role-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.role-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 1rem;
}
.role-desc {
  color: #718096;
  font-size: 0.92rem;
}
@media (max-width: 600px) {
  .role-grid {
    grid-template-columns: 1fr;
  }
}

.owner-badge {
  background: #fefcbf;
  color: #b7791f;
  border: 1.5px solid #b7791f;
  margin-right: 0.3rem;
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}
.discord-badge-group {
  display: inline-flex;
  align-items: center;
  gap: 0.18em;
  flex-wrap: wrap;
  min-width: 0;
}
.discord-role-badge {
  border-radius: 999px;
  padding: 0.18em 0.85em;
  font-size: 0.97em;
  font-weight: 700;
  margin-right: 0.13em;
  margin-bottom: 0.08em;
  background: #23272a;
  color: #fff;
  border: none;
  box-shadow: 0 1px 4px #0002;
  letter-spacing: 0.04em;
  transition: background 0.18s, color 0.18s;
  cursor: pointer;
}
.discord-role-badge:hover {
  background: #5865f2;
  color: #fff;
}
.role-badge-owner { background: #f9e076 !important; color: #b7791f !important; }
.role-badge-admin { background: #6ba4f8 !important; color: #2b6cb0 !important; }
.role-badge-mod { background: #6ee7b7 !important; color: #276749 !important; }
.role-badge-everyone { background: #bdb5f7 !important; color: #7c3aed !important; }
.role-badge-default { background: #4f545c !important; color: #fff !important; }
.discord-more-badge {
  color: #7289da;
  font-weight: 700;
  margin-left: 0.2em;
  font-size: 0.97em;
  cursor: pointer;
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
  min-width: 180px;
}
</style>
