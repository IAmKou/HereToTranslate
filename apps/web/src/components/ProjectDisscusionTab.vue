<template>
  <div class="discussion-section">
    <div class="section-header">
      <h2 class="section-title">
        <span class="title-icon">💬</span>
        Discussions
      </h2>
      <!-- Section Header: New Discussion Button -->
      <button
        class="btn btn-primary btn-add"
        @click="canManageDiscussions && (showCreateModal = true)"
        :disabled="!canManageDiscussions"
        :title="!canManageDiscussions ? 'You do not have permission to create discussions (requires ManageDiscussions permission)' : ''"
      >
        <span class="icon">➕</span>
        New Discussion
      </button>
    </div>
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
      <select v-model="sortBy" @change="sortDiscussions" class="form-control" style="max-width: 220px;">
        <option value="createdAt">Newest</option>
        <option value="commentsCount">Most Commented</option>
        <option value="isPinned">Pinned First</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="discussions-loading">
      <div class="loading-spinner-small"></div>
      <span>Loading discussions...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="discussions-error">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
      <button @click="loadDiscussions" class="btn btn-outline btn-sm">Retry</button>
    </div>


    <!-- Discussions List -->
    <div v-else-if="discussions && discussions.length > 0" class="discussions-list">
      <div
        v-for="discussion in discussions"
        :key="discussion.id"
        class="discussion-item"
        :class="{ 'archived': discussion.isArchived }"
      >
        <div class="discussion-header">
          <div class="discussion-info">
            <h3 class="discussion-title">
              <span v-if="discussion.isPinned" class="pin-icon" title="Pinned">📌</span>
              {{ discussion.title }}
            </h3>
            <p v-if="discussion.description" class="discussion-description">
              {{ discussion.description }}
            </p>
            <div class="discussion-meta">
              <span class="meta-item">
                <span class="meta-icon">💬</span>
               {{ discussion.comments?.length || 0 }} comments
              </span>
              <span v-if="discussion.isArchived" class="meta-item archived-badge">
                <span class="meta-icon">📦</span>
                Archived
              </span>
            </div>

          </div>
          <div class="discussion-actions">
            <!-- Discussion Actions: View, Actions -->
            <button
              @click="canViewThread && viewDiscussion(discussion)"
              class="btn btn-outline btn-sm"
              :disabled="!canViewThread"
              :title="!canViewThread ? 'You do not have permission to view discussions (requires ViewThread permission)' : ''"
            >
              <span class="icon">👁️</span>
              View
            </button>
            <div v-if="canManageDiscussions" class="dropdown">
              <button
                class="dropdown-toggle"
                @click="canManageDiscussions && toggleDropdown(discussion.id)"
                :disabled="!canManageDiscussions"
                :title="!canManageDiscussions ? 'You do not have permission to manage discussions (requires ManageDiscussions permission)' : ''"
              >
                <span class="icon">⚙️</span>
                Actions
                <span class="dropdown-arrow">▼</span>
              </button>
              <div v-if="openDropdown === discussion.id" class="dropdown-menu">
                <button
                  @click="editDiscussion(discussion)"
                  class="dropdown-item"
                  :disabled="discussion.isArchived"
                >
                  <span class="icon">✏️</span>
                  Edit
                </button>
                <button
                  v-if="!discussion.isArchived"
                  @click="archiveDiscussion(discussion.id)"
                  class="dropdown-item"
                >
                  <span class="icon">📦</span>
                  Archive
                </button>
                <button
                  v-else
                  @click="unarchiveDiscussion(discussion.id)"
                  class="dropdown-item"
                >
                  <span class="icon">📤</span>
                  Unarchive
                </button>
                <button
                  @click="deleteDiscussion(discussion)"
                  class="dropdown-item dropdown-item-danger"
                  :disabled="discussion.isArchived"
                >
                  <span class="icon">🗑️</span>
                  Delete
                </button>
              </div>
            </div>
            <div v-else class="dropdown">
              <button class="dropdown-toggle" disabled :title="'You do not have permission to manage discussions (requires ManageDiscussions permission)'">
                <span class="icon">⚙️</span>
                Actions
                <span class="dropdown-arrow">▼</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-discussions">
      <div class="empty-illustration" title="No discussions yet!">
        <!-- SVG illustration: vui nhộn, teamwork -->
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <ellipse cx="60" cy="110" rx="40" ry="8" fill="#e0e7ef"/>
          <circle cx="40" cy="60" r="18" fill="#90cdf4"/>
          <circle cx="80" cy="60" r="18" fill="#fbb6ce"/>
          <ellipse cx="40" cy="60" rx="10" ry="6" fill="#fff" opacity=".7"/>
          <ellipse cx="80" cy="60" rx="10" ry="6" fill="#fff" opacity=".7"/>
          <rect x="30" y="80" width="60" height="10" rx="5" fill="#c3dafe"/>
          <text x="60" y="105" text-anchor="middle" fill="#a0aec0" font-size="12">Let's talk!</text>
        </svg>
      </div>
      <h3>No discussions yet</h3>
      <p>Start a discussion to collaborate with your team members.</p>
      <!-- Empty State: Create First Discussion Button -->
      <button
        class="btn btn-primary btn-big-cta"
        @click="canManageDiscussions && (showCreateModal = true)"
        :disabled="!canManageDiscussions"
        :title="!canManageDiscussions ? 'You do not have permission to create discussions (requires ManageDiscussions permission)' : ''"
      >
        <span class="icon">➕</span>
        Create First Discussion
      </button>
    </div>

    <!-- Create Discussion Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header modal-header-enhanced">
          <h3 class="modal-title">
            <span class="title-icon gradient-icon">💬</span>
            Create New Discussion
          </h3>
          <button @click="closeCreateModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createDiscussion" class="create-discussion-form">
            <div class="form-group">
              <label for="discussionTitle" class="form-label form-label-enhanced">Title *</label>
              <input
                id="discussionTitle"
                v-model="newDiscussion.title"
                :class="['form-control', { 'input-error': showTitleError }]"
                type="text"
                required
                placeholder="Enter discussion title"
                minlength="3"
                @blur="validateTitle"
                @input="validateTitle"
              />
              <div v-if="showTitleError" class="form-error">Title is required</div>
            </div>
            <div class="form-group">
              <label for="discussionDescription" class="form-label form-label-enhanced">Description</label>
              <textarea
                id="discussionDescription"
                v-model="newDiscussion.description"
                class="form-control"
                placeholder="Enter discussion description (optional)"
                rows="2"
                ref="descTextarea"
                @input="autoGrow"
                style="max-height: 120px; overflow-y: auto;"
              ></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer modal-footer-enhanced">
          <button @click="closeCreateModal" class="btn btn-outline btn-cancel">Cancel</button>
          <button
            @click="createDiscussion"
            class="btn btn-primary btn-create"
            :disabled="creating"
            style="display: flex; align-items: center; gap: 0.5rem;"
          >
            <span v-if="creating" class="loading-spinner-small"></span>
            <span v-else class="icon">💬</span>
            {{ creating ? 'Creating...' : 'Create Discussion' }}
          </button>
        </div>
        <div v-if="createError" class="form-error form-error-global">{{ createError }}</div>
        <div v-if="createSuccess" class="form-success">Discussion created successfully!</div>
      </div>
    </div>

    <!-- Discussion Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content discussion-detail-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="title-icon">💬</span>
            {{ selectedDiscussion?.title }}
          </h3>
          <button @click="closeDetailModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedDiscussion" class="discussion-detail">
            <div class="discussion-description-full">
              {{ selectedDiscussion.description || 'No description provided.' }}
            </div>

            <!-- Comments Section -->
            <div class="comments-section">
              <h4 class="comments-title">
                <span class="title-icon">💬</span>
                Comments ({{ selectedDiscussion.comments?.length || 0 }})
              </h4>

              <!-- Add Comment -->
              <div class="add-comment">
                <textarea
                  v-model="newComment"
                  class="form-control"
                  placeholder="Write a comment..."
                  rows="3"
                  :disabled="selectedDiscussion?.isArchived || !canPostComment"
                  :title="!canPostComment ? 'You do not have permission to post comments (requires PostComment permission)' : ''"
                ></textarea>
                <button
                  @click="canPostComment && postComment()"
                  class="btn btn-primary btn-sm"
                  :disabled="!newComment.trim() || posting || selectedDiscussion?.isArchived || !canPostComment"
                  :title="!canPostComment ? 'You do not have permission to post comments (requires PostComment permission)' : ''"
                >
                  <span v-if="posting" class="loading-spinner-small"></span>
                  <span v-else class="icon">💬</span>
                  {{ posting ? 'Posting...' : 'Post Comment' }}
                </button>
              </div>

              <!-- Comments List -->
              <div class="comments-list">
                <div
                  v-for="comment in selectedDiscussion.comments"
                  :key="comment.id"
                  class="comment-item"
                >
                  <div class="comment-header">
                    <div class="comment-author">
                      <span class="author-avatar">
                        {{ comment.author?.username?.charAt(0)?.toUpperCase() || 'U' }}
                      </span>
                      <span class="author-name">{{ comment.author?.fullName || 'Unknown' }}</span>
                    </div>
                    <div class="comment-meta">
                      <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                      <span v-if="comment.isEdited" class="edited-badge">(edited)</span>
                    </div>
                  </div>
                  <div class="comment-content">
                    {{ comment.content }}
                  </div>
                  <div class="comment-actions">
                    <!-- Upvote/Downvote -->
                    <button
                      @click="canVote && upvoteComment(comment.id)"
                      class="btn btn-sm btn-outline"
                      :class="{ 'voted': comment.upvotes?.some((u: { id: number }) => u.id === currentUser?.id) }"
                      :disabled="selectedDiscussion?.isArchived || !canVote"
                      :title="!canVote ? 'You do not have permission to vote (requires Vote permission)' : ''"
                    >
                      <span class="icon">👍</span>
                      {{ comment.upvotes?.length || 0 }}
                    </button>
                    <button
                      @click="canVote && downvoteComment(comment.id)"
                      class="btn btn-sm btn-outline"
                      :class="{ 'voted': comment.downvotes?.some((d: { id: number }) => d.id === currentUser?.id) }"
                      :disabled="selectedDiscussion?.isArchived || !canVote"
                      :title="!canVote ? 'You do not have permission to vote (requires Vote permission)' : ''"
                    >
                      <span class="icon">👎</span>
                      {{ comment.downvotes?.length || 0 }}
                    </button>
                    <!-- Edit/Delete comment -->
                    <button
                      @click="(canEditComment(comment) || canManageComments) && editComment(comment)"
                      class="btn btn-sm btn-outline"
                      :disabled="selectedDiscussion?.isArchived || !(canEditComment(comment) || canManageComments)"
                      :title="!(canEditComment(comment) || canManageComments) ? 'You do not have permission to edit comments (requires ManageComments or be the comment owner)' : ''"
                    >
                      <span class="icon">✏️</span>
                      Edit
                    </button>
                    <button
                      @click="(canDeleteComment(comment) || canManageComments) && deleteComment(comment.id)"
                      class="btn btn-sm btn-outline btn-danger"
                      :disabled="selectedDiscussion?.isArchived || !(canDeleteComment(comment) || canManageComments)"
                      :title="!(canDeleteComment(comment) || canManageComments) ? 'You do not have permission to delete comments (requires ManageComments or be the comment owner)' : ''"
                    >
                      <span class="icon">🗑️</span>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Discussion Dialog -->
    <DeleteDiscussionDialog
      v-if="showDeleteDialog && discussionToDelete"
      :discussion="discussionToDelete"
      :project-id="props.projectId"
      @close="closeDeleteDialog"
      @deleted="handleDeleteConfirmed"
    />

    <!-- Edit Discussion Dialog -->
    <EditDiscussionDialog
      v-if="showEditDialog && discussionToEdit"
      :discussion="discussionToEdit"
      :project-id="props.projectId"
      @close="closeEditDialog"
      @updated="loadDiscussions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, type ComputedRef, watch, watchEffect } from 'vue'
