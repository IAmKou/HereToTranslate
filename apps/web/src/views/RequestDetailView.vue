/* eslint-disable */
<template>
  <div class="request-detail-wrapper">
    <Toast position="top-right" />
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-title">
            <h1>Request Details Information</h1>

          </div>
        </div>

        <div class="request-detail-grid">
          <!-- LEFT COLUMN -->
          <div class="left-column">
            <!-- Request Overview Card -->
            <div class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-info-circle"></i>
                Request Overview
              </div>
              <div class="overview-grid">
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-tag"></i>
                    Title
                  </span>
                  <span class="overview-value">{{ request?.title || 'N/A' }}</span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-dollar" style="font-size: 16px;">💰</i>
                    Amount
                  </span>
                  <span class="overview-value amount" :title="'Total amount for this request'">
                    {{ formatAmount(request?.dealAmount) }} <span class="currency">USD</span>
                  </span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-clock"></i>
                    Deadline
                  </span>
                  <span class="overview-value deadline">
                    <div class="deadline-info" :title="`${timeRemaining} days left (out of ${totalDays})`">
                      <i class="pi pi-clock"></i>
                      {{ formatDate(request?.deadline) }}
                      <span v-if="timeRemaining >= 0" class="time-remaining"> ({{ timeRemaining }} days left)</span>
                    </div>
                    <div v-if="timeRemaining >= 0" class="deadline-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" :style="{ width: deadlineProgressPercent + '%', background: deadlineProgressColor }"></div>
                      </div>
                    </div>
                  </span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-check-circle"></i>
                    Status
                  </span>
                  <span class="overview-value">
                                         <span class="status-badge" :class="statusClass(request?.status)">
                       <i class="pi" :class="getStatusIcon(request?.status)"></i>
                       {{ formatStatus(request?.status) }}
                     </span>
                  </span>
                </div>
                <div class="overview-row" v-if="request?.status === 'PENDING'">
                  <span class="overview-label">
                    <i class="pi pi-eye" v-tooltip.top="request?.isPublic ? 'This request is visible to everyone' : 'This request is private'"></i>
                    Visibility
                  </span>
                  <span class="overview-value">
                    <span class="visibility-badge" :class="request?.isPublic ? 'public' : 'private'">
                      <i class="pi" :class="request?.isPublic ? 'pi-globe' : 'pi-lock'"></i>
                      {{ request?.isPublic ? 'Public' : 'Private' }}
                    </span>
                  </span>
                </div>
                <div class="overview-row" v-else>
                  <span class="overview-label">
                    <i class="pi pi-eye"></i>
                    Visibility
                  </span>
                  <span class="overview-value">
                    <span class="visibility-badge private">
                      <i class="pi pi-lock"></i>
                      Private
                    </span>
                  </span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-user"></i>
                    Requester
                  </span>
                  <span class="overview-value">{{ request?.requester?.username || 'N/A' }}</span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-folder"></i>
                    Category
                  </span>
                  <span class="overview-value">
                    <span class="category-badge">{{ request?.category?.name || 'N/A' }}</span>
                  </span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-globe"></i>
                    Target Languages
                  </span>
                  <span class="overview-value">
                    <template v-if="request?.targetLanguages && request.targetLanguages.length">
                      <span v-for="lang in request.targetLanguages" :key="lang" class="language-badge">
                        {{ getLanguageName(lang) }}
                      </span>
                    </template>
                    <template v-else-if="request?.targetLanguage && request.targetLanguage.length">
                      <span v-for="lang in request.targetLanguage" :key="lang" class="language-badge">
                        {{ getLanguageName(lang) }}
                      </span>
                    </template>
                    <template v-else>
                      <span class="no-languages">
                        <i class="pi pi-globe" style="margin-right: 4px; color: #999;"></i>
                        No target languages
                      </span>
                    </template>
                  </span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-tags"></i>
                    Tags
                  </span>
                  <span class="overview-value">
                    <template v-if="request?.tags && request.tags.length">
                      <span v-for="tag in request.tags" :key="tag.id" class="tag-badge">{{ tag.name }}</span>
                    </template>
                    <template v-else>
                      <span class="no-tags">
                        <i class="pi pi-tag" style="margin-right: 4px; color: #999;"></i>
                        No tags
                      </span>
                    </template>
                  </span>
                </div>
                <div class="overview-row">
                  <span class="overview-label">
                    <i class="pi pi-calendar"></i>
                    Created At
                  </span>
                  <span class="overview-value">{{ formatDate(request?.createdAt) }}</span>
                </div>
              </div>
            </div>
            <!-- Description Card -->
            <div class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-file-edit"></i>
                Request Description
              </div>
              <div v-if="request?.description" class="instructions-note">
                <div class="note-content">{{ request.description }}</div>
              </div>
              <div v-else class="no-description">
                <i class="pi pi-info-circle"></i>
                No description provided
              </div>
            </div>
            <!-- Attached Files Card -->
            <div v-if="request?.files && request.files.length > 0" class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-paperclip"></i>
                Attached Files ({{ request.files.length }})
              </div>
              <div class="files-list">
                <div v-for="file in request.files" :key="file.id" class="file-item file-item-hover">
                  <div class="file-info">
                    <div class="file-icon">
                      <i class="pi pi-file"></i>
                    </div>
                    <div class="file-details">
                      <span class="file-name">{{ file.fileName }}</span>
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

            <!-- Status History Card -->
            <div v-if="request?.statusHistory && request.statusHistory.length > 0" class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-history"></i>
                Status History
              </div>
              <div class="status-history-list">
                <div v-for="(history, index) in request.statusHistory" :key="index" class="status-history-item">
                  <div class="history-icon">
                    <i class="pi" :class="getStatusIcon(history.status)"></i>
                  </div>
                  <div class="history-content">
                    <div class="history-status">
                      <span class="status-text">{{ formatStatus(history.status) }}</span>
                      <span class="status-badge-small" :class="statusClass(history.status)">
                        {{ formatStatus(history.status) }}
                      </span>
                    </div>
                    <div class="history-details">
                      <span v-if="history.actor" class="actor">{{ history.actor }}</span>
                      <span class="timestamp">{{ formatDateTime(history.timestamp) }}</span>
                    </div>
                    <div v-if="history.comment" class="history-comment">
                      {{ history.comment }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Reliability Ratings Card -->
            <div v-if="request?.requester?.rating || request?.assignee?.rating" class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-star"></i>
                Reliability Ratings
              </div>
              <div class="ratings-container">
                <div v-if="request?.requester?.rating" class="rating-item">
                  <div class="rating-header">
                    <i class="pi pi-user"></i>
                    <span class="rating-label">Requester Rating</span>
                  </div>
                  <div class="rating-display">
                    <div class="stars">
                      <i v-for="i in 5" :key="i"
                         class="pi"
                         :class="i <= Math.floor(request.requester.rating) ? 'pi-star-fill' :
                                 i <= request.requester.rating ? 'pi-star-half' : 'pi-star'"
                         :style="{ color: i <= request.requester.rating ? '#fbbf24' : '#d1d5db' }">
                      </i>
                    </div>
                    <span class="rating-score">{{ request.requester.rating.toFixed(1) }}</span>
                    <span class="rating-count">({{ request.requester.reviewCount || 0 }} reviews)</span>
                  </div>
                </div>

                <div v-if="request?.assignee?.rating" class="rating-item">
                  <div class="rating-header">
                    <i class="pi pi-user-plus"></i>
                    <span class="rating-label">Translator Rating</span>
                  </div>
                  <div class="rating-display">
                    <div class="stars">
                      <i v-for="i in 5" :key="i"
                         class="pi"
                         :class="i <= Math.floor(request.assignee.rating) ? 'pi-star-fill' :
                                 i <= request.assignee.rating ? 'pi-star-half' : 'pi-star'"
                         :style="{ color: i <= request.assignee.rating ? '#fbbf24' : '#d1d5db' }">
                      </i>
                    </div>
                    <span class="rating-score">{{ request.assignee.rating.toFixed(1) }}</span>
                    <span class="rating-count">({{ request.assignee.reviewCount || 0 }} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Activity Timeline Card -->
            <div class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-calendar"></i>
                Activity Timeline
              </div>
              <div class="activity-timeline">
                <div class="timeline-step">
                  <div class="timeline-icon created"><i class="pi pi-plus-circle"></i></div>
                  <div class="timeline-content">
                    <div class="timeline-title">Created</div>
                    <div class="timeline-date">{{ formatDateTime(request?.createdAt) }}</div>
                  </div>
                </div>
                <div v-if="isApprovedOrAssigned" class="timeline-step">
                  <div class="timeline-icon approved"><i class="pi pi-check-circle"></i></div>
                  <div class="timeline-content">
                    <div class="timeline-title">Approved</div>
                    <div class="timeline-date">
                      {{ request?.approvedAt ? formatDateTime(request.approvedAt) : '-' }}
                    </div>
                    <div v-if="request?.assignee" class="timeline-user">
                      To: {{ request.assignee.fullName || request.assignee.username }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- RIGHT COLUMN -->
          <div class="right-column">
            <!-- Requester Information Card -->
            <div class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-user"></i>
                Requester Information
              </div>
              <div class="requester-block">
                <div class="avatar-container" @click="viewProfile(request?.requester?.id)" title="View Profile">
                  <Avatar
                    :image="request?.requester?.avatar"
                    :label="getInitial(request?.requester?.fullName || request?.requester?.username)"
                    shape="circle"
                    size="large"
                    class="avatar-bordered"
                  />
                  <div class="avatar-overlay">
                    <i class="pi pi-external-link"></i>
                  </div>
                </div>
                <div class="requester-details">
                  <span class="username">
                    <i class="pi pi-user"></i>
                    {{ request?.requester?.fullName || request?.requester?.username || 'N/A' }}
                  </span>
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
            <div v-if="request && request.assignee" class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-user-plus"></i>
                Assigned Translator
              </div>
              <div class="requester-block">
                <div class="avatar-container" @click="viewProfile(request?.assignee?.id)" title="View Profile">
                  <Avatar
                    :image="request.assignee?.avatar"
                    :label="getInitial(request.assignee?.username)"
                    shape="circle"
                    size="large"
                    class="avatar-bordered translator-avatar"
                  />
                  <div class="avatar-overlay">
                    <i class="pi pi-external-link"></i>
                  </div>
                </div>
                <div class="requester-details">
                  <span class="username">
                    <i class="pi pi-user-plus"></i>
                    {{ request.assignee?.fullName || 'N/A' }}
                  </span>
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
            <div class="info-card info-card-hover">
              <div class="info-card-title">
                <i class="pi pi-cog"></i>
                Actions
              </div>
              <div class="actions">
                <button
                  v-if="request && request.assignee && request.requester && userId !== null && request.requester.id === userId"
                  class="action-btn primary"
                  @click="contactTranslator"
                >
                  <i class="pi pi-comments"></i> Contact Translator
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
                  :disabled="request?.isRegistered || registerLoading"
                >
                  <i v-if="registerLoading" class="pi pi-spin pi-spinner"></i>
                  <i v-else class="pi pi-user-plus"></i>
                  <span v-if="request?.isRegistered">Registered</span>
                  <span v-else-if="registerLoading">Registering...</span>
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
    <CancelRequestDialog
      v-if="showCancelDialog"
      :request="request"
      @close="showCancelDialog = false"
      @cancelled="onRequestCancelled"
    />
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
import CancelRequestDialog from '../components/CancelRequestDialog.vue'
import { nextTick } from 'vue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { getEnvironmentConfig } from '../utils/environment';
import { SUPPORTED_LANGUAGES } from '../utils/languages';
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
interface StatusHistory {
  status: string;
  timestamp: string;
  actor?: string;
  comment?: string;
}

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
  rating?: number;
  reviewCount?: number;
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
  statusHistory?: StatusHistory[];
  approvedAt?: string;
  targetLanguages?: string[];
  targetLanguage?: string[];
}

const route = useRoute();
const router = useRouter();
const request = ref<RequestDetail | null>(null);
const loading = ref<boolean>(true);
const userId = ref<number | null>(null);
const showEdit = ref(false)
const showCancelDialog = ref(false);
const registerLoading = ref<boolean>(false);
const toast = useToast();

const timeRemaining = computed(() => {
  if (!request.value?.deadline) return null;
  const now = new Date();
  const deadline = new Date(request.value.deadline);
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
});

const deadlineProgressPercent = computed(() => {
  if (!request.value?.deadline || !request.value?.createdAt) return 0;
  const now = new Date();
  const created = new Date(request.value.createdAt);
  const deadline = new Date(request.value.deadline);
  const total = deadline.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();
  const percent = Math.min(Math.max((elapsed / total) * 100, 0), 100);
  return Math.round(percent);
});

const totalDays = computed(() => {
  if (!request.value?.deadline || !request.value?.createdAt) return 0;
  const created = new Date(request.value.createdAt);
  const deadline = new Date(request.value.deadline);
  return Math.ceil((deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
});

const deadlineProgressColor = computed(() => {
  if (timeRemaining.value == null) return '#3b82f6';
  if (timeRemaining.value > 7) return 'linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)'; // xanh
  if (timeRemaining.value > 3) return 'linear-gradient(90deg, #fde68a 0%, #f59e42 100%)'; // vàng
  return 'linear-gradient(90deg, #fecaca 0%, #ef4444 100%)'; // đỏ
});

function formatDate(date: string | Date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(date: string | Date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusIcon(status: string) {
  const iconMap: Record<string, string> = {
    'PENDING': 'pi-clock',
    'APPROVED': 'pi-check-circle',
    'REJECTED': 'pi-times-circle',
    'COMPLETED': 'pi-check-square',
    'CANCELLED': 'pi-ban',
    'IN_PROGRESS': 'pi-play-circle',
  };
  return iconMap[status] || 'pi-info-circle';
}
function formatAmount(amount: number) {
  if (amount == null) return '-';
  return Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatFileSize(bytes: number | undefined | null) {
  if (!bytes || bytes === 0) return '0 Bytes';
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

function getLanguageName(code: string): string {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.name : code;
}
async function downloadFile(file: FileInfo) {
  // Logic tải file
  console.log('Downloading file:', file);
  if (!file?.id) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'File ID not available', life: 3000 });
    return;
  }
  try {
    // Use axios to download the file with proper authentication
    const config = getEnvironmentConfig();
    const response = await axiosInstance.get(`/files/${file.id}/download`, {
      responseType: 'blob'
    });

    // Create a blob URL and trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to download file', life: 3000 });
  }
}
async function contactRequester() {
  console.log('Contact Requester - Requester data:', request.value?.requester);
  console.log('Contact Requester - Requester username:', request.value?.requester?.username);

  if (!request.value?.requester?.username) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Requester information not available', life: 3000 });
    return;
  }

  try {
    console.log('Making API call to /chat/open-dm with targetIdentifier:', request.value.requester.username);
    // Create a direct chat with the requester
    const response = await axiosInstance.post('/chat/open-dm', {
      targetIdentifier: request.value.requester.username
    });

    console.log('API response:', response);
    console.log('Response data:', response.data);

    if (response.data && response.data._id) {
      console.log('Chat created successfully, navigating to chat view with chat ID:', response.data._id);
      // Navigate to the chat view with the chat ID
      router.push({ name: 'chat', query: { chatId: response.data._id } });
    } else {
      console.log('Failed to create chat room - no _id in response');
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create chat room', life: 3000 });
    }
  } catch (error: any) {
    console.error('Error creating chat:', error);
    console.error('Error response:', error?.response);
    console.error('Error message:', error?.message);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to create chat with requester',
      life: 3000
    });
  }
}
async function contactTranslator() {
  console.log('Contact Translator - Assignee data:', request.value?.assignee);
  console.log('Contact Translator - Assignee username:', request.value?.assignee?.username);

  if (!request.value?.assignee) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Translator information not available', life: 3000 });
    return;
  }

  if (!request.value.assignee.username) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Translator username not available', life: 3000 });
    return;
  }

  try {
    console.log('Making API call to /chat/open-dm with targetIdentifier:', request.value.assignee.username);
    // Create a direct chat with the translator
    const response = await axiosInstance.post('/chat/open-dm', {
      targetIdentifier: request.value.assignee.username
    });

    console.log('API response:', response);
    console.log('Response data:', response.data);

    if (response.data && response.data._id) {
      console.log('Chat created successfully, navigating to chat view with chat ID:', response.data._id);
      // Navigate to the chat view with the chat ID
      router.push({ name: 'chat', query: { chatId: response.data._id } });
    } else {
      console.log('Failed to create chat room - no _id in response');
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create chat room', life: 3000 });
    }
  } catch (error: any) {
    console.error('Error creating chat:', error);
    console.error('Error response:', error?.response);
    console.error('Error message:', error?.message);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.response?.data?.message || 'Failed to create chat with translator',
      life: 3000
    });
  }
}
function viewProfile(userId: number | undefined) {
  if (userId) {
    // Navigate to user profile page
    router.push({ name: 'user-profile', params: { userId: userId.toString() } });
  }
}
function viewFiles() {
  // Scroll to files section or show files modal
  const filesSection = document.querySelector('.files-list');
  if (filesSection) {
    filesSection.scrollIntoView({ behavior: 'smooth' });
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
    console.log('Request detail response:', res.data);
    console.log('All fields:', Object.keys(res.data));
    console.log('Target languages:', res.data.targetLanguages);
    console.log('Target language (singular):', res.data.targetLanguage);
    console.log('Assignee data:', res.data.assignee);
    console.log('Assignee username:', res.data.assignee?.username);
    request.value = res.data;
  } catch (e) {
    console.error('Error fetching request detail:', e);
    request.value = null;
  } finally {
    loading.value = false;
  }
}

