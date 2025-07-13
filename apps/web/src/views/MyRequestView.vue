<template>
  <div class="layout-wrapper">
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="my-requests-container">
          <!-- Header -->
          <div class="my-requests-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
            <div>
              <h1 class="requests-title">
                <span class="emoji">📋</span> Requests
              </h1>
              <p class="requests-desc">
                Manage your requests and assigned tasks
              </p>
            </div>
            <router-link to="/requests/create">
              <button class="btn btn-primary">
                <span class="material-icons" style="vertical-align: middle;">add_circle</span>
                Create New Request
              </button>
            </router-link>
          </div>

          <!-- Tabs -->
          <div class="tabs-container">
            <button
              @click="switchTab('my-requests')"
              :class="['tab-button', { active: activeTab === 'my-requests' }]"
            >
              <span class="material-icons">description</span>
              My Requests
              <span v-if="myRequestsCount > 0" class="badge">{{ myRequestsCount }}</span>
            </button>
            <button
              @click="switchTab('assigned-requests')"
              :class="['tab-button', { active: activeTab === 'assigned-requests' }]"
            >
              <span class="material-icons">assignment_ind</span>
              Private Request Assign To You
              <span v-if="assignedRequestsCount > 0" class="badge">{{ assignedRequestsCount }}</span>
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading requests...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-container">
            <div class="error-content">
              <div class="error-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h3>Oops! Something went wrong</h3>
              <p>{{ error }}</p>
              <button @click="fetchRequests" class="btn btn-secondary">Try Again</button>
            </div>
          </div>

          <!-- My Requests Tab -->
          <div v-else-if="activeTab === 'my-requests'">
            <!-- Search and Filter Bar for My Requests -->
            <div class="filter-bar">
              <div class="search-container">
                <i class="pi pi-search search-icon"></i>
                <input
                  v-model="myRequestsSearch"
                  type="text"
                  placeholder="Search requests..."
                  class="search-input"
                />
              </div>
              <select v-model="myRequestsStatusFilter" class="filter-select">
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select v-model="myRequestsVisibilityFilter" class="filter-select">
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button @click="clearMyRequestsFilters" class="btn btn-secondary btn-small">
                <i class="pi pi-times"></i>
                Clear
              </button>
            </div>

            <!-- Empty State for My Requests -->
            <div v-if="debugRequests.length === 0" class="empty-container">
              <div class="empty-content">
                <div class="empty-icon">
                  <i class="pi pi-file"></i>
                </div>
                <h3>No requests found</h3>
                <p>You haven't created any requests yet.</p>

              </div>
            </div>

            <!-- My Requests Table -->
            <div v-else class="requests-table-container">
              <div class="table-wrapper">
                <table class="requests-table">
                  <thead>
                  <tr>
                    <th @click="sortTable('id')" style="cursor: pointer;" class="text-xs font-semibold text-center" width="60">
                      ID
                    </th>
                    <th @click="sortTable('title')" style="cursor: pointer;" class="text-xs font-semibold text-left">
                      Title
                      <i :class="[ 'sort-icon', sortKey === 'title' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                    </th>
                    <th @click="sortTable('project')" style="cursor: pointer;" class="text-xs font-semibold text-left">
                      Project
                      <i :class="[ 'sort-icon', sortKey === 'project' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                    </th>
                    <th @click="sortTable('category')" style="cursor: pointer;" class="text-xs font-semibold text-left">
                      Category
                    </th>
                    <th @click="sortTable('dealAmount')" style="cursor: pointer;" class="text-xs font-semibold text-center th-flex" width="120">
                      <span class="th-flex">Deal Amount <i :class="[ 'sort-icon', sortKey === 'dealAmount' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" /></span>
                    </th>
                    <th @click="sortTable('deadline')" style="cursor: pointer;" class="text-xs font-semibold text-left" width="130">
                      Deadline
                      <i :class="[ 'sort-icon', sortKey === 'deadline' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                    </th>
                    <th class="text-xs font-semibold text-left">Status</th>
                    <th class="text-xs font-semibold text-left">Visibility</th>
                    <th class="text-xs font-semibold text-left">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(req, index) in paginatedMyRequests" :key="req.id" class="request-row table-row-hover">
                    <td class="text-center text-sm text-gray-700" width="60">{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
                    <td class="request-title text-sm text-gray-700 text-left"> <a href="#" @click.prevent="goToRequestDetail(req.id)">{{ req.title }}</a> </td>
                    <td class="text-sm text-gray-700 text-left">{{ req.project?.name || '-' }}</td>
                    <td class="text-sm text-gray-700 text-left">{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount text-center text-sm text-green-600 font-bold" width="120"><span class="deal-icon">💵</span>${{ req.dealAmount }}</td>
                    <td class="text-sm text-gray-500 italic text-left" width="130"><span class="deadline-icon">🗓</span> {{ formatDeadline(req.deadline) }}</td>
                    <td>
                        <span v-if="req.status === 'APPROVED'" class="status-badge status-approved custom-badge approved-badge">
                          ✅ Approved
                        </span>
                      <span v-else-if="req.status === 'PENDING'" class="status-badge status-pending custom-badge pending-badge">
                          ⏳ Pending
                        </span>
                      <span v-else :class="['status-badge', `status-${req.status.toLowerCase()}`]">
                          {{ formatStatus(req.status) }}
                        </span>
                    </td>
                    <td>
                      <span v-if="req.status === 'PENDING' && isRequestPublic(req.isPublic)" class="visibility-badge custom-badge public-badge">
                        🌐 Public
                      </span>
                      <span v-else-if="req.status === 'PENDING' && !isRequestPublic(req.isPublic)" class="visibility-badge custom-badge private-badge">
                        🔒 Private
                      </span>
                      <span v-else-if="isRequestPublic(req.isPublic)" class="visibility-badge custom-badge public-badge">
                        🌐 Public
                      </span>
                      <span v-else class="visibility-badge custom-badge private-badge">
                        🔒 Private
                      </span>
                    </td>
                    <td class="actions text-left">
                      <button @click="onCancel(req)" class="btn btn-small btn-danger" v-if="!req.project">
                        <i class="pi pi-times"></i>
                      </button>
                      <button v-if="canReview(req) && !req.project" @click="onReview(req)" class="btn btn-small btn-primary">
                        <i class="pi pi-eye"></i>
                      </button>
                      <router-link
                        v-if="req.isPublic && !req.project"
                        :to="{ name: 'request-registrants', params: { requestId: req.id } }"
                        class="btn btn-small btn-candidate"
                        :class="{ disabled: req.registrantCount === 0 }"
                        :title="req.registrantCount > 0 ? 'View registered candidates' : 'No candidates yet'"
                      >
                        <i class="pi pi-users"></i>
                        <span>Candidates</span>
                        <span v-if="typeof req.registrantCount === 'number'" class="badge">{{ req.registrantCount }}</span>
                      </router-link>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination-controls">
                <div class="pagination-info">
                  <span>
                    Showing {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredMyRequests.length) }} of {{ filteredMyRequests.length }} requests
                    ({{ totalMyPages }} page{{ totalMyPages > 1 ? 's' : '' }})
                  </span>
                </div>
                <div class="pagination-buttons">
                  <button @click="prevPage" :disabled="currentPage === 1" class="btn btn-secondary">
                    <i class="pi pi-chevron-left"></i> Previous
                  </button>
                  <span class="page-info">Page {{ currentPage }} of {{ totalMyPages }}</span>
                  <button @click="nextPage" :disabled="currentPage === totalMyPages" class="btn btn-secondary">
                    Next <i class="pi pi-chevron-right"></i>
                  </button>
                </div>
                <div class="page-size-selector">
                  <label for="pageSize">Show:</label>
                  <select id="pageSize" v-model="itemsPerPage" @change="currentPage = 1" class="page-size-select">
                    <option value="5">5</option>
                    <option value="7">7</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Assigned Requests Tab -->
          <div v-else-if="activeTab === 'assigned-requests'">
            <!-- Search and Filter Bar for Assigned Requests -->
            <div class="filter-bar">
              <div class="search-container">
                <i class="pi pi-search search-icon"></i>
                <input
                  v-model="assignedRequestsSearch"
                  type="text"
                  placeholder="Search assigned requests..."
                  class="search-input"
                />
              </div>
              <select v-model="assignedRequestsStatusFilter" class="filter-select">
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select v-model="assignedRequestsVisibilityFilter" class="filter-select">
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button @click="clearAssignedRequestsFilters" class="btn btn-secondary btn-small">
                <i class="pi pi-times"></i>
                Clear
              </button>
            </div>

            <!-- Empty State for Assigned Requests -->
            <div v-if="assignedRequests.length === 0" class="empty-container">
              <div class="empty-content">
                <div class="empty-icon">
                  <i class="pi pi-user"></i>
                </div>
                <h3>No assigned requests</h3>
                <p>You don't have any requests assigned to you at the moment.</p>
              </div>
            </div>

            <!-- Assigned Requests Table (giống My Requests) -->
            <div v-else class="requests-table-container">
              <div class="table-wrapper">
                <table class="requests-table">
                  <thead>
                  <tr>
                    <th @click="sortTable('id')" style="cursor: pointer;">
                      ID
                      <i :class="['sort-icon',sortKey === 'id'? sortOrder === 1? 'pi pi-sort-amount-up-alt'
                       : 'pi pi-sort-amount-down'
                       : 'pi pi-sort-alt']" />
                    </th>
                    <th @click="sortTable('title')" style="cursor: pointer;">
                      Title
                      <i
                        :class="[
    'sort-icon',
    sortKey === 'title'
      ? sortOrder === 1
        ? 'pi pi-sort-amount-up-alt'
        : 'pi pi-sort-amount-down'
      : 'pi pi-sort-alt'
  ]"
                      />
                    </th>
                    <th @click="sortTable('requester')" style="cursor: pointer;">
                      Requester
                      <i
                        :class="[
    'sort-icon',
    sortKey === 'requester'
      ? sortOrder === 1
        ? 'pi pi-sort-amount-up-alt'
        : 'pi pi-sort-amount-down'
      : 'pi pi-sort-alt'
  ]"
                      />
                    </th>
                    <th @click="sortTable('category')" style="cursor: pointer;">
                      Category
                      <i
                        :class="[
    'sort-icon',
    sortKey === 'category'
      ? sortOrder === 1
        ? 'pi pi-sort-amount-up-alt'
        : 'pi pi-sort-amount-down'
      : 'pi pi-sort-alt'
  ]"
                      />
                    </th>
                    <th @click="sortTable('dealAmount')" style="cursor: pointer;">
                      Deal Amount
                      <i
                        :class="[
    'sort-icon',
    sortKey === 'dealAmount'
      ? sortOrder === 1
        ? 'pi pi-sort-amount-up-alt'
        : 'pi pi-sort-amount-down'
      : 'pi pi-sort-alt'
  ]"
                      />
                    </th>
                    <th @click="sortTable('deadline')" style="cursor: pointer;">
                      Deadline
                      <i
                        :class="[
    'sort-icon',
    sortKey === 'deadline'
      ? sortOrder === 1
        ? 'pi pi-sort-amount-up-alt'
        : 'pi pi-sort-amount-down'
      : 'pi pi-sort-alt'
  ]"
                      />
                    </th>
                    <th>Status</th>
                    <th>Visibility</th>
                    <th>Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(req, index) in paginatedAssignedRequests" :key="req.id" class="request-row">
                    <td>{{ (currentAssignedPage - 1) * assignedItemsPerPage + index + 1 }}</td>
                    <td class="request-title">
                      <a href="#" @click.prevent="goToRequestDetail(req.id)">{{ req.title }}</a>
                    </td>
                    <td>{{ req.requester?.name || req.requester?.email || 'Unknown' }}</td>
                    <td>{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount">${{ formatAmount(req.dealAmount) }}</td>
                    <td>{{ formatDate(req.deadline) }}</td>
                    <td>
                        <span :class="['status-badge', getStatusClass(req.status)]">
                          {{ formatStatus(req.status) }}
                        </span>
                    </td>
                    <td>
                        <span v-if="req.status === 'PENDING'" :class="['visibility-badge', isRequestPublic(req.isPublic) ? 'visibility-public' : 'visibility-private']">
                          <i :class="isRequestPublic(req.isPublic) ? 'pi pi-globe' : 'pi pi-lock'"></i>
                          {{ isRequestPublic(req.isPublic) ? 'Public' : 'Private' }}
                        </span>
                      <span v-else class="visibility-badge visibility-private">
                          <i class="pi pi-lock"></i>
                          Private
                        </span>
                    </td>
                    <td class="actions">
                      <button
                        v-if="req.status === 'PENDING'"
                        @click="acceptRequest(req.id)"
                        class="btn btn-small btn-success"
                        :disabled="actionLoading"
                      >
                        Accept
                      </button>
                      <button
                        v-if="req.status === 'PENDING'"
                        @click="rejectRequest(req.id)"
                        class="btn btn-small btn-danger"
                        :disabled="actionLoading"
                      >
                        Reject
                      </button>
                      <button
                        v-if="req.status === 'APPROVED'"
                        @click="completeRequest(req.id)"
                        class="btn btn-small btn-primary"
                        :disabled="actionLoading"
                      >
                        Mark Complete
                      </button>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination-controls">
                <div class="pagination-info">
                  <span>Showing {{ (currentAssignedPage - 1) * assignedItemsPerPage + 1 }} to {{ Math.min(currentAssignedPage * assignedItemsPerPage, filteredAssignedRequests.length) }} of {{ filteredAssignedRequests.length }} requests</span>
                </div>
                <div class="pagination-buttons">
                  <button @click="prevAssignedPage" :disabled="currentAssignedPage === 1" class="btn btn-secondary">
                    <i class="pi pi-chevron-left"></i> Previous
                  </button>
                  <span class="page-info">Page {{ currentAssignedPage }} of {{ totalAssignedPages }}</span>
                  <button @click="nextAssignedPage" :disabled="currentAssignedPage === totalAssignedPages" class="btn btn-secondary">
                    Next <i class="pi pi-chevron-right"></i>
                  </button>
                </div>
                <div class="page-size-selector">
                  <label for="assignedPageSize">Show:</label>
                  <select id="assignedPageSize" v-model="assignedItemsPerPage" @change="currentAssignedPage = 1" class="page-size-select">
                    <option value="3">3</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialogs -->
          <ReviewRequestDialog v-if="showReview" :request="selectedRequest" @close="showReview = false" @reviewed="onRequestReviewed" />
          <CancelRequestDialog v-if="showCancel" :request="selectedRequest" @close="showCancel = false" @cancelled="onRequestCancelled" />
        </div>
      </div>
    </div>
    <Footer />
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import EditRequestForm from '../views/RequestEditView.vue'
import ReviewRequestDialog from '../components/ReviewRequestDialog.vue'
import CancelRequestDialog from '../components/CancelRequestDialog.vue'

const requests = ref([])
const loading = ref(false)
const error = ref(null)
const showEdit = ref(false)
const showReview = ref(false)
const showCancel = ref(false)
const selectedRequest = ref(null)
const toast = useToast()
const activeTab = ref('my-requests')
const myRequests = ref([])
const assignedRequests = ref([])
const actionLoading = ref(false)
const router = useRouter()

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(7)
const currentAssignedPage = ref(1)
const assignedItemsPerPage = ref(7)

// Search and Filter state
const myRequestsSearch = ref('')
const myRequestsStatusFilter = ref('')
const myRequestsVisibilityFilter = ref('')
const assignedRequestsSearch = ref('')
const assignedRequestsStatusFilter = ref('')
const assignedRequestsVisibilityFilter = ref('')

// Computed properties for counts
const myRequestsCount = computed(() => myRequests.value.filter(req => req.status !== 'CANCELLED').length)
const assignedRequestsCount = computed(() => assignedRequests.value.length)
//Sort
const sortKey = ref('')
const sortOrder = ref(1)

function sortTable(key) {
  if (sortKey.value === key) {
    sortOrder.value *= -1
  } else {
    sortKey.value = key
    sortOrder.value = 1
  }
}

// Debug computed property
const debugRequests = computed(() => {
  console.log('Debug - My requests with isPublic:', myRequests.value.map(req => ({
    id: req.id,
    title: req.title,
    isPublic: req.isPublic,
    type: typeof req.isPublic
  })))
  return myRequests.value
})

// Filtered My Requests
const filteredMyRequests = computed(() => {
  let filtered = debugRequests.value

  // Search filter
  if (myRequestsSearch.value) {
    const searchTerm = myRequestsSearch.value.toLowerCase()
    filtered = filtered.filter(req =>
      req.title?.toLowerCase().includes(searchTerm) ||
      req.project?.name?.toLowerCase().includes(searchTerm) ||
      req.category?.name?.toLowerCase().includes(searchTerm) ||
      req.id?.toString().includes(searchTerm)
    )
  }

  // Status filter
  if (myRequestsStatusFilter.value) {
    filtered = filtered.filter(req => req.status === myRequestsStatusFilter.value)
  }

  // Visibility filter
  if (myRequestsVisibilityFilter.value) {
    if (myRequestsVisibilityFilter.value === 'public') {
      filtered = filtered.filter(req => isRequestPublic(req.isPublic))
    } else if (myRequestsVisibilityFilter.value === 'private') {
      filtered = filtered.filter(req => !isRequestPublic(req.isPublic))
    }
  }

  return filtered
})

// Filtered Assigned Requests
const filteredAssignedRequests = computed(() => {
  let filtered = assignedRequests.value

  // Search filter
  if (assignedRequestsSearch.value) {
    const searchTerm = assignedRequestsSearch.value.toLowerCase()
    filtered = filtered.filter(req =>
      req.title?.toLowerCase().includes(searchTerm) ||
      req.requester?.name?.toLowerCase().includes(searchTerm) ||
      req.requester?.email?.toLowerCase().includes(searchTerm) ||
      req.category?.name?.toLowerCase().includes(searchTerm) ||
      req.id?.toString().includes(searchTerm)
    )
  }

  // Status filter
  if (assignedRequestsStatusFilter.value) {
    filtered = filtered.filter(req => req.status === assignedRequestsStatusFilter.value)
  }

  // Visibility filter
  if (assignedRequestsVisibilityFilter.value) {
    if (assignedRequestsVisibilityFilter.value === 'public') {
      filtered = filtered.filter(req => isRequestPublic(req.isPublic))
    } else if (assignedRequestsVisibilityFilter.value === 'private') {
      filtered = filtered.filter(req => !isRequestPublic(req.isPublic))
    }
  }

  return filtered.filter(req => req.status !== 'CANCELLED')
})

// Pagination computed properties for My Requests
const paginatedMyRequests = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredMyRequests.value.slice(start, end)
})

