<script setup lang="ts">
import { ref, defineProps, watch, onMounted, computed, nextTick, onBeforeUnmount } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import axiosInstance from '../api';
import { useProjectPermission } from '../composables/useProjectPermission';
import { SUPPORTED_LANGUAGES, type Language } from '../utils/languages';

interface TranslationString {
  id: string;
  originalText: string;
  translatedText: string;
  fileId: string;
}

const props = defineProps<{
  projectId: string | number;
  branchId: string | number | null;
  project?: any;
  members?: any[];
  currentUser?: any;
}>();

// Computed để lấy danh sách ngôn ngữ của project
const projectLanguages = computed(() => {
  if (!props.project?.targetLanguages || props.project.targetLanguages.length === 0) {
    return SUPPORTED_LANGUAGES; // Fallback to all languages if no target languages
  }

  return SUPPORTED_LANGUAGES.filter(lang =>
    props.project.targetLanguages.includes(lang.code)
  );
});

const files = ref<any[]>([]);
const translationStrings = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const expandedFileIds = ref<(string|number)[]>([]);

// Thêm state để track current language để tránh load lại dữ liệu không cần thiết
const currentLoadedLanguage = ref<string>('');

// Thêm state cho ngôn ngữ được chọn
const selectedLanguage = ref<Language | null>(null);

// Computed để set ngôn ngữ mặc định từ project languages
const defaultLanguage = computed(() => {
  if (projectLanguages.value.length > 0) {
    return projectLanguages.value[0];
  }
  return SUPPORTED_LANGUAGES.find(lang => lang.code === 'en') || SUPPORTED_LANGUAGES[0];
});

// Watch để set selectedLanguage khi projectLanguages thay đổi
watch(projectLanguages, (newLanguages) => {
  if (newLanguages.length > 0 && (!selectedLanguage.value || !newLanguages.find(lang => lang.code === selectedLanguage.value?.code))) {
    selectedLanguage.value = newLanguages[0];
  }
}, { immediate: true });

// Thay vì searchQuery/filterStatus toàn cục, dùng map cho từng file
const searchQueryMap = ref<Record<string, string>>({});
const filterStatusMap = ref<Record<string, 'all' | 'translated' | 'untranslated'>>({});
const highlightUntranslated = ref(true);
const sideBySide = ref(false);
const viewMode = ref<'single' | 'side'>('single');
const focusUntranslated = ref(false);



const selectedPartMap = ref<Record<string, number>>({}); // fileId -> part index

// Hàm kiểm tra file đang processing
function isFileProcessing(file: any): boolean {
  return file.status === 'processing';
}

// Expose method để component cha có thể gọi reload files
function reloadFiles() {
  loadFiles();
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

defineExpose({
  reloadFiles
});

const DOCX_STRINGS_PER_PAGE = 100; // DOCX: 100 strings/page

function getTotalParts(fileId: string | number) {
  const arr = stringsByFile.value[fileId] || [];
  // Lọc strings theo filePart
  const file = files.value.find((f: any) => String(f.fileId || f.id) === String(fileId));

  if (!file) {
    // Fallback: chia theo 100 strings/page
    return Math.ceil(arr.length / DOCX_STRINGS_PER_PAGE);
  }

  // Nếu là PDF, chia theo page gốc
  if (file.fileType === 'application/pdf') {
    // Đếm số page khác nhau trong strings
    const pages = new Set<number>();
    arr.forEach((str: any) => {
      const page = str.position?.page || 1;
      pages.add(page);
    });
    return pages.size;
  }

  // Nếu là DOCX hoặc file khác, chia theo 100 strings/page
  return Math.ceil(arr.length / DOCX_STRINGS_PER_PAGE);
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
    const pageNumber = part + 1; // part bắt đầu từ 0, page bắt đầu từ 1
    return arr.filter((str: any) => (str.position?.page || 1) === pageNumber);
  }

  // Nếu là DOCX hoặc file khác, chia theo 100 strings/page
  const start = part * DOCX_STRINGS_PER_PAGE;
  return arr.slice(start, start + DOCX_STRINGS_PER_PAGE);
}

