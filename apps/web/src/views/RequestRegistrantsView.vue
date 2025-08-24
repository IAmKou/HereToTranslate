<template>
  <div class="registrants-wrapper">
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="page-header">
          <button class="back-btn" @click="goBack" title="Go back">
            <i class="pi pi-arrow-left"></i>
          </button>
          <div>
            <h1 class="page-title">Request Registrants</h1>
          </div>
        </div>

        <div class="info-card">
          <div v-if="loading" class="loading">
            <span class="spinner"></span> Loading...
          </div>
          <div v-else-if="registrants.length === 0" class="empty-state">
            <img src="../assets/no-candidates.svg" alt="No candidates" class="empty-img" />
            <div class="empty-title">No candidates have registered yet.</div>
            <div class="empty-desc">Share the request link to invite candidates!</div>
          </div>
          <div v-else class="candidates-table-wrapper">
            <table class="candidates-table">
              <thead>
              <tr>
                <th>STT</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(user, index) in pagedRegistrants" :key="user.id" :class="{ 'approved-row': user.approved }">
                <td class="stt-td">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td class="candidate-name-td">
                  <div class="candidate-name-flex">
                    <div class="candidate-avatar-table" :title="user.fullName || user.username">
                      <img
                        v-if="user.avatarUrl && !(user as any)._avatarError"
                        :src="getFullAvatarUrl(user.avatarUrl)"
                        :alt="user.fullName || user.username"
                        style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
                        @error="onUserAvatarError(user, $event)"
                      />
                      <div v-else :style="{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#2563eb',fontWeight:'800',fontSize:'18px'}">
                        {{ getInitial(user.fullName || user.username) }}
                      </div>
                    </div>
                    <div class="candidate-name-email">
                      <span class="candidate-name-text">
                        {{ user.fullName || user.username }}
                      </span>
                      <span v-if="user.verified" class="badge verified">Verified</span>
                    </div>
                  </div>
                </td>
                <td class="candidate-email-td">
                  <span class="email-text">{{ user.email }}</span>
                </td>
                <td class="candidate-phone-td">
                  <span class="phone-text">{{ user.phone || '—' }}</span>
                </td>
                <td class="candidate-joined-td">
                  <span class="joined-text">{{ formatDate(user.createdAt) }}</span>
                </td>
                <td class="candidate-actions-td">
                  <template v-if="user.approved">
                    <span class="approved-status-badge">
                      <i class="pi pi-check-circle"></i>
                      <span>Approved</span>
                    </span>
                  </template>
                  <template v-else>
                    <Button
                      :label="approvingUser === user.id ? 'Processing...' : 'Approve Candidate'"
                      :icon="approvingUser === user.id ? 'pi pi-spinner pi-spin' : 'pi pi-thumbs-up'"
                      :disabled="approvingUser !== null"
                      class="approve-candidate-btn"
                      @click="approveRegistrant(user.id)"
                      v-tooltip="'Approve this candidate'"
                    />
                  </template>
                  <Button
                    label="Details"
                    icon="pi pi-user"
                    class="details-btn"
                    @click="openProfileModal(user)"
                    v-tooltip="'View candidate details'"
                  />
                </td>
              </tr>
              </tbody>
            </table>
            <div class="pagination-wrapper" v-if="totalPages > 1">
              <div class="pagination-info">
                Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, registrants.length) }} of {{ registrants.length }} registrants
              </div>
              <div class="pagination-controls">
                <button class="pagination-btn" :disabled="currentPage === 1" @click="currentPage--">
                  <i class="pi pi-chevron-left"></i> Prev
                </button>
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  class="pagination-btn"
                  :class="{ active: currentPage === page }"
                  @click="currentPage = page"
                >
                  {{ page }}
                </button>
                <button class="pagination-btn" :disabled="currentPage === totalPages" @click="currentPage++">
                  Next <i class="pi pi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    <div v-if="showConfirmDialog" class="custom-modal-approve">
      <div class="modal-overlay" @click="showConfirmDialog = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-icon">
            <i class="pi pi-question-circle"></i>
          </div>
          <button class="close-btn" @click="showConfirmDialog = false">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <h3 class="modal-title">Approve this candidate?</h3>
          <div class="modal-desc">You are about to approve this candidate and proceed to PayPal payment. This action cannot be undone.</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="showConfirmDialog = false">Cancel</button>
          <button class="btn btn-confirm" :disabled="approvingUser !== null" @click="confirmApproveRegistrant">
            <span v-if="approvingUser !== null" class="loading-spinner"></span>
            {{ approvingUser !== null ? 'Processing...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
    <Dialog v-model:visible="showDialog" :modal="true" :closable="true" :header="dialogType === 'error' ? 'Error' : 'Notification'" :style="{ width: '350px' }">
      <div :style="{ color: dialogType === 'error' ? '#ef4444' : '#22c55e', 'font-weight': '600', 'font-size': '16px', 'text-align': 'center' }">
        {{ dialogMessage }}
      </div>
      <template #footer>
        <Button label="OK" @click="showDialog = false" autofocus />
      </template>
    </Dialog>
    <!-- Beautiful Custom Profile Modal -->
    <div v-if="showProfileModal" class="beautiful-profile-modal">
      <div class="modal-backdrop" @click="showProfileModal = false"></div>
      <div class="modal-container">
        <div class="modal-header-section">
          <div class="modal-header-content">
            <div class="modal-title-section">
              <h2 class="modal-title">Translator Profile</h2>
              <p class="modal-subtitle">Detailed information about this candidate</p>
            </div>
            <button class="modal-close-btn" @click="showProfileModal = false">
              <span style="font-weight: bold; font-size: 20px; line-height: 1;">✕</span>
            </button>
          </div>
        </div>

        <div class="modal-body-section" v-if="selectedUser">
          <!-- Profile Hero Section -->
          <div class="profile-hero">
            <div class="hero-avatar">
              <img
                v-if="selectedUser.avatarUrl"
                :src="getFullAvatarUrl(selectedUser.avatarUrl)"
                :alt="selectedUser.fullName || selectedUser.username"
                @error="(e: Event) => { const t = e.target as HTMLImageElement; if (t) t.style.display = 'none'; }"
              />
              <div v-else class="avatar-fallback">
                {{ getInitial(selectedUser.fullName || selectedUser.username) }}
              </div>
            </div>

            <div class="hero-info">
              <div class="hero-name-section">
                <h1 class="hero-name">{{ selectedUser.fullName || selectedUser.username }}</h1>
                <span class="hero-username">@{{ selectedUser.username }}</span>
              </div>

              <div class="hero-badges">
                <span v-if="selectedUser.isOwner" class="badge-modern owner-badge">
                  <i class="pi pi-crown"></i>
                  Owner
                </span>
                <span v-if="selectedUser.verified" class="badge-modern verified-badge">
                  <i class="pi pi-check-circle"></i>
                  Verified
                </span>
                <span class="badge-modern member-badge">
                  <i class="pi pi-calendar"></i>
                  Member since {{ formatDate(selectedUser.joined) }}
                </span>
              </div>


            </div>
          </div>

          <!-- Contact Information Cards -->
          <div class="contact-cards">
            <div class="contact-card">
              <div class="contact-icon">
                <i class="pi pi-envelope"></i>
              </div>
              <div class="contact-details">
                <span class="contact-label">Email</span>
                <a :href="`mailto:${selectedUser.email}`" class="contact-value">{{ selectedUser.email }}</a>
              </div>
            </div>

            <div class="contact-card" v-if="selectedUser.phone">
              <div class="contact-icon">
                <i class="pi pi-phone"></i>
              </div>
              <div class="contact-details">
                <span class="contact-label">Phone</span>
                <span class="contact-value">{{ selectedUser.phone }}</span>
              </div>
            </div>
          </div>

          <!-- Average Star Rating -->
          <div class="stats-section">
            <h3 class="section-title">
              <i class="pi pi-star"></i>
              Average Star Rating
            </h3>
            <div class="rating-display">
              <div class="rating-stars">
                <i
                  v-for="star in 5"
                  :key="star"
                  :class="[
                     'pi',
                     star <= (selectedUser.averageRating || 0) ? 'pi-star-fill' : 'pi-star'
                   ]"
                  :style="{ color: star <= (selectedUser.averageRating || 0) ? '#fbbf24' : '#d1d5db' }"
                ></i>
              </div>
              <div class="rating-info">
                <div class="rating-score">{{ selectedUser.averageRating || 0.0 }}</div>
                <div class="rating-count">Based on {{ selectedUser.totalRatings || 0 }} completed requests</div>
              </div>
            </div>
          </div>

          <!-- Request Statistics Section -->
          <div class="projects-section">
            <h3 class="section-title">
              <i class="pi pi-chart-pie"></i>
              Request Statistics
            </h3>
            <div class="projects-container">
              <div class="request-stats-grid">
                <div class="request-stat-card">
                  <div class="request-stat-icon total-icon">
                    <i class="pi pi-list"></i>
                  </div>
                  <div class="request-stat-content">
                    <div class="request-stat-number">{{ selectedUser.requestStats?.total || 0 }}</div>
                    <div class="request-stat-label">Total Requests</div>
                  </div>
                </div>

                <div class="request-stat-card">
                  <div class="request-stat-icon completed-icon">
                    <i class="pi pi-check-circle"></i>
                  </div>
                  <div class="request-stat-content">
                    <div class="request-stat-number">{{ selectedUser.requestStats?.completed || 0 }}</div>
                    <div class="request-stat-label">Completed</div>
                  </div>
                </div>

                <div class="request-stat-card">
                  <div class="request-stat-icon failed-icon">
                    <i class="pi pi-times-circle"></i>
                  </div>
                  <div class="request-stat-content">
                    <div class="request-stat-number">{{ selectedUser.requestStats?.failed || 0 }}</div>
                    <div class="request-stat-label">Failed</div>
                  </div>
                </div>

                <div class="request-stat-card">
                  <div class="request-stat-icon pending-icon">
                    <i class="pi pi-clock"></i>
                  </div>
                  <div class="request-stat-content">
                    <div class="request-stat-number">{{ selectedUser.requestStats?.pending || 0 }}</div>
                    <div class="request-stat-label">Pending</div>
                  </div>
                </div>
              </div>
            </div>
          </div>




        </div>

        <!-- Copy Toast -->
        <div v-if="showCopyToast" class="copy-toast-modern">
          <i class="pi pi-check"></i>
          <span>Email copied to clipboard!</span>
        </div>
      </div>
    </div>
    <div v-if="showToast" :class="['custom-toast', toastType]">
      <i v-if="toastType === 'success'" class="pi pi-check-circle"></i>
      <i v-else class="pi pi-times-circle"></i>
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import Footer from '../components/AppFooter.vue';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import axiosInstance from '../api';
import { authService } from '../services/auth.service';
import Dialog from 'primevue/dialog';
import { getAvatarUrl as getUserAvatarUrl } from '../services/user.service';

interface Project {
  id: number;
  name: string;
  role: string;
  status: 'completed' | 'in-progress' | 'cancelled';
  completedAt: string;
  rating?: number;
}

interface Activity {
  id: number;
  type: 'translation' | 'approval' | 'comment' | 'vote' | 'project';
  title: string;
  description: string;
  createdAt: string;
}

interface UserInfo {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isOwner: boolean;
  verified?: boolean;
  joined: string;
  lastSeen: string;
  location?: string;
  languages?: string[];
  projects?: Project[];
  activities?: Activity[];
  averageRating?: number;
  totalRatings?: number;
  requestStats?: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  approved?: boolean; // Added for frontend display
}

const route = useRoute();
const router = useRouter();
const registrants = ref<UserInfo[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const requestInfo = ref<{ id: number; title: string; requester?: { id: number; username: string; fullName?: string; email: string; avatarUrl?: string; verified?: boolean } } | null>(null);

const totalPages = computed(() => Math.ceil(registrants.value.length / pageSize.value));
const pagedRegistrants = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return registrants.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const loading = ref(false);
const approvingUser = ref<number | null>(null);
const showDialog = ref(false);
const dialogMessage = ref('');
const dialogType = ref<'success' | 'error'>('success');
const showConfirmDialog = ref(false);
const confirmDialogTitle = ref('');
const confirmDialogDesc = ref('');
const pendingApproveUserId = ref<number | null>(null);
const showProfileModal = ref(false);
const selectedUser = ref<UserInfo | null>(null);
const activeProfileTab = ref('info');
const showCopyToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
const showToast = ref(false);

function getInitial(name: string | undefined) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function formatDate(dateString: string) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getActivityIcon(type: string) {
  const icons = {
    translation: 'pi pi-language',
    approval: 'pi pi-check-circle',
    comment: 'pi pi-comment',
    vote: 'pi pi-thumbs-up',
    project: 'pi pi-folder'
  };
  return icons[type as keyof typeof icons] || 'pi pi-info-circle';
}

function goBack() {
  router.back();
}

function approveRegistrant(userId: number) {
  if (approvingUser.value !== null) return;
  confirmDialogTitle.value = 'Approve this candidate?';
  confirmDialogDesc.value = 'You are about to approve this candidate and proceed to PayPal payment. This action cannot be undone.';
  pendingApproveUserId.value = userId;
  showConfirmDialog.value = true;
}

async function confirmApproveRegistrant() {
  if (approvingUser.value !== null || pendingApproveUserId.value === null) return;
  showConfirmDialog.value = false;
  const userId = pendingApproveUserId.value;
  approvingUser.value = userId;
  try {
    const requestId = route.params.requestId;
    const response = await axiosInstance.post(`/requests/${requestId}/approve/${userId}`);
    if (response.data && response.data.approvalUrl) {
      // Cập nhật trạng thái approved cho user vừa được approve
      const idx = registrants.value.findIndex((u: UserInfo) => u.id === userId);
      if (idx !== -1) registrants.value[idx].approved = true;
      showToastMsg('Approved successfully! Redirecting to PayPal...', 'success');
      setTimeout(() => {
        window.location.href = response.data.approvalUrl;
      }, 1200);
    } else {
      showToastMsg('No approval URL returned from PayPal. Please try again.', 'error');
    }
    await reloadRegistrants();
  } catch (error: any) {
    console.error('Error approving registrant:', error);
    const errorMessage = error.response?.data?.message || 'Failed to approve registrant';
    showToastMsg(errorMessage, 'error');
  } finally {
    approvingUser.value = null;
    pendingApproveUserId.value = null;
  }
}

watch(currentPage, () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 300);
});

