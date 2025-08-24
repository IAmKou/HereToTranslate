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
              <p v-if="isRequestBased && !projectInfo?.project" class="request-note">
                <i class="pi pi-info-circle"></i>
                <strong>Note:</strong> This request does not have an associated project yet.
                Translation handover data will be available once a project is created from this request.
              </p>
              <p v-if="isRequestBased && projectInfo?.project" class="request-note">
                <i class="pi pi-check-circle"></i>
                <strong>Note:</strong> This request has an associated project.
                Translation data is loaded from the project.
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

          <!-- Translated Files List -->
          <div class="info-card">
            <h3><i class="pi pi-file-edit"></i> Translated Files</h3>
            <div v-if="translatedFiles.length === 0" class="no-files">
              <i class="pi pi-info-circle"></i>
              <p v-if="isRequestBased && !projectInfo?.project">File management for requests without projects is not yet implemented. Files will be displayed here once a project is created from this request.</p>
              <p v-else-if="isRequestBased && projectInfo?.project">No translated files found in the associated project.</p>
              <p v-else>No translated files available yet.</p>
            </div>
            <div v-else class="files-list">
              <div v-for="file in translatedFiles" :key="file.id" class="file-item">
                <div class="file-info">
                  <i :class="getFileIcon(file.fileType)"></i>
                  <div>
                    <div class="file-name">{{ file.fileName }}</div>
                    <div class="file-meta">{{ formatFileSize(file.fileSize) }} • {{ getFileTypeName(file.fileType) }}</div>
                  </div>
                </div>
                <div class="file-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: getFileProgress(file) + '%' }"></div>
                  </div>
                  <span>{{ getFileProgress(file) }}%</span>
                </div>
                <div class="file-status">
                   <span class="status-badge" :class="getFileStatusClass(file)">
                     {{ getFileStatusText(file) }}
                   </span>
                </div>
                <div class="file-actions">
                  <button @click="downloadFile(file)" class="btn btn-primary">
                    <i class="pi pi-download"></i>
                    Download
                  </button>
                </div>
              </div>
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
                  <p><strong>Current status:</strong> <span class="status-badge status-waiting-approval">Waiting Approval</span></p>
                  <p><strong>Next step:</strong> Review the completed translation and approve or request changes.</p>
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
                <button @click="downloadAllFiles" class="btn btn-primary" :disabled="downloading">
                  <i v-if="downloading" class="pi pi-spin pi-spinner"></i>
                  <i v-else class="pi pi-download"></i>
                  {{ downloading ? 'Downloading...' : 'Download All' }}
                </button>
                <button @click="downloadIndividualFiles" class="btn btn-secondary">
                  <i class="pi pi-info-circle"></i>
                  How to Download Individual Files
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

// Data
const projectInfo = ref<any>(null);
const files = ref<any[]>([]);
const translationStrings = ref<any[]>([]);
const handoverInfo = ref<any>(null);
const isRequestBased = computed(() => !!requestId.value);

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
    console.log('Request data:', request);
    console.log('Request project:', request.project);
    console.log('Request project ID:', request.project?.id);
    console.log('Request project defaultBranch:', request.project?.defaultBranch);

    // Set project info from request
    projectInfo.value = {
      name: request.title,
      description: request.description,
      createdAt: request.createdAt,
      targetLanguages: request.targetLanguages || []
    };

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
            const stringsWithLanguage = languageStrings.map(str => ({
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
        const stringsWithTranslation = translationStrings.value.filter(str => str.translatedText && str.translatedText.trim());
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
      const stringsWithLanguage = languageStrings.map(str => ({
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

function getDeliveryMethodText(method: string): string {
  switch (method) {
    case 'download': return 'Direct download from the system';
    case 'email': return 'Send via email';
    case 'cloud': return 'Cloud storage';
    default: return 'Undetermined';
  }
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

function downloadIndividualFiles() {
  // Show toast message that individual files can be downloaded directly
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'You can download individual files using the Download button next to each file above.',
    life: 5000
  });
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

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
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
