<script setup lang="ts">
import { ref, defineProps, watch, onMounted, computed, nextTick, onBeforeUnmount } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import axiosInstance from '../api';
import { useProjectPermission } from '../composables/useProjectPermission';
import { useRoute, useRouter } from 'vue-router';
import { getLanguageName } from '../utils/languages';
import TranslationValidationDialog from '../components/TranslationValidationDialog.vue';
import FilePreviewPanel from '../components/FilePreviewPanel.vue';

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

// Thêm state cho file preview panel
const previewPanelCollapsed = ref(false);
const selectedFileForPreview = ref<any>(null);

// Thêm state để track input đang focus
const focusedInputId = ref<string | null>(null);

// Thêm state cho validation dialog
const showValidationDialog = ref(false);
const currentValidationString = ref<any>(null);
const currentValidationMode = ref<'auto-fixable' | 'non-auto-fixable'>('auto-fixable');
const skippedWarnings = ref<Set<string>>(new Set()); // Track skipped warnings by their message

// Thêm state cho inline validation warnings
const validationWarnings = ref<Record<string, any[]>>({});

// Thêm state cho phân trang editor
const currentEditorPage = ref<Record<string, number>>({}); // fileId -> current page
const totalEditorPages = ref<Record<string, number>>({}); // fileId -> total pages
const editorPageContents = ref<Record<string, string[]>>({}); // fileId -> array of page contents

// Thay đổi từ PART_SIZE cố định thành chia theo page
const DOCX_STRINGS_PER_PAGE = 15; // DOCX: 15 strings/page (đã cập nhật backend)
const selectedPartMap = ref<Record<string, number>>({}); // fileId -> part index

// State cho page modal
const pageModalVisible = ref(false);
const currentModalFileId = ref<string>('');
const pageSearchQuery = ref('');

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

  // Lấy thông tin file để xác định loại file
  const file = files.value.find((f: any) => String(f.fileId || f.id) === String(fileId));
  if (!file) return Math.ceil(uniqueStrings.length / DOCX_STRINGS_PER_PAGE);

  // Nếu là PDF, chia theo page gốc
  if (file.fileType === 'application/pdf') {
    // Đếm số page khác nhau trong strings dựa trên filePart
    const pages = new Set<number>();
    uniqueStrings.forEach((str: any) => {
      const page = str.filePart !== undefined ? str.filePart + 1 : (str.position?.page || 1);
      pages.add(page);
    });
    return pages.size;
  }

  // Nếu là DOCX, chia theo filePart (giống hệt như PDF)
  if (file.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const pages = new Set<number>();
    uniqueStrings.forEach((str: any) => {
      const page = str.filePart !== undefined ? str.filePart + 1 : (str.position?.page || 1);
      pages.add(page);
    });
    console.log(`[DEBUG] DOCX file ${fileId}: ${uniqueStrings.length} strings, ${pages.size} pages`);
    console.log(`[DEBUG] DOCX filePart values:`, Array.from(pages).sort((a, b) => a - b));
    return pages.size;
  }

  // Fallback: chia theo 15 strings/page
  return Math.ceil(uniqueStrings.length / DOCX_STRINGS_PER_PAGE);
}

function getStringsOfPart(fileId: string | number, part: number) {
  const arr = stringsByFile.value[fileId] || [];
  const file = files.value.find((f: any) => String(f.fileId || f.id) === String(fileId));

  if (!file) {
    // Fallback: chia theo 100 strings/page
    const start = part * DOCX_STRINGS_PER_PAGE;
    return arr.slice(start, start + DOCX_STRINGS_PER_PAGE);
  }

  // Nếu là PDF, lấy strings theo page
  if (file.fileType === 'application/pdf') {
    return arr.filter((str: any) => str.filePart === part);
  }

  // Nếu là DOCX, lấy strings theo filePart (giống hệt như PDF)
  if (file.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return arr.filter((str: any) => str.filePart === part);
  }

  // Fallback: chia theo 15 strings/page
  const start = part * DOCX_STRINGS_PER_PAGE;
  return arr.slice(start, start + DOCX_STRINGS_PER_PAGE);
}

function getStringsCountOfPart(fileId: string | number, part: number) {
  const arr = stringsByFile.value[fileId] || [];
  const file = files.value.find((f: any) => String(f.fileId || f.id) === String(fileId));

  if (!file) {
    // Fallback: chia theo 100 strings/page
    const uniqueStrings = deduplicateStrings(arr);
    const start = part * DOCX_STRINGS_PER_PAGE;
    return Math.min(DOCX_STRINGS_PER_PAGE, uniqueStrings.length - start);
  }

  // Nếu là PDF, đếm strings theo page
  if (file.fileType === 'application/pdf') {
    const uniqueStrings = deduplicateStrings(arr);
    return uniqueStrings.filter((str: any) => str.filePart === part).length;
  }

  // Nếu là DOCX, đếm strings theo filePart (giống hệt như PDF)
  if (file.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const uniqueStrings = deduplicateStrings(arr);
    return uniqueStrings.filter((str: any) => str.filePart === part).length;
  }

  // Fallback: chia theo 15 strings/page
  const uniqueStrings = deduplicateStrings(arr);
  const start = part * DOCX_STRINGS_PER_PAGE;
  return Math.min(DOCX_STRINGS_PER_PAGE, uniqueStrings.length - start);
}

// Methods cho page modal
function openPageModal(fileId: string | number) {
  const id = String(fileId);
  currentModalFileId.value = id;
  pageSearchQuery.value = '';
  pageModalVisible.value = true;
}

function selectPageFromModal(part: number) {
  const id = currentModalFileId.value;
  selectedPartMap.value[id] = part;
  pageModalVisible.value = false;
}

function goToPreviousPage(fileId: string | number) {
  const id = String(fileId);
  const currentPart = selectedPartMap.value[id] ?? 0;
  if (currentPart > 0) {
    selectedPartMap.value[id] = currentPart - 1;
  }
}

function goToNextPage(fileId: string | number) {
  const id = String(fileId);
  const currentPart = selectedPartMap.value[id] ?? 0;
  const totalParts = getTotalParts(fileId);
  if (currentPart < totalParts - 1) {
    selectedPartMap.value[id] = currentPart + 1;
  }
}

// Hàm để lấy page number hiển thị cho user
function getPageNumber(fileId: string | number, part: number): string {
  const file = files.value.find((f: any) => String(f.fileId || f.id) === String(fileId));

  if (!file) return `Page ${part + 1}`;

  // Nếu là DOCX, sử dụng filePart (giống hệt như PDF)
  if (file.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const arr = stringsByFile.value[fileId] || [];
    const pageStrings = arr.filter((str: any) => str.filePart === part);
    if (pageStrings.length > 0) {
      return `Page ${part + 1}`;
    }
  }

  // Fallback: sử dụng part + 1
  return `Page ${part + 1}`;
}

// Computed cho filtered pages
const filteredPages = computed(() => {
  if (!pageSearchQuery.value.trim()) {
    return Array.from({ length: getTotalParts(currentModalFileId.value) }, (_, i) => i + 1);
  }

  const query = pageSearchQuery.value.toLowerCase();
  const pages = [];

  for (let i = 1; i <= getTotalParts(currentModalFileId.value); i++) {
    const pageNumber = i.toString();
    const stringCount = getStringsCountOfPart(currentModalFileId.value, i - 1);

    // Search by page number or string count
    if (pageNumber.includes(query) || stringCount.toString().includes(query)) {
      pages.push(i);
    }
  }

  return pages;
});

