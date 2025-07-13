<script setup lang="ts">
import { ref, defineProps, watch, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import axiosInstance from '../api';

interface Commit {
  id: string;
  message: string;
  contentSnapshot: string;
  filePath: string;
  status: 'pending' | 'approved' | 'rejected';
  author: {
    id: string;
    username: string;
    fullName?: string;
  };
  createdAt: string;
  reviewedByUserId?: string;
  reviewMessage?: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author?: {
    login: string;
  };
}

const props = defineProps<{
  projectId: string | number;
  branchId: string | number | null
}>();

const toast = useToast();

// State
const commits = ref<Commit[]>([]);
const githubCommits = ref<GitHubCommit[]>([]);
const loading = ref(false);
const error = ref('');

// Submit commit form
const showSubmitDialog = ref(false);
const submitForm = ref({
  filePath: '',
  content: '',
  message: ''
});
const submitting = ref(false);

// Review commit
const showReviewDialog = ref(false);
const selectedCommit = ref<Commit | null>(null);
const reviewForm = ref({
  approve: true,
  reviewMessage: ''
});
const reviewing = ref(false);

// View commit content
const showContentDialog = ref(false);
const selectedContent = ref<Commit | null>(null);

// Filter and search
const searchQuery = ref('');
const statusFilter = ref<'all' | 'pending' | 'approved' | 'rejected'>('all');

// Computed
const filteredCommits = computed(() => {
  let filtered = commits.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(commit =>
      commit.message.toLowerCase().includes(query) ||
      commit.filePath.toLowerCase().includes(query) ||
      commit.author.username.toLowerCase().includes(query) ||
      (commit.author.fullName && commit.author.fullName.toLowerCase().includes(query))
    );
  }

  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(commit => commit.status === statusFilter.value);
  }

  return filtered;
});

const pendingCommits = computed(() =>
  commits.value.filter(commit => commit.status === 'pending')
);

const approvedCommits = computed(() =>
  commits.value.filter(commit => commit.status === 'approved')
);

const rejectedCommits = computed(() =>
  commits.value.filter(commit => commit.status === 'rejected')
);

// Methods
async function loadCommits() {
  if (!props.projectId || !props.branchId) return;

  loading.value = true;
  error.value = '';

  try {
    // Gọi API backend để lấy local commits thực tế
    const localRes = await axiosInstance.get(`/projects/${props.projectId}/${props.branchId}/local-commits`);
    commits.value = localRes.data || [];
    // Load GitHub commits
    const response = await axiosInstance.get(`/projects/${props.projectId}/${props.branchId}/listCommit`);
    githubCommits.value = response.data || [];
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load commits';
    githubCommits.value = [];
    commits.value = [];
  } finally {
    loading.value = false;
  }
}

async function submitCommit() {
  if (!props.projectId || !props.branchId) return;

  // Kiểm tra nội dung bản dịch
  try {
    const contentObj = JSON.parse(submitForm.value.content || '{}');
    if (!contentObj || Object.keys(contentObj).length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No translations available to commit!',
        life: 3000,
      });
      return;
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Invalid translation content!',
      life: 3000,
    });
    return;
  }

  // Kiểm tra nếu nội dung giống commit gần nhất (cùng filePath)
  const latestSameFileCommit = commits.value.find(c => c.filePath === submitForm.value.filePath);
  if (latestSameFileCommit) {
    let latestContent = latestSameFileCommit.contentSnapshot;
    // So sánh JSON, bỏ qua thứ tự key
    try {
      const latestObj = JSON.parse(latestContent || '{}');
      const currentObj = JSON.parse(submitForm.value.content || '{}');
      if (JSON.stringify(latestObj) === JSON.stringify(currentObj)) {
        toast.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'No changes detected since the last commit for this file.',
          life: 3000,
        });
        return;
      }
    } catch (e) {/* Nếu lỗi parse thì bỏ qua kiểm tra này */}
  }

  submitting.value = true;

  try {
    await axiosInstance.post(`/projects/${props.projectId}/${props.branchId}/commit`, submitForm.value);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Commit submitted successfully',
      life: 3000
    });

    showSubmitDialog.value = false;
    submitForm.value = { filePath: '', content: '', message: '' };
    await loadCommits();
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to submit commit',
      life: 3000
    });
  } finally {
    submitting.value = false;
  }
}

