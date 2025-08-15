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
    <Teleport to="body">
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
    </Teleport>

    <!-- Discussion Detail Modal -->
    <Teleport to="body">
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
                        <div v-if="comment.author?.avatarUrl" class="author-avatar-wrapper">
                          <img
                            :src="getFullAvatarUrl(comment.author.avatarUrl)"
                            :alt="comment.author.fullName || comment.author.username"
                            class="author-avatar-img"
                            @error="(e: Event) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const nextSibling = target.nextElementSibling as HTMLElement;
                              if (nextSibling) nextSibling.style.display = 'flex';
                            }"
                          />
                          <div
                            class="author-avatar-text"
                            :style="{ backgroundColor: getRandomColor(comment.author.username || comment.author.id) }"
                            style="display: none;"
                          >
                            {{ getAvatarText(comment.author) }}
                          </div>
                        </div>
                        <div
                          v-else
                          class="author-avatar-text"
                          :style="{ backgroundColor: getRandomColor(comment.author?.username || comment.author?.id || 'default') }"
                        >
                          {{ getAvatarText(comment.author || { username: 'Unknown' }) }}
                        </div>
                        <span class="author-name">{{ comment.author?.fullName || comment.author?.username || 'Unknown' }}</span>
                      </div>
                      <div class="comment-meta">
                        <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                        <span v-if="comment.isEdited" class="edited-badge">(edited)</span>
                      </div>
                    </div>
                    <div class="comment-content">
                      <!-- Edit Form -->
                      <div v-if="editingComment?.id === comment.id && isEditingComment" class="comment-edit-form">
                        <textarea
                          v-model="editingCommentContent"
                          class="form-control"
                          rows="3"
                          :disabled="isSavingComment"
                        ></textarea>
                        <div class="edit-actions">
                          <button
                            @click="saveEditComment"
                            class="btn btn-sm btn-primary"
                            :disabled="!editingCommentContent.trim() || isSavingComment"
                          >
                            <span v-if="isSavingComment" class="loading-spinner-small"></span>
                            <span v-else class="icon">💾</span>
                            {{ isSavingComment ? 'Saving...' : 'Save' }}
                          </button>
                          <button
                            @click="cancelEditComment"
                            class="btn btn-sm btn-outline"
                            :disabled="isSavingComment"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <!-- Normal Content -->
                      <div v-else>
                        {{ comment.content }}
                      </div>
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
                        :class="{ 'voted': comment.downvotes?.some((u: { id: number }) => u.id === currentUser?.id) }"
                        :disabled="selectedDiscussion?.isArchived || !canVote"
                        :title="!canVote ? 'You do not have permission to vote (requires Vote permission)' : ''"
                      >
                        <span class="icon">👎</span>
                        {{ comment.downvotes?.length || 0 }}
                      </button>

                      <!-- Edit/Delete Actions -->
                      <div class="comment-action-buttons">
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
      </div>
    </Teleport>

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

    <!-- Delete Comment Dialog -->
    <DeleteCommentDialog
      v-if="showDeleteCommentDialog && commentToDelete"
      :comment="commentToDelete"
      :discussion-id="Number(selectedDiscussion?.id) || 0"
      :project-id="props.projectId"
      @close="closeDeleteCommentDialog"
      @deleted="handleDeleteCommentConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, type ComputedRef, watch, watchEffect } from 'vue'
import { useAuthStore } from '../store/auth'
import DeleteDiscussionDialog from './DeleteDiscussionDialog.vue'
import EditDiscussionDialog from './EditDiscussionDialog.vue'
import DeleteCommentDialog from './DeleteCommentDialog.vue'
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
    avatarUrl?: string
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
const showDeleteCommentDialog = ref(false)
const commentToDelete = ref<Comment | null>(null)
const editingComment = ref<Comment | null>(null)
const editingCommentContent = ref('')
const isEditingComment = ref(false)
const isSavingComment = ref(false)

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
  editingComment.value = comment
  editingCommentContent.value = comment.content
  isEditingComment.value = true
}

const saveEditComment = async () => {
  if (!editingComment.value || !editingCommentContent.value.trim()) return

  isSavingComment.value = true
  try {
    await axiosInstance.patch(`/projects/${props.projectId}/discussions/${selectedDiscussion.value?.id}/${editingComment.value.id}`, {
      content: editingCommentContent.value.trim()
    })

    // Cập nhật comment trong state local
    if (selectedDiscussion.value?.comments) {
      const commentIndex = selectedDiscussion.value.comments.findIndex((c: Comment) => c.id === editingComment.value?.id)
      if (commentIndex !== -1) {
        selectedDiscussion.value.comments[commentIndex].content = editingCommentContent.value.trim()
        selectedDiscussion.value.comments[commentIndex].isEdited = true
      }
    }

    // Reset editing state
    editingComment.value = null
    editingCommentContent.value = ''
    isEditingComment.value = false
    isSavingComment.value = false

    // Reload discussion list để cập nhật
    await loadDiscussions()
  } catch (err: any) {
    console.error('Failed to edit comment:', err)
    // Không reset editing state nếu có lỗi để user có thể sửa lại
  }
}

