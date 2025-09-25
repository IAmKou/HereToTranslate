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
              @click="switchTab('ongoing-requests')"
              :class="['tab-button', { active: activeTab === 'ongoing-requests' }]"
            >
              <span class="material-icons">timelapse</span>
              On-going Requests
              <span v-if="ongoingRequestsCount > 0" class="badge">{{ ongoingRequestsCount }}</span>
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
          <div v-else-if="activeTab === 'my-requests' && !loading && !error" class="tab-content" :key="'my-requests'">
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
                    <option value="INCOMPLETED">Incompleted</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="FAILED">Failed</option>
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
            <div v-else-if="debugRequests.length > 0" class="requests-table-container">
              <div class="table-wrapper">
                <table class="requests-table">
                  <thead>
                  <tr>
                    <th @click="sortTable('id')" class="table-header sortable" width="6%">
                      <div class="header-content">
                        <span>ID</span>
                        <i :class="[ 'sort-icon', sortKey === 'id' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('title')" class="table-header sortable" width="22%">
                      <div class="header-content">
                        <span>Title</span>
                        <i :class="[ 'sort-icon', sortKey === 'title' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>

                    <th class="table-header" width="10%">
                      <span>Category</span>
                    </th>
                    <th @click="sortTable('dealAmount')" class="table-header sortable" width="10%">
                      <div class="header-content">
                        <span>Deal Amount</span>
                        <i :class="[ 'sort-icon', sortKey === 'dealAmount' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('deadline')" class="table-header sortable" width="10%">
                      <div class="header-content">
                        <span>Deadline</span>
                        <i :class="[ 'sort-icon', sortKey === 'deadline' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th class="table-header center" width="8%">Status</th>
                    <th class="table-header center" width="9%">Visibility</th>
                    <th class="table-header center" width="17%">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(req, index) in paginatedMyRequests" :key="req.id" class="request-row" :data-request-id="req.id">
                    <td class="id-cell">{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
                    <td class="title-cell">
                      <a href="#" @click.prevent="goToRequestDetail(req.id)" class="request-link">{{ req.title }}</a>
                    </td>

                    <td class="category-cell">{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount-cell">
                      <div class="amount-wrapper">
                        <span class="deal-icon">💵</span>
                        <span class="amount-text">${{ req.dealAmount }}</span>
                      </div>
                    </td>
                    <td class="deadline-cell">
                      <div class="deadline-wrapper" :class="getDeadlineStatus(req).class">
                        <span class="deadline-icon">🗓</span>
                        <span class="deadline-text">{{ formatDeadline(req.deadline) }}</span>
                      </div>
                    </td>
                    <td class="status-cell" style="text-align: center; vertical-align: middle;">
                       <span v-if="req.status === 'APPROVED'" class="status-badge status-approved">
                         <span class="status-icon">✅</span>
                         <span class="status-text">Approved</span>
                       </span>
                      <span v-else-if="req.status === 'PENDING'" class="status-badge status-pending">
                         <span class="status-icon">⏳</span>
                         <span class="status-text">Pending</span>
                       </span>
                      <span v-else-if="req.status === 'PENDING_ADMIN_REVIEW'" class="status-badge status-pending" title="Waiting for admin to review your rejection evidence">
                         <span class="status-icon">🛡️</span>
                         <span class="status-text">Pending Admin Review</span>
                       </span>
                      <span v-else-if="req.status === 'EXTENSION_REQUESTED'" class="status-badge status-extension-requested">
                         <span class="status-icon">⏰</span>
                         <span class="status-text">Extension Requested</span>
                       </span>
                      <span v-else-if="req.status === 'EXTENSION_APPROVED'" class="status-badge status-extension-approved">
                         <span class="status-icon">✅</span>
                         <span class="status-text">Extension Approved</span>
                       </span>
                      <span v-else-if="req.status === 'EXTENSION_REJECTED'" class="status-badge status-extension-rejected">
                         <span class="status-icon">❌</span>
                         <span class="status-text">Extension Rejected</span>
                       </span>
                      <span v-else-if="req.status === 'WAITING_APPROVAL'" class="status-badge status-waiting-approval">
                         <span class="status-icon">⏳</span>
                         <span class="status-text">Waiting Approval</span>
                       </span>
                      <span v-else-if="req.status === 'FAILED'" class="status-badge status-failed">
                         <span class="status-icon">❌</span>
                         <span class="status-text">Failed</span>
                       </span>
                      <span v-else-if="req.status === 'INCOMPLETED'" class="status-badge status-incompleted">
                         <span class="status-icon">⚠️</span>
                         <span class="status-text">Incompleted</span>
                       </span>
                      <span v-else :class="['status-badge', getStatusClass(req.status)]">
                         {{ req.status === 'EXPIRED' ? 'Expired' : formatStatus(req.status) }}
                       </span>
                    </td>
                    <td class="visibility-cell" style="text-align: center; vertical-align: middle;">
                       <span v-if="req.status === 'PENDING' && isRequestPublic(req.isPublic, !!req.assignee)" class="visibility-badge public-badge">
                         <span class="visibility-icon">🌐</span>
                         <span class="visibility-text">Public</span>
                       </span>
                      <span v-else class="visibility-badge private-badge">
                         <span class="visibility-icon">🔒</span>
                         <span class="visibility-text">Private</span>
                       </span>
                    </td>
                    <td class="actions-cell" style="text-align: center; vertical-align: middle;">
                      <div class="actions-wrapper">
                        <!-- Cancel button - show for all requests except COMPLETED, CANCELLED, and INCOMPLETED -->
                        <button
                          @click="onCancel(req)"
                          class="action-btn cancel-btn"
                          v-if="req.status !== 'COMPLETED' && req.status !== 'CANCELLED' && req.status !== 'INCOMPLETED' && req.status !== 'FAILED'"
                          :title="`Cancel request: ${req.title}`"
                          data-tooltip="Cancel this request"
                        >
                          <span class="btn-icon">✕</span>
                        </button>



                        <!-- Candidates button - only show for PENDING public requests without project -->
                        <router-link
                          v-if="req.status === 'PENDING' && req.isPublic && !req.project"
                          :to="{ name: 'request-registrants', params: { requestId: req.id } }"
                          class="action-btn candidates-btn"
                          :class="{ disabled: req.registrantCount === 0 }"
                          :title="req.registrantCount > 0 ? `View ${req.registrantCount} registered candidates for: ${req.title}` : `No candidates registered for: ${req.title}`"
                          :data-tooltip="req.registrantCount > 0 ? `View ${req.registrantCount} candidates` : 'No candidates yet'"
                        >
                          <i class="pi pi-users btn-icon"></i>
                          <span class="btn-text">Candidates</span>
                          <span v-if="typeof req.registrantCount === 'number'" class="candidate-count">{{ req.registrantCount }}</span>
                        </router-link>

                        <!-- Show message for cancelled requests -->
                        <span v-if="req.status === 'CANCELLED'" class="status-message cancelled" title="This request has been cancelled">
                           Request cancelled
                         </span>



                        <!-- Handover button for failed, waiting approval and completed requests -->
                        <button
                          v-if="(req.status === 'FAILED' || req.status === 'WAITING_APPROVAL' || req.status === 'COMPLETED') && req.project"
                          @click="viewHandover(req)"
                          class="action-btn handover-btn"
                          :title="`View and evaluate translation product for: ${req.title}`"
                          data-tooltip="View translation product and evaluate quality"
                        >
                          <i class="pi pi-eye btn-icon"></i>
                          <span class="btn-text">Review</span>
                        </button>

                        <!-- Auto-completion info for WAITING_APPROVAL requests -->
                        <div v-if="req.status === 'WAITING_APPROVAL' && req.statusChangedAt" class="auto-completion-info">
                          <span v-if="getWaitingApprovalDaysLeft(req) > 0" class="days-left">
                            <i class="pi pi-clock"></i>
                            {{ getWaitingApprovalDaysLeft(req) }} day{{ getWaitingApprovalDaysLeft(req) > 1 ? 's' : '' }} left to review
                          </span>
                          <span v-else class="auto-completing">
                            <i class="pi pi-exclamation-triangle"></i>
                            Auto-completing today
                          </span>
                        </div>

                        <!-- View Extensions button for approved requests -->
                        <button
                          v-if="(req.status === 'APPROVED' || req.status === 'EXTENSION_REQUESTED') && req.extensionRequestCount > 0"
                          @click="viewExtensions(req)"
                          class="action-btn extensions-btn"
                          :title="`View ${req.extensionRequestCount} extension request${req.extensionRequestCount > 1 ? 's' : ''} for: ${req.title}`"
                          data-tooltip="View and manage deadline extension requests"
                        >
                          <i class="pi pi-clock btn-icon"></i>
                          <span class="btn-text">Extensions</span>
                          <span v-if="req.extensionRequestCount > 0" class="extension-count">{{ req.extensionRequestCount }}</span>
                        </button>

                        <!-- Show message for rejected requests -->
                        <span v-if="req.status === 'REJECTED'" class="status-message rejected" title="This request has been rejected">
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
          <div v-else-if="activeTab === 'assigned-requests' && !loading && !error" class="tab-content" :key="'assigned-requests'">
            <!-- Search and Filter Bar for Assigned Requests -->
            <div class="filter-bar">
              <div class="search-container">
                <div class="search-icon-wrapper">
                  <i class="pi pi-search search-icon"></i>
                </div>
                <input
                  v-model="assignedRequestsSearch"
                  type="text"
                  placeholder="Search assigned requests..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <div class="select-wrapper">
                  <select v-model="assignedRequestsStatusFilter" class="filter-select">
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <i class="pi pi-chevron-down select-arrow"></i>
                </div>
                <div class="select-wrapper">
                  <select v-model="assignedRequestsVisibilityFilter" class="filter-select">
                    <option value="">All Visibility</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <i class="pi pi-chevron-down select-arrow"></i>
                </div>
                <button @click="clearAssignedRequestsFilters" class="clear-btn">
                  <span class="clear-icon">✕</span>
                  <span class="clear-text">Clear</span>
                </button>
              </div>
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
                    <th @click="sortTable('id')" class="table-header sortable" width="6%">
                      <div class="header-content">
                        <span>ID</span>
                        <i :class="['sort-icon',sortKey === 'id'? sortOrder === 1? 'pi pi-sort-amount-up-alt'
                           : 'pi pi-sort-amount-down'
                           : 'pi pi-sort-alt']" />
                      </div>
                    </th>
                    <th @click="sortTable('title')" class="table-header sortable" width="18%">
                      <div class="header-content">
                        <span>Title</span>
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
                      </div>
                    </th>
                    <th @click="sortTable('requester')" class="table-header sortable requester-header" width="12%">
                      <div class="header-content">
                        <span>Requester</span>
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
                      </div>
                    </th>
                    <th @click="sortTable('category')" class="table-header sortable category-header" width="10%">
                      <div class="header-content">
                        <span>Category</span>
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
                      </div>
                    </th>
                    <th @click="sortTable('dealAmount')" class="table-header sortable" width="10%">
                      <div class="header-content">
                        <span>Deal Amount</span>
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
                      </div>
                    </th>
                    <th @click="sortTable('deadline')" class="table-header sortable" width="10%">
                      <div class="header-content">
                        <span>Deadline</span>
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
                      </div>
                    </th>
                    <th class="table-header center" width="8%">Status</th>
                    <th class="table-header center" width="9%">Visibility</th>
                    <th class="table-header center" width="17%">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(req, index) in paginatedAssignedRequests" :key="req.id" class="request-row">
                    <td>{{ (currentAssignedPage - 1) * assignedItemsPerPage + index + 1 }}</td>
                    <td class="request-title">
                      <a href="#" @click.prevent="goToRequestDetail(req.id)">{{ req.title }}</a>
                    </td>
                    <td class="requester-cell" style="vertical-align: middle;">{{ req.requester?.name || req.requester?.email || 'Unknown' }}</td>
                    <td class="category-cell" style="vertical-align: middle;">{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount" style="text-align: center; vertical-align: middle;">${{ formatAmount(req.dealAmount) }}</td>
                    <td style="vertical-align: middle;">
                      <div class="deadline-wrapper" :class="getDeadlineStatus(req).class">
                        <span class="deadline-icon">🗓</span>
                        <span class="deadline-text">{{ formatDate(req.deadline) }}</span>
                      </div>
                    </td>
                    <td class="status-cell" style="text-align: center; vertical-align: middle;">
                         <span :class="['status-badge', getStatusClass(req.status)]">
                           {{ formatStatus(req.status) }}
                         </span>
                    </td>
                    <td class="visibility-cell" style="text-align: center; vertical-align: middle;">
                         <span v-if="req.status === 'PENDING'" :class="['visibility-badge', isRequestPublic(req.isPublic, !!req.assignee) ? 'visibility-public' : 'visibility-private']">
                           <i :class="isRequestPublic(req.isPublic, !!req.assignee) ? 'pi pi-globe' : 'pi pi-lock'"></i>
                           {{ isRequestPublic(req.isPublic, !!req.assignee) ? 'Public' : 'Private' }}
                         </span>
                      <span v-else class="visibility-badge visibility-private">
                           <i class="pi pi-lock"></i>
                           Private
                         </span>
                    </td>
                    <td class="actions-cell" style="text-align: center; vertical-align: middle;">
                      <div class="actions-wrapper">
                        <template v-if="req.status === 'PENDING'">
                          <button
                            class="action-btn accept-btn"
                            :disabled="!!assignedActionLoading[req.id]"
                            @click="openAssignedConfirm('accept', req)"
                            :title="`Accept request: ${req.title}`"
                            data-tooltip="Accept this request"
                          >
                            <i v-if="assignedActionLoading[req.id] !== 'accept'" class="pi pi-check btn-icon" />
                            <i v-else class="pi pi-spinner pi-spin btn-icon" />
                            <span class="btn-text">{{ assignedActionLoading[req.id] === 'accept' ? 'Processing...' : 'Accept' }}</span>
                          </button>
                          <button
                            class="action-btn decline-btn"
                            :disabled="!!assignedActionLoading[req.id]"
                            @click="openAssignedConfirm('decline', req)"
                            :title="`Decline request: ${req.title}`"
                            data-tooltip="Decline this request"
                          >
                            <i v-if="assignedActionLoading[req.id] !== 'decline'" class="pi pi-times btn-icon" />
                            <i v-else class="pi pi-spinner pi-spin btn-icon" />
                            <span class="btn-text">{{ assignedActionLoading[req.id] === 'decline' ? 'Processing...' : 'Decline' }}</span>
                          </button>
                        </template>
                        <template v-else>
                          <span class="no-actions-message">No actions available</span>
                        </template>
                      </div>
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
          <div v-else-if="activeTab === 'my-registrations' && !loading && !error" class="tab-content" :key="'my-registrations'">
            <!-- Search and Filter Bar for My Registrations -->
            <div class="filter-bar">
              <div class="search-container">
                <div class="search-icon-wrapper">
                  <i class="pi pi-search search-icon"></i>
                </div>
                <input
                  v-model="myRegistrationsSearch"
                  type="text"
                  placeholder="Search registered requests..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <div class="select-wrapper">
                  <select v-model="myRegistrationsStatusFilter" class="filter-select">
                    <option value="">All Status</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <i class="pi pi-chevron-down select-arrow"></i>
                </div>
                <div class="select-wrapper">
                  <select v-model="myRegistrationsVisibilityFilter" class="filter-select">
                    <option value="">All Visibility</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <i class="pi pi-chevron-down select-arrow"></i>
                </div>
                <button @click="clearMyRegistrationsFilters" class="clear-btn">
                  <span class="clear-icon">✕</span>
                  <span class="clear-text">Clear</span>
                </button>
              </div>
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
                    <th @click="sortTable('id')" class="table-header sortable" width="6%">
                      <div class="header-content">
                        <span>ID</span>
                        <i :class="[ 'sort-icon', sortKey === 'id' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('title')" class="table-header sortable" width="18%">
                      <div class="header-content">
                        <span>Title</span>
                        <i :class="[ 'sort-icon', sortKey === 'title' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('requester')" class="table-header sortable" width="12%">
                      <div class="header-content">
                        <span>Requester</span>
                        <i :class="[ 'sort-icon', sortKey === 'requester' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('category')" class="table-header sortable" width="10%">
                      <div class="header-content">
                        <span>Category</span>
                        <i :class="[ 'sort-icon', sortKey === 'category' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('dealAmount')" class="table-header sortable" width="10%">
                      <div class="header-content">
                        <span>Deal Amount</span>
                        <i :class="[ 'sort-icon', sortKey === 'dealAmount' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th @click="sortTable('deadline')" class="table-header sortable" width="10%">
                      <div class="header-content">
                        <span>Deadline</span>
                        <i :class="[ 'sort-icon', sortKey === 'deadline' ? sortOrder === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down' : 'pi pi-sort-alt' ]" />
                      </div>
                    </th>
                    <th class="table-header center" width="8%">Status</th>
                    <th class="table-header center" width="9%">Visibility</th>
                    <th class="table-header center" width="17%">Actions</th>
                  </tr>
                  </thead>
                  <tbody>

                  <tr v-for="(req, index) in paginatedMyRegistrations" :key="req.id" class="request-row table-row-hover">
                    <td class="text-center text-sm text-gray-700" width="60" style="vertical-align: middle;">{{ (currentRegistrationsPage - 1) * registrationsItemsPerPage + index + 1 }}</td>
                    <td class="request-title text-sm text-gray-700 text-left" style="vertical-align: middle;"> <a href="#" @click.prevent="goToRequestDetail(req.id)">{{ req.title }}</a> </td>
                    <td class="text-sm text-gray-700 text-left" style="vertical-align: middle;">{{ req.requester?.fullName || req.requester?.email || 'Unknown' }}</td>
                    <td class="text-sm text-gray-700 text-left" style="vertical-align: middle;">{{ req.category?.name || '-' }}</td>
                    <td class="deal-amount" style="text-align:center; vertical-align: middle;">
                      <span class="deal-icon">💵</span>${{ req.dealAmount }}
                    </td>
                    <td style="vertical-align: middle;">
                      <div class="deadline-wrapper" :class="getDeadlineStatus(req).class">
                        <span class="deadline-icon">🗓</span>
                        <span class="deadline-text">{{ formatDeadline(req.deadline) }}</span>
                      </div>
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
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
                    <td style="text-align: center; vertical-align: middle;">
                       <span v-if="req.status === 'PENDING' && isRequestPublic(req.isPublic, !!req.assignee)" class="visibility-badge custom-badge public-badge">
                         🌐 Public
                       </span>
                      <span v-else class="visibility-badge custom-badge private-badge">
                         🔒 Private
                       </span>
                    </td>
                    <td class="actions-cell" style="text-align: center; vertical-align: middle;">
                      <div class="actions-wrapper">


                        <!-- Show message for incompleted requests -->
                        <span v-if="req.status === 'INCOMPLETED'" class="status-message incompleted" title="This request has been marked as incomplete">
                           ⚠ Incompleted
                         </span>

                        <!-- Show message for rejected requests -->
                        <span v-if="req.status === 'REJECTED'" class="status-message rejected" title="This request has been rejected">
                           ✗ Rejected
                         </span>

                        <!-- Show message for cancelled requests -->
                        <span v-if="req.status === 'CANCELLED'" class="status-message cancelled" title="This request has been cancelled">
                           Request cancelled
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
          <DeadlineExtensionDialog
            v-if="showExtension && selectedRequest"
            :request-id="selectedRequest.id"
            :current-deadline="selectedRequest.deadline"
            :existing-extension-request="(() => {
              // Check if there are existing extension requests
              return selectedRequest.extensionRequestCount > 0 ? {
                newDeadline: selectedRequest.deadline,
                reason: 'Deadline extension requested',
                status: 'Pending Review'
              } : null;
            })()"
            @close="showExtension = false"
            @submitted="onExtensionSubmitted"
          />
          <ExtensionRequestsDialog
            v-if="showExtensions && selectedRequest"
            :request-id="selectedRequest.id"
            :request-title="selectedRequest.title"
            @close="showExtensions = false"
            @updated="onExtensionsUpdated"
          />
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

          <!-- On-going Requests Tab -->
          <div v-else-if="activeTab === 'ongoing-requests' && !loading && !error" class="tab-content" :key="'ongoing-requests'">

            <!-- Search Bar for On-going -->
            <div class="filter-bar">
              <div class="search-container">
                <div class="search-icon-wrapper">
                  <i class="pi pi-search search-icon"></i>
                </div>
                <input
                  v-model="ongoingSearch"
                  type="text"
                  placeholder="Search on-going requests..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls">
                <button @click="clearOngoingFilters" class="clear-btn">
                  <span class="clear-icon">✕</span>
                  <span class="clear-text">Clear</span>
                </button>
              </div>
            </div>

            <div v-if="filteredOngoingRequests.length === 0" class="empty-container">
              <div class="empty-content">
                <div class="empty-icon"><i class="pi pi-clock"></i></div>
                <h3>No on-going requests</h3>
                <p>You have no requests in progress.</p>
              </div>
            </div>
            <div v-else class="requests-table-container">
              <div class="table-wrapper">
                <table class="requests-table">
                  <thead>
                  <tr>
                    <th class="table-header" width="6%">#</th>
                    <th class="table-header" width="24%">Title</th>
                    <th class="table-header" width="12%">Requester</th>
                    <th class="table-header" width="10%">Deal Amount</th>
                    <th class="table-header" width="12%">Deadline</th>
                    <th class="table-header center" width="8%">Status</th>
                    <th class="table-header center" width="17%">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(req, index) in filteredOngoingRequests" :key="req.id" class="request-row">
                    <td class="id-cell">{{ index + 1 }}</td>
                    <td class="title-cell">
                      <a href="#" @click.prevent="goToRequestDetail(req.id)" class="request-link">{{ req.title }}</a>
                    </td>
                    <td style="vertical-align: middle;">{{ req.requester?.name || req.requester?.email || 'Unknown' }}</td>
                    <td class="deal-amount" style="text-align:center; vertical-align: middle;">
                      <span class="deal-icon">💵</span>${{ formatAmount(req.dealAmount) }}
                    </td>
                    <td style="vertical-align: middle;">
                      <div class="deadline-wrapper" :class="getDeadlineStatus(req).class">
                        <span class="deadline-icon">🗓</span>
                        <span class="deadline-text">{{ formatDate(req.deadline) }}</span>
                      </div>
                    </td>
                    <td style="text-align:center; vertical-align: middle;">
                      <span :class="['status-badge', getStatusClass(req.status)]">{{ formatStatus(req.status) }}</span>
                    </td>
                    <td class="actions-cell" style="text-align: center; vertical-align: middle;">
                      <div class="actions-wrapper">
                        <button
                          v-if="canTranslatorCancelOngoing(req)"
                          @click="openOngoingCancelDialog(req)"
                          class="action-btn cancel-btn"
                          :title="`Cancel this project: ${req.title}`"
                          data-tooltip="Cancel this project"
                        >
                          <span class="btn-icon">✕</span>
                          <span class="btn-text">Cancel</span>
                        </button>
                        <button
                          v-if="canRequestExtension(req)"
                          @click="requestExtension(req)"
                          class="action-btn extension-btn"
                          :disabled="actionLoading"
                          :title="`Request deadline extension for: ${req.title}`"
                        >
                          <span class="btn-text">Request Extension</span>
                        </button>

                        <div v-else-if="isDeadlineExpired(req.deadline) && !isInGracePeriod(req.deadline)" class="deadline-info">
                          <span v-if="isGracePeriodExpired(req.deadline)" class="grace-expired-message">
                            <i class="pi pi-exclamation-triangle"></i>
                            Grace period expired
                          </span>
                          <span v-else class="deadline-expired-message">
                            <i class="pi pi-times-circle"></i>
                            Deadline expired
                          </span>
                        </div>

                        <span v-else class="deadline-info">
                          {{ getDeadlineStatus(req).text }}
                        </span>
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    <!-- Ongoing Cancel Confirmation Modal -->
    <div v-if="showOngoingCancel" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Confirm Project Cancellation</h3>
          <button class="modal-close" @click="showOngoingCancel = false">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="warning-message">
            <i class="pi pi-exclamation-triangle"></i>
            <p>Are you sure you want to cancel this project?</p>
            <p class="warning-detail">This action cannot be undone. Requester will receive a full refund.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showOngoingCancel = false" :disabled="actionLoading">No, keep</button>
          <button class="btn-danger" @click="confirmOngoingCancel" :disabled="actionLoading">
            <i v-if="!actionLoading" class="pi pi-times"></i>
            <i v-else class="pi pi-spinner pi-spin"></i>
            <span>{{ actionLoading ? 'Processing...' : 'Confirm' }}</span>
          </button>
        </div>
      </div>
    </div>
    <!-- Assigned Requests Accept/Decline Confirmation Modal -->
    <div v-if="showAssignedConfirm" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Confirm {{ assignedConfirmAction === 'accept' ? 'Accept' : 'Decline' }}</h3>
          <button class="modal-close" @click="showAssignedConfirm = false">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="warning-message">
            <i class="pi" :class="assignedConfirmAction === 'accept' ? 'pi-check-circle' : 'pi-times-circle'" />
            <p>
              Are you sure you want to
              <strong>{{ assignedConfirmAction === 'accept' ? 'ACCEPT' : 'DECLINE' }}</strong>
              this request
              <strong>"{{ assignedConfirmTarget ? assignedConfirmTarget.title : '' }}"</strong>?
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAssignedConfirm = false" :disabled="actionLoading">Cancel</button>
          <button
            :class="assignedConfirmAction === 'accept' ? 'btn-success' : 'btn-danger'"
            @click="confirmAssignedAction"
            :disabled="actionLoading"
          >
            <i v-if="!actionLoading" :class="assignedConfirmAction === 'accept' ? 'pi pi-check' : 'pi pi-times'" />
            <i v-else class="pi pi-spinner pi-spin" />
            <span>{{ actionLoading ? 'Processing...' : (assignedConfirmAction === 'accept' ? 'Confirm Accept' : 'Confirm Decline') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
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
import DeadlineExtensionDialog from '../components/DeadlineExtensionDialog.vue'
import ExtensionRequestsDialog from '../components/ExtensionRequestsDialog.vue'

const requests = ref([])
const loading = ref(false)
const error = ref(null)
const showEdit = ref(false)
const showReview = ref(false)
const showCancel = ref(false)
const showProjectCancel = ref(false)
const showRespond = ref(false)
const showExtension = ref(false)
const showExtensions = ref(false)
const showOngoingCancel = ref(false)
const ongoingCancelTarget = ref(null)
const showAssignedConfirm = ref(false)
const assignedConfirmAction = ref(null) // 'accept' | 'decline'
const assignedConfirmTarget = ref(null)
const pendingCancellationId = ref(null)
const selectedRequest = ref(null)
const sidebarCollapsed = ref(false)
const toast = useToast()
const activeTab = ref('my-requests')
const myRequests = ref([])
const assignedRequests = ref([])
const myRegistrations = ref([])
const ongoingRequests = ref([])
const actionLoading = ref(false)
// Loading state per assigned request row: 'accept' | 'decline' | null
const assignedActionLoading = ref({})
const router = useRouter()
const route = useRoute()

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
const ongoingSearch = ref('')

// Computed properties for counts
const myRequestsCount = computed(() => myRequests.value.filter(req => req.status !== 'CANCELLED').length)
const assignedRequestsCount = computed(() => assignedRequests.value.length)
const myRegistrationsCount = computed(() => myRegistrations.value.length)
const ongoingRequestsCount = computed(() => ongoingRequests.value.length)
const filteredOngoingRequests = computed(() => {
  try {
    let list = ongoingRequests.value
    if (ongoingSearch.value) {
      const s = ongoingSearch.value.toLowerCase()
      list = list.filter(r =>
        r.title?.toLowerCase().includes(s) ||
        r.requester?.name?.toLowerCase().includes(s) ||
        r.requester?.email?.toLowerCase().includes(s) ||
        r.id?.toString().includes(s)
      )
    }
    return list
  } catch (error) {
    console.error('Error in filteredOngoingRequests computed:', error)
    return []
  }
})

// Helper functions for deadline and extension logic
function isDeadlineExpired(deadline) {
  if (!deadline) return false

  try {
    const now = new Date()
    const deadlineDate = new Date(deadline)

    if (isNaN(deadlineDate.getTime())) return false // Invalid date

    return deadlineDate < now
  } catch (error) {
    console.error('Error in isDeadlineExpired:', error, deadline);
    return false;
  }
}

function isInGracePeriod(deadline) {
  if (!deadline) return false

  try {
    const now = new Date()
    const deadlineDate = new Date(deadline)

    if (isNaN(deadlineDate.getTime())) return false // Invalid date

    const gracePeriodEnd = new Date(deadlineDate)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3)

    return deadlineDate < now && now <= gracePeriodEnd
  } catch (error) {
    console.error('Error in isInGracePeriod:', error, deadline);
    return false;
  }
}

function isGracePeriodExpired(deadline) {
  if (!deadline) return false

  try {
    const now = new Date()
    const deadlineDate = new Date(deadline)

    if (isNaN(deadlineDate.getTime())) return false // Invalid date

    const gracePeriodEnd = new Date(deadlineDate)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3)

    return now > gracePeriodEnd
  } catch (error) {
    console.error('Error in isGracePeriodExpired:', error, deadline);
    return false;
  }
}

