<script setup lang="ts">
import { ref, defineProps, computed, watch, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import type { AxiosProgressEvent } from 'axios';
import axiosInstance from '../api';
import { useProjectMemberPermissions } from '../composables/useProjectMemberPermissions';
import { parsePermissionFlags } from '../utils/permissions';
import { isSidebarCollapsed } from '../store/sidebar';

interface ProjectFile {
  id: string | number;
  fileName: string;
  title?: string | null;
  projectId?: string | number;
  children?: ProjectFile[];
  strings?: number;
  revision?: string;
  status?: 'processing' | 'ready' | 'error';
  syncedFromRequest?: boolean;
  fileId?: string | number;
}

const props = defineProps<{
  projectId: string | number;
  filesLoading: boolean;
  filesError: string;
  projectFiles: ProjectFile[];
  loadFiles: () => void;
  downloadFile: (file: ProjectFile) => void;
  isImage?: (fileName: string) => boolean;
  isPDF?: (fileName: string) => boolean;
  project?: any;
  members?: any[];
  currentUser?: any;
}>();

const emit = defineEmits<{
  fileReady: [fileId: string | number];
}>();

const toast = useToast();
const uploading = ref(false);
const uploadError = ref('');
const uploadInput = ref<HTMLInputElement | null>(null);
// Batch upload with per-file titles
const showTitleDialog = ref(false);
const filesToUpload = ref<File[]>([]);
const titles = ref<string[]>([]);
const titlesFilled = computed(() => titles.value.length > 0 && titles.value.every((t: string) => !!t && t.trim().length > 0));
const searchValue = ref('');

const searchLoading = ref(false);
const searchResults = ref<any[]>([]);
const searchQuery = ref('');

const dropdownOpenId = ref<string | number | null>(null);
const dropdownMenuRefs = ref<Record<string, any>>({});
const ellipsisBtnRefs = ref<Record<string, any>>({});

function toggleDropdown(id: string | number) {
  dropdownOpenId.value = dropdownOpenId.value === id ? null : id;
}

function setDropdownMenuRef(id: string | number) {
  return (el: any) => {
    dropdownMenuRefs.value[id] = el;
  };
}
function setEllipsisBtnRef(id: string | number) {
  return (el: any) => {
    ellipsisBtnRefs.value[id] = el;
  };
}

function handleClickOutside(event: MouseEvent) {
  if (!dropdownOpenId.value) return;
  const menuEl = dropdownMenuRefs.value[dropdownOpenId.value];
  const btnEl = ellipsisBtnRefs.value[dropdownOpenId.value];
  if (menuEl && menuEl.contains(event.target as Node)) return;
  if (btnEl && btnEl.contains(event.target as Node)) return;
  dropdownOpenId.value = null;
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('scroll', () => { dropdownOpenId.value = null; }, true);

  // Thêm event listener cho inline editing
  document.addEventListener('mousedown', (event) => {
    if (editingFileId.value) {
      const target = event.target as HTMLElement;
      if (!target.closest('.inline-edit-container')) {
        confirmRename();
      }
    }
  });
});
const lastUploadedFileId = ref<string | number | null>(null);
let pollingTimer: any = null;

// Helpers to validate file content
function isTextLikeFile(file: File): boolean {
  if (!file) return false;
  const ext = (() => {
    const parts = file.name.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() as string : '';
  })();
  const textExtensions = new Set(['txt', 'csv', 'json', 'xml', 'html', 'htm', 'md']);
  return file.type.startsWith('text/') || textExtensions.has(ext);
}

async function hasMeaningfulContent(file: File): Promise<boolean> {
  try {
    if (!isTextLikeFile(file)) {
      // For non-text types, skip deep client validation
      return true;
    }
    const text = await file.text();
    // Consider only non-whitespace as meaningful
    return /\S/.test(text);
  } catch {
    return true;
  }
}

function startPollingFileStatus(fileId: string | number) {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(async () => {
    try {
      const res = await axiosInstance.get(`/files/${fileId}`);
      const file = res.data;
      if (!file) {
        // File chưa có trong DB, tiếp tục polling
        return;
      }
      if (file.status === 'ready' || file.status === 'error') {
        clearInterval(pollingTimer);
        pollingTimer = null;
        props.loadFiles();
        if (file.status === 'ready') {
          toast.add({ severity: 'success', summary: 'Success', detail: 'File is ready for translation!', life: 3000 });
          window.dispatchEvent(new Event('file-ready-for-translation'));
          emit('fileReady', fileId);
        } else {
          toast.add({ severity: 'warn', summary: 'Warning', detail: 'File processing failed. Please try again.', life: 3000 });
        }
      }
    } catch (e) {
      // ignore
    }
  }, 5000);
}
const renameInput = ref('');
const showRenameDialog = ref(false);
const editingFileId = ref<string | number | null>(null);
const editingFileName = ref('');
const showDeleteDialog = ref(false);
const fileToDelete = ref<any>(null);
const showRevisionDialog = ref(false);
const revisionFile = ref<any>(null);
const deletingFile = ref(false);
const uploadProgress = ref(0);
const uploadPhase = ref<'uploading' | 'processing' | null>(null);
// Set title dialog state
const showSetTitleDialog = ref(false);
const editingTitleFileId = ref<string | number | null>(null);
const editingTitleInput = ref('');