async function reloadRegistrants() {
  loading.value = true;
  try {
    const requestId = route.params.requestId;
    const res = await axiosInstance.get(`/requests/${requestId}/registrants`);
    console.log('🟣 [DEBUG] Registrants response:', res.data);
    if (Array.isArray(res.data)) {
      registrants.value = res.data;
    } else if (res.data && Array.isArray(res.data.registrants)) {
      registrants.value = res.data.registrants;
    } else if (res.data && Array.isArray(res.data.data)) {
      registrants.value = res.data.data;
    } else {
      registrants.value = [];
    }
    // normalize: map legacy avatar -> avatarUrl (fallback to /users/avatar/:id)
    registrants.value = registrants.value.map((u: any) => {
      const normalized: any = { ...u };
      const direct = u?.avatarUrl ?? u?.avatar ?? u?.profileImage ?? u?.avatarPath;
      if (direct) normalized.avatarUrl = direct;
      else if (u?.id) normalized.avatarUrl = getUserAvatarUrl(Number(u.id));
      return normalized;
    });
    // Debug: log first registrant to see avatarUrl
    if (registrants.value.length > 0) {
      console.log('🟣 [DEBUG] First registrant (normalized):', registrants.value[0]);
      console.log('🟣 [DEBUG] First registrant avatarUrl:', registrants.value[0].avatarUrl);
      if (registrants.value[0].avatarUrl) {
        console.log('🟣 [DEBUG] First registrant resolved URL:', getFullAvatarUrl(registrants.value[0].avatarUrl as string));
      }
    }
  } catch (e) {
    registrants.value = [];
  } finally {
    loading.value = false;
  }
}