const totalMyPages = computed(() => {
  return Math.ceil(filteredMyRequests.value.length / itemsPerPage.value)
})

// Pagination computed properties for Assigned Requests
const paginatedAssignedRequests = computed(() => {
  const start = (currentAssignedPage.value - 1) * assignedItemsPerPage.value
  const end = start + assignedItemsPerPage.value
  return filteredAssignedRequests.value.slice(start, end)
})

const totalAssignedPages = computed(() => {
  return Math.ceil(filteredAssignedRequests.value.length / assignedItemsPerPage.value)
})

// Pagination methods
function goToPage(page) {
  currentPage.value = page
}

function goToAssignedPage(page) {
  currentAssignedPage.value = page
}

function nextPage() {
  if (currentPage.value < totalMyPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextAssignedPage() {
  if (currentAssignedPage.value < totalAssignedPages.value) {
    currentAssignedPage.value++
  }
}

function prevAssignedPage() {
  if (currentAssignedPage.value > 1) {
    currentAssignedPage.value--
  }
}

// Reset pagination when switching tabs
function switchTab(tab) {
  activeTab.value = tab
  currentPage.value = 1
  currentAssignedPage.value = 1
}

// Clear filter functions
function clearMyRequestsFilters() {
  myRequestsSearch.value = ''
  myRequestsStatusFilter.value = ''
  myRequestsVisibilityFilter.value = ''
  currentPage.value = 1
}

function clearAssignedRequestsFilters() {
  assignedRequestsSearch.value = ''
  assignedRequestsStatusFilter.value = ''
  assignedRequestsVisibilityFilter.value = ''
  currentAssignedPage.value = 1
}

function fetchRequests() {
  loading.value = true
  error.value = null

  // Fetch my requests
  axios.get('/api/requests/myRequests')
    .then(res => {
      console.log('My requests data received:', res.data)
      myRequests.value = res.data
    })
    .catch(err => {
      console.error('Error fetching my requests:', err)
    })

  // Fetch assigned requests
  axios.get('/api/requests/private')
    .then(res => {
      console.log('Assigned requests data received:', res.data)
      assignedRequests.value = res.data
    })
    .catch(err => {
      // If the error is "You have no request", treat it as empty state
      if (err.response?.data?.message === 'You have no request') {
        assignedRequests.value = []
      } else {
        console.error('Error fetching assigned requests:', err)
      }
    })
    .finally(() => {
      loading.value = false
    })
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDeadline(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function onReview(req) {
  selectedRequest.value = req
  showReview.value = true
}

function onCancel(req) {
  selectedRequest.value = req
  showCancel.value = true
}

function canReview(req) {
  // Tùy quyền, ví dụ: return req.status === 'pending' && userIsAdmin
  return false
}

function onRequestReviewed() {
  fetchRequests()
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Request reviewed successfully',
    life: 3000
  })
}

function onRequestCancelled() {
  fetchRequests()
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Request cancelled successfully',
    life: 3000
  })
}