function triggerUpload() {
  uploadError.value = '';
  if (uploadInput.value) {
    uploadInput.value.value = '';
    uploadInput.value.click();
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const maxSize = 10 * 1024 * 1024; // 10MB
  const selected = Array.from(input.files);
  // Validate sizes first
  for (const f of selected) {
    if (f.size === 0) {
      uploadError.value = `File ${f.name} is empty. Please choose a file with content.`;
      toast.add({ severity: 'error', summary: 'Empty file', detail: uploadError.value, life: 4000 });
      if (uploadInput.value) uploadInput.value.value = '';
      return;
    }
    if (f.size > maxSize) {
      uploadError.value = `File ${f.name} is too large. Maximum size is 10MB.`;
      toast.add({ severity: 'error', summary: 'File too large', detail: uploadError.value, life: 4000 });
      if (uploadInput.value) uploadInput.value.value = '';
      return;
    }
  }
  // For text-like files, ensure they have meaningful (non-whitespace) content
  for (const f of selected) {
    if (isTextLikeFile(f)) {
      const ok = await hasMeaningfulContent(f);
      if (!ok) {
        uploadError.value = `File ${f.name} has no text content. Please choose a file with content.`;
        toast.add({ severity: 'error', summary: 'Empty content', detail: uploadError.value, life: 4000 });
        if (uploadInput.value) uploadInput.value.value = '';
        return;
      }
    }
  }
  filesToUpload.value = selected;
  titles.value = selected.map(() => '');
  // Upload immediately without requiring titles
  await uploadFilesImmediately();
}

async function uploadSingleFile(file: File, title: string) {
  if (file.size === 0) {
    throw new Error(`File "${file.name}" is empty. Please choose a non-empty file.`);
  }
  if (isTextLikeFile(file)) {
    const ok = await hasMeaningfulContent(file);
    if (!ok) {
      throw new Error(`File "${file.name}" has no content. Please choose a file with text content.`);
    }
  }
  const formData = new FormData();
  formData.append('file', file);
  const projectId = props.projectId;
  if (!projectId) throw new Error('Project ID not found');
  formData.append('projectId', projectId.toString());
  formData.append('title', title);
  let response;
  try {
    response = await axiosInstance.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        const total = typeof progressEvent.total === 'number' ? progressEvent.total : undefined;
        if (total && progressEvent.loaded != null) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / total);
        }
      }
    });
  } catch (e: any) {
    let serverMsg: any = e?.response?.data?.message ?? e?.response?.data?.error;
    if (Array.isArray(serverMsg)) serverMsg = serverMsg.join(', ');
    let msg: string = serverMsg || e?.message || 'Upload failed';
    // Chuyển thông điệp server sang tiếng Việt thân thiện nếu là file rỗng
    if (/no extractable text content|empty content|empty file/i.test(msg)) {
      msg = 'File is empty. Please choose a file with content.';
    }
    throw new Error(msg);
  }
  const respData = response.data;
  const isUpdate = respData?.updated;
  const message = isUpdate
    ? `File "${file.name}" updated successfully!`
    : `File "${file.name}" uploaded successfully!`;
  toast.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });
  // Refresh list and poll last file
  props.loadFiles();
  lastUploadedFileId.value = respData && respData.fileId ? respData.fileId : null;
  if (lastUploadedFileId.value) {
    startPollingFileStatus(lastUploadedFileId.value);
  }
}

