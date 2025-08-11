<template>
  <div class="project-activity-tab">
    <!-- Activity Header -->
    <div class="activity-header">
      <div class="activity-filters">
        <button class="filter-btn" @click="showFilters = !showFilters">
          <span class="icon">🔍</span>
          Filters
        </button>
        <div class="time-filter">
          <select v-model="selectedTimeRange" @change="loadActivities">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Filters Panel -->
    <div v-if="showFilters" class="filters-panel">
      <div class="filter-group">
        <label>Activity Type:</label>
        <div class="filter-options">
          <label v-for="type in activityTypes" :key="type.value" class="filter-option">
            <input
              type="checkbox"
              v-model="selectedActivityTypes"
              :value="type.value"
              @change="loadActivities"
            />
            {{ type.label }}
          </label>
        </div>
      </div>
      <div class="filter-group">
        <label>User:</label>
        <select v-model="selectedUser" @change="loadActivities">
          <option value="">All Users</option>
          <option v-for="member in projectMembers" :key="member.id" :value="member.id">
            {{ member.username }}
          </option>
        </select>
      </div>
    </div>

    <!-- Activity List -->
    <div class="activity-list">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading activities...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button @click="loadActivities" class="btn btn-primary">Retry</button>
      </div>

      <div v-else-if="activities.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No activities yet</h3>
        <p>Activities will appear here when users perform actions in this project.</p>
      </div>

      <div v-else class="activities-container">
        <div
          v-for="(group, date) in groupedActivities"
          :key="date"
          class="activity-group"
        >
          <div class="activity-date">{{ formatDate(date) }}</div>

          <div
            v-for="activity in group"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-avatar">
              <img
                v-if="activity.user.avatarUrl"
                :src="activity.user.avatarUrl"
                :alt="activity.user.fullName || activity.user.username"
                class="avatar-img"
              />
              <div v-else class="avatar-placeholder">
                {{ (activity.user.fullName || activity.user.username).charAt(0).toUpperCase() }}
              </div>
            </div>

            <div class="activity-content">
              <div class="activity-description">
                <span class="user-name">{{ activity.user.fullName || activity.user.username }}</span>
                {{ getActivityDescription(activity) }}
              </div>

              <div class="activity-meta">
                <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
                <button
                  v-if="activity.canUndo"
                  @click="undoActivity(activity.id)"
                  class="undo-btn"
                  :disabled="undoing === activity.id"
                >
                  {{ undoing === activity.id ? 'Undoing...' : 'Undo' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMoreActivities && !loading" class="load-more">
      <button @click="loadMoreActivities" class="btn btn-outline">
        Load More Activities
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, parseISO } from 'date-fns'
import axios from '../api'
import { SUPPORTED_LANGUAGES } from '../utils/languages'

// Props
interface Props {
  projectId: number
  branchId?: number
  project: any
  members: any[]
  currentUser: any
}

const props = defineProps<Props>()

// Reactive data
const loading = ref(false)
const error = ref('')
const activities = ref<any[]>([])
const showFilters = ref(false)
const selectedTimeRange = ref('all')
const selectedActivityTypes = ref<string[]>([])
const selectedUser = ref('')
const undoing = ref<string | null>(null)
const page = ref(1)
const hasMoreActivities = ref(true)

// Activity types
const activityTypes = [
  { value: 'file_upload', label: 'File Uploads' },
  { value: 'file_delete', label: 'File Deletions' },
  { value: 'translation_add', label: 'Translation Additions' },
  { value: 'translation_edit', label: 'Translation Edits' },
  { value: 'task_create', label: 'Task Creation' },
  { value: 'task_status_change', label: 'Task Status Changes' },
  { value: 'member_add', label: 'Member Additions' },
  { value: 'member_remove', label: 'Member Removals' },
  { value: 'member_join', label: 'Member Joins' },
  { value: 'role_change', label: 'Role Changes' },
  { value: 'project_update', label: 'Project Updates' },
  { value: 'discussion_create', label: 'Discussion Creation' },
  { value: 'discussion_reply', label: 'Discussion Replies' }
]

// Computed
const projectMembers = computed(() => props.members || [])

const groupedActivities = computed(() => {
  const groups: Record<string, any[]> = {}

  activities.value.forEach(activity => {
    const date = format(parseISO(activity.createdAt), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
  })

  return groups
})

// Methods
const loadActivities = async () => {
  try {
    loading.value = true
    error.value = ''

    const params = new URLSearchParams({
      page: page.value.toString(),
      timeRange: selectedTimeRange.value,
      ...(selectedUser.value && { userId: selectedUser.value }),
      ...(selectedActivityTypes.value.length > 0 && {
        types: selectedActivityTypes.value.join(',')
      })
    })

    const response = await axios.get(`/projects/${props.projectId}/activities?${params}`)

    const data = response.data

    if (page.value === 1) {
      activities.value = data.activities
    } else {
      activities.value.push(...data.activities)
    }

    hasMoreActivities.value = data.hasMore
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to load activities'
  } finally {
    loading.value = false
  }
}

const loadMoreActivities = async () => {
  page.value++
  await loadActivities()
}

const undoActivity = async (activityId: string) => {
  try {
    undoing.value = activityId

    const response = await axios.post(`/projects/${props.projectId}/activities/${activityId}/undo`)

    // Reload activities after undo
    await loadActivities()
  } catch (err: any) {
    console.error('Failed to undo activity:', err)
  } finally {
    undoing.value = null
  }
}

// Helper function to get language name from code
const getLanguageName = (languageCode: string): string => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode)
  return language ? language.name : languageCode
}