// Get full avatar URL like ProjectMemberTab
function getFullAvatarUrl(avatarUrl?: string) {
  console.log('🟣 [DEBUG] getFullAvatarUrl input:', avatarUrl);
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  if (avatarUrl.startsWith('data:')) return avatarUrl;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  // normalize leading slash
  let path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  // If already under /users, keep; if under /uploads, prefix /users
  if (path.startsWith('/users/')) {
    const result = base + path;
    console.log('🟣 [DEBUG] getFullAvatarUrl result:', result);
    return result;
  }
  if (path.startsWith('/uploads/')) {
    const result = base + '/users' + path;
    console.log('🟣 [DEBUG] getFullAvatarUrl result:', result);
    return result;
  }
  // Fallback: just join to base
  const result = base + path;
  console.log('🟣 [DEBUG] getFullAvatarUrl result:', result);
  return result;
}

// Load request detail to get requester
async function reloadRequestInfo() {
  try {
    const requestId = route.params.requestId;
    const res = await axiosInstance.get(`/requests/${requestId}/detail`);
    requestInfo.value = res.data;
  } catch (e) {
    requestInfo.value = null;
  }
}

function viewUserProfile(userId: number) {
  router.push({ path: `/user/${userId}` });
}

function openProfileModal(user: UserInfo) {
  selectedUser.value = user;
  showProfileModal.value = true;
}