async function loadFiles() {
  if (!projectId.value || !branchId.value) return;
  try {
    const res = await axiosInstance.get(`/files/project/${projectId.value}?branchId=${branchId.value}`);
    files.value = Array.isArray(res.data) ? res.data : [];
    console.log('Files loaded:', files.value);
    if (files.value.length > 0) {
      console.log('First file structure:', files.value[0]);
    }
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

    // Xử lý phân trang cho từng file
    for (const file of files.value) {
      const fileId = String(file.fileId || file.id);
      const fileStrings = translationStrings.value.filter(str => str.fileId === fileId);

      if (fileStrings.length > 0) {
        // Lấy nội dung gốc từ string đầu tiên để phân trang
        const originalContent = fileStrings[0].originalText || '';
        const pages = parseEditorPages(originalContent);

        editorPageContents.value[fileId] = pages;
        totalEditorPages.value[fileId] = pages.length;
        currentEditorPage.value[fileId] = 1; // Bắt đầu từ trang 1
      }
    }
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

// Computed: Lọc files để chỉ hiện file được chọn nếu có selectedFileId
const filteredFiles = computed(() => {
  if (selectedFileId.value) {
    return files.value.filter(file => {
      const fileIdStr = String(file.fileId || file.id);
      const selectedIdStr = String(selectedFileId.value);
      return fileIdStr === selectedIdStr;
    });
  }
  return files.value;
});

// Debug computed property
const debugFileInfo = computed(() => {
  console.log('Debug - selectedFileId:', selectedFileId.value);
  console.log('Debug - selectedFileForPreview:', selectedFileForPreview.value);
  console.log('Debug - files:', files.value);
  return {
    selectedFileId: selectedFileId.value,
    selectedFileForPreview: selectedFileForPreview.value,
    filesCount: files.value.length
  };
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

  // Set selected file for preview when expanding
  if (expandedFileIds.value.includes(fileId)) {
    const file = files.value.find(f => (f.fileId || f.id) === fileId);
    if (file) {
      selectedFileForPreview.value = file;
    }
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
  const file = files.value.find((f: any) => String(f.fileId || f.id) === String(fileId));

  if (!file) {
    // Fallback: chia theo 100 strings/page
    const start = part * DOCX_STRINGS_PER_PAGE;
    return filtered.slice(start, start + DOCX_STRINGS_PER_PAGE);
  }

  // Nếu là PDF, lấy strings theo page
  if (file.fileType === 'application/pdf') {
    return filtered.filter((str: any) => str.filePart === part);
  }

  // Nếu là DOCX, lấy strings theo filePart (giống hệt như PDF)
  if (file.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return filtered.filter((str: any) => str.filePart === part);
  }

  // Fallback: chia theo 15 strings/page
  const start = part * DOCX_STRINGS_PER_PAGE;
  return filtered.slice(start, start + DOCX_STRINGS_PER_PAGE);
}

// Thêm hàm chọn icon theo loại file
function getFileIconClass(fileName: string) {
  if (!fileName) return 'pi pi-file';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'pi pi-file';
  if (["doc", "docx"].includes(ext)) return "pi pi-file-word";
  if (["xls", "xlsx"].includes(ext)) return "pi pi-file-excel";
  if (["pdf"].includes(ext)) return "pi pi-file-pdf";
  if (["txt"].includes(ext)) return "pi pi-file";
  if (["csv"].includes(ext)) return "pi pi-table";
  if (["ppt", "pptx"].includes(ext)) return "pi pi-file-ppt";
  return "pi pi-file";
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
  return projectInfo.value.targetLanguages.map((lang: string) => ({
    label: getLanguageLabel(lang),
    value: lang
  }));
});

// Hàm helper để lấy tên ngôn ngữ
function getLanguageLabel(langCode: string): string {
  return getLanguageName(langCode);
}

// Watch cho selectedLanguage để reload translation strings
watch(selectedLanguage, () => {
  loadTranslationStrings();
});

// Debug watcher
watch(debugFileInfo, () => {
  // This will trigger the debug computed property
}, { immediate: true });

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

    // Set selected file for preview
    const file = files.value.find(f => {
      const fileIdStr = String(f.fileId || f.id);
      const selectedIdStr = String(fileId);
      console.log('Comparing file IDs:', { fileIdStr, selectedIdStr, match: fileIdStr === selectedIdStr });
      return fileIdStr === selectedIdStr;
    });
    if (file) {
      selectedFileForPreview.value = file;
      console.log('Selected file for preview:', file);
    } else {
      console.log('No file found for ID:', fileId);
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
  document.addEventListener('click', closeDropdown);
});

onBeforeUnmount(() => {
  window.removeEventListener('file-ready-for-translation', reloadFiles);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', closeDropdown);
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

  // Cập nhật validation warnings khi user nhập
  updateValidationWarnings(str);
}

// Hàm cập nhật validation warnings cho một string
function updateValidationWarnings(str: any) {
  const warnings = calculateValidationWarnings(str);
  validationWarnings.value[str.id] = warnings;
}

// Hàm tính toán validation warnings - Crowdin-style
function calculateValidationWarnings(str: any): any[] {
  const warnings: any[] = [];
  const originalText = str.originalText || '';
  const translatedText = str.translatedText || '';

  if (!originalText || !translatedText) {
    return warnings;
  }

  // 1. HTML/XML Tags Validation - CROWDIN ALLOWS
  const originalTags = (originalText.match(/<[^>]+>/g) || []) as string[];
  const translatedTags = (translatedText.match(/<[^>]+>/g) || []) as string[];
  originalTags.forEach((tag: string) => {
    if (!translatedTags.includes(tag)) {
      warnings.push({
        type: 'missing_html_tag',
        message: `Missing HTML tag: ${tag}`,
        severity: 'error',
        canAutoFix: true, // Crowdin allows HTML tag auto-fix
        autoFixAction: () => translatedText + tag
      });
    }
  });

  // 2. Placeholders Validation - CROWDIN ALLOWS
  const originalPlaceholders = (originalText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || []) as string[];
  const translatedPlaceholders = (translatedText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || []) as string[];
  originalPlaceholders.forEach((placeholder: string) => {
    if (!translatedPlaceholders.includes(placeholder)) {
      warnings.push({
        type: 'placeholder_mismatch',
        message: `Missing placeholder "${placeholder}"`,
        severity: 'error',
        canAutoFix: true, // Crowdin allows placeholder auto-fix
        autoFixAction: () => translatedText + placeholder
      });
    }
  });

  // 3. Whitespace Validation - CROWDIN ALLOWS
  // Check for missing non-breaking spaces
  const originalNbsp = (originalText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;
  const translatedNbsp = (translatedText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;
  if (originalNbsp > translatedNbsp) {
    warnings.push({
      type: 'missing_space',
      message: `Missing ${originalNbsp - translatedNbsp} non-breaking space(s)`,
      severity: 'warning',
      canAutoFix: true, // Crowdin allows whitespace auto-fix
      autoFixAction: () => translatedText + '&nbsp;'.repeat(originalNbsp - translatedNbsp)
    });
  }

  // Check for extra spaces at the end
  if (translatedText.endsWith(' ') && !originalText.endsWith(' ')) {
    warnings.push({
      type: 'extra_space',
      message: 'Source text doesn\'t end with a space, please remove trailing space',
      severity: 'warning',
      canAutoFix: true, // Crowdin allows trailing space removal
      autoFixAction: () => translatedText.trimEnd()
    });
  }

  // Check for extra spaces at the beginning
  if (translatedText.startsWith(' ') && !originalText.startsWith(' ')) {
    warnings.push({
      type: 'extra_space',
      message: 'Source text doesn\'t start with a space, please remove leading space',
      severity: 'warning',
      canAutoFix: true, // Crowdin allows leading space removal
      autoFixAction: () => translatedText.trimStart()
    });
  }

  // 4. Character Case Validation - DISABLED per user request
  // Removed uppercase validation as requested

  // Check for ALL CAPS words
  const allCapsWords = (originalText.match(/\b[A-Z0-9]{2,}\b/g) || []) as string[];
  const knownAcronyms = new Set([
    'API','HTTP','HTTPS','URL','URI','ID','UID','PDF','CSV','JSON','XML','SQL','DB','UI','UX','CPU','GPU','RAM','SSO','OTP','SSH','AES','RSA','JWT','HTML','CSS','PNG','JPG','JPEG','SVG','UTF','UTF8','UTF-8','TTL','VAT','SKU','ERP','CRM','SLA','ETA'
  ]);
  // Preserve only known acronyms or tokens that contain digits (e.g., ISO9001)
  const acronymsToPreserve = allCapsWords.filter(word => knownAcronyms.has(word) || /[0-9]/.test(word));
  acronymsToPreserve.forEach((word: string) => {
    if (!translatedText.includes(word)) {
      warnings.push({
        type: 'case_mismatch',
        message: `Missing acronym: ${word}`,
        severity: 'warning',
        canAutoFix: false, // Crowdin doesn't allow case auto-fix
        autoFixAction: () => translatedText + ' ' + word
      });
    }
  });

  // 5. URL/Email Validation - CROWDIN DOESN'T ALLOW
  const urlRegex = /https?:\/\/[^\s]+|[\w.-]+@[\w.-]+\.\w+/g;
  const originalUrls = (originalText.match(urlRegex) || []) as string[];
  const translatedUrls = (translatedText.match(urlRegex) || []) as string[];
  originalUrls.forEach((url: string) => {
    if (!translatedUrls.includes(url)) {
      const isEmail = url.includes('@');
      warnings.push({
        type: 'missing_url',
        message: `Missing ${isEmail ? 'email' : 'URL'}: ${url}`,
        severity: 'error',
        canAutoFix: false, // Crowdin doesn't allow URL/email auto-fix
        autoFixAction: () => translatedText + ' ' + url
      });
    }
  });

  // 6. Currency Validation - CROWDIN DOESN'T ALLOW
  const currencyRegex = /[\$€£¥₹₽₩₪₦₨₱₴₸₺₼₾₿]/g;
  const originalCurrencies = (originalText.match(currencyRegex) || []) as string[];
  const translatedCurrencies = (translatedText.match(currencyRegex) || []) as string[];
  originalCurrencies.forEach((currency: string) => {
    if (!translatedCurrencies.includes(currency)) {
      warnings.push({
        type: 'missing_currency',
        message: `Missing currency symbol: ${currency}`,
        severity: 'error',
        canAutoFix: false, // Crowdin doesn't allow currency auto-fix
        autoFixAction: () => translatedText + currency
      });
    }
  });

  // 7. Date/Time Format Validation - CROWDIN DOESN'T ALLOW
  const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/g;
  const originalDates = (originalText.match(dateRegex) || []) as string[];
  const translatedDates = (translatedText.match(dateRegex) || []) as string[];
  originalDates.forEach((date: string) => {
    if (!translatedDates.includes(date)) {
      warnings.push({
        type: 'date_format_mismatch',
        message: `Missing date format: ${date}`,
        severity: 'warning',
        canAutoFix: false, // Crowdin doesn't allow date auto-fix
        autoFixAction: () => translatedText + ' ' + date
      });
    }
  });

  // 8. Number Validation - CROWDIN DOESN'T ALLOW
  const originalNumbers = (originalText.match(/\d+/g) || []) as string[];
  const translatedNumbers = (translatedText.match(/\d+/g) || []) as string[];
  originalNumbers.forEach((num: string) => {
    if (!translatedNumbers.includes(num)) {
      warnings.push({
        type: 'missing_number',
        message: `Missing number "${num}"`,
        severity: 'warning',
        canAutoFix: false, // Crowdin doesn't allow number auto-fix
        autoFixAction: () => translatedText + num
      });
    }
  });

  // 9. Punctuation Validation - CROWDIN DOESN'T ALLOW
  const originalPunct = (originalText.match(/[.,!?;:]/g) || []) as string[];
  const translatedPunct = (translatedText.match(/[.,!?;:]/g) || []) as string[];
  originalPunct.forEach((punct: string) => {
    if (!translatedPunct.includes(punct)) {
      warnings.push({
        type: 'missing_punctuation',
        message: `Missing punctuation "${punct}"`,
        severity: 'warning',
        canAutoFix: false, // Crowdin doesn't allow punctuation auto-fix
        autoFixAction: () => translatedText + punct
      });
    }
  });

  // 10. Length Validation - Disabled per product decision

  // 11. Context-Aware Validation - Disabled per product decision

  // Filter out skipped warnings
  return warnings.filter(warning => !skippedWarnings.value.has(warning.message));
}
const toast = useToast();
// Cải thiện hàm saveTranslation
async function saveTranslation(str: any) {
  console.log('saveTranslation str:', str);
  const id = str.id;

  if (isSaving.value[id]) return; // Prevent double save

  // Kiểm tra validation trước khi save
  const warnings = calculateValidationWarnings(str);

  if (warnings.length > 0) {
    // Reset skipped warnings for new validation
    skippedWarnings.value.clear();

    // Tách riêng lỗi auto-fix được và không auto-fix được
    const autoFixableWarnings = warnings.filter(w => w.canAutoFix);
    const nonAutoFixableWarnings = warnings.filter(w => !w.canAutoFix);

    // Hiển thị modal theo thứ tự: auto-fix được trước, không auto-fix được sau
    currentValidationString.value = str;

    if (autoFixableWarnings.length > 0) {
      // Hiển thị modal với lỗi auto-fix được
      currentValidationMode.value = 'auto-fixable';
      showValidationDialog.value = true;
    } else if (nonAutoFixableWarnings.length > 0) {
      // Hiển thị modal với lỗi không auto-fix được
      currentValidationMode.value = 'non-auto-fixable';
      showValidationDialog.value = true;
    }
  } else {
    // Save trực tiếp nếu không có vấn đề
    performSave(str);
  }
}

// Hàm kiểm tra validation issues
function checkValidationIssues(str: any): boolean {
  const originalText = str.originalText || '';
  const translatedText = str.translatedText || '';

  if (!originalText || !translatedText) {
    return false; // Không validate nếu chưa có text
  }

  // Check for missing numbers
  const originalNumbers = originalText.match(/\d+/g) || [];
  const translatedNumbers = translatedText.match(/\d+/g) || [];
  if (originalNumbers.some((num: string) => !translatedNumbers.includes(num))) {
    return true;
  }

  // Check for missing non-breaking spaces
  const originalNbsp = (originalText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;
  const translatedNbsp = (translatedText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;
  if (originalNbsp > translatedNbsp) {
    return true;
  }

  // Check for missing punctuation
  const originalPunct = originalText.match(/[.,!?;:]/g) || [];
  const translatedPunct = translatedText.match(/[.,!?;:]/g) || [];
  if (originalPunct.some((punct: string) => !translatedPunct.includes(punct))) {
    return true;
  }

  // Check for placeholder mismatches
  const originalPlaceholders = originalText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || [];
  const translatedPlaceholders = translatedText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || [];
  if (originalPlaceholders.some((placeholder: string) => !translatedPlaceholders.includes(placeholder))) {
    return true;
  }

  // Length difference check disabled per product decision

  return false;
}

// Hàm thực hiện save sau khi validation
async function performSave(str: any) {
  const id = str.id;

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

// Hàm xử lý validation dialog
function handleValidationClose() {
  showValidationDialog.value = false;
  currentValidationString.value = null;
}

function handleValidationSaveAnyway() {
  if (currentValidationString.value) {
    performSave(currentValidationString.value);
  }
  showValidationDialog.value = false;
  currentValidationString.value = null;
}

function handleValidationSkip() {
  if (currentValidationString.value) {
    // Get current warnings
    const warnings = calculateValidationWarnings(currentValidationString.value);
    const autoFixableWarnings = warnings.filter(w => w.canAutoFix);

    if (autoFixableWarnings.length > 0) {
      // Skip the first auto-fixable warning by adding it to skipped set
      const firstWarning = autoFixableWarnings[0];
      skippedWarnings.value.add(firstWarning.message);

      // Check if there are still auto-fixable warnings (excluding skipped ones)
      const remainingAutoFixableWarnings = autoFixableWarnings.filter(w => !skippedWarnings.value.has(w.message));

      if (remainingAutoFixableWarnings.length === 0) {
        // No more auto-fixable warnings, check for non-auto-fixable
        const nonAutoFixableWarnings = warnings.filter(w => !w.canAutoFix);

        if (nonAutoFixableWarnings.length > 0) {
          // Show modal with non-auto-fixable issues
          currentValidationMode.value = 'non-auto-fixable';
          showValidationDialog.value = true;
        } else {
          // All issues handled, close dialog and save
          showValidationDialog.value = false;
          performSave(currentValidationString.value);
        }
      }
      // If there are still auto-fixable warnings, modal stays open and will show next warning
    }
  }
}



function handleValidationAutoFix() {
  if (currentValidationString.value) {
    // Get all auto-fixable warnings
    const warnings = calculateValidationWarnings(currentValidationString.value);
    const autoFixableWarnings = warnings.filter(w => w.canAutoFix);

    if (autoFixableWarnings.length === 0) {
      toast.add({
        severity: 'info',
        summary: 'No Auto-fixable Issues',
        detail: 'No issues can be automatically fixed',
        life: 2000
      });
      return;
    }

    // Fix issues one by one with delay
    let currentIndex = 0;

    const fixNextIssue = () => {
      if (currentIndex >= autoFixableWarnings.length) {
        // All auto-fixable issues fixed, check if there are non-auto-fixable issues
        const remainingWarnings = calculateValidationWarnings(currentValidationString.value);
        const nonAutoFixableWarnings = remainingWarnings.filter(w => !w.canAutoFix);

        if (nonAutoFixableWarnings.length > 0) {
          // Show modal with non-auto-fixable issues
          currentValidationMode.value = 'non-auto-fixable';
          showValidationDialog.value = true;
        } else {
          // All issues fixed, close dialog and save
          showValidationDialog.value = false;
          performSave(currentValidationString.value);
        }

        toast.add({
          severity: 'success',
          summary: 'Auto-fixed',
          detail: `Fixed ${autoFixableWarnings.length} issues automatically`,
          life: 2000
        });
        return;
      }

      const warning = autoFixableWarnings[currentIndex];
      if (warning.autoFixAction) {
        // Apply the fix
        const fixedText = warning.autoFixAction();
        currentValidationString.value.translatedText = fixedText;

        // Update validation warnings to remove the fixed issue
        updateValidationWarnings(currentValidationString.value);

        // Show progress toast
        toast.add({
          severity: 'success',
          summary: 'Fixed Issue',
          detail: warning.message,
          life: 1000
        });

        currentIndex++;

        // Fix next issue after a short delay
        setTimeout(fixNextIssue, 300);
      }
    };

    // Start fixing issues
    fixNextIssue();
  }
}

// Hàm helper để lấy status icon
function getStatusIcon(str: any): string {
  if (isSaving.value[str.id]) {
    return 'pi pi-spin pi-spinner';
  }
  if (str._dirty) {
    return 'pi pi-clock';
  }
  if (str._error) {
    return 'pi pi-exclamation-triangle';
  }
  if (str._saved && !str._dirty) {
    return 'pi pi-check-circle';
  }
  return 'pi pi-circle';
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
    return '💾 Saving translation... Please wait';
  }
  if (str._dirty) {
    return '⏰ Unsaved changes - Press Ctrl+S to save or wait for auto-save';
  }
  if (str._error) {
    return '❌ Error saving translation - Click to retry';
  }
  if (str._saved && !str._dirty) {
    return '✅ Translation saved successfully';
  }
  return '⭕ No status available';
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



// Custom dropdown state
const isDropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// Custom dropdown functions
function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function selectLanguage(langCode: string | undefined) {
  if (langCode) {
    selectedLanguage.value = langCode;
    isDropdownOpen.value = false;
  }
}

function closeDropdown(event: Event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
}

// Computed cho phân trang editor
const getCurrentEditorPage = (fileId: string | number): number => {
  return currentEditorPage.value[String(fileId)] || 1;
};

const getTotalEditorPages = (fileId: string | number): number => {
  return totalEditorPages.value[String(fileId)] || 1;
};

const getEditorPageContent = (fileId: string | number): string => {
  const fileIdStr = String(fileId);
  const pageContents = editorPageContents.value[fileIdStr] || [];
  const currentPage = getCurrentEditorPage(fileId);
  return pageContents[currentPage - 1] || '';
};

// Methods cho phân trang editor
function goToEditorPage(fileId: string | number, page: number) {
  const fileIdStr = String(fileId);
  const totalPages = getTotalEditorPages(fileId);
  if (page >= 1 && page <= totalPages) {
    currentEditorPage.value[fileIdStr] = page;
  }
}

function goToPreviousEditorPage(fileId: string | number) {
  const fileIdStr = String(fileId);
  const currentPage = getCurrentEditorPage(fileId);
  if (currentPage > 1) {
    currentEditorPage.value[fileIdStr] = currentPage - 1;
  }
}

function goToNextEditorPage(fileId: string | number) {
  const fileIdStr = String(fileId);
  const currentPage = getCurrentEditorPage(fileId);
  const totalPages = getTotalEditorPages(fileId);
  if (currentPage < totalPages) {
    currentEditorPage.value[fileIdStr] = currentPage + 1;
  }
}

function parseEditorPages(content: string): string[] {
  // Split content by page breaks
  const pageBreaks = [
    /<div[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi,
    /<div[^>]*style="[^"]*page-break-before:\s*always[^"]*"[^>]*>/gi,
    /<div[^>]*style="[^"]*page-break-after:\s*always[^"]*"[^>]*>/gi,
    /<hr[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi,
    /<hr[^>]*style="[^"]*page-break-before:\s*always[^"]*"[^>]*>/gi,
    /<hr[^>]*style="[^"]*page-break-after:\s*always[^"]*"[^>]*>/gi,
    /<br[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi,
    /<br[^>]*style="[^"]*page-break-before:\s*always[^"]*"[^>]*>/gi,
    /<br[^>]*style="[^"]*page-break-after:\s*always[^"]*"[^>]*>/gi,
    /<!--\s*page-break\s*-->/gi,
    /<!--\s*page\s*break\s*-->/gi,
    /<!--\s*new\s*page\s*-->/gi,
    /<!--\s*newpage\s*-->/gi
  ];

  let pages: string[] = [];

  // Try to split by page breaks
  for (const pageBreak of pageBreaks) {
    const parts = content.split(pageBreak);
    if (parts.length > 1) {
      pages = parts.map(part => part.trim()).filter(part => part.length > 0);
      break;
    }
  }

  // If no page breaks found, try to split by logical sections
  if (pages.length <= 1) {
    // Split by headings or large content blocks
    const headingPattern = /<h[1-6][^>]*>.*?<\/h[1-6]>/gi;
    const matches = [...content.matchAll(headingPattern)];

    if (matches.length > 1) {
      pages = [];
      let lastIndex = 0;

      for (const match of matches) {
        if (match.index !== undefined && match.index > lastIndex) {
          const pageContent = content.substring(lastIndex, match.index).trim();
          if (pageContent.length > 0) {
            pages.push(pageContent);
          }
          lastIndex = match.index;
        }
      }

      // Add the last section
      const lastContent = content.substring(lastIndex).trim();
      if (lastContent.length > 0) {
        pages.push(lastContent);
      }
    }
  }

  // If still no pages found, treat the entire content as one page
  if (pages.length === 0) {
    pages = [content];
  }

  return pages;
}

// Computed để lấy thông tin string đang được focus
const focusedString = computed(() => {
  if (!focusedInputId.value) return null;

  // Tìm string trong tất cả files
  for (const fileId in stringsByFile.value) {
    const strings = stringsByFile.value[fileId];
    const foundString = strings.find((str: any) => str.id === focusedInputId.value);
    if (foundString) {
      return {
        id: foundString.id,
        originalText: foundString.originalText,
        translatedText: foundString.translatedText
      };
    }
  }
  return null;
});
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
          <label class="language-label">Target Language:</label>
          <div class="custom-dropdown" ref="dropdownRef">
            <button
              class="dropdown-trigger"
              @click="toggleDropdown"
              :disabled="!projectInfo || !projectInfo.targetLanguages || projectInfo.targetLanguages.length === 0"
            >
              <span class="selected-language">
                {{ languageOptions.find(opt => opt.value === selectedLanguage)?.label || 'Select Language' }}
              </span>
              <i class="dropdown-arrow" :class="{ 'open': isDropdownOpen }">▼</i>
            </button>
            <div class="dropdown-menu" :class="{ 'open': isDropdownOpen }">
              <div
                v-for="option in languageOptions"
                :key="option.value"
                class="dropdown-item"
                :class="{ 'active': selectedLanguage === option.value }"
                @click="selectLanguage(option.value)"
              >
                {{ option.label }}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="editor-layout">
      <!-- Main Editor Content -->
      <div class="editor-content">
        <div v-if="loading">Loading translation strings...</div>
        <div v-else-if="error" style="color:red">{{ error }}</div>
        <div v-else>
          <div v-if="filteredFiles.length === 0">No files found for this branch.</div>
          <div v-for="file in filteredFiles" :key="file.fileId || file.id" class="file-accordion">
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
                <!-- Page selector with modal -->
                <div v-if="getTotalParts(file.fileId || file.id) > 1" class="page-selector" style="margin-bottom: 1em; display: flex; gap: 0.5em; align-items: center;">
                  <span style="font-weight:600; color:#6366f1;">Page:</span>

                  <!-- Page selector button -->
                  <button
                    @click="openPageModal(file.fileId || file.id)"
                    class="page-selector-btn"
                    style="padding: 0.5em 1em; border-radius: 8px; border: 1px solid #6366f1; background: #334155; color: #e2e8f0; font-weight:600; cursor:pointer; display: flex; align-items: center; gap: 0.5em; min-width: 120px; justify-content: space-between;"
                    :disabled="isFileProcessing(file)"
                  >
                    <span>{{ getPageNumber(file.fileId || file.id, selectedPartMap[file.fileId || file.id] ?? 0) }} ({{ getStringsCountOfPart(file.fileId || file.id, selectedPartMap[file.fileId || file.id] ?? 0) }} strings)</span>
                    <i class="pi pi-chevron-down"></i>
                  </button>

                  <!-- Navigation buttons -->
                  <button
                    @click="goToPreviousPage(file.fileId || file.id)"
                    :disabled="(selectedPartMap[file.fileId || file.id] ?? 0) === 0"
                    class="page-nav-btn"
                    title="Previous page"
                    style="padding: 0.3em 0.6em; border-radius: 6px; border: 1px solid #6366f1; background: #334155; color: #e2e8f0; cursor: pointer;"
                  >
                    <i class="pi pi-chevron-left"></i>
                  </button>

                  <button
                    @click="goToNextPage(file.fileId || file.id)"
                    :disabled="(selectedPartMap[file.fileId || file.id] ?? 0) === getTotalParts(file.fileId || file.id) - 1"
                    class="page-nav-btn"
                    title="Next page"
                    style="padding: 0.3em 0.6em; border-radius: 6px; border: 1px solid #6366f1; background: #334155; color: #e2e8f0; cursor: pointer;"
                  >
                    <i class="pi pi-chevron-right"></i>
                  </button>

                  <!-- Total pages info -->
                  <span style="color: #a5b4fc; font-size: 0.9em;">
                    Total: {{ getTotalParts(file.fileId || file.id) }} pages
                  </span>
                </div>

                <!-- Editor Page Navigation -->
                <div v-if="getTotalEditorPages(file.fileId || file.id) > 1" class="editor-page-navigation" style="margin-bottom: 1em; display: flex; gap: 0.5em; align-items: center; justify-content: center;">
                  <span style="font-weight:600; color:#6366f1;">Page:</span>
                  <button
                    @click="goToPreviousEditorPage(file.fileId || file.id)"
                    :disabled="getCurrentEditorPage(file.fileId || file.id) === 1"
                    class="page-nav-btn"
                    title="Previous page"
                    style="padding: 0.3em 0.6em; border-radius: 6px; border: 1px solid #6366f1; background: #334155; color: #e2e8f0; cursor: pointer;"
                  >
                    <i class="pi pi-chevron-left"></i>
                  </button>

                  <div class="page-numbers" style="display: flex; gap: 0.2em;">
                    <button
                      v-for="page in Math.min(5, getTotalEditorPages(file.fileId || file.id))"
                      :key="page"
                      @click="goToEditorPage(file.fileId || file.id, page)"
                      :class="['page-number-btn', { active: page === getCurrentEditorPage(file.fileId || file.id) }]"
                      :title="`Go to page ${page}`"
                      style="padding: 0.3em 0.6em; border-radius: 6px; border: 1px solid #6366f1; background: #334155; color: #e2e8f0; cursor: pointer; font-weight: 600;"
                    >
                      {{ page }}
                    </button>
                  </div>

                  <button
                    @click="goToNextEditorPage(file.fileId || file.id)"
                    :disabled="getCurrentEditorPage(file.fileId || file.id) === getTotalEditorPages(file.fileId || file.id)"
                    class="page-nav-btn"
                    title="Next page"
                    style="padding: 0.3em 0.6em; border-radius: 6px; border: 1px solid #6366f1; background: #334155; color: #e2e8f0; cursor: pointer;"
                  >
                    <i class="pi pi-chevron-right"></i>
                  </button>

                  <span style="color: #a5b4fc; font-size: 0.9em;">
                  {{ getCurrentEditorPage(file.fileId || file.id) }} / {{ getTotalEditorPages(file.fileId || file.id) }}
                </span>
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
                                class="status-icon"
                                :class="{
                                'status-saved': str._saved && !str._dirty,
                                'status-dirty': str._dirty,
                                'status-saving': isSaving[str.id],
                                'status-error': str._error
                              }"
                                :title="getStatusTooltip(str)"
                                role="status"
                                :aria-label="getStatusAriaLabel(str)"
                              >
                                <i :class="getStatusIcon(str)"></i>
                              </div>
                              <span class="status-text" v-if="str._dirty || isSaving[str.id] || str._error">
                              {{ getStatusText(str) }}
                            </span>
                            </div>
                          </div>

                        </div>
                      </div>

                      <!-- Validation Warnings for Side-by-Side - HIDDEN -->
                      <!-- <div v-if="validationWarnings[str.id] && validationWarnings[str.id].length > 0" class="validation-warnings">
                        <div
                          v-for="(warning, index) in validationWarnings[str.id]"
                          :key="index"
                          class="validation-warning-item"
                          :class="warning.severity"
                        >
                          <i :class="warning.severity === 'error' ? 'pi pi-exclamation-triangle' : 'pi pi-exclamation-circle'"></i>
                          <span>{{ warning.message }}</span>
                        </div>
                      </div> -->
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
                              class="status-icon"
                              :class="{
                              'status-saved': str._saved && !str._dirty,
                              'status-dirty': str._dirty,
                              'status-saving': isSaving[str.id],
                              'status-error': str._error
                            }"
                              :title="getStatusTooltip(str)"
                              role="status"
                              :aria-label="getStatusAriaLabel(str)"
                            >
                              <i :class="getStatusIcon(str)"></i>
                            </div>
                            <span class="status-text" v-if="str._dirty || isSaving[str.id] || str._error">
                            {{ getStatusText(str) }}
                          </span>
                          </div>
                        </div>

                      </div>

                      <!-- Validation Warnings - HIDDEN -->
                      <!-- <div v-if="validationWarnings[str.id] && validationWarnings[str.id].length > 0" class="validation-warnings">
                        <div
                          v-for="(warning, index) in validationWarnings[str.id]"
                          :key="index"
                          class="validation-warning-item"
                          :class="warning.severity"
                        >
                          <i :class="warning.severity === 'error' ? 'pi pi-exclamation-triangle' : 'pi pi-exclamation-circle'"></i>
                          <span>{{ warning.message }}</span>
                        </div>
                      </div> -->
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

      <!-- File Preview Panel -->
      <FilePreviewPanel
        :file-id="selectedFileForPreview?.fileId || selectedFileForPreview?.id"
        :file-name="selectedFileForPreview?.fileName"
        :file-path="selectedFileForPreview?.filePath"
        :file-size="selectedFileForPreview?.fileSize"
        :focused-string="focusedString"
        v-model:collapsed="previewPanelCollapsed"
      />

    </div>
  </div>

  <!-- Translation Validation Dialog -->
  <TranslationValidationDialog
    :show="showValidationDialog"
    :original-text="currentValidationString?.originalText || ''"
    :translated-text="currentValidationString?.translatedText || ''"
    :warnings="currentValidationString ?
      (currentValidationMode === 'auto-fixable'
        ? calculateValidationWarnings(currentValidationString).filter(w => w.canAutoFix)
        : calculateValidationWarnings(currentValidationString).filter(w => !w.canAutoFix)
      ) : []"
    :mode="currentValidationMode"
    @close="handleValidationClose"
    @save-anyway="handleValidationSaveAnyway"
    @skip="handleValidationSkip"
    @auto-fix="handleValidationAutoFix"
  />

  <!-- Page Selection Modal -->
  <Dialog
    v-model:visible="pageModalVisible"
    :modal="true"
    :closable="true"
    :dismissableMask="true"
    :style="{ width: '700px', maxWidth: '95vw' }"
    :breakpoints="{ '960px': '85vw', '641px': '95vw' }"
    class="page-selection-modal"
  >
    <div class="modal-content" style="padding: 0 1.5rem;">
      <!-- Header with file info -->
      <div class="modal-header" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <div class="file-icon" style="width: 36px; height: 36px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);">
            <i class="pi pi-file"></i>
          </div>
          <div>
            <div style="font-weight: 600; color: #1f2937; font-size: 1.1rem;">Select Page</div>
            <div style="color: #6b7280; font-size: 0.85rem; margin-top: 0.1rem;">Choose a page to view and edit</div>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-section" style="margin-bottom: 1.8rem;">
        <div class="search-input-wrapper" style="position: relative;">
          <i class="pi pi-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.9rem;"></i>
          <InputText
            v-model="pageSearchQuery"
            placeholder="Search by page number (e.g., 45) or string count..."
            class="page-search-input"
            style="padding: 0.8rem 0.8rem 0.8rem 2.5rem; width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; background: white; color: #1f2937; font-size: 0.9rem; transition: all 0.3s ease; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);"
          />
        </div>
      </div>

      <!-- Pages Grid -->
      <div class="pages-grid" style="max-height: 380px; overflow-y: auto; padding-right: 0.8rem; margin: 0 -0.5rem;">
        <div
          v-for="part in filteredPages"
          :key="part"
          @click="selectPageFromModal(part-1)"
          class="page-item"
          :class="{ 'active': (selectedPartMap[currentModalFileId] ?? 0) === (part-1) }"
          style="padding: 0.9rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 0.6rem; cursor: pointer; transition: all 0.3s ease; background: white; position: relative; overflow: hidden; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);"
        >
          <!-- Active indicator -->
          <div v-if="(selectedPartMap[currentModalFileId] ?? 0) === (part-1)" class="active-indicator" style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6);"></div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div class="page-number" style="width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #374151; font-size: 0.85rem; border: 1px solid #e5e7eb;">
                  {{ part }}
                </div>
                <div>
                  <div style="font-weight: 600; color: #1f2937; font-size: 0.95rem;">Page {{ part }}</div>
                  <div style="color: #6b7280; font-size: 0.8rem; margin-top: 0.1rem;">
                    {{ getStringsCountOfPart(currentModalFileId, part-1) }} strings
                  </div>
                </div>
              </div>
            </div>

            <!-- Selection indicator -->
            <div v-if="(selectedPartMap[currentModalFileId] ?? 0) === (part-1)" class="selection-indicator" style="color: #059669; display: flex; align-items: center; gap: 0.3rem; background: #ecfdf5; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid #a7f3d0;">
              <i class="pi pi-check-circle" style="font-size: 0.9rem;"></i>
              <span style="font-size: 0.8rem; font-weight: 500;">Selected</span>
            </div>
            <div v-else class="selection-hint" style="color: #9ca3af; font-size: 0.8rem; background: #f9fafb; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid #e5e7eb;">
              Click to select
            </div>
          </div>
        </div>
      </div>

      <!-- No results message -->
      <div v-if="filteredPages.length === 0" class="no-results" style="text-align: center; padding: 2.5rem 1rem; color: #6b7280;">
        <div class="no-results-icon" style="width: 60px; height: 60px; background: #f9fafb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          <i class="pi pi-search" style="font-size: 1.5rem; color: #9ca3af;"></i>
        </div>
        <div style="font-size: 1rem; font-weight: 600; margin-bottom: 0.3rem; color: #374151;">No pages found</div>
        <div style="font-size: 0.85rem; color: #6b7280;">Try searching with different keywords</div>
      </div>
    </div>

    <template #footer>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0;">
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <div class="page-info" style="display: flex; align-items: center; gap: 0.4rem; color: #6b7280; font-size: 0.85rem; background: #f9fafb; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid #e5e7eb;">
            <i class="pi pi-file-text" style="color: #3b82f6; font-size: 0.8rem;"></i>
            <span>{{ filteredPages.length }} of {{ getTotalParts(currentModalFileId) }} pages</span>
          </div>
          <div v-if="pageSearchQuery" class="search-info" style="display: flex; align-items: center; gap: 0.4rem; color: #059669; font-size: 0.85rem; background: #ecfdf5; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid #a7f3d0;">
            <i class="pi pi-search" style="font-size: 0.7rem;"></i>
            <span>Filtered results</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.6rem;">
          <button
            @click="pageModalVisible = false"
            class="modal-btn secondary"
            style="padding: 0.6rem 1.2rem; border-radius: 6px; border: 1px solid #e5e7eb; background: white; color: #374151; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.3s ease; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);"
          >
            Cancel
          </button>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.translation-editor-page {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
}

.page-header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: #e2e8f0;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  position: relative;
  z-index: 1;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  width: 100%;
  margin: 0;
  padding: 0 1rem;
}



.back-btn {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  padding: 0.3rem 0.6rem; /* Giảm padding từ 0.4rem 0.8rem */
  border-radius: 6px; /* Giảm từ 8px xuống 6px */
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem; /* Giảm gap từ 0.4rem */
  font-weight: 500;
  font-size: 0.8rem; /* Giảm từ 0.9rem xuống 0.8rem */
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: rgba(99, 102, 241, 0.5);
  color: #c7d2fe;
  transform: translateX(-2px);
}

.page-title {
  font-size: 1.3rem; /* Giảm từ 1.6rem xuống 1.3rem */
  font-weight: 700;
  margin: 0;
  color: #e2e8f0;
}

.editor-layout {
  display: flex;
  height: calc(100vh - 120px); /* Adjust based on header height */
  background: #0f172a;
}

.editor-content {
  flex: 1;
  margin: 0;
  padding: 1rem 0.5rem;
  background: #0f172a;
  overflow-y: auto;
}

/* Cải thiện responsive cho desktop */
@media (min-width: 1200px) {
  .editor-content {
    padding: 1rem 1rem;
  }
}

@media (min-width: 1400px) {
  .editor-content {
    padding: 1rem 1.5rem;
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
  padding: 0.9em 1.5em 0.9em 1.7em; /* Giảm padding */
  font-weight: 700;
  font-size: 0.9em; /* Giảm từ 1.05em xuống 0.9em */
  cursor: pointer;
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-radius: 16px 16px 0 0; /* Giảm từ 20px xuống 16px */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  min-height: 48px; /* Giảm từ 56px xuống 48px */
  border: none;
}

.file-header:hover {
  background: linear-gradient(135deg, #475569 0%, #64748b 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.file-name {
  flex: 1;
  color: #a5b4fc;
  font-size: 0.9em; /* Giảm từ 1.05em xuống 0.9em */
  display: flex;
  align-items: center;
  gap: 0.4em; /* Giảm từ 0.6em xuống 0.4em */
}

.file-name i {
  font-size: 0.9em !important; /* Giảm từ 1.1em xuống 0.9em */
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
  font-size: 1.1em; /* Giảm từ 1.3em xuống 1.1em */
  color: #888;
  margin-left: 0.5em; /* Giảm từ 0.6em xuống 0.5em */
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
    padding: 1.2em 0.8em 1em 0.8em; /* Giảm padding cho mobile */
  }
  .editor-content {
    padding: 0.8rem 0.3rem; /* Giảm padding cho mobile */
  }
}
/* Làm mềm mại translation cards - TỐI ƯU HÓA */
.string-card {
  background: #1e293b;
  border-radius: 10px; /* Giảm từ 12px xuống 10px */
  padding: 0.5em 0.8em 0.4em 0.8em; /* Giảm padding */
  border: 1px solid rgba(99, 102, 241, 0.2);
  position: relative;
  margin-bottom: 0.5em; /* Giảm từ 0.6em xuống 0.5em */
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
  font-size: 0.85em; /* Giảm từ 0.95em xuống 0.85em */
  color: #e2e8f0;
  margin-bottom: 0.15em; /* Giảm từ 0.2em xuống 0.15em */
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-radius: 6px; /* Giảm từ 8px xuống 6px */
  padding: 0.3em 0.5em; /* Giảm padding */
  border: 1px solid rgba(99, 102, 241, 0.2);
  word-break: break-word;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Tối ưu translation input */
.translation-input {
  width: 100%;
  border-radius: 6px; /* Giảm từ 8px xuống 6px */
  border: 1px solid rgba(179, 179, 230, 0.3);
  padding: 0.3em 0.5em; /* Giảm padding */
  font-size: 0.85em; /* Giảm từ 0.95em xuống 0.85em */
  min-height: 24px; /* Giảm từ 28px xuống 24px */
  resize: none;
  transition: all 0.3s ease;
  font-family: inherit;
  padding-right: 2.4em; /* Giảm từ 2.8em xuống 2.4em */
  background: #334155;
  color: #e2e8f0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
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



/* Cải thiện status indicators - Thiết kế mới với icons */
.status-indicator {
  position: absolute;
  top: 4px;
  right: 20px; /* Tăng khoảng cách từ right để tránh đè lên scrollbar */
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
  pointer-events: none;
}

.status-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  cursor: help;
  font-size: 8px;
}

.status-icon:hover {
  transform: scale(1.2);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.status-icon i {
  color: inherit;
  font-size: 8px;
}

.status-text {
  font-size: 0.65em;
  font-weight: 600;
  color: #e2e8f0;
  background: rgba(30, 41, 59, 0.95);
  padding: 1px 4px;
  border-radius: 4px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all 0.3s ease;
}

.status-text:hover {
  background: rgba(51, 65, 85, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transform: translateY(-1px);
}

/* Status icon states */
.status-icon.status-saved {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-color: rgba(16, 185, 129, 0.3);
}

.status-icon.status-dirty {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-color: rgba(245, 158, 11, 0.3);
  animation: pulse 2s infinite;
}

.status-icon.status-saving {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-color: rgba(59, 130, 246, 0.3);
}

.status-icon.status-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-color: rgba(239, 68, 68, 0.3);
  animation: shake 0.5s ease-in-out;
}

/* Animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
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
  padding-right: 3.5em; /* Tăng padding-right để tránh text bị che bởi status indicator */
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
  top: 4px;
  right: 20px; /* Đồng nhất với status indicator */
  font-size: 0.65em;
  border-radius: 4px;
  padding: 1px 3px;
  display: flex;
  align-items: center;
  z-index: 2;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
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
  font-size: 0.75em; /* Giảm từ 0.85em xuống 0.75em */
  color: #a5b4fc;
  font-weight: 600;
  margin-bottom: 0.03em; /* Giảm từ 0.05em xuống 0.03em */
  display: flex;
  align-items: center;
  gap: 0.15em; /* Giảm từ 0.2em xuống 0.15em */
}

.original-label::before {
  content: '\f15c';
  font-family: 'PrimeIcons';
  font-size: 0.8em; /* Giảm từ 0.9em xuống 0.8em */
  color: #64748b;
  margin-right: 0.1em; /* Giảm từ 0.15em xuống 0.1em */
}

.translation-label::before {
  content: '\f040';
  font-family: 'PrimeIcons';
  font-size: 0.8em; /* Giảm từ 0.9em xuống 0.8em */
  color: #10b981;
  margin-right: 0.1em; /* Giảm từ 0.15em xuống 0.1em */
}

/* Tối ưu search filter bar */
.search-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.6em; /* Giảm từ 0.8em xuống 0.6em */
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  padding: 0.4em 0.6em; /* Giảm padding */
  border-radius: 10px; /* Giảm từ 12px xuống 10px */
  margin-bottom: 0.6em; /* Giảm từ 0.8em xuống 0.6em */
  flex-wrap: wrap;
  border: 1px solid rgba(99, 102, 241, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.search-input {
  min-width: 120px; /* Giảm từ 140px xuống 120px */
  border-radius: 6px; /* Giảm từ 8px xuống 6px */
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 4px 8px 4px 20px; /* Giảm padding */
  font-size: 0.8em; /* Giảm từ 0.85em xuống 0.8em */
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
  padding: 0.25em 0.6em; /* Giảm padding */
  border-radius: 6px; /* Giảm từ 8px xuống 6px */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  font-size: 0.8em; /* Giảm từ 0.85em xuống 0.8em */
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
  gap: 0.8em; /* Giảm từ 1em xuống 0.8em */
  margin-bottom: 0.6em; /* Giảm từ 0.8em xuống 0.6em */
  margin-top: 0.2em; /* Giảm từ 0.3em xuống 0.2em */
}

.highlight-toggle {
  font-size: 0.8em; /* Giảm từ 0.85em xuống 0.8em */
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.25em; /* Giảm từ 0.3em xuống 0.25em */
}

.view-mode-toggle {
  display: inline-flex;
  gap: 0.6em; /* Giảm từ 0.8em xuống 0.6em */
  align-items: center;
  margin-right: 0.8em; /* Giảm từ 1em xuống 0.8em */
}

.view-mode-toggle label {
  font-weight: 500;
  color: #a5b4fc;
  cursor: pointer;
  margin-right: 0.3em; /* Giảm từ 0.4em xuống 0.3em */
  font-size: 0.8em; /* Giảm từ 0.85em xuống 0.8em */
}

.keyboard-shortcuts {
  margin-left: auto;
}

.shortcut-hint {
  display: flex;
  align-items: center;
  gap: 0.25em; /* Giảm từ 0.3em xuống 0.25em */
  color: #a5b4fc;
  font-size: 0.7em; /* Giảm từ 0.75em xuống 0.7em */
  cursor: help;
  padding: 0.1em 0.3em; /* Giảm padding */
  background: linear-gradient(135deg, #475569 0%, #64748b 100%);
  border-radius: 5px; /* Giảm từ 6px xuống 5px */
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
  font-size: 0.75em; /* Giảm từ 0.8em xuống 0.75em */
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
  gap: 0.6rem;
  margin-left: auto;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
  padding: 0.5rem 0.8rem;
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  z-index: 9999;
}

.language-selector:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
  transform: translateY(-1px);
}

.language-label {
  color: #a5b4fc;
  font-weight: 600;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.language-label::before {
  content: '\f1ab';
  font-family: 'PrimeIcons';
  font-size: 0.9rem;
  color: #6366f1;
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
    padding: 0.4rem 0.6rem;
  }

  .language-dropdown {
    min-width: 100px;
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
    padding: 0.8rem 0.2rem; /* Giảm padding cho mobile */
  }

  .file-strings-list {
    padding: 1em 0.6em 0.8em 0.6em; /* Giảm padding cho mobile */
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
    padding: 0.8em 1.5em 0.6em 1.5em;
    background: #1e293b;
    border: 1px solid rgba(99, 102, 241, 0.2);
  }

  .side-by-side-row {
    gap: 2em; /* Giảm từ 3em xuống 2em */
  }
}

/* Cải thiện responsive cho tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  .editor-content {
    padding: 1rem 0.8rem;
    background: #0f172a;
  }

  .file-strings-list {
    padding: 1.5em 1em 1em 1em;
    background: #0f172a;
  }
}

/* Cải thiện responsive cho desktop lớn */
@media (min-width: 1600px) {
  .editor-content {
    padding: 1rem 2rem;
    background: #0f172a;
  }

  .file-strings-list {
    padding: 1.5em 2em 1em 2em;
    background: #0f172a;
  }
}

/* Tối ưu hóa layout cho màn hình rất lớn */
@media (min-width: 1920px) {
  .editor-content {
    padding: 1rem 2.5rem;
    background: #0f172a;
  }

  .file-strings-list {
    padding: 1.5em 2.5em 1em 2.5em;
    background: #0f172a;
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
  .editor-content {
    padding: 0.4rem 0.1rem;
  }

  .string-card {
    padding: 0.4em 0.6em 0.3em 0.6em; /* Giảm padding */
    border-radius: 6px; /* Giảm từ 8px xuống 6px */
    font-size: 0.8em; /* Giảm từ 0.85em xuống 0.8em */
    margin-bottom: 0.4em; /* Giảm từ 0.5em xuống 0.4em */
    background: #1e293b;
    border: 1px solid rgba(99, 102, 241, 0.2);
  }

  .original-text, .translation-input {
    font-size: 0.8em; /* Giảm từ 0.85em xuống 0.8em */
    padding: 0.25em 0.4em; /* Giảm padding */
    background: #334155;
    color: #e2e8f0;
  }

  .card-actions {
    margin-top: 0.08em; /* Giảm từ 0.1em xuống 0.08em */
  }

  .translation-input-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.15em; /* Giảm từ 0.2em xuống 0.15em */
  }



  .translation-input {
    padding-right: 2.2em; /* Giảm từ 2.4em xuống 2.2em */
  }

  .translation-input.input-focused {
    transform: translateY(-1px); /* Giảm từ -2px xuống -1px */
  }

  .advanced-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5em; /* Giảm từ 0.6em xuống 0.5em */
  }

  .view-mode-toggle {
    margin-right: 0;
  }

  .status-indicator {
    top: 2px; /* Giảm từ 3px xuống 2px */
    right: 3px; /* Giảm từ 4px xuống 3px */
    gap: 1px; /* Giảm từ 2px xuống 1px */
  }

  .status-dot {
    width: 3px; /* Giảm từ 4px xuống 3px */
    height: 3px; /* Giảm từ 4px xuống 3px */
  }

  .status-text {
    font-size: 0.55em; /* Giảm từ 0.6em xuống 0.55em */
    padding: 1px 3px; /* Giảm padding */
  }

  .untranslated-badge, .translated-badge {
    top: 3px; /* Giảm từ 4px xuống 3px */
    right: 4px; /* Giảm từ 6px xuống 4px */
    font-size: 0.6em; /* Giảm từ 0.7em xuống 0.6em */
    padding: 1px 2px; /* Giảm padding */
  }

  .search-filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5em; /* Giảm từ 0.6em xuống 0.5em */
    padding: 0.5em 0.3em; /* Giảm padding */
  }

  .search-input {
    min-width: 90px; /* Giảm từ 100px xuống 90px */
    width: 100%;
  }

  .filter-group-btn {
    flex-direction: column;
    align-items: stretch;
    gap: 0.2em; /* Giảm từ 0.25em xuống 0.2em */
  }

  .filter-btn {
    width: 100%;
    padding: 0.5em 0.6em; /* Giảm padding */
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

/* Override tất cả background trắng cho dark mode */
.translation-editor-page * {
  background-color: inherit;
}

.translation-editor-page input,
.translation-editor-page textarea,
.translation-editor-page select,
.translation-editor-page button:not(.back-btn) {
  background-color: #334155 !important;
  color: #e2e8f0 !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}

.translation-editor-page input:focus,
.translation-editor-page textarea:focus,
.translation-editor-page select:focus {
  background-color: #475569 !important;
  color: #f1f5f9 !important;
  border-color: rgba(99, 102, 241, 0.6) !important;
}

/* Override PrimeVue components */
.translation-editor-page .p-inputtext,
.translation-editor-page .p-dropdown,
.translation-editor-page .p-multiselect {
  background-color: #334155 !important;
  color: #e2e8f0 !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}

.translation-editor-page .p-inputtext:focus,
.translation-editor-page .p-dropdown:focus,
.translation-editor-page .p-multiselect:focus {
  background-color: #475569 !important;
  color: #f1f5f9 !important;
  border-color: rgba(99, 102, 241, 0.6) !important;
}

.translation-editor-page .p-dropdown-panel,
.translation-editor-page .p-multiselect-panel {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
  border: 1px solid rgba(99, 102, 241, 0.4) !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
  backdrop-filter: blur(8px) !important;
}

.translation-editor-page .p-dropdown-item,
.translation-editor-page .p-multiselect-item {
  background-color: transparent !important;
  color: #e2e8f0 !important;
  padding: 0.6rem 1rem !important;
  border-radius: 6px !important;
  margin: 0.1rem 0.3rem !important;
  transition: all 0.2s ease !important;
  border: 1px solid transparent !important;
}

.translation-editor-page .p-dropdown-item:hover,
.translation-editor-page .p-multiselect-item:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%) !important;
  color: #f1f5f9 !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
  transform: translateX(2px) !important;
}

.translation-editor-page .p-dropdown-item.p-highlight,
.translation-editor-page .p-multiselect-item.p-highlight {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%) !important;
  color: #c7d2fe !important;
  border-color: rgba(99, 102, 241, 0.5) !important;
  font-weight: 600 !important;
}

/* Override radio buttons và checkboxes */
.translation-editor-page input[type="radio"],
.translation-editor-page input[type="checkbox"] {
  background-color: #334155 !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}

.translation-editor-page input[type="radio"]:checked,
.translation-editor-page input[type="checkbox"]:checked {
  background-color: #6366f1 !important;
  border-color: #6366f1 !important;
}

/* Override part buttons */
.translation-editor-page .part-btn {
  background: #334155 !important;
  color: #e2e8f0 !important;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
}

.translation-editor-page .part-btn:hover {
  background: #475569 !important;
  color: #f1f5f9 !important;
}

.translation-editor-page .part-btn.active {
  background: linear-gradient(90deg, #6366f1 0%, #7c3aed 100%) !important;
  color: #fff !important;
}

/* Override filter buttons */
.translation-editor-page .filter-btn {
  background: #334155 !important;
  color: #e2e8f0 !important;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
}

.translation-editor-page .filter-btn:hover {
  background: #475569 !important;
  color: #f1f5f9 !important;
}

.translation-editor-page .filter-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%) !important;
  color: #fff !important;
}

/* Override scrollbar */
.translation-editor-page ::-webkit-scrollbar {
  background-color: #1e293b !important;
}

.translation-editor-page ::-webkit-scrollbar-thumb {
  background-color: #64748b !important;
}

.translation-editor-page ::-webkit-scrollbar-track {
  background-color: #1e293b !important;
}

/* Override placeholder text */
.translation-editor-page input::placeholder,
.translation-editor-page textarea::placeholder {
  color: #94a3b8 !important;
}

/* Override file header background */
.translation-editor-page .file-header {
  background: linear-gradient(135deg, #334155 0%, #475569 100%) !important;
}

/* Override search filter bar */
.translation-editor-page .search-filter-bar {
  background: linear-gradient(135deg, #334155 0%, #475569 100%) !important;
}

/* Override original text background */
.translation-editor-page .original-text {
  background: linear-gradient(135deg, #334155 0%, #475569 100%) !important;
  color: #e2e8f0 !important;
}

/* Override translation input background */
.translation-editor-page .translation-input {
  background: #334155 !important;
  color: #e2e8f0 !important;
}

/* Override search input */
.translation-editor-page .search-input {
  background: #475569 !important;
  color: #e2e8f0 !important;
}



/* Override language selector container */
.translation-editor-page .language-selector {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  backdrop-filter: blur(8px) !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2) !important;
}

.translation-editor-page .language-selector:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%) !important;
  border-color: rgba(99, 102, 241, 0.4) !important;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15) !important;
}

.translation-editor-page .language-label {
  color: #a5b4fc !important;
}

.translation-editor-page .language-label::before {
  content: '\f1ab' !important;
  font-family: 'PrimeIcons' !important;
  color: #6366f1 !important;
}

/* Override any remaining white backgrounds */
.translation-editor-page *[style*="background: white"],
.translation-editor-page *[style*="background: #fff"],
.translation-editor-page *[style*="background-color: white"],
.translation-editor-page *[style*="background-color: #fff"] {
  background: #334155 !important;
  background-color: #334155 !important;
}

/* Force dark mode for dropdown panels with maximum specificity */
.translation-editor-page .p-dropdown-panel,
.translation-editor-page .p-multiselect-panel,
.translation-editor-page .p-overlay-panel,
.translation-editor-page .p-dropdown-panel *,
.translation-editor-page .p-multiselect-panel *,
.translation-editor-page .p-overlay-panel *,
.translation-editor-page div[class*="p-dropdown"],
.translation-editor-page div[class*="p-multiselect"],
.translation-editor-page div[class*="p-overlay"],
.translation-editor-page ul[class*="p-dropdown"],
.translation-editor-page ul[class*="p-multiselect"],
.translation-editor-page li[class*="p-dropdown"],
.translation-editor-page li[class*="p-multiselect"] {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
  background-color: #1e293b !important;
  border: 1px solid rgba(99, 102, 241, 0.4) !important;
  color: #e2e8f0 !important;
}

/* Force dark mode for all dropdown items */
.translation-editor-page .p-dropdown-item,
.translation-editor-page .p-multiselect-item,
.translation-editor-page .p-overlay-panel *,
.translation-editor-page .p-dropdown-panel li,
.translation-editor-page .p-multiselect-panel li,
.translation-editor-page li[class*="p-dropdown-item"],
.translation-editor-page li[class*="p-multiselect-item"] {
  background-color: transparent !important;
  color: #e2e8f0 !important;
  padding: 0.6rem 1rem !important;
  border-radius: 6px !important;
  margin: 0.1rem 0.3rem !important;
  transition: all 0.2s ease !important;
  border: 1px solid transparent !important;
}

/* Override any white text in dropdowns */
.translation-editor-page .p-dropdown-panel *,
.translation-editor-page .p-multiselect-panel *,
.translation-editor-page .p-overlay-panel *,
.translation-editor-page div[class*="p-dropdown"] *,
.translation-editor-page div[class*="p-multiselect"] *,
.translation-editor-page ul[class*="p-dropdown"] *,
.translation-editor-page ul[class*="p-multiselect"] *,
.translation-editor-page li[class*="p-dropdown"] *,
.translation-editor-page li[class*="p-multiselect"] * {
  color: #e2e8f0 !important;
  background-color: transparent !important;
}

/* Force dark mode for all elements */
.translation-editor-page div,
.translation-editor-page span,
.translation-editor-page p,
.translation-editor-page label {
  color: #e2e8f0 !important;
}

/* Override any light backgrounds that might be inherited */
.translation-editor-page .p-component,
.translation-editor-page .p-element {
  background-color: #334155 !important;
  color: #e2e8f0 !important;
}

/* Ensure all form elements are dark */
.translation-editor-page form * {
  background-color: #334155 !important;
  color: #e2e8f0 !important;
}

/* Override any remaining light elements */
.translation-editor-page * {
  background-color: inherit;
}

.translation-editor-page *:not(.back-btn):not(.page-header) {
  background-color: transparent !important;
}

/* Custom Dropdown Styles */
.custom-dropdown {
  position: relative;
  display: inline-block;
  min-width: 140px;
  z-index: 9999;
}

.dropdown-trigger {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 8px;
  color: #e2e8f0;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 140px;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.dropdown-trigger:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%);
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

.dropdown-trigger:focus {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(124, 58, 237, 0.4) 100%);
  border-color: rgba(99, 102, 241, 0.8);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 16px rgba(99, 102, 241, 0.3);
  outline: none;
}

.dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0%, rgba(71, 85, 105, 0.2) 100%);
  border-color: rgba(100, 116, 139, 0.3);
}

.selected-language {
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.85rem;
}

.dropdown-arrow {
  color: #a5b4fc;
  font-size: 0.7rem;
  transition: all 0.3s ease;
  margin-left: 0.5rem;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
  color: #c7d2fe;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.25rem;
}

.dropdown-menu.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  padding: 0.6rem 1rem;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  margin: 0.1rem 0.3rem;
  border: 1px solid transparent;
  font-size: 0.85rem;
  font-weight: 500;
}

.dropdown-item:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%);
  color: #f1f5f9;
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateX(2px);
}

.dropdown-item.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%);
  color: #c7d2fe;
  border-color: rgba(99, 102, 241, 0.5);
  font-weight: 600;
}

/* Custom scrollbar for dropdown */
.dropdown-menu::-webkit-scrollbar {
  width: 4px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
  border-radius: 2px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.4);
  border-radius: 2px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}

