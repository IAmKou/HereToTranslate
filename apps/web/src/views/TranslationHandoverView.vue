<template>
  <div class="translation-handover-wrapper">
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <h1><i class="pi pi-check-circle"></i> Translation Handover Completed</h1>
          <p>View details of the completed translation handover</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <i class="pi pi-spin pi-spinner"></i>
          <p>Loading project information...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
          <i class="pi pi-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>{{ error }}</p>
          <button @click="loadProjectData" class="btn btn-primary">Try Again</button>
        </div>

        <!-- No Data State -->
        <div v-else-if="!loading && !error && !projectInfo" class="no-data-container">
          <i class="pi pi-info-circle"></i>
          <h3>No Data Available</h3>
          <p>No translation handover data found.</p>
          <button @click="loadProjectData" class="btn btn-primary">Refresh</button>
        </div>

        <!-- Main Content -->
        <div v-else-if="!loading && !error && projectInfo" class="handover-content">
          <!-- Project/Request Overview -->
          <div class="info-card">
            <h3><i class="pi pi-briefcase"></i> {{ isRequestBased ? 'Request Information' : 'Project Information' }}</h3>
            <div class="project-info">
              <p><strong>{{ isRequestBased ? 'Request title:' : 'Project name:' }}</strong> {{ projectInfo?.name }}</p>
              <p><strong>Created date:</strong> {{ formatDate(projectInfo?.createdAt) }}</p>
              <p v-if="projectInfo?.description"><strong>Description:</strong> {{ projectInfo.description }}</p>
              <p v-if="projectInfo?.targetLanguages && projectInfo.targetLanguages.length > 0"><strong>Target languages:</strong>
                <span v-for="lang in projectInfo?.targetLanguages" :key="lang" class="language-badge">
                  {{ getLanguageName(lang) }}
                </span>
              </p>

            </div>
          </div>

          <!-- Progress Overview -->
          <div class="info-card">
            <h3><i class="pi pi-chart-bar"></i> Translation Progress</h3>
            <div class="progress-stats">
              <div class="stat-item">
                <div class="stat-number">{{ totalFiles }}</div>
                <div class="stat-label">Total files</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ completedFiles }}</div>
                <div class="stat-label">Completed files</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ totalStrings }}</div>
                <div class="stat-label">Total strings</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ completedStrings }}</div>
                <div class="stat-label">Translated strings</div>
              </div>
            </div>
            <div class="overall-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: overallProgress + '%' }"></div>
              </div>
              <span>{{ overallProgress }}% completed</span>
            </div>
            <div v-if="isRequestBased && totalFiles === 0" class="progress-note">
              <i class="pi pi-info-circle"></i>
              <span v-if="!projectInfo?.project">File statistics will be available once a project is created from this request.</span>
              <span v-else>No files found in the associated project.</span>
            </div>
          </div>



          <!-- Handover Information -->
          <div class="info-card">
            <h3><i class="pi pi-info-circle"></i> Handover Information</h3>
            <div class="handover-info">
              <div class="info-section">
                <h4>Handover status</h4>
                <div class="status-info">
                  <span class="status-badge completed">
                    <i class="pi pi-check"></i>
                    {{ isRequestBased ? 'Request completed' : 'Successfully delivered' }}
                  </span>
                  <p class="handover-date">{{ isRequestBased ? 'Completion date:' : 'Handover date:' }} {{ formatDate(handoverInfo?.handoverDate) }}</p>
                </div>
              </div>

              <div v-if="handoverInfo?.message" class="info-section">
                <h4>{{ isRequestBased ? 'Completion notes' : 'Notes from translator' }}</h4>
                <div class="message-box">
                  {{ handoverInfo.message }}
                </div>
              </div>

              <div v-if="!isRequestBased" class="info-section">
                <h4>Quality checks</h4>
                <div class="quality-checks">
                  <div class="check-item" :class="{ completed: handoverInfo?.qualityChecks?.qualityChecked }">
                    <i :class="handoverInfo?.qualityChecks?.qualityChecked ? 'pi pi-check' : 'pi pi-times'"></i>
                    <span>Translation quality review</span>
                  </div>
                  <div class="check-item" :class="{ completed: handoverInfo?.qualityChecks?.formatChecked }">
                    <i :class="handoverInfo?.qualityChecks?.formatChecked ? 'pi pi-check' : 'pi pi-times'"></i>
                    <span>File format verification</span>
                  </div>
                  <div class="check-item" :class="{ completed: handoverInfo?.qualityChecks?.contentVerified }">
                    <i :class="handoverInfo?.qualityChecks?.contentVerified ? 'pi pi-check' : 'pi pi-times'"></i>
                    <span>Translation content verification</span>
                  </div>
                </div>
              </div>

              <div v-if="!isRequestBased" class="info-section">
                <h4>Delivery method</h4>
                <p>{{ getDeliveryMethodText(handoverInfo?.deliveryMethod) }}</p>
                <p v-if="handoverInfo?.deliveryMethod === 'email' && handoverInfo?.recipientEmail">
                  <strong>Recipient email:</strong> {{ handoverInfo.recipientEmail }}
                </p>
              </div>

              <div v-if="isRequestBased" class="info-section">
                <h4>Request Status</h4>
                <div class="request-status-info">
                  <p><strong>Current status:</strong>
                    <span :class="['status-badge', getStatusClass(projectInfo?.status || 'WAITING_APPROVAL')]">
                      {{ formatStatus(projectInfo?.status || 'WAITING_APPROVAL') }}
                    </span>
                  </p>
                  <p><strong>Next step:</strong> {{ getNextStepText(projectInfo?.status || 'WAITING_APPROVAL') }}</p>
                </div>

                <!-- Review and Rating Section -->
                <div v-if="!reviewSubmitted && (projectInfo?.status === 'WAITING_APPROVAL' || projectInfo?.status === 'FAILED')" class="review-section">
                  <h4>Review Translation</h4>



                  <div class="review-form">
                    <div class="review-decision">
                      <label>Decision:</label>
                      <div class="decision-buttons">
                        <button
                          v-if="isFullyCompleted"
                          @click="reviewDecision = 'APPROVED'"
                          :class="['decision-btn', { active: reviewDecision === 'APPROVED' }]"
                        >
                          <i class="pi pi-check"></i> Approve
                        </button>
                        <button
                          @click="reviewDecision = 'REJECTED'"
                          :class="['decision-btn', { active: reviewDecision === 'REJECTED' }]"
                        >
                          <i class="pi pi-times"></i> Reject
                        </button>
                      </div>
                    </div>

                    <div v-if="reviewDecision" class="rating-section">
                      <label>Rate translator quality (1-5 stars):</label>
                      <div class="star-rating">
                        <i
                          v-for="star in 5"
                          :key="star"
                          :class="['pi', star <= rating ? 'pi-star-fill' : 'pi-star']"
                          @click="rating = star"
                          class="star"
                        ></i>
                      </div>
                      <span class="rating-text">{{ rating }}/5 stars</span>
                    </div>
                    <div v-else-if="!isFullyCompleted" class="completion-warning">
                      <i class="pi pi-info-circle"></i>
                      <div>
                        <strong>Approval is only available at 100% completion.</strong>
                        <p>Once all strings are translated, you can approve the translation.</p>
                      </div>
                    </div>

                    <!-- Evidence Upload for 100% completed rejections -->
                    <div v-if="isFullyCompleted && reviewDecision === 'REJECTED'" class="evidence-section">
                      <!-- Clear explanation for evidence requirement -->
                      <div class="evidence-explanation">
                        <i class="pi pi-info-circle"></i>
                        <div>
                          <strong>Evidence Required</strong>
                          <p>Because this translation is 100% completed, you must provide evidence to support your rejection. An admin will review your case and make the final decision.</p>
                        </div>
                      </div>

                      <!-- Required reason field for 100% completed rejections -->
                      <div class="review-reason">
                        <label>Reason for rejection (required):</label>
                        <textarea
                          v-model="rejectionReason"
                          placeholder="Please provide a detailed reason for rejecting this 100% completed translation. Be specific about what issues you found and why the translation is not acceptable..."
                          rows="5"
                          required
                          class="rejection-reason-textarea"
                        ></textarea>
                      </div>

                      <label>Evidence files (required):</label>
                      <div class="evidence-upload">
                        <div class="upload-area" @click="triggerFileUpload" @drop="handleFileDrop" @dragover="handleDragOver" @dragleave="handleDragLeave">
                          <div class="upload-icon">
                            <i class="pi pi-cloud-upload"></i>
                          </div>
                          <div class="upload-content">
                            <h4>Upload Evidence Files</h4>
                            <p class="upload-description">Drag and drop files here, or click to browse</p>
                            <p class="upload-hint">Supported: Images (JPG, PNG), Documents (PDF, DOC, DOCX), Text files (TXT)</p>
                            <div class="upload-button">
                              <i class="pi pi-folder-open"></i>
                              Choose Files
                            </div>
                          </div>
                        </div>
                        <input
                          ref="fileInput"
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          @change="handleFileSelect"
                          style="display: none"
                        />
                      </div>

                      <div v-if="evidenceFiles.length > 0" class="evidence-files">
                        <h5>Uploaded Evidence:</h5>
                        <div v-for="(file, index) in evidenceFiles" :key="index" class="evidence-file">
                          <i class="pi pi-file"></i>
                          <span>{{ file.name }}</span>
                          <button @click="removeEvidenceFile(index)" class="remove-file">
                            <i class="pi pi-times"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Additional comments for normal rejections or approvals -->
                    <div v-if="reviewDecision === 'APPROVED' || (reviewDecision === 'REJECTED' && !isFullyCompleted)" class="review-comment">
                      <label>Additional comments (optional):</label>
                      <textarea
                        v-model="reviewComment"
                        placeholder="Share your feedback about the translation quality..."
                        rows="3"
                      ></textarea>
                    </div>

                    <div class="review-actions">
                      <button
                        @click="submitReview"
                        :disabled="!reviewDecision || rating === 0 || (isFullyCompleted && reviewDecision === 'REJECTED' && (evidenceFiles.length === 0 || !rejectionReason.trim()))"
                        class="btn btn-primary"
                      >
                        <i class="pi pi-check"></i> Submit Review
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Review Submitted -->
                <div v-else-if="reviewSubmitted" class="review-submitted">
                  <h4>Review Submitted</h4>
                  <div class="review-summary">
                    <p><strong>Decision:</strong>
                      <span :class="['status-badge', reviewDecision === 'APPROVED' ? 'status-approved' : 'status-rejected']">
                        {{ reviewDecision === 'APPROVED' ? 'Approved' : 'Rejected' }}
                      </span>
                    </p>
                    <p><strong>Rating:</strong>
                      <span class="rating-display">
                        <i v-for="star in 5" :key="star"
                           :class="['pi', star <= submittedRating ? 'pi-star-fill' : 'pi-star']"
                           :style="{ color: star <= submittedRating ? '#fbbf24' : '#d1d5db' }">
                        </i>
                        {{ submittedRating }}/5
                      </span>
                    </p>
                    <p v-if="submittedComment"><strong>Comment:</strong> {{ submittedComment }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Download Section -->
          <div class="info-card">
            <h3><i class="pi pi-download"></i> Download Products</h3>
            <div class="download-section">
              <div class="download-info">
                <p v-if="isRequestBased && !projectInfo?.project">Download functionality for requests without projects is not yet implemented. Files will be available for download once a project is created from this request.</p>
                <p v-else-if="isRequestBased && projectInfo?.project">Files from the associated project are available for download.</p>
                <p v-else>All files have been translated and are ready for download.</p>
                <div class="download-stats">
                  <span><i class="pi pi-file"></i> {{ totalFiles }} files</span>
                  <span><i class="pi pi-check-circle"></i> {{ completedStrings }} translated strings</span>
                </div>
              </div>
              <div class="download-actions">
                <button
                  v-if="projectInfo?.status === 'COMPLETED' || projectInfo?.status === 'INCOMPLETED'"
                  @click="downloadAllFiles"
                  class="btn btn-primary"
                  :disabled="downloading"
                >
                  <i v-if="downloading" class="pi pi-spin pi-spinner"></i>
                  <i v-else class="pi pi-download"></i>
                  {{ downloading ? 'Downloading...' : 'Download All' }}
                </button>

                <button @click="openPreviewModal" class="btn btn-secondary">
                  <i class="pi pi-eye"></i>
                  Preview translation
                </button>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>

    <!-- Confirm Review Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="showConfirmModal = false">
      <div class="modal-content" @click.stop>
        <!-- Loading overlay -->
        <div v-if="isSubmitting" class="modal-loading-overlay">
          <div class="loading-spinner">
            <i class="pi pi-spin pi-spinner"></i>
            <p>Submitting review...</p>
          </div>
        </div>
        <div class="modal-header">
          <h3><i class="pi pi-exclamation-triangle"></i> Confirm Review Submission</h3>
          <button @click="showConfirmModal = false" class="modal-close">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- Different content for evidence-based rejections -->
          <div v-if="confirmReviewData?.isFullyCompleted && confirmReviewData?.decision === 'REJECTED'" class="evidence-confirmation">

            <!-- Admin Review Notice moved to top -->
            <div class="admin-review-notice">
              <i class="pi pi-shield"></i>
              <div>
                <strong>Admin Review Required</strong>
                <p>Your rejection will be reviewed by an admin. If the admin finds your rejection unjustified, the translator will receive 50% of the deposit. If justified, you will receive a refund.</p>
              </div>
            </div>

            <div class="review-summary-preview admin-review-close">
              <div class="summary-item">
                <strong>Decision:</strong>
                <span class="status-badge status-rejected">Reject</span>
              </div>

              <div class="summary-item">
                <strong>Rating:</strong>
                <span class="rating-display">
                  <i v-for="star in 5" :key="star"
                     :class="['pi', star <= confirmReviewData?.rating ? 'pi-star-fill' : 'pi-star']"
                     :style="{ color: star <= confirmReviewData?.rating ? '#fbbf24' : '#d1d5db' }">
                  </i>
                  {{ confirmReviewData?.rating }}/5
                </span>
              </div>

              <div v-if="confirmReviewData?.rejectionReason" class="summary-item">
                <strong>Reason for rejection:</strong>
                <div class="reason-preview-container">
                  <textarea
                    class="reason-preview-textarea"
                    readonly
                    rows="4"
                  >{{ confirmReviewData.rejectionReason }}</textarea>
                </div>
              </div>

              <div class="summary-item">
                <strong>Evidence files:</strong>
                <div class="evidence-preview-container">
                  <div class="evidence-count-badge">
                    <i class="pi pi-file"></i>
                    <span>{{ confirmReviewData.evidenceFiles?.length || 0 }} files uploaded</span>
                  </div>
                  <div v-if="confirmReviewData.evidenceFiles?.length > 0" class="evidence-files-list">
                    <div v-for="(file, index) in confirmReviewData.evidenceFiles" :key="index" class="evidence-file-item">
                      <i class="pi pi-file"></i>
                      <span>{{ file.name }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="confirmReviewData?.comment" class="summary-item">
                <strong>Additional comments:</strong>
                <p class="comment-preview">{{ confirmReviewData.comment }}</p>
              </div>
            </div>
          </div>

          <!-- Normal review confirmation -->
          <div v-else>
            <p>Please confirm your review details before submitting:</p>

            <div class="review-summary-preview">
              <div class="summary-item">
                <strong>Decision:</strong>
                <span :class="['status-badge', confirmReviewData?.decision === 'APPROVED' ? 'status-approved' : 'status-rejected']">
                  {{ confirmReviewData?.decision === 'APPROVED' ? 'Approve' : 'Reject' }}
                </span>
              </div>

              <div class="summary-item">
                <strong>Rating:</strong>
                <span class="rating-display">
                  <i v-for="star in 5" :key="star"
                     :class="['pi', star <= confirmReviewData?.rating ? 'pi-star-fill' : 'pi-star']"
                     :style="{ color: star <= confirmReviewData?.rating ? '#fbbf24' : '#d1d5db' }">
                  </i>
                  {{ confirmReviewData?.rating }}/5
                </span>
              </div>

              <div v-if="confirmReviewData?.comment" class="summary-item">
                <strong>Comment:</strong>
                <p class="comment-preview">{{ confirmReviewData.comment }}</p>
              </div>
            </div>
          </div>

          <div class="warning-message">
            <i class="pi pi-info-circle"></i>
            <p><strong>Note:</strong> Once submitted, this review cannot be changed. Please make sure all information is correct.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showConfirmModal = false" class="btn btn-secondary">
            <i class="pi pi-times"></i> Cancel
          </button>
          <button @click="confirmSubmitReview" :disabled="isSubmitting" class="btn btn-primary">
            <i v-if="isSubmitting" class="pi pi-spin pi-spinner"></i>
            <i v-else class="pi pi-check"></i>
            {{ isSubmitting ? 'Submitting...' : 'Confirm & Submit' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Preview Translation Modal -->
    <div v-if="showPreviewModal" class="modal-overlay" @click="closePreviewModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3><i class="pi pi-eye"></i> Preview translation</h3>
          <button @click="closePreviewModal" class="modal-close">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="review-summary-preview">
            <div class="summary-item">
              <strong>Select file</strong>
              <div>
                <div v-if="files.length === 0" class="no-files">No file to preview</div>
                <div v-else class="files-list">
                  <div
                    v-for="f in files"
                    :key="f.id || f.fileId"
                    class="file-item"
                    @click="selectPreviewFile(f)"
                    :style="{ cursor: 'pointer', borderColor: (selectedPreviewFileId === (f.id || f.fileId)) ? '#3b82f6' : '#e2e8f0' }"
                  >
                    <div class="file-info">
                      <i :class="getFileIcon(f.fileType || '')"></i>
                      <div>
                        <div class="file-name">{{ f.fileName }}</div>
                        <div class="file-meta">{{ getFileTypeName(f.fileType || '') }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="summary-item">
              <strong>Select language</strong>
              <div>
                <div v-if="(projectInfo?.targetLanguages || []).length === 0">No language</div>
                <div class="language-select" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                  <button
                    v-for="lang in (projectInfo?.targetLanguages || [])"
                    :key="lang"
                    class="btn"
                    :class="selectedPreviewLanguage === lang ? 'btn-primary' : 'btn-secondary'"
                    @click="selectedPreviewLanguage = lang"
                  >
                    {{ getLanguageName(lang) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="summary-item">
              <strong>Select pages (up to 5)</strong>
              <div>
                <div v-if="previewPagesLoading" style="color:#4a5568;">Loading pages...</div>
                <div v-else-if="previewPages.length === 0" style="color:#4a5568;">No page data</div>
                <div v-else>
                  <div v-if="previewPages.length <= 5" style="color:#059669; font-size:0.875rem; margin-bottom:0.5rem;">
                    <i class="pi pi-check-circle"></i> All {{ previewPages.length }} pages auto-selected
                  </div>
                  <div class="download-stats">
                    <button
                      v-for="p in previewPages"
                      :key="p.filePart"
                      class="btn"
                      :class="selectedPages.includes(p.pageNumber) ? 'btn-primary' : 'btn-secondary'"
                      @click="toggleSelectPage(p.pageNumber)"
                      :disabled="previewSelectionLocked"
                    >
                      Page {{ p.pageNumber }}
                    </button>
                  </div>
                </div>
                <div style="margin-top:0.5rem; color:#6b7280; font-size:0.85rem;">
                  Selected {{ selectedPages.length }}/{{ Math.min(5, previewPages.length) }} pages
                </div>
              </div>
            </div>
          </div>

          <div v-if="isBuildingPreview" class="loading-spinner" style="margin: 1rem 0;">
            <i class="pi pi-spin pi-spinner"></i>
            <p>Building preview...</p>
          </div>

          <!-- Preview content is no longer rendered inside modal. It always opens in a new tab. -->
        </div>

        <div class="modal-footer">
          <button @click="closePreviewModal" class="btn btn-secondary">
            <i class="pi pi-times"></i> Close
          </button>
          <!-- Removed manual open button; preview always opens in new tab by default. -->
          <button
            class="btn btn-primary"
            :disabled="!canStartPreview || isBuildingPreview"
            @click="buildPreview"
          >
            <i v-if="isBuildingPreview" class="pi pi-spin pi-spinner"></i>
            <i v-else class="pi pi-eye"></i>
            View preview
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- One-time confirm modal for selected preview pages -->
  <div v-if="showPreviewConfirm" class="modal-overlay" @click="cancelSelectedPages">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3><i class="pi pi-question-circle"></i> Confirm selected pages</h3>
        <button @click="cancelSelectedPages" class="modal-close">
          <i class="pi pi-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p>Please confirm these pages will be used for future previews:</p>
        <div class="download-stats" style="flex-wrap:wrap; gap:.5rem;">
          <span v-for="(pg, idx) in selectedPages" :key="idx" class="status-badge">Page {{ pg }}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="cancelSelectedPages" class="btn btn-secondary">
          <i class="pi pi-times"></i> Cancel
        </button>
        <button @click="confirmSelectedPages" class="btn btn-primary">
          <i class="pi pi-check"></i> Confirm & Continue
        </button>
      </div>
    </div>
  </div>
</template>



<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import { getLanguageName } from '../utils/languages';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// Route params
const projectId = computed(() => route.params.projectId as string);
const branchId = computed(() => route.params.branchId as string);
const requestId = computed(() => route.params.requestId as string);

// State
const loading = ref(true);
const error = ref('');
const downloading = ref(false);

// Review state
const reviewDecision = ref('');
const rating = ref(0);
const reviewComment = ref('');
const rejectionReason = ref(''); // New field for 100% completed rejections
const reviewSubmitted = ref(false);
const submittedRating = ref(0);
const submittedComment = ref('');

// Evidence upload state
const evidenceFiles = ref<File[]>([]);
const fileInput = ref<HTMLInputElement>();

// Computed property to check if translation is 100% completed
const isFullyCompleted = computed(() => {
  return overallProgress.value === 100 &&
    completedFiles.value === totalFiles.value &&
    completedStrings.value === totalStrings.value;
});

// Confirm modal state
const showConfirmModal = ref(false);
const confirmReviewData = ref<any>(null);

// Loading state for form submission
const isSubmitting = ref(false);

// Data
const projectInfo = ref<any>(null);
const files = ref<any[]>([]);
const translationStrings = ref<any[]>([]);
const handoverInfo = ref<any>(null);
const originalRequestData = ref<any>(null); // Store original request data
const isRequestBased = computed(() => !!requestId.value);

// Preview state
const showPreviewModal = ref(false);
const selectedPreviewFileId = ref<string>('');
const selectedPreviewLanguage = ref<string>('');
const previewPages = ref<Array<{ pageNumber: number; filePart: number; stringCount: number; hasTranslatedStrings: boolean }>>([]);
const previewPagesLoading = ref(false);
const selectedPages = ref<number[]>([]);
const previewUrl = ref<string>('');
const isBuildingPreview = ref(false);
const currentPreviewPage = ref<number | null>(null);
const previewMode = ref<'pdf' | 'html' | 'text' | 'external' | 'none'>('none');
const textPreview = ref<string>('');
const htmlPreview = ref<string>('');
const previewExternalUrl = ref<string>('');
// Preview confirmation and lock state
const showPreviewConfirm = ref(false);
const previewSelectionLocked = ref(false);

const requiredPreviewCount = computed(() => Math.min(5, previewPages.value.length || 0));
const canStartPreview = computed(() => {
  // Allow preview if file and language are selected, and at least one page is selected
  // For files with 5 or fewer pages, auto-selection should work
  // For files with more than 5 pages, user must manually select pages
  return !!selectedPreviewFileId.value &&
    !!selectedPreviewLanguage.value &&
    selectedPages.value.length > 0 &&
    previewPages.value.length > 0;
});

// Persist preview selection in localStorage (scoped by requestId or projectId)
const previewStorageKey = computed(() => {
  const scope = isRequestBased.value ? `req-${requestId.value}` : `proj-${projectId.value}`;
  return `htt-preview-${scope}`;
});

function savePreviewState() {
  try {
    const state = {
      fileId: selectedPreviewFileId.value,
      language: selectedPreviewLanguage.value,
      pages: selectedPages.value,
      currentPage: currentPreviewPage.value,
      locked: previewSelectionLocked.value,
    };
    localStorage.setItem(previewStorageKey.value, JSON.stringify(state));
  } catch {}
}

function loadPreviewState() {
  try {
    const raw = localStorage.getItem(previewStorageKey.value);
    if (!raw) return;
    const parsed = JSON.parse(raw || '{}') || {};
    if (parsed.fileId) selectedPreviewFileId.value = String(parsed.fileId);
    if (parsed.language) selectedPreviewLanguage.value = String(parsed.language);
    if (Array.isArray(parsed.pages)) selectedPages.value = parsed.pages.map((n: any) => Number(n)).slice(0, 5);
    if (parsed.currentPage) currentPreviewPage.value = Number(parsed.currentPage);
    if (typeof parsed.locked === 'boolean') previewSelectionLocked.value = !!parsed.locked;
  } catch {}
}

// Computed
const translatedFiles = computed(() =>
  files.value.filter((file: any) => getFileProgress(file) > 0)
);

const totalFiles = computed(() => {
  const count = files.value.length;
  console.log('=== DEBUG totalFiles ===', count);
  return count;
});

const completedFiles = computed(() => {
  const count = files.value.filter((file: any) => getFileProgress(file) === 100).length;
  console.log('=== DEBUG completedFiles ===', count);
  return count;
});

const totalStrings = computed(() => {
  // Count total strings = unique original strings × number of target languages
  const uniqueOriginalStrings = translationStrings.value.filter((str: any, index: number, self: any[]) =>
    index === self.findIndex((s: any) => s.originalText === str.originalText)
  );
  const targetLanguages = projectInfo.value?.targetLanguages || ['en'];
  const totalCount = uniqueOriginalStrings.length * targetLanguages.length;

  console.log('=== DEBUG totalStrings calculation ===');
  console.log('Unique original strings:', uniqueOriginalStrings.length);
  console.log('Target languages:', targetLanguages);
  console.log('Total strings =', uniqueOriginalStrings.length, '×', targetLanguages.length, '=', totalCount);
  console.log('=== DEBUG targetLanguages ===', targetLanguages);
  return totalCount;
});

const completedStrings = computed(() => {
  // Count total completed strings = unique original strings with ALL languages completed × number of target languages
  const targetLanguages = projectInfo.value?.targetLanguages || ['en'];
  const uniqueOriginalStrings = translationStrings.value.filter((str: any, index: number, self: any[]) =>
    index === self.findIndex((s: any) => s.originalText === str.originalText)
  );

  const completedOriginalStrings = uniqueOriginalStrings.filter((originalStr: any) => {
    // Check if this original string has translations for ALL target languages
    const hasAllTranslations = targetLanguages.every((lang: string) => {
      const translatedString = translationStrings.value.find((str: any) =>
        str.originalText === originalStr.originalText &&
        str.targetLanguage === lang &&
        str.translatedText &&
        str.translatedText.trim()
      );
      return !!translatedString;
    });
    return hasAllTranslations;
  });

  const totalCompletedCount = completedOriginalStrings.length * targetLanguages.length;

  console.log('=== DEBUG completedStrings calculation ===');
  console.log('Completed original strings:', completedOriginalStrings.length);
  console.log('Target languages:', targetLanguages);
  console.log('Total completed strings =', completedOriginalStrings.length, '×', targetLanguages.length, '=', totalCompletedCount);
  return totalCompletedCount;
});

const overallProgress = computed(() => {
  if (totalStrings.value === 0) return 0;
  return Math.round((completedStrings.value / totalStrings.value) * 100);
});



// Methods
async function loadProjectData() {
  loading.value = true;
  error.value = '';

  try {
    if (isRequestBased.value) {
      // Load data from request instead of project
      await loadDataFromRequest();
    } else {
      // Load data from project (existing logic)
      await loadDataFromProject();
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load information';
  } finally {
    loading.value = false;
  }
}

async function loadDataFromRequest() {
  try {
    console.log('Loading data for request:', requestId.value);

    // Load request information - use the correct endpoint
    const requestRes = await axiosInstance.get(`/requests/${requestId.value}/detail`);
    const request = requestRes.data;
    originalRequestData.value = request; // Store original request data
    console.log('Request data:', request);
    console.log('Request project:', request.project);
    console.log('Request project ID:', request.project?.id);
    console.log('Request project defaultBranch:', request.project?.defaultBranch);
    console.log('Request assignee:', request.assignee);

    // Set project info from request
    projectInfo.value = {
      name: request.title,
      description: request.description,
      createdAt: request.createdAt,
      targetLanguages: request.targetLanguages || [],
      status: request.status,
      project: request.project // Add project object to projectInfo
    };

    // Check if request has been reviewed
    if (request.reviewedAt && request.reviewDecision && request.reviewRating) {
      reviewSubmitted.value = true;
      reviewDecision.value = request.reviewDecision;
      submittedRating.value = request.reviewRating;
      submittedComment.value = request.reviewComment || '';
      console.log('Request has been reviewed:', {
        decision: request.reviewDecision,
        rating: request.reviewRating,
        comment: request.reviewComment
      });
    }

    // Debug request files
    console.log('Request files:', request.files);
    console.log('Request files count:', request.files?.length || 0);

    // Try to get project data if request has a project
    if (request.project) {
      console.log('Request has project, loading project data...');
      try {
        const projectId = request.project.id;
        const branchId = request.project.defaultBranch?.id || '1';

        // Load files from project
        const filesRes = await axiosInstance.get(`/files/project/${projectId}?branchId=${branchId}`);
        files.value = Array.isArray(filesRes.data) ? filesRes.data : [];
        console.log('Loaded files from project:', files.value.length);
        console.log('Files data:', files.value);
        console.log('Files response:', filesRes.data);

        // Load translation strings from project for all target languages
        console.log('Request targetLanguages:', request.targetLanguages);

        // Load strings for all target languages
        const allStrings = [];
        const targetLanguages = request.targetLanguages || ['en'];

        for (const language of targetLanguages) {
          console.log(`Loading strings for language: ${language}`);
          try {
            const stringsRes = await axiosInstance.get('/translation/strings', {
              params: {
                projectId: projectId,
                branchId: branchId,
                language: language
              }
            });

            const languageStrings = Array.isArray(stringsRes.data) ? stringsRes.data : [];
            console.log(`Loaded ${languageStrings.length} strings for language ${language}`);

            // Add language info to each string for tracking
            const stringsWithLanguage = languageStrings.map((str: any) => ({
              ...str,
              targetLanguage: language
            }));

            allStrings.push(...stringsWithLanguage);
          } catch (error) {
            console.error(`Error loading strings for language ${language}:`, error);
          }
        }

        translationStrings.value = allStrings;
        console.log('Total strings loaded for all languages:', translationStrings.value.length);
        console.log('Translation strings data:', translationStrings.value);

        // Debug: Check if any strings have translatedText
        const stringsWithTranslation = translationStrings.value.filter((str: any) => str.translatedText && str.translatedText.trim());
        console.log('Strings with translation:', stringsWithTranslation.length);
        console.log('Sample strings with translation:', stringsWithTranslation.slice(0, 3));

        // Load handover information from project
        try {
          const handoverRes = await axiosInstance.get(`/translation/handover/${projectId}/${branchId}`);
          handoverInfo.value = handoverRes.data;
        } catch (handoverError) {
          console.log('Handover endpoint not available, using mock data');
          handoverInfo.value = {
            handoverDate: new Date().toISOString(),
            message: 'Translation handover completed successfully.',
            qualityChecks: {
              qualityChecked: true,
              formatChecked: true,
              contentVerified: true
            },
            deliveryMethod: 'download'
          };
        }
      } catch (projectError) {
        console.error('Error loading project data:', projectError);
        // Fallback to empty data
        files.value = [];
        translationStrings.value = [];
        handoverInfo.value = {
          handoverDate: new Date().toISOString(),
          message: 'Translation handover completed successfully.',
          qualityChecks: {
            qualityChecked: true,
            formatChecked: true,
            contentVerified: true
          },
          deliveryMethod: 'download'
        };
      }
    } else {
      console.log('Request does not have project, using empty data');
      // For requests without project, use empty arrays
      files.value = [];
      translationStrings.value = [];
      handoverInfo.value = {
        handoverDate: new Date().toISOString(),
        message: 'Translation handover completed successfully.',
        qualityChecks: {
          qualityChecked: true,
          formatChecked: true,
          contentVerified: true
        },
        deliveryMethod: 'download'
      };
    }

    // Check if we should use request files instead of project files
    if (!request.project && request.files && request.files.length > 0) {
      console.log('Using request files instead of project files');
      files.value = request.files;
      // For now, we'll use empty translation strings since we don't have translation data for request files
      translationStrings.value = [];
    }

    // Add debug logging to see what data we're working with
    console.log('=== DEBUG: Final data state ===');
    console.log('Request has project:', !!request.project);
    console.log('Project ID:', request.project?.id);
    console.log('Files count:', files.value.length);
    console.log('Translation strings count:', translationStrings.value.length);
    console.log('Translation strings data:', translationStrings.value);

    console.log('Final state:', {
      files: files.value,
      translationStrings: translationStrings.value,
      projectInfo: projectInfo.value,
      handoverInfo: handoverInfo.value
    });
  } catch (error) {
    console.error('Error loading request data:', error);
    throw error;
  }
}

async function loadDataFromProject() {
  const projectRes = await axiosInstance.get(`/projects/${projectId.value}`);
  projectInfo.value = projectRes.data;

  const filesRes = await axiosInstance.get(`/files/project/${projectId.value}?branchId=${branchId.value}`);
  files.value = Array.isArray(filesRes.data) ? filesRes.data : [];

  // Load strings for all target languages from project
  const allStrings = [];
  const targetLanguages = projectInfo.value?.targetLanguages || ['en'];

  for (const language of targetLanguages) {
    console.log(`Loading strings for language: ${language}`);
    try {
      const stringsRes = await axiosInstance.get('/translation/strings', {
        params: {
          projectId: projectId.value,
          branchId: branchId.value,
          language: language
        }
      });

      const languageStrings = Array.isArray(stringsRes.data) ? stringsRes.data : [];
      console.log(`Loaded ${languageStrings.length} strings for language ${language}`);

      // Add language info to each string for tracking
      const stringsWithLanguage = languageStrings.map((str: any) => ({
        ...str,
        targetLanguage: language
      }));

      allStrings.push(...stringsWithLanguage);
    } catch (error) {
      console.error(`Error loading strings for language ${language}:`, error);
    }
  }

  translationStrings.value = allStrings;
  console.log('Total strings loaded for all languages:', translationStrings.value.length);

  // Load handover information
  const handoverRes = await axiosInstance.get(`/translation/handover/${projectId.value}/${branchId.value}`);
  handoverInfo.value = handoverRes.data;
}

function getFileProgress(file: any): number {
  console.log('=== DEBUG getFileProgress ===');
  console.log('File object:', file);
  console.log('Available translation strings:', translationStrings.value);

  // Try different possible file ID fields
  const fileId = file.id || file.fileId;
  console.log('Using fileId:', fileId);

  const fileStrings = translationStrings.value.filter((str: any) => {
    const match = str.fileId === fileId || str.fileId === fileId?.toString();
    console.log(`String ${str.id}: fileId=${str.fileId}, match=${match}`);
    return match;
  });

  console.log('Found strings for this file:', fileStrings);

  if (fileStrings.length === 0) {
    console.log('No strings found for this file, returning 0%');
    return 0;
  }

  // Get unique original strings for this file
  const uniqueOriginalStrings = fileStrings.filter((str: any, index: number, self: any[]) =>
    index === self.findIndex((s: any) => s.originalText === str.originalText)
  );

  const totalFileStrings = uniqueOriginalStrings.length;
  console.log('Unique original strings for this file:', totalFileStrings);

  // Count how many unique original strings have translations in ALL target languages
  const targetLanguages = projectInfo.value?.targetLanguages || ['en'];
  const completed = uniqueOriginalStrings.filter((originalStr: any) => {
    // Check if this original string has translations for ALL target languages
    const hasAllTranslations = targetLanguages.every((lang: string) => {
      const translatedString = fileStrings.find((str: any) =>
        str.originalText === originalStr.originalText &&
        str.targetLanguage === lang &&
        str.translatedText &&
        str.translatedText.trim()
      );
      return !!translatedString;
    });
    return hasAllTranslations;
  }).length;

  const progress = Math.round((completed / totalFileStrings) * 100);
  console.log(`File progress: ${completed}/${totalFileStrings} = ${progress}%`);
  return progress;
}

function getFileStatusClass(file: any): string {
  const progress = getFileProgress(file);
  if (progress === 100) return 'completed';
  if (progress >= 80) return 'near-complete';
  if (progress >= 50) return 'in-progress';
  return 'not-started';
}

function getFileStatusText(file: any): string {
  const progress = getFileProgress(file);
  if (progress === 100) return 'Completed';
  if (progress >= 80) return 'Near completion';
  if (progress >= 50) return 'In progress';
  return 'Not started';
}

function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return 'pi pi-file-pdf';
  if (fileType.includes('word')) return 'pi pi-file-word';
  if (fileType.includes('excel')) return 'pi pi-file-excel';
  return 'pi pi-file';
}

function getFileTypeName(fileType: string): string {
  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.includes('word')) return 'Word';
  if (fileType.includes('excel')) return 'Excel';
  return 'File';
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('vi-VN');
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'WAITING_APPROVAL': 'Waiting Approval',
    'COMPLETED': 'Completed',
    'INCOMPLETED': 'Incompleted',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected'
  };
  return statusMap[status] || status;
}

function getStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    'WAITING_APPROVAL': 'status-waiting-approval',
    'COMPLETED': 'status-completed',
    'INCOMPLETED': 'status-incompleted',
    'APPROVED': 'status-approved',
    'REJECTED': 'status-rejected'
  };
  return classMap[status] || 'status-default';
}

function getNextStepText(status: string): string {
  const nextStepMap: Record<string, string> = {
    'WAITING_APPROVAL': 'Review the completed translation and approve or request changes.',
    'COMPLETED': 'Translation has been approved and completed successfully.',
    'INCOMPLETED': 'Translation has been rejected. Please contact the translator for corrections.',
    'APPROVED': 'Translation has been approved and completed successfully.',
    'REJECTED': 'Translation has been rejected. Please contact the translator for corrections.'
  };
  return nextStepMap[status] || 'Review the completed translation and approve or request changes.';
}

function getDeliveryMethodText(method: string): string {
  switch (method) {
    case 'download': return 'Direct download from the system';
    case 'email': return 'Send via email';
    case 'cloud': return 'Cloud storage';
    default: return 'Undetermined';
  }
}

// Preview helpers
function openPreviewModal() {
  showPreviewModal.value = true;
  // Reset lock state when opening modal
  previewSelectionLocked.value = false;
  // Load saved state first
  loadPreviewState();
  // Default select first file and first language if available
  if (!selectedPreviewFileId.value && files.value.length > 0) {
    const f = files.value[0];
    selectedPreviewFileId.value = String(f.id || f.fileId || '');
  }
  if (!selectedPreviewLanguage.value && (projectInfo.value?.targetLanguages || []).length > 0) {
    selectedPreviewLanguage.value = projectInfo.value.targetLanguages[0];
  }
  fetchPreviewPages();
}

function closePreviewModal() {
  showPreviewModal.value = false;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
  selectedPages.value = [];
  // Reset the lock so user can select pages again
  previewSelectionLocked.value = false;
}

function selectPreviewFile(file: any) {
  if (previewSelectionLocked.value) return;
  const id = String(file.id || file.fileId || '');
  if (selectedPreviewFileId.value !== id) {
    selectedPreviewFileId.value = id;
    // Reset pages when file changes
    selectedPages.value = [];
    fetchPreviewPages();
    savePreviewState();
  }
}

async function fetchPreviewPages() {
  if (!selectedPreviewFileId.value) return;
  try {
    previewPagesLoading.value = true;
    const pid = isRequestBased.value ? (projectInfo.value?.project?.id || originalRequestData.value?.project?.id) : projectId.value;
    const bid = isRequestBased.value ? (projectInfo.value?.project?.defaultBranch?.id || '1') : branchId.value;

    if (!pid || !bid) {
      console.log('No project ID or branch ID available for fetching pages');
      previewPages.value = [];
      return;
    }

    const { data } = await axiosInstance.get(`/translation/file-pages/${selectedPreviewFileId.value}`, {
      params: { projectId: pid, branchId: bid }
    });
    previewPages.value = Array.isArray(data?.pages) ? data.pages : [];

    // If no pages from API, create a default page for preview
    if (previewPages.value.length === 0) {
      console.log('No pages from API, creating default page');
      previewPages.value = [{ pageNumber: 1, filePart: 1, stringCount: 0, hasTranslatedStrings: false }];
    }

    // Auto-select all pages if file has 5 or fewer pages
    if (previewPages.value.length <= 5) {
      selectedPages.value = previewPages.value.map(p => p.pageNumber);
      console.log(`Auto-selected all ${previewPages.value.length} pages`);
    }
  } catch (e) {
    console.error('Error fetching preview pages:', e);
    // Create a default page if API fails
    previewPages.value = [{ pageNumber: 1, filePart: 1, stringCount: 0, hasTranslatedStrings: false }];
    // Auto-select the default page
    selectedPages.value = [1];
  } finally {
    previewPagesLoading.value = false;
  }
}

function toggleSelectPage(pageNumber: number) {
  if (previewSelectionLocked.value) return;
  const idx = selectedPages.value.indexOf(pageNumber);
  if (idx >= 0) {
    selectedPages.value.splice(idx, 1);
  } else {
    if (selectedPages.value.length >= 5) return;
    // Keep user-chosen order; do not auto-sort
    selectedPages.value.push(pageNumber);
  }
  // Keep current page aligned
  if (!currentPreviewPage.value && selectedPages.value.length > 0) {
    currentPreviewPage.value = selectedPages.value[0];
  }
  savePreviewState();
}

async function buildPreview() {
  if (!canStartPreview.value) return;
  // If not locked yet, ask for confirmation once
  if (!previewSelectionLocked.value) {
    showPreviewConfirm.value = true;
    return;
  }
  try {
    isBuildingPreview.value = true;
    // Download exported single-language file
    const response = await axiosInstance.get(`/translation/export/download/${selectedPreviewFileId.value}`, {
      params: { language: selectedPreviewLanguage.value },
      responseType: 'blob'
    });
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);

    const contentType = String((response.headers as any)?.['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], { type: contentType });

    // PDF -> always open in new tab (render ONLY selected pages as images)
    if (contentType.includes('application/pdf')) {
      const url = window.URL.createObjectURL(blob);
      const pages = selectedPages.value.slice(0, 5);
      const opened = openPdfAsImagesInNewTab(url, pages);
      if (opened) showPreviewModal.value = false; else toast.add({ severity: 'info', summary: 'Popup blocked', detail: 'Please allow popups to view preview.', life: 3000 });
      savePreviewState();
    } else if (contentType.includes('text/plain')) {
      // TXT -> text preview
      const text = await blob.text();
      textPreview.value = text;
      previewMode.value = 'text';
      currentPreviewPage.value = null;
      savePreviewState();
    } else if (contentType.includes('application/json') || contentType.includes('+json')) {
      // JSON -> pretty text
      const raw = await blob.text();
      try {
        const obj = JSON.parse(raw);
        textPreview.value = JSON.stringify(obj, null, 2);
      } catch {
        textPreview.value = raw;
      }
      previewMode.value = 'text';
      currentPreviewPage.value = null;
      savePreviewState();
    } else if (contentType.includes('text/html')) {
      const html = await blob.text();
      htmlPreview.value = html;
      previewMode.value = 'html';
      currentPreviewPage.value = null;
      savePreviewState();
    } else if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      // DOCX: chuyển sang PDF từ backend rồi mở tab mới (không cần public)
      try {
        const pdfResp = await axiosInstance.get(`/translation/export/pdf/${selectedPreviewFileId.value}`, {
          params: { language: selectedPreviewLanguage.value, watermark: 'PREVIEW - DO NOT COPY' },
          responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([pdfResp.data], { type: 'application/pdf' }));
        const opened = openPdfAsImagesInNewTab(url, selectedPages.value.slice(0, 5));
        if (opened) showPreviewModal.value = false; else toast.add({ severity: 'info', summary: 'Popup blocked', detail: 'Please allow popups to view preview.', life: 3000 });
        savePreviewState();
      } catch (e) {
        // Fallback: Mammoth HTML, nếu không được thì tải về
        try {
          await ensureMammothLoaded();
          const buffer = await blob.arrayBuffer();
          // @ts-ignore
          const result = await (window as any).mammoth.convertToHtml({ arrayBuffer: buffer });
          htmlPreview.value = String(result?.value || '');
          previewMode.value = 'html';
          currentPreviewPage.value = null;
          savePreviewState();
        } catch {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${projectInfo.value?.name || 'translated-file'}.docx`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          previewMode.value = 'none';
        }
      }
    } else {
      // Unknown -> download fallback
      toast.add({ severity: 'info', summary: 'Cannot preview', detail: 'This format is not supported for preview. Downloading...', life: 3000 });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectInfo.value?.name || 'translated-file'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      previewMode.value = 'none';
    }
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message || 'Failed to build preview', life: 3000 });
  } finally {
    isBuildingPreview.value = false;
  }
}

const iframeSrc = computed(() => {
  if (!previewUrl.value) return '';
  const page = currentPreviewPage.value || 1;
  return `${previewUrl.value}#page=${page}`;
});

function openPdfInCleanTab(pdfUrl: string, page: number) {
  const w = window.open('', '_blank');
  if (!w) return false;
  const safeUrl = `${pdfUrl}#page=${page}`;
  const html = `<!doctype html><html><head><meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
    <style>
      html,body{height:100%;margin:0;background:#fff;}
      .overlay{position:fixed;top:0;left:0;right:0;height:72px;background:#fff;z-index:9999;pointer-events:auto;}
      .overlay-bottom{position:fixed;bottom:0;left:0;right:0;height:16px;background:transparent;z-index:9999;pointer-events:auto;}
      .wrap{position:fixed;top:0;left:0;right:0;bottom:0}
      .viewer{position:absolute;inset:0;border:0;width:100%;height:100%;}
      .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);pointer-events:none;color:rgba(255,0,0,.12);font-weight:800;font-size:6vw;white-space:nowrap;z-index:9998}
      @media print{ body{ display:none !important; } }
    </style></head>
    <body>
      <div class="overlay" title="Toolbar disabled"></div>
      <div class="overlay-bottom"></div>
      <div class="wm">PREVIEW - DO NOT COPY</div>
      <div class="wrap">
        <iframe class="viewer" src="${safeUrl}"></iframe>
      </div>
    </body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
  try {
    // Attach blockers from opener context to avoid inline <script>
    w.document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, {capture:true});
    w.document.addEventListener('keydown', function(e:any){
      const key = (e.key || '').toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['s','p','o','u','c'].includes(key)) { e.preventDefault(); }
      if (e.key === 'F12') { e.preventDefault(); }
    }, {capture:true});
    // Block printing (best-effort)
    try { (w as any).print = () => {}; } catch {}
    try { (w as any).onbeforeprint = () => { try { w.document.body.style.display = 'none'; } catch {} }; } catch {}
  } catch {}
  return true;
}

// Load PDF.js from CDN and render only provided pages as images in a clean tab
async function ensurePdfJs(targetDoc: Document): Promise<void> {
  // Load PDF.js into the target document (the new tab), not the opener
  // @ts-ignore
  if ((targetDoc.defaultView as any)?.pdfjsLib) return;
  await new Promise<void>((resolve, reject) => {
    const s = targetDoc.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load PDF.js'));
    targetDoc.head.appendChild(s);
  });
  try {
    // @ts-ignore
    (targetDoc.defaultView as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  } catch {}
}

function openPdfAsImagesInNewTab(pdfUrl: string, pages: number[]): boolean {
  const tab = window.open('', '_blank');
  if (!tab) return false;
  tab.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
    <style>
      body{margin:0;background:#fff;font-family:sans-serif}
      .page{display:flex;justify-content:center;padding:16px}
      img{max-width:100%;height:auto;box-shadow:0 2px 12px rgba(0,0,0,.12)}
      .overlay{position:fixed;top:0;left:0;right:0;height:72px;background:#fff;z-index:9999;pointer-events:auto}
      @media print{ body{ display:none !important; } }
    </style></head><body>
    <div class="overlay" title="Toolbar disabled"></div>
    <div id="root"></div>
    </body></html>`);
  tab.document.close();

  (async () => {
    try {
      await ensurePdfJs(tab.document);
      // @ts-ignore
      const pdfjsLib = (tab as any).pdfjsLib || (tab.window as any).pdfjsLib || (tab.document.defaultView as any).pdfjsLib;
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const targetPages = pages.slice(0, 5);
      for (const p of targetPages) {
        const pageIndex = Math.min(Math.max(1, p), pdf.numPages);
        const page = await pdf.getPage(pageIndex);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = tab.document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const img = tab.document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.85);
        const wrap = tab.document.createElement('div');
        wrap.className = 'page';
        wrap.appendChild(img);
        tab.document.body.appendChild(wrap);
      }
      // Anti-copy basics
      tab.document.addEventListener('contextmenu', (e:any)=>e.preventDefault(), {capture:true});
      tab.document.addEventListener('keydown', (e:any)=>{ const k=(e.key||'').toLowerCase(); const ctrl=e.ctrlKey||e.metaKey; if(ctrl&&['s','p','o','u','c'].includes(k)) e.preventDefault(); if(e.key==='F12') e.preventDefault(); }, {capture:true});
    } catch {}
  })();
  return true;
}

// Watchers to persist changes
watch(selectedPreviewLanguage, savePreviewState);
watch(selectedPreviewFileId, savePreviewState);
watch(selectedPages, savePreviewState, { deep: true });
watch(currentPreviewPage, savePreviewState);

// Load Mammoth (DOCX -> HTML) from CDN when needed
async function ensureMammothLoaded(): Promise<void> {
  // @ts-ignore
  if ((window as any).mammoth) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/mammoth/mammoth.browser.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load mammoth'));
    document.head.appendChild(s);
  });
}

function openPreviewInNewTab() {
  try {
    if (previewMode.value === 'pdf' && previewUrl.value) {
      const page = currentPreviewPage.value || 1;
      window.open(`${previewUrl.value}#page=${page}`, '_blank');
      return;
    }
    if (previewMode.value === 'external' && previewExternalUrl.value) {
      window.open(previewExternalUrl.value, '_blank');
      return;
    }
    if (previewMode.value === 'html' && htmlPreview.value) {
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.open();
        newTab.document.write(htmlPreview.value);
        newTab.document.close();
      }
      return;
    }
    if (previewMode.value === 'text' && textPreview.value) {
      const blob = new Blob([textPreview.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Do not revoke immediately; let browser load it
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }
  } catch (e) {
    // ignore
  }
}

// Confirm selection once and lock it
function confirmSelectedPages() {
  previewSelectionLocked.value = true;
  showPreviewConfirm.value = false;
  savePreviewState();
  // proceed to preview
  buildPreview();
}

function cancelSelectedPages() {
  showPreviewConfirm.value = false;
}

// File upload methods
function triggerFileUpload() {
  fileInput.value?.click();
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    const newFiles = Array.from(target.files);
    evidenceFiles.value.push(...newFiles);
  }
}

function handleFileDrop(event: DragEvent) {
  event.preventDefault();
  const uploadArea = event.currentTarget as HTMLElement;
  uploadArea.classList.remove('dragover');

  if (event.dataTransfer?.files) {
    const newFiles = Array.from(event.dataTransfer.files);
    evidenceFiles.value.push(...newFiles);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  const uploadArea = event.currentTarget as HTMLElement;
  uploadArea.classList.add('dragover');
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  const uploadArea = event.currentTarget as HTMLElement;
  uploadArea.classList.remove('dragover');
}

function removeEvidenceFile(index: number) {
  evidenceFiles.value.splice(index, 1);
}

async function downloadAllFiles() {
  downloading.value = true;

  try {
    if (isRequestBased.value) {
      // For requests, try to download from project if available
      const requestRes = await axiosInstance.get(`/requests/${requestId.value}/detail`);
      const request = requestRes.data;

      if (request.project) {
        const projectId = request.project.id;
        const branchId = request.project.defaultBranch?.id || '1';

        const response = await axiosInstance.get(`/translation/download/all/${projectId}/${branchId}`, {
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${projectInfo.value?.name || 'translated-files'}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Successfully downloaded all files!',
          life: 3000
        });
      } else {
        // For requests without project, show a message that download functionality is not yet implemented
        toast.add({
          severity: 'info',
          summary: 'Info',
          detail: 'Download functionality for requests without projects is not yet implemented.',
          life: 3000
        });
      }
    } else {
      const response = await axiosInstance.get(`/translation/download/all/${projectId.value}/${branchId.value}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${projectInfo.value?.name || 'translated-files'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Successfully downloaded all files!',
        life: 3000
      });
    }

  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Could not download files',
      life: 3000
    });
  } finally {
    downloading.value = false;
  }
}

async function downloadFile(file: any) {
  try {
    const response = await axiosInstance.get(`/files/${file.fileId || file.id}/download`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Successfully downloaded ${file.fileName}!`,
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



async function submitReview() {
  if (!reviewDecision.value || rating.value === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select a decision and provide a rating.',
      life: 3000
    });
    return;
  }

  // Block approvals unless completion is 100%
  if (reviewDecision.value === 'APPROVED' && !isFullyCompleted.value) {
    toast.add({
      severity: 'warn',
      summary: 'Cannot approve',
      detail: 'Approval is only available when translation is 100% completed.',
      life: 3000
    });
    return;
  }

  // Check if evidence and reason are required for 100% completed rejections
  if (isFullyCompleted.value && reviewDecision.value === 'REJECTED') {
    if (evidenceFiles.value.length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please upload evidence for rejection. This translation is 100% completed and requires proof.',
        life: 3000
      });
      return;
    }

    if (!rejectionReason.value.trim()) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please provide a reason for rejection. This translation is 100% completed and requires a detailed explanation.',
        life: 3000
      });
      return;
    }
  }

  // Debug: Log project info to understand structure
  console.log('=== DEBUG submitReview ===');
  console.log('projectInfo.value:', projectInfo.value);
  console.log('projectInfo.value.assignee:', projectInfo.value?.assignee);
  console.log('projectInfo.value.project:', projectInfo.value?.project);
  console.log('projectInfo.value.project?.assignee:', projectInfo.value?.project?.assignee);
  console.log('isFullyCompleted:', isFullyCompleted.value);
  console.log('evidenceFiles:', evidenceFiles.value.length);

  // Get translator ID from request data
  let translatorId = null;

  // Try to get translator ID from different possible sources
  if (originalRequestData.value?.assignee?.id) {
    translatorId = originalRequestData.value.assignee.id.toString();
  } else if (projectInfo.value?.assignee?.id) {
    translatorId = projectInfo.value.assignee.id.toString();
  } else if (projectInfo.value?.project?.assignee?.id) {
    translatorId = projectInfo.value.project.assignee.id.toString();
  } else {
    console.log('Translator ID not found in any source');
  }

  console.log('Final translatorId:', translatorId);

  // Prepare review data for confirmation
  confirmReviewData.value = {
    requestId: requestId.value,
    decision: reviewDecision.value,
    rating: rating.value,
    comment: reviewComment.value,
    rejectionReason: rejectionReason.value, // Add rejection reason
    translatorId: translatorId,
    isFullyCompleted: isFullyCompleted.value,
    evidenceFiles: evidenceFiles.value
  };

  // Show confirmation modal
  showConfirmModal.value = true;
}

async function confirmSubmitReview() {
  try {
    // Set loading state
    isSubmitting.value = true;

    // If approved, start PayPal final 50% flow instead of submitting review immediately
    if (confirmReviewData.value?.decision === 'APPROVED' && requestId.value) {
      // Close modal immediately for faster perceived response
      showConfirmModal.value = false;

      // Pre-open a tab to avoid popup blockers and make navigation instant when URL is ready
      const newTab = window.open('', '_blank');

      const { data } = await axiosInstance.post(`/payment/finalize-translation/${requestId.value}`);
      if (data?.approvalUrl) {
        // Add payment details to PayPal URL for success view
        const paymentDetails = new URLSearchParams({
          requestId: requestId.value,
          amount: originalRequestData.value?.dealAmount?.toString() || '0',
          currency: 'USD',
          depositAmount: originalRequestData.value?.dealAmount?.toString() || '0', // Initial 50% deposit
          totalAmount: originalRequestData.value?.dealAmount?.toString() || '0'  // Total 100% for translator
        });

        const finalUrl = `${data.approvalUrl}&${paymentDetails.toString()}`;
        console.log('Redirecting to PayPal with payment details:', finalUrl);

        if (newTab && !newTab.closed) {
          newTab.location.href = finalUrl;
        } else {
          // Fallback to same-tab redirect if popup was blocked
          window.location.href = finalUrl;
        }
        return; // Stop further local state updates; flow continues after PayPal redirect
      }

      // If we did not get approvalUrl, close any pre-opened tab and continue error handling
      if (newTab && !newTab.closed) newTab.close();
    }

    // Otherwise (e.g., REJECTED), submit review to backend
    if (confirmReviewData.value.isFullyCompleted && confirmReviewData.value.decision === 'REJECTED') {
      // For 100% completed rejections, upload evidence files
      const formData = new FormData();

      // Debug: Log all data before sending
      console.log('=== DEBUG: confirmReviewData ===', confirmReviewData.value);
      console.log('=== DEBUG: requestId ===', confirmReviewData.value.requestId);
      console.log('=== DEBUG: decision ===', confirmReviewData.value.decision);
      console.log('=== DEBUG: rating ===', confirmReviewData.value.rating);
      console.log('=== DEBUG: rejectionReason ===', confirmReviewData.value.rejectionReason);
      console.log('=== DEBUG: translatorId ===', confirmReviewData.value.translatorId);
      console.log('=== DEBUG: evidenceFiles ===', confirmReviewData.value.evidenceFiles);

      formData.append('requestId', confirmReviewData.value.requestId);
      formData.append('decision', confirmReviewData.value.decision);
      formData.append('rating', confirmReviewData.value.rating.toString());
      formData.append('comment', confirmReviewData.value.comment || '');
      formData.append('rejectionReason', confirmReviewData.value.rejectionReason || '');
      formData.append('translatorId', confirmReviewData.value.translatorId);
      formData.append('isFullyCompleted', 'true');

      // Append evidence files - use 'evidence' as key for FilesInterceptor
      confirmReviewData.value.evidenceFiles.forEach((file: File) => {
        formData.append('evidence', file);
      });

      // Debug: Log FormData contents
      console.log('=== DEBUG: FormData contents ===');
      for (let [key, value] of (formData as any).entries()) {
        console.log(`${key}:`, value);
      }

      console.log('=== DEBUG: Sending to API ===', '/requests/review-with-evidence');

      await axiosInstance.post('/requests/review-with-evidence', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      // Add isFullyCompleted parameter to the review data
      const reviewData = {
        ...confirmReviewData.value,
        isFullyCompleted: isFullyCompleted.value
      };
      await axiosInstance.post('/requests/review', reviewData);
    }

    // Update local state
    reviewSubmitted.value = true;
    submittedRating.value = confirmReviewData.value.rating;
    submittedComment.value = confirmReviewData.value.comment;

    // Close modal
    showConfirmModal.value = false;

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Review submitted successfully! Request ${confirmReviewData.value.decision.toLowerCase()}. Redirecting to My Requests in 2 seconds...`,
      life: 3000
    });

    // Update request status in the UI based on review decision
    if (projectInfo.value) {
      if (confirmReviewData.value.decision === 'APPROVED') {
        projectInfo.value.status = 'COMPLETED';
      } else if (confirmReviewData.value.decision === 'REJECTED') {
        projectInfo.value.status = 'INCOMPLETED';
      }
    }

    // Navigate back to My Requests page after successful submission
    setTimeout(() => {
      router.push('/my-requests');
    }, 2000); // Wait 2 seconds to show success message before redirecting

  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to submit review',
      life: 3000
    });
  } finally {
    // Reset loading state
    isSubmitting.value = false;
  }
}

onMounted(() => {
  loadProjectData();
});
</script>

<style scoped>
.translation-handover-wrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.main-content {
  display: flex;
  min-height: calc(100vh - 60px);
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  margin-left: 250px; /* Add left margin to avoid sidebar overlap */
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
  color: white;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.loading-container,
.error-container {
  text-align: center;
  color: white;
  padding: 2rem;
}

.loading-container i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-container i {
  font-size: 3rem;
  color: #ff6b6b;
  margin-bottom: 1rem;
}

.no-data-container {
  text-align: center;
  color: white;
  padding: 2rem;
}

.no-data-container i {
  font-size: 3rem;
  color: #fbbf24;
  margin-bottom: 1rem;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.info-card h3 {
  margin-bottom: 1.5rem;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-card h3 i {
  color: #667eea;
}

.project-info p {
  margin: 0.5rem 0;
}

.request-note {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  color: #92400e;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.request-note i {
  color: #f59e0b;
  margin-top: 0.125rem;
}

.request-status-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
}

.request-status-info p {
  margin: 0.5rem 0;
}

.status-badge.status-waiting-approval {
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.status-approved {
  background: #d1fae5;
  color: #065f46;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.status-completed {
  background: #d1fae5;
  color: #065f46;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.status-incompleted {
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Review Section Styles */
.review-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.review-form {
  display: grid;
  gap: 1.5rem;
}

.review-decision label,
.rating-section label,
.review-comment label,
.review-reason label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.rejection-reason-textarea {
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.3s ease;
  background: #f9fafb;
}

.rejection-reason-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.rejection-reason-textarea::placeholder {
  color: #9ca3af;
  font-style: italic;
}

.decision-buttons {
  display: flex;
  gap: 1rem;
}

.decision-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
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
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.decision-btn.active i {
  color: white;
}

.rating-section {
  display: grid;
  gap: 0.5rem;
}

.star-rating {
  display: flex;
  gap: 0.25rem;
}

.star {
  font-size: 1.5rem;
  color: #d1d5db;
  cursor: pointer;
  transition: color 0.2s ease;
}

.star:hover {
  color: #fbbf24;
}

.star.pi-star-fill {
  color: #fbbf24;
}

.rating-text {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.review-comment textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.review-comment textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* Completion Warning Styles */
.completion-warning {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: #92400e;
}

.completion-warning i {
  color: #f59e0b;
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.completion-warning strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.completion-warning p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Evidence Upload Styles */
.evidence-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.evidence-section label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.evidence-upload {
  margin-bottom: 1rem;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
  overflow: hidden;
}

.upload-area:hover {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.upload-area.dragover {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  transform: scale(1.02);
}

.upload-icon {
  margin-bottom: 1.5rem;
}

.upload-icon i {
  font-size: 3rem;
  color: #3b82f6;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.upload-content h4 {
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
}

.upload-description {
  color: #4b5563;
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.upload-hint {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.upload-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.upload-button i {
  font-size: 1rem;
}

.evidence-files {
  margin-top: 1.5rem;
}

.evidence-files h5 {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.evidence-files h5::before {
  content: '';
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 2px;
}

.evidence-file {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.evidence-file:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.evidence-file i {
  color: #3b82f6;
  font-size: 1.5rem;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.5rem;
  border-radius: 8px;
}

.evidence-file span {
  flex: 1;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
}

.remove-file {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  border: none;
  color: #dc2626;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.remove-file:hover {
  background: linear-gradient(135deg, #fecaca, #fca5a5);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.remove-file i {
  font-size: 1rem;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
}

/* Review Submitted Styles */
.review-submitted {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.review-summary {
  display: grid;
  gap: 0.75rem;
}

.review-summary p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.rating-display i {
  font-size: 1rem;
}

.progress-note {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  color: #0369a1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.progress-note i {
  color: #0ea5e9;
  font-size: 1rem;
}

.language-badge {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  margin-left: 0.5rem;
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 12px;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.overall-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.files-list {
  display: grid;
  gap: 1rem;
}

.no-files {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

.no-files i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-files p {
  font-size: 1.1rem;
  margin: 0;
}

.file-item {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.file-info i {
  font-size: 1.5rem;
  color: #667eea;
}

.file-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.file-meta {
  font-size: 0.875rem;
  color: #718096;
}

.file-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 200px;
}

.file-progress .progress-bar {
  height: 8px;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.completed {
  background: #c6f6d5;
  color: #22543d;
}

.status-badge.near-complete {
  background: #fef5e7;
  color: #744210;
}

.status-badge.in-progress {
  background: #bee3f8;
  color: #2a4365;
}

.status-badge.not-started {
  background: #fed7d7;
  color: #742a2a;
}

.handover-info {
  display: grid;
  gap: 2rem;
}

.info-section {
  display: grid;
  gap: 1rem;
}

.info-section h4 {
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.handover-date {
  color: #718096;
  font-size: 0.875rem;
  margin: 0;
}

.message-box {
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #4a5568;
  line-height: 1.6;
}

.quality-checks {
  display: grid;
  gap: 0.75rem;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  color: #dc2626;
}

.check-item.completed {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #059669;
}

.check-item i {
  font-weight: bold;
}

.download-section {
  display: grid;
  gap: 2rem;
}

.download-info {
  display: grid;
  gap: 1rem;
}

.download-info p {
  color: #4a5568;
  margin: 0;
}

.download-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.download-stats span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #718096;
  font-size: 0.875rem;
}

.download-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-actions .btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

/* Evidence confirmation modal styles */
.evidence-confirmation {
  display: grid;
  gap: 1.5rem;
}

.evidence-warning {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  color: #92400e;
}

.evidence-warning i {
  font-size: 1.5rem;
  color: #f59e0b;
  margin-top: 0.25rem;
}

.evidence-warning h4 {
  margin: 0 0 0.5rem 0;
  color: #92400e;
  font-size: 1.125rem;
}

.evidence-warning p {
  margin: 0;
  color: #92400e;
}

.reason-preview-container {
  flex: 1;
}

.reason-preview-textarea {
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  font-family: inherit;
  cursor: default;
  user-select: text;
}

.reason-preview-textarea:focus {
  outline: none;
  border-color: #d1d5db;
  background: #f9fafb;
}

.evidence-preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.evidence-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.evidence-count-badge i {
  font-size: 1rem;
}

.evidence-files-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.evidence-file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #374151;
}

.evidence-file-item i {
  color: #3b82f6;
  font-size: 1rem;
}

.admin-review-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #dbeafe;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  color: #1e40af;
}

.admin-review-notice i {
  font-size: 1.5rem;
  color: #3b82f6;
  margin-top: 0.125rem;
}

.admin-review-notice strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #1e40af;
}

.admin-review-notice p {
  margin: 0;
  color: #1e40af;
  line-height: 1.4;
}

/* Evidence explanation styles */
.evidence-explanation {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #dbeafe;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  color: #1e40af;
  margin-bottom: 1rem;
}

.evidence-explanation i {
  font-size: 1.5rem;
  color: #3b82f6;
  margin-top: 0.25rem;
}

.evidence-explanation strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #1e40af;
}

.evidence-explanation p {
  margin: 0;
  color: #1e40af;
  line-height: 1.5;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-primary:disabled:hover {
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 1200px;
  width: 98%;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  position: relative;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
}

.modal-header h3 i {
  color: #f59e0b;
  font-size: 1.125rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #718096;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f7fafc;
  color: #4a5568;
}

.modal-body {
  padding: 1rem 1.5rem;
}

.modal-body p {
  margin-bottom: 1.5rem;
  color: #4a5568;
  font-size: 0.875rem;
}

.review-summary-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 1.5rem;
}

.review-summary-preview.admin-review-close {
  margin-top: 0.5rem;
}

.summary-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  align-items: start;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item strong {
  color: #2d3748;
  font-weight: 600;
  font-size: 0.875rem;
  padding-top: 0.25rem;
}

.comment-preview {
  margin: 0.5rem 0 0 0;
  padding: 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #4a5568;
  font-style: italic;
  font-size: 0.875rem;
  line-height: 1.4;
}

.warning-message {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: #92400e;
}

.warning-message i {
  color: #f59e0b;
  margin-top: 0.125rem;
}

.warning-message p {
  margin: 0;
  font-size: 0.8rem;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
}

/* Loading overlay styles */
.modal-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 12px;
}

.loading-spinner {
  text-align: center;
  color: #3b82f6;
}

.loading-spinner i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #3b82f6;
}

.loading-spinner p {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}



@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-left: 0; /* Remove left margin on mobile */
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .file-item {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .file-actions {
    justify-content: center;
  }

  .form-actions {
    flex-direction: column;
  }

  .progress-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
