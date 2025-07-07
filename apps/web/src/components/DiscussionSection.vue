<template>
  <div class="discussion-section">
    <div class="section-header">
      <h2 class="section-title">
        <span class="title-icon">💬</span>
        Discussions
      </h2>
      <button
        v-if="canCreateDiscussion"
        @click="showCreateModal = true"
        class="btn btn-primary btn-add"
      >
        <span class="icon">➕</span>
        New Discussion
      </button>
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
            <button
              @click="viewDiscussion(discussion)"
              class="btn btn-outline btn-sm"
            >
              <span class="icon">👁️</span>
              View
            </button>
            <div v-if="canManageDiscussions" class="dropdown">
              <button class="dropdown-toggle" @click="toggleDropdown(discussion.id)">
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
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-discussions">
      <div class="empty-icon">💬</div>
      <h3>No discussions yet</h3>
      <p>Start a discussion to collaborate with your team members.</p>
      <button
        v-if="canCreateDiscussion"
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <span class="icon">➕</span>
        Create First Discussion
      </button>
    </div>

    <!-- Create Discussion Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="title-icon">💬</span>
            Create New Discussion
          </h3>
          <button @click="closeCreateModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createDiscussion" class="create-discussion-form">
            <div class="form-group">
              <label for="discussionTitle" class="form-label">Title *</label>
              <input
                id="discussionTitle"
                v-model="newDiscussion.title"
                type="text"
                required
                class="form-control"
                placeholder="Enter discussion title"
                minlength="3"
              />
            </div>
            <div class="form-group">
              <label for="discussionDescription" class="form-label">Description</label>
              <textarea
                id="discussionDescription"
                v-model="newDiscussion.description"
                class="form-control"
                placeholder="Enter discussion description (optional)"
                rows="4"
              ></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="closeCreateModal" class="btn btn-outline">Cancel</button>
          <button
            @click="createDiscussion"
            class="btn btn-primary"
            :disabled="creating"
          >
            <span v-if="creating" class="loading-spinner-small"></span>
            <span v-else class="icon">💬</span>
            {{ creating ? 'Creating...' : 'Create Discussion' }}
          </button>
        </div>
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
                  :disabled="selectedDiscussion?.isArchived"
                ></textarea>
                <button
                  @click="postComment"
                  class="btn btn-primary btn-sm"
                  :disabled="!newComment.trim() || posting || selectedDiscussion?.isArchived"
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
                      <span class="author-name">{{ comment.author?.username || 'Unknown' }}</span>
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
                    <button
                      @click="upvoteComment(comment.id)"
                      class="btn btn-sm btn-outline"
                      :class="{ 'voted': comment.upvotes?.some(u => u.id === currentUser?.id) }"
                      :disabled="selectedDiscussion?.isArchived"
                    >
                      <span class="icon">👍</span>
                      {{ comment.upvotes?.length || 0 }}
                    </button>
                    <button
                      @click="downvoteComment(comment.id)"
                      class="btn btn-sm btn-outline"
                      :class="{ 'voted': comment.downvotes?.some(d => d.id === currentUser?.id) }"
                      :disabled="selectedDiscussion?.isArchived"
                    >
                      <span class="icon">👎</span>
                      {{ comment.downvotes?.length || 0 }}
                    </button>
                    <button
                      v-if="canEditComment(comment)"
                      @click="editComment(comment)"
                      class="btn btn-sm btn-outline"
                      :disabled="selectedDiscussion?.isArchived"
                    >
                      <span class="icon">✏️</span>
                      Edit
                    </button>
                    <button
                      v-if="canDeleteComment(comment)"
                      @click="deleteComment(comment.id)"
                      class="btn btn-sm btn-outline btn-danger"
                      :disabled="selectedDiscussion?.isArchived"
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
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../store/auth'
import DeleteDiscussionDialog from './DeleteDiscussionDialog.vue'
import EditDiscussionDialog from './EditDiscussionDialog.vue'
import axiosInstance from '../api'

interface Discussion {
  id: number
  title: string
  description?: string
  isPinned: boolean
  isArchived: boolean
  comments?: Comment[]
  userPermission?: any
}

interface Comment {
  id: number
  content: string
  author?: {
    id: number
    username: string
  }
  createdAt: string
  isEdited: boolean
  editedAt?: string
  upvotes?: any[]
  downvotes?: any[]
}

interface Props {
  projectId: number
  canCreateDiscussion?: boolean
  canManageDiscussions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canCreateDiscussion: false,
  canManageDiscussions: false
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

const createDiscussion = async () => {
  if (!newDiscussion.value.title.trim()) return

  creating.value = true
  try {
    const response = await axiosInstance.post(`/projects/${props.projectId}/discussions/create`, {
      title: newDiscussion.value.title,
      description: newDiscussion.value.description
    })

    discussions.value.unshift(response.data)
    closeCreateModal()
    newDiscussion.value = { title: '', description: '' }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to create discussion'
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
    const response = await axiosInstance.post(`/projects/${props.projectId}/discussions/${selectedDiscussion.value.id}/post`, {
      content: newComment.value
    })

    if (selectedDiscussion.value.comments) {
      selectedDiscussion.value.comments.push(response.data)
    } else {
      selectedDiscussion.value.comments = [response.data]
    }

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
  padding: 3rem 2rem;
  color: #718096;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-discussions h3 {
  color: #2d3748;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-discussions p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: 1.6;
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
</style>