const getActivityDescription = (activity: any) => {
  switch (activity.type) {
    case 'file_upload':
      return `uploaded the file "${activity.details.fileName}" with ${activity.details.stringCount} new strings for translation`
    case 'file_delete':
      return `deleted the file "${activity.details.fileName}"`
    case 'translation_add':
      return `added translation "${activity.details.translation}" into ${getLanguageName(activity.details.language)}`
    case 'translation_edit':
      return `edited translation in ${getLanguageName(activity.details.language)}`
    case 'task_create':
      return `created task "${activity.details.taskName}"`
    case 'task_status_change':
      return `changed the status of ${activity.details.taskCount} tasks for ${getLanguageName(activity.details.language)}`
    case 'member_add':
      return `added ${activity.details.memberName} to the project`
    case 'member_remove':
      return `removed ${activity.details.memberName} from the project`
    case 'member_join':
      return `joined the project`
    case 'role_change':
      return `changed ${activity.details.memberName}'s role to ${activity.details.newRole}`
    case 'project_update':
      return `updated project settings`
    case 'discussion_create':
      return `created discussion "${activity.details.discussionTitle}"`
    case 'discussion_reply':
      return `replied to discussion "${activity.details.discussionTitle}"`
    default:
      return 'performed an action'
  }
}

const formatDate = (dateString: string) => {
  const date = parseISO(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
    return 'Today'
  } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
    return 'Yesterday'
  } else {
    return format(date, 'MMM dd, yyyy')
  }
}

const formatTime = (dateString: string) => {
  return format(parseISO(dateString), 'HH:mm')
}

// Watchers
watch(() => props.projectId, () => {
  page.value = 1
  loadActivities()
})

// Lifecycle
onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.project-activity-tab {
  padding: 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.activity-filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.time-filter select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}

.filters-panel {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.filter-group {
  margin-bottom: 12px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  color: #374151;
  font-size: 12px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
}

.filter-option input[type="checkbox"] {
  margin: 0;
  transform: scale(0.8);
}

.activity-list {
  min-height: 150px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 16px;
  text-align: center;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 14px;
}

.empty-state p {
  color: #6b7280;
  margin: 0;
  font-size: 12px;
}

.activities-container {
  max-height: 500px;
  overflow-y: auto;
}

.activity-group {
  margin-bottom: 20px;
}

.activity-date {
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 12px;
}

.activity-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f9fafb;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-avatar {
  flex-shrink: 0;
}

.avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-description {
  margin-bottom: 4px;
  line-height: 1.4;
  color: #374151;
  font-size: 12px;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 12px;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.activity-time {
  font-size: 10px;
  color: #6b7280;
}

.undo-btn {
  font-size: 10px;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.undo-btn:hover {
  color: #2563eb;
}

.undo-btn:disabled {
  color: #9ca3af;
  cursor: not-allowed;
  text-decoration: none;
}

.load-more {
  text-align: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-outline {
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.btn-outline:hover {
  background: #3b82f6;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .activity-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .activity-item {
    flex-direction: column;
    gap: 6px;
  }

  .activity-meta {
    justify-content: space-between;
  }
}
</style>
