/* eslint-disable */
<template>
  <div class="request-detail-wrapper">
    <Toast position="top-right" />
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="request-detail-grid">
          <!-- LEFT COLUMN -->
          <div class="left-column">
            <!-- Request Overview Card -->
            <div class="info-card">
              <div class="info-card-title">Request Overview</div>
              <div class="overview-grid">
                <div class="overview-row">
                  <span class="overview-label">Title</span>
                  <span class="overview-value">{{ request?.title || 'N/A' }}</span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Amount</span>
                  <span class="overview-value amount"><span class="icon">💵</span> {{ formatAmount(request?.dealAmount) }}</span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Deadline</span>
                  <span class="overview-value deadline"><span class="icon">🕒</span> {{ formatDate(request?.deadline) }}<span v-if="timeRemaining >= 0" class="time-remaining"> ({{ timeRemaining }} days left)</span></span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Status</span>
                  <span class="overview-value"><span class="status-badge" :class="statusClass(request?.status)"><span class="icon">⏳</span> {{ formatStatus(request?.status) }}</span></span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Visibility</span>
                  <span class="overview-value"><span class="visibility-badge" :class="request?.isPublic ? 'public' : 'private'">{{ request?.isPublic ? 'Public' : 'Private' }}</span></span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Requester</span>
                  <span class="overview-value">{{ request?.requester?.username || 'N/A' }}</span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Category</span>
                  <span class="overview-value">{{ request?.category?.name || 'N/A' }}</span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Tags</span>
                  <span class="overview-value">
                    <template v-if="request?.tags && request.tags.length">
                      <span v-for="tag in request.tags" :key="tag.id" class="tag-badge">{{ tag.name }}</span>
                    </template>
                    <template v-else>
                      N/A
                    </template>
                  </span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">Created At</span>
                  <span class="overview-value">{{ formatDate(request?.createdAt) }}</span>
                </div>
              </div>
            </div>
            <!-- Description Card -->
            <div class="info-card">
              <div class="info-card-title">Description</div>
              <div v-if="request?.description" class="instructions-note">
                <div class="note-content">{{ request.description }}</div>
              </div>
            </div>
            <!-- Attached Files Card -->
            <div v-if="request?.files && request.files.length > 0" class="info-card">
              <div class="info-card-title">
                <i class="pi pi-paperclip"></i>
                Attached Files ({{ request.files.length }})
              </div>
              <div class="files-list">
                <div v-for="file in request.files" :key="file.id" class="file-item">
                  <div class="file-info">
                    <div class="file-icon">
                      <i class="pi pi-file"></i>
                    </div>
                    <div class="file-details">
                      <span class="file-name">{{ file.fileName }}</span>
                      <span class="file-size">{{ formatFileSize(file.fileSize) }}</span>
                    </div>
                  </div>
                  <Button
                    icon="pi pi-download"
                    label="Download"
                    @click="downloadFile(file)"
                    class="p-button-text download-btn"
                  />
                </div>
              </div>
            </div>
          </div>
          <!-- RIGHT COLUMN -->
          <div class="right-column">
            <!-- Requester Information Card -->
            <div class="info-card">
              <div class="info-card-title">Requester Information</div>
              <div class="requester-block">
                <Avatar :image="request?.requester?.avatar" :label="getInitial(request?.requester?.fullName || request?.requester?.username)" shape="circle" size="large" />
                <div class="requester-details">
                  <span class="username">{{ request?.requester?.fullName || request?.requester?.username || 'N/A' }}</span>
                  <span class="user-email">
                    <i class="pi pi-envelope"></i>
                    <a v-if="request?.requester?.email" :href="`mailto:${request.requester.email}`" class="email-link">{{ request.requester.email }}</a>
                    <span v-else>N/A</span>
                  </span>
                  <span class="user-phone">
                    <i class="pi pi-phone"></i>
                    <a v-if="request?.requester?.phone" :href="`tel:${request.requester.phone}`" class="phone-link">{{ request.requester.phone }}</a>
                    <span v-else>N/A</span>
                  </span>
                </div>
              </div>
            </div>
            <!-- Assigned Translator Card (only if exists) -->
            <div v-if="request && request.assignee" class="info-card">
              <div class="info-card-title">Assigned Translator</div>
              <div class="requester-block">
                <Avatar :image="request.assignee?.avatar" :label="getInitial(request.assignee?.username)" shape="circle" size="large" />
                <div class="requester-details">
                  <span class="username">{{ request.assignee?.fullName || 'N/A' }}</span>
                  <span class="user-email">
                    <i class="pi pi-envelope"></i>
                    <a v-if="request.assignee?.email" :href="`mailto:${request.assignee.email}`" class="email-link">{{ request.assignee.email }}</a>
                    <span v-else>N/A</span>
                  </span>
                  <span class="user-phone">
                    <i class="pi pi-phone"></i>
                    <a v-if="request.assignee?.phone" :href="`tel:${request.assignee.phone}`" class="phone-link">{{ request.assignee.phone }}</a>
                    <span v-else>N/A</span>
                  </span>
                </div>
              </div>
            </div>
            <!-- Actions Card -->
            <div class="info-card">
              <div class="info-card-title">Actions</div>
              <div class="actions">
                <button
                  v-if="request && request.assignee && request.requester && userId !== null && request.requester.id === userId"
                  class="action-btn primary"
                >
                  <i class="pi pi-envelope"></i> Contact Translator
                </button>
                <button
                  v-if="request && request.requester && userId !== null && request.requester.id !== userId"
                  class="action-btn info"
                  @click="contactRequester"
                >
                  <i class="pi pi-envelope"></i> Contact Requester
                </button>
                <button
                  v-if="request && request.requester && userId !== null && request.requester.id === userId && !['APPROVED', 'CANCELLED', 'COMPLETED'].includes(request.status)"
                  class="action-btn edit"
                  @click="showEdit = true"
                >
                  <i class="pi pi-pencil"></i> Edit Request
                </button>
                <button
                  v-if="request && request.requester && userId !== null && request.requester.id === userId && !['APPROVED', 'CANCELLED', 'COMPLETED'].includes(request.status)"
                  class="action-btn danger"
                  @click="cancelRequest"
                >
                  <i class="pi pi-times"></i> Cancel Request
                </button>
                <button
                  v-if="request && request.isPublic === false && request.requester && userId !== null && request.requester.id !== userId"
                  class="action-btn approve"
                  @click="approveRequest"
                >
                  <i class="pi pi-check"></i> Approve
                </button>
                <button
                  v-if="request && request.isPublic === false && request.requester && userId !== null && request.requester.id !== userId"
                  class="action-btn reject"
                  @click="rejectRequest"
                >
                  <i class="pi pi-times"></i> Reject
                </button>
                <button
                  v-if="request && request.isPublic && !request.assignee && userId !== null && request.requester && request.requester.id !== userId && request.status === 'PENDING'"
                  class="action-btn primary"
                  @click="registerForRequest"
                  :disabled="request?.isRegistered"
                >
                  <i class="pi pi-user-plus"></i>
                  <span v-if="request?.isRegistered">Registered</span>
                  <span v-else>Register for this request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    <!-- Edit Request Modal -->
    <RequestEditView v-if="showEdit" :request="request" @close="showEdit = false" @updated="onRequestUpdated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import Footer from '../components/AppFooter.vue';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import 'primeicons/primeicons.css';
