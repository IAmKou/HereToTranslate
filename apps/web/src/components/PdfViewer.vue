<template>
  <div class="pdf-viewer-container">
    <div ref="pdfContainer" class="pdf-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface Props {
  src: string;
  highlightedText?: string;
  highlightColor?: string;
  highlightOpacity?: number;
}

const props = withDefaults(defineProps<Props>(), {
  highlightColor: '#fbbf24',
  highlightOpacity: 0.7
});

const pdfContainer = ref<HTMLDivElement>();
let pdfDoc: any = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending: number | null = null;
let scale = 1.5;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let highlights: Array<{
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}> = [];

// Load PDF
async function loadPDF() {
  try {
    const loadingTask = pdfjsLib.getDocument(props.src);
    pdfDoc = await loadingTask.promise;

    // Render first page
    renderPage(pageNum);

    // Listen for messages from parent
    window.addEventListener('message', handleMessage);
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
}

// Render a specific page
async function renderPage(num: number) {
  pageRendering = true;

  try {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });

    // Prepare canvas
    if (!canvas) {
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
      pdfContainer.value?.appendChild(canvas);
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page
    const renderContext = {
      canvasContext: ctx!,
      viewport: viewport
    };

    await page.render(renderContext).promise;
    pageRendering = false;

    // Render highlights
    renderHighlights();

    if (pageNumPending !== null) {
      renderPage(pageNumPending);
      pageNumPending = null;
    }
  } catch (error) {
    console.error('Error rendering page:', error);
    pageRendering = false;
  }
}

// Find text in PDF and highlight it
async function highlightText(searchText: string) {
  if (!pdfDoc || !searchText) return;

  try {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale });

    // Clear existing highlights
    highlights = [];

    // Search for text in the page
    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i];
      const text = item.str;

      if (text.toLowerCase().includes(searchText.toLowerCase())) {
        // Calculate position
        const transform = item.transform;
        const x = transform[4];
        const y = viewport.height - transform[5];
        const width = item.width * scale;
        const height = item.height * scale;

        highlights.push({
          x: x,
          y: y,
          width: width,
          height: height,
          text: text
        });
      }
    }

    // Re-render highlights
    renderHighlights();
  } catch (error) {
    console.error('Error highlighting text:', error);
  }
}

// Render highlights on canvas
function renderHighlights() {
  if (!ctx || !canvas) return;

  // Clear existing highlights by re-rendering the page
  renderPage(pageNum);

  // Draw highlights
  ctx.fillStyle = props.highlightColor;
  ctx.globalAlpha = props.highlightOpacity;

  highlights.forEach(highlight => {
    ctx?.fillRect(highlight.x, highlight.y, highlight.width, highlight.height);
  });

  ctx.globalAlpha = 1;
}

// Clear all highlights
function clearHighlights() {
  highlights = [];
  renderPage(pageNum);
}

// Handle messages from parent
function handleMessage(event: MessageEvent) {
  if (event.data.type === 'highlight-text') {
    highlightText(event.data.text);
  } else if (event.data.type === 'clear-highlights') {
    clearHighlights();
  }
}

// Watch for highlighted text changes
watch(() => props.highlightedText, (newText: string | undefined) => {
  if (newText) {
    highlightText(newText);
  } else {
    clearHighlights();
  }
});

// Lifecycle
onMounted(() => {
  loadPDF();
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage);
});
</script>

<style scoped>
.pdf-viewer-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: white;
}

.pdf-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 1rem;
}

canvas {
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>