function getStringsCountOfPart(fileId: string | number, part: number) {
  const arr = stringsByFile.value[fileId] || [];
  const file = files.value.find((f: any) => String(f.fileId || f.id) === String(fileId));

  if (!file) {
    // Fallback: chia theo 100 strings/page
    const start = part * DOCX_STRINGS_PER_PAGE;
    return Math.min(DOCX_STRINGS_PER_PAGE, arr.length - start);
  }

  // Nếu là PDF, đếm strings theo page
  if (file.fileType === 'application/pdf') {
    const pageNumber = part + 1; // part bắt đầu từ 0, page bắt đầu từ 1
    return arr.filter((str: any) => (str.position?.page || 1) === pageNumber).length;
  }

  // Nếu là DOCX hoặc file khác, chia theo 100 strings/page
  const start = part * DOCX_STRINGS_PER_PAGE;
  return Math.min(DOCX_STRINGS_PER_PAGE, arr.length - start);
}

async function loadFiles() {
  if (!props.projectId || !props.branchId) return;
  try {
    const res = await axiosInstance.get(`/files/project/${props.projectId}?branchId=${props.branchId}`);
    files.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    files.value = [];
  }
}

async function loadTranslationStrings() {
  if (!props.projectId || !props.branchId) return;

  const currentLanguage = selectedLanguage.value?.code || defaultLanguage.value.code;

  // Kiểm tra xem có cần load lại không
  if (currentLoadedLanguage.value === currentLanguage && translationStrings.value.length > 0) {
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const res = await axiosInstance.get('/translation/strings', {
      params: {
        projectId: props.projectId,
        branchId: props.branchId,
        language: currentLanguage,
      },
    });

    const newStrings = Array.isArray(res.data)
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

    translationStrings.value = newStrings;
    currentLoadedLanguage.value = currentLanguage;
  } catch (e: any) {
    console.error('❌ Error loading translation strings:', e);
    error.value = e.message || 'Failed to load translation strings';
    translationStrings.value = [];
  } finally {
    loading.value = false;
  }
}

