<template>
  <div class="project-detail-page">
    <!-- Navbar -->
    <Navbar />

    <div class="main-container">
      <!-- Sidebar -->
      <Sidebar />

      <!-- Main Content -->
      <div class="content-wrapper" @click="closeDropdowns">
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
            <div class="project-header">
              <div class="project-info">
                <div class="project-title-section">
                  <h1 class="project-title">{{ project.name }}</h1>
                  <div class="project-badges">
                    <span v-if="project.isPublic" class="badge badge-public">
                      <span class="badge-icon">🌍</span>
                      Public
                    </span>
                    <span v-else class="badge badge-private">
                      <span class="badge-icon">🔒</span>
                      Private
                    </span>
                  </div>
                </div>
                <div class="project-meta">
                  <div class="meta-item">
                    <span class="meta-icon">👤</span>
                    <span class="meta-text"
                      >Created by
                      <strong>{{ project.createdBy.username }}</strong></span
                    >
                  </div>
                  <div class="meta-item">
                    <span class="meta-icon">📅</span>
                    <span class="meta-text">{{
                      formatDate(project.createdAt)
                    }}</span>
                  </div>
                </div>
              </div>
              <div class="project-actions">
                <router-link
                  :to="`/projects/${project.id}/manage`"
                  class="btn btn-primary btn-manage"
                >
                  <span class="icon">⚙️</span>
                  Manage Project
                </router-link>
                <button @click="editProject" class="btn btn-outline">
                  <span class="icon">✏️</span>
                  Edit Project
                </button>
                <button @click="deleteProject" class="btn btn-danger">
                  <span class="icon">🗑️</span>
                  Delete Project
                </button>
              </div>
            </div>

            <!-- Project Description -->
            <div class="project-section description-section">
              <div class="section-header">
                <h2 class="section-title">
                  <span class="title-icon">📝</span>
                  Description
                </h2>
              </div>
              <div class="description-content">
                <p v-if="project.description" class="description">
                  {{ project.description }}
                </p>
                <div v-else class="no-description">
                  <span class="no-content-icon">📄</span>
                  <p>No description provided for this project.</p>
                </div>
              </div>
            </div>

            <!-- Project Tags -->
            <div
              v-if="project.tags && project.tags.length > 0"
              class="project-section tags-section"
            >
              <div class="section-header">
                <h2 class="section-title">
                  <span class="title-icon">🏷️</span>
                  Tags
                </h2>
              </div>
              <div class="tags-container">
                <span v-for="tag in project.tags" :key="tag.id" class="tag">
                  {{ tag.name }}
                </span>
              </div>
            </div>

            <!-- Enhanced Project Statistics -->
            <div class="project-stats">
              <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-number">
                  {{ project.projectRoles?.length || 0 }}
                </div>
                <div class="stat-label">Roles</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">👨‍👩‍👧‍👦</div>
                <div class="stat-number">{{ project.groups?.length || 0 }}</div>
                <div class="stat-label">Groups</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">📁</div>
                <div class="stat-number">0</div>
                <div class="stat-label">Files</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🌿</div>
                <div class="stat-number">0</div>
                <div class="stat-label">Branches</div>
              </div>
            </div>

            <!-- Enhanced Management Sections -->
            <div class="management-sections">
              <!-- Add User to Project Section -->
              <div class="management-section user-section">
                <div class="section-header">
                  <h2 class="section-title">
                    <span class="title-icon">➕</span>
                    Add User to Project
                  </h2>
                </div>
                <div class="section-content">
                  <form @submit.prevent="searchUser" class="add-user-form">
                    <div class="form-row">
                      <div class="form-group" style="flex: 1; margin-bottom: 0">
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
                        />
                      </div>
                      <div
                        class="form-actions"
                        style="margin-bottom: 0; align-self: flex-end"
                      >
                        <button
                          type="submit"
                          class="btn btn-primary"
                          :disabled="userSearch.loading"
                        >
                          <span
                            v-if="userSearch.loading"
                            class="loading-spinner-small"
                          ></span>
                          <span v-else class="icon">🔍</span>
                          {{
                            userSearch.loading ? 'Searching...' : 'Search User'
                          }}
                        </button>
                      </div>
                    </div>
                  </form>

                  <div v-if="userSearch.error" class="error-message">
                    <span class="error-icon">❌</span>
                    <p>{{ userSearch.error }}</p>
                  </div>

                  <div v-if="userSearch.result" class="found-user">
                    <div class="user-info">
                      <div class="user-avatar">
                        <span class="avatar-text">{{
                          (
                            userSearch.result.fullName ||
                            userSearch.result.username
                          )
                            .charAt(0)
                            .toUpperCase()
                        }}</span>
                      </div>
                      <div class="user-details">
                        <h4>
                          {{
                            userSearch.result.fullName ||
                            userSearch.result.username
                          }}
                        </h4>
                        <p>{{ userSearch.result.email }}</p>
                      </div>
                    </div>
                    <button
                      class="btn btn-primary btn-sm"
                      @click="addUserToProject"
                      :disabled="userSearch.adding"
                    >
                      <span
                        v-if="userSearch.adding"
                        class="loading-spinner-small"
                      ></span>
                      <span v-else class="icon">➕</span>
                      {{ userSearch.adding ? 'Adding...' : 'Add to Project' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Enhanced Roles Management -->
              <div class="management-section roles-section">
                <div class="section-header">
                  <h2 class="section-title">
                    <span class="title-icon">👤</span>
                    Project Roles
                  </h2>
                  <button
                    @click="showCreateRoleModal = true"
                    class="btn btn-primary btn-add"
                  >
                    <span class="icon">➕</span>
                    Add Role
                  </button>
                </div>
                <div class="section-content">
                  <div
                    v-if="
                      project.projectRoles && project.projectRoles.length > 0
                    "
                    class="roles-list"
                  >
                    <div
                      v-for="role in project.projectRoles"
                      :key="role.id"
                      class="role-item"
                    >
                      <div class="role-info">
                        <div class="role-header">
                          <h3 class="role-name">{{ role.name }}</h3>
                          <span class="role-badge">Role</span>
                        </div>
                        <p class="permissions">
                          Permissions:
                          {{ formatPermissions(role.permissionFlags) }}
                        </p>
                      </div>
                      <div class="role-actions">
                        <div class="dropdown">
                          <button
                            class="btn btn-sm btn-outline dropdown-toggle"
                            @click="toggleRoleDropdown(role.id)"
                          >
                            <span class="icon">⚙️</span>
                            Actions
                            <span class="dropdown-arrow">▼</span>
                          </button>
                          <div v-if="activeRoleDropdown === role.id" class="dropdown-menu" @click.stop>
                            <button @click="editRole(role)" class="dropdown-item">
                            <button
                              @click="editRole(role)"
                              class="dropdown-item"
                            >
                              <span class="icon">✏️</span>
                              Edit Role
                            </button>
                            <button
                              @click="deleteRole(role.id)"
                              class="dropdown-item dropdown-item-danger"
                            >
                              <span class="icon">🗑️</span>
                              Delete Role
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="empty-section">
                    <div class="empty-icon">👤</div>
                    <h3>No Roles Defined</h3>
                    <p>
                      Create roles to manage user permissions in this project.
                    </p>
                    <button
                      @click="showCreateRoleModal = true"
                      class="btn btn-primary"
                    >
                      Create First Role
                    </button>
                  </div>
                </div>
              </div>
              <!-- Tabs for Details and Members -->
              <div class="tabs">
                <button
                  :class="['tab', { active: activeTab === 'details' }]"
                  @click="activeTab = 'details'"
                >
                  Details
                </button>
                <button
                  :class="['tab', { active: activeTab === 'members' }]"
                  @click="activeTab = 'members'"
                >
                  Members
                </button>
              </div>

              <div v-if="activeTab === 'details'">
                <!-- Management Sections -->
                <div class="management-sections">
                  <!-- Add User to Project Section -->
                  <div class="management-section">
                    <div class="section-header">
                      <h2>Add User to Project</h2>
                    </div>
                    <form @submit.prevent="searchUser" class="add-user-form">
                      <div class="form-group">
                        <label for="userIdentifier"
                          >Search by Email or Name</label
                        >
                        <input
                          id="userIdentifier"
                          v-model="userSearch.identifier"
                          type="text"
                          required
                          class="form-control"
                          placeholder="Enter email or full name"
                        />
                      </div>
                      <div class="modal-actions">
                        <button
                          type="submit"
                          class="btn btn-primary"
                          :disabled="userSearch.loading"
                        >
                          {{
                            userSearch.loading ? 'Searching...' : 'Search User'
                          }}
                        </button>
                      </div>
                    </form>
                    <div
                      v-if="userSearch.error"
                      class="error"
                      style="margin-top: 1rem"
                    >
                      <p>{{ userSearch.error }}</p>
                    </div>
                    <div
                      v-if="userSearch.result"
                      class="found-user"
                      style="margin-top: 1rem"
                    >
                      <div class="user-info">
                        <span
                          ><b>{{
                            userSearch.result.fullName ||
                            userSearch.result.username
                          }}</b>
                          ({{ userSearch.result.email }})</span
                        >
                        <button
                          class="btn btn-primary btn-sm"
                          @click="addUserToProject"
                          :disabled="userSearch.adding"
                        >
                          {{
                            userSearch.adding ? 'Adding...' : 'Add to Project'
                          }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <!-- Roles Management -->
                  <div class="management-section">
                    <div class="section-header">
                      <h2>Project Roles</h2>
                      <button
                        @click="showCreateRoleModal = true"
                        class="btn btn-primary"
                      >
                        <span class="icon">+</span>
                        Add Role
                      </button>
                    </div>
                    <div
                      v-if="
                        project.projectRoles && project.projectRoles.length > 0
                      "
                      class="roles-list"
                    >
                      <div
                        v-for="role in project.projectRoles"
                        :key="role.id"
                        class="role-item"
                      >
                        <div class="role-info">
                          <h3>{{ role.name }}</h3>
                          <span class="permissions"
                            >Permissions:
                            {{ formatPermissions(role.permissionFlags) }}</span
                          >
                        </div>
                        <div class="role-actions">
                          <button
                            @click="editRole(role)"
                            class="btn btn-sm btn-outline"
                          >
                            Edit
                          </button>
                          <button
                            @click="deleteRole(role.id)"
                            class="btn btn-sm btn-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    <div v-else class="empty-section">
                      <p>No roles defined for this project.</p>
                      <button
                        @click="showCreateRoleModal = true"
                        class="btn btn-primary"
                      >
                        Create First Role
                      </button>
                    </div>
                  </div>

              <!-- Enhanced Groups Management -->
              <div class="management-section groups-section">
                <div class="section-header">
                  <h2 class="section-title">
                    <span class="title-icon">👨‍👩‍👧‍👦</span>
                    Project Groups
                  </h2>
                  <button @click="showCreateGroupModal = true" class="btn btn-primary btn-add">
                    <span class="icon">➕</span>
                    Add Group
                  </button>
                </div>
                <div class="section-content">
                  <div v-if="project.groups && project.groups.length > 0" class="groups-list">
                    <div
                      v-for="group in project.groups"
                      :key="group.id"
                      class="group-item"
                    >
                      <div class="group-info">
                        <div class="group-header">
                          <h3 class="group-name">{{ group.name }}</h3>
                          <span class="group-badge">Group</span>
                        </div>
                        <p class="permissions">Permissions: {{ formatPermissions(group.permissionFlags) }}</p>
                        <div v-if="group.members" class="members-info">
                          <span class="members-count">
                            <span class="count-icon">👥</span>
                            {{ group.members.length }} member{{ group.members.length !== 1 ? 's' : '' }}
                          </span>
                        </div>
                      </div>
                      <div class="group-actions">
                        <div class="dropdown">
                          <button class="btn btn-sm btn-outline dropdown-toggle" @click="toggleGroupDropdown(group.id)">
                            <span class="icon">⚙️</span>
                            Actions
                            <span class="dropdown-arrow">▼</span>
                          </button>
                          <div v-if="activeGroupDropdown === group.id" class="dropdown-menu" @click.stop>
                            <button @click="editGroup(group)" class="dropdown-item">
                              <span class="icon">✏️</span>
                              Edit Group
                            </button>
                            <button @click="deleteGroup(group.id)" class="dropdown-item dropdown-item-danger">
                              <span class="icon">🗑️</span>
                              Delete Group
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="empty-section">
                    <div class="empty-icon">👨‍👩‍👧‍👦</div>
                    <h3>No Groups Defined</h3>
                    <p>Create groups to organize users and manage permissions collectively.</p>
                    <button @click="showCreateGroupModal = true" class="btn btn-primary">Create First Group</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Footer -->
    <AppFooter />
                  <!-- Groups Management -->
                  <div class="management-section">
                    <div class="section-header">
                      <h2>Project Groups</h2>
                      <button
                        @click="showCreateGroupModal = true"
                        class="btn btn-primary"
                      >
                        <span class="icon">+</span>
                        Add Group
                      </button>
                    </div>
                    <div
                      v-if="project.groups && project.groups.length > 0"
                      class="groups-list"
                    >
                      <div
                        v-for="group in project.groups"
                        :key="group.id"
                        class="group-item"
                      >
                        <div class="group-info">
                          <h3>{{ group.name }}</h3>
                          <span class="permissions"
                            >Permissions:
                            {{ formatPermissions(group.permissionFlags) }}</span
                          >
                          <span v-if="group.members" class="members-count">
                            {{ group.members.length }} member{{
                              group.members.length !== 1 ? 's' : ''
                            }}
                          </span>
                        </div>
                        <div class="group-actions">
                          <button
                            @click="editGroup(group)"
                            class="btn btn-sm btn-outline"
                          >
                            Edit
                          </button>
                          <button
                            @click="deleteGroup(group.id)"
                            class="btn btn-sm btn-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    <div v-else class="empty-section">
                      <p>No groups defined for this project.</p>
                      <button
                        @click="showCreateGroupModal = true"
                        class="btn btn-primary"
                      >
                        Create First Group
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else-if="activeTab === 'members'">
                <div class="management-section">
                  <div class="section-header">
                    <h2>Project Members</h2>
                    <!-- Enhanced Groups Management -->
                    <div class="management-section groups-section">
                      <div class="section-header">
                        <h2 class="section-title">
                          <span class="title-icon">👨‍👩‍👧‍👦</span>
                          Project Groups
                        </h2>
                        <button
                          @click="showCreateGroupModal = true"
                          class="btn btn-primary btn-add"
                        >
                          <span class="icon">➕</span>
                          Add Group
                        </button>
                      </div>
                      <div class="section-content">
                        <div
                          v-if="project.groups && project.groups.length > 0"
                          class="groups-list"
                        >
                          <div
                            v-for="group in project.groups"
                            :key="group.id"
                            class="group-item"
                          >
                            <div class="group-info">
                              <div class="group-header">
                                <h3 class="group-name">{{ group.name }}</h3>
                                <span class="group-badge">Group</span>
                              </div>
                              <p class="permissions">
                                Permissions:
                                {{ formatPermissions(group.permissionFlags) }}
                              </p>
                              <div v-if="group.members" class="members-info">
                                <span class="members-count">
                                  <span class="count-icon">👥</span>
                                  {{ group.members.length }} member{{
                                    group.members.length !== 1 ? 's' : ''
                                  }}
                                </span>
                              </div>
                            </div>
                            <div class="group-actions">
                              <div class="dropdown">
                                <button
                                  class="btn btn-sm btn-outline dropdown-toggle"
                                  @click="toggleGroupDropdown(group.id)"
                                >
                                  <span class="icon">⚙️</span>
                                  Actions
                                  <span class="dropdown-arrow">▼</span>
                                </button>
                                <div
                                  v-if="activeGroupDropdown === group.id"
                                  class="dropdown-menu"
                                >
                                  <button
                                    @click="editGroup(group)"
                                    class="dropdown-item"
                                  >
                                    <span class="icon">✏️</span>
                                    Edit Group
                                  </button>
                                  <button
                                    @click="deleteGroup(group.id)"
                                    class="dropdown-item dropdown-item-danger"
                                  >
                                    <span class="icon">🗑️</span>
                                    Delete Group
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-else class="empty-section">
                          <div class="empty-icon">👨‍👩‍👧‍👦</div>
                          <h3>No Groups Defined</h3>
                          <p>
                            Create groups to organize users and manage
                            permissions collectively.
                          </p>
                          <button
                            @click="showCreateGroupModal = true"
                            class="btn btn-primary"
                          >
                            Create First Group
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="membersLoading" class="loading">
                  <div class="loading-spinner"></div>
                  Loading members...
                </div>
                <div v-else-if="membersError" class="error">
                  {{ membersError }}
                </div>
                <table v-else class="members-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Roles</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="member in members" :key="member.id">
                      <td>{{ member.fullName || '-' }}</td>
                      <td>{{ member.username }}</td>
                      <td>{{ member.email }}</td>
                      <td>
                        <span
                          v-for="role in member.roles"
                          :key="role.id"
                          class="role-badge"
                          >{{ role.name }}</span
                        >
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <AppFooter />

          <!-- Enhanced Create Role Modal -->
          <div
            v-if="showCreateRoleModal"
            class="modal-overlay"
            @click.self="showCreateRoleModal = false"
          >
            <div class="modal-content role-modal">
              <div class="modal-header">
                <div class="modal-title">
                  <div class="title-icon">👤</div>
                  <h3>Create New Role</h3>
                </div>
                <button
                  class="close-button"
                  @click="showCreateRoleModal = false"
                >
                  &times;
                </button>
              </div>

              <div class="modal-body">
                <form @submit.prevent="createRole" class="role-form">
                  <div class="form-group">
                    <label for="roleName" class="form-label">
                      <span class="label-text">Role Name</span>
                      <span class="required">*</span>
                    </label>
                    <input
                      id="roleName"
                      v-model="newRole.name"
                      type="text"
                      required
                      class="form-control"
                      placeholder="e.g., Translator, Reviewer, Admin"
                      :disabled="isCreatingRole"
                    />
                    <div class="form-hint">
                      Choose a descriptive name for this role
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">
                      <span class="label-text">Permissions</span>
                      <span
                        class="permissions-count"
                        v-if="selectedPermissions.length > 0"
                      >
                        ({{ selectedPermissions.length }} selected)
                      </span>
                    </label>
                    <div class="permissions-container">
                      <div class="permissions-header">
                        <button
                          type="button"
                          class="select-all-btn"
                          @click="toggleSelectAll"
                        >
                          {{ isAllSelected ? 'Deselect All' : 'Select All' }}
                        </button>
                        <div class="permissions-search">
                          <input
                            v-model="permissionSearch"
                            type="text"
                            placeholder="Search permissions..."
                            class="search-input"
                          />
                        </div>
                      </div>

                      <div class="permissions-list">
                        <div
                          v-for="perm in filteredPermissions"
                          :key="perm"
                          class="permission-item"
                          :class="{
                            selected: selectedPermissions.includes(perm),
                          }"
                        >
                          <label class="permission-checkbox">
                            <input
                              type="checkbox"
                              :id="perm"
                              :value="perm"
                              v-model="selectedPermissions"
                              :disabled="isCreatingRole"
                            />
                            <span class="checkmark"></span>
                            <div class="permission-content">
                              <span class="permission-name">{{
                                formatPermissionName(perm)
                              }}</span>
                              <span class="permission-description">{{
                                getPermissionDescription(perm)
                              }}</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div
                        v-if="filteredPermissions.length === 0"
                        class="no-permissions"
                      >
                        <div class="no-permissions-icon">🔍</div>
                        <p>
                          No permissions found matching "{{ permissionSearch }}"
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div class="modal-footer">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showCreateRoleModal = false"
                  :disabled="isCreatingRole"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  @click="createRole"
                  :disabled="
                    isCreatingRole ||
                    !newRole.name.trim() ||
                    selectedPermissions.length === 0
                  "
                >
                  <span
                    v-if="isCreatingRole"
                    class="loading-spinner-small"
                  ></span>
                  {{ isCreatingRole ? 'Creating...' : 'Create Role' }}
                </button>
              </div>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import { PermissionFlags, PermissionStrings } from '@here-to-translate/common';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import AppFooter from '../components/AppFooter.vue';

const route = useRoute();
const router = useRouter();

// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
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

interface CreateRoleData {
  name: string;
  permissions: string;
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
const showCreateRoleModal = ref(false);
const showCreateGroupModal = ref(false);
const isCreatingRole = ref(false);
const isCreatingGroup = ref(false);

// Form data
const newRole = ref<CreateRoleData>({
  name: '',
  permissions: '',
});

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
  }>
>([]);
const membersLoading = ref(false);
const membersError = ref('');

const activeTab = ref<'details' | 'members'>('details');

// Permission search and selection state
const permissionSearch = ref('');
const isAllSelected = ref(false);

// Dropdown states
const activeRoleDropdown = ref<string | null>(null);
const activeGroupDropdown = ref<string | null>(null);

// Computed properties for permissions
const filteredPermissions = computed(() => {
  if (!permissionSearch.value) return availablePermissions;
  return availablePermissions.filter((perm) =>
    formatPermissionName(perm)
      .toLowerCase()
      .includes(permissionSearch.value.toLowerCase())
  );
});

// Watch for changes in selected permissions to update select all state
watch(
  selectedPermissions,
  (newSelection: PermissionStrings[]) => {
    isAllSelected.value = newSelection.length === availablePermissions.length;
  },
  { deep: true }
);

// Watch for changes in available permissions to update select all state
watch(availablePermissions, () => {
  isAllSelected.value =
    selectedPermissions.value.length === availablePermissions.length;
});

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = authService.getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

const loadProject = async () => {
  try {
    loading.value = true;
    error.value = null;
    const projectId = route.params.projectId as string;
    project.value = await apiCall(`/projects/${projectId}`);
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

const formatPermissionName = (permission: string) => {
  return permission
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

const getPermissionDescription = (permission: string): string => {
  const descriptions: Record<string, string> = {
    ReadProject: 'View project details and content',
    WriteProject: 'Edit project settings and content',
    DeleteProject: 'Delete the entire project',
    ManageUsers: 'Add, remove, and manage project users',
    ManageRoles: 'Create, edit, and delete project roles',
    ManageGroups: 'Create, edit, and delete project groups',
    ReadFiles: 'View project files and documents',
    WriteFiles: 'Upload and edit project files',
    DeleteFiles: 'Remove files from the project',
    ReadBranches: 'View project branches',
    WriteBranches: 'Create and edit branches',
    DeleteBranches: 'Delete project branches',
    ReadComments: 'View comments and discussions',
    WriteComments: 'Add comments and participate in discussions',
    DeleteComments: 'Remove comments from discussions',
    ReadTasks: 'View project tasks and assignments',
    WriteTasks: 'Create and edit tasks',
    DeleteTasks: 'Remove tasks from the project',
    ReadRequests: 'View translation requests',
    WriteRequests: 'Create and edit translation requests',
    DeleteRequests: 'Remove translation requests',
    ReadRatings: 'View ratings and reviews',
    WriteRatings: 'Submit ratings and reviews',
    DeleteRatings: 'Remove ratings and reviews',
    ReadReports: 'View project reports and analytics',
    WriteReports: 'Generate and edit reports',
    DeleteReports: 'Remove reports from the project',
    ReadTransactions: 'View financial transactions',
    WriteTransactions: 'Create and edit transactions',
    DeleteTransactions: 'Remove transaction records',
    ReadDiscussions: 'View project discussions',
    WriteDiscussions: 'Create and participate in discussions',
    DeleteDiscussions: 'Remove discussions from the project',
    ReadPosts: 'View project posts and announcements',
    WritePosts: 'Create and edit posts',
    DeletePosts: 'Remove posts from the project',
    ReadCategories: 'View project categories',
    WriteCategories: 'Create and edit categories',
    DeleteCategories: 'Remove categories from the project',
    ReadTags: 'View project tags',
    WriteTags: 'Create and edit tags',
    DeleteTags: 'Remove tags from the project',
    ReadCommits: 'View project commit history',
    WriteCommits: 'Create and edit commits',
    DeleteCommits: 'Remove commits from the project',
  };
  return descriptions[permission] || 'Manage this permission type';
};

const editProject = () => {
  router.push(`/projects/${project.value?.id}/edit`);
};

const deleteProject = async () => {
  if (
    !project.value ||
    !confirm(
      'Are you sure you want to delete this project? This action cannot be undone.'
    )
  ) {
    return;
  }

  try {
    await apiCall(`/projects/${project.value.id}`, { method: 'DELETE' });
    alert('Project deleted successfully!');
    router.push('/projects');
  } catch (err: any) {
    alert('Failed to delete project: ' + err.message);
  }
};

const createRole = async () => {
  if (!project.value) return;

  isCreatingRole.value = true;

  try {
    const permissionValue = selectedPermissions.value.reduce((acc, key) => {
      return acc | PermissionFlags[key as PermissionStrings];
    }, 0n);

    await apiCall(`/projects/${project.value.id}/roles/create`, {
      method: 'POST',
      body: JSON.stringify({
        name: newRole.value.name,
        permissionFlags: permissionValue.toString(),
      }),
    });
    await loadProject();
    showCreateRoleModal.value = false;
    newRole.value = { name: '', permissions: '' };
    selectedPermissions.value = []; // Reset
  } catch (err: any) {
    alert('Failed to create role: ' + err.message);
  } finally {
    isCreatingRole.value = false;
  }
};

const createGroup = async () => {
  if (!project.value) return;

  isCreatingGroup.value = true;
  try {
    await apiCall(`/projects/${project.value.id}/groups/create`, {
      method: 'POST',
      body: JSON.stringify(newGroup.value),
    });
    await loadProject(); // Reload project to get updated groups
    showCreateGroupModal.value = false;
    newGroup.value = { name: '' };
  } catch (err: any) {
    alert('Failed to create group: ' + err.message);
  } finally {
    isCreatingGroup.value = false;
  }
};

const editRole = (role: any) => {
  // Navigate to role edit page or open edit modal
  console.log('Edit role:', role);
};

const deleteRole = async (roleId: string) => {
  if (
    !project.value ||
    !confirm('Are you sure you want to delete this role?')
  ) {
    return;
  }

  try {
    await apiCall(`/projects/${project.value.id}/roles/${roleId}`, {
      method: 'DELETE',
    });
    await loadProject(); // Reload project to get updated roles
  } catch (err: any) {
    alert('Failed to delete role: ' + err.message);
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
    await apiCall(`/projects/${project.value.id}/groups/${groupId}`, {
      method: 'DELETE',
    });
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
    const res = await apiCall(`/projects/${project.value.id}/search-user`, {
      method: 'POST',
      body: JSON.stringify({ identifier: userSearch.value.identifier }),
    });
    if (res.user) {
      userSearch.value.result = res.user;
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
    await apiCall(`/projects/${project.value.id}/add-user`, {
      method: 'POST',
      body: JSON.stringify({ identifier: userSearch.value.result.email }),
    });
    await loadProject();
    alert('User added to project!');
    userSearch.value.result = null;
    userSearch.value.identifier = '';
  } catch (err: any) {
    alert('Failed to add user: ' + err.message);
  } finally {
    userSearch.value.adding = false;
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedPermissions.value = [];
  } else {
    selectedPermissions.value = [...availablePermissions];
  }
};

const toggleRoleDropdown = (roleId: string) => {
  if (activeRoleDropdown.value === roleId) {
    activeRoleDropdown.value = null;
  } else {
    activeRoleDropdown.value = roleId;
    activeGroupDropdown.value = null; // Close other dropdowns
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

// Close dropdowns when clicking outside
function closeDropdowns() {
  activeRoleDropdown.value = null;
  activeGroupDropdown.value = null;
};

const loadMembers = async () => {
  if (!project.value) return;
  membersLoading.value = true;
  membersError.value = '';
  try {
    const projectId = route.params.projectId as string;
    const data = await apiCall(`/projects/${projectId}/members`);
    const memberMap: Record<
      string,
      {
        id: string;
        username: string;
        fullName?: string;
        email: string;
        roles: Array<{ id: string; name: string }>;
      }
    > = {};
    if (data.members) {
      for (const m of data.members) {
        memberMap[m.id] = { ...m, roles: [] };
      }
    }
    if (data.projectRoles) {
      for (const role of data.projectRoles) {
        if (role.users) {
          for (const user of role.users) {
            if (!memberMap[user.id]) {
              memberMap[user.id] = { ...user, roles: [] };
            }
            memberMap[user.id].roles.push({ id: role.id, name: role.name });
          }
        }
      }
    }
    members.value = Object.values(memberMap);
  } catch (err: any) {
    membersError.value = err.message || 'Failed to load members.';
  } finally {
    membersLoading.value = false;
  }
};

watch(activeTab, (tab) => {
  if (tab === 'members') {
    loadMembers();
  }
});

onMounted(() => {
  loadProject()
})

defineExpose({ closeDropdowns })
  loadProject();
});
</script>

<style scoped>
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

.project-detail-view {
  max-width: 1700px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
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
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

/* Enhanced Project Header */
.project-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.project-title-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.project-title {
  margin: 0;
  color: white;
  font-size: 1.7rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.project-badges {
  display: flex;
  gap: 0.75rem;
}

.badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.badge-public {
  background: rgba(72, 187, 120, 0.9);
  color: white;
}

.badge-private {
  background: rgba(245, 101, 101, 0.9);
  color: white;
}

.badge-icon {
  font-size: 1rem;
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
}

.meta-icon {
  font-size: 1.25rem;
  opacity: 0.8;
}

.meta-text {
  opacity: 0.9;
}

.meta-text strong {
  color: white;
  font-weight: 600;
}

.project-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 200px;
}

.btn-manage {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.btn-manage:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

/* Enhanced Project Statistics */
.project-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.stat-card {
  background: white;
  padding: 1rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  display: block;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4299e1;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
}

.stat-label {
  color: #718096;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
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

.btn-primary {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #3182ce 0%, #2c5aa0 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(66, 153, 225, 0.3);
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
  color: white;
  transform: translateY(-2px);
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

.role-modal,
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
.role-form,
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

.permissions-count {
  color: #4299e1;
  font-weight: 500;
  font-size: 0.9rem;
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
  background: #f7fafc;
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

  .role-modal,
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
}
.tab {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px 8px 0 0;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  background: #e2e8f0;
  color: #4a5568;
  transition: background 0.2s;
}
.tab.active {
  background: #4299e1;
  color: white;
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
</style>
