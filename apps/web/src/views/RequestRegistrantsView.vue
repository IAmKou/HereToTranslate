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
            <div class="page-desc">List of candidates who have registered for this request.</div>
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
                    <Avatar
                      :image="user.avatar || ''"
                      :label="getInitial(user.fullName || user.username)"
                      shape="circle"
                      size="large"
                      class="candidate-avatar-table"
                      :style="!user.avatar ? { background: getAvatarColor(user.fullName || user.username), color: '#fff' } : {}"
                    />
                    <div class="candidate-name-email">
                      <span class="candidate-name-link" @click="viewUserProfile(user.id)">
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
                    <span class="approved-label"><i class="pi pi-check-circle"></i> Approved</span>
                  </template>
                  <template v-else>
                    <Button
                      :label="approvingUser === user.id ? 'Approving...' : 'Approve'"
                      :icon="approvingUser === user.id ? 'pi pi-spinner pi-spin' : 'pi pi-check'"
                      :disabled="approvingUser !== null"
                      class="approve-btn"
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
    <Dialog v-model:visible="showProfileModal" :modal="true" :closable="true" header="Translator Info" :style="{ width: '720px', maxWidth: '98vw', paddingTop: '18px', paddingBottom: '18px' }">
      <div v-if="selectedUser">
        <div class="profile-modal-content-v2">
          <div class="profile-header">
            <Avatar :image="selectedUser.avatar || ''" :label="getInitial(selectedUser.fullName || selectedUser.username)" shape="circle" size="xxlarge" class="profile-avatar-v2" :style="!selectedUser.avatar ? { background: getAvatarColor(selectedUser.fullName || selectedUser.username) } : {}" />
            <div class="profile-main-info">
              <div class="profile-name-v2">{{ selectedUser.fullName }} <span class="profile-username">@{{ selectedUser.username }}</span></div>
              <div class="profile-badges">
                <span v-if="selectedUser.isOwner" class="badge owner">Owner</span>
                <span v-if="selectedUser.verified" class="badge verified">Verified</span>
                <span class="badge member">Member since {{ formatDate(selectedUser.joined) }}</span>
              </div>
              <div class="profile-actions">
                <Button label="Contact" icon="pi pi-envelope" class="contact-btn" @click="contactUser(selectedUser.email)" />
              </div>
              <div class="profile-email-modal">
                <i class="pi pi-envelope"></i>
                <a :href="`mailto:${selectedUser.email}`">{{ selectedUser.email }}</a>
                <Button icon="pi pi-copy" class="copy-btn" @click="copyEmailToClipboard(selectedUser.email)" v-tooltip="'Copy email'" />
              </div>
              <div class="profile-phone-modal" v-if="selectedUser.phone">
                <i class="pi pi-phone"></i>
                <span>{{ selectedUser.phone }}</span>
              </div>
            </div>
          </div>
          <div class="profile-meta">
            <div>Last seen: {{ selectedUser.lastSeen || '—' }}</div>
            <div>Languages: {{ selectedUser.languages?.join(', ') || '—' }}</div>
            <div>Location: {{ selectedUser.location || '—' }}</div>
          </div>

          <div class="profile-section-title">Project History</div>
          <div class="profile-projects">
            <div v-if="selectedUser.projects && selectedUser.projects.length > 0" class="projects-list">
              <div v-for="project in selectedUser.projects" :key="project.id" class="project-item">
                <div class="project-header">
                  <span class="project-name">{{ project.name }}</span>
                  <span class="project-status" :class="project.status">{{ project.status }}</span>
                </div>
                <div class="project-details">
                  <span class="project-role">{{ project.role }}</span>
                  <span class="project-date">{{ formatDate(project.completedAt) }}</span>
                </div>
                <div v-if="project.rating" class="project-rating">
                  <span class="rating-label">Rating:</span>
                  <div class="rating-stars">
                    <i v-for="star in 5" :key="star"
                       :class="['pi', star <= project.rating ? 'pi-star-fill' : 'pi-star']"
                       :style="{ color: star <= project.rating ? '#fbbf24' : '#d1d5db' }">
                    </i>
                  </div>
                  <span class="rating-text">{{ project.rating }}/5</span>
                </div>
              </div>
            </div>
            <div v-else class="no-projects">
              <i class="pi pi-folder-open"></i>
              <span>No projects completed yet</span>
            </div>
          </div>

          <div class="profile-section-title">Activity History</div>
          <div class="profile-activity">
            <div v-if="selectedUser.activities && selectedUser.activities.length > 0" class="activity-list">
              <div v-for="activity in selectedUser.activities" :key="activity.id" class="activity-item">
                <div class="activity-icon">
                  <i :class="getActivityIcon(activity.type)"></i>
                </div>
                <div class="activity-content">
                  <div class="activity-title">{{ activity.title }}</div>
                  <div class="activity-desc">{{ activity.description }}</div>
                  <div class="activity-time">{{ formatDate(activity.createdAt) }}</div>
                </div>
              </div>
            </div>
            <div v-else class="no-activity">
              <i class="pi pi-clock"></i>
              <span>No recent activity</span>
            </div>
          </div>

          <div class="profile-section-title">Contribution Statistics</div>
          <div class="profile-stats">
            <div class="stat-item">
              <div class="stat-number">{{ selectedUser.contribution?.translated?.strings || 0 }}</div>
              <div class="stat-label">Strings Translated</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ selectedUser.contribution?.approved?.strings || 0 }}</div>
              <div class="stat-label">Strings Approved</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ selectedUser.contribution?.voted?.strings || 0 }}</div>
              <div class="stat-label">Votes Cast</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ selectedUser.contribution?.commented?.strings || 0 }}</div>
              <div class="stat-label">Comments Made</div>
            </div>
          </div>
        </div>
        <div v-if="showCopyToast" class="copy-toast">Email copied!</div>
      </div>
      <template #footer>
        <div style="padding: 10px 0 2px 0; display: flex; justify-content: center;">
          <Button label="Done" @click="showProfileModal = false" style="min-width: 90px; font-weight: 700; font-size: 16px; border-radius: 8px; padding: 10px 24px;" />
        </div>
      </template>
    </Dialog>
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
  avatar?: string;
  isOwner: boolean;
  verified?: boolean;
  joined: string;
  lastSeen: string;
  location?: string;
  languages?: string[];
  projects?: Project[];
  activities?: Activity[];
  contribution?: {
    translated?: {
      strings: number;
      words: number;
    };
    approved?: {
      strings: number;
      words: number;
    };
    voted?: {
      strings: number;
    };
    commented?: {
      strings: number;
    };
  };
}