function canRequestExtension(req) {
  // Can request extension if:
  // 1. Status is APPROVED (ongoing request)
  // 2. Cannot request extension if already has EXTENSION_REQUESTED status
  // 3. Can request extension at any time (before or after deadline)
  const canExtend = req.status === 'APPROVED' && req.status !== 'EXTENSION_REQUESTED'

  return canExtend
}

function elapsedPercent(req) {
  try {
    if (!req?.createdAt || !req?.deadline) return 0;
    const created = new Date(req.createdAt).getTime();
    const deadline = new Date(req.deadline).getTime();
    const now = Date.now();
    const total = Math.max(deadline - created, 1);
    const elapsed = Math.max(Math.min(now - created, total), 0);
    return Math.round((elapsed / total) * 100);
  } catch {
    return 0;
  }
}

function canTranslatorCancelOngoing(req) {
  try {
    const statusOk = ['APPROVED','WAITING_APPROVAL','EXTENSION_REQUESTED','EXTENSION_APPROVED'].includes(req?.status);
    return statusOk && elapsedPercent(req) < 50;
  } catch {
    return false;
  }
}

function openOngoingCancelDialog(req) {
  try { console.log('[ONGOING_CANCEL] Open modal for request', req?.id); } catch (_) {}
  // Gọi summary để xác thực quyền trước khi mở modal
  axiosInstance.get(`/project-cancellation/summary/${req.id}`)
    .then(res => {
      try { console.log('[ONGOING_CANCEL] summary =>', res?.data); } catch (_) {}
      if (!res?.data?.canCancel) {
        toast.add({ severity: 'error', summary: 'Error', detail: res?.data?.message || 'You cannot cancel this request.', life: 4000 })
        return
      }
      ongoingCancelTarget.value = req
      showOngoingCancel.value = true
    })
    .catch(err => {
      const msg = err?.response?.data?.message || err?.message || 'Unable to cancel this request'
      try { console.log('[ONGOING_CANCEL] summary error =>', err?.response?.status, err?.response?.data); } catch (_) {}
      toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
    })
}

