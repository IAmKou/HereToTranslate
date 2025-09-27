<template>
  <div class="admin-review-detail-wrapper">
    <AdminNavbar />
    <div class="main-content">
      <AdminSidebar />
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-content">
            <h1><i class="pi pi-shield"></i> Admin Review Detail</h1>
            <p>Review and make decision for translation request</p>
          </div>
          <div class="header-actions">
            <button @click="goBack" class="btn btn-secondary">
              <i class="pi pi-arrow-left"></i> Back to List
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <i class="pi pi-spin pi-spinner"></i>
          <p>Loading review details...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
          <i class="pi pi-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>{{ error }}</p>
          <button @click="loadReviewDetails" class="btn btn-primary">Try Again</button>
        </div>

        <!-- Review Details -->
        <div v-else-if="reviewDetails" class="review-details">
          <!-- Request Information -->
          <div class="detail-card">
            <h3><i class="pi pi-briefcase"></i> Request Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Title:</span>
                <span class="value">{{ reviewDetails.title }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Description:</span>
                <span class="value">{{ reviewDetails.description || 'No description' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Deal Amount:</span>
                <span class="value amount">${{ reviewDetails.dealAmount }}</span>
              </div>
            </div>
          </div>

          <!-- Requester Information -->
          <div class="detail-card">
            <h3><i class="pi pi-user"></i> Requester Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Name:</span>
                <span class="value">{{ reviewDetails.requester.name }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Email:</span>
                <span class="value">{{ reviewDetails.requester.email }}</span>
              </div>
            </div>
          </div>

          <!-- Translator Information -->
          <div v-if="reviewDetails.translator" class="detail-card">
            <h3><i class="pi pi-user-edit"></i> Translator Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Name:</span>
                <span class="value">{{ reviewDetails.translator.name }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Email:</span>
                <span class="value">{{ reviewDetails.translator.email }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Rating:</span>
                <span class="value">
                  <i v-for="star in 5" :key="star"
                     :class="['pi', star <= ((reviewDetails.translator && reviewDetails.translator.rating) || 0) ? 'pi-star-fill' : 'pi-star']"
                     :style="{ color: star <= ((reviewDetails.translator && reviewDetails.translator.rating) || 0) ? '#fbbf24' : '#d1d5db' }">
                  </i>
                  {{ (reviewDetails.translator && reviewDetails.translator.rating) || 0 }}/5 ({{ reviewDetails.translator.reviewCount || 0 }} reviews)
                </span>
              </div>
            </div>
          </div>

          <!-- Review Data -->
          <!-- <div class="detail-card">
            <h3><i class="pi pi-comment"></i> Review Data</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Rating:</span>
                <span class="value">
                  <i v-for="star in 5" :key="star"
                     :class="['pi', star <= (((reviewDetails.reviewData && reviewDetails.reviewData.rating) || 0)) ? 'pi-star-fill' : 'pi-star']"
                     :style="{ color: star <= (((reviewDetails.reviewData && reviewDetails.reviewData.rating) || 0)) ? '#fbbf24' : '#d1d5db' }">
                  </i>
                  {{ ((reviewDetails.reviewData && reviewDetails.reviewData.rating) || 0) }}/5
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Reason for rejection:</span>
                <span class="value">{{ (reviewDetails.reviewData && reviewDetails.reviewData.rejectionReason) || 'No reason provided' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Reviewed At:</span>
                <span class="value">{{ formatDate((reviewDetails.reviewData && reviewDetails.reviewData.reviewedAt) || '') }}</span>
              </div>
            </div>
          </div> -->

          <!-- Evidence Files -->
          <div v-if="reviewDetails.evidenceFiles.length > 0" class="detail-card">
            <h3><i class="pi pi-file"></i> Evidence Files</h3>
            <div class="evidence-files">
              <div v-for="file in reviewDetails.evidenceFiles" :key="file.id" class="evidence-file">
                <i class="pi pi-file"></i>
                <div class="file-info">
                  <span class="file-name">{{ file.fileName }}</span>
                  <span class="file-meta">{{ file.fileType }} • {{ formatFileSize(file.fileSize) }}</span>
                </div>
                <button @click="downloadEvidenceFile(file.id, file.fileName)" class="btn btn-secondary">
                  <i class="pi pi-download"></i> Download
                </button>
              </div>
            </div>
          </div>

          <!-- Admin Decision -->
          <div class="detail-card">
            <h3><i class="pi pi-shield"></i> Admin Decision</h3>
            <div class="decision-form">
              <div class="decision-buttons">
                <button
                  @click="adminDecision = 'APPROVE_TRANSLATOR'"
                  :class="['decision-btn', { active: adminDecision === 'APPROVE_TRANSLATOR' }]"
                >
                  <i class="pi pi-check"></i> Approve Translator
                </button>
                <button
                  @click="adminDecision = 'APPROVE_REQUESTER'"
                  :class="['decision-btn', { active: adminDecision === 'APPROVE_REQUESTER' }]"
                >
                  <i class="pi pi-times"></i> Approve Requester
                </button>
              </div>

              <div class="decision-reason">
                <label>Reason for decision:</label>
                <textarea
                  v-model="adminReason"
                  placeholder="Please provide a reason for your decision..."
                  rows="3"
                  required
                ></textarea>
              </div>

              <div class="admin-notes">
                <label>Admin notes (optional):</label>
                <textarea
                  v-model="adminNotes"
                  placeholder="Additional notes for internal use..."
                  rows="2"
                ></textarea>
              </div>

              <div class="decision-actions">
                <button
                  @click="submitAdminDecision"
                  :disabled="!adminDecision || !adminReason.trim() || isSubmitting"
                  class="btn btn-primary"
                >
                  <i v-if="isSubmitting" class="pi pi-spin pi-spinner"></i>
                  <i v-else class="pi pi-check"></i>
                  {{ isSubmitting ? 'Submitting...' : 'Submit Decision' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import AdminNavbar from '../components/AdminNavbar.vue';
import AdminSidebar from '../components/AdminSidebar.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// Route params
const requestId = computed(() => route.params.id as string);

// State
const loading = ref(true);
const error = ref('');
const reviewDetails = ref<any>(null);
const adminDecision = ref('');
const adminReason = ref('');
const adminNotes = ref('');
const isSubmitting = ref(false);

// Methods
async function loadReviewDetails() {
  loading.value = true;
  error.value = '';

  try {
    const response = await axiosInstance.get(`/admin/review/${requestId.value}`);
    const d = response.data || {};
    reviewDetails.value = {
      id: d.id || d.request?.id || '',
      title: d.title || d.request?.title || '',
      description: d.description || d.request?.description || '',
      dealAmount: d.dealAmount ?? d.request?.dealAmount ?? 0,
      deadline: d.deadline || d.request?.deadline || '',
      requester: {
        name: d.requester?.name || d.requester?.fullName || d.requester?.username || '',
        email: d.requester?.email || ''
      },
      translator: d.translator ? {
        name: d.translator?.name || d.translator?.fullName || d.translator?.username || '',
        email: d.translator?.email || '',
        rating: Number(d.translator?.rating || 0),
        reviewCount: Number(d.translator?.reviewCount || 0)
      } : null,
      // reviewData: d.reviewData ? {
      //   decision: d.reviewData?.decision || null,
      //   rating: Number(d.reviewData?.rating || 0),
      //   comment: d.reviewData?.comment || '',
      //   rejectionReason: d.reviewData?.rejectionReason || '',
      //   reviewedAt: d.reviewData?.reviewedAt || ''
      // } : { decision: null, rating: 0, comment: '', rejectionReason: '', reviewedAt: '' },
      evidenceFiles: Array.isArray(d.evidenceFiles) ? d.evidenceFiles : []
    };
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load review details';
  } finally {
    loading.value = false;
  }
}

async function downloadEvidenceFile(fileId: string, fileName?: string) {
  try {
    const response = await axiosInstance.get(`/files/${fileId}/download`, {
      responseType: 'blob'
    });

    // Get the actual file name from the response headers or use the provided fileName
    const contentDisposition = response.headers['content-disposition'];
    let actualFileName = fileName || 'evidence-file';

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        actualFileName = decodeURIComponent(filenameMatch[1]);
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', actualFileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Evidence file downloaded successfully!',
      life: 3000
    });
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Could not download file',
      life: 3000
    });
  }
}

async function submitAdminDecision() {
  if (!adminDecision.value || !adminReason.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select a decision and provide a reason.',
      life: 3000
    });
    return;
  }

  try {
    isSubmitting.value = true;

    await axiosInstance.post(`/admin/review/${requestId.value}/decision`, {
      decision: adminDecision.value,
      reason: adminReason.value,
      adminNotes: adminNotes.value
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Admin decision submitted successfully! ${adminDecision.value === 'APPROVE_TRANSLATOR' ? 'Translator approved' : 'Requester approved'}.`,
      life: 5000
    });

    // Redirect back to list after successful submission
    setTimeout(() => {
      router.push('/admin/review');
    }, 2000);

  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to submit admin decision',
      life: 3000
    });
  } finally {
    isSubmitting.value = false;
  }
}

function goBack() {
  router.push('/admin/review');
}

function formatDate(date: string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('vi-VN');
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

onMounted(() => {
  loadReviewDetails();
});
</script>

<style scoped>
.admin-review-detail-wrapper {
  min-height: 100vh;
  background: #f8fafc;
}

.main-content {
  display: flex;
  min-height: calc(100vh - 60px);
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  margin-left: 260px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  color: #1e293b;
}

.header-content h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.header-content p {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
}

.loading-container,
.error-container {
  text-align: center;
  color: #1e293b;
  padding: 2rem;
}

.loading-container i,
.error-container i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-container i {
  color: #ff6b6b;
}

.review-details {
  display: grid;
  gap: 2rem;
}

.detail-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.detail-card h3 {
  margin-bottom: 1.5rem;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
}

.detail-card h3 i {
  color: #dc2626;
}

.detail-grid {
  display: grid;
  gap: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.detail-item .label {
  font-weight: 600;
  color: #4a5568;
  min-width: 150px;
}

.detail-item .value {
  color: #2d3748;
  text-align: right;
  flex: 1;
}

.detail-item .value.amount {
  font-weight: 600;
  color: #059669;
}

.status-rejected {
  color: #dc2626;
  font-weight: 600;
}

.evidence-files {
  display: grid;
  gap: 1rem;
}

.evidence-file {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.evidence-file i {
  color: #dc2626;
  font-size: 1.5rem;
}

.file-info {
  flex: 1;
}

.file-name {
  display: block;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.file-meta {
  font-size: 0.875rem;
  color: #718096;
}

.decision-form {
  display: grid;
  gap: 1.5rem;
}

.decision-buttons {
  display: flex;
  gap: 1rem;
}

.decision-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.decision-btn:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.decision-btn.active {
  border-color: #dc2626;
  background: #dc2626;
  color: white;
}

.decision-reason label,
.admin-notes label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.decision-reason textarea,
.admin-notes textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.decision-reason textarea:focus,
.admin-notes textarea:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
}

.decision-actions {
  display: flex;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e0;
}

@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-left: 72px;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-content h1 {
    font-size: 2rem;
  }

  .detail-item {
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-item .label {
    min-width: auto;
  }

  .detail-item .value {
    text-align: left;
  }

  .decision-buttons {
    flex-direction: column;
  }
}
</style>
