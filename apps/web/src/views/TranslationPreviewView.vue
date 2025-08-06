<template>
  <div class="translation-preview-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1><i class="pi pi-eye"></i> Translation Preview & Export</h1>
        <p>Preview and export the file you are editing</p>
      </div>
      <div class="header-actions">
        <button @click="$router.go(-1)" class="back-btn">
          <i class="pi pi-arrow-left"></i>
          Back
        </button>
      </div>
    </div>

    <!-- Only show preview for the file being edited -->
    <div v-if="selectedFile && showPreviewPanel" class="preview-panel">
      <div class="preview-header">
        <h3><i class="pi pi-eye"></i> Translation Preview & Export</h3>
        <button @click="closePreviewPanel" class="close-btn">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Language Selector -->
      <div class="language-selector">
        <label for="language">Select Language:</label>
        <select
          id="language"
          v-model="selectedLanguage"
          class="language-dropdown"
        >
          <option value="">Choose a language</option>
          <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
            {{ lang.name }}
          </option>
        </select>
      </div>

      <!-- Preview Content -->
      <div class="preview-content">
        <div v-if="loading" class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Loading translation preview...</span>
        </div>

        <div v-else-if="error" class="error-state">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error }}</span>
          <button @click="loadPreview" class="retry-btn">Retry</button>
        </div>

        <div v-else-if="!previewData" class="no-preview-state">
          <i class="pi pi-file-text"></i>
          <span>Select a language to preview translation</span>
        </div>

        <div v-else class="preview-data">
          <!-- Text/JSON Preview -->
          <div v-if="previewType === 'text'" class="text-preview">
            <div class="text-container">
              <pre class="text-content" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }">{{ previewData }}</pre>
            </div>
            <!-- Zoom controls for Text -->
            <div class="text-zoom-controls">
              <button @click="zoomOut" :disabled="zoom <= 0.5" class="control-btn">-</button>
              <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
              <button @click="zoomIn" :disabled="zoom >= 2" class="control-btn">+</button>
              <button @click="resetZoom" class="control-btn">Reset</button>
            </div>
          </div>

          <!-- PDF Preview -->
          <div v-else-if="previewType === 'pdf'" class="pdf-preview">
            <iframe :src="previewUrl" class="pdf-viewer" frameborder="0"></iframe>
          </div>

          <!-- Document Preview with docx-preview library -->
          <div v-else-if="previewType === 'docx-preview'" class="document-preview">
            <div class="docx-container">
              <div ref="docxContainer" class="docx-content" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }"></div>
            </div>
            <div v-if="!docxRendered" class="docx-loading">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Loading DOCX preview...</span>
            </div>

            <!-- Zoom controls for DOCX -->
            <div class="docx-zoom-controls">
              <button @click="zoomOut" :disabled="zoom <= 0.5" class="control-btn">-</button>
              <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
              <button @click="zoomIn" :disabled="zoom >= 2" class="control-btn">+</button>
              <button @click="resetZoom" class="control-btn">Reset</button>
            </div>
          </div>

          <!-- Default Preview -->
          <div v-else class="default-preview">
            <div v-if="typeof previewData === 'string' && (previewData.includes('<') || previewData.includes('&'))"
                 class="preview-text" v-html="previewData"></div>
            <div v-else class="preview-text">{{ previewData }}</div>
          </div>
        </div>
      </div>

      <!-- Export Section -->
      <div class="export-section">
        <div class="export-header">
          <h4><i class="pi pi-download"></i> Export Translation</h4>
        </div>

        <div v-if="exportResult" class="export-result">
          <div v-if="exportResult.success" class="success-message">
            <i class="pi pi-check-circle"></i>
            <span>{{ exportResult.message }}</span>
            <a v-if="exportResult.downloadUrl" :href="exportResult.downloadUrl" target="_blank" class="download-link">
              <i class="pi pi-external-link"></i> Download File
            </a>
          </div>
          <div v-else class="error-message">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ exportResult.message }}</span>
          </div>
        </div>

        <div class="export-actions">
          <button
            @click="exportTranslation"
            :disabled="!selectedLanguage || exporting"
            class="export-btn"
          >
            <i class="pi pi-download"></i>
            {{ exporting ? 'Exporting...' : 'Export Translation' }}
          </button>
        </div>
      </div>
    </div>
    <div v-else class="no-files">
      <i class="pi pi-folder-open"></i>
      <h3>No file selected for preview</h3>
      <p>Please return to the editor and select a file to preview.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import { getLanguageName } from '../utils/languages';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const selectedFile = ref<any>(null);