async function confirmOngoingCancel() {
  const req = ongoingCancelTarget.value
  if (!req?.id) return;
  try {
    try { console.log('[ONGOING_CANCEL] Confirm cancel request', req?.id); } catch (_) {}
    actionLoading.value = true
    await axiosInstance.post(`/project-cancellation/request`, {
      requestId: Number(req.id),
      reason: 'Translator initiated cancellation from ongoing list',
      action: 'DELETE'
    });
    toast.add({ severity: 'success', summary: 'Cancelled', detail: 'Project cancelled successfully.', life: 3000 });
    showOngoingCancel.value = false
    ongoingCancelTarget.value = null
    await fetchRequests();
  } catch (err) {
    try { console.log('[ONGOING_CANCEL][ERR]', err?.response?.status, err?.response?.data); } catch (_) {}
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message || 'Failed to cancel project', life: 4000 });
    showOngoingCancel.value = false
    ongoingCancelTarget.value = null
  } finally {
    actionLoading.value = false
  }
}

function openAssignedConfirm(action, req) {
  try { console.log('[ASSIGNED_CONFIRM] Open', action, 'for', req?.id); } catch (_) {}
  assignedConfirmAction.value = action
  assignedConfirmTarget.value = req
  showAssignedConfirm.value = true
}

async function confirmAssignedAction() {
  const req = assignedConfirmTarget.value
  if (!req?.id || !assignedConfirmAction.value) return
  actionLoading.value = true
  try {
    if (assignedConfirmAction.value === 'accept') {
      await acceptRequest(req.id)
    } else {
      await rejectRequest(req.id)
    }
    showAssignedConfirm.value = false
    assignedConfirmTarget.value = null
    assignedConfirmAction.value = null
  } catch (err) {
    try { console.log('[ASSIGNED_CONFIRM][ERR]', err?.response?.status, err?.response?.data); } catch (_) {}
  } finally {
    actionLoading.value = false
  }
}