function getStatusClass(status) {
  const classMap = {
    'PENDING': 'status-pending',
    'APPROVED': 'status-approved',
    'REJECTED': 'status-rejected',
    'COMPLETED': 'status-completed',
    'CANCELLED': 'status-cancelled'
  }
  return classMap[status] || 'status-pending'
}

function formatStatus(status) {
  const statusMap = {
    'PENDING': 'Pending',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled'
  }
  return statusMap[status] || status
}

function getDeadlineClass(deadline) {
  if (!deadline) return ''
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24))

  if (daysUntilDeadline < 0) return 'deadline-overdue'
  if (daysUntilDeadline <= 3) return 'deadline-urgent'
  if (daysUntilDeadline <= 7) return 'deadline-warning'
  return 'deadline-normal'
}

function formatAmount(amount) {
  if (!amount) return '0.00'
  return parseFloat(amount).toFixed(2)
}

async function acceptRequest(requestId) {
  actionLoading.value = true
  try {
    await axios.post(`/api/requests/${requestId}/update`, {
      status: 'APPROVED'
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request accepted successfully',
      life: 3000
    })
    fetchRequests()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to accept request',
      life: 3000
    })
  } finally {
    actionLoading.value = false
  }
}

async function rejectRequest(requestId) {
  actionLoading.value = true
  try {
    await axios.post(`/api/requests/${requestId}/update`, {
      status: 'REJECTED'
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request rejected successfully',
      life: 3000
    })
    fetchRequests()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to reject request',
      life: 3000
    })
  } finally {
    actionLoading.value = false
  }
}

