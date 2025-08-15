<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <Navbar />
    <div class="main-content">
      <Sidebar :collapsed="sidebarCollapsed" @update:collapsed="sidebarCollapsed = $event" />
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
            <button
              @click="switchTab('my-registrations')"
              :class="['tab-button', { active: activeTab === 'my-registrations' }]"
            >
              <span class="material-icons">history</span>
              My Registrations
              <span v-if="myRegistrationsCount > 0" class="badge">{{ myRegistrationsCount }}</span>
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
              <div class="error-actions">
                <button @click="fetchRequests" class="btn btn-secondary">Try Again</button>
                <button @click="debugConnection" class="btn btn-primary">Debug Connection</button>
              </div>
            </div>
          </div>

          <!-- My Requests Tab -->
          <div v-else-if="activeTab === 'my-requests'">
            <!-- Search and Filter Bar for My Requests -->
            <div class="filter-bar">
              <div class="search-container">
                <div class="search-icon-wrapper">
                  <i class="pi pi-search search-icon"></i>
                </div>
                <input
                  v-model="myRequestsSearch"
                  type="text"
                  placeholder="Search requests..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <div class="select-wrapper">
                  <select v-model="myRequestsStatusFilter" class="filter-select">
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <i class="pi pi-chevron-down select-arrow"></i>
                </div>
                <div class="select-wrapper">
                  <select v-model="myRequestsVisibilityFilter" class="filter-select">
                    <option value="">All Visibility</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <i class="pi pi-chevron-down select-arrow"></i>
                </div>
                <button @click="clearMyRequestsFilters" class="clear-btn">
                  <span class="clear-icon">✕</span>
                  <span class="clear-text">Clear</span>
                </button>
              </div>
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
                    <th @click="sortTable('id')" class="table-header sortable" width="60">
                      <div class="header-content">
                        <span>ID</span>
                        <i :class="[ 'sort-icon', sortKey === 'id' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('title')" class="table-header sortable">
                      <div class="header-content">
                        <span>Title</span>
                        <i :class="[ 'sort-icon', sortKey === 'title' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('project')" class="table-header sortable">
                      <div class="header-content">
                        <span>Project</span>
                        <i :class="[ 'sort-icon', sortKey === 'project' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th class="table-header">
                      <span>Category</span>
                    </th>
                    <th @click="sortTable('dealAmount')" class="table-header sortable" width="120">
                      <div class="header-content">
                        <span>Deal Amount</span>
                        <i :class="[ 'sort-icon', sortKey === 'dealAmount' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('deadline')" class="table-header sortable" width="130">
                      <div class="header-content">
                        <span>Deadline</span>
                        <i :class="[ 'sort-icon', sortKey === 'deadline' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th class="table-header">Status</th>
                    <th class="table-header">Visibility</th>
                    <th class="table-header">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(req, index) in paginatedMyRequests" :key="req.id" class="request-row">
                    <td class="id-cell">{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
                    <td class="title-cell">
                      <a href="#" @click.prevent="goToRequestDetail(req.id)" class="request-link">{{ req.title }}</a>
                    </td>
                    <td class="project-cell">{{ req.project?.name || '-' }}</td>
                    <td class="category-cell">{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount-cell">
                      <div class="amount-wrapper">
                        <span class="deal-icon">💵</span>
                        <span class="amount-text">${{ req.dealAmount }}</span>
                      </div>
                    </td>
                    <td class="deadline-cell">
                      <div class="deadline-wrapper">
                        <span class="deadline-icon">🗓</span>
                        <span class="deadline-text">{{ formatDeadline(req.deadline) }}</span>
                      </div>
                    </td>
                    <td class="status-cell">
                        <span v-if="req.status === 'APPROVED'" class="status-badge status-approved">
                          <span class="status-icon">✅</span>
                          <span class="status-text">Approved</span>
                        </span>
                      <span v-else-if="req.status === 'PENDING'" class="status-badge status-pending">
                          <span class="status-icon">⏳</span>
                          <span class="status-text">Pending</span>
                        </span>
                      <span v-else :class="['status-badge', `status-${req.status.toLowerCase()}`]">
                          {{ formatStatus(req.status) }}
                        </span>
                    </td>
                    <td class="visibility-cell">
                      <span v-if="req.status === 'PENDING' && isRequestPublic(req.isPublic)" class="visibility-badge public-badge">
                        <span class="visibility-icon">🌐</span>
                        <span class="visibility-text">Public</span>
                      </span>
                      <span v-else-if="req.status === 'PENDING' && !isRequestPublic(req.isPublic)" class="visibility-badge private-badge">
                        <span class="visibility-icon">🔒</span>
                        <span class="visibility-text">Private</span>
                      </span>
                      <span v-else-if="isRequestPublic(req.isPublic)" class="visibility-badge public-badge">
                        <span class="visibility-icon">🌐</span>
                        <span class="visibility-text">Public</span>
                      </span>
                      <span v-else class="visibility-badge private-badge">
                        <span class="visibility-icon">🔒</span>
                        <span class="visibility-text">Private</span>
                      </span>
                    </td>
                    <td class="actions-cell">
                      <div class="actions-wrapper">
                        <!-- Cancel button - only show for PENDING requests without project -->
                        <button
                          @click="onCancel(req)"
                          class="action-btn cancel-btn"
                          v-if="req.status === 'PENDING' && !req.project"
                          title="Cancel Request"
                        >
                          <span class="btn-icon">✕</span>
                        </button>

                        <!-- Review button - only show for PENDING requests without project -->
                        <button
                          v-if="canReview(req) && req.status === 'PENDING' && !req.project"
                          @click="onReview(req)"
                          class="action-btn review-btn"
                          title="Review Request"
                        >
                          <i class="pi pi-eye btn-icon"></i>
                        </button>

                        <!-- Candidates button - only show for PENDING public requests without project -->
                        <router-link
                          v-if="req.status === 'PENDING' && req.isPublic && !req.project"
                          :to="{ name: 'request-registrants', params: { requestId: req.id } }"
                          class="action-btn candidates-btn"
                          :class="{ disabled: req.registrantCount === 0 }"
                          :title="req.registrantCount > 0 ? 'View registered candidates' : 'No candidates yet'"
                        >
                          <i class="pi pi-users btn-icon"></i>
                          <span class="btn-text">Candidates</span>
                          <span v-if="typeof req.registrantCount === 'number'" class="candidate-count">{{ req.registrantCount }}</span>
                        </router-link>

                        <!-- Show message for cancelled requests -->
                        <span v-if="req.status === 'CANCELLED'" class="status-message cancelled">
                          Request cancelled
                        </span>

                        <!-- Show message for completed requests -->
                        <span v-if="req.status === 'COMPLETED'" class="status-message completed">
                          ✓ Completed
                        </span>

                        <!-- Show message for rejected requests -->
                        <span v-if="req.status === 'REJECTED'" class="status-message rejected">
                          ✗ Rejected
                        </span>
                      </div>
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
                ✕
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
                      <!-- Accept button - only for PENDING requests -->
                      <button
                        v-if="req.status === 'PENDING'"
                        @click="acceptRequest(req.id)"
                        class="btn btn-small btn-success"
                        :disabled="actionLoading"
                        title="Accept Request"
                      >
                        Accept
                      </button>

                      <!-- Reject button - only for PENDING requests -->
                      <button
                        v-if="req.status === 'PENDING'"
                        @click="rejectRequest(req.id)"
                        class="btn btn-small btn-danger"
                        :disabled="actionLoading"
                        title="Reject Request"
                      >
                        Reject
                      </button>

                      <!-- Mark Complete button - only for APPROVED requests -->
                      <button
                        v-if="req.status === 'APPROVED'"
                        @click="completeRequest(req.id)"
                        class="btn btn-small btn-primary"
                        :disabled="actionLoading"
                        title="Mark as Complete"
                      >
                        Mark Complete
                      </button>

                      <!-- Show message for completed requests -->
                      <span v-if="req.status === 'COMPLETED'" class="text-green-600 text-sm font-medium">
                        ✓ Completed
                      </span>

                      <!-- Show message for rejected requests -->
                      <span v-if="req.status === 'REJECTED'" class="text-red-600 text-sm font-medium">
                        ✗ Rejected
                      </span>

                      <!-- Show message for cancelled requests -->
                      <span v-if="req.status === 'CANCELLED'" class="text-gray-500 text-sm italic">
                        Request cancelled
                      </span>
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

          <!-- My Registrations Tab -->
          <div v-else-if="activeTab === 'my-registrations'">
            <!-- Search and Filter Bar for My Registrations -->
            <div class="filter-bar">
              <div class="search-container">
                <i class="pi pi-search search-icon"></i>
                <input
                  v-model="myRegistrationsSearch"
                  type="text"
                  placeholder="Search registered requests..."
                  class="search-input"
                />
              </div>
              <select v-model="myRegistrationsStatusFilter" class="filter-select">
                <option value="">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select v-model="myRegistrationsVisibilityFilter" class="filter-select">
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button @click="clearMyRegistrationsFilters" class="btn btn-secondary btn-small">
                ✕
                Clear
              </button>

            </div>

            <!-- Empty State for My Registrations -->
            <div v-if="myRegistrations.length === 0" class="empty-container">
              <div class="empty-content">
                <div class="empty-icon">
                  <i class="pi pi-history"></i>
                </div>
                <h3>No registered requests</h3>
                <p>You haven't registered for any requests yet.</p>
              </div>
            </div>



            <!-- My Registrations Table -->
            <div v-if="myRegistrations.length > 0" class="requests-table-container">
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
                    <th @click="sortTable('requester')" style="cursor: pointer;" class="text-xs font-semibold text-left">
                      Requester
                      <i :class="[ 'sort-icon', sortKey === 'requester' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
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

                  <tr v-for="(req, index) in paginatedMyRegistrations" :key="req.id" class="request-row table-row-hover">
                    <td class="text-center text-sm text-gray-700" width="60">{{ (currentRegistrationsPage - 1) * registrationsItemsPerPage + index + 1 }}</td>
                    <td class="request-title text-sm text-gray-700 text-left"> <a href="#" @click.prevent="goToRequestDetail(req.id)">{{ req.title }}</a> </td>
                    <td class="text-sm text-gray-700 text-left">{{ req.requester?.fullName || req.requester?.email || 'Unknown' }}</td>
                    <td class="text-sm text-gray-700 text-left">{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount text-center text-sm text-green-600 font-bold" width="120"><span class="deal-icon">💵</span>${{ req.dealAmount }}</td>
                    <td class="text-sm text-gray-500 italic text-left" width="130"><span class="deadline-icon">🗓</span> {{ formatDeadline(req.deadline) }}</td>
                    <td>
                        <span v-if="req.registrationStatus === 'APPROVED'" class="status-badge status-approved custom-badge approved-badge">
                          ✅ Approved
                        </span>
                      <span v-else-if="req.registrationStatus === 'PENDING'" class="status-badge status-registered custom-badge registered-badge">
                          📝 Registered
                        </span>
                      <span v-else-if="req.registrationStatus === 'REJECTED'" class="status-badge status-rejected custom-badge rejected-badge">
                          ❌ Rejected
                        </span>
                      <span v-else :class="['status-badge', `status-${req.registrationStatus?.toLowerCase() || req.status.toLowerCase()}`]">
                          {{ formatStatus(req.registrationStatus || req.status) }}
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
                      <!-- View Details button -->
                      <router-link
                        :to="{ name: 'request-detail', params: { requestId: req.id } }"
                        class="btn btn-small btn-primary"
                        title="View Request Details"
                      >
                        <i class="pi pi-eye"></i>
                        View
                      </router-link>

                      <!-- Show message for completed requests -->
                      <span v-if="req.status === 'COMPLETED'" class="text-green-600 text-sm font-medium">
                        ✓ Completed
                      </span>

                      <!-- Show message for rejected requests -->
                      <span v-if="req.status === 'REJECTED'" class="text-red-600 text-sm font-medium">
                        ✗ Rejected
                      </span>

                      <!-- Show message for cancelled requests -->
                      <span v-if="req.status === 'CANCELLED'" class="text-gray-500 text-sm italic">
                        Request cancelled
                      </span>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination-controls">
                <div class="pagination-info">
                  <span>
                    Showing {{ (currentRegistrationsPage - 1) * registrationsItemsPerPage + 1 }}–{{ Math.min(currentRegistrationsPage * registrationsItemsPerPage, filteredMyRegistrations.length) }} of {{ filteredMyRegistrations.length }} registrations
                    ({{ totalRegistrationsPages }} page{{ totalRegistrationsPages > 1 ? 's' : '' }})
                  </span>
                </div>
                <div class="pagination-buttons">
                  <button @click="prevRegistrationsPage" :disabled="currentRegistrationsPage === 1" class="btn btn-secondary">
                    <i class="pi pi-chevron-left"></i> Previous
                  </button>
                  <span class="page-info">Page {{ currentRegistrationsPage }} of {{ totalRegistrationsPages }}</span>
                  <button @click="nextRegistrationsPage" :disabled="currentRegistrationsPage === totalRegistrationsPages" class="btn btn-secondary">
                    Next <i class="pi pi-chevron-right"></i>
                  </button>
                </div>
                <div class="page-size-selector">
                  <label for="registrationsPageSize">Show:</label>
                  <select id="registrationsPageSize" v-model="registrationsItemsPerPage" @change="currentRegistrationsPage = 1" class="page-size-select">
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

          <!-- Dialogs -->
          <ReviewRequestDialog v-if="showReview" :request="selectedRequest" @close="showReview = false" @reviewed="onRequestReviewed" />
          <CancelRequestDialog v-if="showCancel" :request="selectedRequest" @close="showCancel = false" @cancelled="onRequestCancelled" />
          <ProjectCancellationDialog
            v-if="showProjectCancel && selectedRequest"
            :request-id="selectedRequest.id"
            @close="showProjectCancel = false"
            @completed="onProjectCancellationRequested"
          />
          <CancellationRespondDialog
            v-if="showRespond && pendingCancellationId !== null"
            :cancellation-id="pendingCancellationId"
            @close="showRespond = false"
            @completed="onRespondCompleted"
          />
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axiosInstance from '../api'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import EditRequestForm from '../views/RequestEditView.vue'
import ReviewRequestDialog from '../components/ReviewRequestDialog.vue'
import CancelRequestDialog from '../components/CancelRequestDialog.vue'
import ProjectCancellationDialog from '../components/ProjectCancellationDialog.vue'
import CancellationRespondDialog from '../components/CancellationRespondDialog.vue'

const requests = ref([])
const loading = ref(false)
const error = ref(null)
const showEdit = ref(false)
const showReview = ref(false)
const showCancel = ref(false)
const showProjectCancel = ref(false)
const showRespond = ref(false)
const pendingCancellationId = ref(null)
const selectedRequest = ref(null)
const sidebarCollapsed = ref(false)
const toast = useToast()
const activeTab = ref('my-requests')
const myRequests = ref([])
const assignedRequests = ref([])
const myRegistrations = ref([])
const actionLoading = ref(false)
const router = useRouter()

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(7)
const currentAssignedPage = ref(1)
const assignedItemsPerPage = ref(7)
const currentRegistrationsPage = ref(1)
const registrationsItemsPerPage = ref(7)

// Search and Filter state
const myRequestsSearch = ref('')
const myRequestsStatusFilter = ref('')
const myRequestsVisibilityFilter = ref('')
const assignedRequestsSearch = ref('')
const assignedRequestsStatusFilter = ref('')
const assignedRequestsVisibilityFilter = ref('')
const myRegistrationsSearch = ref('')
const myRegistrationsStatusFilter = ref('')
const myRegistrationsVisibilityFilter = ref('')

// Computed properties for counts
const myRequestsCount = computed(() => myRequests.value.filter(req => req.status !== 'CANCELLED').length)
const assignedRequestsCount = computed(() => assignedRequests.value.length)
const myRegistrationsCount = computed(() => myRegistrations.value.length)


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

  // Sort the filtered results
  if (sortKey.value) {
    filtered = [...filtered].sort((a, b) => {
      let aValue, bValue

      switch (sortKey.value) {
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'project':
          aValue = a.project?.name?.toLowerCase() || ''
          bValue = b.project?.name?.toLowerCase() || ''
          break
        case 'dealAmount':
          aValue = parseFloat(a.dealAmount) || 0
          bValue = parseFloat(b.dealAmount) || 0
          break
        case 'deadline':
          aValue = new Date(a.deadline) || new Date(0)
          bValue = new Date(b.deadline) || new Date(0)
          break
        default:
          return 0
      }

      if (aValue < bValue) return -1 * sortOrder.value
      if (aValue > bValue) return 1 * sortOrder.value
      return 0
    })
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

  // Sort the filtered results
  if (sortKey.value) {
    filtered = [...filtered].sort((a, b) => {
      let aValue, bValue

      switch (sortKey.value) {
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'requester':
          aValue = (a.requester?.name || a.requester?.email || '').toLowerCase()
          bValue = (b.requester?.name || b.requester?.email || '').toLowerCase()
          break
        case 'category':
          aValue = a.category?.name?.toLowerCase() || ''
          bValue = b.category?.name?.toLowerCase() || ''
          break
        case 'dealAmount':
          aValue = parseFloat(a.dealAmount) || 0
          bValue = parseFloat(b.dealAmount) || 0
          break
        case 'deadline':
          aValue = new Date(a.deadline) || new Date(0)
          bValue = new Date(b.deadline) || new Date(0)
          break
        default:
          return 0
      }

      if (aValue < bValue) return -1 * sortOrder.value
      if (aValue > bValue) return 1 * sortOrder.value
      return 0
    })
  }

  return filtered.filter(req => req.status !== 'CANCELLED')
})

// Filtered My Registrations
const filteredMyRegistrations = computed(() => {
  let filtered = myRegistrations.value

  // Search filter
  if (myRegistrationsSearch.value) {
    const searchTerm = myRegistrationsSearch.value.toLowerCase()
    filtered = filtered.filter(req =>
      req.title?.toLowerCase().includes(searchTerm) ||
      req.requester?.fullName?.toLowerCase().includes(searchTerm) ||
      req.requester?.email?.toLowerCase().includes(searchTerm) ||
      req.category?.name?.toLowerCase().includes(searchTerm) ||
      req.id?.toString().includes(searchTerm)
    )
  }

  // Status filter
  if (myRegistrationsStatusFilter.value) {
    filtered = filtered.filter(req => {
      const status = req.registrationStatus || req.status;
      return status === myRegistrationsStatusFilter.value;
    });
  }

  // Visibility filter
  if (myRegistrationsVisibilityFilter.value) {
    if (myRegistrationsVisibilityFilter.value === 'public') {
      filtered = filtered.filter(req => isRequestPublic(req.isPublic))
    } else if (myRegistrationsVisibilityFilter.value === 'private') {
      filtered = filtered.filter(req => !isRequestPublic(req.isPublic))
    }
  }

  // Sort the filtered results
  if (sortKey.value) {
    filtered = [...filtered].sort((a, b) => {
      let aValue, bValue

      switch (sortKey.value) {
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'requester':
          aValue = (a.requester?.fullName || a.requester?.email || '').toLowerCase()
          bValue = (b.requester?.fullName || b.requester?.email || '').toLowerCase()
          break
        case 'category':
          aValue = a.category?.name?.toLowerCase() || ''
          bValue = b.category?.name?.toLowerCase() || ''
          break
        case 'dealAmount':
          aValue = parseFloat(a.dealAmount) || 0
          bValue = parseFloat(b.dealAmount) || 0
          break
        case 'deadline':
          aValue = new Date(a.deadline) || new Date(0)
          bValue = new Date(b.deadline) || new Date(0)
          break
        default:
          return 0
      }

      if (aValue < bValue) return -1 * sortOrder.value
      if (aValue > bValue) return 1 * sortOrder.value
      return 0
    })
  }

  return filtered
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

// Pagination computed properties for My Registrations
const paginatedMyRegistrations = computed(() => {
  const start = (currentRegistrationsPage.value - 1) * registrationsItemsPerPage.value
  const end = start + registrationsItemsPerPage.value
  return filteredMyRegistrations.value.slice(start, end)
})

const totalRegistrationsPages = computed(() => {
  return Math.ceil(filteredMyRegistrations.value.length / registrationsItemsPerPage.value)
})

// Pagination methods
function goToPage(page) {
  currentPage.value = page
}

function goToAssignedPage(page) {
  currentAssignedPage.value = page
}

function goToRegistrationsPage(page) {
  currentRegistrationsPage.value = page
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

function nextRegistrationsPage() {
  if (currentRegistrationsPage.value < totalRegistrationsPages.value) {
    currentRegistrationsPage.value++
  }
}

function prevRegistrationsPage() {
  if (currentRegistrationsPage.value > 1) {
    currentRegistrationsPage.value--
  }
}

// Reset pagination when switching tabs
function switchTab(tab) {
  activeTab.value = tab
  currentPage.value = 1
  currentAssignedPage.value = 1
  currentRegistrationsPage.value = 1
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

function clearMyRegistrationsFilters() {
  myRegistrationsSearch.value = ''
  myRegistrationsStatusFilter.value = ''
  myRegistrationsVisibilityFilter.value = ''
  currentRegistrationsPage.value = 1
}

function fetchRequests() {
  loading.value = true
  error.value = null

  const promises = []

  // Fetch my requests
  const myRequestsPromise = axiosInstance.get('/requests/myRequests')
    .then(res => {
      console.log('My requests data received:', res.data)
      myRequests.value = res.data
    })
    .catch(err => {
      console.error('Error fetching my requests:', err)
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        error.value = 'Không thể kết nối đến server. Vui lòng kiểm tra server có đang chạy không.'
        return
      }
    })

  // Fetch assigned requests
  console.log('Fetching assigned requests from:', '/requests/private')
  const assignedRequestsPromise = axiosInstance.get('/requests/private')
    .then(res => {
      console.log('Assigned requests data received:', res.data)
      assignedRequests.value = res.data
    })
    .catch(err => {
      console.error('Full error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
          headers: err.config?.headers
        }
      })

      // Handle different error scenarios
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        error.value = 'Không thể kết nối đến server. Vui lòng kiểm tra server có đang chạy không.'
        return
      }

      if (err.response?.status === 404) {
        error.value = 'Endpoint /api/requests/private không tồn tại. Vui lòng kiểm tra server có đúng version không.'
        return
      }

      if (err.response?.status === 401) {
        error.value = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        // Optionally redirect to login
        // router.push('/login')
        return
      }

      // Handle the error
      console.error('Error fetching assigned requests:', err)
      error.value = `Lỗi khi tải requests: ${err.response?.status} ${err.response?.statusText || err.message}`
    })

  // Fetch my registrations
  const myRegistrationsPromise = axiosInstance.get('/requests/myRegistrations')
    .then(res => {
      myRegistrations.value = res.data
    })
    .catch(err => {
      console.error('Error fetching my registrations:', err)
      // Don't set error for registrations as it's optional
      myRegistrations.value = []
    })

  promises.push(myRequestsPromise, assignedRequestsPromise, myRegistrationsPromise)

  Promise.all(promises).finally(() => {
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

function onProjectCancel(req) {
  selectedRequest.value = req
  showProjectCancel.value = true
}

async function onRequestCancellationCheck(req) {
  try {
    const res = await axiosInstance.get(`/project-cancellation/summary/${req.id}`)
    return res.data?.canCancel === true
  } catch {
    return false
  }
}

function onRespond(cancellationId) {
  pendingCancellationId.value = cancellationId
  showRespond.value = true
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

function onProjectCancellationRequested() {
  fetchRequests()
  toast.add({ severity: 'success', summary: 'Submitted', detail: 'Cancellation request submitted.', life: 3000 })
}

function onRespondCompleted() {
  fetchRequests()
  toast.add({ severity: 'success', summary: 'Updated', detail: 'Cancellation response submitted.', life: 3000 })
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
    await axiosInstance.post(`/requests/${requestId}/update`, {
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
    await axiosInstance.post(`/requests/${requestId}/update`, {
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
    await axiosInstance.post(`/requests/${requestId}/update`, {
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


async function debugConnection() {
  console.log('=== DEBUG CONNECTION ===')
  console.log('Base URL:', axiosInstance.defaults.baseURL)
  console.log('With credentials:', axiosInstance.defaults.withCredentials)

  try {
    // Test basic connectivity
    console.log('Testing basic connectivity...')
    const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/auth/me', {
      credentials: 'include'
    })
    console.log('Fetch response status:', response.status)
    console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()))

    if (response.status === 200) {
      const data = await response.json()
      console.log('User data:', data)
      toast.add({
        severity: 'success',
        summary: 'Connection OK',
        detail: 'Server đang chạy và authentication OK',
        life: 3000
      })
    } else if (response.status === 401) {
      console.log('Authentication failed')
      toast.add({
        severity: 'warn',
        summary: 'Authentication Issue',
        detail: 'Server chạy nhưng bạn chưa đăng nhập hoặc session hết hạn',
        life: 5000
      })
    } else if (response.status === 404) {
      toast.add({
        severity: 'error',
        summary: 'Endpoint Not Found',
        detail: 'Server chạy nhưng endpoint không tồn tại',
        life: 5000
      })
    }
  } catch (err) {
    console.error('Connection test failed:', err)
    toast.add({
      severity: 'error',
      summary: 'Connection Failed',
      detail: 'Không thể kết nối đến server. Vui lòng kiểm tra server có đang chạy trên port 3000 không.',
      life: 5000
    })
  }
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
  margin-left: 240px;
  transition: margin-left 0.2s cubic-bezier(.4, 0, .2, 1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
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
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.emoji {
  font-size: 1.8rem;
}

.requests-desc {
  font-size: 0.95rem;
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

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
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
  font-size: 0.8rem;
}

.table-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 0.8rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.table-header.sortable {
  cursor: pointer;
}

.table-header.sortable:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #3b82f6;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.requests-table td {
  padding: 0.8rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  transition: all 0.2s ease;
}

.request-row {
  transition: all 0.2s ease;
}

.request-row:hover {
  background: #f8fafc;
}

/* Cell specific styles */
.id-cell {
  text-align: center;
  font-weight: 600;
  color: #64748b;
  font-size: 0.8rem;
}

.title-cell {
  font-weight: 500;
}

.request-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.request-link:hover {
  color: #1d4ed8;
  text-decoration: none;
}

.project-cell, .category-cell {
  color: #64748b;
  font-weight: 500;
}

.deal-amount-cell {
  text-align: center;
}

.amount-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.amount-text {
  color: #16a34a;
  font-weight: 600;
  font-size: 0.8rem;
}

.deadline-cell {
  color: #64748b;
}

.deadline-wrapper {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.5rem;
  background: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.deadline-text {
  font-weight: 500;
  font-style: italic;
  font-size: 0.8rem;
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
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-icon {
  font-size: 0.8rem;
}

.status-text {
  font-weight: 600;
}

.visibility-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.visibility-icon {
  font-size: 0.8rem;
}

.visibility-text {
  font-weight: 600;
}

.actions-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.action-btn:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.cancel-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.cancel-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

.review-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.candidates-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.candidates-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.candidates-btn.disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  cursor: not-allowed;
  opacity: 0.7;
}

.candidates-btn.disabled:hover {
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.btn-icon {
  font-size: 12px;
  font-weight: bold;
}

.btn-text {
  font-weight: 500;
}

.candidate-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.status-message {
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  font-style: italic;
}

.status-message.cancelled {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.status-message.completed {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.status-message.rejected {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
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
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
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
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
}

.btn-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.7rem;
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
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
  font-size: 16px;
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
  padding: 0.4rem 0.8rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.2rem;
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
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(226, 232, 240, 0.6);
  flex-wrap: wrap;
}

.search-container {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon-wrapper {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 50%;
  z-index: 2;
}

.search-icon {
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
}

.search-input {
  width: 100%;
  padding: 0.4rem 0.8rem 0.4rem 2.2rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  transition: all 0.2s ease;
  color: #374151;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.select-wrapper {
  position: relative;
  min-width: 120px;
}

.filter-select {
  width: 100%;
  padding: 0.4rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  color: #374151;
  transition: all 0.2s ease;
  appearance: none;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 10px;
  pointer-events: none;
  transition: color 0.2s ease;
}

.select-wrapper:hover .select-arrow {
  color: #3b82f6;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(100, 116, 139, 0.3);
}

.clear-btn:hover {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  box-shadow: 0 2px 6px rgba(100, 116, 139, 0.4);
}

.clear-icon {
  font-size: 12px;
  font-weight: bold;
}

.clear-text {
  font-weight: 500;
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
  gap: 4px;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  transition: background 0.2s;
  position: relative;
  text-decoration: none;
}

.btn-candidate .pi-users {
  font-size: 14px;
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
  margin-left: 4px;
  font-size: 0.75rem;
  color: #9ca3af;
  transition: color 0.2s ease;
}

.table-header:hover .sort-icon {
  color: #3b82f6;
}

th:hover .sort-icon {
  color: #1f2937;
}

.deadline-icon {
  margin-right: 3px;
  font-size: 1em;
  vertical-align: middle;
}

.custom-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.8em;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
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

.registered-badge {
  background: #dbeafe;
  color: #1e40af;
  font-size: 0.9em;
  padding: 0.35rem 0.9rem;
  font-weight: 600;
}

.rejected-badge {
  background: #fee2e2;
  color: #991b1b;
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
  margin-right: 2px;
  font-size: 1em;
  vertical-align: middle;
}

.th-flex {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
</style>