/* Responsive adjustments for dropdown */
@media (max-width: 768px) {
  .custom-dropdown {
    min-width: 120px;
  }

  .dropdown-trigger {
    min-width: 120px;
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }

  .selected-language {
    font-size: 0.8rem;
  }

  .dropdown-arrow {
    font-size: 0.6rem;
    margin-left: 0.3rem;
  }

  .dropdown-item {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
  }
}

/* Additional dark mode overrides for dropdowns */
.translation-editor-page .p-component-overlay {
  background-color: rgba(0, 0, 0, 0.4) !important;
}

/* Force dark mode for ALL dropdown panels with maximum specificity */
.translation-editor-page .p-dropdown-panel,
.translation-editor-page .p-multiselect-panel,
.translation-editor-page .p-overlay-panel,
.translation-editor-page .p-dropdown-panel *,
.translation-editor-page .p-multiselect-panel *,
.translation-editor-page .p-overlay-panel *,
.translation-editor-page div[class*="p-dropdown-panel"],
.translation-editor-page div[class*="p-multiselect-panel"],
.translation-editor-page div[class*="p-overlay-panel"] {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
  border: 1px solid rgba(99, 102, 241, 0.4) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
  color: #e2e8f0 !important;
}

/* Force dark mode for ALL dropdown items */
.translation-editor-page .p-dropdown-item,
.translation-editor-page .p-multiselect-item,
.translation-editor-page .p-overlay-panel li,
.translation-editor-page .p-dropdown-panel li,
.translation-editor-page .p-multiselect-panel li,
.translation-editor-page div[class*="p-dropdown-item"],
.translation-editor-page div[class*="p-multiselect-item"] {
  background-color: transparent !important;
  color: #e2e8f0 !important;
  padding: 0.6rem 1rem !important;
  border-radius: 6px !important;
  margin: 0.1rem 0.3rem !important;
  transition: all 0.2s ease !important;
  border: 1px solid transparent !important;
}