function getDeadlineStatus(req) {
  if (!req.deadline) return { class: '' }

  if (req.status === 'COMPLETED') {
    return { class: 'deadline-completed' }
  }

  if (req.status === 'CANCELLED') {
    return { class: 'deadline-cancelled' }
  }

  try {
    if (isGracePeriodExpired(req.deadline)) {
      return { class: 'deadline-grace-expired' }
    }

    if (isInGracePeriod(req.deadline)) {
      return { class: 'deadline-grace-period' }
    }

    if (isDeadlineExpired(req.deadline)) {
      return { class: 'deadline-expired' }
    }

    const daysLeftValue = daysLeft(req.deadline)
    if (daysLeftValue === null || daysLeftValue === undefined) {
      return { class: 'deadline-normal' }
    }

    if (daysLeftValue === 0) {
      return { class: 'deadline-today' }
    } else if (daysLeftValue <= 3) {
      return { class: 'deadline-urgent' }
    } else if (daysLeftValue <= 7) {
      return { class: 'deadline-warning' }
    } else {
      return { class: 'deadline-normal' }
    }
  } catch (error) {
    console.error('Error in getDeadlineStatus:', error, req)
    return { class: 'deadline-normal' }
  }
}

// ... existing code ...

function clearOngoingFilters() {
  ongoingSearch.value = ''
}


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
  return myRequests.value
})

