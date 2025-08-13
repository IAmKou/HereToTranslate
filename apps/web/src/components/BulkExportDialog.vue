<template>
  <Dialog
    :visible="visible"
    modal
    header="Bulk Export Project"
    :style="{ width: '600px' }"
    :closable="true"
    @hide="onHide"
  >
    <div class="bulk-export-content">
      <!-- Format Selection -->
      <div class="form-group">
        <label class="form-label">Export Format</label>
        <div class="format-options">
          <div class="format-option">
            <RadioButton
              v-model="selectedFormat"
              value="original"
              :input-id="'format-original'"
            />
            <label :for="'format-original'" class="format-label">
              Original Format
            </label>
          </div>
          <div class="format-option">
            <RadioButton
              v-model="selectedFormat"
              value="xliff"
              :input-id="'format-xliff'"
            />
            <label :for="'format-xliff'" class="format-label">
              XLIFF Format
            </label>
          </div>
        </div>
      </div>

      <!-- Project Info -->
      <div class="form-group">
        <label class="form-label">Project Information</label>
        <div class="project-info">
          <div class="info-item">
            <span class="info-label">Available Languages:</span>
            <span class="info-value">{{ availableLanguages.length }} languages</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Files:</span>
            <span class="info-value">{{ projectFiles.length }} files</span>
          </div>
          <div class="info-item">
            <span class="info-label">Export Scope:</span>
            <span class="info-value">All files in all languages</span>
          </div>
        </div>
      </div>

      <!-- Export Options -->
      <div class="form-group">
        <label class="form-label">Export Options</label>
        <div class="export-options">
          <div class="option-item">
            <Checkbox
              v-model="exportOptions.includeCompletedOnly"
              :binary="true"
              :input-id="'completed-only'"
            />
            <label :for="'completed-only'" class="option-label">
              Export only completed translations
            </label>
          </div>
          <div class="option-item">
            <Checkbox
              v-model="exportOptions.includeComments"
              :binary="true"
              :input-id="'include-comments'"
            />
            <label :for="'include-comments'" class="option-label">
              Include translation comments
            </label>
          </div>
        </div>
      </div>

      <!-- Export Preview -->
      <div class="form-group">
        <label class="form-label">Export Preview</label>
        <div class="export-preview">
          <div class="preview-item">
            <i class="pi pi-folder text-blue-500"></i>
            <span>Project: {{ projectId }}</span>
          </div>
          <div class="preview-item">
            <i class="pi pi-globe text-green-500"></i>
            <span>Languages: {{ availableLanguages.map(lang => lang.name).join(', ') }}</span>
          </div>
          <div class="preview-item">
            <i class="pi pi-file text-orange-500"></i>
            <span>Files: {{ projectFiles.map(file => file.fileName).join(', ') }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          @click="onHide"
          class="p-button-text"
        />
        <Button
          label="Export All Languages"
          @click="startBulkExport"
          :loading="isExporting"
          :disabled="!canStartExport"
          icon="pi pi-download"
        />
      </div>
    </template>

    <!-- Job Status Dialog -->
    <Dialog
      :visible="showJobStatus"
      modal
      header="Export Progress"
      :style="{ width: '500px' }"
      :closable="false"
    >
      <div class="job-status-content">
        <div class="job-info">
          <div class="job-id">Job ID: {{ currentJobId }}</div>
          <div class="job-status" :class="jobStatusClass">
            {{ getStatusLabel(currentJobStatus?.status) }}
          </div>
        </div>

        <div v-if="currentJobStatus?.progress !== undefined" class="progress-section">
          <ProgressBar
            :value="currentJobStatus.progress"
            :show-value="true"
            class="progress-bar"
          />
        </div>

        <div v-if="currentJobStatus?.result" class="result-section">
          <div class="result-summary">
            <div class="result-item">
              <i class="pi pi-check-circle text-green-500"></i>
              <span>Successfully exported: {{ getSuccessfulFilesCount() }}</span>
            </div>
            <div v-if="getFailedFilesCount() > 0" class="result-item">
              <i class="pi pi-exclamation-triangle text-orange-500"></i>
              <span>Failed: {{ getFailedFilesCount() }}</span>
            </div>
          </div>

          <div v-if="currentJobStatus.result.zipUrl" class="download-section">
            <Button
              label="Download ZIP"
              @click="downloadZip"
              icon="pi pi-download"
              class="p-button-success"
            />
          </div>

          <div v-if="currentJobStatus.result.files.length > 0" class="files-section">
            <h4>Individual Files</h4>
            <div class="file-downloads">
              <div
                v-for="file in currentJobStatus.result.files"
                :key="file.fileId"
                class="file-download-item"
              >
                <span class="file-name">{{ file.fileName }}</span>
                <div class="file-actions">
                  <span v-if="file.error" class="error-text">{{ file.error }}</span>
                  <Button
                    v-else
                    label="Download"
                    @click="downloadFile(file.downloadUrl)"
                    icon="pi pi-download"
                    class="p-button-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentJobStatus?.error" class="error-section">
          <div class="error-message">
            <i class="pi pi-exclamation-triangle text-red-500"></i>
            <span>{{ currentJobStatus.error }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <Button
            v-if="currentJobStatus?.status === 'completed' || currentJobStatus?.status === 'failed'"
            label="Close"
            @click="closeJobStatus"
            class="p-button-text"
          />
          <Button
            v-else
            label="Cancel Job"
            @click="cancelJob"
            class="p-button-danger"
          />
        </div>
      </template>
    </Dialog>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'primevue/usetoast'
import axiosInstance from '../api'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import RadioButton from 'primevue/radiobutton'
import Checkbox from 'primevue/checkbox'
import ProgressBar from 'primevue/progressbar'

const toast = useToast()

interface FileInfo {
  id: string
  fileName: string
  fileType: string
}

interface ExportOptions {
  includeCompletedOnly: boolean
  includeComments: boolean
}

interface JobStatus {
  jobId: string
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  progress?: number
  result?: {
    files: Array<{
      fileId: string
      fileName: string
      downloadUrl?: string
      error?: string
    }>
    zipUrl?: string
  }
  error?: string
  createdAt: Date
  processedAt?: Date
  finishedAt?: Date
}

const props = defineProps<{
  visible: boolean
  projectId: string
  branchId?: string
  availableLanguages: Array<{ code: string; name: string }>
  defaultLanguage: { code: string; name: string }
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// Reactive data
const selectedFormat = ref<'original' | 'xliff'>('original')
const projectFiles = ref<FileInfo[]>([])

console.log('BulkExportDialog initialized with props:', {
  availableLanguages: props.availableLanguages,
  projectId: props.projectId,
  branchId: props.branchId
})
console.log('Available languages:', props.availableLanguages)
console.log('Project files:', projectFiles.value)

const exportOptions = ref<ExportOptions>({
  includeCompletedOnly: false,
  includeComments: false
})

// Job status
const isExporting = ref(false)
const showJobStatus = ref(false)
const currentJobId = ref('')
const currentJobStatus = ref<JobStatus | null>(null)
const statusPollingInterval = ref<number | null>(null)

// Computed
const canStartExport = computed(() => {
  const hasLanguages = props.availableLanguages && props.availableLanguages.length > 0
  const hasFiles = projectFiles.value && projectFiles.value.length > 0

  console.log('canStartExport computed check:', {
    hasLanguages,
    availableLanguagesCount: props.availableLanguages?.length,
    hasFiles,
    projectFilesCount: projectFiles.value?.length
  })

  return hasLanguages && hasFiles
})

const jobStatusClass = computed(() => {
  if (!currentJobStatus.value) return ''

  switch (currentJobStatus.value.status) {
    case 'completed':
      return 'status-completed'
    case 'failed':
      return 'status-failed'
    case 'active':
      return 'status-active'
    case 'waiting':
      return 'status-waiting'
    default:
      return ''
  }
})

// Methods
const loadProjectFiles = async () => {
  try {
    console.log('Loading project files for projectId:', props.projectId, 'branchId:', props.branchId)
    const response = await axiosInstance.get(`/exports/project/${props.projectId}/files`, {
      params: { branchId: props.branchId }
    })
    console.log('Project files response:', response.data)
    console.log('Response data type:', typeof response.data)
    console.log('Response data is array:', Array.isArray(response.data))

    if (Array.isArray(response.data)) {
      console.log('Response is array, length:', response.data.length)
      if (response.data.length > 0) {
        console.log('First file object:', response.data[0])
        console.log('First file ID:', response.data[0]?.id)
        console.log('First file ID type:', typeof response.data[0]?.id)
      }
    } else {
      console.log('Response is not array, checking structure...')
      console.log('Response keys:', Object.keys(response.data || {}))
    }

    projectFiles.value = response.data
    console.log('Project files loaded:', projectFiles.value)
    console.log('Project files length:', projectFiles.value?.length)
  } catch (error) {
    console.error('Failed to load project files:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load project files', life: 3000 })
  }
}

const getFileTypeLabel = (fileType: string) => {
  switch (fileType) {
    case 'application/pdf':
      return 'PDF'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX'
    default:
      return fileType
  }
}

const startBulkExport = async () => {
  console.log('startBulkExport called')
  console.log('canStartExport.value:', canStartExport.value)
  console.log('projectFiles.value:', projectFiles.value)
  console.log('availableLanguages:', props.availableLanguages)

  if (!canStartExport.value) {
    console.log('Cannot start export - validation failed')
    return
  }

  isExporting.value = true
  try {
    // Lấy tất cả file IDs và validate
    const allFileIds = projectFiles.value
      .map(file => {
        console.log('Processing file:', file)
        console.log('File ID type:', typeof file.id, 'Value:', file.id)
        return file.id
      })
      .filter(id => {
        const isValid = id && id.toString().trim() !== ''
        console.log(`FileId ${id} is valid: ${isValid}`)
        return isValid
      })

    console.log('All file IDs to export (after filtering):', allFileIds)
    console.log('Original projectFiles:', projectFiles.value)

    if (allFileIds.length === 0) {
      console.log('No valid files found to export')
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No valid files found to export',
        life: 3000
      })
      return
    }

    console.log('Starting project export with data:', {
      fileIds: allFileIds,
      format: selectedFormat.value,
      projectId: props.projectId,
      branchId: props.branchId,
      exportAllLanguages: true
    })

    // Log the exact payload being sent
    const payload = {
      fileIds: allFileIds,
      format: selectedFormat.value,
      projectId: props.projectId,
      branchId: props.branchId,
      exportAllLanguages: true
    }
    console.log('Payload being sent to backend:', JSON.stringify(payload, null, 2))
    console.log('Payload fileIds type:', typeof payload.fileIds)
    console.log('Payload fileIds is array:', Array.isArray(payload.fileIds))

    // Sử dụng endpoint mới để export tất cả ngôn ngữ
    const response = await axiosInstance.post('/translation/export/download/bulk', payload, {
      responseType: 'blob' // Quan trọng: phải set responseType là 'blob'
    })

    console.log('Project export response received')
    console.log('Response headers:', response.headers)
    console.log('Response data type:', typeof response.data)
    console.log('Response data size:', response.data?.size || 'unknown')

    // Validate response data
    if (!response.data || response.data.size === 0) {
      throw new Error('Empty response received from server')
    }

    // Tạo download link trực tiếp
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/zip'
    })

    console.log('Blob created:', {
      size: blob.size,
      type: blob.type
    })

    const disposition = response.headers['content-disposition'] as string | undefined
    let filename = `project-export-${props.projectId}-${Date.now()}.zip`
    if (disposition) {
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
      const extracted = decodeURIComponent(match?.[1] || match?.[2] || '')
      if (extracted) filename = extracted
    }

    console.log('Downloading file:', filename)

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Successfully exported project with ${allFileIds.length} files in ${props.availableLanguages.length} languages`,
      life: 3000
    })

    console.log(`Project export completed successfully`)

  } catch (error: any) {
    console.error('Project export error:', error)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)

    const errorMessage = error.response?.data?.message || error.message || 'Failed to start project export'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to start project export: ${errorMessage}`,
      life: 5000
    })
  } finally {
    isExporting.value = false
  }
}

