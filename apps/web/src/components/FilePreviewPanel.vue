<template>
  <div class="file-preview-panel" :class="{ 'collapsed': collapsed, 'resizing': isResizing }" :style="{ width: panelWidth + 'px' }">
    <!-- Header - Hidden for PDF, DOCX, and Text files -->
    <div v-if="!isPdfType() && previewType !== 'docx-preview' && previewType !== 'text'" class="preview-header" @click="toggleCollapse">
      <div class="header-content">
        <div class="header-left">
          <i class="pi pi-eye" :class="{ 'active': !collapsed }"></i>
          <span class="header-title">File Preview</span>
          <span v-if="fileName" class="file-name">{{ fileName }}</span>
        </div>
        <div class="header-actions">
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


        <!-- File Info - Hidden for PDF, DOCX, and Text files -->
        <div v-if="!isPdfType() && previewType !== 'docx-preview' && previewType !== 'text'" class="file-info">
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

          <!-- PDF Preview with Direct Highlighting -->
          <div v-else-if="isPdfType()" class="pdf-preview" style="position: relative;">
            <!-- PDF.js Viewer instead of iframe -->
            <!-- IMPORTANT: always render the canvas when previewUrl exists to avoid deadlock
                 (canvas was previously gated by pdfJsLoaded which itself required the canvas). -->
            <div v-if="previewUrl && !pdfFailed" class="pdf-js-viewer">
              <canvas ref="pdfCanvas" class="pdf-canvas" style="width: 100%; height: 100%;"></canvas>
              <div ref="highlightContainer" class="highlight-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 20;"></div>
            </div>

            <!-- Fallback to iframe if PDF.js failed to load/render -->
            <iframe v-else-if="previewUrl && pdfFailed" :src="previewUrl" class="pdf-viewer" frameborder="0" style="width: 100%; height: 100%;"></iframe>

            <!-- Controls -->
            <div v-if="pdfJsLoaded" class="pdf-controls" style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px; z-index: 30;">
              <span style="color: white; margin: 0 10px;">{{ currentPage }} / {{ totalPages }}</span>
              <button @click="pdfZoomOut" style="background: #6366f1; color: white; border: none; padding: 5px 10px; margin: 0 5px; border-radius: 3px;">-</button>
              <span style="color: white; margin: 0 10px;">{{ Math.round(pdfZoom * 100) }}%</span>
              <button @click="pdfZoomIn" style="background: #6366f1; color: white; border: none; padding: 5px 10px; margin: 0 5px; border-radius: 3px;">+</button>
            </div>

            <div v-else-if="!previewUrl" style="text-align: center; color: #a5b4fc; padding: 2rem;">
              <i class="pi pi-file-pdf" style="font-size: 3rem; margin-bottom: 1rem;"></i>
              <p>PDF preview not available</p>
            </div>
          </div>

          <!-- DOCX Preview with docx-preview library -->
          <div v-else-if="previewType === 'docx-preview'" class="docx-preview-container">
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

          <!-- DOCX Preview -->
          <div v-else-if="previewType === 'docx'" class="docx-preview">
            <iframe v-if="previewUrl" :src="previewUrl" class="docx-viewer" frameborder="0" style="width: 100%; height: 100%;"></iframe>
            <div v-else style="text-align: center; color: #a5b4fc; padding: 2rem;">
              <i class="pi pi-file-word" style="font-size: 3rem; margin-bottom: 1rem;"></i>
              <p>DOCX preview not available</p>
            </div>
          </div>

          <!-- Google Docs Viewer for DOCX -->
          <div v-else-if="previewType === 'google-docs-viewer'" class="google-docs-preview">
            <iframe v-if="previewUrl" :src="previewUrl" class="google-docs-viewer" frameborder="0" style="width: 100%; height: 100%;"></iframe>
            <div v-else style="text-align: center; color: #a5b4fc; padding: 2rem;">
              <i class="pi pi-file-word" style="font-size: 3rem; margin-bottom: 1rem;"></i>
              <p>Google Docs Viewer not available</p>
            </div>
          </div>

          <!-- Document Preview -->
          <div v-else-if="isDocumentType()" class="document-preview">
            <div class="document-page">
              <div class="document-content-original" v-html="previewContent || 'No document content available'"></div>
            </div>
          </div>

          <!-- DOCX Preview with PDF-like functionality -->
          <div v-else-if="previewType === 'document'" class="docx-preview">
            <!-- Document container with zoom -->
            <div class="docx-viewer">
              <div class="docx-content" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center' }">
                <div class="document-content-original" v-html="previewContent || 'No document content available'"></div>
              </div>
            </div>

            <!-- Zoom and navigation controls -->
            <div class="docx-controls">
              <button @click="zoomOut" :disabled="zoom <= 0.5" class="control-btn">-</button>
              <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
              <button @click="zoomIn" :disabled="zoom >= 2" class="control-btn">+</button>
              <button @click="resetZoom" class="control-btn">Reset</button>
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
            <div class="text-container">
              <pre class="text-content" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }">{{ previewContent || 'No text content available' }}</pre>
            </div>

            <!-- Zoom controls for Text -->
            <div class="text-zoom-controls">
              <button @click="zoomOut" :disabled="zoom <= 0.5" class="control-btn">-</button>
              <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
              <button @click="zoomIn" :disabled="zoom >= 2" class="control-btn">+</button>
              <button @click="resetZoom" class="control-btn">Reset</button>
            </div>
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

        <!-- Preview Controls - Hidden for PDF, DOCX, and Text files -->
        <div v-if="!isPdfType() && previewType !== 'docx-preview' && previewType !== 'text'" class="preview-controls">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, onBeforeUnmount, nextTick } from 'vue';
