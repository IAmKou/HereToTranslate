<template>
  <div class="file-preview-panel" :class="{ 'collapsed': collapsed, 'resizing': isResizing }" :style="{ width: panelWidth + 'px' }">
    <!-- Header -->
    <div class="preview-header" @click="toggleCollapse">
      <div class="header-content">
        <div class="header-left">
          <i class="pi pi-eye" :class="{ 'active': !collapsed }"></i>
          <span class="header-title">File Preview</span>
          <span v-if="fileName" class="file-name">{{ fileName }}</span>
        </div>
        <div class="header-actions">
          <button
            v-if="!collapsed && canManagePageDifficulty"
            class="action-btn page-difficulty-btn"
            @click.stop="openPageDifficultyModal"
            title="Set page difficulty and scoring"
          >
            <i class="pi pi-chart-bar"></i>
          </button>
          <button
            class="action-btn"
            @click.stop="toggleCollapse"
            :title="collapsed ? 'Expand preview' : 'Collapse preview'"
          >
            <i class="pi" :class="collapsed ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Resize Handle -->
    <div
      v-if="!collapsed"
      class="resize-handle"
      @mousedown="startResize"
      @touchstart="startResize"
      :title="'Drag to resize preview panel'"
    >
      <div class="resize-indicator">
        <i class="pi pi-grip-vertical"></i>
      </div>
    </div>

    <!-- Preview Content -->
    <div v-if="!collapsed" class="preview-content">
      <!-- Page Difficulty Info Bar -->
      <div v-if="canManagePageDifficulty && pageDifficultyInfo.length > 0" class="page-difficulty-info">
        <div class="difficulty-summary">
          <span class="info-label">Page Difficulties:</span>
          <div class="difficulty-badges">
            <span 
              v-for="info in pageDifficultyInfo" 
              :key="info.pageNumber"
              class="difficulty-badge"
              :class="getDifficultyBadgeClass(info.difficultyLevel)"
              :title="`Page ${info.pageNumber}: ${formatDifficultyLevel(info.difficultyLevel)} - $${info.calculatedScore}`"
            >
              {{ info.pageNumber }}
            </span>
          </div>
          <span class="total-score">Total: ${{ totalDifficultyScore }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading file preview...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ error }}</span>
        <button @click="loadPreview" class="retry-btn">Retry</button>
      </div>

      <!-- No File State -->
      <div v-else-if="!fileId" class="no-file-state">
        <i class="pi pi-file"></i>
        <span>No file selected for preview</span>
      </div>

      <!-- File Preview -->
      <div v-else class="file-preview">
        <!-- Debug Info -->
        <div style="background: rgba(255,0,0,0.1); color: white; padding: 5px; font-size: 10px; border: 1px solid red;">
          Debug: fileId={{ fileId }}, content={{ !!previewContent }}, url={{ !!previewUrl }},
          isText={{ isTextType() }}, isImage={{ isImageType() }}, isDoc={{ isDocumentType() }}
          <button @click="loadPreview" style="margin-left: 10px; background: yellow; color: black; border: none; padding: 2px 5px;">Test Load</button>
          <button @click="testMammoth" style="margin-left: 5px; background: orange; color: black; border: none; padding: 2px 5px;">Test Mammoth</button>
        </div>

        <!-- File Info -->
        <div class="file-info">
          <div class="file-meta">
            <span class="file-type">{{ getFileType() }}</span>
            <span class="file-size" v-if="fileSize">{{ formatFileSize(fileSize) }}</span>
          </div>
          <div class="file-path" v-if="filePath">{{ filePath }}</div>
        </div>

        <!-- Preview Container -->
        <div class="preview-container document-viewer-wrapper">
          <!-- Office Online Viewer Preview -->
          <div v-if="previewType === 'office-viewer'" class="office-viewer-preview">
            <iframe v-if="previewUrl" :src="previewUrl" class="office-viewer" frameborder="0" width="100%" height="600px"></iframe>
            <div v-else style="text-align: center; color: #a5b4fc; padding: 2rem;">
              <i class="pi pi-file-word" style="font-size: 3rem; margin-bottom: 1rem;"></i>
              <p>Office Online Viewer not available</p>
            </div>
          </div>

          <!-- PDF Preview -->
          <div v-else-if="isPdfType()" class="pdf-preview">
            <iframe v-if="previewUrl" :src="previewUrl" class="pdf-viewer" frameborder="0"></iframe>
            <div v-else style="text-align: center; color: #a5b4fc; padding: 2rem;">
              <i class="pi pi-file-pdf" style="font-size: 3rem; margin-bottom: 1rem;"></i>
              <p>PDF preview not available</p>
            </div>
          </div>

          <!-- Document Preview -->
          <div v-else-if="isDocumentType()" class="document-preview">
            <div class="document-page">
              <div class="document-content-original" v-html="previewContent || 'No document content available'"></div>
            </div>
          </div>

          <!-- Image Preview -->
          <div v-else-if="isImageType()" class="image-preview">
            <img v-if="previewUrl" :src="previewUrl" :alt="fileName" class="preview-image" />
            <div v-else style="text-align: center; color: #a5b4fc; padding: 2rem;">
              <i class="pi pi-image" style="font-size: 3rem; margin-bottom: 1rem;"></i>
              <p>Image preview not available</p>
            </div>
          </div>

          <!-- Text Preview -->
          <div v-else-if="isTextType()" class="text-preview">
            <pre class="text-content">{{ previewContent || 'No text content available' }}</pre>
          </div>

          <!-- HTML Preview -->
          <div v-else-if="isHtmlType()" class="html-preview">
            <div class="html-content" v-html="previewContent || 'No HTML content available'"></div>
          </div>

          <!-- Default Preview -->
          <div v-else class="default-preview">
            <i class="pi pi-file" style="font-size: 3rem; color: #6366f1;"></i>
            <span>Preview not available for this file type</span>
            <div style="margin-top: 1rem; font-size: 0.8rem; color: #64748b;">
              File: {{ fileName || 'Unknown' }}<br>
              Type: {{ getFileType() }}<br>
              Size: {{ fileSize ? formatFileSize(fileSize) : 'Unknown' }}
            </div>
          </div>
        </div>

        <!-- Preview Controls -->
        <div class="preview-controls">
          <div class="zoom-controls">
            <button @click="zoomOut" class="zoom-btn" :disabled="zoom <= 0.5">
              <i class="pi pi-minus"></i>
            </button>
            <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
            <button @click="zoomIn" class="zoom-btn" :disabled="zoom >= 2">
              <i class="pi pi-plus"></i>
            </button>
          </div>
          <button @click="resetZoom" class="reset-zoom-btn">Reset</button>
        </div>
      </div>
    </div>

    <!-- Page Difficulty Modal -->
    <PageDifficultyModal
      :is-open="showPageDifficultyModal"
      :file-id="props.fileId || ''"
      :file-name="props.fileName || ''"
      :total-pages="totalPages"
      :initial-page="currentPageForDifficulty"
      :project-id="props.projectId || ''"
      :branch-id="props.branchId || ''"
      @close="closePageDifficultyModal"
      @difficulty-assigned="onDifficultyAssigned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue';