// Filtered My Requests
const filteredMyRequests = computed(() => {
  try {
    let filtered = debugRequests.value

    // Search filter
    if (myRequestsSearch.value) {
      const searchTerm = myRequestsSearch.value.toLowerCase()
      filtered = filtered.filter(req =>
        req.title?.toLowerCase().includes(searchTerm) ||
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
        // Only show public requests if status is PENDING
        filtered = filtered.filter(req => req.status === 'PENDING' && isRequestPublic(req.isPublic, !!req.assignee))
      } else if (myRequestsVisibilityFilter.value === 'private') {
        // Show private requests or non-PENDING requests
        filtered = filtered.filter(req => req.status !== 'PENDING' || !isRequestPublic(req.isPublic, !!req.assignee))
      }
    }

    // Mark expired requests as EXPIRED or FAILED based on assignee status
    // Also auto-complete WAITING_APPROVAL requests after 3 days
    const now = new Date();
    const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = stripTime(now);
    filtered = filtered.map((req) => {
      // Handle WAITING_APPROVAL auto-completion after 3 days (priority over deadline)
      if (req.status === 'WAITING_APPROVAL' && req.statusChangedAt) {
        const statusChangeDate = new Date(req.statusChangedAt);
        const daysSinceStatusChange = Math.ceil((now - statusChangeDate) / (1000 * 60 * 60 * 24));

        if (daysSinceStatusChange >= 3) {
          return { ...req, status: 'COMPLETED' };
        }
        // If still within 3 days, keep WAITING_APPROVAL status regardless of deadline
        return req;
      }

      // Strong guard: never override final statuses due to deadline
      if (['COMPLETED', 'INCOMPLETED'].includes(req.status)) {
        return req;
      }

      // Handle deadline expiration (only if not WAITING_APPROVAL and not already reviewed
      // Check multiple conditions to determine if request has been reviewed
      // Also check if status indicates it has been reviewed (INCOMPLETED, COMPLETED)
      const hasBeenReviewed = req.reviewedAt || req.reviewDecision || req.reviewRating ||
        req.status === 'INCOMPLETED' || req.status === 'COMPLETED';

      if (req.deadline && req.status !== 'WAITING_APPROVAL' && !hasBeenReviewed) {
        const d = new Date(req.deadline);
        const deadlineDate = stripTime(d);
        if (deadlineDate < today && req.status !== 'COMPLETED' && req.status !== 'CANCELLED') {
          // If request has assignee (project exists) and is overdue, mark as FAILED
          // If no assignee and overdue, mark as EXPIRED
          if (req.project) {
            console.log(`[DEBUG] Overriding status to FAILED for request ${req.id} (deadline expired, has project, not reviewed)`);
            return { ...req, status: 'FAILED' };
          } else {
            console.log(`[DEBUG] Overriding status to EXPIRED for request ${req.id} (deadline expired, no project, not reviewed)`);
            return { ...req, status: 'EXPIRED' };
          }
        }
      }

      // Debug: Log if request has been reviewed
      if (hasBeenReviewed) {
        console.log(`[DEBUG] Request ${req.id} has been reviewed:`, {
          status: req.status,
          reviewedAt: req.reviewedAt,
          reviewDecision: req.reviewDecision,
          reviewRating: req.reviewRating,
          hasBeenReviewed: hasBeenReviewed
        });
      } else {
        console.log(`[DEBUG] Request ${req.id} has NOT been reviewed:`, {
          status: req.status,
          reviewedAt: req.reviewedAt,
          reviewDecision: req.reviewDecision,
          reviewRating: req.reviewRating,
          hasBeenReviewed: hasBeenReviewed
        });
      }

      // Debug: Log full request object for debugging
      console.log(`[DEBUG] Full request ${req.id} object:`, {
        id: req.id,
        title: req.title,
        status: req.status,
        deadline: req.deadline,
        reviewedAt: req.reviewedAt,
        reviewDecision: req.reviewDecision,
        reviewRating: req.reviewRating,
        reviewComment: req.reviewComment,
        hasBeenReviewed: hasBeenReviewed,
        project: req.project
      });

      // If request has been reviewed, ensure we don't override the status
      if (hasBeenReviewed) {
        console.log(`[DEBUG] Request ${req.id} is reviewed, keeping original status: ${req.status}`);
        return req;
      }

      // Additional check: if status is INCOMPLETED or COMPLETED, don't override
      if (req.status === 'INCOMPLETED' || req.status === 'COMPLETED') {
        console.log(`[DEBUG] Request ${req.id} has final status ${req.status}, not overriding`);
        return req;
      }

      return req;
    });



    // Sort the filtered results
    // default sort by deadline asc when no sortKey
    if (!sortKey.value) {
      sortKey.value = 'deadline'
      sortOrder.value = 1
    }
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
  } catch (error) {
    console.error('Error in filteredMyRequests computed:', error)
    return []
  }
})