function contactUser(email: string) {
  window.open(`mailto:${email}`);
}

function copyEmailToClipboard(email: string) {
  navigator.clipboard.writeText(email);
  showCopyToast.value = true;
  setTimeout(() => { showCopyToast.value = false; }, 1500);
}



// Avatar error handler: mark user to fallback to initials
function onUserAvatarError(user: UserInfo, _evt: Event) {
  (user as any)._avatarError = true;
}

function showToastMsg(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 1800);
}

onMounted(async () => {
  loading.value = true;
  try {
    const user = await authService.getCurrentUser();
    await reloadRegistrants();
    await reloadRequestInfo();
  } catch (e) {
    registrants.value = [];
    requestInfo.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.registrants-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9f9fb;
}
.main-content {
  flex: 1;
  display: flex;
  margin-left: 220px;
  margin-top: 0;
}
.content {
  flex: 1;
  padding: 24px 32px 0 32px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  margin-top: 4px;
  min-width: 320px;
  width: 100%;
  max-width: 100%;
}
.info-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 3px 16px rgba(59,130,246,0.08);
  padding: 24px 20px 20px 20px;
  margin-bottom: 0;
  max-width: 100%;
  width: 100%;
  min-width: 340px;
}
.loading {
  font-size: 16px;
  color: #64748b;
  margin: 40px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spinner {
  border: 3px solid #e0e7ff;
  border-top: 3px solid #2563eb;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 10px;
  vertical-align: middle;
}
@keyframes spin {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #64748b;
  font-size: 16px;
  margin: 40px 0;
}
.empty-img {
  width: 120px;
  margin-bottom: 16px;
  opacity: 0.7;
}
.empty-title {
  font-weight: 700;
  font-size: 18px;
  margin-bottom: 6px;
}
.empty-desc {
  font-size: 15px;
  color: #94a3b8;
}
.candidates-table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin-top: 8px;
}
.candidates-table {
  width: 100%;
  min-width: 800px;
  max-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(59,130,246,0.10);
  font-size: 14px;
  margin: 0;
  overflow: hidden;
}
.candidates-table th, .candidates-table td {
  padding: 8px 12px;
  text-align: center;
  vertical-align: middle;
}
.candidates-table th:nth-child(2),  /* Name */
.candidates-table td:nth-child(2) {
  min-width: 200px;
}

.candidates-table th:nth-child(3),  /* Email */
.candidates-table td:nth-child(3) {
  min-width: 220px;
}

.candidates-table th:nth-child(4),  /* Phone */
.candidates-table td:nth-child(4) {
  min-width: 140px;
}

.candidates-table th:nth-child(5),  /* Joined */
.candidates-table td:nth-child(5) {
  min-width: 140px;
}

.candidates-table th:nth-child(6),  /* Actions */
.candidates-table td:nth-child(6) {
  min-width: 200px;
}
.candidates-table th {
  background: #f1f5f9;
  color: #2563eb;
  font-weight: 700;
  font-size: 14px;
  border-bottom: 2px solid #e0e7ff;
  letter-spacing: 0.5px;
  text-align: center;
  vertical-align: middle;
}
.candidates-table td.candidate-actions-td {
  text-align: center;
  vertical-align: middle;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.stt-td {
  text-align: center;
  font-weight: 700;
  color: #64748b;
  min-width: 60px;
}
.candidate-name-td {
  min-width: 320px;
}
.candidate-email-td {
  min-width: 320px;
}
.candidate-phone-td {
  min-width: 120px;
}
.candidate-joined-td {
  min-width: 100px;
}
.candidate-actions-td {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 200px;
  text-align: center;
  gap: 10px;
}
.candidate-actions-td .p-button {
  align-self: center;
  margin: 0 !important;
}
.candidates-table tr:not(:last-child) td {
  border-bottom: 1px solid #e0e7ff;
}
.candidates-table tbody tr {
  transition: background 0.18s;
}
.candidates-table tbody tr:hover {
  background: #f4f7fe;
}
.candidates-table tbody tr.approved-row {
  background: #e6f9ed !important;
}
.candidate-name-flex {
  display: flex;
  align-items: center;
  gap: 12px;
}
.candidate-avatar-table {
  width: 36px;
  height: 36px;
  border: 2px solid #2563eb;
  color: #2563eb;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
  background-color: #2563eb;
  border-radius: 50%;
  overflow: hidden;
}
.candidate-name-email {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;
}
.candidate-name-text {
  color: #1e293b;
  font-weight: 700;
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
}
.email-text, .phone-text, .joined-text {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}
.approve-btn {
  background: linear-gradient(90deg, #22c55e 60%, #16a34a 100%) !important;
  border: none !important;
  color: white !important;
  padding: 10px 20px !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  transition: all 0.22s !important;
  min-width: 110px !important;
  box-shadow: 0 2px 8px rgba(34,197,94,0.15) !important;
  margin-right: 4px;
}
.approve-btn:hover:not(:disabled) {
  background: #16a34a !important;
  transform: translateY(-2px) scale(1.04) !important;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.22) !important;
}
.approved-label {
  background: #22c55e;
  color: #fff;
  font-size: 15px;
  border-radius: 8px;
  padding: 6px 18px;
  font-weight: 700;
  margin-left: 8px;
  box-shadow: 0 2px 8px rgba(34,197,94,0.10);
  display: flex;
  align-items: center;
  gap: 6px;
}
.approved-label i {
  color: #fff;
  font-size: 16px;
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}
.page-desc {
  font-size: 15px;
  color: #64748b;
  margin-top: 4px;
}
.back-btn {
  position: static;
  background: #f1f5f9;
  color: #2563eb;
  border: none;
  border-radius: 50px;
  padding: 8px 18px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.back-btn:hover {
  background: #2563eb;
  color: #fff;
}
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  margin-bottom: 8px;
  padding: 16px 0;
  border-top: 1px solid #e0e7ff;
}
.pagination-info {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pagination-btn {
  background: #fff;
  color: #2563eb;
  border: 1.5px solid #2563eb;
  border-radius: 7px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pagination-btn.active, .pagination-btn:hover:not(:disabled) {
  background: #2563eb;
  color: #fff;
}
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
@media (max-width: 900px) {
  .content {
    align-items: stretch;
    padding: 18px 16px 0 16px;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 100vw;
  }
  .info-card {
    max-width: 98vw;
    min-width: unset;
    padding: 24px 16px 20px 16px;
  }
  .candidates-table {
    min-width: 800px;
    font-size: 15px;
    overflow-x: auto;
  }
  .candidates-table th, .candidates-table td {
    padding: 12px 8px;
    display: table-cell;
    vertical-align: middle;
  }
  .pagination-wrapper {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  .pagination-controls {
    justify-content: center;
  }
}
.custom-modal-approve {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.custom-modal-approve .modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}
.custom-modal-approve .modal-content {
  background: #fff;
  border-radius: 24px;
  width: 95%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 16px 64px 0 rgba(59,130,246,0.18);
  padding: 0 0 24px 0;
  animation: modalIn 0.18s cubic-bezier(.4,0,.2,1);
}
@keyframes modalIn {
  0% { transform: scale(0.95) translateY(40px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
.custom-modal-approve .modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 32px 32px 0 32px;
  border-bottom: none;
}
.custom-modal-approve .modal-icon {
  background: linear-gradient(180deg,#e0e7ff 0%,#fff 100%);
  box-shadow: 0 4px 24px 0 rgba(59,130,246,0.10);
  border-radius: 50%;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.7rem;
  color: #2563eb;
  margin-bottom: -24px;
  margin-top: -24px;
  border: 4px solid #fff;
  position: relative;
  z-index: 2;
}
.custom-modal-approve .close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  margin-left: auto;
}
.custom-modal-approve .close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}
.custom-modal-approve .modal-body {
  padding: 0 32px 0 32px;
  text-align: center;
}
.custom-modal-approve .modal-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 10px;
  margin-top: 18px;
}
.custom-modal-approve .modal-desc {
  font-size: 1.08rem;
  color: #64748b;
  margin-bottom: 28px;
  line-height: 1.7;
  max-width: 340px;
  margin-left: auto;
  margin-right: auto;
}
.custom-modal-approve .modal-footer {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 10px;
  padding: 0 32px;
}
.custom-modal-approve .btn {
  min-width: 130px;
  font-size: 1.08rem;
  font-weight: 700;
  border-radius: 14px;
  height: 48px;
  outline: none;
  border: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border 0.2s;
}
.custom-modal-approve .btn-cancel {
  background: #fff;
  color: #222;
  border: 2px solid #222;
}
.custom-modal-approve .btn-cancel:hover {
  background: #f1f5f9;
  color: #111;
}
.custom-modal-approve .btn-confirm {
  background: #2563eb;
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px 0 rgba(59,130,246,0.10);
}
.custom-modal-approve .btn-confirm:hover {
  background: #1746a2;
  color: #fff;
}
.custom-modal-approve .loading-spinner {
  border: 3px solid #e0e7ff;
  border-top: 3px solid #2563eb;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
}
@keyframes spin {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
.profile-modal-content-v2 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px 32px 0 32px;
  box-sizing: border-box;
}
.profile-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24px;
  width: 100%;
  margin-bottom: 18px;
}
.profile-avatar-v2 {
  width: 100px;
  height: 100px;
  font-size: 44px;
  border: 3px solid #2563eb;
  background: #e0e7ff;
  color: #2563eb;
  border-radius: 50%;
  overflow: hidden;
}
.profile-main-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.profile-name-v2 {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
}
.profile-username {
  color: #64748b;
  font-size: 16px;
  font-weight: 500;
}
.profile-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.badge.owner {
  background: #e0e7ff;
  color: #2563eb;
  font-size: 13px;
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 700;
  border: 1.5px solid #2563eb;
}
.badge.verified {
  background: #22c55e;
  color: #fff;
  font-size: 13px;
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 700;
}
.badge.member {
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 700;
}
.profile-actions {
  margin-top: 8px;
  margin-bottom: 2px;
}
.contact-btn {
  background: #fff !important;
  color: #2563eb !important;
  border: 1.5px solid #2563eb !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  transition: background 0.18s, color 0.18s;
  padding: 4px 18px !important;
}
.contact-btn:hover {
  background: #2563eb !important;
  color: #fff !important;
}
.profile-meta {
  display: flex;
  flex-direction: row;
  gap: 32px;
  font-size: 15px;
  color: #64748b;
  margin-bottom: 8px;
  justify-content: center;
  width: 100%;
  flex-wrap: wrap;
}
.profile-section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 12px 0 8px 0;
  align-self: flex-start;
  width: 100%;
}
.profile-projects {
  width: 100%;
}
.projects-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-item {
  background: #f9f9fb;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e0e7ff;
}
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.project-name {
  font-weight: 700;
  color: #1e293b;
  font-size: 16px;
}
.project-status {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
}
.project-status.completed {
  background: #22c55e;
  color: #fff;
}
.project-status.in-progress {
  background: #fbbf24;
  color: #fff;
}
.project-status.cancelled {
  background: #ef4444;
  color: #fff;
}
.project-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #64748b;
}
.project-role {
  font-weight: 600;
  color: #2563eb;
}
.project-date {
  color: #64748b;
}
.project-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.rating-label {
  color: #64748b;
  font-weight: 600;
}
.rating-stars {
  display: flex;
  gap: 2px;
}
.rating-text {
  color: #1e293b;
  font-weight: 700;
}
.no-projects {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 15px;
  padding: 24px;
  background: #f9f9fb;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}
.profile-activity {
  width: 100%;
}
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f9f9fb;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
}
.activity-icon {
  width: 40px;
  height: 40px;
  background: #2563eb;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.activity-content {
  flex: 1;
}
.activity-title {
  font-weight: 700;
  color: #1e293b;
  font-size: 15px;
  margin-bottom: 4px;
}
.activity-desc {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 4px;
}
.activity-time {
  color: #94a3b8;
  font-size: 12px;
}
.no-activity {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 15px;
  padding: 24px;
  background: #f9f9fb;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}
.profile-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
}
.stat-item {
  background: #f9f9fb;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 1px solid #e0e7ff;
}
.stat-number {
  font-size: 24px;
  font-weight: 800;
  color: #2563eb;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}
.profile-email-modal {
  font-size: 15px;
  color: #2563eb;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  margin-bottom: 2px;
}
.profile-email-modal i {
  color: #64748b;
}
.copy-btn {
  background: #f1f5f9 !important;
  color: #2563eb !important;
  border-radius: 6px !important;
  margin-left: 6px;
  font-size: 15px !important;
  padding: 4px 8px !important;
}
.copy-btn:hover {
  background: #2563eb !important;
  color: #fff !important;
}
.copy-toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: #22c55e;
  color: #fff;
  padding: 10px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 2px 16px rgba(34,197,94,0.18);
  z-index: 9999;
  animation: fadeInOut 1.5s;
}
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  90% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}
.custom-toast {
  position: fixed;
  top: 32px;
  right: 32px;
  z-index: 9999;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 2px 16px rgba(59,130,246,0.12);
  animation: fadeInOut 1.8s;
}
.custom-toast.success {
  background: #22c55e;
  color: #fff;
}
.custom-toast.error {
  background: #ef4444;
  color: #fff;
}
.custom-toast i {
  font-size: 20px;
}
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-20px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}
.details-btn {
  background: #fff !important;
  color: #2563eb !important;
  border: 2px solid #2563eb !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  padding: 8px 16px !important;
  min-width: 90px !important;
  box-shadow: 0 2px 6px rgba(59,130,246,0.08) !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  transition: background 0.18s, color 0.18s, border 0.18s;
}
.details-btn:hover:not(:disabled) {
  background: #2563eb !important;
  color: #fff !important;
  border-color: #2563eb !important;
}
.details-btn .pi {
  font-size: 1.1em !important;
  margin-right: 4px;
}
.profile-phone-modal {
  font-size: 15px;
  color: #2563eb;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  margin-bottom: 2px;
}
.profile-phone-modal i {
  color: #64748b;
}
@media (max-width: 600px) {
  .profile-modal-content-v2 {
    padding: 12px 6px 0 6px;
  }
  .profile-header {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .profile-main-info {
    align-items: center;
    text-align: center;
    max-height: 70vh;
    overflow-y: auto;
    padding: 0 1.5rem;
  }
  .profile-stats {
    grid-template-columns: 1fr;
  }
  .profile-meta {
    flex-direction: column;
    gap: 8px;
  }
}
.candidates-table tbody tr:hover {
  background-color: #f1f5f9;
  transition: background 0.15s ease;
}
.email-text {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.approve-candidate-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  border: none !important;
  color: white !important;
  padding: 8px 16px !important;
  border-radius: 8px !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  transition: all 0.25s !important;
  min-width: 120px !important;
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.25) !important;
  margin-right: 8px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.approve-candidate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  transform: translateY(-2px) scale(1.02) !important;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35) !important;
}