const cancelEditComment = () => {
  editingComment.value = null
  editingCommentContent.value = ''
  isEditingComment.value = false
  isSavingComment.value = false
}

const deleteComment = async (commentId: number) => {
  if (!selectedDiscussion.value) return

  // Tìm comment cần xóa
  const comment = selectedDiscussion.value.comments?.find((c: Comment) => c.id === commentId)
  if (comment) {
    commentToDelete.value = comment
    showDeleteCommentDialog.value = true
  }
}

const handleDeleteCommentConfirmed = async () => {
  if (!selectedDiscussion.value || !commentToDelete.value) return

  try {
    // Lưu comment ID trước khi reset state
    const commentIdToDelete = commentToDelete.value.id

    // Đóng modal và reset state ngay lập tức
    showDeleteCommentDialog.value = false
    commentToDelete.value = null

    // Xóa comment khỏi state local ngay lập tức để UI cập nhật
    if (selectedDiscussion.value.comments) {
      selectedDiscussion.value.comments = selectedDiscussion.value.comments.filter(
        (c: Comment) => c.id !== commentIdToDelete
      )
    }

    // Gọi API xóa comment (không cần await để không block UI)
    axiosInstance.delete(`/projects/${props.projectId}/discussions/${selectedDiscussion.value.id}/${commentIdToDelete}`)
      .catch((err: any) => {
        console.error('Failed to delete comment:', err)
      })

    // Reload lại danh sách discussions để cập nhật số comment
    await loadDiscussions()
  } catch (err: any) {
    console.error('Failed to delete comment:', err)
    await loadDiscussions()
  }
}

const closeDeleteCommentDialog = () => {
  showDeleteCommentDialog.value = false
  commentToDelete.value = null
}

const canEditComment = (comment: Comment) => {
  // Chỉ comment author mới được edit comment
  const currentUserId = Number(currentUser.value?.id)
  const commentAuthorId = Number(comment.author?.id)

  console.log('=== DEBUG canEditComment ===')
  console.log('currentUserId:', currentUserId, typeof currentUserId)
  console.log('commentAuthorId:', commentAuthorId, typeof commentAuthorId)
  console.log('comment.author:', comment.author)
  console.log('currentUser.value:', currentUser.value)
  console.log('Result:', currentUserId === commentAuthorId)

  return currentUserId === commentAuthorId
}

const canDeleteComment = (comment: Comment) => {
  // Comment author hoặc discussion owner có thể delete comment
  const currentUserId = Number(currentUser.value?.id)
  const commentAuthorId = Number(comment.author?.id)
  const projectAuthorId = Number(props.project?.author?.id)

  const isCommentAuthor = currentUserId === commentAuthorId
  const isDiscussionOwner = currentUserId === projectAuthorId

  console.log('=== DEBUG canDeleteComment ===')
  console.log('currentUserId:', currentUserId)
  console.log('commentAuthorId:', commentAuthorId)
  console.log('projectAuthorId:', projectAuthorId)
  console.log('isCommentAuthor:', isCommentAuthor)
  console.log('isDiscussionOwner:', isDiscussionOwner)
  console.log('Result:', isCommentAuthor || isDiscussionOwner)

  return isCommentAuthor || isDiscussionOwner
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

// Avatar helper functions
const getAvatarText = (user: { fullName?: string; username: string }) => {
  const name = user.fullName || user.username
  const words = name.trim().split(' ')
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
  }
  return name.charAt(0).toUpperCase()
}

const getFullAvatarUrl = (avatarUrl: string) => {
  if (!avatarUrl) return ''
  if (avatarUrl.startsWith('http')) return avatarUrl

  // avatarUrl từ backend có dạng '/uploads/avatars/filename.jpg'
  // Chúng ta cần lấy ra chỉ 'filename.jpg'
  const parts = avatarUrl.split('/');
  const filename = parts[parts.length - 1]; // Lấy phần tử cuối cùng, là tên file

  // Đường dẫn đầy đủ sẽ là VITE_API_URL + /users/uploads/avatars/ + filename
  // VITE_API_URL thường là http://localhost:3000/api
  return `${import.meta.env.VITE_API_URL}/users/uploads/avatars/${filename}`;
}