const startStatusPolling = () => {
  statusPollingInterval.value = setInterval(async () => {
    try {
      const response = await axiosInstance.get(`/exports/job/${currentJobId.value}`)
      currentJobStatus.value = response.data

      if (response.data.status === 'completed' || response.data.status === 'failed') {
        stopStatusPolling()
      }
    } catch (error) {
      console.error('Failed to poll job status:', error)
    }
  }, 2000)
}

const stopStatusPolling = () => {
  if (statusPollingInterval.value) {
    clearInterval(statusPollingInterval.value)
    statusPollingInterval.value = null
  }
}

const cancelJob = async () => {
  try {
    await axiosInstance.delete(`/exports/job/${currentJobId.value}`, {
      data: { userId: 'current-user' }
    })
    stopStatusPolling()
    showJobStatus.value = false
    toast.add({ severity: 'success', summary: 'Success', detail: 'Export job cancelled', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to cancel job', life: 3000 })
  }
}

const downloadZip = async () => {
  if (currentJobStatus.value?.result?.zipUrl) {
    try {
      const response = await axiosInstance.get(currentJobStatus.value.result.zipUrl, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/zip'
      });

      const disposition = response.headers['content-disposition'] as string | undefined;
      let filename = `bulk-export-${currentJobId.value}.zip`;
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        const extracted = decodeURIComponent(match?.[1] || match?.[2] || '');
        if (extracted) filename = extracted;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.add({
        severity: 'success',
        summary: 'Downloaded',
        detail: `Successfully downloaded ${filename}`,
        life: 3000
      });
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Download Failed',
        detail: error?.response?.data?.message || 'Failed to download export',
        life: 3000
      });
    }
  }
}

