<script setup lang="ts">
import { ref, defineProps, watch, onMounted, computed, nextTick, onBeforeUnmount } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import axiosInstance from '../api';
import { useProjectPermission } from '../composables/useProjectPermission';
import { useRoute, useRouter } from 'vue-router';

interface TranslationString {
  id: string;
  originalText: string;
  translatedText: string;
  fileId: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  targetLanguages: string[];
}

const route = useRoute();
const router = useRouter();

// Get projectId and branchId from route params
const projectId = computed(() => route.params.projectId as string);
const branchId = computed(() => route.params.branchId as string);
const selectedFileId = computed(() => route.query.fileId as string);
const selectedLanguageFromQuery = computed(() => route.query.language as string);

const files = ref<any[]>([]);
const translationStrings = ref<any[]>([]);
const projectInfo = ref<ProjectInfo | null>(null);
const selectedLanguage = ref<string>('en');
const loading = ref(false);
const error = ref('');
const expandedFileIds = ref<(string|number)[]>([]);

// Thay vì searchQuery/filterStatus toàn cục, dùng map cho từng file
const searchQueryMap = ref<Record<string, string>>({});
const filterStatusMap = ref<Record<string, 'all' | 'translated' | 'untranslated'>>({});
const highlightUntranslated = ref(true);
const sideBySide = ref(false);
const viewMode = ref<'single' | 'side'>('single');
const focusUntranslated = ref(false);

// Thêm state cho auto-save và keyboard shortcuts
const autoSaveEnabled = ref(true);
const lastSavedTime = ref<Record<string, number>>({});
const isSaving = ref<Record<string, boolean>>({});

// Thêm state để track input đang focus
const focusedInputId = ref<string | null>(null);

const PART_SIZE = 250;
const selectedPartMap = ref<Record<string, number>>({}); // fileId -> part index

// Hàm kiểm tra file đang processing
function isFileProcessing(file: any): boolean {
  return file.status === 'processing';
}

