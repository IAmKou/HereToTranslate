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
          <div class="info-card-title">Registered Candidates</div>
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
                <th>Name</th>
                <th>Actions</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="user in pagedRegistrants" :key="user.id" :class="{ 'approved-row': user.approved }">
                <td class="candidate-name-td">
                  <div class="candidate-name-flex">
                    <Avatar
                      :image="user.avatar || ''"
                      :label="getInitial(user.fullName || user.username)"
                      shape="circle"
                      size="large"
                      class="candidate-avatar-table"
                      :style="!user.avatar ? { background: getAvatarColor(user.fullName || user.username) } : {}"
                    />
                    <div class="candidate-name-email">
                      <span class="candidate-name-link" @click="viewUserProfile(user.id)">
                        {{ user.fullName || user.username }}
                      </span>
                      <span v-if="user.verified" class="badge verified">Verified</span>
                    </div>
                  </div>
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
              <button class="pagination-btn" :disabled="currentPage === 1" @click="currentPage--">Prev</button>
              <button
                v-for="page in totalPages"
                :key="page"
                class="pagination-btn"
                :class="{ active: currentPage === page }"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <button class="pagination-btn" :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
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
    <Dialog v-model:visible="showProfileModal" :modal="true" :closable="true" header="Translator Info" :style="{ width: '520px', maxWidth: '98vw', paddingTop: '18px', paddingBottom: '18px' }">
      <div v-if="selectedUser">
        <div class="profile-modal-content-v2">
          <div class="profile-header">
            <Avatar :image="selectedUser.avatar || ''" :label="getInitial(selectedUser.fullName || selectedUser.username)" shape="circle" size="xxlarge" class="profile-avatar-v2" :style="!selectedUser.avatar ? { background: getAvatarColor(selectedUser.fullName || selectedUser.username) } : {}" />
            <div class="profile-main-info">
              <div class="profile-name-v2">{{ selectedUser.fullName }} <span class="profile-username"></span></div>
              <div class="profile-badges">
                <span v-if="selectedUser.isOwner" class="badge owner">Owner</span>
                <!-- TODO: Add more badges if any -->
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
          <div class="profile-meta" style="margin-top: 18px; width: 100%; display: flex; gap: 32px; justify-content: center; color: #64748b; font-size: 15px;">
            <div>Last seen: {{ selectedUser.lastSeen || '—' }}</div>
            <div>Languages: {{ selectedUser.languages?.join(', ') || '—' }}</div>
          </div>
          <div class="profile-section-title" style="margin-top: 18px;">Activity History</div>
          <div class="profile-history-placeholder">Feature in development...</div>
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

interface UserInfo {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  isOwner: boolean;
  joined: string;
  lastSeen: string;
  languages?: string[];
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
const pageSize = ref(5);

const totalPages = computed(() => Math.ceil(registrants.value.length / pageSize.value));
const pagedRegistrants = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return registrants.value.slice(start, start + pageSize.value);
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
  padding: 18px 0 0 0;
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
  margin-bottom: 18px;
  margin-top: 6px;
  min-width: 320px;
  width: 100%;
  max-width: 100%;
}
.info-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(59,130,246,0.08);
  padding: 32px 18px 18px 18px;
  margin-bottom: 0;
  max-width: 100%;
  width: 100%;
  min-width: 340px;
}
.info-card-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 28px;
  text-align: center;
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
  min-width: 600px;
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
  padding: 10px 18px;
  text-align: left;
  vertical-align: middle;
}
.candidates-table th {
  background: #f1f5f9;
  color: #2563eb;
  font-weight: 700;
  font-size: 18px;
  border-bottom: 2.5px solid #e0e7ff;
  letter-spacing: 0.5px;
  text-align: center;
  vertical-align: middle;
}
.candidates-table td.candidate-actions-td {
  text-align: center;
  vertical-align: middle;
  height: 100%;
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
.candidate-name-td {
  min-width: 220px;
}
.candidate-name-flex {
  display: flex;
  align-items: center;
  gap: 12px;
}
.candidate-avatar-table {
  width: 48px;
  height: 48px;
  font-size: 22px;
  border: 2px solid #2563eb;
  color: #2563eb;
  flex-shrink: 0;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
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
.candidate-email {
  font-size: 14px;
  color: #2563eb;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.candidate-email i {
  color: #64748b;
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
    padding: 32px 8px 24px 8px;
  }
  .candidates-table {
    min-width: 600px;
    font-size: 15px;
  }
  .candidates-table th, .candidates-table td {
    padding: 14px 8px;
  }
  .candidate-name-td {
    gap: 10px;
  }
  .candidate-avatar-table {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }
  .candidate-actions-td {
    min-width: 120px;
    gap: 6px;
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
  gap: 18px;
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
}
.profile-section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 12px 0 4px 0;
  align-self: flex-start;
}
.profile-contribution-table {
  width: 100%;
  border-radius: 10px;
  background: #f9f9fb;
  box-shadow: 0 2px 8px rgba(59,130,246,0.06);
  margin-bottom: 8px;
}
.profile-contribution-header, .profile-contribution-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  padding: 8px 18px;
  align-items: center;
}
.profile-contribution-header {
  font-weight: 700;
  color: #2563eb;
  border-bottom: 1.5px solid #e0e7ff;
  background: #f1f5f9;
}
.profile-contribution-row {
  font-size: 15px;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
}
.profile-contribution-row:last-child {
  border-bottom: none;
}
.profile-note {
  font-size: 13px;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  text-align: center;
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
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  margin-bottom: 2px;
}
.pagination-btn {
  background: #fff;
  color: #2563eb;
  border: 1.5px solid #2563eb;
  border-radius: 7px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}
.pagination-btn.active, .pagination-btn:hover:not(:disabled) {
  background: #2563eb;
  color: #fff;
}
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.profile-tabs {
  display: flex;
  gap: 8px;
  margin: 18px 0 12px 0;
  width: 100%;
}
.profile-tabs button {
  flex: 1;
  padding: 8px 0;
  background: #f1f5f9;
  border: none;
  border-radius: 8px 8px 0 0;
  font-weight: 700;
  color: #2563eb;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}
.profile-tabs button.active, .profile-tabs button:hover {
  background: #2563eb;
  color: #fff;
}
.profile-tab-content {
  width: 100%;
  padding: 12px 0 0 0;
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
.profile-history-placeholder {
  color: #64748b;
  font-size: 15px;
  padding: 18px 0;
  text-align: center;
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
  }
  .profile-tabs {
    flex-direction: column;
    gap: 2px;
  }
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
</style>
