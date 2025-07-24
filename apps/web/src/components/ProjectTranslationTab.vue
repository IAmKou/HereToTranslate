<script setup lang="ts">
import { ref, defineProps, watch, onMounted, computed, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import axiosInstance from '../api';
import { useProjectPermission } from '../composables/useProjectPermission';

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

const files = ref<any[]>([]);
const translationStrings = ref<any[]>([]);
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

const PART_SIZE = 250;
const selectedPartMap = ref<Record<string, number>>({}); // fileId -> part index

// Hàm kiểm tra file đang processing
function isFileProcessing(file: any): boolean {
  return file.status === 'processing';
}

function getTotalParts(fileId: string | number) {
  const arr = stringsByFile.value[fileId] || [];
  return Math.ceil(arr.length / PART_SIZE);
}
function getStringsOfPart(fileId: string | number, part: number) {
  const arr = stringsByFile.value[fileId] || [];
  const start = part * PART_SIZE;
  return arr.slice(start, start + PART_SIZE);
}

function getStringsCountOfPart(fileId: string | number, part: number) {
  const arr = stringsByFile.value[fileId] || [];
  const start = part * PART_SIZE;
  return Math.min(PART_SIZE, arr.length - start);
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
  loading.value = true;
  error.value = '';
  try {
    const res = await axiosInstance.get('/translation/strings', {
      params: {
        projectId: props.projectId,
        branchId: props.branchId,
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
    progress[fileId] = {
      total: arr.length,
      translated: arr.filter(s => s.translatedText && s.translatedText.trim().length > 0).length,
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

watch(() => [props.projectId, props.branchId], () => {
  loadFiles();
  loadTranslationStrings();
}, { immediate: true });

onMounted(() => {
  loadFiles();
  loadTranslationStrings();
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
    await axiosInstance.post(`/translation/translate/${id}`, {
      translatedText: str.translatedText
    });
    str._dirty = false;
    str._saved = true;
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Translation saved successfully', life: 2000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Failed to save translation', life: 3000 });
  }
}
</script>

<template>
  <div>
    <div v-if="loading">Loading translation strings...</div>
    <div v-else-if="error" style="color:red">{{ error }}</div>
    <div v-else>
      <div v-if="files.length === 0">No files found for this branch.</div>
      <div v-if="files.some(f => f.fileName && f.fileName.toLowerCase().endsWith('.docx'))" class="docx-toc-hint" style="background:#e0e7ff;padding:12px 18px;border-radius:10px;margin-bottom:18px;color:#374151;font-size:1.08em;display:flex;align-items:center;gap:0.7em;">
        <i class="pi pi-info-circle" style="color:#6366f1;font-size:1.3em;"></i>
        <span><b>Note:</b> After translating, open the DOCX file and right-click on the Table of Contents → select <b>"Update Field"</b> → <b>"Update entire table"</b> to automatically refresh the table of contents formatting.</span>
      </div>
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
            </div>
            <div class="translation-scroll-area">
              <div v-if="getStringsOfPart(file.fileId || file.id, selectedPartMap[file.fileId || file.id] ?? 0).length === 0" class="no-strings">No matching strings.</div>
              <div
                v-for="str in getStringsOfPart(file.fileId || file.id, selectedPartMap[file.fileId || file.id] ?? 0)"
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
                    <textarea
                      class="translation-input"
                      v-model="str.translatedText"
                      placeholder="Enter translation..."
                      @input="e => { autoResize(e); onInput(str); }"
                      rows="1"
                      :ref="el => setTextareaRef(str.id, el)"
                      :disabled="isFileProcessing(file)"
                    ></textarea>
                    <div class="card-actions">
                      <button
                        v-if="str.translatedText && str.translatedText.trim()"
                        class="save-btn"
                        @click="saveTranslation(str)"
                        :disabled="!str._dirty || !str.translatedText || !str.translatedText.trim() || isFileProcessing(file)"
                        title="Save"
                        type="button"
                      >💾 Save</button>
                    </div>
                  </div>
                </div>
                <template v-else>
                  <div class="original-label">Original Text:</div>
                  <div class="original-text" v-html="str.originalText"></div>
                  <div class="translation-label">Translation:</div>
                  <textarea
                    class="translation-input"
                    v-model="str.translatedText"
                    placeholder="Enter translation..."
                    @input="e => { autoResize(e); onInput(str); }"
                    rows="1"
                    :ref="el => setTextareaRef(str.id, el)"
                    :disabled="isFileProcessing(file)"
                  ></textarea>
                  <div class="card-actions">
                    <button
                      v-if="str.translatedText && str.translatedText.trim()"
                      class="save-btn"
                      @click="saveTranslation(str)"
                      :disabled="!str._dirty || !str.translatedText || !str.translatedText.trim() || isFileProcessing(file)"
                      title="Save"
                      type="button"
                    >💾 Save</button>
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
</template>

<style scoped>
.file-accordion {
  border: 2px solid #e0e7ff;
  border-radius: 20px;
  margin-bottom: 2.2em;
  background: #f7f8fd;
  box-shadow: 0 4px 18px #b3b3e622;
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
  padding: 1.3em 2em 1.3em 2.2em;
  font-weight: 700;
  font-size: 1.15em;
  cursor: pointer;
  background: linear-gradient(90deg, #f8fafc 60%, #e0e7ff 100%);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 2px 8px #b3b3e611;
  transition: background 0.18s, box-shadow 0.18s;
  position: relative;
  min-height: 64px;
}
.file-header:hover {
  background: linear-gradient(90deg, #e0e7ff 60%, #ececff 100%);
  box-shadow: 0 4px 16px #6366f122;
}
.file-name {
  flex: 1;
  color: #4f46e5;
  font-size: 1.13em;
  display: flex;
  align-items: center;
  gap: 0.7em;
}
.file-folder-icon {
  color: #6366f1;
  font-size: 1.25em;
  margin-right: 0.2em;
}
.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.7em;
  min-width: 140px;
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
</style>