/* Hover states for dropdown items */
.translation-editor-page .p-dropdown-item:hover,
.translation-editor-page .p-multiselect-item:hover,
.translation-editor-page .p-overlay-panel li:hover,
.translation-editor-page .p-dropdown-panel li:hover,
.translation-editor-page .p-multiselect-panel li:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%) !important;
  color: #f1f5f9 !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
  transform: translateX(2px) !important;
}

/* Selected/highlighted items */
.translation-editor-page .p-dropdown-item.p-highlight,
.translation-editor-page .p-multiselect-item.p-highlight,
.translation-editor-page .p-overlay-panel li.p-highlight,
.translation-editor-page .p-dropdown-panel li.p-highlight,
.translation-editor-page .p-multiselect-panel li.p-highlight {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%) !important;
  color: #c7d2fe !important;
  border-color: rgba(99, 102, 241, 0.5) !important;
  font-weight: 600 !important;
}

/* Override any white backgrounds with maximum specificity */
.translation-editor-page .p-dropdown-panel,
.translation-editor-page .p-multiselect-panel,
.translation-editor-page .p-overlay-panel,
.translation-editor-page .p-dropdown-panel *,
.translation-editor-page .p-multiselect-panel *,
.translation-editor-page .p-overlay-panel *,
.translation-editor-page div[class*="p-dropdown"],
.translation-editor-page div[class*="p-multiselect"],
.translation-editor-page div[class*="p-overlay"] {
  background-color: #1e293b !important;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
  color: #e2e8f0 !important;
}