const getRandomColor = (seed: string | number) => {
  const colors = [
    '#4299e1', '#3182ce', '#2b6cb0', '#2c5282', // Blue shades
    '#48bb78', '#38a169', '#2f855a', '#276749', // Green shades
    '#ed8936', '#dd6b20', '#c05621', '#9c4221', // Orange shades
    '#f56565', '#e53e3e', '#c53030', '#9b2c2c', // Red shades
    '#9f7aea', '#805ad5', '#6b46c1', '#553c9a', // Purple shades
    '#ed64a6', '#d53f8c', '#b83280', '#97266d', // Pink shades
    '#38b2ac', '#319795', '#2c7a7b', '#285e61', // Teal shades
    '#f6ad55', '#ed8936', '#dd6b20', '#c05621'  // Yellow shades
  ]
  const index = typeof seed === 'string'
    ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : seed
  return colors[index % colors.length]
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
  return props.members.map((m: any) => ({
    ...m,
    roles: Array.isArray(m.roles)
      ? m.roles.map((r: any) => {
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
const canViewThread = computed(() => hasPermission('ViewThread') || hasPermission('ManageDiscussions'))
const canManageDiscussions = computed(() => hasPermission('ManageDiscussions'))
const canManageComments = computed(() => hasPermission('ManageComments'))
const canPostComment = computed(() => hasPermission('PostComment') || hasPermission('ManageDiscussions'))
const canVote = computed(() => hasPermission('Vote'))

// Debug: log dữ liệu khi normalizedMembers hoặc quyền thay đổi
watch([normalizedMembers], () => {
  console.log('==DEBUG DiscussionTab==');
  console.log('normalizedMembers:', normalizedMembers.value);
});
watchEffect(() => {
  console.log('=== DEBUG PERMISSIONS ===');
  console.log('canManageDiscussions:', canManageDiscussions.value);
  console.log('canPostComment:', canPostComment.value);
  console.log('currentUser:', currentUser.value);
  console.log('hasPermission("PostComment"):', hasPermission('PostComment'));
  console.log('normalizedMembers:', normalizedMembers.value);
  console.log('selectedDiscussion?.isArchived:', selectedDiscussion.value?.isArchived);
});
</script>

<style scoped>
.discussion-section {
  background: white;
  border-radius: 8px;
  padding: 1.2rem;
  margin-bottom: 1.2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
}

.title-icon {
  font-size: 1.1rem;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 1rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 5px;
  font-weight: 600;
  font-size: 0.85rem;
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
  border-radius: 8px;
  padding: 1rem;
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
  gap: 0.3rem;
  margin: 0 0 0.3rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.pin-icon {
  font-size: 0.8rem;
}

.discussion-description {
  margin: 0 0 1rem 0;
  color: #718096;
  line-height: 1.6;
}

.discussion-meta {
  display: flex;
  gap: 0.6rem;
  font-size: 0.75rem;
  color: #718096;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.meta-icon {
  font-size: 0.8rem;
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
  padding: 2rem 1.2rem 1.5rem 1.2rem;
  color: #718096;
  background: #f7fafc;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(66,153,225,0.07);
  margin: 1.2rem auto 0 auto;
  max-width: 450px;
  position: relative;
}

.empty-illustration {
  margin: 0 auto 1rem auto;
  width: 80px;
  height: 80px;
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
  font-size: 0.9rem;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  margin-top: 0.8rem;
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
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10000;
}

.discussion-detail-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #718096;
  padding: 0.3rem;
  border-radius: 4px;
  transition: color 0.3s ease;
}

.btn-close:hover {
  color: #e53e3e;
}

.modal-body {
  padding: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem;
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
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 5px;
  font-size: 0.85rem;
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
  gap: 0.3rem;
  margin: 0;
  font-size: 0.9rem;
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

.author-avatar-wrapper {
  position: relative;
  width: 1.5rem;
  height: 1.5rem;
}

.author-avatar-img {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e2e8f0;
}

.author-avatar-text {
  width: 1.5rem;
  height: 1.5rem;
  background: #4299e1;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
  border: 2px solid #e2e8f0;
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

.comment-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comment-edit-form textarea {
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 5px;
  font-size: 0.85rem;
  transition: border-color 0.3s ease;
  min-height: 50px; /* Ensure minimum height for the textarea */
  max-height: 120px; /* Max height for the textarea */
  overflow-y: auto;
}

.comment-edit-form textarea:focus {
  outline: none;
  border-color: #4299e1;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.comment-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.comment-action-buttons {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.btn-sm {
  padding: 0.3rem 0.5rem;
  font-size: 0.75rem;
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
  gap: 0.3rem;
  padding: 0.3rem 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #4a5568;
  font-size: 0.75rem;
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
  gap: 0.3rem;
  width: 100%;
  padding: 0.5rem 0.6rem;
  background: none;
  border: none;
  color: #4a5568;
  font-size: 0.75rem;
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
  font-size: 0.85rem;
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
  border-radius: 5px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  min-width: 80px;
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
  border-radius: 5px;
  padding: 0.5rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 130px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