.approve-candidate-btn:disabled {
  opacity: 0.7 !important;
  cursor: not-allowed !important;
}

.approved-status-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-size: 14px;
  border-radius: 20px;
  padding: 8px 16px;
  font-weight: 600;
  margin-right: 8px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  gap: 6px;
  border: 2px solid #10b981;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-size: 12px;
}

.approved-status-badge i {
  color: white;
  font-size: 14px;
  margin-right: 2px;
}

.approved-status-badge span {
  font-weight: 700;
  font-size: 12px;
  color: white;
}

/* ===== BEAUTIFUL PROFILE MODAL STYLES ===== */
.beautiful-profile-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modalFadeIn 0.3s ease-out;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  animation: backdropFadeIn 0.3s ease-out;
}

.modal-container {
  background: #ffffff;
  border-radius: 20px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow: hidden;
  position: relative;
  box-shadow: 0 25px 100px rgba(0, 0, 0, 0.25);
  animation: modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes backdropFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(30px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Header Section */
.modal-header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 32px 20px 32px;
  position: relative;
  overflow: hidden;
}

.modal-header-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.modal-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 2;
}

.modal-title-section {
  color: white;
}

.modal-title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 6px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.modal-subtitle {
  font-size: 12px;
  margin: 0;
  opacity: 0.9;
  font-weight: 500;
}