function openReviewDialog(commit: Commit) {
  selectedCommit.value = commit;
  reviewForm.value = {
    approve: true,
    reviewMessage: ''
  };
  showReviewDialog.value = true;
}

function openContentDialog(commit: Commit) {
  selectedContent.value = commit;
  showContentDialog.value = true;
}

async function reviewCommit() {
  if (!selectedCommit.value || !props.projectId) return;

  reviewing.value = true;

  try {
    await axiosInstance.post(`/projects/${props.projectId}/${selectedCommit.value.id}/review`, reviewForm.value);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Commit ${reviewForm.value.approve ? 'approved' : 'rejected'} successfully`,
      life: 3000
    });

    showReviewDialog.value = false;
    selectedCommit.value = null;
    await loadCommits();
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to review commit',
      life: 3000
    });
  } finally {
    reviewing.value = false;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'approved': return 'status-approved';
    case 'rejected': return 'status-rejected';
    case 'pending': return 'status-pending';
    default: return 'status-pending';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved': return 'pi pi-check-circle';
    case 'rejected': return 'pi pi-times-circle';
    case 'pending': return 'pi pi-clock';
    default: return 'pi pi-clock';
  }
}

function formatDate(dateString: string) {
  // Display in Vietnam timezone but in English
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh'
  });
}

// Thêm hàm autoFillTranslationContent vào phần <script setup>
async function autoFillTranslationContent() {
  if (!props.projectId || !props.branchId) return;
  try {
    // Gọi API lấy toàn bộ translation strings đã dịch
    const res = await axiosInstance.get('/translation/strings', {
      params: {
        projectId: props.projectId,
        branchId: props.branchId,
      },
    });
    // Lọc các string đã dịch
    const translations = {};
    (res.data || []).forEach(str => {
      if (str.translatedText && str.translatedText.trim()) {
        translations[str.originalText] = str.translatedText;
      }
    });
    // Build JSON đẹp
    submitForm.value.content = JSON.stringify(translations, null, 2);
    // Gợi ý file path nếu chưa có
    if (!submitForm.value.filePath) {
      submitForm.value.filePath = `translations/${props.branchId}.json`;
    }
    // Gợi ý commit message nếu chưa có
    if (!submitForm.value.message) {
      submitForm.value.message = 'Update translations';
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to auto-fill translations',
      life: 3000,
    });
  }
}

// Watchers
watch(() => [props.projectId, props.branchId], () => {
  if (props.projectId && props.branchId) {
    loadCommits();
  }
}, { immediate: true });

onMounted(() => {
  if (props.projectId && props.branchId) {
    loadCommits();
  }
});
</script>

<template>
  <div class="commits-tab-wrapper">
    <!-- Header with stats -->
    <div class="commits-header">
      <div class="commits-title">
        <h2>Project Commits</h2>
        <p>Manage and review commits for this project</p>
      </div>

      <div class="commits-stats">
        <div class="stat-item">
          <div class="stat-number">{{ pendingCommits.length }}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ approvedCommits.length }}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ rejectedCommits.length }}</div>
          <div class="stat-label">Rejected</div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="commits-actions">
      <div class="search-filter">
        <div class="search-container">
          <i class="pi pi-search search-icon"></i>
          <InputText
            v-model="searchQuery"
            placeholder="Search commits..."
            class="search-input"
          />
        </div>

        <select v-model="statusFilter" class="status-filter">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <Button
        label="Submit Commit"
        icon="pi pi-plus"
        class="submit-btn"
        @click="showSubmitDialog = true"
      />
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading commits...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <Button label="Retry" @click="loadCommits" />
    </div>

    <!-- Commits list -->
    <div v-else class="commits-content">
      <!-- Local commits -->
      <div v-if="filteredCommits.length > 0" class="commits-section">
        <h3>Local Commits</h3>
        <div class="commits-list">
          <div
            v-for="commit in filteredCommits"
            :key="commit.id"
            class="commit-card"
            :class="getStatusClass(commit.status)"
          >
            <div class="commit-header">
              <div class="commit-info">
                <div class="commit-message">{{ commit.message }}</div>
                <div class="commit-meta">
                  <span class="commit-author">
                    <i class="pi pi-user"></i>
                    {{ commit.author.fullName || commit.author.username }}
                  </span>
                  <span class="commit-date">
                    <i class="pi pi-calendar"></i>
                    {{ formatDate(commit.createdAt) }}
                  </span>
                  <span class="commit-file">
                    <i class="pi pi-file"></i>
                    {{ commit.filePath }}
                  </span>
                </div>
              </div>

              <div class="commit-status">
                <span :class="['status-badge', getStatusClass(commit.status)]">
                  <i :class="getStatusIcon(commit.status)"></i>
                  {{ commit.status }}
                </span>

                <div class="commit-actions">
                  <Button
                    label="View Content"
                    icon="pi pi-file"
                    class="view-btn"
                    @click="openContentDialog(commit)"
                  />
                  <Button
                    v-if="commit.status === 'pending'"
                    label="Review"
                    icon="pi pi-eye"
                    class="review-btn"
                    @click="openReviewDialog(commit)"
                  />
                </div>
              </div>
            </div>

            <div v-if="commit.reviewMessage" class="commit-review">
              <strong>Review:</strong> {{ commit.reviewMessage }}
            </div>
          </div>
        </div>
      </div>

      <!-- GitHub commits -->
      <div v-if="githubCommits.length > 0" class="commits-section">
        <h3>GitHub Commits</h3>
        <div class="commits-list">
          <div
            v-for="commit in githubCommits"
            :key="commit.sha"
            class="commit-card github-commit"
          >
            <div class="commit-header">
              <div class="commit-info">
                <div class="commit-message">{{ commit.commit.message }}</div>
                <div class="commit-meta">
                  <span class="commit-author">
                    <i class="pi pi-user"></i>
                    {{ commit.author?.login || commit.commit.author.name }}
                  </span>
                  <span class="commit-date">
                    <i class="pi pi-calendar"></i>
                    {{ formatDate(commit.commit.author.date) }}
                  </span>
                  <span class="commit-sha">
                    <i class="pi pi-code"></i>
                    {{ commit.sha.substring(0, 8) }}
                  </span>
                </div>
              </div>

              <div class="commit-status">
                <span class="status-badge status-synced">
                  <i class="pi pi-check-circle"></i>
                  Synced
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredCommits.length === 0 && githubCommits.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No commits found</h3>
        <p>Start by submitting your first commit or check if there are any commits in GitHub.</p>
      </div>
    </div>

    <!-- Submit Commit Dialog -->
    <Dialog
      v-model:visible="showSubmitDialog"
      header="Submit New Commit"
      :style="{ width: '600px' }"
      :modal="true"
    >
      <div class="submit-form">
        <div class="form-group">
          <label>File Path</label>
          <InputText v-model="submitForm.filePath" placeholder="e.g., src/components/App.vue" />
        </div>

        <div class="form-group">
          <label>Commit Message</label>
          <InputText v-model="submitForm.message" placeholder="Describe your changes..." />
        </div>

        <div class="form-group">
          <label>Content</label>
          <Textarea
            v-model="submitForm.content"
            placeholder="Enter file content..."
            rows="8"
            autoResize
          />
        </div>
        <Button
          label="Auto-fill Translations"
          icon="pi pi-download"
          class="auto-translation-btn"
          @click="autoFillTranslationContent"
          style="margin-top: 1em; width: 100%;"
        />
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="showSubmitDialog = false"
        />
        <Button
          label="Submit"
          icon="pi pi-check"
          :loading="submitting"
          @click="submitCommit"
        />
      </template>
    </Dialog>

    <!-- Review Commit Dialog -->
    <Dialog
      v-model:visible="showReviewDialog"
      header="Review Commit"
      :style="{ width: '600px' }"
      :modal="true"
    >
      <div v-if="selectedCommit" class="review-form">
        <div class="commit-preview">
          <h4>Commit Details</h4>
          <div class="preview-item">
            <strong>Message:</strong> {{ selectedCommit.message }}
          </div>
          <div class="preview-item">
            <strong>File:</strong> {{ selectedCommit.filePath }}
          </div>
          <div class="preview-item">
            <strong>Author:</strong> {{ selectedCommit.author.fullName || selectedCommit.author.username }}
          </div>
        </div>

        <div class="form-group">
          <label>Review Decision</label>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="reviewForm.approve" :value="true" />
              Approve
            </label>
            <label>
              <input type="radio" v-model="reviewForm.approve" :value="false" />
              Reject
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>Review Message (Optional)</label>
          <Textarea
            v-model="reviewForm.reviewMessage"
            placeholder="Add a review comment..."
            rows="4"
            autoResize
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="showReviewDialog = false"
        />
        <Button
          :label="reviewForm.approve ? 'Approve' : 'Reject'"
          :icon="reviewForm.approve ? 'pi pi-check' : 'pi pi-times'"
          :loading="reviewing"
          @click="reviewCommit"
        />
      </template>
    </Dialog>

    <!-- View Content Dialog -->
    <Dialog
      v-model:visible="showContentDialog"
      header="Commit Content"
      :style="{ width: '800px' }"
      :modal="true"
    >
      <div v-if="selectedContent" class="content-view">
        <div class="content-info">
          <div class="info-item">
            <strong>Message:</strong> {{ selectedContent.message }}
          </div>
          <div class="info-item">
            <strong>File:</strong> {{ selectedContent.filePath }}
          </div>
          <div class="info-item">
            <strong>Author:</strong> {{ selectedContent.author.fullName || selectedContent.author.username }}
          </div>
          <div class="info-item">
            <strong>Date:</strong> {{ formatDate(selectedContent.createdAt) }}
          </div>
        </div>

        <div class="content-preview">
          <h4>File Content</h4>
          <pre class="content-code">{{ selectedContent.contentSnapshot }}</pre>
        </div>
      </div>

      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          @click="showContentDialog = false"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.commits-tab-wrapper {
  padding: 2rem 0;
}

.commits-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
  border-radius: 16px;
  border: 1px solid #e0e7ff;
}

.commits-title h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.commits-title p {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.commits-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: #3b82f6;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
  margin-top: 0.25rem;
}

.commits-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.search-filter {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 300px;
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
  border-radius: 8px;
  font-size: 0.875rem;
}

.status-filter {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  min-width: 120px;
}

.submit-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.commits-section {
  margin-bottom: 2rem;
}

.commits-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.commits-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.commit-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.commit-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.commit-card.status-pending {
  border-left: 4px solid #f59e0b;
}

.commit-card.status-approved {
  border-left: 4px solid #10b981;
}

.commit-card.status-rejected {
  border-left: 4px solid #ef4444;
}

.commit-card.github-commit {
  border-left: 4px solid #6366f1;
}

.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.commit-info {
  flex: 1;
}

.commit-message {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.commit-meta {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #64748b;
  flex-wrap: wrap;
}

.commit-author,
.commit-date,
.commit-file,
.commit-sha {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.commit-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.commit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.view-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.view-btn:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
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

.status-badge.status-synced {
  background: #dbeafe;
  color: #1e40af;
}

.review-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.review-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.commit-review {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  font-size: 0.875rem;
  color: #374151;
}

.submit-form,
.review-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.commit-preview {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.commit-preview h4 {
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-size: 1rem;
}

.preview-item {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.preview-item strong {
  color: #374151;
}

.content-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.content-info {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.info-item {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.content-preview {
  background: #1e293b;
  border-radius: 8px;
  padding: 1rem;
  overflow: hidden;
}

.content-preview h4 {
  color: #e2e8f0;
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.content-code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

@media (max-width: 768px) {
  .commits-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .commits-stats {
    gap: 1rem;
  }

  .commits-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .search-filter {
    flex-direction: column;
  }

  .search-container {
    max-width: none;
  }

  .commit-header {
    flex-direction: column;
    align-items: stretch;
  }

  .commit-status {
    align-items: stretch;
  }

  .commit-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