async function completeRequest(requestId) {
  actionLoading.value = true
  try {
    await axios.post(`/api/requests/${requestId}/update`, {
      status: 'COMPLETED'
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request marked as completed',
      life: 3000
    })
    fetchRequests()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to complete request',
      life: 3000
    })
  } finally {
    actionLoading.value = false
  }
}

function isRequestPublic(isPublic) {
  // Hỗ trợ cả số, string và boolean
  return isPublic == 1 || isPublic === true;
}

function goToRequestDetail(requestId) {
  router.push({ name: 'request-detail', params: { requestId } })
}

onMounted(fetchRequests)
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main-content {
  display: flex;
  flex: 1;
  margin-left: 15rem;
}
.content {
  flex: 1;
  padding: 32px 20px;
  background: #f6f8fa;
}
.my-requests-container {
  max-width: 1200px;
  margin: 0 auto;
}
.requests-header {
  margin-bottom: 32px;
}
.requests-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.emoji {
  font-size: 2.5rem;
}
.requests-desc {
  font-size: 1.1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-content,
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-icon,
.empty-icon {
  font-size: 3rem;
  color: #ef4444;
}

.empty-icon {
  color: #9ca3af;
}

.requests-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.requests-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.requests-table th {
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.requests-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.request-row:hover {
  background: #f8fafc;
}

.request-title {
  font-weight: 500;
  color: #1e293b;
}

.deal-amount {
  font-weight: 600;
  color: #059669;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-completed {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.status-cancelled {
  background: #f3f4f6;
  color: #374151;
}

.visibility-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.visibility-public {
  background: #dbeafe;
  color: #1e40af;
}

.visibility-private {
  background: #fef3c7;
  color: #92400e;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tabs-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  background: #f3f4f6;
  color: #6b7280;
  position: relative;
}

.tab-button:hover {
  background: #e5e7eb;
  color: #374151;
}

.tab-button.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.tab-button .material-icons {
  font-size: 18px;
}

.badge {
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.25rem;
}

.assigned-requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.request-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.request-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #e5e7eb;
}

.request-card.status-pending::before {
  background: #f59e0b;
}

.request-card.status-approved::before {
  background: #10b981;
}

.request-card.status-rejected::before {
  background: #ef4444;
}

.request-card.status-completed::before {
  background: #3b82f6;
}

.request-card.status-cancelled::before {
  background: #6b7280;
}

.request-header {
  margin-bottom: 1rem;
}

.request-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.request-title h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
  margin-right: 1rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-completed {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.status-cancelled {
  background: #f3f4f6;
  color: #374151;
}

.request-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #64748b;
}

.requester,
.category {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.request-content {
  margin-bottom: 1.5rem;
}

.description {
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.request-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #64748b;
  font-weight: 500;
  font-size: 0.875rem;
}

.detail-value {
  color: #1e293b;
  font-weight: 600;
  font-size: 0.875rem;
}

.deadline-overdue {
  color: #ef4444;
}

.deadline-urgent {
  color: #f59e0b;
}

.deadline-warning {
  color: #f97316;
}

.deadline-normal {
  color: #10b981;
}

.request-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.pagination-controls button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pagination-controls button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  flex: 1;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-info {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  padding: 0 0.5rem;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.page-size-selector label {
  font-weight: 500;
}

.page-size-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
}

.page-size-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.filter-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  flex-wrap: wrap;
}

.search-container {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  min-width: 120px;
  transition: border-color 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

@media (max-width: 768px) {
  .tabs-container {
    flex-direction: column;
    gap: 0.5rem;
  }

  .tab-button {
    justify-content: center;
  }

  .filter-bar {
    flex-direction: column;
    gap: 0.75rem;
  }

  .search-container {
    width: 100%;
    min-width: unset;
  }

  .filter-select {
    width: 100%;
    min-width: unset;
  }

  .assigned-requests-grid {
    grid-template-columns: 1fr;
  }

  .request-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .request-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .pagination-controls {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .pagination-info {
    order: 1;
  }

  .pagination-buttons {
    order: 2;
    justify-content: center;
  }

  .page-size-selector {
    order: 3;
    justify-content: center;
  }
}

.btn-candidate {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  transition: background 0.2s;
  position: relative;
  text-decoration: none;
}
.btn-candidate .pi-users {
  font-size: 16px;
}
.btn-candidate .badge {
  background: #f59e42;
  color: #fff;
  border-radius: 8px;
  padding: 2px 7px;
  font-size: 12px;
  margin-left: 4px;
  font-weight: 600;
}
.btn-candidate.disabled,
.btn-candidate[disabled] {
  background: #cbd5e1;
  color: #64748b;
  pointer-events: none;
  opacity: 0.7;
}
.btn-candidate:hover:not(.disabled) {
  background: #1d4ed8;
}
.sort-icon {
  margin-left: 6px;
  font-size: 0.85rem;
  color: #9ca3af;
}
th:hover .sort-icon {
  color: #1f2937;
}
.deadline-icon {
  margin-right: 4px;
  font-size: 1.1em;
  vertical-align: middle;
}
.custom-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.92em;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}
.approved-badge {
  background: #d1fae5;
  color: #15803d;
}
.pending-badge {
  background: #fef9c3;
  color: #b45309;
}
.public-badge {
  background: #eff6ff;
  color: #1d4ed8;
}
.private-badge {
  background: #fef3c7;
  color: #92400e;
}
.table-row-hover:hover {
  background: #f9fafb;
}
.deal-amount {
  color: #16a34a !important;
  font-weight: bold;
}
.deal-icon {
  margin-right: 3px;
  font-size: 1.1em;
  vertical-align: middle;
}
.th-flex {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
</style>