import { useAuthStore } from '../store/auth'
import DeleteDiscussionDialog from './DeleteDiscussionDialog.vue'
import EditDiscussionDialog from './EditDiscussionDialog.vue'
import axiosInstance from '../api'
import { useProjectMemberPermissions } from '../composables/useProjectMemberPermissions'
import { parsePermissionFlags } from '../utils/permissions'

interface Discussion {
  id: number
  title: string
  description?: string
  isPinned: boolean
  isArchived: boolean
  comments?: Comment[]
  userPermission?: any
  commentsCount?: number
}

interface Comment {
  id: number
  content: string
  author?: {
    id: number
    username: string
    fullName?: string
  }
  createdAt: string
  isEdited: boolean
  editedAt?: string
  upvotes?: any[]
  downvotes?: any[]
}

interface Props {
  projectId: number
  project?: any
  members?: any[]
  canCreateDiscussion?: boolean
  canManageDiscussions?: boolean
  currentUser?: any
}

const props = withDefaults(defineProps<Props>(), {
  canCreateDiscussion: false,
  canManageDiscussions: false,
  project: undefined,
  members: undefined,
  currentUser: undefined
})

const authStore = useAuthStore()
const currentUser = computed(() => authStore.user)

// State
const discussions = ref<Discussion[]>([])
const loading = ref(false)
const error = ref('')
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const selectedDiscussion = ref<Discussion | null>(null)
const openDropdown = ref<number | null>(null)
const showDeleteDialog = ref(false)
const discussionToDelete = ref<Discussion | null>(null)
const showEditDialog = ref(false)
const discussionToEdit = ref<Discussion | null>(null)