async function uploadFilesWithTitles() {
  if (!props.projectId) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Project ID not found', life: 3000 });
    return;
  }
  if (!titlesFilled.value) {
    toast.add({ severity: 'warn', summary: 'Missing title', detail: 'Please enter a title for each file.', life: 2500 });
    return;
  }
  // Validate that none of the files are empty before uploading
  const empty = filesToUpload.value.find((f: File) => f.size === 0);
  if (empty) {
    toast.add({ severity: 'error', summary: 'Empty file', detail: `File "${empty.name}" is empty. Please choose a file with content.`, life: 4000 });
    return;
  }
  // Validate text-like files for meaningful content
  for (const f of filesToUpload.value) {
    if (isTextLikeFile(f)) {
      const ok = await hasMeaningfulContent(f);
      if (!ok) {
        toast.add({ severity: 'error', summary: 'Empty content', detail: `File "${f.name}" has no text content. Please choose a file with content.`, life: 4000 });
        return;
      }
    }
  }
  showTitleDialog.value = false;
  uploadError.value = '';
  uploading.value = true;
  uploadProgress.value = 0;
  uploadPhase.value = 'uploading';
  try {
    for (let i = 0; i < filesToUpload.value.length; i++) {
      const file = filesToUpload.value[i];
      const title = titles.value[i];
      await uploadSingleFile(file, title);
    }
  } catch (e: any) {
    const msg = e?.message || 'Upload failed';
    uploadError.value = msg;
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 });
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    uploadPhase.value = null;
    filesToUpload.value = [];
    titles.value = [];
  }
}

// New: upload immediately, without title input
async function uploadFilesImmediately() {
  if (!props.projectId) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Project ID not found', life: 3000 });
    return;
  }
  uploadError.value = '';
  uploading.value = true;
  uploadProgress.value = 0;
  uploadPhase.value = 'uploading';
  try {
    for (let i = 0; i < filesToUpload.value.length; i++) {
      const file = filesToUpload.value[i];
      await uploadSingleFile(file, '');
    }
  } catch (e: any) {
    const msg = e?.message || 'Upload failed';
    uploadError.value = msg;
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 });
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    uploadPhase.value = null;
    filesToUpload.value = [];
    titles.value = [];
  }
}

function getFileIcon(fileName: string): string {
  if (!fileName) return 'pi pi-file';
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'pi pi-file-word';
  if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'pi pi-file-excel';
  if (fileName.endsWith('.pdf')) return 'pi pi-file-pdf';
  if (fileName.endsWith('.txt')) return 'pi pi-file';
  return 'pi pi-file';
}

// Removed unused slot generators

// Thêm computed filteredFiles để search
const filteredFiles = computed(() => {
  if (!searchValue.value) return props.projectFiles;
  return props.projectFiles.filter((f: any) => f.fileName.toLowerCase().includes(searchValue.value.toLowerCase()));
});

// Removed unused slot helpers and parser

// Fuzzy search helper (simple, case-insensitive, partial match)
function fuzzyMatch(str: string, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  const s = str.toLowerCase();
  let i = 0;
  for (let c of q) {
    i = s.indexOf(c, i);
    if (i === -1) return false;
    i++;
  }
  return true;
}

// Tìm kiếm và gợi ý gần đúng
watch(searchValue, (val: string) => {
  searchQuery.value = val;
  searchLoading.value = true;
  setTimeout(() => {
    if (!val) {
      searchResults.value = props.projectFiles;
    } else {
      searchResults.value = props.projectFiles.filter((f: ProjectFile) => {
        const base = f.fileName;
        if (fuzzyMatch(base, val)) return true;
        return false;
      });
    }
    searchLoading.value = false;
  }, 350);
}, { immediate: true });

function handleAction(action: string, fileId: string | number) {
  const file = props.projectFiles.find((f: ProjectFile) => f.id === fileId || (f as any).fileId === fileId);
  if (!file) {
    console.warn('File not found for id:', fileId);
    return;
  }
  console.log('handleAction', action, file);
  if (action === 'download') {
    props.downloadFile(file);
  } else if (action === 'rename') {
    editingFileId.value = (file.id ?? file.fileId) ?? null;
    editingFileName.value = file.fileName;
  } else if (action === 'set-title') {
    editingTitleFileId.value = (file.id ?? file.fileId) ?? null;
    editingTitleInput.value = file.title || '';
    showSetTitleDialog.value = true;
  } else if (action === 'delete') {
    fileToDelete.value = { ...file };
    showDeleteDialog.value = true;
    isSidebarCollapsed.value = true;
    console.log('Open delete modal for file:', fileToDelete.value);
  } else if (action === 'revisions') {
    revisionFile.value = file;
    showRevisionDialog.value = true;
  }
  dropdownOpenId.value = null; // Close dropdown after action
}
async function confirmRename() {
  if (!editingFileId.value || !editingFileName.value.trim()) {
    editingFileId.value = null;
    editingFileName.value = '';
    return;
  }

  try {
    // Gọi API để rename file
    await axiosInstance.patch(`/files/${editingFileId.value}`, {
      fileName: editingFileName.value.trim()
    });

    // Reload files để cập nhật UI
    props.loadFiles();

    // Hiện thông báo thành công
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'File renamed successfully!',
      life: 3000
    });
  } catch (e: any) {
    let msg = 'Rename failed';
    if (e?.response?.data?.message) {
      msg = e.response.data.message;
    } else if (e?.response?.data?.error) {
      msg = e.response.data.error;
    } else if (e?.message) {
      msg = e.message;
    }
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 });
  } finally {
    editingFileId.value = null;
    editingFileName.value = '';
  }
}