const downloadFile = async (downloadUrl?: string) => {
  if (downloadUrl) {
    try {
      const response = await axiosInstance.get(downloadUrl, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream'
      });

      const disposition = response.headers['content-disposition'] as string | undefined;
      let filename = 'exported-file';
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        const extracted = decodeURIComponent(match?.[1] || match?.[2] || '');
        if (extracted) filename = extracted;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.add({
        severity: 'success',
        summary: 'Downloaded',
        detail: `Successfully downloaded ${filename}`,
        life: 3000
      });
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Download Failed',
        detail: error?.response?.data?.message || 'Failed to download file',
        life: 3000
      });
    }
  }
}

const getSuccessfulFilesCount = () => {
  return currentJobStatus.value?.result?.files.filter((f: any) => !f.error).length || 0
}

const getFailedFilesCount = () => {
  return currentJobStatus.value?.result?.files.filter((f: any) => f.error).length || 0
}

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'waiting':
      return 'Waiting in queue'
    case 'active':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'delayed':
      return 'Delayed'
    default:
      return 'Unknown'
  }
}

const closeJobStatus = () => {
  showJobStatus.value = false
  currentJobStatus.value = null
  currentJobId.value = ''
}

const onHide = () => {
  emit('update:visible', false)
  stopStatusPolling()
}