// Form data
const newDiscussion = ref({
  title: '',
  description: ''
})
const newComment = ref('')
const creating = ref(false)
const posting = ref(false)
const showTitleError = ref(false)
const createError = ref('')
const createSuccess = ref(false)
const descTextarea = ref<HTMLTextAreaElement | null>(null)

// Methods
const loadDiscussions = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await axiosInstance.get(`/projects/${props.projectId}/discussions`)
    discussions.value = response.data
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load discussions'
  } finally {
    loading.value = false
  }
}

function validateTitle() {
  showTitleError.value = !newDiscussion.value.title.trim()
}

function autoGrow() {
  nextTick(() => {
    if (descTextarea.value) {
      descTextarea.value.style.height = 'auto'
      descTextarea.value.style.height = Math.min(descTextarea.value.scrollHeight, 120) + 'px'
    }
  })
}

const sortBy = ref<'createdAt' | 'commentsCount' | 'isPinned'>('createdAt')

const sortDiscussions = () => {
  if (sortBy.value === 'createdAt') {
    discussions.value.sort((a: Discussion, b: Discussion) => b.id - a.id)
  } else if (sortBy.value === 'commentsCount') {
    discussions.value.sort((a: Discussion, b: Discussion) => (b.commentsCount || 0) - (a.commentsCount || 0))
  } else if (sortBy.value === 'isPinned') {
    discussions.value.sort((a: Discussion, b: Discussion) => Number(b.isPinned) - Number(a.isPinned))
  }
}