import axiosInstance from '../api';
import { authService } from '../services/auth.service';
import RequestEditView from './RequestEditView.vue'
import { nextTick } from 'vue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
// import { useUserStore } from '../store/user'; // Nếu có store user

interface UserInfo {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
  role?: string;
  company?: string;
}
interface CategoryInfo {
  id: number;
  name: string;
}
interface AttachmentInfo {
  name: string;
  url: string;
}

interface FileInfo {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
}
interface RequestDetail {
  id: number;
  title: string;
  description: string;
  dealAmount: number;
  deadline: string;
  createdAt: string;
  status: string;
  isPublic: boolean;
  requester?: UserInfo;
  assignee?: UserInfo;
  category?: CategoryInfo;
  previewText?: string;
  attachment?: AttachmentInfo;
  files?: FileInfo[];
  project?: any;
}

const route = useRoute();
const router = useRouter();
const request = ref<RequestDetail | null>(null);
const loading = ref<boolean>(true);
const userId = ref<number | null>(null);
const showEdit = ref(false)
const toast = useToast();

const timeRemaining = computed(() => {
  if (!request.value?.deadline) return null;
  const now = new Date();
  const deadline = new Date(request.value.deadline);
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
});

function formatDate(date: string | Date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatAmount(amount: number) {
  if (amount == null) return '-';
  return Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function formatStatus(status: string) {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pending',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'IN_PROGRESS': 'In Progress',
  };
  return statusMap[status] || status;
}
function statusClass(status: string) {
  return {
    'PENDING': 'pending',
    'APPROVED': 'approved',
    'REJECTED': 'rejected',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
    'IN_PROGRESS': 'inprogress',
  }[status] || 'pending';
}
function getInitial(name: string | undefined) {
  return name ? name.charAt(0).toUpperCase() : '?';
}
function downloadFile(file: AttachmentInfo) {
  // Logic tải file
  if (!file?.url) return;
  window.open(file.url, '_blank');
}
function contactRequester() {
  if (request.value?.requester?.email) {
    window.open(`mailto:${request.value.requester.email}`);
  } else {
    alert('Requester chưa cập nhật email');
  }
}
// const userStore = useUserStore();
const canEdit = computed(() => {
  // Chỉ cho phép sửa nếu là requester và trạng thái KHÔNG phải là APPROVED, CANCELLED, COMPLETED
  return (
    request.value &&
    request.value.requester &&
    userId.value !== null &&
    request.value.requester.id === userId.value &&
    !['APPROVED', 'CANCELLED', 'COMPLETED'].includes(request.value.status)
  );
});
const canContact = computed(() => !!request.value?.assignee && request.value?.requester?.id !== userId.value);

function onRequestUpdated() {
  // Refetch request details after update
  fetchRequestDetail()
}

async function fetchRequestDetail() {
  loading.value = true
  try {
    const requestId = route.params.requestId;
    const res = await axiosInstance.get(`/requests/${requestId}/detail`);
    request.value = res.data;
  } catch (e) {
    request.value = null;
  } finally {
    loading.value = false;
  }
}

async function cancelRequest() {
  if (!request.value?.id) return;
  try {
    await axiosInstance.post(`/requests/${request.value.id}/cancel`);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Request cancelled successfully!', life: 3000 });
    await nextTick();
    setTimeout(() => {
      router.push({ name: 'my-requests' });
    }, 1500);
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Failed', detail: 'Failed to cancel request.', life: 3000 });
  }
}

function approveRequest() {
  alert('Approve request!');
}
function rejectRequest() {
  alert('Reject request!');
}

async function registerForRequest() {
  if (!request.value?.id) return;
  try {
    await axiosInstance.post(`/requests/${request.value.id}/register`);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Successfully registered for this request! Please check your chat or email.', life: 3000 });
    await fetchRequestDetail();
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Failed', detail: e?.response?.data?.message || 'Registration failed.', life: 3000 });
  }
}

onMounted(async () => {
  const user = await authService.getCurrentUser();
  userId.value = user?.id ?? null;
  await fetchRequestDetail();
});
</script>

<style scoped>
.request-detail-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9f9fb;
}
.main-content {
  flex: 1;
  display: flex;
  margin-left: 220px;
}
.content {
  flex: 1;
  padding: 32px 0;
  width: 100%;
  display: flex;
  justify-content: center;
}
.request-detail-grid {
  display: flex;
  flex-direction: row;
  gap: 32px;
  max-width: 1200px;
  width: 100%;
}
.left-column {
  flex: 2 1 600px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.right-column {
  flex: 1 1 320px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.info-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(59,130,246,0.06);
  padding: 24px 24px 18px 24px;
  margin-bottom: 0;
}
.info-card-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 18px;
}
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}
.overview-row {
  display: flex;
  flex-direction: column;
  font-size: 15px;
}
.overview-label {
  color: #64748b;
  font-weight: 500;
  margin-bottom: 2px;
}
.overview-value {
  color: #1e293b;
  font-weight: 600;
  word-break: break-word;
}
.amount {
  color: #059669;
  font-weight: 700;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.deadline {
  color: #1e293b;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.time-remaining {
  color: #f59e42;
  font-size: 13px;
  margin-left: 6px;
}
.status-badge {
  background: #fef3c7;
  color: #92400e;
  border-radius: 9999px;
  padding: 3px 12px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.visibility-badge.private {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 9999px;
  padding: 3px 12px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.visibility-badge.public {
  background: #dbeafe;
  color: #1e40af;
}
.instructions-note {
  margin-bottom: 10px;
}
.note-content {
  background: #f3f4f6;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  color: #1e293b;
  line-height: 1.5;
}
.attached-file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.file-name {
  color: #1e293b;
  font-size: 15px;
  font-weight: 500;
}

/* Files List Styles */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.file-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-icon {
  color: #64748b;
  font-size: 1.2rem;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  color: #1e293b;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.file-size {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.download-btn {
  padding: 6px 12px !important;
  font-size: 12px !important;
  min-width: auto !important;
}
.requester-block {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
}
.requester-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.username {
  font-weight: 600;
  font-size: 16px;
}
.user-role {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}
.user-email, .user-phone {
  color: #64748b;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.email-link, .phone-link {
  color: #2563eb;
  text-decoration: none;
  transition: color 0.2s;
}
.email-link:hover, .phone-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}
.user-company {
  color: #64748b;
  font-size: 14px;
}
.user-rating {
  color: #f59e42;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.user-specialty {
  color: #1e40af;
  font-size: 14px;
  font-weight: 500;
}
.user-since {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
.action-btn {
  width: 100%;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.action-btn.primary {
  background: #2563eb;
  color: #fff;
}
.action-btn.primary:hover:enabled {
  background: #1d4ed8;
}
.action-btn.edit {
  background: #e0e7ff;
  color: #2563eb;
  border: 1.5px solid #2563eb;
}
.action-btn.edit:hover:enabled {
  background: #2563eb;
  color: #fff;
  border-color: #1d4ed8;
}
.action-btn.danger {
  background: #fee2e2;
  color: #ef4444;
  border: 1.5px solid #ef4444;
}
.action-btn.danger:hover:enabled {
  background: #ef4444;
  color: #fff;
  border-color: #b91c1c;
}
.action-btn.info {
  background: #e0f2fe;
  color: #0369a1;
  border: 1.5px solid #0369a1;
}
.action-btn.info:hover:enabled {
  background: #0369a1;
  color: #fff;
  border-color: #0c4a6e;
}
.action-btn.approve {
  background: #d1fae5;
  color: #059669;
  border: 1.5px solid #059669;
  margin-bottom: 4px;
}
.action-btn.approve:hover:enabled {
  background: #059669;
  color: #fff;
  border-color: #047857;
}
.action-btn.reject {
  background: #fee2e2;
  color: #ef4444;
  border: 1.5px solid #ef4444;
  margin-bottom: 4px;
}
.action-btn.reject:hover:enabled {
  background: #ef4444;
  color: #fff;
  border-color: #b91c1c;
}
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.tag-badge {
  display: inline-block;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 8px;
  padding: 2px 10px;
  margin-right: 6px;
  font-size: 13px;
  font-weight: 500;
}
@media (max-width: 1100px) {
  .request-detail-grid {
    flex-direction: column;
    gap: 24px;
    max-width: 100%;
  }
  .left-column, .right-column {
    max-width: 100%;
    min-width: 0;
  }
}
@media (max-width: 900px) {
  .main-content {
    margin-left: 0;
  }
}
</style>