import axiosInstance from '../api';
import PageDifficultyModal from './PageDifficultyModal.vue';

interface Props {
  fileId?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  collapsed?: boolean;
  projectId?: string;
  branchId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false
});

const emit = defineEmits<{
  'update:collapsed': [value: boolean];
}>();

// State
const loading = ref(false);
const error = ref('');
const previewContent = ref('');
const previewUrl = ref('');
const previewType = ref('text');
const zoom = ref(1);
const panelWidth = ref(500); // Default width for the panel
const isResizing = ref(false); // Flag to indicate if the panel is being resized
const startX = ref(0); // For mouse down event
const startWidth = ref(0); // For mouse down event

// Page Difficulty State
const showPageDifficultyModal = ref(false);
const totalPages = ref(1);
const currentPageForDifficulty = ref(1);
const pageDifficultyInfo = ref<Array<{
  pageNumber: number;
  difficultyLevel: string;
  calculatedScore: number;
}>>([]);

// Computed
const collapsed = computed({
  get: () => props.collapsed,
  set: (value) => emit('update:collapsed', value)
});

const canManagePageDifficulty = computed(() => {
  return props.fileId && props.projectId && props.branchId && 
         (previewType.value === 'pdf' || previewType.value === 'document');
});

const totalDifficultyScore = computed(() => {
  return pageDifficultyInfo.value.reduce((total, info) => total + info.calculatedScore, 0).toFixed(2);
});

// Methods
function toggleCollapse() {
  collapsed.value = !collapsed.value;
}