// Filtered Assigned Requests
const filteredAssignedRequests = computed(() => {
  try {
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
        // Only show public requests if status is PENDING
        filtered = filtered.filter(req => req.status === 'PENDING' && isRequestPublic(req.isPublic, !!req.assignee))
      } else if (assignedRequestsVisibilityFilter.value === 'private') {
        // Show private requests or non-PENDING requests
        filtered = filtered.filter(req => req.status !== 'PENDING' || !isRequestPublic(req.isPublic, !!req.assignee))
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

    return filtered
  } catch (error) {
    console.error('Error in filteredAssignedRequests computed:', error)
    return []
  }
})

// Filtered My Registrations
const filteredMyRegistrations = computed(() => {
  try {
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
        // Only show public requests if status is PENDING
        filtered = filtered.filter(req => req.status === 'PENDING' && isRequestPublic(req.isPublic, !!req.assignee))
      } else if (myRegistrationsVisibilityFilter.value === 'private') {
        // Show private requests or non-PENDING requests
        filtered = filtered.filter(req => req.status !== 'PENDING' || !isRequestPublic(req.isPublic, !!req.assignee))
      }
    }

    // Exclude requests that are currently on-going
    try {
      const ongoingIdSet = new Set((ongoingRequests.value || []).map(r => r.id))
      filtered = filtered.filter(req => !ongoingIdSet.has(req.id))
    } catch (e) {
      console.error('Error excluding on-going from my registrations:', e)
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
  } catch (error) {
    console.error('Error in filteredMyRegistrations computed:', error)
    return []
  }
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
      myRequests.value = res.data || []
    })
    .catch(err => {
      console.error('Error fetching my requests:', err)
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        error.value = 'Không thể kết nối đến server. Vui lòng kiểm tra server có đang chạy không.'
        return
      }
      myRequests.value = []
    })

  // Fetch assigned requests
  const assignedRequestsPromise = axiosInstance.get('/requests/private')
    .then(res => {
      assignedRequests.value = res.data || []
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
      assignedRequests.value = []
    })

  // Fetch my registrations
  const myRegistrationsPromise = axiosInstance.get('/requests/myRegistrations')
    .then(res => {
      myRegistrations.value = res.data || []
    })
    .catch(err => {
      console.error('Error fetching my registrations:', err)
      // Don't set error for registrations as it's optional
      myRegistrations.value = []
    })

  promises.push(myRequestsPromise, assignedRequestsPromise, myRegistrationsPromise)

  // Try fetch ongoing from backend; fallback to derive from assigned
  const ongoingPromise = axiosInstance.get('/requests/ongoing')
    .then(res => {
      ongoingRequests.value = res.data || []
    })
    .catch(() => {
      try {
        ongoingRequests.value = assignedRequests.value.filter(r => r.status === 'APPROVED')
      } catch (e) {
        console.error('[ONGOING] Derive fallback failed:', e)
        ongoingRequests.value = []
      }
    })

  promises.push(ongoingPromise)

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