function cancelRename() {
  editingFileId.value = null;
  editingFileName.value = '';
}


async function confirmDelete() {
  const fileId = (fileToDelete.value?.id ?? fileToDelete.value?.fileId) as string | number | undefined;
  console.log('confirmDelete called', fileToDelete.value, 'id dùng để xóa:', fileId);
  // Client guard: prevent deleting files synced from request
  if (fileToDelete.value?.syncedFromRequest) {
    showDeleteDialog.value = false;
    isSidebarCollapsed.value = false;
    toast.add({ severity: 'warn', summary: 'Not allowed', detail: 'This file is synced from a request and cannot be deleted.', life: 3000 });
    return;
  }
  // Re-check from backend in case flag missing
  try {
    const { data } = await axiosInstance.get(`/files/${fileId}`);
    if (data?.syncedFromRequest) {
      showDeleteDialog.value = false;
      isSidebarCollapsed.value = false;
      toast.add({ severity: 'warn', summary: 'Not allowed', detail: 'This file is synced from a request and cannot be deleted.', life: 3000 });
      return;
    }
  } catch (e) {
    // ignore and let delete flow handle errors
  }
  if (!fileId) {
    console.warn('No file to delete or missing id');
    return;
  }
  deletingFile.value = true;
  try {
    await axiosInstance.delete(`/files/${String(fileId)}`);
    showDeleteDialog.value = false;
    isSidebarCollapsed.value = false;
    props.loadFiles();
    // Chỉ hiện toast sau khi modal đã đóng
    setTimeout(() => {
      toast.add({ severity: 'success', summary: 'Deleted', detail: 'File deleted successfully!', life: 3000 });
    }, 200);
  } catch (e: any) {
    showDeleteDialog.value = false;
    isSidebarCollapsed.value = false;
    let msg = 'Delete failed';
    if (e?.response?.data?.message) {
      msg = e.response.data.message;
    } else if (e?.response?.data?.error) {
      msg = e.response.data.error;
    } else if (e?.message) {
      msg = e.message;
    }
    // Chỉ hiện toast sau khi modal đã đóng
    setTimeout(() => {
      toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 });
    }, 200);
  } finally {
    deletingFile.value = false;
  }
}
function closeDeleteDialog() {
  showDeleteDialog.value = false;
  isSidebarCollapsed.value = false;
}

async function saveTitle() {
  if (!editingTitleFileId.value) {
    showSetTitleDialog.value = false;
    return;
  }
  try {
    await axiosInstance.patch(`/files/${editingTitleFileId.value}`, { title: editingTitleInput.value });
    showSetTitleDialog.value = false;
    props.loadFiles();
    toast.add({ severity: 'success', summary: 'Success', detail: 'Title updated successfully!', life: 2500 });
  } catch (e: any) {
    let msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Update failed';
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 });
  } finally {
    editingTitleFileId.value = null;
    editingTitleInput.value = '';
  }
}
defineExpose({
  searchValue,
  uploading,
  triggerUpload,
  handleFileChange,
  uploadError,
  searchLoading,
  filteredFiles,
  searchQuery,
  getFileIcon,
  setEllipsisBtnRef,
  toggleDropdown,
  dropdownOpenId,
  setDropdownMenuRef,
  handleAction,
  showRenameDialog,
  renameInput,
  confirmRename,
  showDeleteDialog,
  fileToDelete,
  confirmDelete,
  deletingFile
});

// Permission logic
const normalizedMembers = computed(() => {
  if (!props.members) return [] as any[];
  return props.members.map((m: any) => ({
    ...m,
    roles: Array.isArray(m.roles)
      ? m.roles.map((r: any) => {
        // Luôn parse lại từ permissionFlags, không dùng r.permissions từ backend
        const permissions = r.permissionFlags ? parsePermissionFlags(r.permissionFlags) : [];
        return { ...r, permissions };
      })
      : []
  }));
});

const { hasPermission, isProjectOwner, isProjectAdmin } = useProjectMemberPermissions(
  computed(() => props.project || {}),
  normalizedMembers,
  computed(() => props.currentUser || null)
);