function getFileType(): string {
  if (!props.fileName) return 'Unknown';
  const ext = props.fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'Unknown';

  const typeMap: Record<string, string> = {
    'doc': 'Word Document',
    'docx': 'Word Document',
    'pdf': 'PDF Document',
    'txt': 'Text File',
    'csv': 'CSV File',
    'xls': 'Excel Spreadsheet',
    'xlsx': 'Excel Spreadsheet',
    'ppt': 'PowerPoint Presentation',
    'pptx': 'PowerPoint Presentation',
    'jpg': 'JPEG Image',
    'jpeg': 'JPEG Image',
    'png': 'PNG Image',
    'gif': 'GIF Image',
    'svg': 'SVG Image',
    'html': 'HTML File',
    'xml': 'XML File',
    'json': 'JSON File'
  };

  return typeMap[ext] || `${ext.toUpperCase()} File`;
}

function isDocumentType(): boolean {
  if (!props.fileName) return false;
  const ext = props.fileName.split('.').pop()?.toLowerCase();
  return ['doc', 'docx', 'rtf'].includes(ext || '');
}

function isOfficeViewerType(): boolean {
  return previewType.value === 'office-viewer';
}

function isImageType(): boolean {
  if (!props.fileName) return false;
  const ext = props.fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '');
}

function isTextType(): boolean {
  if (!props.fileName) return false;
  const ext = props.fileName.split('.').pop()?.toLowerCase();
  return ['txt', 'csv', 'json', 'md'].includes(ext || '');
}

function isPdfType(): boolean {
  if (!props.fileName) return false;
  const ext = props.fileName.split('.').pop()?.toLowerCase();
  return ['pdf'].includes(ext || '');
}