function daysLeft(dateString) {
  if (!dateString) return null;

  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null; // Invalid date

    const today = new Date();
    const deadlineDate = new Date(d);
    const todayDate = new Date(today);

    // Reset time to start of day
    deadlineDate.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);

    const diff = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  } catch (error) {
    console.error('Error in daysLeft:', error, dateString);
    return null;
  }
}

function daysLeftText(dateString) {
  const n = daysLeft(dateString)
  if (n === null) return ''
  if (n === 0) return 'today'
  if (n === 1) return 'in 1 day'
  return `in ${n} days`
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

function requestExtension(req) {
  selectedRequest.value = req
  showExtension.value = true
}

function viewExtensions(req) {
  selectedRequest.value = req
  showExtensions.value = true
}

function onExtensionSubmitted() {
  fetchRequests()
  toast.add({ severity: 'success', summary: 'Submitted', detail: 'Extension request submitted.', life: 3000 })
}

function onExtensionsUpdated() {
  fetchRequests()
}

function canReview(req) {
  // Hiển thị review/handover cả khi COMPLETED
  return (
    req.status === 'PENDING' ||
    req.status === 'FAILED' ||
    req.status === 'WAITING_APPROVAL' ||
    req.status === 'COMPLETED'
  ) && !req.project
}

function getWaitingApprovalDaysLeft(req) {
  if (req.status !== 'WAITING_APPROVAL' || !req.statusChangedAt) return 0;

  const now = new Date();
  const statusChangeDate = new Date(req.statusChangedAt);
  const daysSinceStatusChange = Math.ceil((now - statusChangeDate) / (1000 * 60 * 60 * 24));

  return Math.max(0, 3 - daysSinceStatusChange);
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

function viewHandover(request) {
  // Navigate to handover page for the request instead of project
  router.push(`/requests/${request.id}/handover`);
}

function getStatusClass(status) {
  const classMap = {
    'PENDING': 'status-pending',
    'APPROVED': 'status-approved',
    'REJECTED': 'status-rejected',
    'COMPLETED': 'status-completed',
    'CANCELLED': 'status-cancelled',
    'EXTENSION_REQUESTED': 'status-extension-requested',
    'EXTENSION_APPROVED': 'status-extension-approved',
    'EXTENSION_REJECTED': 'status-extension-rejected',
    'WAITING_APPROVAL': 'status-waiting-approval',
    'EXPIRED': 'status-expired',
    'FAILED': 'status-failed'
  }
  return classMap[status] || 'status-pending'
}

function formatStatus(status) {
  const statusMap = {
    'PENDING': 'Pending',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'COMPLETED': 'Completed',
    'INCOMPLETED': 'Incompleted',
    'CANCELLED': 'Cancelled',
    'EXTENSION_REQUESTED': 'Extension Requested',
    'EXTENSION_APPROVED': 'Extension Approved',
    'EXTENSION_REJECTED': 'Extension Rejected',
    'WAITING_APPROVAL': 'Waiting Approval',
    'EXPIRED': 'Expired',
    'FAILED': 'Failed'
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
    await axiosInstance.post(`/requests/${requestId}/private`)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Accepted private request',
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

// Actions for assigned private requests
async function acceptAssignedRequest(requestId) {
  assignedActionLoading.value = { ...assignedActionLoading.value, [requestId]: 'accept' }
  try {
    await acceptRequest(requestId)
  } finally {
    const map = { ...assignedActionLoading.value }
    delete map[requestId]
    assignedActionLoading.value = map
  }
}

async function declineAssignedRequest(requestId) {
  assignedActionLoading.value = { ...assignedActionLoading.value, [requestId]: 'decline' }
  try {
    await rejectRequest(requestId)
  } finally {
    const map = { ...assignedActionLoading.value }
    delete map[requestId]
    assignedActionLoading.value = map
  }
}

async function rejectRequest(requestId) {
  actionLoading.value = true
  try {
    await axiosInstance.post(`/requests/${requestId}/decline`)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Declined private request',
      life: 3000
    })
    fetchRequests()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to decline request',
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

function isRequestPublic(isPublic, hasAssignee = false) {
  // Nếu request có assignee thì phải là private
  if (hasAssignee) {
    return false;
  }
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

onMounted(async () => {
  try {
    await fetchRequests()
  } catch (error) {
    console.error('[MOUNTED] Error fetching requests:', error)
  }

  // Handle highlight parameter from URL
  const highlightId = route.query.highlight
  if (highlightId) {
    // Wait a bit for the DOM to be ready
    setTimeout(() => {
      const highlightedElement = document.querySelector(`[data-request-id="${highlightId}"]`)
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add highlight effect
        highlightedElement.classList.add('highlighted-request')
        setTimeout(() => {
          highlightedElement.classList.remove('highlighted-request')
        }, 3000)
      }
    }, 500)
  }
})

// Watch for route changes to refresh data when returning from other pages
watch(() => route.path, async (newPath, oldPath) => {
  // If returning from handover page, refresh data to get updated status
  if (oldPath && oldPath.includes('/handover') && newPath.includes('/my-requests')) {
    console.log('[DEBUG] Returning from handover page, refreshing requests data...');
    try {
      await fetchRequests();
    } catch (error) {
      console.error('[DEBUG] Error refreshing requests after handover:', error);
    }
  }
}, { immediate: false });
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
  overflow-x: auto;
}

.table-wrapper {
  overflow-x: auto;
}

.requests-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0;
  font-size: 0.8rem;
  table-layout: fixed;
}

.table-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 1rem 1.2rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  vertical-align: middle;
}

.table-header.center {
  text-align: center;
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
  justify-content: flex-start;
}

.requests-table td {
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  transition: all 0.2s ease;
  height: 60px;
  box-sizing: border-box;
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

/* Increase spacing between Requester and Category in Assigned Requests */
.requester-header {
  padding-right: 24px;
}
.category-header {
  padding-left: 24px;
}
.requester-cell {
  padding-right: 24px !important;
}
.category-cell {
  padding-left: 24px !important;
}

.deal-amount-cell {
  text-align: center;
  vertical-align: middle;
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
  vertical-align: middle;
}

.deadline-wrapper {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.deadline-text {
  font-weight: 500;
  font-style: italic;
  font-size: 0.8rem;
}

.deal-icon {
  font-size: 0.9rem;
}

.deadline-icon {
  font-size: 0.9rem;
}

/* Ensure consistent table cell alignment */
.request-row td {
  vertical-align: middle;
  padding: 12px 8px;
  height: 60px;
}

.request-row td:first-child {
  text-align: center;
  width: 60px;
}

.request-row td:nth-child(2) {
  text-align: left;
  min-width: 200px;
}

.request-row td:nth-child(3) {
  text-align: left;
  min-width: 150px;
}

.request-row td:nth-child(4) {
  text-align: left;
  min-width: 120px;
}

.request-row td:nth-child(5) {
  text-align: center;
  min-width: 120px;
}

.request-row td:nth-child(6) {
  text-align: center;
  min-width: 130px;
}

.request-row td:nth-child(7) {
  text-align: center;
  min-width: 120px;
  padding-right: 40px !important;
}

.request-row td:nth-child(8) {
  text-align: center;
  min-width: 100px;
  padding-left: 40px !important;
}

.request-row td:nth-child(9) {
  text-align: center;
  min-width: 150px;
}







.request-title {
  font-weight: 500;
  color: #1e293b;
  display: flex;
  align-items: center;
}

/* Ensure Title cell in the registrations table is vertically centered */
.request-row td.request-title {
  display: flex;
  align-items: center;
}

.request-row td.request-title a {
  display: inline-flex;
  align-items: center;
}

.deal-amount {
  font-weight: 600;
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 40px;
  padding: 8px 4px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.8rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: auto;
  min-height: 28px;
  justify-content: center;
  white-space: normal;
  min-width: 80px;
  text-align: center;
  line-height: 1.2;
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

.actions-cell {
  text-align: center;
  vertical-align: middle;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.status-cell, .visibility-cell, .actions-cell {
  text-align: center;
  vertical-align: middle;
  min-width: 120px;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* Increase spacing between Status and Visibility columns */
.status-cell {
  padding-right: 50px !important;
}

.visibility-cell {
  padding-left: 50px !important;
}

.actions-wrapper {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: center;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 60px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  min-width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.action-btn:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  transform: translateY(-1px);
}

/* Tooltip styles */
[data-tooltip] {
  position: relative;
}

[data-tooltip]:hover::before {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  z-index: 1000;
  margin-bottom: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: tooltipFadeIn 0.2s ease-out;
}

[data-tooltip]:hover::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.9);
  margin-bottom: -0.5rem;
  z-index: 1000;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Tab content animation */
.tab-content {
  animation: tabFadeIn 0.3s ease-out;
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cancel-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.cancel-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

.accept-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.accept-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.decline-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.decline-btn:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
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

.handover-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.handover-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.btn-text {
  font-weight: 500;
  white-space: nowrap;
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

.extension-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  margin-left: 4px;
}

.status-message {
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  font-style: italic;
  height: auto;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: normal;
  text-align: center;
  line-height: 1.2;
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

.status-message.incompleted {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
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

/* Expired status */
.status-badge.status-expired {
  background: #fee2e2;
  color: #b91c1c;
}

/* Failed status */
.status-badge.status-failed {
  background: #fef2f2;
  color: #dc2626;
}

/* Incompleted status */
.status-badge.status-incompleted {
  background: #fef3c7;
  color: #92400e;
}

/* Extension statuses */
.status-badge.status-extension-requested {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-extension-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-extension-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-waiting-approval {
  background: #fef3c7;
  color: #92400e;
}

.visibility-badge {
  padding: 0.2rem 0.8rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  height: auto;
  min-height: 28px;
  justify-content: center;
  white-space: normal;
  min-width: 80px;
  text-align: center;
  line-height: 1.2;
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
  transform: translateY(0);
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
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
  background: #f3f4f6;
  color: #6b7280;
  position: relative;
  transform: translateY(0);
}

.tab-button:hover {
  background: #e5e7eb;
  color: #374151;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tab-button.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
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

  .grace-period-banner {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .banner-icon {
    align-self: center;
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

.extensions-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.extensions-btn:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-1px);
}

.extension-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  position: relative;
}

.extension-btn:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-1px);
}

.grace-period-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  margin-left: 4px;
}

.deadline-info {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
}

.grace-expired-message {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.deadline-expired-message {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Grace Period Banner */
.grace-period-banner {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #fbbf24;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.1);
}

.banner-icon {
  width: 48px;
  height: 48px;
  background: #f59e0b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.banner-content h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 700;
  color: #92400e;
}

.banner-content p {
  margin: 0;
  font-size: 14px;
  color: #92400e;
  line-height: 1.5;
}

.banner-content strong {
  color: #78350f;
  font-weight: 700;
}

/* Highlight effect for requests */
.highlighted-request {
  animation: highlightPulse 3s ease-in-out;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
  border-left: 4px solid #f59e0b !important;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.3) !important;
}

/* Auto-completion info styles */
.auto-completion-info {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  margin-top: 0.3rem;
}

.auto-completion-info .days-left {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
}

.auto-completion-info .auto-completing {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.auto-completion-info i {
  font-size: 0.8rem;
}

/* No actions message */
.no-actions-message {
  color: #9ca3af;
  font-size: 0.75rem;
  font-style: italic;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

@keyframes highlightPulse {
  0% {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    transform: scale(1);
  }
  50% {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    transform: scale(1.02);
  }
  100% {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    transform: scale(1);
  }
}
</style>

<style scoped>
/* Modal Styles for Ongoing Cancel */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 16px 20px; border-top: 1px solid #e5e7eb; }
.modal-close { background: none; border: none; font-size: 18px; color: #6b7280; cursor: pointer; }
.warning-message { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.warning-message i { font-size: 36px; color: #f59e0b; }
.btn-secondary { background: #f3f4f6; border: 1px solid #d1d5db; color: #374151; padding: 8px 16px; border-radius: 8px; }
.btn-danger { background: #dc2626; border: 1px solid #dc2626; color: #fff; padding: 8px 16px; border-radius: 8px; }
</style>