const showPreviewPanel = ref(false);
const loading = ref(false);
const error = ref('');
const previewData = ref('');
const previewUrl = ref('');
const previewType = ref('text');
const exportResult = ref<any>(null);
const selectedLanguage = ref('');
const exporting = ref(false);
const zoom = ref(1);
const docxRendered = ref(false);
const docxContainer = ref<HTMLElement | null>(null);

const availableLanguages = computed(() => [
  { name: 'English', code: 'en' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
  { name: 'Spanish', code: 'es' },
  { name: 'Chinese', code: 'zh' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' }
]);

const isTextType = computed(() => {
  if (!selectedFile.value?.fileName) return false;
  const textTypes = ['txt', 'json', 'xml', 'csv', 'md'];
  const fileExt = selectedFile.value.fileName.split('.').pop()?.toLowerCase();
  return fileExt && textTypes.includes(fileExt);
});
const isPdfType = computed(() => {
  if (!selectedFile.value?.fileName) return false;
  const fileExt = selectedFile.value.fileName.split('.').pop()?.toLowerCase();
  return fileExt === 'pdf';
});
const isDocumentType = computed(() => {
  if (!selectedFile.value?.fileName) return false;
  const docTypes = ['doc', 'docx'];
  const fileExt = selectedFile.value.fileName.split('.').pop()?.toLowerCase();
  return fileExt && docTypes.includes(fileExt);
});

const loadFileInfo = async () => {
  const fileId = route.query.fileId as string;
  if (!fileId) return;
  loading.value = true;
  try {
    // Get file info from translation preview endpoint
    const { data } = await axiosInstance.get(`/translation/preview/${fileId}`, {
      params: { language: 'en' } // Use English as default to get file info
    });

    selectedFile.value = {
      id: fileId,
      fileName: data.fileName || 'Unknown file',
      fileType: data.fileType,
      fileSize: data.fileSize
    };
    showPreviewPanel.value = true;

    // Set language from query params or default
    if (route.query.language) {
      selectedLanguage.value = route.query.language as string;
    } else {
      selectedLanguage.value = 'en'; // Default to English
    }

    // Load preview if language is set
    if (selectedLanguage.value) {
      loadPreview();
    }
  } catch (err: any) {
    console.error('Error loading file info:', err);
    error.value = err.message || 'Failed to load file info';
    showPreviewPanel.value = false;
  } finally {
    loading.value = false;
  }
};

const closePreviewPanel = () => {
  showPreviewPanel.value = false;
  selectedFile.value = null;
  previewData.value = '';
  previewUrl.value = '';
  exportResult.value = null;
  docxRendered.value = false;
};

const loadPreview = async () => {
  if (!selectedFile.value || !selectedLanguage.value) return;
  loading.value = true;
  error.value = '';
  previewData.value = '';
  previewUrl.value = '';
  previewType.value = 'text';

  try {
    // Get translation preview from backend
    const response = await axiosInstance.get(`/translation/preview/${selectedFile.value.id}`, {
      params: { language: selectedLanguage.value }
    });

    console.log('Preview response:', response.data);

    // Backend returns { fileType, preview }
    const { fileType, preview } = response.data;

    // Set preview type and content based on file type
    if (fileType === 'application/pdf') {
      previewType.value = 'pdf';
      previewUrl.value = `data:application/pdf;base64,${preview}`;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      previewType.value = 'docx-preview';
      previewData.value = preview;
      nextTick(() => {
        renderDocxWithPreview();
      });
    } else {
      previewType.value = 'text';
      // Check if content is HTML and render it properly
      if (typeof preview === 'string' && (preview.includes('<') || preview.includes('&'))) {
        previewData.value = preview;
      } else {
        previewData.value = preview;
      }
    }

    exportResult.value = null;

    // Auto-export if action=export is in query params
    if (route.query.action === 'export') {
      nextTick(() => {
        exportTranslation();
      });
    }
  } catch (err: any) {
    console.error('Preview error:', err);
    error.value = err.response?.data?.message || 'Failed to load translation preview';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const renderDocxWithPreview = async () => {
  if (!previewData.value || !docxContainer.value) return;
  try {
    const { renderAsync } = await import('docx-preview');
    const base64Data = previewData.value;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;
    docxContainer.value.innerHTML = '';
    await renderAsync(arrayBuffer, docxContainer.value, docxContainer.value, {
      className: 'docx-renderer',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
      useMathMLPolyfill: true,
      renderEndnotes: true,
      renderFooters: true,
      renderFootnotes: true,
      renderHeaders: true,
    });
    docxRendered.value = true;
  } catch (error) {
    docxRendered.value = false;
  }
};

const exportTranslation = async () => {
  if (!selectedFile.value || !selectedLanguage.value) return;
  exporting.value = true;
  exportResult.value = null;
  try {
    console.log('Exporting translation for file:', selectedFile.value.id, 'language:', selectedLanguage.value);
    const response = await axiosInstance.post(`/translation/export/${selectedFile.value.id}`, {
      language: selectedLanguage.value
    });

    console.log('Export response:', response.data);

    // Backend now returns { fileContent, fileName, fileType, downloadUrl }
    const { fileContent, fileName, fileType, downloadUrl } = response.data;

    // Create download link from base64 content
    const blob = new Blob([Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))], {
      type: fileType
    });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    exportResult.value = {
      success: true,
      message: `Translation exported successfully! File: ${fileName}`,
      downloadUrl: downloadUrl || url // Use GitHub URL if available, otherwise local blob URL
    };

    toast.add({
      severity: 'success',
      summary: 'Export Successful',
      detail: `Translation exported successfully! File: ${fileName}`,
      life: 3000
    });
  } catch (err: any) {
    console.error('Export error:', err);
    const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to export translation';
    exportResult.value = {
      success: false,
      message: errorMessage
    };
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: errorMessage,
      life: 5000
    });
  } finally {
    exporting.value = false;
  }
};

