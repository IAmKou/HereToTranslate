<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <Navbar />
    <div class="main-content">
      <Sidebar v-model:collapsed="isSidebarCollapsed" />
      <div class="content">
        <div class="project-invitations-view">
          <!-- Header Section -->
          <div class="page-header">
            <div class="header-content">
              <div class="header-left">
                <div class="header-icon">
                  <i class="pi pi-envelope"></i>
                </div>
                <div class="header-text">
                  <h1>Project Invitations</h1>
                  <p class="subtitle">Manage your project invitations and join new projects</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-section">
            <!-- Filter Tabs -->
            <div class="filter-tabs">
              <button
                v-for="filter in filters"
                :key="filter.value"
                @click="activeFilter = filter.value"
                class="filter-tab"
                :class="{ active: activeFilter === filter.value }"
              >
                {{ filter.label }}
                <span v-if="filter.count > 0" class="count-badge">{{ filter.count }}</span>
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <p>Loading invitations...</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredInvitations.length === 0" class="empty-state">
              <i class="pi pi-inbox"></i>
              <h3>No invitations found</h3>
              <p>{{ getEmptyStateMessage() }}</p>
            </div>

            <!-- Invitations List -->
            <div v-else class="invitations-list">
              <div
                v-for="invitation in filteredInvitations"
                :key="invitation.id"
                class="invitation-card"
                :class="{ 'expired': isExpired(invitation) }"
              >
                <div class="invitation-header">
                  <div class="project-info">
                    <h3>{{ invitation.project?.name }}</h3>
                    <p class="project-description">{{ invitation.project?.description }}</p>
                  </div>
                  <div class="invitation-status">
                    <span class="status-badge" :class="invitation.status">
                      {{ getStatusLabel(invitation.status) }}
                    </span>
                  </div>
                </div>

                <div class="invitation-details">
                  <div class="detail-item">
                    <i class="pi pi-user"></i>
                    <span><strong>From:</strong> {{ invitation.invitedByUser?.fullName || invitation.invitedByUser?.username }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="pi pi-calendar"></i>
                    <span><strong>Invited:</strong> {{ formatDate(invitation.createdAt) }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="pi pi-clock"></i>
                    <span><strong>Expires:</strong> {{ formatDate(invitation.expiresAt) }}</span>
                  </div>
                  <div v-if="invitation.message" class="detail-item">
                    <i class="pi pi-comment"></i>
                    <span><strong>Message:</strong> {{ invitation.message }}</span>
                  </div>
                </div>

                <div class="invitation-actions">
                  <button
                    v-if="invitation.status === 'pending' && !isExpired(invitation)"
                    @click="acceptInvitation(invitation)"
                    class="action-btn accept-btn"
                    :disabled="processingInvitation === invitation.id"
                  >
                    <i v-if="processingInvitation === invitation.id" class="pi pi-spin pi-spinner"></i>
                    <i v-else class="pi pi-check"></i>
                    Accept Invitation
                  </button>
                  <button
                    v-if="invitation.status === 'pending' && !isExpired(invitation)"
                    @click="declineInvitation(invitation)"
                    class="action-btn decline-btn"
                    :disabled="processingInvitation === invitation.id"
                  >
                    <i v-if="processingInvitation === invitation.id" class="pi pi-spin pi-spinner"></i>
                    <i v-else class="pi pi-times"></i>
                    Decline
                  </button>
                  <button
                    v-if="invitation.status === 'pending' && !isExpired(invitation)"
                    @click="viewProject(invitation.project?.id)"
                    class="action-btn view-btn"
                  >
                    <i class="pi pi-eye"></i>
                    View Project
                  </button>
                </div>
              </div>
            </div>

            <!-- Load More Button -->
            <div v-if="hasMore && !loading" class="load-more-section">
              <button @click="loadMoreInvitations" class="load-more-btn">
                Load More Invitations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { projectInvitationService, type ProjectInvitation } from '../services/project-invitation.service'

const router = useRouter()
const toast = useToast()

// Sidebar state
const isSidebarCollapsed = ref(false)

// Data state
const invitations = ref<ProjectInvitation[]>([])
const loading = ref(true)
const processingInvitation = ref<string | null>(null)
const hasMore = ref(true)
const currentPage = ref(1)

// Filter state
const activeFilter = ref<'all' | 'pending' | 'accepted' | 'declined' | 'expired'>('all')

// Computed
const filters = computed(() => [
  { value: 'all', label: 'All', count: invitations.value.length },
  { value: 'pending', label: 'Pending', count: invitations.value.filter(inv => inv.status === 'pending' && !isExpired(inv)).length },
  { value: 'accepted', label: 'Accepted', count: invitations.value.filter(inv => inv.status === 'accepted').length },
  { value: 'declined', label: 'Declined', count: invitations.value.filter(inv => inv.status === 'declined').length },
  { value: 'expired', label: 'Expired', count: invitations.value.filter(inv => inv.status === 'pending' && isExpired(inv)).length }
])

const filteredInvitations = computed(() => {
  if (activeFilter.value === 'all') {
    return invitations.value
  }

  return invitations.value.filter(invitation => {
    if (activeFilter.value === 'expired') {
      return invitation.status === 'pending' && isExpired(invitation)
    }
    return invitation.status === activeFilter.value
  })
})

// Methods
const loadInvitations = async (reset = true) => {
  try {
    if (reset) {
      loading.value = true
      invitations.value = []
      currentPage.value = 1
    }

    const response = await projectInvitationService.getMyInvitations()
    if (reset) {
      invitations.value = response.invitations
    } else {
      invitations.value.push(...response.invitations)
    }

    hasMore.value = response.invitations.length > 0
  } catch (error) {
    console.error('Error loading invitations:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load invitations',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const loadMoreInvitations = async () => {
  currentPage.value++
  await loadInvitations(false)
}

const acceptInvitation = async (invitation: ProjectInvitation) => {
  processingInvitation.value = invitation.id
  try {
    await projectInvitationService.respondToInvitation(invitation.id, 'accepted')

    // Update local state
    const index = invitations.value.findIndex(inv => inv.id === invitation.id)
    if (index > -1) {
      invitations.value[index].status = 'accepted'
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `You've successfully joined ${invitation.project?.name}`,
      life: 3000
    })
  } catch (error: any) {
    console.error('Error accepting invitation:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to accept invitation',
      life: 3000
    })
  } finally {
    processingInvitation.value = null
  }
}

const declineInvitation = async (invitation: ProjectInvitation) => {
  processingInvitation.value = invitation.id
  try {
    await projectInvitationService.respondToInvitation(invitation.id, 'declined')

    // Update local state
    const index = invitations.value.findIndex(inv => inv.id === invitation.id)
    if (index > -1) {
      invitations.value[index].status = 'declined'
    }

    toast.add({
      severity: 'info',
      summary: 'Declined',
      detail: `You've declined the invitation to ${invitation.project?.name}`,
      life: 3000
    })
  } catch (error: any) {
    console.error('Error declining invitation:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to decline invitation',
      life: 3000
    })
  } finally {
    processingInvitation.value = null
  }
}

const viewProject = (projectId?: string) => {
  if (projectId) {
    router.push(`/projects/${projectId}`)
  }
}

const isExpired = (invitation: ProjectInvitation): boolean => {
  return new Date(invitation.expiresAt) < new Date()
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired'
  }
  return labels[status] || status
}

const getEmptyStateMessage = (): string => {
  const messages: Record<string, string> = {
    all: 'You don\'t have any project invitations yet.',
    pending: 'You don\'t have any pending invitations.',
    accepted: 'You haven\'t accepted any invitations yet.',
    declined: 'You haven\'t declined any invitations.',
    expired: 'You don\'t have any expired invitations.'
  }
  return messages[activeFilter.value] || 'No invitations found.'
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', dateString, error)
    return 'Invalid Date'
  }
}