// Function để deduplicate strings
function deduplicateStrings(strings: any[]): any[] {
  const seen = new Set<string>();
  const uniqueStrings: any[] = [];

  for (const str of strings) {
    const key = `${str.fileId}_${str.originalText}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueStrings.push(str);
    }
  }

  return uniqueStrings;
}

// Expose method để component cha có thể gọi reload files
function reloadFiles() {
  loadFiles();
}

defineExpose({
  reloadFiles
});

function getTotalParts(fileId: string | number) {
  const arr = stringsByFile.value[fileId] || [];
  // Sử dụng deduplication để đảm bảo tính nhất quán
  const uniqueStrings = deduplicateStrings(arr);
  return Math.ceil(uniqueStrings.length / PART_SIZE);
}
function getStringsOfPart(fileId: string | number, part: number) {
  const arr = stringsByFile.value[fileId] || [];
  const start = part * PART_SIZE;
  return arr.slice(start, start + PART_SIZE);
}

function getStringsCountOfPart(fileId: string | number, part: number) {
  const arr = stringsByFile.value[fileId] || [];
  // Sử dụng deduplication để đảm bảo tính nhất quán
  const uniqueStrings = deduplicateStrings(arr);
  const start = part * PART_SIZE;
  return Math.min(PART_SIZE, uniqueStrings.length - start);
}

async function loadFiles() {
  if (!projectId.value || !branchId.value) return;
  try {
    const res = await axiosInstance.get(`/files/project/${projectId.value}?branchId=${branchId.value}`);
    files.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    files.value = [];
  }
}

async function loadTranslationStrings() {
  if (!projectId.value || !branchId.value) return;
  loading.value = true;
  error.value = '';
  try {
    const res = await axiosInstance.get('/translation/strings', {
      params: {
        projectId: projectId.value,
        branchId: branchId.value,
        language: selectedLanguage.value, // Thêm tham số language mặc định
      },
    });
    translationStrings.value = Array.isArray(res.data)
      ? res.data.map(str => {
        let id = '';
        if (typeof str.id === 'string') {
          id = str.id;
        } else if (typeof str._id === 'string') {
          id = str._id;
        }
        return { ...str, id };
      })
      : [];
  } catch (e: any) {
    error.value = e.message || 'Failed to load translation strings';
    translationStrings.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadProjectInfo() {
  if (!projectId.value) return;
  try {
    const res = await axiosInstance.get(`/projects/${projectId.value}`);
    projectInfo.value = res.data;
    console.log('📋 Project info loaded:', projectInfo.value);
    console.log('🌐 Current selectedLanguageFromQuery:', selectedLanguageFromQuery.value);
    console.log('🌐 Current selectedLanguage:', selectedLanguage.value);

    // Chỉ set ngôn ngữ mặc định nếu chưa có ngôn ngữ được chọn từ URL
    if (projectInfo.value && projectInfo.value.targetLanguages && projectInfo.value.targetLanguages.length > 0) {
      if (!selectedLanguageFromQuery.value) {
        console.log('🌐 Setting default language from project:', projectInfo.value.targetLanguages[0]);
        selectedLanguage.value = projectInfo.value.targetLanguages[0];
      } else {
        console.log('🌐 Keeping language from URL, not setting default');
      }
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load project info';
    projectInfo.value = null;
  }
}

const stringsByFile = computed(() => {
  const map: Record<string, any[]> = {};
  for (const str of translationStrings.value) {
    if (!map[str.fileId]) map[str.fileId] = [];
    map[str.fileId].push(str);
  }
  return map;
});

const fileProgress = computed(() => {
  const progress: Record<string, { total: number; translated: number }> = {};
  for (const file of files.value) {
    const fileId = file.fileId || file.id;
    const arr = stringsByFile.value[fileId] || [];

    // Luôn deduplicate khi đếm progress để đảm bảo tính nhất quán với ProjectTranslationTab
    const uniqueStrings = deduplicateStrings(arr);
    const translatedStrings = uniqueStrings.filter(s => s.translatedText && s.translatedText.trim().length > 0);
    const translatedCount = translatedStrings.length;

    progress[fileId] = {
      total: uniqueStrings.length,
      translated: translatedCount,
    };
  }
  return progress;
});

// Computed: Lọc chuỗi dịch theo file, search, filter
const filteredStringsByFile = computed(() => {
  const map: Record<string, any[]> = {};
  for (const str of translationStrings.value) {
    // Lọc theo search
    const q = (searchQueryMap.value[str.fileId] || '').trim().toLowerCase();
    let match = true;
    if (q) {
      match = ((str.originalText || '').toLowerCase().includes(q)) ||
        ((str.translatedText || '').toLowerCase().includes(q));
    }
    // Lọc theo trạng thái
    let statusMatch = true;
    const status = filterStatusMap.value[str.fileId] || 'all';
    if (status === 'translated') {
      statusMatch = !!(str.translatedText && str.translatedText.trim().length > 0);
    } else if (status === 'untranslated') {
      statusMatch = !str.translatedText || str.translatedText.trim().length === 0;
    }
    if (match && statusMatch) {
      if (!map[str.fileId]) map[str.fileId] = [];
      map[str.fileId].push(str);
    }
  }
  return map;
});

function toggleFileAccordion(fileId: string|number) {
  if (expandedFileIds.value.includes(fileId)) {
    expandedFileIds.value = expandedFileIds.value.filter(id => id !== fileId);
  } else {
    expandedFileIds.value.push(fileId);
  }
}

// Hàm lọc chuỗi dịch cho từng file
function getFilteredStrings(fileId: string | number) {
  const arr = stringsByFile.value[fileId] || [];
  // Sử dụng deduplication để đảm bảo tính nhất quán
  const uniqueStrings = deduplicateStrings(arr);
  const q = (searchQueryMap.value[fileId] || '').trim().toLowerCase();
  // Nếu bật focusUntranslated thì chỉ lấy untranslated
  const status = focusUntranslated.value ? 'untranslated' : (filterStatusMap.value[fileId] || 'all');
  return uniqueStrings.filter((str: any) => {
    let match = true;
    if (q) {
      match = ((str.originalText || '').toLowerCase().includes(q)) ||
        ((str.translatedText || '').toLowerCase().includes(q));
    }
    let statusMatch = true;
    if (status === 'translated') {
      statusMatch = !!(str.translatedText && str.translatedText.trim().length > 0);
    } else if (status === 'untranslated') {
      statusMatch = !str.translatedText || str.translatedText.trim().length === 0;
    }
    return match && statusMatch;
  });
}

function getFilteredStringsOfPart(fileId: string | number, part: number) {
  const filtered = getFilteredStrings(fileId);
  const start = part * PART_SIZE;
  return filtered.slice(start, start + PART_SIZE);
}

// Thêm hàm chọn icon theo loại file
function getFileIconClass(fileName: string) {
  if (!fileName) return 'pi pi-file';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (["doc", "docx"].includes(ext)) return "pi pi-file-word";
  if (["xls", "xlsx"].includes(ext)) return "pi pi-file-excel";
  if (["pdf"].includes(ext)) return "pi pi-file-pdf";
  if (["txt"].includes(ext)) return "pi pi-file";
  if (["csv"].includes(ext)) return "pi pi-table";
  if (["ppt", "pptx"].includes(ext)) return "pi pi-file-ppt";
  return "pi pi-file";
}

// Hàm icon trạng thái dịch
function getStatusIcon(progress: { total: number; translated: number }) {
  if (!progress) return '';
  if (progress.translated === 0) return 'pi pi-ban text-red'; // ⛔
  if (progress.translated === progress.total && progress.total > 0) return 'pi pi-check-circle text-green';
  return 'pi pi-exclamation-circle text-yellow';
}
const filterOptions = [
  { value: 'all', label: 'All', icon: 'pi pi-list', tooltip: 'Show all segments' },
  { value: 'translated', label: 'Translated', icon: 'pi pi-check', tooltip: 'Show only translated' },
  { value: 'untranslated', label: 'Untranslated', icon: 'pi pi-times', tooltip: 'Show only untranslated' },
];

// Computed cho language options
const languageOptions = computed(() => {
  if (!projectInfo.value || !projectInfo.value.targetLanguages) {
    return [{ label: 'English', value: 'en' }];
  }
  return projectInfo.value.targetLanguages.map(lang => ({
    label: getLanguageLabel(lang),
    value: lang
  }));
});

// Hàm helper để lấy tên ngôn ngữ
function getLanguageLabel(langCode: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'vi': 'Tiếng Việt',
    'fr': 'Français',
    'de': 'Deutsch',
    'es': 'Español',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'ja': '日本語',
    'ko': '한국어',
    'zh': '中文',
    'ar': 'العربية',
    'hi': 'हिन्दी',
    'th': 'ไทย',
    'id': 'Bahasa Indonesia',
    'ms': 'Bahasa Melayu',
    'tl': 'Tagalog',
    'km': 'ភាសាខ្មែរ',
    'lo': 'ພາສາລາວ',
    'my': 'မြန်မာဘာသာ'
  };
  return languageMap[langCode] || langCode.toUpperCase();
}

// Watch cho selectedLanguage để reload translation strings
watch(selectedLanguage, () => {
  loadTranslationStrings();
});

// Watch cho selectedLanguageFromQuery để set ngôn ngữ từ URL
watch(selectedLanguageFromQuery, (newLanguage) => {
  console.log('🌐 selectedLanguageFromQuery changed:', newLanguage);
  if (newLanguage && newLanguage !== selectedLanguage.value) {
    console.log('🌐 Setting selectedLanguage from URL:', newLanguage);
    selectedLanguage.value = newLanguage;
  }
}, { immediate: true });

// For now, we'll assume the user has edit permissions
// In a real implementation, you'd need to pass project, members, and currentUser as props or fetch them
const canEditTranslation = ref(true);

// Watch cho projectId và branchId thay đổi
watch([projectId, branchId], () => {
  loadFiles();
  loadTranslationStrings();
  loadProjectInfo();
});

// Auto-expand selected file if fileId is provided
watch([selectedFileId, files], () => {
  if (selectedFileId.value && files.value.length > 0) {
    const fileId = selectedFileId.value;
    if (!expandedFileIds.value.includes(fileId)) {
      expandedFileIds.value.push(fileId);
    }
  }
}, { immediate: true });

// Thêm keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  // Ctrl+S hoặc Cmd+S để save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    const activeElement = document.activeElement;
    if (activeElement && activeElement.classList.contains('translation-input')) {
      const strId = activeElement.getAttribute('data-str-id');
      if (strId) {
        const str = translationStrings.value.find(s => s.id === strId);
        if (str && str._dirty) {
          saveTranslation(str);
        }
      }
    }
  }

  // Tab để di chuyển giữa các input
  if (e.key === 'Tab') {
    const inputs = document.querySelectorAll('.translation-input');
    const currentIndex = Array.from(inputs).findIndex(input => input === document.activeElement);
    if (currentIndex !== -1) {
      e.preventDefault();
      const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
      const nextInput = inputs[nextIndex] as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }
}

// Auto-save functionality
let autoSaveTimeout: NodeJS.Timeout | null = null;
function scheduleAutoSave(str: any) {
  if (!autoSaveEnabled.value) return;

  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  autoSaveTimeout = setTimeout(() => {
    if (str._dirty && str.translatedText && str.translatedText.trim()) {
      saveTranslation(str);
    }
  }, 2000); // Auto-save sau 2 giây
}

onMounted(() => {
  loadFiles();
  loadTranslationStrings();
  loadProjectInfo();
  window.addEventListener('file-ready-for-translation', reloadFiles);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('file-ready-for-translation', reloadFiles);
  document.removeEventListener('keydown', handleKeydown);
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
});

// Autosize textarea
const textareaRefs = ref<Record<string, HTMLTextAreaElement | null>>({});
function setTextareaRef(id: string, el: HTMLTextAreaElement | null) {
  if (el) textareaRefs.value[id] = el;
}
function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement;
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight) + 'px';
}

// Thêm hàm handle focus và blur
function handleInputFocus(strId: string) {
  focusedInputId.value = strId;
}

function handleInputBlur() {
  // Delay để tránh mất focus khi click save button
  setTimeout(() => {
    focusedInputId.value = null;
  }, 100);
}

// Thêm trạng thái dirty/saved cho từng chuỗi
function onInput(str: any) {
  str._dirty = true;
  str._saved = false;
  scheduleAutoSave(str);
}
const toast = useToast();
// Cải thiện hàm saveTranslation
async function saveTranslation(str: any) {
  console.log('saveTranslation str:', str);
  const id = str.id;

  if (isSaving.value[id]) return; // Prevent double save

  isSaving.value[id] = true;
  lastSavedTime.value[id] = Date.now();

  try {
    await axiosInstance.post(`/translation/translate/${id}`, {
      translatedText: str.translatedText,
      language: selectedLanguage.value
    });
    str._dirty = false;
    str._saved = true;
    str._error = false; // Reset error state
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Translation saved successfully',
      life: 1500
    });
  } catch (e: any) {
    str._error = true; // Set error state
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message || 'Failed to save translation',
      life: 3000
    });
  } finally {
    isSaving.value[id] = false;
  }
}

// Hàm helper để lấy status text
function getStatusText(str: any): string {
  if (isSaving.value[str.id]) {
    return 'Saving...';
  }
  if (str._dirty) {
    return 'Unsaved';
  }
  if (str._error) {
    return 'Error';
  }
  return '';
}

// Hàm helper để lấy status tooltip
function getStatusTooltip(str: any): string {
  if (isSaving.value[str.id]) {
    return '🟡 Saving translation...';
  }
  if (str._dirty) {
    return '🟡 Unsaved - Press Ctrl+S or click Save button';
  }
  if (str._error) {
    return '🔴 Error saving - Try again';
  }
  if (str._saved && !str._dirty) {
    return '🟢 Saved successfully';
  }
  return '';
}

// Hàm helper để lấy aria-label cho status indicator
function getStatusAriaLabel(str: any): string {
  if (isSaving.value[str.id]) {
    return 'Saving translation...';
  }
  if (str._dirty) {
    return 'Unsaved - Press Ctrl+S or click Save button';
  }
  if (str._error) {
    return 'Error saving - Try again';
  }
  if (str._saved && !str._dirty) {
    return 'Translation saved successfully';
  }
  return '';
}

// Navigation back to project
function goBackToProject() {
  router.push(`/projects/${projectId.value}`);
}
</script>

<template>
  <div class="translation-editor-page">
    <!-- Header with back button -->
    <div class="page-header">
      <div class="header-content">
        <button @click="goBackToProject" class="back-btn">
          <i class="pi pi-arrow-left"></i>
          Back to Project
        </button>
        <h1 class="page-title">Translation Editor</h1>
        <div class="language-selector">
          <label for="language-dropdown" class="language-label">Target Language:</label>
          <Dropdown
            id="language-dropdown"
            v-model="selectedLanguage"
            :options="languageOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select Language"
            class="language-dropdown"
            :disabled="!projectInfo || !projectInfo.targetLanguages || projectInfo.targetLanguages.length === 0"
          />
        </div>
      </div>
    </div>

    <div class="editor-content">
      <div v-if="loading">Loading translation strings...</div>
      <div v-else-if="error" style="color:red">{{ error }}</div>
      <div v-else>
        <div v-if="files.length === 0">No files found for this branch.</div>
        <div v-for="file in files" :key="file.fileId || file.id" class="file-accordion">
          <div class="file-header" @click="toggleFileAccordion(file.fileId || file.id)">
            <span class="file-name">
              <i :class="getFileIconClass(file.fileName)" style="font-size:1.25em;margin-right:0.2em;"></i>
              {{ file.fileName }}
            </span>
            <div class="progress-bar-wrapper"
                 :title="`${fileProgress[file.fileId || file.id]?.translated || 0} / ${fileProgress[file.fileId || file.id]?.total || 0} translated segments` +
                  (isFileProcessing(file) ? ' (Extracting...)' : '')">
              <span v-if="isFileProcessing(file)" class="processing-badge" style="color:#6366f1;font-weight:600;margin-left:8px;">
                <i class="pi pi-spin pi-spinner"></i> Extracting...
              </span>
              <span v-else>{{ fileProgress[file.fileId || file.id]?.translated || 0 }} / {{ fileProgress[file.fileId || file.id]?.total || 0 }}</span>
            </div>
            <span class="accordion-arrow" :class="{ open: expandedFileIds.includes(file.fileId || file.id) }">
              <i class="pi" :class="expandedFileIds.includes(file.fileId || file.id) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
            </span>
          </div>
          <transition name="fade">
            <div v-if="expandedFileIds.includes(file.fileId || file.id)" class="file-strings-list" :class="{ 'disabled-processing': isFileProcessing(file) }">
              <div v-if="isFileProcessing(file)" class="processing-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.85);z-index:10;display:flex;align-items:center;justify-content:center;border-radius:12px;">
                <div style="text-align:center;">
                  <i class="pi pi-spin pi-spinner" style="font-size:2.5rem;color:#6366f1;"></i>
                  <div style="color:#6366f1;font-size:1.2em;font-weight:600;margin-top:12px;">File is extracting...</div>
                  <div style="color:#6b7280;font-size:0.95em;margin-top:6px;">Please wait for the extraction to complete</div>
                </div>
              </div>
              <!-- Part selector -->
              <div v-if="getTotalParts(file.fileId || file.id) > 1" class="part-selector" style="margin-bottom: 1em; display: flex; gap: 0.5em; align-items: center;">
                <span style="font-weight:600; color:#6366f1;">Part:</span>
                <button
                  v-for="part in getTotalParts(file.fileId || file.id)"
                  :key="part"
                  :class="['part-btn', { active: (selectedPartMap[file.fileId || file.id] ?? 0) === (part-1) }]"
                  @click="selectedPartMap[file.fileId || file.id] = part-1"
                  style="padding: 0.3em 1em; border-radius: 8px; border: none; background: #e0e7ff; color: #374151; font-weight:600; cursor:pointer;"
                  :disabled="isFileProcessing(file)"
                >
                  {{ part }} ({{ getStringsCountOfPart(file.fileId || file.id, part-1) }})
                </button>
              </div>
              <!-- Improved search & filter bar -->
              <div class="search-filter-bar">
                <span class="search-icon"><i class="pi pi-search"></i></span>
                <InputText v-model="searchQueryMap[file.fileId || file.id]" placeholder="Search strings..." class="search-input" :disabled="isFileProcessing(file)" />
                <div class="filter-group-btn">
                  <button
                    v-for="opt in filterOptions"
                    :key="opt.value"
                    :class="['filter-btn', { active: filterStatusMap[file.fileId || file.id] === opt.value }]"
                    @click="filterStatusMap[file.fileId || file.id] = opt.value"
                    :title="opt.tooltip"
                    type="button"
                    :disabled="isFileProcessing(file)"
                  >
                    <i v-if="opt.icon" :class="opt.icon" style="margin-right:0.4em;"></i>{{ opt.label }}
                  </button>
                  <span class="filter-help" title="Filter translation status">
                    <i class="pi pi-filter"></i>
                  </span>
                </div>
              </div>
              <div class="advanced-options">
                <div class="view-mode-toggle">
                  <label>
                    <input type="radio" value="single" v-model="viewMode" :disabled="isFileProcessing(file)" /> Single Column
                  </label>
                  <label>
                    <input type="radio" value="side" v-model="viewMode" :disabled="isFileProcessing(file)" /> Side by Side
                  </label>
                </div>
                <label class="highlight-toggle">
                  <input type="checkbox" v-model="highlightUntranslated" :disabled="isFileProcessing(file)" />
                  Highlight untranslated
                </label>
                <div class="keyboard-shortcuts">
                  <span class="shortcut-hint" title="Keyboard shortcuts">
                    <i class="pi pi-keyboard"></i>
                    <span class="shortcut-text">Ctrl+S: Save | Tab: Next field</span>
                  </span>
                </div>
              </div>
              <div class="translation-scroll-area">
                <div v-if="getFilteredStringsOfPart(file.fileId || file.id, selectedPartMap[file.fileId || file.id] ?? 0).length === 0" class="no-strings">No matching strings.</div>
                <div
                  v-for="str in getFilteredStringsOfPart(file.fileId || file.id, selectedPartMap[file.fileId || file.id] ?? 0)"
                  :key="str.id"
                  class="string-card"
                  :class="{
                    untranslated: highlightUntranslated && (!str.translatedText || !str.translatedText.trim()),
                    translated: str.translatedText && str.translatedText.trim(),
                    'side-by-side': viewMode === 'side',
                    'disabled-processing': isFileProcessing(file)
                  }"
                  :style="isFileProcessing(file) ? 'pointer-events:none;opacity:0.5;' : ''"
                  :title="isFileProcessing(file) ? 'Extracting, please wait...' : ''"
                >
                  <div v-if="viewMode === 'side'" class="side-by-side-row">
                    <div class="side-original">
                      <div class="original-label">Original Text:</div>
                      <div class="original-text" v-html="str.originalText"></div>
                    </div>
                    <div class="side-translation">
                      <div class="translation-label">Translation:</div>
                      <div class="translation-input-container">
                        <div class="translation-input-wrapper">
                          <textarea
                            class="translation-input"
                            :class="{ 'input-focused': focusedInputId === str.id }"
                            v-model="str.translatedText"
                            placeholder="Enter translation..."
                            @input="e => { autoResize(e); onInput(str); }"
                            rows="1"
                            :ref="el => setTextareaRef(str.id, el)"
                            :disabled="!canEditTranslation || isFileProcessing(file)"
                            :data-str-id="str.id"
                            @focus="handleInputFocus(str.id)"
                            @blur="handleInputBlur"
                          ></textarea>
                          <!-- Status indicator -->
                          <div class="status-indicator" v-if="str.translatedText && str.translatedText.trim()">
                            <div
                              class="status-dot"
                              :class="{
                                'status-saved': str._saved && !str._dirty,
                                'status-dirty': str._dirty,
                                'status-saving': isSaving[str.id],
                                'status-error': str._error
                              }"
                              :title="getStatusTooltip(str)"
                              role="status"
                              :aria-label="getStatusAriaLabel(str)"
                            ></div>
                            <span class="status-text" v-if="str._dirty || isSaving[str.id]">
                              {{ getStatusText(str) }}
                            </span>
                          </div>
                        </div>
                        <button
                          v-if="str.translatedText && str.translatedText.trim()"
                          class="save-btn-icon"
                          @click="saveTranslation(str)"
                          :disabled="!str._dirty || !str.translatedText || !str.translatedText.trim() || isFileProcessing(file) || !canEditTranslation"
                          :class="{
                            saving: isSaving[str.id],
                            saved: str._saved && !str._dirty,
                            dirty: str._dirty
                          }"
                          :title="str._dirty ? 'Save changes (Ctrl+S)' : 'Saved'"
                        >
                          <i v-if="isSaving[str.id]" class="pi pi-spin pi-spinner"></i>
                          <i v-else-if="str._saved && !str._dirty" class="pi pi-check"></i>
                          <i v-else class="pi pi-save"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  <template v-else>
                    <div class="original-label">Original Text:</div>
                    <div class="original-text" v-html="str.originalText"></div>
                    <div class="translation-label">Translation:</div>
                    <div class="translation-input-container">
                      <div class="translation-input-wrapper">
                        <textarea
                          class="translation-input"
                          :class="{ 'input-focused': focusedInputId === str.id }"
                          v-model="str.translatedText"
                          placeholder="Enter translation..."
                          @input="e => { autoResize(e); onInput(str); }"
                          rows="1"
                          :ref="el => setTextareaRef(str.id, el)"
                          :disabled="!canEditTranslation || isFileProcessing(file)"
                          :data-str-id="str.id"
                          @focus="handleInputFocus(str.id)"
                          @blur="handleInputBlur"
                        ></textarea>
                        <!-- Status indicator -->
                        <div class="status-indicator" v-if="str.translatedText && str.translatedText.trim()">
                          <div
                            class="status-dot"
                            :class="{
                              'status-saved': str._saved && !str._dirty,
                              'status-dirty': str._dirty,
                              'status-saving': isSaving[str.id],
                              'status-error': str._error
                            }"
                            :title="getStatusTooltip(str)"
                            role="status"
                            :aria-label="getStatusAriaLabel(str)"
                          ></div>
                          <span class="status-text" v-if="str._dirty || isSaving[str.id]">
                            {{ getStatusText(str) }}
                          </span>
                        </div>
                      </div>
                      <button
                        v-if="str.translatedText && str.translatedText.trim()"
                        class="save-btn-icon"
                        @click="saveTranslation(str)"
                        :disabled="!str._dirty || !str.translatedText || !str.translatedText.trim() || isFileProcessing(file) || !canEditTranslation"
                        :class="{
                          saving: isSaving[str.id],
                          saved: str._saved && !str._dirty,
                          dirty: str._dirty
                        }"
                        :title="str._dirty ? 'Save changes (Ctrl+S)' : 'Saved'"
                      >
                        <i v-if="isSaving[str.id]" class="pi pi-spin pi-spinner"></i>
                        <i v-else-if="str._saved && !str._dirty" class="pi pi-check"></i>
                        <i v-else class="pi pi-save"></i>
                      </button>
                    </div>
                  </template>
                  <span
                    v-if="highlightUntranslated && (!str.translatedText || !str.translatedText.trim())"
                    class="untranslated-badge"
                    :title="'This segment is not yet translated'"
                  >
                    <i class="pi pi-exclamation-triangle"></i>
                  </span>
                  <span
                    v-else-if="str.translatedText && str.translatedText.trim()"
                    class="translated-badge"
                    :title="'This segment is translated'"
                  >
                    <i class="pi pi-check-circle"></i>
                  </span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translation-editor-page {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
}

.page-header {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: white;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.4rem 0.8rem; /* Giảm padding từ 0.5rem 1rem */
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem; /* Giảm gap từ 0.5rem */
  font-weight: 500;
  font-size: 0.9rem; /* Thêm font-size nhỏ hơn */
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
}

.page-title {
  font-size: 1.6rem; /* Giảm từ 1.8rem xuống 1.6rem */
  font-weight: 700;
  margin: 0;
}

.editor-content {
  max-width: 100%;
  margin: 0 auto;
  padding: 2rem 1rem;
  background: #0f172a;
}

/* Cải thiện responsive cho desktop */
@media (min-width: 1200px) {
  .editor-content {
    padding: 2rem 2rem; /* Tăng padding cho màn hình lớn */
  }
}

@media (min-width: 1400px) {
  .editor-content {
    padding: 2rem 3rem; /* Tăng padding cho màn hình rất lớn */
  }
}

/* Cải thiện file accordion để mềm mại hơn */
.file-accordion {
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 20px;
  margin-bottom: 2.2em;
  background: #1e293b;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  overflow: hidden;
  width: 100%;
}

.file-accordion:hover {
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.25);
  transform: translateY(-2px);
}

.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1em 1.8em 1.1em 2em;
  font-weight: 700;
  font-size: 1.05em;
  cursor: pointer;
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  min-height: 56px;
  border: none;
}

.file-header:hover {
  background: linear-gradient(135deg, #475569 0%, #64748b 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.file-name {
  flex: 1;
  color: #a5b4fc;
  font-size: 1.05em;
  display: flex;
  align-items: center;
  gap: 0.6em;
}

.file-name i {
  font-size: 1.1em !important; /* Giảm icon size */
}

.file-folder-icon {
  color: #6366f1;
  font-size: 1.25em;
  margin-right: 0.2em;
}

/* Giảm kích thước progress bar */
.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.6em; /* Giảm gap từ 0.7em */
  min-width: 120px; /* Giảm từ 140px xuống 120px */
}

.progress-bar {
  width: 120px; /* Giảm từ 140px xuống 120px */
  height: 16px; /* Giảm từ 18px xuống 16px */
  background: #f1f5f9;
  border-radius: 8px; /* Giảm từ 10px xuống 8px */
  border: 1.5px solid #cbd5e1;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 4px #6366f122;
  transition: background 0.18s, border 0.18s;
}

.progress-bar[data-empty='true'] {
  background: repeating-linear-gradient(135deg, #f1f5f9, #f1f5f9 8px, #e0e7ef 8px, #e0e7ef 16px);
  border: 1.5px dashed #cbd5e1;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #7c3aed 100%);
  border-radius: 10px;
  transition: width 0.22s;
  min-width: 2px;
}

.progress-label {
  color: #6366f1;
  font-size: 0.9em; /* Giảm từ 1em xuống 0.9em */
  min-width: 50px; /* Giảm từ 60px xuống 50px */
  text-align: right;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin-left: 0.6em; /* Giảm từ 0.7em */
}

.accordion-arrow {
  font-size: 1.3em; /* Giảm từ 1.5em xuống 1.3em */
  color: #888;
  margin-left: 0.6em; /* Giảm từ 0.7em */
  transition: transform 0.22s;
  display: flex;
  align-items: center;
}

.accordion-arrow.open {
  transform: rotate(180deg);
  color: #6366f1;
}

/* Cải thiện file strings list */
.file-strings-list {
  padding: 2em 2em 1.5em 2em;
  background: #0f172a;
  border-radius: 0 0 20px 20px;
  width: 100%;
  border: none;
}

/* Responsive cho mobile */
@media (max-width: 700px) {
  .file-header {
    padding: 1.1em 1em 1.1em 1.2em;
    font-size: 1em;
    min-height: 48px;
  }
  .file-strings-list {
    padding: 1.2em 1em 1em 1em; /* Tăng padding cho mobile */
  }
  .editor-content {
    padding: 1rem 0.5rem; /* Giảm padding cho mobile */
  }
}
/* Làm mềm mại translation cards - TỐI ƯU HÓA */
.string-card {
  background: #1e293b;
  border-radius: 12px;
  padding: 0.6em 1em 0.5em 1em;
  border: 1px solid rgba(99, 102, 241, 0.2);
  position: relative;
  margin-bottom: 0.6em;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  width: 100%;
  box-sizing: border-box;
}

.string-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.string-card.untranslated {
  border: 1px solid rgba(99, 102, 241, 0.3);
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.string-card.translated {
  border: 1px solid rgba(34, 197, 94, 0.3);
  background: linear-gradient(135deg, #1e293b 0%, #064e3b 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

/* Tối ưu original text box */
.original-text {
  font-size: 0.95em;
  color: #e2e8f0;
  margin-bottom: 0.2em;
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-radius: 8px;
  padding: 0.4em 0.6em;
  border: 1px solid rgba(99, 102, 241, 0.2);
  word-break: break-word;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Tối ưu translation input */
.translation-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(179, 179, 230, 0.3);
  padding: 0.4em 0.6em;
  font-size: 0.95em;
  min-height: 28px;
  resize: none;
  transition: all 0.3s ease;
  font-family: inherit;
  padding-right: 2.8em; /* Tăng từ 2.4em lên 2.8em vì không còn focus indicator */
  background: #ffffff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.03);
}

.translation-input:focus {
  border: 1px solid rgba(99, 102, 241, 0.6);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.2);
  background: #475569;
  color: #f1f5f9;
  transform: translateY(-1px);
}

/* Tăng tương phản cho input đang focus */
.translation-input.input-focused {
  background: linear-gradient(135deg, #475569 0%, #64748b 100%) !important;
  border: 2px solid #6366f1 !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 16px rgba(99, 102, 241, 0.3) !important;
  transform: translateY(-2px);
  position: relative;
  color: #f1f5f9 !important;
}

.translation-input.input-focused::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6366f1, #7c3aed, #6366f1);
  border-radius: 10px;
  z-index: -1;
  opacity: 0.3;
  animation: border-pulse 2s infinite;
}

/* Focus indicator icon */
.focus-indicator {
  position: absolute;
  top: 50%;
  right: 26px; /* Giảm từ 32px xuống 26px */
  transform: translateY(-50%);
  color: #6366f1;
  font-size: 1em; /* Giảm từ 1.1em xuống 1em */
  z-index: 3;
  pointer-events: none;
}

.focus-pulse {
  animation: focus-pulse 1.5s infinite;
  color: #6366f1;
  filter: drop-shadow(0 1px 2px rgba(99, 102, 241, 0.3)); /* Thêm drop-shadow */
}

/* Animations cho focus */


@keyframes border-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.02);
  }
}

/* Tối ưu save button - Thiết kế mới đẹp hơn */
.save-btn-icon {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 8px; /* Tăng từ 6px lên 8px */
  padding: 0.25em; /* Tăng từ 0.2em lên 0.25em */
  font-size: 0.85em; /* Tăng từ 0.8em lên 0.85em */
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2); /* Tăng shadow */
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px; /* Tăng từ 24px lên 26px */
  height: 26px; /* Tăng từ 24px lên 26px */
  position: absolute;
  right: 6px; /* Tăng từ 4px lên 6px */
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  opacity: 0.9; /* Thêm opacity */
}

.save-btn-icon:hover {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%);
  transform: translateY(-50%) scale(1.15); /* Tăng scale */
  box-shadow: 0 4px 16px rgba(56, 161, 105, 0.3); /* Tăng shadow */
  opacity: 1;
}

.save-btn-icon.saved {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  box-shadow: 0 2px 8px rgba(56, 161, 105, 0.2);
  opacity: 0.8; /* Giảm opacity khi đã save */
}

.save-btn-icon.dirty {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  animation: pulse-gentle 2s infinite;
  opacity: 1;
}

/* Thiết kế mới cho save button - Floating style */
.save-btn-icon {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 50%; /* Thay đổi thành hình tròn */
  padding: 0.3em;
  font-size: 0.9em;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(99, 102, 241, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  opacity: 0.85;
  backdrop-filter: blur(4px);
}

.save-btn-icon:hover {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%);
  transform: translateY(-50%) scale(1.15); /* Tăng scale */
  box-shadow: 0 4px 16px rgba(56, 161, 105, 0.3); /* Tăng shadow */
  opacity: 1;
}

.save-btn-icon.saved {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  box-shadow: 0 2px 8px rgba(56, 161, 105, 0.2);
  opacity: 0.9;
}

.save-btn-icon.dirty {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  animation: pulse-gentle 2s infinite;
  opacity: 1;
  box-shadow: 0 3px 12px rgba(229, 62, 62, 0.3);
}

/* Cải thiện status indicators - Thiết kế mới */
.status-indicator {
  position: absolute;
  top: 6px; /* Tăng từ 4px lên 6px */
  right: 8px; /* Tăng từ 6px lên 8px */
  display: flex;
  align-items: center;
  gap: 4px; /* Tăng từ 3px lên 4px */
  z-index: 2;
  pointer-events: none;
}

.status-dot {
  width: 6px; /* Tăng từ 5px lên 6px */
  height: 6px; /* Tăng từ 5px lên 6px */
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: help;
}

.status-dot:hover {
  transform: scale(1.4); /* Tăng từ 1.3 lên 1.4 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.status-text {
  font-size: 0.7em;
  font-weight: 600;
  color: #e2e8f0;
  background: rgba(30, 41, 59, 0.95);
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all 0.3s ease;
}

.status-text:hover {
  background: rgba(51, 65, 85, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transform: translateY(-1px);
}



/* Cải thiện translation input để chứa các icon tốt hơn */
.translation-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 0.4em 0.6em;
  font-size: 0.95em;
  min-height: 28px;
  resize: none;
  transition: all 0.3s ease;
  font-family: inherit;
  padding-right: 2.4em;
  background: #334155;
  color: #e2e8f0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
}

/* Tối ưu translation input container */
.translation-input-container {
  display: flex;
  align-items: flex-end;
  gap: 0.3em; /* Giảm từ 0.5em xuống 0.3em */
  margin-top: 0.2em; /* Giảm từ 0.3em xuống 0.2em */
  position: relative; /* Để chứa save button */
}

.translation-input-wrapper {
  flex: 1;
  position: relative;
}

/* Tối ưu badges */
.untranslated-badge, .translated-badge {
  position: absolute;
  top: 6px; /* Giảm từ 8px xuống 6px */
  right: 8px; /* Giảm từ 12px xuống 8px */
  font-size: 0.75em; /* Giảm từ 0.85em xuống 0.75em */
  border-radius: 6px; /* Giảm từ 10px xuống 6px */
  padding: 1px 4px; /* Giảm từ 1px 6px */
  display: flex;
  align-items: center;
  z-index: 2;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06); /* Giảm shadow */
  border: none;
  transition: all 0.3s ease;
}

.untranslated-badge {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: #a5b4fc;
}

.translated-badge {
  background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
  color: #10b981;
}

/* Tối ưu labels */
.original-label, .translation-label {
  font-size: 0.85em;
  color: #a5b4fc;
  font-weight: 600;
  margin-bottom: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.2em;
}

.original-label::before {
  content: '\f15c';
  font-family: 'PrimeIcons';
  font-size: 0.9em;
  color: #64748b;
  margin-right: 0.15em;
}

.translation-label::before {
  content: '\f040';
  font-family: 'PrimeIcons';
  font-size: 0.9em;
  color: #10b981;
  margin-right: 0.15em;
}

/* Tối ưu search filter bar */
.search-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.8em;
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  padding: 0.5em 0.8em;
  border-radius: 12px;
  margin-bottom: 0.8em;
  flex-wrap: wrap;
  border: 1px solid rgba(99, 102, 241, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.search-input {
  min-width: 140px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 5px 10px 5px 24px;
  font-size: 0.85em;
  background: #475569;
  color: #e2e8f0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.2);
  background: #64748b;
  color: #f1f5f9;
  transform: translateY(-1px);
}

/* Tối ưu filter buttons */
.filter-btn {
  border: none;
  background: linear-gradient(135deg, #475569 0%, #64748b 100%);
  color: #e2e8f0;
  padding: 0.3em 0.8em;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  font-size: 0.85em;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
}

.filter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.filter-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.3);
}

/* Tối ưu advanced options */
.advanced-options {
  display: flex;
  align-items: center;
  gap: 1em; /* Giảm từ 1.2em xuống 1em */
  margin-bottom: 0.8em; /* Giảm từ 1em xuống 0.8em */
  margin-top: 0.3em; /* Giảm từ 0.4em xuống 0.3em */
}

.highlight-toggle {
  font-size: 0.85em;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.view-mode-toggle {
  display: inline-flex;
  gap: 0.8em; /* Giảm từ 1em xuống 0.8em */
  align-items: center;
  margin-right: 1em; /* Giảm từ 1.2em xuống 1em */
}

.view-mode-toggle label {
  font-weight: 500;
  color: #a5b4fc;
  cursor: pointer;
  margin-right: 0.4em;
  font-size: 0.85em;
}

.keyboard-shortcuts {
  margin-left: auto;
}

.shortcut-hint {
  display: flex;
  align-items: center;
  gap: 0.3em;
  color: #a5b4fc;
  font-size: 0.75em;
  cursor: help;
  padding: 0.15em 0.4em;
  background: linear-gradient(135deg, #475569 0%, #64748b 100%);
  border-radius: 6px;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
}

.shortcut-hint:hover {
  background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.shortcut-text {
  font-weight: 500;
  font-size: 0.8em; /* Giảm từ 0.85em xuống 0.8em */
}

/* Tối ưu side-by-side layout */
.string-card.side-by-side {
  display: flex;
  flex-direction: row;
  gap: 1.5em; /* Giảm từ 2em xuống 1.5em */
  align-items: flex-start;
  width: 100%;
}

.side-by-side-row {
  display: flex;
  flex-direction: row;
  gap: 1.5em; /* Giảm từ 2em xuống 1.5em */
  width: 100%;
}

.side-original, .side-translation {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5em; /* Giảm từ 0.7em xuống 0.5em */
}

/* Tối ưu part selector */
.part-btn.active {
  background: linear-gradient(90deg, #6366f1 0%, #7c3aed 100%) !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.disabled-processing {
  pointer-events: none;
  opacity: 0.5;
}

.processing-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25em; /* Giảm từ 0.3em xuống 0.25em */
  font-size: 0.85em; /* Giảm từ 0.9em xuống 0.85em */
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.9);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tối ưu language selector */
.language-selector {
  display: flex;
  align-items: center;
  gap: 0.4rem; /* Giảm từ 0.5rem xuống 0.4rem */
  margin-left: auto;
}

.language-label {
  color: white;
  font-weight: 600;
  font-size: 0.8rem; /* Giảm từ 0.85rem xuống 0.8rem */
}

.language-dropdown {
  min-width: 130px; /* Giảm từ 140px xuống 130px */
}

.language-dropdown .p-dropdown {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px; /* Giảm từ 8px xuống 6px */
  color: white;
}

.language-dropdown .p-dropdown:not(.p-disabled):hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.language-dropdown .p-dropdown-label {
  color: white;
  font-weight: 500;
}

.language-dropdown .p-dropdown-trigger {
  color: white;
}

/* Tối ưu file strings list */
.file-strings-list {
  padding: 1.5em 1.5em 1em 1.5em; /* Giảm từ 2em 2em 1.5em 2em */
  background: #fafdff;
  border-radius: 0 0 20px 20px;
  width: 100%;
  border: none;
}

/* Tối ưu translation scroll area */
.translation-scroll-area {
  max-height: 75vh;
  min-height: 200px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: #64748b #1e293b;
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  margin-top: 1em;
}

.translation-scroll-area::-webkit-scrollbar {
  width: 6px;
  background: #1e293b;
}

.translation-scroll-area::-webkit-scrollbar-thumb {
  background: #64748b;
  border-radius: 6px;
}

/* Responsive improvements */
@media (max-width: 768px) {
  .keyboard-shortcuts {
    display: none;
  }

  .language-selector {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }

  .language-dropdown {
    min-width: 110px; /* Giảm từ 120px xuống 110px */
  }

  .page-header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 0.8rem; /* Giảm từ 1rem xuống 0.8rem */
    align-items: flex-start;
  }

  .page-title {
    font-size: 1.4rem; /* Giảm từ 1.5rem xuống 1.4rem */
  }

  .editor-content {
    padding: 1rem 0.4rem; /* Giảm từ 0.5rem xuống 0.4rem */
  }

  .file-strings-list {
    padding: 1em 0.8em 0.8em 0.8em; /* Giảm padding cho mobile */
  }
}

/* Responsive cho side-by-side */
@media (max-width: 900px) {
  .string-card.side-by-side, .side-by-side-row {
    flex-direction: column;
    gap: 0.8em; /* Giảm từ 1em xuống 0.8em */
  }

  .side-original, .side-translation {
    width: 100%;
  }
}

/* Tối ưu hóa cho màn hình lớn */
@media (min-width: 1400px) {
  .string-card {
    padding: 0.8em 1.5em 0.6em 1.5em; /* Giảm padding cho màn hình lớn */
  }

  .side-by-side-row {
    gap: 2em; /* Giảm từ 3em xuống 2em */
  }
}

/* Cải thiện responsive cho tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  .editor-content {
    padding: 1.5rem 1.2rem; /* Giảm từ 2rem 1.5rem */
  }

  .file-strings-list {
    padding: 1.5em 1.2em 1em 1.2em; /* Giảm padding */
  }
}

/* Cải thiện responsive cho desktop lớn */
@media (min-width: 1600px) {
  .editor-content {
    padding: 2rem 3rem; /* Giảm từ 4rem xuống 3rem */
  }

  .file-strings-list {
    padding: 1.5em 2.5em 1em 2.5em; /* Giảm padding */
  }
}

/* Tối ưu hóa layout cho màn hình rất lớn */
@media (min-width: 1920px) {
  .editor-content {
    padding: 2rem 4rem; /* Giảm từ 6rem xuống 4rem */
  }

  .file-strings-list {
    padding: 1.5em 3em 1em 3em; /* Giảm padding */
  }
}

/* Search icon */
.search-icon {
  color: #a5b4fc;
  font-size: 1em;
  margin-right: -0.3em;
}

/* Filter group */
.filter-group-btn {
  display: flex;
  align-items: center;
  gap: 0.4em; /* Giảm từ 0.5em xuống 0.4em */
}

.filter-help {
  color: #a5b4fc;
  margin-left: 0.3em;
  cursor: help;
  font-size: 1em;
}

/* Animations */
@keyframes pulse-gentle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
}

@keyframes pulse-loading {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}

@keyframes pulse-error {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.4); }
}

/* Status indicators */
.status-saved {
  background: #38a169;
  animation: pulse-gentle 2s infinite;
}

.status-dirty {
  background: #fbbf24;
  animation: pulse-warning 1.5s infinite;
}

.status-saving {
  background: #3182ce;
  animation: pulse-loading 1s infinite;
}

.status-error {
  background: #e53e3e;
  animation: pulse-error 1s infinite;
}

/* Layout components */
.card-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 0.2em; /* Giảm từ 0.3em xuống 0.2em */
  gap: 0.4em; /* Giảm từ 0.5em xuống 0.4em */
}

/* Responsive improvements cho mobile nhỏ */
@media (max-width: 600px) {
  .string-card {
    padding: 0.5em 0.8em 0.4em 0.8em; /* Giảm padding */
    border-radius: 8px; /* Giảm từ 12px xuống 8px */
    font-size: 0.85em; /* Giảm từ 0.9em xuống 0.85em */
    margin-bottom: 0.5em; /* Giảm từ 0.6em xuống 0.5em */
  }

  .original-text, .translation-input {
    font-size: 0.85em; /* Giảm từ 0.9em xuống 0.85em */
    padding: 0.3em 0.5em; /* Giảm padding */
  }

  .card-actions {
    margin-top: 0.1em; /* Giảm từ 0.15em xuống 0.1em */
  }

  .translation-input-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.2em; /* Giảm từ 0.25em xuống 0.2em */
  }

  /* Cải thiện save button cho mobile */
  .save-btn-icon {
    width: 18px; /* Giảm từ 22px xuống 18px */
    height: 18px; /* Giảm từ 22px xuống 18px */
    font-size: 0.65em; /* Giảm từ 0.75em xuống 0.65em */
    right: 2px; /* Giảm từ 3px xuống 2px */
  }

  .translation-input {
    padding-right: 2.4em; /* Tăng từ 2em lên 2.4em vì không còn focus indicator */
  }

  .translation-input.input-focused {
    transform: translateY(-1px); /* Giảm từ -2px xuống -1px */
  }

  .advanced-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6em; /* Giảm từ 0.8em xuống 0.6em */
  }

  .view-mode-toggle {
    margin-right: 0;
  }

  .status-indicator {
    top: 3px; /* Giảm từ 6px xuống 3px */
    right: 4px; /* Giảm từ 8px xuống 4px */
    gap: 2px; /* Giảm từ 4px xuống 2px */
  }

  .status-dot {
    width: 4px; /* Giảm từ 6px xuống 4px */
    height: 4px; /* Giảm từ 6px xuống 4px */
  }

  .status-text {
    font-size: 0.6em; /* Giảm từ 0.7em xuống 0.6em */
    padding: 1px 4px; /* Giảm padding */
  }

  .untranslated-badge, .translated-badge {
    top: 4px; /* Giảm từ 6px xuống 4px */
    right: 6px; /* Giảm từ 8px xuống 6px */
    font-size: 0.7em; /* Giảm từ 0.75em xuống 0.7em */
    padding: 1px 3px; /* Giảm padding */
  }

  .search-filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6em; /* Giảm từ 0.7em xuống 0.6em */
    padding: 0.6em 0.4em; /* Giảm padding */
  }

  .search-input {
    min-width: 100px;
    width: 100%;
  }

  .filter-group-btn {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25em; /* Giảm từ 0.3em xuống 0.25em */
  }

  .filter-btn {
    width: 100%;
    padding: 0.6em 0.8em; /* Giảm padding */
  }
}

.input-focused {
  border: 2px solid #6366f1;
  box-shadow: 0 0 5px rgba(99, 102, 241, 0.5);
  background: #475569;
  color: #f1f5f9;
}

.focus-indicator {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: #a5b4fc;
  font-size: 1.2rem;
}

/* Thiết kế mới cho save button - Nằm gọn trong input */
.save-btn-icon {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 50%;
  padding: 0.2em; /* Giảm từ 0.25em xuống 0.2em */
  font-size: 0.7em; /* Giảm từ 0.8em xuống 0.7em */
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.2); /* Giảm shadow */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px; /* Giảm từ 24px xuống 20px */
  height: 20px; /* Giảm từ 24px xuống 20px */
  position: absolute;
  right: 3px; /* Giảm từ 4px xuống 3px */
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  opacity: 0.9;
}

.save-btn-icon:hover {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%);
  transform: translateY(-50%) scale(1.1); /* Giảm scale từ 1.15 xuống 1.1 */
  box-shadow: 0 3px 10px rgba(56, 161, 105, 0.25); /* Giảm shadow */
  opacity: 1;
}

.save-btn-icon.saved {
  background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
  box-shadow: 0 2px 6px rgba(56, 161, 105, 0.15); /* Giảm shadow */
  opacity: 0.9;
}

.save-btn-icon.dirty {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  animation: pulse-gentle 2s infinite;
  opacity: 1;
  box-shadow: 0 2px 6px rgba(229, 62, 62, 0.2); /* Giảm shadow */
}
</style>