import axiosInstance from '../api';

interface Props {
  fileId?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  collapsed?: boolean;
  focusedString?: {
    id: string;
    originalText: string;
    translatedText: string;
  } | null;
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
const previewData = ref<any>(null); // Store full preview data including textSegments
const zoom = ref(1);
const panelWidth = ref(500); // Default width for the panel
const isResizing = ref(false); // Flag to indicate if the panel is being resized
const startX = ref(0); // For mouse down event
const startWidth = ref(0); // For mouse down event

// PDF.js Viewer State
const pdfCanvas = ref<HTMLCanvasElement>();
const highlightContainer = ref<HTMLDivElement>();
const currentPage = ref(1);
const totalPages = ref(1);
const pdfZoom = ref(1);
const pdfDocument = ref<any>(null);
const pdfPage = ref<any>(null);
const pdfJsLoaded = ref(false);
const pdfFailed = ref(false);

// DOCX Preview State
const docxContainer = ref<HTMLDivElement>();
const docxRendered = ref(false);

// Computed
const collapsed = computed({
  get: () => props.collapsed,
  set: (value) => emit('update:collapsed', value)
});

// Highlight functionality
const highlightedText = computed(() => {
  if (!props.focusedString?.originalText) return '';
  return props.focusedString.originalText;
});

// PDF.js Viewer Functions (Crowdin-style)
async function loadPdfWithPdfJs() {
  if (!previewUrl.value) {
    console.log('Cannot load PDF: missing previewUrl');
    return;
  }

  // Wait for canvas to be available
  if (!pdfCanvas.value) {
    console.log('Canvas not ready, waiting...');
    await nextTick();
    if (!pdfCanvas.value) {
      console.log('Canvas still not available after nextTick');
      return;
    }
  }

  try {
    console.log('Loading PDF.js for direct highlighting...');

    // Load PDF.js dynamically with error handling
    let pdfjsLib: any;
    try {
      // Import PDF.js using the correct path for Vite
      pdfjsLib = await import('pdfjs-dist');
      console.log('PDF.js imported successfully');
    } catch (importError) {
      console.error('Failed to import PDF.js:', importError);
      throw new Error('PDF.js import failed');
    }

    // Set worker for browser environment
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      console.log('PDF.js worker configured');
    } catch (workerError) {
      console.error('Failed to configure PDF.js worker:', workerError);
      throw new Error('PDF.js worker configuration failed');
    }

    // Load PDF document from base64 data
    const base64Data = previewUrl.value.replace('data:application/pdf;base64,', '');
    console.log('Base64 data length:', base64Data.length);

    if (!base64Data) {
      throw new Error('No base64 data found');
    }

    const uint8Array = new Uint8Array(atob(base64Data).split('').map(char => char.charCodeAt(0)));
    console.log('Uint8Array length:', uint8Array.length);

    if (uint8Array.length === 0) {
      throw new Error('Invalid PDF data');
    }

    console.log('Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    pdfDocument.value = await loadingTask.promise;
    totalPages.value = pdfDocument.value.numPages;

    console.log(`PDF loaded successfully, pages: ${totalPages.value}`);

    // Load first page
    await loadPage(1);

    // Mark as loaded
    pdfJsLoaded.value = true;
    pdfFailed.value = false;
    console.log('PDF.js viewer ready for direct highlighting');

  } catch (error) {
    console.error('Error loading PDF with PDF.js:', error);
    console.error('Error details:', error.message);
    // Fallback to iframe - PDF.js failed
    pdfJsLoaded.value = false;
    pdfFailed.value = true;
    console.log('PDF.js failed, will use iframe fallback');
  }
}

async function loadPage(pageNum: number) {
  if (!pdfDocument.value) return;

  // Ensure canvas is available
  if (!pdfCanvas.value) {
    console.log('Canvas not ready for page load, waiting...');
    await nextTick();
    if (!pdfCanvas.value) {
      console.log('Canvas still not available for page load');
      return;
    }
  }

  try {
    console.log(`Loading page ${pageNum}...`);

    currentPage.value = pageNum;

    // Get page with better error handling
    try {
      pdfPage.value = await pdfDocument.value.getPage(pageNum);
      console.log('Page retrieved successfully');
    } catch (pageError) {
      console.error('Error getting page:', pageError);
      throw new Error(`Failed to get page ${pageNum}: ${pageError}`);
    }

    // Get viewport with error handling
    let viewport;
    try {
      viewport = pdfPage.value.getViewport({ scale: pdfZoom.value });
      console.log(`Page viewport: ${viewport.width} x ${viewport.height}`);
    } catch (viewportError) {
      console.error('Error getting viewport:', viewportError);
      throw new Error(`Failed to get viewport: ${viewportError}`);
    }

    // Set canvas size
    const canvas = pdfCanvas.value;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Clear canvas
    context?.clearRect(0, 0, canvas.width, canvas.height);

    // Render page with error handling
    try {
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await pdfPage.value.render(renderContext);
      console.log(`Page ${pageNum} rendered successfully`);
    } catch (renderError) {
      console.error('Error rendering page:', renderError);
      throw new Error(`Failed to render page: ${renderError}`);
    }

  } catch (error: any) {
    console.error('Error loading page:', error);
    console.error('Error details:', error.message);
    // Don't throw - let it continue with fallback
  }
}

function previousPage() {
  if (currentPage.value > 1) {
    loadPage(currentPage.value - 1);
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    loadPage(currentPage.value + 1);
  }
}

// Method to highlight text directly in PDF content using PDF.js - 100% ACCURATE
async function highlightTextInPdf() {
  if (!props.focusedString?.originalText || !isPdfType()) {
    console.log('Cannot highlight: missing focusedString or not PDF type');
    return;
  }

  const textToHighlight = props.focusedString.originalText;
  console.log('Highlighting text directly in PDF content:', textToHighlight);

  // Ensure PDF.js is loaded
  if (!pdfJsLoaded.value) {
    console.log('PDF.js not loaded, trying to load...');
    if (previewUrl.value) {
      await loadPdfWithPdfJs();
      if (!pdfJsLoaded.value) {
        console.log('PDF.js failed to load, cannot highlight');
        return;
      }
    } else {
      console.log('No preview URL available');
      return;
    }
  }

  // Use PDF.js for direct text highlighting - 100% ACCURATE
  if (pdfPage.value && highlightContainer.value) {
    console.log('Using PDF.js direct text highlighting - 100% ACCURATE');
    try {
      // Get text content with positions from SAME PDF.js instance
      const textContent = await pdfPage.value.getTextContent();
      const viewport = pdfPage.value.getViewport({ scale: pdfZoom.value });

      console.log(`Text content items: ${textContent.items.length}`);

      // Find matching text items
      const matchingItems = textContent.items.filter((item: any) => {
        const itemText = item.str.toLowerCase();
        const searchText = textToHighlight.toLowerCase();
        return itemText.includes(searchText) || searchText.includes(itemText);
      });

      console.log('Matching text items found:', matchingItems.length);

      if (matchingItems.length > 0) {
        // Clear existing highlights
        highlightContainer.value.innerHTML = '';

        matchingItems.forEach((item: any, index: number) => {
          const highlightDiv = document.createElement('div');
          highlightDiv.className = 'pdf-text-highlight';

          // Use EXACT coordinates from SAME PDF.js instance - 100% ACCURATE
          const x = item.transform[4];
          const y = viewport.height - item.transform[5]; // Flip Y coordinate
          const width = item.width;
          const height = item.height;

          highlightDiv.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
            height: ${height}px;
            background: rgba(255, 193, 7, 0.6);
            border: 2px solid #ffc107;
            border-radius: 2px;
            z-index: 9999;
            pointer-events: none;
            animation: highlightPulse 1.5s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(255, 193, 7, 0.4);
          `;

          highlightContainer.value!.appendChild(highlightDiv);
          console.log(`Created 100% ACCURATE highlight ${index + 1} at position:`, { x, y, width, height });
        });

        // Add CSS animation if not already added
        if (!document.querySelector('#pdf-highlight-styles')) {
          const style = document.createElement('style');
          style.id = 'pdf-highlight-styles';
          style.textContent = `
            @keyframes highlightPulse {
              0% {
                opacity: 0.6;
                transform: scale(1);
                box-shadow: 0 0 8px rgba(255, 193, 7, 0.4);
              }
              50% {
                opacity: 0.9;
                transform: scale(1.02);
                box-shadow: 0 0 12px rgba(255, 193, 7, 0.6);
              }
              100% {
                opacity: 0.6;
                transform: scale(1);
                box-shadow: 0 0 8px rgba(255, 193, 7, 0.4);
              }
            }
          `;
          document.head.appendChild(style);
        }

        // Auto-remove highlights after 4 seconds
        setTimeout(() => {
          if (highlightContainer.value) {
            const highlights = highlightContainer.value.querySelectorAll('.pdf-text-highlight');
            highlights.forEach((el: Element) => {
              if (el.parentNode) {
                (el as HTMLElement).style.opacity = '0';
                (el as HTMLElement).style.transform = 'scale(0.95)';
                setTimeout(() => el.remove(), 300);
              }
            });
          }
        }, 4000);

        console.log('100% ACCURATE highlighting completed!');
        return;
      } else {
        console.log('No matching text found in PDF content');
      }
    } catch (error) {
      console.error('Error with PDF.js direct highlighting:', error);
    }
  } else {
    console.log('PDF.js not available for direct highlighting');
  }
}

// Function to highlight text on iframe using overlay
function highlightTextOnIframe(textToHighlight: string) {
  console.log('Creating iframe overlay highlight for:', textToHighlight);

  // Find the iframe
  const iframe = document.querySelector('.pdf-viewer') as HTMLIFrameElement;
  if (!iframe) {
    console.log('Iframe not found for highlighting');
    return;
  }

  // Create overlay highlight
  const highlightDiv = document.createElement('div');
  highlightDiv.className = 'iframe-text-highlight';
  highlightDiv.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 40px;
    background: rgba(255, 193, 7, 0.8);
    border: 3px solid #ffc107;
    border-radius: 8px;
    z-index: 9999;
    pointer-events: none;
    animation: highlightPulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 20px rgba(255, 193, 7, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000;
    font-weight: bold;
    font-size: 14px;
  `;
  highlightDiv.textContent = textToHighlight.substring(0, 30) + '...';

  // Add to iframe container
  const iframeContainer = iframe.parentElement;
  if (iframeContainer) {
    iframeContainer.style.position = 'relative';
    iframeContainer.appendChild(highlightDiv);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (highlightDiv.parentNode) {
        highlightDiv.style.opacity = '0';
        highlightDiv.style.transform = 'translate(-50%, -50%) scale(0.95)';
        setTimeout(() => highlightDiv.remove(), 300);
      }
    }, 4000);

    console.log('Iframe overlay highlight created');
  } else {
    console.log('Iframe container not found');
  }
}



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

// PDF.js specific zoom functions
function pdfZoomIn() {
  pdfZoom.value = Math.min(3, pdfZoom.value + 0.25);
  if (pdfPage.value) {
    loadPage(currentPage.value);
  }
}

function pdfZoomOut() {
  pdfZoom.value = Math.max(0.5, pdfZoom.value - 0.25);
  if (pdfPage.value) {
    loadPage(currentPage.value);
  }
}

async function loadPreview() {
  if (!props.fileId) {
    return;
  }

  loading.value = true;
  error.value = '';
  previewContent.value = '';
  previewUrl.value = '';
  previewData.value = null;

  try {
    // Try to get preview content from API
    const response = await axiosInstance.get(`/files/${props.fileId}/preview`);

    // Store full response data including textSegments
    previewData.value = response.data;
    console.log('Preview data loaded:', response.data);
    console.log('File type:', response.data.fileType);
    console.log('Preview type:', response.data.previewType);
    console.log('Has content:', !!response.data.content);
    console.log('Has URL:', !!response.data.url);

    if (response.data.content) {
      previewContent.value = response.data.content;

      // Handle PDF content by creating a data URL
      if (response.data.fileType === 'application/pdf') {
        previewUrl.value = `data:application/pdf;base64,${response.data.content}`;
        console.log('PDF URL created:', previewUrl.value.substring(0, 50) + '...');
        // Load PDF with PDF.js for accurate highlighting
        nextTick(() => {
          loadPdfWithPdfJs();
        });
      }

      // Handle DOCX content by creating a data URL
      if (response.data.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        previewUrl.value = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${response.data.content}`;
        console.log('DOCX URL created:', previewUrl.value.substring(0, 50) + '...');
      }
    } else if (response.data.url) {
      previewUrl.value = response.data.url;
    }

    // Set preview type from response
    if (response.data.previewType) {
      previewType.value = response.data.previewType;

      // For Google Docs Viewer, construct URL with current domain
      if (response.data.previewType === 'google-docs-viewer') {
        const currentOrigin = window.location.origin;
        const downloadUrl = `${currentOrigin}/api/files/${props.fileId}/download`;
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}&embedded=true`;
        previewUrl.value = googleDocsUrl;
      } else if (response.data.previewType === 'office-viewer') {
        const currentOrigin = window.location.origin;
        const downloadUrl = `${currentOrigin}/api/files/${props.fileId}/download`;
        // Use the direct file URL instead of Office Online Viewer for now
        previewUrl.value = downloadUrl;
        // TODO: Re-enable Office Online Viewer when CORS is properly configured
        // const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}`;
        // previewUrl.value = officeViewerUrl;
      } else if (response.data.url) {
        previewUrl.value = response.data.url;
      }
    }

    // Log textSegments if available
    if (response.data.textSegments) {
      console.log('Text segments loaded:', response.data.textSegments.length);
      response.data.textSegments.forEach((segment: any, index: number) => {
        console.log(`Segment ${index + 1}: "${segment.text.substring(0, 50)}..."`);
      });
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load file preview';
  } finally {
    loading.value = false;
  }
}

// DOCX Preview Functions
async function renderDocxWithPreview() {
  if (!previewContent.value || !docxContainer.value) {
    console.log('Cannot render DOCX: missing content or container');
    return;
  }

  try {
    console.log('Rendering DOCX with docx-preview...');

    // Import docx-preview dynamically
    const { renderAsync } = await import('docx-preview');

    // Convert base64 to ArrayBuffer
    const base64Data = previewContent.value;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    // Render DOCX with enhanced page break support
    await renderAsync(arrayBuffer, docxContainer.value, docxContainer.value, {
      className: 'docx-renderer',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false, // Changed to false to respect page breaks
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
      useMathMLPolyfill: true,
      renderEndnotes: true,
      renderFooters: true,
      renderFootnotes: true,
      renderHeaders: true,
      // Add custom styling for page breaks
      customStyleMap: {
        'page-break-before': 'always',
        'page-break-after': 'always',
        'break-before': 'page',
        'break-after': 'page'
      }
    });

    // Add custom CSS for page breaks after rendering
    addPageBreakStyles();

    docxRendered.value = true;
    console.log('DOCX rendered successfully with docx-preview');

  } catch (error) {
    console.error('Error rendering DOCX with docx-preview:', error);
    docxRendered.value = false;
  }
}

// Function to add custom page break styles
function addPageBreakStyles() {
  if (!docxContainer.value) return;

  // Add CSS for page breaks
  const style = document.createElement('style');
  style.id = 'docx-page-break-styles';
  style.textContent = `
    .docx-renderer {
      background: white;
      color: #000;
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
    }

    .docx-renderer * {
      background: white !important;
      color: #000 !important;
    }

    /* Page break styling */
    .docx-renderer .page-break {
      page-break-before: always;
      break-before: page;
      margin-top: 2rem;
      border-top: 1px solid #e2e8f0;
      padding-top: 2rem;
      min-height: 100vh;
      display: block;
    }

    /* Force page breaks for specific elements */
    .docx-renderer h1:not(:first-child),
    .docx-renderer h2:not(:first-child) {
      page-break-before: always;
      break-before: page;
      margin-top: 2rem;
    }

    /* Document page styling */
    .docx-renderer {
      background: white;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      margin: 1rem;
    }

    /* Ensure proper page layout */
    .docx-renderer > div {
      background: white;
      min-height: 100vh;
      padding: 2rem;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  `;

  // Remove existing styles if any
  const existingStyle = document.getElementById('docx-page-break-styles');
  if (existingStyle) {
    existingStyle.remove();
  }

  document.head.appendChild(style);
}

// Watchers
watch(() => props.fileId, (newFileId) => {
  if (!collapsed.value) {
    loadPreview();
  }
});

// Watch collapsed state to load preview when expanded
watch(() => collapsed.value, (isCollapsed) => {
  if (!isCollapsed) {
    loadPreview();
  }
});

// Watch focused string changes to auto search and highlight text in PDF
watch(() => props.focusedString, (newFocusedString) => {
  console.log('focusedString changed:', newFocusedString);
  if (newFocusedString?.originalText && isPdfType()) {
    console.log('Auto searching and highlighting text:', newFocusedString.originalText);
    nextTick(() => {
      // Load PDF.js first, then highlight
      if (previewUrl.value && !pdfJsLoaded.value) {
        loadPdfWithPdfJs().then(() => {
          setTimeout(() => {
            highlightTextInPdf();
          }, 500);
        });
      } else {
        setTimeout(() => {
          highlightTextInPdf();
        }, 500);
      }
    });
  }
}, { deep: true });

// Watch preview content changes to render DOCX
watch(() => previewContent.value, (newContent) => {
  if (newContent && previewType.value === 'docx-preview') {
    nextTick(() => {
      renderDocxWithPreview();
    });
  }
});

// Watch preview type changes
watch(() => previewType.value, (newType) => {
  if (newType === 'docx-preview' && previewContent.value) {
    nextTick(() => {
      renderDocxWithPreview();
    });
  }
});

// Lifecycle
onMounted(() => {
  if (!collapsed.value) {
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
  padding: 0;
  background: white !important;
  position: relative;
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
  width: 100%;
  height: 100%;
  position: relative;
}

.pdf-js-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  overflow: auto;
}

.pdf-canvas {
  width: 100%;
  height: 100%;
  border: none;
  margin: 0;
  padding: 0;
  display: block;
}

.highlight-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.pdf-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;
}

.pdf-controls button {
  background: #6366f1;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.pdf-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pdf-controls span {
  color: white;
  font-size: 14px;
}

.pdf-viewer {
  width: 100% !important;
  height: 100% !important;
  border: none;
  border-radius: 0;
  box-shadow: none;
  transform: scale(v-bind(zoom));
  transform-origin: center;
  transition: transform 0.3s ease;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Hide browser PDF viewer controls */
.pdf-viewer::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* Additional CSS to hide browser controls */
.pdf-viewer {
  /* Hide browser's built-in controls */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* Ensure only our custom controls are visible */
.pdf-preview {
  position: relative;
  overflow: hidden;
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
  position: relative;
  height: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin: 1rem;
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
  background: white !important;
  color: #000 !important;
  font-family: 'Times New Roman', serif;
  font-size: 14px;
  line-height: 1.6;
  padding: 2rem;
  min-height: 100vh;
}

/* Preserve DOCX formatting */
.document-content-original h1,
.document-content-original h2,
.document-content-original h3,
.document-content-original h4,
.document-content-original h5,
.document-content-original h6 {
  color: #000 !important;
  margin: 1rem 0 0.5rem 0;
  font-weight: 600;
  line-height: 1.3;
}

.document-content-original h1 { font-size: 1.75rem; }
.document-content-original h2 { font-size: 1.5rem; }
.document-content-original h3 { font-size: 1.25rem; }
.document-content-original h4 { font-size: 1.1rem; }

.document-content-original p {
  margin: 0.75rem 0;
  text-align: justify;
  line-height: 1.6;
  color: #000 !important;
}

.document-content-original ul,
.document-content-original ol {
  margin: 0.75rem 0;
  padding-left: 2rem;
}

.document-content-original li {
  margin: 0.25rem 0;
  line-height: 1.5;
  color: #000 !important;
}

.document-content-original table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  border: 1px solid #e2e8f0;
  background: white;
}

.document-content-original th,
.document-content-original td {
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  text-align: left;
  vertical-align: top;
  color: #000 !important;
  background: white !important;
}

.document-content-original th {
  background: #f8fafc !important;
  font-weight: 600;
  color: #000 !important;
}

.document-content-original strong,
.document-content-original b {
  font-weight: 600;
  color: #000 !important;
}

.document-content-original em,
.document-content-original i {
  font-style: italic;
  color: #000 !important;
}

.document-content-original u {
  text-decoration: underline;
  color: #000 !important;
}

.document-content-original img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 1rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Page break styling */
.document-content-original .page-break {
  page-break-before: always;
  margin-top: 2rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 2rem;
}

/* DOCX Preview Styles - Similar to PDF */
.docx-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  width: 100%;
  height: 100%;
  position: relative;
  background: #f5f5f5;
}

.docx-viewer {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  box-shadow: none;
  transform: scale(v-bind(zoom));
  transform-origin: center;
  transition: transform 0.3s ease;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.docx-content {
  background: white;
  padding: 2rem;
  min-height: 100%;
  transition: transform 0.3s ease;
  border-radius: 8px;
}

.docx-controls {
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
  background: #6366f1;
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
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
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

/* DOCX Preview Container Styles */
.docx-preview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
  position: relative;
}

.docx-container {
  flex: 1;
  overflow: auto;
  background: #f8f9fa;
  padding: 1rem;
  position: relative;
}

.docx-content {
  background: white;
  min-height: 100%;
  transition: transform 0.3s ease;
  transform-origin: top left;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.docx-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #a5b4fc;
  gap: 1rem;
}

.docx-loading i {
  font-size: 2rem;
  color: #6366f1;
}

.docx-renderer {
  background: white;
  color: #000;
  font-family: 'Times New Roman', serif;
  line-height: 1.6;
  padding: 0;
  margin: 0;
}

/* Ensure DOCX content displays properly */
.docx-renderer * {
  background: white !important;
  color: #000 !important;
}

/* Enhanced page break styling for DOCX */
.docx-renderer .page-break {
  page-break-before: always;
  break-before: page;
  margin-top: 2rem;
  border-top: 2px solid #e2e8f0;
  padding-top: 2rem;
  min-height: 100vh;
  display: block;
  background: white !important;
}

/* Document page styling */
.docx-renderer > div {
  background: white;
  min-height: 100vh;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Force page breaks for headings */
.docx-renderer h1:not(:first-child),
.docx-renderer h2:not(:first-child) {
  page-break-before: always;
  break-before: page;
  margin-top: 2rem;
  background: white !important;
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

/* Google Docs Viewer Styles */
.google-docs-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  width: 100%;
  height: 100%;
  position: relative;
  background: #f5f5f5;
}

.google-docs-viewer {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  box-shadow: none;
  transform: scale(v-bind(zoom));
  transform-origin: center;
  transition: transform 0.3s ease;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* DOCX Zoom Controls */
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

.docx-zoom-controls .control-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  min-width: 40px;
}

.docx-zoom-controls .control-btn:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.docx-zoom-controls .control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.docx-zoom-controls .zoom-level {
  color: white;
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: 4px;
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

.text-zoom-controls .control-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  min-width: 40px;
}

.text-zoom-controls .control-btn:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.text-zoom-controls .control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.text-zoom-controls .zoom-level {
  color: white;
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: 4px;
}
</style>