onMounted(() => {
  loadInvitations()
})
</script>

<style scoped>
/* Layout Structure */
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8fafc;
}

.main-content {
  display: flex;
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.2s cubic-bezier(.4,0,.2,1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
}

.content {
  flex: 1;
  background: #f8fafc;
  min-height: calc(100vh - 70px);
}

/* Project Invitations View */
.project-invitations-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Page Header */
.page-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  padding: 24px 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.header-text h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 4px 0 0 0;
  color: #64748b;
  font-size: 14px;
}

/* Main Section */
.main-section {
  flex: 1;
  padding: 24px 32px;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
}

.filter-tab {
  background: transparent;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-tab:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

.filter-tab.active {
  background: #3b82f6;
  color: white;
}

.count-badge {
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.loading-state i {
  font-size: 32px;
  margin-bottom: 16px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #64748b;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #475569;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Invitations List */
.invitations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invitation-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
}

.invitation-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.invitation-card.expired {
  opacity: 0.6;
  background: #f8fafc;
}

.invitation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.project-description {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.accepted {
  background: #d1fae5;
  color: #059669;
}

.status-badge.declined {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.expired {
  background: #f3f4f6;
  color: #6b7280;
}

.invitation-details {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #475569;
}

.detail-item i {
  color: #64748b;
  font-size: 12px;
}

.invitation-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.accept-btn {
  background: #10b981;
  color: white;
}

.accept-btn:hover:not(:disabled) {
  background: #059669;
}

.decline-btn {
  background: #ef4444;
  color: white;
}

.decline-btn:hover:not(:disabled) {
  background: #dc2626;
}

.view-btn {
  background: #3b82f6;
  color: white;
}

.view-btn:hover {
  background: #2563eb;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Load More Section */
.load-more-section {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.load-more-btn {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }

  .page-header {
    padding: 16px 20px;
  }

  .main-section {
    padding: 16px 20px;
  }

  .filter-tabs {
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .invitation-header {
    flex-direction: column;
    gap: 12px;
  }

  .invitation-actions {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }
}
</style>