/* Validation Warnings Styles */
.validation-warnings {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.validation-warning-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.validation-warning-item:last-child {
  margin-bottom: 0;
}

.validation-warning-item.warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.validation-warning-item.error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.validation-warning-item i {
  font-size: 1rem;
  flex-shrink: 0;
}

.validation-warning-item span {
  line-height: 1.4;
}

/* Animation for validation warnings */
.validation-warnings {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Validation Info Styles */
.validation-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.validation-hint {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #10b981;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.3rem 0.6rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
}

.validation-hint i {
  font-size: 0.9rem;
}

.validation-text {
  font-size: 0.8rem;
}

/* FORCE WHITE BACKGROUND FOR FILE PREVIEW PANEL */
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
.editor-layout .file-preview-panel .document-content-original *,
.editor-layout .file-preview-panel .word-document-original,
.editor-layout .file-preview-panel .word-document-original * {
  background: white !important;
  background-color: white !important;
  color: #000 !important;
  color: black !important;
}

/* Override any inherited dark backgrounds */
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
.translation-editor-page .editor-layout .file-preview-panel .document-content-original *,
.translation-editor-page .editor-layout .file-preview-panel .word-document-original,
.translation-editor-page .editor-layout .file-preview-panel .word-document-original * {
  background: white !important;
  background-color: white !important;
  color: #000 !important;
  color: black !important;
}

/* Editor Page Navigation Styles */
.editor-page-navigation {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  padding: 0.8em 1em;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  margin-bottom: 1em;
}

.page-nav-btn {
  transition: all 0.3s ease;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
  background: #334155 !important;
  color: #e2e8f0 !important;
}

.page-nav-btn:hover:not(:disabled) {
  background: #475569 !important;
  color: #f1f5f9 !important;
  border-color: rgba(99, 102, 241, 0.6) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

.page-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #1e293b !important;
  color: #64748b !important;
}

.page-number-btn {
  transition: all 0.3s ease;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
  background: #334155 !important;
  color: #e2e8f0 !important;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-number-btn:hover {
  background: #475569 !important;
  color: #f1f5f9 !important;
  border-color: rgba(99, 102, 241, 0.6) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

.page-number-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%) !important;
  color: #fff !important;
  border-color: rgba(99, 102, 241, 0.8) !important;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.3);
  font-weight: 700;
}