async function cancelRequest() {
  if (!request.value?.id) return;
  showCancelDialog.value = true;
}

function onRequestCancelled() {
  toast.add({ severity: 'success', summary: 'Success', detail: 'Request cancelled successfully!', life: 3000 });
  setTimeout(() => {
    router.push({ name: 'my-requests' });
  }, 1500);
}

function approveRequest() {
  alert('Approve request!');
}
function rejectRequest() {
  alert('Reject request!');
}

async function registerForRequest() {
  if (!request.value?.id) return;
  registerLoading.value = true;
  try {
    await axiosInstance.post(`/requests/${request.value.id}/register`);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Successfully registered for this request!', life: 3000 });
    await fetchRequestDetail();
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Failed', detail: e?.response?.data?.message || 'Registration failed.', life: 3000 });
  } finally {
    registerLoading.value = false;
  }
}

const isApprovedOrAssigned = computed(() => {
  return (
    request.value?.status === 'APPROVED' ||
    request.value?.status === 'COMPLETED' ||
    request.value?.status === 'IN_PROGRESS' ||
    request.value?.status === 'CANCELLED' ||
    !!request.value?.assignee
  );
});

onMounted(async () => {
  const user = await authService.getCurrentUser();
  userId.value = user?.id ?? null;
  await fetchRequestDetail();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
:root {
  --main-radius: 18px;
  --main-shadow: 0 4px 24px rgba(59,130,246,0.08);
  --main-font: 'Inter', 'Roboto', Arial, sans-serif;
}
body, .request-detail-wrapper {
  font-family: var(--main-font);
}
.request-detail-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f9f9fb 60%, #e0e7ff 100%);
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
  flex-direction: column;
  align-items: center;
}

/* Page Header Styles */
.page-header {
  width: 100%;
  max-width: 1200px;
  margin-bottom: 32px;
  padding: 0 32px;
}

.page-title {
  margin-bottom: 24px;
}

.page-title h1 {
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px 0;
  letter-spacing: -0.025em;
}

.request-title {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
  line-height: 1.4;
}
.request-detail-grid {
  display: flex;
  flex-direction: row;
  gap: 32px;
  max-width: 1200px;
  width: 100%;
}
.left-column {
  flex: 7;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.right-column {
  flex: 5;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.info-card {
  background: #fff;
  border-radius: var(--main-radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 24px 24px 24px 24px;
  margin-bottom: 0;
  transition: box-shadow 0.2s, transform 0.2s;
  border: 1px solid #f1f5f9;
}
.info-card-hover:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px) scale(1.01);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.info-card-hover:hover + .info-card {
  margin-top: 16px;
  border-top: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
}
.info-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
  letter-spacing: -0.025em;
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.4;
}
.info-card-title i {
  color: #3b82f6;
  font-size: 16px;
}
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}
.overview-row {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  line-height: 1.5;
}
.overview-label {
  color: #6b7280;
  font-weight: 500;
  font-size: 11px;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.5;
}
.overview-label i {
  color: #3b82f6;
  font-size: 12px;
}
.overview-value {
  color: #111827;
  font-weight: 800;
  font-size: 14px;
  line-height: 1.5;
}
.amount {
  color: #1e40af;
  font-weight: 800;
  font-size: 16px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.amount .currency {
  font-size: 11px;
  color: #64748b;
  margin-left: 2px;
  font-weight: 500;
}
.deadline {
  color: #1e293b;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.deadline-info {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}
.time-remaining {
  color: #f59e42;
  font-size: 11px;
  margin-left: 4px;
}
.deadline-progress {
  width: 100%;
  margin-top: 4px;
}
.progress-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease, background 0.3s;
}
.status-badge {
  background: linear-gradient(90deg, #fef3c7 60%, #fde68a 100%);
  color: #b45309;
  border-radius: 9999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(251,191,36,0.08);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-badge.approved {
  background: linear-gradient(90deg, #d1fae5 60%, #6ee7b7 100%);
  color: #047857;
}
.status-badge.pending {
  background: linear-gradient(90deg, #fef3c7 60%, #fde68a 100%);
  color: #b45309;
}
.status-badge.rejected {
  background: linear-gradient(90deg, #fee2e2 60%, #fecaca 100%);
  color: #991b1b;
}
.status-badge.completed {
  background: linear-gradient(90deg, #e0e7ff 60%, #a5b4fc 100%);
  color: #3730a3;
}
.status-badge.cancelled {
  background: linear-gradient(90deg, #f3f4f6 60%, #e5e7eb 100%);
  color: #6b7280;
}
.status-badge.inprogress {
  background: linear-gradient(90deg, #bae6fd 60%, #7dd3fc 100%);
  color: #0369a1;
}
.visibility-badge.private {
  background: #FDEAEA;
  color: #D93025;
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: none;
}
.visibility-badge.public {
  background: linear-gradient(90deg, #dbeafe 60%, #a5b4fc 100%);
  color: #1e40af;
  border-radius: 9999px;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.category-badge {
  background: linear-gradient(90deg, #f3f6fd 60%, #e8effc 100%);
  color: #3b5998;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 400;
  display: inline-block;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.instructions-note {
  margin-bottom: 10px;
}
.note-content {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  font-size: 14px;
  color: #1e293b;
  line-height: 1.6;
  font-weight: 500;
}
.no-description {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-style: italic;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}
.no-tags {
  color: #999;
  font-style: italic;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.files-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
}
.file-item-hover:hover {
  background: #e0e7ff;
  border-color: #a5b4fc;
  transform: scale(1.01);
}
.file-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}
.file-icon {
  color: #64748b;
  font-size: 1.3rem;
  transition: color 0.2s;
}
.file-item-hover:hover .file-icon {
  color: #2563eb;
}
.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.file-name {
  color: #1e293b;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.file-size {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}
.download-btn {
  padding: 7px 14px !important;
  font-size: 13px !important;
  min-width: auto !important;
  border-radius: 8px !important;
  font-weight: 700 !important;
}
.requester-block {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 10px;
}
.avatar-container {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
}
.avatar-container:hover {
  transform: scale(1.05);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.avatar-bordered {
  border: 3px solid #e0e7ff;
  box-shadow: 0 2px 8px rgba(59,130,246,0.10);
}
.translator-avatar {
  border-color: #d1fae5;
  box-shadow: 0 2px 8px rgba(16,185,129,0.10);
}
.avatar-overlay {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}
.avatar-container:hover .avatar-overlay {
  opacity: 1;
}
.requester-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.username {
  font-weight: 800;
  font-size: 16px;
  line-height: 1.2;
}
.user-email, .user-phone {
  color: #64748b;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.2;
}
.email-link, .phone-link {
  color: #2563eb;
  text-decoration: none;
  transition: color 0.2s, text-decoration 0.2s;
  font-weight: 600;
}
.email-link:hover, .phone-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}
.action-btn {
  width: 100%;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(59,130,246,0.08);
  position: relative;
  overflow: hidden;
}
.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}
.action-btn:hover::before {
  left: 100%;
  transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.action-btn.primary {
  background: linear-gradient(90deg, #2563eb 60%, #60a5fa 100%);
  color: #fff;
}
.action-btn.primary:hover:enabled {
  background: linear-gradient(90deg, #1d4ed8 60%, #3b82f6 100%);
  box-shadow: 0 4px 16px rgba(59,130,246,0.16);
  transform: translateY(-1px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
.action-btn.secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1.5px solid #cbd5e1;
}
.action-btn.secondary:hover:enabled {
  background: #475569;
  color: #fff;
  border-color: #64748b;
}
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn .pi-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.tag-badge {
  display: inline-block;
  background: linear-gradient(90deg, #f3f6fd 60%, #e8effc 100%);
  color: #3b5998;
  border-radius: 10px;
  padding: 3px 12px;
  margin-right: 6px;
  font-size: 13px;
  font-weight: 400;
  border: 1px solid #e0e7ef;
}

.language-badge {
  display: inline-block;
  background: linear-gradient(90deg, #dbeafe 60%, #a5b4fc 100%);
  color: #1e40af;
  border-radius: 10px;
  padding: 3px 12px;
  margin-right: 6px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #c7d2fe;
}

.no-languages {
  color: #999;
  font-style: italic;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Status History Styles */
.status-history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-history-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  transition: all 0.2s ease;
}

.status-history-item:hover {
  background: #f1f5f9;
  transform: translateX(2px);
}

.history-icon {
  color: #3b82f6;
  font-size: 16px;
  margin-top: 2px;
}

.history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.status-text {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

.status-badge-small {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge-small.pending {
  background: #fef3c7;
  color: #b45309;
}

.status-badge-small.approved {
  background: #d1fae5;
  color: #047857;
}

.status-badge-small.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge-small.completed {
  background: #e0e7ff;
  color: #3730a3;
}

.status-badge-small.cancelled {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge-small.inprogress {
  background: #bae6fd;
  color: #0369a1;
}

.history-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.actor {
  font-weight: 500;
  color: #374151;
}

.timestamp {
  color: #9ca3af;
}

.history-comment {
  font-size: 13px;
  color: #4b5563;
  font-style: italic;
  margin-top: 4px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  border-left: 2px solid #d1d5db;
}

/* Ratings Styles */
.ratings-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rating-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.rating-item:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
}

.rating-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rating-header i {
  color: #3b82f6;
  font-size: 14px;
}

.rating-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stars {
  display: flex;
  gap: 2px;
}

.stars i {
  font-size: 16px;
  transition: color 0.2s ease;
}

.rating-score {
  font-weight: 700;
  color: #111827;
  font-size: 16px;
}

.rating-count {
  font-size: 12px;
  color: #6b7280;
}

.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 8px;
}
.timeline-step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.timeline-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #f3f4f6;
  color: #64748b;
}
.timeline-icon.created {
  background: #dbeafe;
  color: #2563eb;
}
.timeline-icon.approved {
  background: #d1fae5;
  color: #059669;
}
.timeline-icon.assigned {
  background: #fef3c7;
  color: #b45309;
}
.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.timeline-title {
  font-weight: 700;
  color: #1e293b;
  font-size: 15px;
}
.timeline-date {
  color: #64748b;
  font-size: 13px;
}
.timeline-user {
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
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
@media (max-width: 600px) {
  .page-header {
    padding: 0 16px;
    margin-bottom: 24px;
  }

  .page-title h1 {
    font-size: 24px;
  }

  .request-title {
    font-size: 16px;
  }

  .info-card {
    padding: 18px 8px 14px 8px;
  }
  .info-card-title {
    font-size: 18px;
  }
  .overview-label, .overview-value {
    font-size: 14px;
  }
  .action-btn {
    font-size: 14px;
    padding: 8px 0;
  }
  .overview-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