function isHtmlType(): boolean {
  if (!props.fileName) return false;
  const ext = props.fileName.split('.').pop()?.toLowerCase();
  return ['html'].includes(ext || '');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function zoomIn() {
  if (zoom.value < 2) {
    zoom.value = Math.min(2, zoom.value + 0.25);
  }
}

function zoomOut() {
  if (zoom.value > 0.5) {
    zoom.value = Math.max(0.5, zoom.value - 0.25);
  }
}

function resetZoom() {
  zoom.value = 1;
}

async function loadPreview() {
  console.log('FilePreviewPanel: loadPreview called with fileId:', props.fileId);
  if (!props.fileId) {
    console.log('FilePreviewPanel: No fileId provided, showing test content');
    // Show test content for debugging
    previewContent.value = `Test File Content
This is a test file for debugging the preview functionality.

File ID: ${props.fileId || 'None'}
File Name: ${props.fileName || 'Unknown'}
File Path: ${props.filePath || 'Unknown'}
File Size: ${props.fileSize || 'Unknown'}

This content is shown when no real file ID is provided.
You can use this to test the preview panel layout and functionality.`;
    return;
  }

  loading.value = true;
  error.value = '';
  previewContent.value = '';
  previewUrl.value = '';

  try {
    // Try to get preview content from API
    console.log('FilePreviewPanel: Making API call to /files/' + props.fileId + '/preview');
    const response = await axiosInstance.get(`/files/${props.fileId}/preview`);
    console.log('FilePreviewPanel: API response:', response.data);

    if (response.data.content) {
      previewContent.value = response.data.content;
      console.log('FilePreviewPanel: Set preview content, length:', previewContent.value.length);
      console.log('FilePreviewPanel: Preview content preview:', previewContent.value.substring(0, 100));
    } else if (response.data.url) {
      previewUrl.value = response.data.url;
      console.log('FilePreviewPanel: Set preview URL:', previewUrl.value.substring(0, 50) + '...');
    } else {
      console.log('FilePreviewPanel: No content or URL in response');
    }

    // Set preview type from response
    if (response.data.previewType) {
      previewType.value = response.data.previewType;
      console.log('FilePreviewPanel: Set preview type:', previewType.value);

      // For Office Online Viewer, replace placeholder URL with actual domain
      if (response.data.previewType === 'office-viewer' && response.data.url) {
        const actualUrl = response.data.url.replace('https://your-domain.com', window.location.origin);
        previewUrl.value = actualUrl;
        console.log('FilePreviewPanel: Updated Office Online Viewer URL:', actualUrl);
      }
    }

    console.log('FilePreviewPanel: Final state - content:', !!previewContent.value, 'url:', !!previewUrl.value, 'type:', previewType.value);
  } catch (err: any) {
    error.value = err.message || 'Failed to load file preview';
    console.error('FilePreviewPanel: Error loading file preview:', err);
    console.error('FilePreviewPanel: Error response:', err.response?.data);

    // Show error content for debugging
    previewContent.value = `Error loading file preview:
File ID: ${props.fileId}
Error: ${err.message || 'Unknown error'}

This is error content shown when the API call fails.
Check the browser console for more details.`;
  } finally {
    loading.value = false;
  }
}

async function testMammoth() {
  console.log('=== TESTING MAMMOTH CONVERSION ===');
  console.log('File ID:', props.fileId);
  console.log('File Name:', props.fileName);

  if (!props.fileId) {
    console.log('No file ID provided');
    return;
  }

  try {
    console.log('Making API call to test mammoth...');
    const response = await axiosInstance.get(`/files/${props.fileId}/preview`);
    console.log('API Response:', response.data);
    console.log('Response type:', typeof response.data);
    console.log('Has content:', !!response.data.content);
    console.log('Content length:', response.data.content?.length);
    console.log('Preview type:', response.data.previewType);

    if (response.data.content) {
      console.log('Content preview (first 200 chars):', response.data.content.substring(0, 200));
      previewContent.value = response.data.content;
      console.log('Set preview content successfully');
    } else {
      console.log('No content in response');
    }
  } catch (error) {
    console.error('Test mammoth failed:', error);
    console.error('Error response:', error.response?.data);
  }
}

// Page Difficulty Methods
function openPageDifficultyModal() {
  if (!props.fileId || !props.projectId || !props.branchId) {
    console.error('Missing required props for page difficulty modal');
    return;
  }
  
  // Try to determine total pages from preview content
  // This is a simple heuristic - in a real implementation you might want to
  // call an API to get the actual page count
  if (previewType.value === 'pdf') {
    // For PDF, you might extract page count from the preview
    totalPages.value = extractPageCountFromPdf();
  } else {
    // For other document types, default to 1 page or implement page detection
    totalPages.value = 1;
  }
  
  currentPageForDifficulty.value = 1;
  showPageDifficultyModal.value = true;
}

function closePageDifficultyModal() {
  showPageDifficultyModal.value = false;
}

function onDifficultyAssigned(pageNumber: number, difficulty: string, score: number) {
  console.log(`Page ${pageNumber} assigned difficulty: ${difficulty} with score: ${score}`);
  
  // Update local page difficulty info
  const existingIndex = pageDifficultyInfo.value.findIndex(info => info.pageNumber === pageNumber);
  if (existingIndex >= 0) {
    pageDifficultyInfo.value[existingIndex] = { pageNumber, difficultyLevel: difficulty, calculatedScore: score };
  } else {
    pageDifficultyInfo.value.push({ pageNumber, difficultyLevel: difficulty, calculatedScore: score });
  }
  
  // Sort by page number
  pageDifficultyInfo.value.sort((a, b) => a.pageNumber - b.pageNumber);
}

function extractPageCountFromPdf(): number {
  // This is a placeholder - in a real implementation, you would
  // either get this from the API response or parse it from the PDF content
  // For now, return a default value
  return 10; // Default to 10 pages
}

function formatDifficultyLevel(level: string): string {
  return level.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

function getDifficultyBadgeClass(level: string): string {
  const baseClass = 'difficulty-';
  switch (level) {
    case 'simple': return baseClass + 'simple';
    case 'medium': return baseClass + 'medium';
    case 'complex': return baseClass + 'complex';
    case 'very_complex': return baseClass + 'very-complex';
    default: return baseClass + 'simple';
  }
}

async function loadPageDifficultyInfo() {
  if (!props.fileId) return;
  
  try {
    const response = await axiosInstance.get(`/page-difficulty/file/${props.fileId}`);
    pageDifficultyInfo.value = response.data.map((item: any) => ({
      pageNumber: item.pageNumber,
      difficultyLevel: item.difficultyLevel,
      calculatedScore: parseFloat(item.calculatedScore)
    }));
  } catch (error) {
    console.error('Error loading page difficulty info:', error);
    // Don't show error to user as this is optional information
  }
}

// Watchers
watch(() => props.fileId, (newFileId) => {
  console.log('FilePreviewPanel: fileId changed to:', newFileId);
  if (!collapsed.value) {
    loadPreview();
    loadPageDifficultyInfo();
  }
});

// Watch collapsed state to load preview when expanded
watch(() => collapsed.value, (isCollapsed) => {
  console.log('FilePreviewPanel: collapsed state changed to:', isCollapsed);
  if (!isCollapsed) {
    console.log('FilePreviewPanel: Panel expanded, loading preview for fileId:', props.fileId);
    loadPreview();
    loadPageDifficultyInfo();
  }
});

// Watch all props for debugging
watch(() => props, (newProps) => {
  console.log('FilePreviewPanel: All props changed:', newProps);
}, { deep: true });

// Lifecycle
onMounted(() => {
  console.log('FilePreviewPanel: Component mounted, fileId:', props.fileId, 'collapsed:', collapsed.value);
  if (!collapsed.value) {
    console.log('FilePreviewPanel: Loading preview on mount');
    loadPreview();
  }
});

onBeforeUnmount(() => {
  // Cleanup resize event listeners
  if (isResizing.value) {
    stopResize();
  }
});

// Resize logic
function startResize(event: MouseEvent | TouchEvent) {
  if (isResizing.value) return;
  isResizing.value = true;

  if ('clientX' in event) {
    startX.value = event.clientX;
  } else if (event.touches && event.touches[0]) {
    startX.value = event.touches[0].clientX;
  }

  startWidth.value = panelWidth.value;

  document.addEventListener('mousemove', handleResize);
  document.addEventListener('touchmove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.addEventListener('touchend', stopResize);
}

function handleResize(event: MouseEvent | TouchEvent) {
  if (!isResizing.value) return;

  let currentX = 0;
  if ('clientX' in event) {
    currentX = event.clientX;
  } else if (event.touches && event.touches[0]) {
    currentX = event.touches[0].clientX;
  }

  const delta = currentX - startX.value;
  const newWidth = startWidth.value - delta; // Subtract because we're dragging left

  // Min 300px, Max 800px
  panelWidth.value = Math.max(300, Math.min(800, newWidth));
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('touchmove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.removeEventListener('touchend', stopResize);
}
</script>

<style scoped>
.file-preview-panel {
  background: #1e293b;
  border-left: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 300px;
  max-width: 800px;
  transition: all 0.3s ease;
  position: relative;
}

.file-preview-panel.collapsed {
  min-width: 50px;
  max-width: 50px;
}

/* Resize Handle */
.resize-handle {
  position: absolute;
  left: -5px;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: col-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background-color 0.2s ease;
}

.resize-handle:hover {
  background: rgba(99, 102, 241, 0.1);
}

.resize-handle:active {
  background: rgba(99, 102, 241, 0.2);
}

.resize-indicator {
  width: 4px;
  height: 40px;
  background: rgba(99, 102, 241, 0.5);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.resize-handle:hover .resize-indicator {
  background: rgba(99, 102, 241, 0.8);
  width: 6px;
}

.resize-indicator i {
  color: rgba(99, 102, 241, 0.8);
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.resize-handle:hover .resize-indicator i {
  opacity: 1;
}

/* When resizing, show visual feedback */
.file-preview-panel.resizing {
  user-select: none;
  transition: none;
}

.file-preview-panel.resizing .resize-indicator {
  background: rgba(99, 102, 241, 1);
  width: 6px;
}

.preview-header {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  cursor: pointer;
  padding: 0.75rem 1rem;
  transition: all 0.3s ease;
}

.preview-header:hover {
  background: linear-gradient(135deg, #475569 0%, #64748b 100%);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.header-left i {
  color: #6366f1;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.header-left i.active {
  color: #10b981;
}

.header-title {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.file-name {
  color: #a5b4fc;
  font-size: 0.8rem;
  margin-left: 0.5rem;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.action-btn {
  background: transparent;
  border: none;
  color: #a5b4fc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
}

.page-difficulty-btn {
  color: #a855f7 !important;
}

.page-difficulty-btn:hover {
  background: rgba(168, 85, 247, 0.2) !important;
  color: #c084fc !important;
}

.page-difficulty-info {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
}

.difficulty-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.info-label {
  color: #64748b;
  font-weight: 500;
}

.difficulty-badges {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.difficulty-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.difficulty-simple {
  background: #dcfce7;
  color: #166534;
}

.difficulty-medium {
  background: #fef3c7;
  color: #92400e;
}

.difficulty-complex {
  background: #fed7aa;
  color: #c2410c;
}

.difficulty-very-complex {
  background: #fecaca;
  color: #dc2626;
}

.total-score {
  color: #059669;
  font-weight: 600;
  margin-left: auto;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-state,
.error-state,
.no-file-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #a5b4fc;
  gap: 1rem;
}

.loading-state i {
  font-size: 2rem;
  color: #6366f1;
}

.error-state i {
  font-size: 2rem;
  color: #ef4444;
}

.no-file-state i {
  font-size: 2rem;
  color: #6366f1;
}

.retry-btn {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.file-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-info {
  padding: 1rem;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  background: rgba(30, 41, 59, 0.5);
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.file-type {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.file-size {
  color: #a5b4fc;
  font-size: 0.75rem;
}

.file-path {
  color: #64748b;
  font-size: 0.7rem;
  font-family: monospace;
  word-break: break-all;
}

.preview-container {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  background: white !important;
}

.document-viewer-wrapper {
  background: white !important;
}

.document-viewer-wrapper * {
  background: white !important;
  color: #1f2937 !important;
}

.document-preview {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100%;
  background: white !important;
}

.document-page {
  background: white !important;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 2rem;
  max-width: 100%;
  transform: scale(v-bind(zoom));
  transform-origin: top center;
  transition: transform 0.3s ease;
}

.document-content {
  color: #1f2937 !important;
  line-height: 1.6;
  font-family: 'Times New Roman', serif;
  background: white !important;
}

/* Force white background for all document content */
.preview-container,
.preview-container *,
.document-preview,
.document-preview *,
.document-page,
.document-page *,
.document-content,
.document-content * {
  background: white !important;
  color: #1f2937 !important;
}

/* Additional force rules for document viewer */
.file-preview-panel .preview-container,
.file-preview-panel .preview-container *,
.file-preview-panel .document-preview,
.file-preview-panel .document-preview *,
.file-preview-panel .document-page,
.file-preview-panel .document-page *,
.file-preview-panel .document-content,
.file-preview-panel .document-content * {
  background: white !important;
  color: #1f2937 !important;
}

/* Force white background for word document original */
.word-document-original,
.word-document-original *,
.document-header-original,
.document-header-original *,
.document-content-original,
.document-content-original * {
  background: white !important;
  color: #000 !important;
}

/* Override any dark theme styles */
.file-preview-panel .preview-container,
.file-preview-panel .preview-container * {
  background: white !important;
  color: #000 !important;
}

/* Word Document Preview Styles */
.word-document-preview {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  margin: 1rem;
  transform: scale(v-bind(zoom));
  transform-origin: top center;
  transition: transform 0.3s ease;
}

.document-header {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.document-header h2 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
}

.document-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-type {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.preview-note {
  color: #64748b;
  font-size: 0.8rem;
  font-style: italic;
}

.document-content {
  padding: 2rem;
  background: white;
  color: #1f2937;
  line-height: 1.6;
  font-family: 'Times New Roman', serif;
  font-size: 1rem;
}

/* Word document content styling */
.document-content h1,
.document-content h2,
.document-content h3,
.document-content h4,
.document-content h5,
.document-content h6 {
  color: #1f2937;
  margin: 1.5rem 0 0.75rem 0;
  font-weight: 600;
  line-height: 1.3;
}

.document-content h1 { font-size: 1.75rem; }
.document-content h2 { font-size: 1.5rem; }
.document-content h3 { font-size: 1.25rem; }
.document-content h4 { font-size: 1.1rem; }

.document-content p {
  margin: 0.75rem 0;
  text-align: justify;
  line-height: 1.6;
}

.document-content ul,
.document-content ol {
  margin: 0.75rem 0;
  padding-left: 2rem;
}

.document-content li {
  margin: 0.25rem 0;
  line-height: 1.5;
}

.document-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  border: 1px solid #e2e8f0;
  background: white;
}

.document-content th,
.document-content td {
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  text-align: left;
  vertical-align: top;
}

.document-content th {
  background: #f8fafc;
  font-weight: 600;
  color: #1f2937;
}

.document-content td {
  color: #374151;
}

.document-content blockquote {
  border-left: 4px solid #6366f1;
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: #64748b;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 0 6px 6px 0;
}

.document-content code {
  background: #f1f5f9;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #dc2626;
}

.document-content pre {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  margin: 1rem 0;
}

.document-content pre code {
  background: none;
  padding: 0;
  color: #1f2937;
}

/* Word document specific styling */
.document-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 1rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.document-content strong,
.document-content b {
  font-weight: 600;
  color: #1f2937;
}

.document-content em,
.document-content i {
  font-style: italic;
  color: #374151;
}

.document-content u {
  text-decoration: underline;
  color: #1f2937;
}

.document-content sup {
  vertical-align: super;
  font-size: 0.75em;
}

.document-content sub {
  vertical-align: sub;
  font-size: 0.75em;
}

/* Page break styling */
.document-content .page-break {
  page-break-before: always;
  margin-top: 2rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 2rem;
}

/* Unsupported format styling */
.unsupported-format {
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
}

.unsupported-format h3 {
  margin: 1rem 0;
  color: #1f2937;
  font-size: 1.25rem;
}

.unsupported-format p {
  margin: 0.5rem 0;
  line-height: 1.5;
}

/* Text content styling for extracted text */
.text-content {
  background: white !important;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2937 !important;
  margin: 0;
}

/* Document placeholder styling */
.document-placeholder {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.placeholder-icon {
  margin-bottom: 1.5rem;
}

.document-placeholder h3 {
  color: #1f2937;
  font-size: 1.5rem;
  margin: 1rem 0;
  font-weight: 600;
}

.document-placeholder p {
  margin: 0.75rem 0;
  line-height: 1.6;
  color: #64748b;
}

.document-features {
  text-align: left;
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.document-features h4 {
  color: #1f2937;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.document-features ul {
  margin: 0;
  padding-left: 1.5rem;
}

.document-features li {
  margin: 0.5rem 0;
  color: #64748b;
  line-height: 1.5;
}

.document-actions {
  margin-top: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
  border: 1px solid #bae6fd;
}

.document-actions p {
  margin: 0.5rem 0;
  color: #0c4a6e;
}

.document-actions strong {
  color: #0369a1;
}

.pdf-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transform: scale(v-bind(zoom));
  transform-origin: center;
  transition: transform 0.3s ease;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transform: scale(v-bind(zoom));
  transform-origin: center;
  transition: transform 0.3s ease;
}

.text-preview {
  background: white !important;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.text-content {
  background: white !important;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2937 !important;
  margin: 0;
}

.html-preview {
  background: white !important;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.html-content {
  color: #1f2937 !important;
  font-family: 'Times New Roman', serif;
  font-size: 1rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  background: white !important;
}

.default-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #a5b4fc;
  text-align: center;
  padding: 2rem;
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: rgba(30, 41, 59, 0.5);
  border-top: 1px solid rgba(99, 102, 241, 0.1);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zoom-btn {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.zoom-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.3);
  color: #c7d2fe;
}

.zoom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-level {
  color: #a5b4fc;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.reset-zoom-btn {
  background: transparent;
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.3s ease;
}

.reset-zoom-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
}

/* Scrollbar styles */
.preview-container::-webkit-scrollbar {
  width: 6px;
}

.preview-container::-webkit-scrollbar-track {
  background: #1e293b;
}

.preview-container::-webkit-scrollbar-thumb {
  background: #64748b;
  border-radius: 3px;
}

.preview-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive */
@media (max-width: 768px) {
  .file-preview-panel {
    min-width: 250px;
    max-width: 350px;
  }

  .file-preview-panel.collapsed {
    min-width: 40px;
    max-width: 40px;
  }

  .preview-header {
    padding: 0.5rem;
  }

  .header-title {
    font-size: 0.8rem;
  }

  .file-name {
    display: none;
  }
}

/* Original Document Styling - Looks exactly like original file */
.word-document-original {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  margin: 1rem;
  transform: scale(v-bind(zoom));
  transform-origin: top center;
  transition: transform 0.3s ease;
  font-family: inherit;
  line-height: inherit;
  color: inherit;
}

.document-header-original {
  background: #f8f9fa;
  padding: 1rem 2rem;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.document-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #495057;
}

.document-type {
  font-size: 0.9rem;
  color: #6c757d;
  font-style: italic;
}

.document-content-original {
  padding: 2rem;
  background: white !important;
  color: #000 !important;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  text-align: inherit;
  min-height: 100vh;
}

/* Preserve original Word formatting - DO NOT OVERRIDE */
.document-content-original h1,
.document-content-original h2,
.document-content-original h3,
.document-content-original h4,
.document-content-original h5,
.document-content-original h6 {
  color: inherit;
  margin: inherit;
  font-weight: inherit;
  font-family: inherit;
  background: inherit;
  font-size: inherit;
  line-height: inherit;
  text-align: inherit;
}

.document-content-original p {
  margin: inherit;
  text-align: inherit;
  line-height: inherit;
  color: inherit;
  background: inherit;
  font-family: inherit;
  font-size: inherit;
}

.document-content-original ul,
.document-content-original ol {
  margin: inherit;
  padding: inherit;
  background: inherit;
}

.document-content-original li {
  margin: inherit;
  line-height: inherit;
  color: inherit;
  background: inherit;
  font-family: inherit;
  font-size: inherit;
}

.document-content-original table {
  width: inherit;
  border-collapse: inherit;
  margin: inherit;
  border: inherit;
  background: inherit;
}

.document-content-original th,
.document-content-original td {
  border: inherit;
  padding: inherit;
  text-align: inherit;
  vertical-align: inherit;
  color: inherit;
  background: inherit;
  font-family: inherit;
  font-size: inherit;
}

.document-content-original th {
  background: inherit;
  font-weight: inherit;
  color: inherit;
}

.document-content-original strong,
.document-content-original b {
  font-weight: inherit;
  color: inherit;
  background: inherit;
}

.document-content-original em,
.document-content-original i {
  font-style: inherit;
  color: inherit;
  background: inherit;
}

.document-content-original u {
  text-decoration: inherit;
  color: inherit;
  background: inherit;
}

.document-content-original img {
  max-width: inherit;
  height: inherit;
  margin: inherit;
  border: inherit;
  background: inherit;
}

/* Page break styling */
.document-content-original .page-break {
  page-break-before: inherit;
  margin-top: inherit;
  border-top: inherit;
  padding-top: inherit;
}

/* MOST AGGRESSIVE OVERRIDE - Override everything including parent styles */
.file-preview-panel,
.file-preview-panel *,
.file-preview-panel .preview-container,
.file-preview-panel .preview-container *,
.file-preview-panel .document-preview,
.file-preview-panel .document-preview *,
.file-preview-panel .document-page,
.file-preview-panel .document-page *,
.file-preview-panel .document-content,
.file-preview-panel .document-content *,
.file-preview-panel .document-content-original,
.file-preview-panel .document-content-original *,
.file-preview-panel .word-document-original,
.file-preview-panel .word-document-original *,
.file-preview-panel .document-header-original,
.file-preview-panel .document-header-original * {
  background: white !important;
  background-color: white !important;
  color: #000 !important;
  color: black !important;
}

/* Override editor-layout background specifically */
.editor-layout .file-preview-panel,
.editor-layout .file-preview-panel *,
.editor-layout .file-preview-panel .preview-container,
.editor-layout .file-preview-panel .preview-container *,
.editor-layout .file-preview-panel .document-preview,
.editor-layout .file-preview-panel .document-preview *,
.editor-layout .file-preview-panel .document-page,
.editor-layout .file-preview-panel .document-page *,
.editor-layout .file-preview-panel .document-content,
.editor-layout .file-preview-panel .document-content *,
.editor-layout .file-preview-panel .document-content-original,
.editor-layout .file-preview-panel .document-content-original * {
  background: white !important;
  background-color: white !important;
  color: #000 !important;
  color: black !important;
}

/* Override translation-editor-page and editor-layout combined */
.translation-editor-page .editor-layout .file-preview-panel,
.translation-editor-page .editor-layout .file-preview-panel *,
.translation-editor-page .editor-layout .file-preview-panel .preview-container,
.translation-editor-page .editor-layout .file-preview-panel .preview-container *,
.translation-editor-page .editor-layout .file-preview-panel .document-preview,
.translation-editor-page .editor-layout .file-preview-panel .document-preview *,
.translation-editor-page .editor-layout .file-preview-panel .document-page,
.translation-editor-page .editor-layout .file-preview-panel .document-page *,
.translation-editor-page .editor-layout .file-preview-panel .document-content,
.translation-editor-page .editor-layout .file-preview-panel .document-content *,
.translation-editor-page .editor-layout .file-preview-panel .document-content-original,
.translation-editor-page .editor-layout .file-preview-panel .document-content-original * {
  background: white !important;
  background-color: white !important;
  color: #000 !important;
  color: black !important;
}
</style>