// Lifecycle
onMounted(() => {
  loadProjectFiles()
})

onBeforeUnmount(() => {
  stopStatusPolling()
})

// Watch for prop changes
watch(() => props.visible, (newValue) => {
  if (newValue) {
    loadProjectFiles()
  }
})
</script>

<style scoped>
.bulk-export-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: var(--text-color);
}

.format-options {
  display: flex;
  gap: 1rem;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.format-label {
  cursor: pointer;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--surface-50);
  border-radius: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.info-value {
  font-weight: 600;
  color: var(--text-color);
}

.export-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--surface-50);
  border-radius: 6px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.file-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  border-bottom: 1px solid var(--surface-border);
  transition: background-color 0.2s;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background-color: var(--surface-hover);
}

.file-item.selected {
  background-color: var(--primary-50);
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
}

.file-type {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-label {
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Job Status Dialog Styles */
.job-status-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.job-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--surface-50);
  border-radius: 6px;
}

.job-id {
  font-family: monospace;
  font-size: 0.875rem;
}

.job-status {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status-waiting {
  background-color: var(--orange-100);
  color: var(--orange-700);
}

.status-active {
  background-color: var(--blue-100);
  color: var(--blue-700);
}

.status-completed {
  background-color: var(--green-100);
  color: var(--green-700);
}

.status-failed {
  background-color: var(--red-100);
  color: var(--red-700);
}

.progress-section {
  margin: 1rem 0;
}

.progress-bar {
  height: 1.5rem;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.download-section {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
  border-top: 1px solid var(--surface-border);
}

.files-section h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.file-downloads {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
}

.file-download-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: var(--surface-50);
  border-radius: 4px;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-text {
  color: var(--red-500);
  font-size: 0.875rem;
}

.error-section {
  padding: 0.75rem;
  background-color: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 6px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--red-700);
}
</style>
