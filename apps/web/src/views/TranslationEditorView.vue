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

// Thêm state cho validation dialog
const showValidationDialog = ref(false);
const currentValidationString = ref<any>(null);

// Thêm state cho inline validation warnings
const validationWarnings = ref<Record<string, any[]>>({});

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
  if (!ext) return 'pi pi-file';
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

  // 1. HTML/XML Tags Validation
  const originalTags = (originalText.match(/<[^>]+>/g) || []) as string[];
  const translatedTags = (translatedText.match(/<[^>]+>/g) || []) as string[];
  originalTags.forEach((tag: string) => {
    if (!translatedTags.includes(tag)) {
      warnings.push({
        type: 'missing_html_tag',
        message: `Missing HTML tag: ${tag}`,
        severity: 'error',
        canAutoFix: true,
        autoFixAction: () => translatedText + tag
      });
    }
  });

  // 2. URL/Email Validation
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
        canAutoFix: true,
        autoFixAction: () => translatedText + ' ' + url
      });
    }
  });

  // 3. Character Case Validation
  const originalStartsWithUpper = /^[A-Z]/.test(originalText);
  const translatedStartsWithUpper = /^[A-Z]/.test(translatedText);
  if (originalStartsWithUpper && !translatedStartsWithUpper) {
    warnings.push({
      type: 'case_mismatch',
      message: 'Translation should start with uppercase letter',
      severity: 'warning',
      canAutoFix: true,
      autoFixAction: () => translatedText.charAt(0).toUpperCase() + translatedText.slice(1)
    });
  }

  // Check for ALL CAPS words
  const allCapsWords = (originalText.match(/\b[A-Z]{2,}\b/g) || []) as string[];
  allCapsWords.forEach((word: string) => {
    if (!translatedText.includes(word)) {
      warnings.push({
        type: 'case_mismatch',
        message: `Missing capitalized word: ${word}`,
        severity: 'warning',
        canAutoFix: true,
        autoFixAction: () => translatedText + ' ' + word
      });
    }
  });

  // 4. Currency Validation
  const currencyRegex = /[\$€£¥₹₽₩₪₦₨₱₴₸₺₼₾₿]/g;
  const originalCurrencies = (originalText.match(currencyRegex) || []) as string[];
  const translatedCurrencies = (translatedText.match(currencyRegex) || []) as string[];
  originalCurrencies.forEach((currency: string) => {
    if (!translatedCurrencies.includes(currency)) {
      warnings.push({
        type: 'missing_currency',
        message: `Missing currency symbol: ${currency}`,
        severity: 'error',
        canAutoFix: true,
        autoFixAction: () => translatedText + currency
      });
    }
  });

  // 5. Date/Time Format Validation
  const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/g;
  const originalDates = (originalText.match(dateRegex) || []) as string[];
  const translatedDates = (translatedText.match(dateRegex) || []) as string[];
  originalDates.forEach((date: string) => {
    if (!translatedDates.includes(date)) {
      warnings.push({
        type: 'date_format_mismatch',
        message: `Missing date format: ${date}`,
        severity: 'warning',
        canAutoFix: true,
        autoFixAction: () => translatedText + ' ' + date
      });
    }
  });

  // 6. Context-Aware Validation
  const contextKeywords = {
    error: ['ERROR', 'FAILED', 'CRITICAL', 'EXCEPTION', 'INVALID'],
    success: ['SUCCESS', 'COMPLETED', 'DONE', 'FINISHED', 'OK'],
    warning: ['WARNING', 'CAUTION', 'ATTENTION', 'NOTICE', 'ALERT'],
    action: ['CLICK', 'PRESS', 'SELECT', 'CHOOSE', 'ENTER']
  };

  Object.entries(contextKeywords).forEach(([context, keywords]) => {
    const hasKeyword = keywords.some(keyword =>
      originalText.toUpperCase().includes(keyword)
    );

    if (hasKeyword) {
      const hasSimilarContext = keywords.some(keyword =>
        translatedText.toUpperCase().includes(keyword) ||
        translatedText.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasSimilarContext) {
        warnings.push({
          type: 'context_mismatch',
          message: `Translation should maintain ${context} context`,
          severity: 'warning',
          canAutoFix: false
        });
      }
    }
  });

  // 7. Enhanced Number Validation
  const originalNumbers = (originalText.match(/\d+/g) || []) as string[];
  const translatedNumbers = (translatedText.match(/\d+/g) || []) as string[];
  originalNumbers.forEach((num: string) => {
    if (!translatedNumbers.includes(num)) {
      warnings.push({
        type: 'missing_number',
        message: `Missing number "${num}"`,
        severity: 'warning',
        canAutoFix: true,
        autoFixAction: () => translatedText + num
      });
    }
  });

  // 8. Enhanced Whitespace Validation
  const originalNbsp = (originalText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;
  const translatedNbsp = (translatedText.match(/&nbsp;|&#160;|\u00A0/g) || []).length;
  if (originalNbsp > translatedNbsp) {
    warnings.push({
      type: 'missing_space',
      message: `Missing ${originalNbsp - translatedNbsp} non-breaking space(s)`,
      severity: 'warning',
      canAutoFix: true,
      autoFixAction: () => translatedText + '&nbsp;'.repeat(originalNbsp - translatedNbsp)
    });
  }

  // Check for extra spaces at the end
  if (translatedText.endsWith(' ') && !originalText.endsWith(' ')) {
    warnings.push({
      type: 'extra_space',
      message: 'Source text doesn\'t end with a space, please remove trailing space',
      severity: 'warning',
      canAutoFix: true,
      autoFixAction: () => translatedText.trimEnd()
    });
  }

  // 9. Enhanced Punctuation Validation
  const originalPunct = (originalText.match(/[.,!?;:]/g) || []) as string[];
  const translatedPunct = (translatedText.match(/[.,!?;:]/g) || []) as string[];
  originalPunct.forEach((punct: string) => {
    if (!translatedPunct.includes(punct)) {
      warnings.push({
        type: 'missing_punctuation',
        message: `Missing punctuation "${punct}"`,
        severity: 'warning',
        canAutoFix: true,
        autoFixAction: () => translatedText + punct
      });
    }
  });

  // 10. Enhanced Length Validation
  const lengthRatio = translatedText.length / originalText.length;
  if (lengthRatio < 0.3 || lengthRatio > 3) {
    warnings.push({
      type: 'length_mismatch',
      message: `Length differs significantly (${Math.round(lengthRatio * 100)}% of original)`,
      severity: 'warning',
      canAutoFix: false
    });
  }

  // 11. Enhanced Placeholder Validation
  const originalPlaceholders = (originalText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || []) as string[];
  const translatedPlaceholders = (translatedText.match(/\{[^}]+\}|\%[^%]+\%|\$[^$]+\$/g) || []) as string[];
  originalPlaceholders.forEach((placeholder: string) => {
    if (!translatedPlaceholders.includes(placeholder)) {
      warnings.push({
        type: 'placeholder_mismatch',
        message: `Missing placeholder "${placeholder}"`,
        severity: 'error',
        canAutoFix: true,
        autoFixAction: () => translatedText + placeholder
      });
    }
  });

  return warnings;
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
    // Show validation dialog nếu có vấn đề (giống Crowdin)
    currentValidationString.value = str;
    showValidationDialog.value = true;
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

  // Check for significant length difference
  const lengthRatio = translatedText.length / originalText.length;
  if (lengthRatio < 0.3 || lengthRatio > 3) {
    return true;
  }

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
  // Skip this validation and close dialog
  showValidationDialog.value = false;
  currentValidationString.value = null;
  toast.add({
    severity: 'info',
    summary: 'Skipped',
    detail: 'Validation issues skipped',
    life: 2000
  });
}

function handleValidationAutoFix(warning: any, index: number) {
  if (currentValidationString.value && warning.autoFixAction) {
    // Apply auto-fix
    const fixedText = warning.autoFixAction();
    currentValidationString.value.translatedText = fixedText;

    // Update validation warnings
    updateValidationWarnings(currentValidationString.value);

    toast.add({
      severity: 'success',
      summary: 'Auto-fixed',
      detail: warning.autoFixDescription || 'Issue auto-fixed',
      life: 2000
    });
  }
}

function handleValidationAutoFixAll() {
  if (currentValidationString.value) {
    // Get all auto-fixable warnings
    const warnings = calculateValidationWarnings(currentValidationString.value);
    const autoFixableWarnings = warnings.filter(w => w.canAutoFix);

    let fixedText = currentValidationString.value.translatedText;

    // Apply all auto-fixes
    autoFixableWarnings.forEach(warning => {
      if (warning.autoFixAction) {
        fixedText = warning.autoFixAction();
      }
    });

    currentValidationString.value.translatedText = fixedText;

    // Update validation warnings
    updateValidationWarnings(currentValidationString.value);

    toast.add({
      severity: 'success',
      summary: 'Auto-fixed All',
      detail: `Fixed ${autoFixableWarnings.length} issues automatically`,
      life: 2000
    });
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
                <div class="validation-info">
                  <span class="validation-hint" title="Translation validation is active">
                    <i class="pi pi-shield-check"></i>
                    <span class="validation-text">Validation Active</span>
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
  </div>

  <!-- Translation Validation Dialog -->
  <TranslationValidationDialog
    :show="showValidationDialog"
    :original-text="currentValidationString?.originalText || ''"
    :translated-text="currentValidationString?.translatedText || ''"
    @close="handleValidationClose"
    @save-anyway="handleValidationSaveAnyway"
    @skip="handleValidationSkip"
    @auto-fix="handleValidationAutoFix"
    @auto-fix-all="handleValidationAutoFixAll"
  />
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

.editor-content {
  width: 100%;
  margin: 0;
  padding: 1rem 0.5rem;
  background: #0f172a;
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



/* Cải thiện status indicators - Thiết kế mới */
.status-indicator {
  position: absolute;
  top: 4px; /* Giảm từ 6px xuống 4px */
  right: 6px; /* Giảm từ 8px xuống 6px */
  display: flex;
  align-items: center;
  gap: 3px; /* Giảm từ 4px xuống 3px */
  z-index: 2;
  pointer-events: none;
}

.status-dot {
  width: 5px; /* Giảm từ 6px xuống 5px */
  height: 5px; /* Giảm từ 6px xuống 5px */
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: help;
}

.status-dot:hover {
  transform: scale(1.3); /* Giảm từ 1.4 xuống 1.3 */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.status-text {
  font-size: 0.65em; /* Giảm từ 0.7em xuống 0.65em */
  font-weight: 600;
  color: #e2e8f0;
  background: rgba(30, 41, 59, 0.95);
  padding: 1px 4px; /* Giảm padding */
  border-radius: 4px; /* Giảm từ 6px xuống 4px */
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
  top: 4px; /* Giảm từ 6px xuống 4px */
  right: 6px; /* Giảm từ 8px xuống 6px */
  font-size: 0.65em; /* Giảm từ 0.75em xuống 0.65em */
  border-radius: 4px; /* Giảm từ 6px xuống 4px */
  padding: 1px 3px; /* Giảm từ 1px 4px */
  display: flex;
  align-items: center;
  z-index: 2;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06); /* Giảm shadow */
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

</style>