// Separate permission checks for each operation
const canAttachFiles = computed(() => hasPermission('AttachFiles') || isProjectAdmin.value || isProjectOwner.value);
const canManageFiles = computed(() =>
  hasPermission('ManageFiles') ||
  hasPermission('AttachFiles') || // Cho phép AttachFiles được rename, delete
  isProjectAdmin.value ||
  isProjectOwner.value
);
const canViewFiles = computed(() => hasPermission('ViewFiles') || hasPermission('AttachFiles') || isProjectAdmin.value || isProjectOwner.value);

watch([canAttachFiles, canManageFiles, canViewFiles], () => {
  console.log('File permissions:', {
    canAttachFiles: canAttachFiles.value,
    canManageFiles: canManageFiles.value,
    canViewFiles: canViewFiles.value,
    isProjectOwner: isProjectOwner.value,
    isProjectAdmin: isProjectAdmin.value,
    members: props.members,
    project: props.project
  });
});
</script>
<template>
  <div class="project-section files-section">
    <!-- Overlay loading khi uploading -->
    <transition name="fade">
      <div v-if="uploading && uploadPhase === 'uploading'" class="upload-loading-overlay">
        <div class="spinner-container">
          <i class="pi pi-spin pi-spinner" style="font-size:2.5rem;color:#6366f1;"></i>
          <div style="margin-top:12px;color:#6366f1;font-weight:500;">
            Uploading... <span v-if="uploadProgress > 0">{{ uploadProgress }}%</span>
          </div>
          <div v-if="uploadProgress > 0" class="upload-progress-bar" style="width: 100%; background: #e0e7ff; border-radius: 8px; height: 12px; margin-top: 18px;">
            <div :style="{ width: uploadProgress + '%', background: '#6366f1', height: '100%', borderRadius: '8px', transition: 'width 0.3s' }"></div>
          </div>
        </div>
      </div>
    </transition>
    <div class="toolbar">
      <div class="toolbar-left">
        <InputText v-model="searchValue" placeholder="Search files by name..." class="search-input custom-search-input" />
      </div>
      <div class="toolbar-right">
        <Button label="Add File" icon="pi pi-upload" class="p-button-success p-button-lg add-file-btn"
                @click="canAttachFiles && triggerUpload()"
                :disabled="uploading || !canAttachFiles"
                :title="!canAttachFiles ? 'You do not have permission to add files (requires AttachFiles permission)' : ''"
        />
        <input ref="uploadInput" type="file" style="display:none" @change="handleFileChange" multiple />
      </div>
    </div>
    <div v-if="uploadError" style="color:#e53e3e; margin-bottom: 0.5em">{{ uploadError }}</div>
    <div v-if="searchLoading" class="search-loading">Searching...</div>
    <div v-else-if="filteredFiles.length === 0 && searchQuery" class="no-files-found">No files found for: "{{ searchQuery }}"</div>
    <table v-else class="file-table">
      <thead>
      <tr>
        <th>Name</th>
        <th>Title</th>
        <th></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="file in filteredFiles" :key="file.id ?? file.fileId">
        <td class="file-name-cell">
          <i :class="getFileIcon(file.fileName)" style="color:#6366f1" />
          <div v-if="editingFileId === (file.id ?? file.fileId)" class="inline-edit-container">
            <InputText
              v-model="editingFileName"
              @keyup.enter="confirmRename"
              @keyup.esc="cancelRename"
              style="padding: 0.5rem; font-size: 1rem; border-radius: 6px;"
              ref="editInput"
              placeholder="Press Enter to save, Esc to cancel"
            />
          </div>
          <span v-else class="file-base-name">{{ file.fileName }}</span>
          <span v-if="file.status === 'processing'" class="file-status processing">
            <i class="pi pi-spin pi-spinner spinner-inline"></i>
            Processing...
          </span>
          <span v-else-if="file.status === 'error'" class="file-status error" style="color:#e53e3e;margin-left:8px;">Error extracting strings</span>
        </td>
        <td class="file-title-cell">
          <span class="file-title">{{ file.title || '' }}</span>
        </td>
        <td class="file-actions-cell" style="position:relative;">
          <Button icon="pi pi-ellipsis-v" class="p-button-rounded p-button-text p-button-sm" @click="toggleDropdown((file.id ?? file.fileId)!)" :ref="setEllipsisBtnRef((file.id ?? file.fileId)!)" />
          <transition name="fade">
            <div v-if="dropdownOpenId === (file.id ?? file.fileId)" class="custom-dropdown-menu" :ref="setDropdownMenuRef((file.id ?? file.fileId)!)">
              <button class="dropdown-item"
                      @click="canViewFiles && handleAction('download', (file.id ?? file.fileId)!)"
                      :disabled="!canViewFiles"
                      :title="!canViewFiles ? 'You do not have permission to download files (requires ViewFiles permission)' : ''"
              >
                <i class="pi pi-download"></i>
                <span>Download</span>
              </button>
              <button class="dropdown-item"
                      @click="canManageFiles && handleAction('set-title', (file.id ?? file.fileId)!)"
                      :disabled="!canManageFiles"
                      :title="!canManageFiles ? 'You do not have permission to set title (requires ManageFiles permission)' : ''"
              >
                <i class="pi pi-tag"></i>
                <span>Set Title</span>
              </button>
              <button class="dropdown-item"
                      @click="canManageFiles && handleAction('rename', (file.id ?? file.fileId)!)"
                      :disabled="!canManageFiles"
                      :title="!canManageFiles ? 'You do not have permission to rename files (requires ManageFiles permission)' : ''"
              >
                <i class="pi pi-pencil"></i>
                <span>Rename</span>
              </button>
              <button class="dropdown-item delete"
                      @click="canManageFiles && !file.syncedFromRequest && handleAction('delete', (file.id ?? file.fileId)!)"
                      :disabled="!canManageFiles || file.syncedFromRequest"
                      :title="file.syncedFromRequest ? 'Cannot delete: This file is synced from a request' : (!canManageFiles ? 'You do not have permission to delete files (requires ManageFiles permission)' : '')"
              >
                <i class="pi pi-trash"></i>
                <span>Delete</span>
              </button>
            </div>
          </transition>
        </td>
      </tr>
      </tbody>
    </table>

    <!-- Modal xác nhận xóa file đẹp -->
    <teleport to="body">
      <!-- Custom Modal nhập tiêu đề file -->
      <div v-if="showTitleDialog && filesToUpload.length > 0" class="custom-title-dialog-modal">
        <div class="modal-overlay" @click="showTitleDialog=false; filesToUpload=[]; titles=[];"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Enter title for each file</h3>
            <button class="close-btn" @click="showTitleDialog=false; filesToUpload=[]; titles=[];">
              <span style="font-size: 1.5rem; color: #6b7280; font-weight: bold;">×</span>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div v-for="(f, idx) in filesToUpload" :key="idx" style="display:flex;flex-direction:column;gap:8px;width:100%;">
                <span style="word-break: break-all; font-weight: 500; color:#0f172a;">File name: {{ f.name }}</span>
                <input v-model="titles[idx]" type="text" placeholder="Enter title" class="title-input" style="width:100%;" :autofocus="idx === 0" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showTitleDialog=false; filesToUpload=[]; titles=[];">Cancel</button>
            <button class="btn btn-primary" :disabled="!titlesFilled" @click="uploadFilesWithTitles">Upload</button>
          </div>
        </div>
      </div>
      <!-- End Custom Modal nhập tiêu đề file -->
      <!-- Set Title Modal -->
      <div v-if="showSetTitleDialog" class="delete-dialog-modal">
        <div class="modal-overlay" @click="showSetTitleDialog=false"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Set Title</h3>
            <button class="close-btn" @click="showSetTitleDialog=false">
              <span style="font-size: 1.5rem; color: #6b7280; font-weight: bold;">×</span>
            </button>
          </div>
          <div class="modal-body">
            <input v-model="editingTitleInput" type="text" placeholder="Enter title" class="title-input" style="width:100%;" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showSetTitleDialog=false">Cancel</button>
            <button class="btn btn-primary" @click="saveTitle" :disabled="!canManageFiles">Save</button>
          </div>
        </div>
      </div>
      <!-- End Set Title Modal -->
      <div v-if="showDeleteDialog" class="delete-dialog-modal">
        <div class="modal-overlay" @click="closeDeleteDialog"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Delete File</h3>
            <button class="close-btn" @click="closeDeleteDialog">
              <span style="font-size: 1.5rem; color: #6b7280; font-weight: bold;">×</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="warning-message">
              <div class="warning-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h4>Are you sure you want to delete this file?</h4>
              <p><b>{{ fileToDelete.value?.fileName }}</b></p>
              <p>This action cannot be undone.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeDeleteDialog">Keep File</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deletingFile">
              <span v-if="deletingFile" class="loading-spinner"></span>
              {{ deletingFile ? 'Deleting...' : 'Delete File' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
    <!-- End modal đẹp -->
  </div>
</template>
<style scoped>
.project-section.files-section {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(49,130,206,0.08), 0 2px 6px rgba(76,34,128,0.06);
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  margin-bottom: 3rem;
  position: relative;
  min-height: 60vh;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1em;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 1.2em;
}
.search-input {
  min-width: 180px;
}
.custom-treetable ::v-deep .p-treetable {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}
.custom-treetable ::v-deep .p-treetable-tbody > tr {
  transition: background 0.15s;
}
.custom-treetable ::v-deep .p-treetable-tbody > tr:hover {
  background: #f3f4f6;
}
.custom-treetable ::v-deep .p-treetable-thead > tr > th {
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  font-size: 1.05em;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.7em 1em;
}
.custom-treetable ::v-deep .p-treetable-tbody > tr > td {
  padding: 0.7em 1em;
  font-size: 1em;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}
.custom-treetable ::v-deep .p-button {
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  margin: 0 2px;
}
.file-table {
  width: 100%;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  margin-top: 1em;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}
.file-table th, .file-table td {
  padding: 0.5em 0.8em;
  font-size: 0.9em;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
  line-height: 1.4;
}
.file-table th {
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  font-size: 0.95em;
}
.file-table tbody tr:hover {
  background: #f3f4f6;
}
.file-name-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.file-name-cell i {
  line-height: 1; /* tránh icon làm lệch baseline */
  display: flex;
  align-items: flex-start;
  margin-top: 2px; /* căn icon với baseline của text */
}
.file-base-name {
  font-weight: 500;
  max-width: none;
  overflow: visible;
  white-space: normal;
  font-size: 0.9em;
  line-height: 1.4;
  word-wrap: break-word;
}
.file-title {
  font-size: 0.9em;
  font-weight: 400;
  color: #374151;
  line-height: 1.4;
  vertical-align: middle;
}
.version-select {
  margin-left: 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  padding: 2px 8px;
  font-size: 0.98em;
  background: #fff;
}
.version-badge {
  margin-left: 10px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 0.98em;
  font-weight: 600;
}
.file-actions-cell {
  text-align: center;
  position: relative;
}
.file-title-cell {
  vertical-align: top;
  padding-top: 0.5em; /* căn với padding của td */
}

/* Đảm bảo 3 cột luôn thẳng hàng, kể cả khi Title trống */
.file-table th:nth-child(1),
.file-table td:nth-child(1) { width: 55%; }
.file-table th:nth-child(2),
.file-table td:nth-child(2) { width: 40%; }
.file-table th:nth-child(3),
.file-table td:nth-child(3) { width: 5%; }
.search-loading {
  color: #6366f1;
  font-weight: 500;
  margin: 1em 0;
  text-align: center;
}
.no-files-found {
  color: #e53e3e;
  font-weight: 500;
  margin: 1em 0;
  text-align: center;
}
/* Custom PrimeVue Menu style */
::v-deep .p-menu {
  background: rgba(255,255,255,0.95) !important;
  box-shadow: 0 8px 32px rgba(49,130,206,0.12), 0 2px 8px rgba(76,34,128,0.10) !important;
  border-radius: 16px !important;
  padding: 0.5rem 0 !important;
  min-width: 180px;
}
::v-deep .p-menuitem-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 1.2rem !important;
  border-radius: 12px !important;
  transition: all 0.15s;
  font-size: 1.07em;
}
::v-deep .p-menuitem-link:hover .p-menuitem-icon {
  color: #3730a3 !important;
}
::v-deep .p-menuitem:last-child .p-menuitem-link:hover .p-menuitem-icon {
  color: #ef4444 !important;
}
::v-deep .p-menuitem {
  margin-bottom: 2px;
}
::v-deep .p-menuitem:last-child {
  margin-bottom: 0;
}
::v-deep .p-menuitem-icon {
  font-size: 1.1em;
  min-width: 22px;
  text-align: center;
}
.custom-search-input {
  border-radius: 6px !important;
  border: 1px solid #e5e7eb !important;
  padding: 8px 12px !important;
  font-size: 0.95em;
  transition: box-shadow 0.18s, border-color 0.18s;
  background: #fff;
  min-width: 180px;
}
.custom-search-input:focus {
  outline: none;
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 2px #6366f133;
}
.reset-btn {
  color: #2563eb !important;
  transition: background 0.15s, color 0.15s;
}
.reset-btn:hover:not(:disabled) {
  background: #eff6ff !important;
  color: #2563eb !important;
}
.delete-btn {
  color: #ef4444 !important;
  transition: background 0.15s, color 0.15s;
}
.delete-btn:hover:not(:disabled) {
  background: #fef2f2 !important;
  color: #ef4444 !important;
}
.add-file-btn {
  font-weight: 600;
  font-size: 0.95em;
  padding: 0.6em 1.2em;
  border-radius: 6px;
  box-shadow: 0 2px 6px #22c55e22;
  transition: background 0.15s, box-shadow 0.15s, color 0.15s;
}
::v-deep .add-file-btn .p-button-icon {
  margin-right: 0.8em !important;
  font-size: 1.1em !important;
}
.add-file-btn:hover:not(:disabled) {
  background: #22c55e !important;
  color: #fff !important;
  box-shadow: 0 4px 16px #22c55e33;
}
.delete-dialog-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999; /* Đảm bảo cao hơn mọi thành phần khác */
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45); /* Overlay mờ toàn trang */
  z-index: 10000;
}
.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  z-index: 10001;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}
.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}
.modal-body {
  padding: 1.5rem;
}
.warning-message {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}
.warning-icon {
  font-size: 3rem;
  color: #dc2626;
  margin-bottom: 1rem;
}
.warning-message h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-size: 1.125rem;
  font-weight: 600;
}
.warning-message p {
  margin: 0;
  color: #7f1d1d;
  font-size: 0.875rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}