const route = useRoute();
const router = useRouter();
const registrants = ref<UserInfo[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

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

async function reloadRegistrants() {
  loading.value = true;
  try {
    const requestId = route.params.requestId;
    const res = await axiosInstance.get(`/requests/${requestId}/registrants`);
    console.log(res.data);
    if (Array.isArray(res.data)) {
      registrants.value = res.data;
    } else if (res.data && Array.isArray(res.data.registrants)) {
      registrants.value = res.data.registrants;
    } else if (res.data && Array.isArray(res.data.data)) {
      registrants.value = res.data.data;
    } else {
      registrants.value = [];
    }
  } catch (e) {
    registrants.value = [];
  } finally {
    loading.value = false;
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

// Random color for avatar background
function getAvatarColor(name: string) {
  // Simple hash to color
  const colors = ['#e0e7ff', '#fee2e2', '#fef9c3', '#bbf7d0', '#f0abfc', '#bae6fd', '#fcd34d', '#fca5a5', '#a7f3d0', '#fef3c7'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
  } catch (e) {
    registrants.value = [];
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
  gap: 18px;
  margin-bottom: 24px;
  margin-top: 6px;
  min-width: 320px;
  width: 100%;
  max-width: 100%;
}
.info-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(59,130,246,0.08);
  padding: 32px 24px 24px 24px;
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
  border-radius: 18px;
  box-shadow: 0 2px 16px rgba(59,130,246,0.10);
  font-size: 16px;
  margin: 0;
  overflow: hidden;
}
.candidates-table th, .candidates-table td {
  padding: 12px 16px;
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
  font-size: 16px;
  border-bottom: 2.5px solid #e0e7ff;
  letter-spacing: 1px;
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
  width: 48px;
  height: 48px;
  border: 2px solid #2563eb;
  color: #2563eb;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  background-color: #2563eb;
}
.candidate-name-email {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;
}
.candidate-name-link {
  cursor: pointer;
  color: #2563eb;
  text-decoration: underline;
  font-weight: 800;
  font-size: 17px;
  transition: color 0.18s;
  line-height: 1.2;
  white-space: nowrap;
}
.candidate-name-link:hover {
  color: #1746a2;
  text-decoration: underline wavy;
}
.email-text, .phone-text, .joined-text {
  font-size: 16px;
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
  font-size: 28px;
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
  border-radius: 10px !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  padding: 10px 20px !important;
  min-width: 110px !important;
  box-shadow: 0 2px 8px rgba(59,130,246,0.08) !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
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
</style>