const zoomIn = () => { if (zoom.value < 2) zoom.value = Math.min(2, zoom.value + 0.25); };
const zoomOut = () => { if (zoom.value > 0.5) zoom.value = Math.max(0.5, zoom.value - 0.25); };
const resetZoom = () => { zoom.value = 1; };

watch(selectedLanguage, () => { if (selectedLanguage.value) loadPreview(); });
onMounted(() => { loadFileInfo(); });
</script>

<style scoped>
.translation-preview-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-content p {
  margin: 0;
  color: #6c757d;
  font-size: 1.1rem;
}

.back-btn {
  background: #6c757d;
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #5a6268;
}

/* Preview Panel Styles */
.preview-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  margin-top: 2rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.preview-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 1.2rem;
}

.close-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.language-selector {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.language-selector label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.language-dropdown {
  width: 100%;
  max-width: 300px;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;
  color: #495057;
  cursor: pointer;
}

.language-dropdown:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.preview-content {
  padding: 1.5rem;
  min-height: 400px;
  background: #f8f9fa;
}

.loading-state,
.error-state,
.no-preview-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6c757d;
  text-align: center;
}

.loading-state i,
.error-state i,
.no-preview-state i {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #007bff;
}

.error-state {
  color: #dc3545;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #0056b3;
}

.preview-data {
  width: 100%;
}

/* Text Preview Styles */
.text-preview {
  position: relative;
  height: 600px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.text-container {
  height: 100%;
  overflow: auto;
  padding: 2rem;
  background: white;
}

.text-content {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  padding: 0;
  transition: transform 0.3s ease;
  transform-origin: top left;
}

.text-zoom-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 16px;
  border-radius: 8px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* PDF Preview Styles */
.pdf-preview {
  width: 100%;
  height: 600px;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

/* Document Preview Styles */
.document-preview {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  position: relative;
  height: 600px;
}

.docx-container {
  overflow: auto;
  height: 100%;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: white;
  padding: 1rem;
}

.docx-content {
  min-height: 100px;
}

.docx-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6c757d;
}

.docx-zoom-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 16px;
  border-radius: 8px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.control-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  min-width: 40px;
}

.control-btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.4);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.zoom-level {
  color: white;
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: 4px;
}

.default-preview {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
}

.preview-text {
  white-space: pre-wrap;
  line-height: 1.5;
  color: #495057;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
}

.export-section {
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.export-header h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.export-result {
  margin-bottom: 1rem;
}

.success-message,
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
}

.success-message {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.download-link {
  margin-left: auto;
  color: #007bff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
}

.download-link:hover {
  text-decoration: underline;
  color: #0056b3;
}

.export-actions {
  display: flex;
  justify-content: center;
}

.export-btn {
  background: #28a745;
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.export-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.export-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.no-files {
  padding: 3rem;
  text-align: center;
  color: #6c757d;
}

.no-files i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #dee2e6;
}

.no-files h3 {
  margin: 0 0 0.5rem 0;
  color: #495057;
}

.no-files p {
  margin: 0;
  color: #6c757d;
}

/* Responsive */
@media (max-width: 768px) {
  .translation-preview-view {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .preview-panel {
    margin-top: 1rem;
  }

  .preview-content {
    padding: 1rem;
  }

  .text-preview,
  .document-preview {
    height: 400px;
  }
}
</style>