.btn-secondary:hover {
  background: #e5e7eb;
}
.btn-danger {
  background: #dc2626;
  color: #fff;
}
.btn-danger:hover {
  background: #b91c1c;
}
.loading-spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #dc2626;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.custom-dropdown-menu {
  position: absolute;
  right: 0;
  top: 32px;
  min-width: 150px;
  background: rgba(255,255,255,0.98);
  box-shadow: 0 8px 24px 0 rgba(49,130,206,0.12), 0 2px 6px rgba(76,34,128,0.08);
  border-radius: 8px;
  padding: 0;
  z-index: 10;
  animation: fadeScaleIn 0.18s;
  border: 1px solid #f1f5f9;
  overflow: hidden; /* Đảm bảo các item không bị tràn ra ngoài */
  display: flex;
  flex-direction: column;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 1rem;
  border: none !important;      /* Xóa border mặc định */
  border-radius: 0 !important;  /* Không bo góc từng item */
  background: transparent !important; /* Không background riêng */
  font-size: 0.95em;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
  user-select: none;
  margin: 0 !important;         /* Không margin giữa các item */
  box-shadow: none !important;  /* Xóa box-shadow mặc định */
  width: 100%;
  text-align: left;
}
.dropdown-item:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
.dropdown-item:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}
.dropdown-item:focus {
  outline: none;
  background: #f1f5f9;
}
.dropdown-item:hover {
  background: #f1f5f9;
  color: #3730a3;
}
.dropdown-item i {
  font-size: 1.05em;
  color: #64748b;
  transition: color 0.16s;
}
.dropdown-item:hover i {
  color: #3730a3;
}
.dropdown-item.delete:hover,
.dropdown-item.delete:hover span {
  color: #ef4444 !important;
}
.dropdown-item.delete:hover i {
  color: #ef4444 !important;
}
.dropdown-item.delete span {
  color: #ef4444;
}
.dropdown-item[disabled], .dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: auto !important;
  background: #f3f4f6 !important;
  color: #a0aec0 !important;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