const createDiscussion = async () => {
  validateTitle()
  createError.value = ''
  createSuccess.value = false
  if (showTitleError.value) return
  creating.value = true
  try {
    const response = await axiosInstance.post(`/projects/${props.projectId}/discussions/create`, {
      title: newDiscussion.value.title,
      description: newDiscussion.value.description
    })
    discussions.value.unshift(response.data)
    closeCreateModal()
    newDiscussion.value = { title: '', description: '' }
    createSuccess.value = true
    setTimeout(() => createSuccess.value = false, 2000)
  } catch (err: any) {
    createError.value = err.response?.data?.message || 'Failed to create discussion'
  } finally {
    creating.value = false
  }
}

const viewDiscussion = async (discussion: Discussion) => {
  try {
    const response = await axiosInstance.get(`/projects/${props.projectId}/discussions/${discussion.id}`)
    selectedDiscussion.value = response.data
    showDetailModal.value = true
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load discussion details'
  }
}

const postComment = async () => {
  if (!newComment.value.trim() || !selectedDiscussion.value) return

  posting.value = true
  try {
    await axiosInstance.post(`/projects/${props.projectId}/discussions/${selectedDiscussion.value.id}/post`, {
      content: newComment.value
    })
    // Sau khi post comment, reload lại discussion detail từ server
    await viewDiscussion(selectedDiscussion.value)
    // Reload lại danh sách discussions để cập nhật số comment ngoài list
    await loadDiscussions()
    newComment.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to post comment'
  } finally {
    posting.value = false
  }
}