const stringsByFile = computed(() => {
  const map: Record<string, any[]> = {};

  // Group by fileId (giữ nguyên dữ liệu gốc cho việc hiển thị)
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

    // Luôn deduplicate khi đếm progress
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
  const q = (searchQueryMap.value[fileId] || '').trim().toLowerCase();
  // Nếu bật focusUntranslated thì chỉ lấy untranslated
  const status = focusUntranslated.value ? 'untranslated' : (filterStatusMap.value[fileId] || 'all');
  return arr.filter((str: any) => {
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
  // Lọc strings theo filePart
  return filtered.filter(str => (str.filePart || 0) === part);
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

const { hasPermission } = useProjectPermission(
  computed(() => props.project || {}),
  computed(() => props.members || []),
  computed(() => props.currentUser || null)
);

const canEditTranslation = computed(() => hasPermission('EditTranslation'));

// Thêm computed để kiểm tra quyền mở editor
const canOpenEditor = computed(() => hasPermission('EditTranslation') || hasPermission('ManageTranslation'));

// Watch cho projectId, branchId và selectedLanguage thay đổi
watch([() => props.projectId, () => props.branchId], () => {
  loadFiles();
  loadTranslationStrings();
});

// Watch riêng cho selectedLanguage thay đổi
watch(selectedLanguage, (newLanguage, oldLanguage) => {
  if (newLanguage?.code !== oldLanguage?.code) {
    loadTranslationStrings();
  }
});

onMounted(() => {
  loadFiles();
  loadTranslationStrings();
  window.addEventListener('file-ready-for-translation', reloadFiles);
});

onBeforeUnmount(() => {
  window.removeEventListener('file-ready-for-translation', reloadFiles);
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

// Thêm trạng thái dirty/saved cho từng chuỗi
function onInput(str: any) {
  str._dirty = true;
  str._saved = false;
}
const toast = useToast();
async function saveTranslation(str: any) {
  console.log('saveTranslation str:', str);
  const id = str.id;
  try {
    const currentLanguage = selectedLanguage.value?.code || defaultLanguage.value.code;
    await axiosInstance.post(`/translation/translate/${id}`, {
      translatedText: str.translatedText,
      language: currentLanguage,
    });
    str._dirty = false;
    str._saved = true;
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Translation saved successfully', life: 2000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Failed to save translation', life: 3000 });
  }
}

// Export translated file (download)
async function exportTranslatedFile(file: any) {
  const fileId = file.fileId || file.id;
  const currentLanguage = selectedLanguage.value?.code || defaultLanguage.value.code;
  try {
    const res = await axiosInstance.get(`/translation/export/download/${fileId}`, {
      params: { language: currentLanguage },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
    // Prefer filename from header; fallback to constructed name
    const disposition = res.headers['content-disposition'] as string | undefined;
    let filename = file.fileName || `export_${fileId}`;
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
    toast.add({ severity: 'success', summary: 'Exported', detail: `Downloaded ${filename}`, life: 2500 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Export failed', detail: e?.message || 'Unable to export file', life: 3000 });
  }
}
</script>

<template>
  <div>
    <!-- Language Selector -->
    <div class="language-selector" style="background: #f8fafc; padding: 0.8rem 1.2rem; border-radius: 10px; margin-bottom: 1.2rem; border: 2px solid #e0e7ff; display: flex; align-items: center; gap: 0.8rem;">
      <div class="language-label" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 600; color: #4f46e5; min-width: 100px; font-size: 0.9rem;">
        <i class="pi pi-globe" style="font-size: 1em;"></i>
        <span>Target Language:</span>
      </div>
      <Dropdown
        v-model="selectedLanguage"
        :options="projectLanguages"
        optionLabel="name"
        placeholder="Select language"
        class="language-dropdown"
        style="min-width: 200px;"
        :disabled="projectLanguages.length === 0"
      >
        <template #option="slotProps">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-weight: 500; font-size: 0.9rem;">{{ slotProps.option.name }}</span>
            <span style="color: #6b7280; font-size: 0.8rem;">({{ slotProps.option.nativeName }})</span>
          </div>
        </template>
        <template #value="slotProps">
          <div v-if="slotProps.value" style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-weight: 600; font-size: 0.9rem;">{{ slotProps.value.name }}</span>
            <span style="color: #6b7280; font-size: 0.8rem;">({{ slotProps.value.nativeName }})</span>
          </div>
        </template>
      </Dropdown>
      <div v-if="projectLanguages.length > 0" class="language-info" style="display: flex; align-items: center; gap: 0.4rem; color: #6b7280; font-size: 0.8rem;">
        <i class="pi pi-info-circle" style="font-size: 0.8rem;"></i>
        <span>{{ projectLanguages.length }} language{{ projectLanguages.length > 1 ? 's' : '' }} available</span>
      </div>
      <div v-else class="language-info" style="display: flex; align-items: center; gap: 0.4rem; color: #ef4444; font-size: 0.8rem;">
        <i class="pi pi-exclamation-triangle" style="font-size: 0.8rem;"></i>
        <span>No target languages configured for this project</span>
      </div>

    </div>

    <div v-if="loading">Loading translation strings...</div>
    <div v-else-if="error" style="color:red">{{ error }}</div>
    <div v-else>
      <div v-if="files.length === 0">No files found for this branch.</div>
      <div v-if="files.some(f => f.fileName && f.fileName.toLowerCase().endsWith('.docx'))" class="docx-toc-hint" style="background:#e0e7ff;padding:10px 15px;border-radius:8px;margin-bottom:15px;color:#374151;font-size:0.95rem;display:flex;align-items:center;gap:0.6em;">
        <i class="pi pi-info-circle" style="color:#6366f1;font-size:1.1rem;"></i>
        <span><b>Note:</b> After translating, open the DOCX file and right-click on the Table of Contents → select <b>"Update Field"</b> → <b>"Update entire table"</b> to automatically refresh the table of contents formatting.</span>
      </div>
      <div v-for="file in files" :key="file.fileId || file.id" class="file-accordion" style="margin-bottom: 1.5em;">
        <div class="file-header" style="cursor: default; background: #e0e7ff; border-radius: 14px; box-shadow: none;">
          <span class="file-name" style="color: #4f46e5; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.6em;">
            <i :class="getFileIconClass(file.fileName)" style="font-size:1.1rem;margin-right:0.15em;"></i>
            {{ file.fileName }}
          </span>
          <div class="progress-bar-wrapper" style="font-weight: 600; color: #222; min-width: 70px; font-size: 0.9rem;">
            {{ fileProgress[file.fileId || file.id]?.translated || 0 }} / {{ fileProgress[file.fileId || file.id]?.total || 0 }}
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-left:0.8rem;">
            <a
              :href="canOpenEditor ? `/projects/${props.projectId}/branches/${props.branchId}/translate?fileId=${file.fileId || file.id}&language=${selectedLanguage?.code || 'en'}` : '#'"
              class="open-translator-btn"
              :class="{ 'disabled': !canOpenEditor }"
              style="background: #7c5dfa; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; font-size: 0.9rem;"
              @mouseenter="canOpenEditor && ($event.target.style.background = '#5f43ea')"
              @mouseleave="canOpenEditor && ($event.target.style.background = '#7c5dfa')"
              :title="!canOpenEditor ? 'You do not have permission to open the translation editor (requires EditTranslation or ManageTranslation permission)' : ''"
              @click="!canOpenEditor && $event.preventDefault()"
            >
              <i class="pi pi-external-link" style="font-size: 0.9rem;"></i>
              Open Editor
            </a>
            <button
              class="open-translator-btn"
              style="background: #10b981; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 600; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; font-size: 0.9rem;"
              @mouseenter="$event.target.style.background = '#0ea371'"
              @mouseleave="$event.target.style.background = '#10b981'"
              title="Export translated file (download)"
              @click="exportTranslatedFile(file)"
            >
              <i class="pi pi-download" style="font-size: 0.9rem;"></i>
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-accordion {
  border: 2px solid #e0e7ff;
  border-radius: 16px;
  margin-bottom: 1.8em;
  background: #f7f8fd;
  box-shadow: 0 3px 15px #b3b3e622;
  transition: box-shadow 0.22s, border 0.22s;
  overflow: hidden;
}
.file-accordion:hover {
  box-shadow: 0 10px 32px #6366f122;
  border-color: #6366f1;
}
.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1em 1.8em 1.1em 2em;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  background: linear-gradient(90deg, #f8fafc 60%, #e0e7ff 100%);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 2px 8px #b3b3e611;
  transition: background 0.18s, box-shadow 0.18s;
  position: relative;
  min-height: 56px;
}
.file-header:hover {
  background: linear-gradient(90deg, #e0e7ff 60%, #ececff 100%);
  box-shadow: 0 4px 16px #6366f122;
}
.file-name {
  flex: 1;
  color: #4f46e5;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.6em;
}
.file-folder-icon {
  color: #6366f1;
  font-size: 1.1rem;
  margin-right: 0.15em;
}
.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.6em;
  min-width: 120px;
}
.progress-bar {
  width: 140px;
  height: 18px;
  background: #f1f5f9;
  border-radius: 10px;
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
  font-size: 1em;
  min-width: 60px;
  text-align: right;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin-left: 0.7em;
}
.accordion-arrow {
  font-size: 1.5em;
  color: #888;
  margin-left: 0.7em;
  transition: transform 0.22s;
  display: flex;
  align-items: center;
}
.accordion-arrow.open {
  transform: rotate(180deg);
  color: #6366f1;
}
.file-strings-list {
  padding: 2em 2.5em 1.5em 2.5em;
  background: #fafdff;
  border-radius: 0 0 20px 20px;
}
@media (max-width: 700px) {
  .file-header {
    padding: 1.1em 1em 1.1em 1.2em;
    font-size: 1em;
    min-height: 48px;
  }
  .file-strings-list {
    padding: 1.2em 0.5em 1em 0.5em;
  }
}
.string-card {
  background: #f7f9fc;
  border-radius: 18px;
  padding: 1.5em 1.5em 1.2em 1.5em;
  border: 2px solid #d1d5fa;
  position: relative;
  margin-bottom: 1.5em;
  transition: background 0.18s, border 0.18s, box-shadow 0.18s;
  box-shadow: 0 2px 8px #b3b3e622;
}
.string-card:hover {
  box-shadow: 0 6px 20px #6366f122;
  border-color: #6366f1;
  background: #f8fafc;
}
.string-card.untranslated {
  border: 2px solid #e0f7fa;
  background: #f0f4ff;
  box-shadow: 0 2px 12px #b3e5fc33;
}
.string-card.translated {
  border: 2px solid #38a169;
  background: #e6fffa;
  box-shadow: 0 2px 12px #38a16922;
}
.untranslated-badge {
  position: absolute;
  top: 12px;
  right: 18px;
  background: #e0f7fa;
  color: #039be5;
  font-size: 1em;
  border-radius: 8px;
  padding: 2px 8px;
  display: flex;
  align-items: center;
  z-index: 2;
  cursor: help;
  box-shadow: 0 1px 4px #b3e5fc44;
}
.translated-badge {
  position: absolute;
  top: 12px;
  right: 18px;
  background: #38a169;
  color: #fff;
  font-size: 1em;
  border-radius: 8px;
  padding: 2px 8px;
  display: flex;
  align-items: center;
  z-index: 2;
  box-shadow: 0 1px 4px #38a16944;
}
.original-label, .translation-label {
  font-size: 1em;
  color: #6366f1;
  font-weight: 600;
  margin-bottom: 0.1em;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.original-label::before {
  content: '\f15c';
  font-family: 'PrimeIcons';
  font-size: 1.1em;
  color: #a0aec0;
  margin-right: 0.3em;
}
.translation-label::before {
  content: '\f040';
  font-family: 'PrimeIcons';
  font-size: 1.1em;
  color: #38a169;
  margin-right: 0.3em;
}
.original-text {
  font-size: 1.08em;
  color: #22223b;
  margin-bottom: 0.5em;
  background: #f3f4fa;
  border-radius: 8px;
  padding: 0.7em 1.1em;
  border: 1.5px solid #e0e7ff;
  word-break: break-word;
}
.translation-input {
  width: 100%;
  border-radius: 10px;
  border: 2px solid #b3b3e6;
  padding: 0.9em 1.1em;
  font-size: 1.07em;
  min-height: 38px;
  resize: none;
  transition: border 0.18s, box-shadow 0.18s, background 0.18s;
  font-family: inherit;
}
.translation-input:focus {
  border: 2px solid #6366f1;
  box-shadow: 0 2px 8px #6366f122;
  background: #fff;
}
@media (max-width: 600px) {
  .string-card {
    padding: 1em 0.7em 0.7em 0.7em;
    border-radius: 12px;
    font-size: 1em;
  }
  .original-text, .translation-input {
    font-size: 1em;
    padding: 0.6em 0.7em;
  }
}
.search-filter-bar {
  display: flex;
  align-items: center;
  gap: 1.2em;
  background: #f8fafc;
  padding: 0.7em 1.2em;
  border-radius: 10px;
  margin-bottom: 1.2em;
  flex-wrap: wrap;
}
.search-icon {
  color: #6366f1;
  font-size: 1.2em;
  margin-right: -0.5em;
}
.search-input {
  min-width: 180px;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  padding: 8px 14px 8px 32px;
  font-size: 1em;
}
.filter-group {
  display: flex;
  gap: 0.7em;
  margin-left: 1em;
  flex-wrap: wrap;
}
.filter-radio {
  font-size: 1em;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.3em;
}
.filter-radio input[type='radio'] {
  accent-color: #6366f1;
}
.filter-group-btn {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.filter-btn {
  border: none;
  background: #e0e7ff;
  color: #374151;
  padding: 0.5em 1.2em;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  outline: none;
  font-size: 1em;
  box-shadow: 0 1px 4px #6366f111;
}
.filter-btn.active {
  background: linear-gradient(90deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  box-shadow: 0 2px 8px #6366f122;
}
.filter-btn:focus {
  outline: 2px solid #6366f1;
}
.filter-help {
  color: #6366f1;
  margin-left: 0.5em;
  cursor: help;
  font-size: 1.2em;
}
@media (max-width: 600px) {
  .search-filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7em;
    padding: 0.7em 0.5em;
  }
  .filter-group {
    margin-left: 0;
    gap: 0.5em;
  }
  .search-input {
    min-width: 100px;
    width: 100%;
  }
  .filter-group-btn {
    flex-direction: column;
    align-items: stretch;
    gap: 0.3em;
  }
  .filter-btn {
    width: 100%;
    padding: 0.7em 1em;
  }
}
.status-icon {
  margin-right: 0.3em;
  font-size: 1.1em;
  vertical-align: middle;
}
.text-green { color: #38a169; }
.text-yellow { color: #fbbf24; }
.text-red { color: #e53e3e; }
.save-btn {
  position: static;
  margin: 0;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.3em 0.7em;
  font-size: 1.1em;
  cursor: pointer;
  box-shadow: 0 2px 8px #6366f122;
  transition: background 0.18s;
  z-index: 3;
}
.save-btn:hover {
  background: #38a169;
}
.saved-check {
  position: static;
  margin: 0;
  color: #38a169;
  font-size: 1.2em;
  z-index: 3;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 0.5em;
  gap: 0.5em;
}
.translation-scroll-area {
  max-height: 75vh;
  min-height: 200px;
  overflow-y: auto;
  padding-right: 8px;
  scrollbar-width: thin;
  scrollbar-color: #b3b3e6 #f7f9fc;
  border-top: 1.5px solid #e0e7ef;
  margin-top: 1.2em;
}
.translation-scroll-area::-webkit-scrollbar {
  width: 8px;
  background: #f7f9fc;
}
.translation-scroll-area::-webkit-scrollbar-thumb {
  background: #b3b3e6;
  border-radius: 8px;
}
.advanced-options {
  display: flex;
  align-items: center;
  gap: 1.5em;
  margin-bottom: 1.2em;
  margin-top: 0.5em;
}
.highlight-toggle {
  font-size: 1em;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.side-by-side-btn {
  background: #e0e7ff;
  color: #374151;
  border: none;
  border-radius: 8px;
  padding: 0.5em 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  font-size: 1em;
  box-shadow: 0 1px 4px #6366f111;
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.side-by-side-btn.active {
  background: linear-gradient(90deg, #6366f1 0%, #7c3aed 100%);
  color: #fff;
  box-shadow: 0 2px 8px #6366f122;
}
.string-card.side-by-side {
  display: flex;
  flex-direction: row;
  gap: 2em;
  align-items: flex-start;
}
.side-by-side-row {
  display: flex;
  flex-direction: row;
  gap: 2em;
  width: 100%;
}
.side-original, .side-translation {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7em;
}
@media (max-width: 900px) {
  .string-card.side-by-side, .side-by-side-row {
    flex-direction: column;
    gap: 1em;
  }
}
.view-mode-toggle {
  display: inline-flex;
  gap: 1.2em;
  align-items: center;
  margin-right: 1.5em;
}
.view-mode-toggle label {
  font-weight: 500;
  color: #6366f1;
  cursor: pointer;
  margin-right: 0.7em;
}
.focus-toggle {
  margin-left: 1.5em;
  font-weight: 500;
  color: #039be5;
  cursor: pointer;
}
.part-btn.active {
  background: linear-gradient(90deg, #6366f1 0%, #7c3aed 100%) !important;
  color: #fff !important;
}
.disabled-processing {
  pointer-events: none;
  opacity: 0.5;
}
.processing-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
}
.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.7);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Language Selector Styles */
.language-selector {
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  border: 2px solid #e0e7ff;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.language-selector:hover {
  border-color: #6366f1;
  box-shadow: 0 2px 8px #6366f122;
}

.language-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #4f46e5;
  min-width: 120px;
}

.language-dropdown {
  min-width: 200px;
}

.language-dropdown .p-dropdown {
  border: 2px solid #e0e7ff;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.language-dropdown .p-dropdown:not(.p-disabled):hover {
  border-color: #6366f1;
  box-shadow: 0 2px 8px #6366f122;
}

.language-dropdown .p-dropdown:not(.p-disabled).p-focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px #6366f122;
}

.language-dropdown .p-dropdown-label {
  font-weight: 500;
  color: #374151;
}

.language-dropdown .p-dropdown-trigger {
  color: #6366f1;
}

.language-dropdown .p-dropdown.p-disabled {
  opacity: 0.6;
  background: #f3f4f6;
  border-color: #d1d5db;
}

.language-dropdown .p-dropdown.p-disabled .p-dropdown-label {
  color: #9ca3af;
}

.language-dropdown .p-dropdown.p-disabled .p-dropdown-trigger {
  color: #9ca3af;
}



@media (max-width: 768px) {
  .language-selector {
    flex-direction: column;
    align-items: stretch;
    gap: 0.8rem;
  }

  .language-label {
    min-width: auto;
    justify-content: center;
  }

  .language-dropdown {
    min-width: 100%;
  }
}

/* Disabled button styles */
.open-translator-btn.disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  filter: grayscale(0.3);
  pointer-events: none;
  background: #a0aec0 !important;
  color: #e2e8f0 !important;
}

.open-translator-btn.disabled:hover {
  background: #a0aec0 !important;
  color: #e2e8f0 !important;
  transform: none !important;
  box-shadow: none !important;
}
</style>