.modal-close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  font-size: 18px;
  font-weight: bold;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* Body Section */
.modal-body-section {
  padding: 24px 32px;
  overflow-y: auto;
  max-height: calc(85vh - 100px);
}

/* Profile Hero Section */
.profile-hero {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.hero-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid white;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 32px;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.hero-name-section {
  margin-bottom: 16px;
}

.hero-name {
  font-size: 20px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 3px 0;
  line-height: 1.2;
}

.hero-username {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}

.hero-badges {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.badge-modern {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  transition: all 0.2s ease;
}

.owner-badge {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

.verified-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.member-badge {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.primary-action {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.primary-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.secondary-action {
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.secondary-action:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-2px);
}

/* Contact Cards */
.contact-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.contact-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.contact-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4f46e5;
  font-size: 18px;
  flex-shrink: 0;
}

.contact-details {
  flex: 1;
  min-width: 0;
}

.contact-label {
  display: block;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.contact-value {
  display: block;
  font-size: 16px;
  color: #1e293b;
  font-weight: 600;
  text-decoration: none;
}

.contact-value:hover {
  color: #3b82f6;
}

/* Stats Section */
.stats-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.section-title i {
  color: #3b82f6;
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  flex-shrink: 0;
}

.translated-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.approved-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.voted-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.commented-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-number {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 3px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

/* Rating Display Styles */
.rating-display {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
  border: 1px solid #f59e0b;
}

.rating-stars {
  display: flex;
  gap: 4px;
  font-size: 32px;
}

.rating-stars i {
  transition: all 0.2s ease;
}

.rating-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-score {
  font-size: 28px;
  font-weight: 800;
  color: #92400e;
  line-height: 1;
}

.rating-count {
  font-size: 12px;
  color: #92400e;
  font-weight: 600;
  opacity: 0.8;
}

/* Request Statistics Section */
.projects-section {
  margin-bottom: 24px;
}

.projects-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  padding: 20px;
}

.request-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.request-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.request-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.request-stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  flex-shrink: 0;
}

.total-icon {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.completed-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.failed-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.pending-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.request-stat-content {
  flex: 1;
  min-width: 0;
}

.request-stat-number {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 3px;
}

.request-stat-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

/* Activity Section */




/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* Copy Toast */
.copy-toast-modern {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 16px 24px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: toastSlideUp 0.3s ease-out;
}

@keyframes toastSlideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-container {
    width: 98%;
    max-height: 95vh;
    border-radius: 20px;
  }

  .modal-header-section {
    padding: 24px 24px 20px 24px;
  }

  .modal-body-section {
    padding: 24px;
  }

  .profile-hero {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .hero-avatar {
    width: 100px;
    height: 100px;
  }

  .hero-name {
    font-size: 28px;
  }

  .hero-badges {
    justify-content: center;
  }

  .hero-actions {
    justify-content: center;
  }

  .contact-cards {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .project-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .project-meta {
    flex-direction: column;
    gap: 8px;
  }
}

</style>