const upvoteComment = async (commentId: number) => {
  if (!selectedDiscussion.value) return

  try {
    await axiosInstance.post(`/projects/${props.projectId}/discussions/${selectedDiscussion.value.id}/${commentId}/upvote`)
    // Refresh discussion to get updated votes
    await viewDiscussion(selectedDiscussion.value)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to upvote comment'
  }
}

const downvoteComment = async (commentId: number) => {
  if (!selectedDiscussion.value) return

  try {
    await axiosInstance.post(`/projects/${props.projectId}/discussions/${selectedDiscussion.value.id}/${commentId}/downvote`)
    // Refresh discussion to get updated votes
    await viewDiscussion(selectedDiscussion.value)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to downvote comment'
  }
}

const editDiscussion = (discussion: Discussion) => {
  discussionToEdit.value = discussion
  showEditDialog.value = true
}

const archiveDiscussion = async (discussionId: number) => {
  try {
    await axiosInstance.post(`/projects/${props.projectId}/discussions/${discussionId}/archive`)
    await loadDiscussions()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to archive discussion'
  }
}

const unarchiveDiscussion = async (discussionId: number) => {
  try {
    await axiosInstance.post(`/projects/${props.projectId}/discussions/${discussionId}/archive`)
    await loadDiscussions()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to unarchive discussion'
  }
}

const deleteDiscussion = (discussion: Discussion) => {
  discussionToDelete.value = discussion
  showDeleteDialog.value = true
}

const handleDeleteConfirmed = async () => {
  if (!discussionToDelete.value) return

  try {
    await axiosInstance.delete(`/projects/${props.projectId}/discussions/${discussionToDelete.value.id}`)
    await loadDiscussions()
    showDeleteDialog.value = false
    discussionToDelete.value = null
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to delete discussion'
  }
}

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  discussionToDelete.value = null
}

const editComment = (comment: Comment) => {
  // TODO: Implement edit comment
  console.log('Edit comment:', comment)
}

const deleteComment = async (commentId: number) => {
  if (!selectedDiscussion.value || !confirm('Are you sure you want to delete this comment?')) return

  try {
    await axiosInstance.delete(`/projects/${props.projectId}/discussions/${selectedDiscussion.value.id}/${commentId}`)
    await viewDiscussion(selectedDiscussion.value)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to delete comment'
  }
}

const canEditComment = (comment: Comment) => {
  return currentUser.value?.id === comment.author?.id
}

const canDeleteComment = (comment: Comment) => {
  return currentUser.value?.id === comment.author?.id || props.canManageDiscussions
}

const toggleDropdown = (discussionId: number) => {
  openDropdown.value = openDropdown.value === discussionId ? null : discussionId
}