@keyframes fadeScaleIn {
  from { opacity: 0; transform: scale(0.98) translateY(-8px);}
  to { opacity: 1; transform: scale(1) translateY(0);}
}
.upload-loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.75);
  z-index: 10010;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Inline edit styles */
.inline-edit-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-actions {
  display: flex;
  gap: 0.25rem;
}
</style>

<style>
/* Overlay modal che toàn bộ trang, kể cả sidebar/navbar */
.delete-dialog-modal {
  position: fixed !important;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 99999 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}
.delete-dialog-modal .modal-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 100000 !important;
}
.delete-dialog-modal .modal-content {
  position: relative;
  z-index: 100001 !important;
}
.p-toast {
  z-index: 200000 !important;
}
.file-status.processing {
  color: #6366f1;
  font-weight: 500;
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.spinner-inline {
  display: inline-block;
  width: 16px;
  height: 16px;
  line-height: 16px;
  font-size: 16px;
  vertical-align: middle;
  transform-origin: center center;
}
.file-status.error {
  color: #e53e3e;
  font-weight: 500;
  margin-left: 8px;
}
.custom-title-dialog-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 300000; /* cao hơn toast và overlay khác */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}
.custom-title-dialog-modal .modal-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 300000;
}
.custom-title-dialog-modal .modal-content {
  background: white;
  border-radius: 12px;
  width: 95vw;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  z-index: 300001 !important; /* đảm bảo nổi trên overlay */
  display: flex;
  flex-direction: column;
}
.title-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  padding: 10px 12px;
  font-size: 0.95rem;
  background: #f8fafc;
  color: #0f172a;
  transition: box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}
.title-input::placeholder {
  color: #94a3b8;
}
.title-input:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
}
.title-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
  background: #fff;
}
</style>