/* Page Modal Styles - Light Theme */
.page-selection-modal .p-dialog-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e5e7eb;
  color: #1f2937;
  padding: 1.5rem 2rem;
  border-radius: 12px 12px 0 0;
}

.page-selection-modal .p-dialog-content {
  background: #ffffff;
  color: #1f2937;
  padding: 0;
}

.page-selection-modal .p-dialog-footer {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-top: 1px solid #e5e7eb;
  padding: 1.5rem 2rem;
  border-radius: 0 0 12px 12px;
}

.page-selection-modal .p-dialog {
  border-radius: 16px;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

/* Page Item Styles */
.page-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.page-item:hover {
  background: #f8fafc !important;
  border-color: #3b82f6 !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.page-item.active {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.25);
}

.page-item.active .page-number {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
  color: white !important;
  border-color: #3b82f6 !important;
}

.page-item.active .selection-indicator {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* Search Input Styles */
.page-search-input {
  transition: all 0.3s ease;
}

.page-search-input:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  background: white !important;
}

.page-search-input:hover {
  border-color: #d1d5db !important;
}

/* Scrollbar Styles */
.pages-grid::-webkit-scrollbar {
  width: 10px;
}

.pages-grid::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 8px;
  margin: 4px;
}

.pages-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #d1d5db, #9ca3af);
  border-radius: 8px;
  border: 2px solid #f3f4f6;
}

.pages-grid::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #9ca3af, #6b7280);
}

/* Button Hover Effects */
.modal-btn.secondary:hover {
  background: #f3f4f6 !important;
  border-color: #d1d5db !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* File Icon Animation */
.file-icon {
  animation: bounceIn 0.6s ease-out;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* No Results Animation */
.no-results-icon {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Selection States */
.selection-indicator {
  transition: all 0.3s ease;
}

.selection-hint {
  transition: all 0.3s ease;
}

.page-item:hover .selection-hint {
  background: #f3f4f6 !important;
  border-color: #d1d5db !important;
}
</style>