const closeCreateModal = () => {
  showCreateModal.value = false
  newDiscussion.value = { title: '', description: '' }
  showTitleError.value = false
  createError.value = ''
  creating.value = false
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedDiscussion.value = null
  newComment.value = ''
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const closeEditDialog = () => {
  showEditDialog.value = false
  discussionToEdit.value = null
}

// Lifecycle
onMounted(() => {
  loadDiscussions()
})

// Permission logic
const normalizedMembers = computed(() => {
  if (!props.members) return [];
  return props.members.map(m => ({
    ...m,
    roles: Array.isArray(m.roles)
      ? m.roles.map(r => {
        let permissions = r.permissions;
        if ((!permissions || permissions.length === 0) && r.permissionFlags) {
          permissions = parsePermissionFlags(r.permissionFlags);
        }
        return { ...r, permissions };
      })
      : []
  }));
});

const { hasPermission } = useProjectMemberPermissions(
  computed(() => props.project || {}),
  normalizedMembers,
  computed(() => props.currentUser || null)
)
const canViewThread = computed(() => hasPermission('ViewThread'))
const canManageDiscussions = computed(() => hasPermission('ManageDiscussions'))
const canManageComments = computed(() => hasPermission('ManageComments'))
const canPostComment = computed(() => hasPermission('PostComment'))
const canVote = computed(() => hasPermission('Vote'))

// Debug: log dữ liệu khi normalizedMembers hoặc quyền thay đổi
watch([normalizedMembers], () => {
  console.log('==DEBUG DiscussionTab==');
  console.log('normalizedMembers:', normalizedMembers.value);
});
watchEffect(() => {
  console.log('canManageDiscussions:', canManageDiscussions.value);
  console.log('canPostComment:', canPostComment.value);
  console.log('currentUser:', currentUser.value);
});
</script>

<style scoped>
.discussion-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
}

.title-icon {
  font-size: 1.5rem;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-add:hover {
  background: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
}

/* Loading and Error States */
.discussions-loading,
.discussions-error {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: #718096;
}

.loading-spinner-small {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Discussions List */
.discussions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.discussion-item {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.discussion-item:hover {
  border-color: #4299e1;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.15);
  transform: translateY(-2px);
}

.discussion-item.archived {
  opacity: 0.6;
  background: #f1f5f9;
}

.discussion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.discussion-info {
  flex: 1;
}

.discussion-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.pin-icon {
  font-size: 1rem;
}

.discussion-description {
  margin: 0 0 1rem 0;
  color: #718096;
  line-height: 1.6;
}

.discussion-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #718096;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-icon {
  font-size: 1rem;
}

.archived-badge {
  color: #e53e3e;
  font-weight: 500;
}

.discussion-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Empty State */
.empty-discussions {
  text-align: center;
  padding: 3.5rem 2rem 2.5rem 2rem;
  color: #718096;
  background: #f7fafc;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(66,153,225,0.07);
  margin: 2rem auto 0 auto;
  max-width: 520px;
  position: relative;
}

.empty-illustration {
  margin: 0 auto 1.5rem auto;
  width: 120px;
  height: 120px;
  transition: transform 0.22s;
  cursor: pointer;
}

.empty-illustration:hover {
  transform: scale(1.07) rotate(-3deg);
  filter: drop-shadow(0 4px 16px #90cdf4aa);
}

.discussion-sample {
  background: #e6f0fa;
  color: #2b6cb0;
  border-radius: 10px;
  padding: 1rem 1.2rem;
  margin: 1.2rem auto 1.5rem auto;
  display: inline-block;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(49,130,206,0.07);
}

.sample-label {
  font-weight: 600;
  margin-right: 0.5rem;
}

.sample-content {
  font-style: italic;
  color: #4299e1;
}

.btn-big-cta {
  font-size: 1.15rem;
  padding: 0.9rem 2.2rem;
  border-radius: 12px;
  margin-top: 1.2rem;
  box-shadow: 0 4px 16px #90cdf433;
  transition: background 0.18s, box-shadow 0.18s;
}

.btn-big-cta:hover {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: #fff;
  box-shadow: 0 8px 32px #3182ce33;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.discussion-detail-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #718096;
  padding: 0.5rem;
  border-radius: 4px;
  transition: color 0.3s ease;
}

.btn-close:hover {
  color: #e53e3e;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Form Styles */
.create-discussion-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #2d3748;
}

.form-control {
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
}

/* Discussion Detail */
.discussion-detail {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.discussion-description-full {
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
  color: #4a5568;
  line-height: 1.6;
}

/* Comments Section */
.comments-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.comments-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
}

.add-comment {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-item {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.author-avatar {
  width: 2rem;
  height: 2rem;
  background: #4299e1;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.author-name {
  font-weight: 600;
  color: #2d3748;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #718096;
}

.edited-badge {
  color: #4299e1;
  font-style: italic;
}

.comment-content {
  margin-bottom: 1rem;
  line-height: 1.6;
  color: #4a5568;
}

.comment-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.btn-outline {
  background: white;
  border: 1px solid #e2e8f0;
  color: #4a5568;
}

.btn-outline:hover {
  border-color: #4299e1;
  color: #4299e1;
}

.btn-outline.voted {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.btn-danger {
  color: #e53e3e;
  border-color: #e53e3e;
}

.btn-danger:hover {
  background: #e53e3e;
  color: white;
}

/* Dropdown Styles */
.dropdown {
  position: relative;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #4a5568;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dropdown-toggle:hover {
  border-color: #4299e1;
  color: #4299e1;
}

.dropdown-arrow {
  font-size: 0.75rem;
  transition: transform 0.3s ease;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 140px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 0.5rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #4a5568;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: #f7fafc;
}

.dropdown-item-danger {
  color: #e53e3e;
}

.dropdown-item-danger:hover {
  background: #fed7d7;
  color: #c53030;
}

/* Responsive */
@media (max-width: 768px) {
  .discussion-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .discussion-actions {
    justify-content: flex-start;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .comment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .comment-actions {
    justify-content: flex-start;
  }
}

.modal-header-enhanced {
  border-bottom: 1px solid #e2e8f0;
}
.form-label-enhanced {
  font-weight: 500;
  color: #a0aec0;
  font-size: 1rem;
}
.input-error {
  border-color: #e53e3e !important;
}
.form-error {
  color: #e53e3e;
  font-size: 0.9em;
  margin-top: 0.25rem;
}
.form-error-global {
  margin-top: 0.5rem;
  text-align: right;
}
.form-success {
  color: #38a169;
  font-size: 1em;
  margin-top: 0.5rem;
  text-align: right;
}
.gradient-icon {
  background: linear-gradient(135deg, #4299e1 0%, #fbb6ce 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.modal-footer-enhanced {
  justify-content: flex-end;
  gap: 1rem;
}
.btn-cancel {
  background: none;
  border: 1.5px solid #e2e8f0;
  color: #4a5568;
  border-radius: 8px;
  padding: 0.65rem 1.4rem;
  font-size: 1rem;
  font-weight: 500;
  min-width: 100px;
  transition: background 0.18s, border 0.18s, color 0.18s;
  box-shadow: none;
}
.btn-cancel:hover {
  background: #f7fafc;
  border-color: #4299e1;
  color: #3182ce;
}
.btn-create {
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.7rem 1.7rem;
  font-size: 1rem;
  font-weight: 600;
  min-width: 160px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: 0 2px 8px #3182ce22;
  transition: background 0.18s, box-shadow 0.18s, color 0.18s;
}
.btn-create:disabled {
  background: #e2e8f0;
  color: #a0aec0;
  box-shadow: none;
  cursor: not-allowed;
}
.btn-create:hover:not(:disabled) {
  background: linear-gradient(135deg, #3182ce 0%, #4299e1 100%);
  color: #fff;
  box-shadow: 0 4px 16px #3182ce33;
}
.btn-create .icon {
  font-size: 1.1em;
  margin-right: 0.2em;
}
.btn[disabled], .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed !important;
  pointer-events: auto !important;
}
</style>
