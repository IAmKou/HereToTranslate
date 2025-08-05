<script setup lang="ts">
import { ref, defineProps, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { FilterMatchMode } from 'primevue/api';
import Menu from 'primevue/menu';
import axiosInstance from '../api';
import { useProjectMemberPermissions } from '../composables/useProjectMemberPermissions';
import { parsePermissionFlags } from '../utils/permissions';
import { isSidebarCollapsed } from '../store/sidebar';

interface ProjectFile {
  id: string | number;
  fileName: string;
  projectId?: string | number;
  children?: ProjectFile[];
  strings?: number;
  revision?: string;
  status?: 'processing' | 'ready' | 'error';
}

const props = defineProps<{
  projectId: string | number;
  branchId: string | number | null;
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
const searchValue = ref('');
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const searchLoading = ref(false);
const searchResults = ref<any[]>([]);
const searchQuery = ref('');

const dropdownOpenId = ref<string | number | null>(null);
const dropdownMenuRefs = ref<Record<string, HTMLElement | null>>({});
const ellipsisBtnRefs = ref<Record<string, HTMLElement | null>>({});

function toggleDropdown(id: string | number) {
  dropdownOpenId.value = dropdownOpenId.value === id ? null : id;
}

function setDropdownMenuRef(id: string | number) {
  return (el: HTMLElement | null) => {
    dropdownMenuRefs.value[id] = el;
  };
}
function setEllipsisBtnRef(id: string | number) {
  return (el: HTMLElement | null) => {
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
        } else {
          toast.add({ severity: 'warn', summary: 'Warning', detail: 'File processing failed. Please try again.', life: 3000 });
        }
      }
    } catch (e) {
      // ignore
    }
  }, 5000);
}
const renamingFile = ref<any>(null);
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
  const file = input.files[0];
  // Kiểm tra kích thước file
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    uploadError.value = `File ${file.name} is too large. Maximum size is 10MB.`;
    toast.add({
      severity: 'error',
      summary: 'File too large',
      detail: uploadError.value,
      life: 4000,
    });
    return;
  }
  uploading.value = true;
  uploadError.value = '';
  uploadProgress.value = 0;
  uploadPhase.value = 'uploading';
  try {
    const formData = new FormData();
    formData.append('file', file);
    const projectId = props.projectId;
    const branchId = props.branchId;
    if (!projectId) throw new Error('Project ID not found');
    if (!branchId) throw new Error('Branch ID not found');
    formData.append('projectId', projectId.toString());
    formData.append('branchId', branchId.toString());
    console.log('Uploading file:', file.name, 'to project:', projectId, 'branch:', branchId);
    // Sử dụng axios để lấy onUploadProgress
    const response = await axiosInstance.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent: ProgressEvent) => {
        if (progressEvent.lengthComputable) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        }
      }
    });

    // Upload xong, tắt overlay ngay lập tức
    uploading.value = false;
    uploadProgress.value = 0;
    uploadPhase.value = null;

    const respData = response.data;
    const isUpdate = respData?.updated;
    const message = isUpdate
      ? `File "${file.name}" updated successfully!`
      : `File "${file.name}" uploaded successfully!`;
    toast.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });

    // Reload files ngay để hiển thị file với status processing
    props.loadFiles();

    lastUploadedFileId.value = respData && respData.fileId ? respData.fileId : null;
    // Polling trạng thái file nếu status là processing
    if (lastUploadedFileId.value) {
      startPollingFileStatus(lastUploadedFileId.value);
    }
  } catch (e: any) {
    uploadError.value = e.message || 'Upload failed';
    toast.add({ severity: 'error', summary: 'Error', detail: uploadError.value, life: 3000 });
    console.error('File upload error:', e);
    uploading.value = false;
    uploadProgress.value = 0;
    uploadPhase.value = null;
  }
}

// Convert flat file list to tree structure for TreeTable
function buildTree(files: ProjectFile[]): any[] {
  // This is a placeholder. In real app, you should have folder/file structure from backend.
  // Here, we just show all files as root nodes for demo.
  return files.map((file: ProjectFile) => ({
    key: file.id,
    data: file,
    children: file.children ? buildTree(file.children) : undefined,
    icon: getFileIcon(file.fileName)
  }));
}

function getFileIcon(fileName: string): string {
  if (!fileName) return 'pi pi-file';
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'pi pi-file-word';
  if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'pi pi-file-excel';
  if (fileName.endsWith('.pdf')) return 'pi pi-file-pdf';
  if (fileName.endsWith('.txt')) return 'pi pi-file';
  return 'pi pi-file';
}

// Thêm hàm xác định là folder
function isFolder(node: any): boolean {
  return !!(node.children && node.children.length > 0);
}

function fileNameSlot({ node }: { node: any }) {
  const iconClass = isFolder(node) ? 'pi pi-folder' : getFileIcon(node.data.fileName);
  const iconColor = isFolder(node) ? '#fbbf24' : '#6366f1';
  const name = node.data.fileName.length > 40 ? node.data.fileName.slice(0, 37) + '...' : node.data.fileName;
  return `
    <span style="display:flex;align-items:center;gap:8px;">
      <i class='${iconClass}' style='color:${iconColor}'></i>
      <span title='${node.data.fileName}' style="font-weight:500;">${name}</span>
    </span>
  `;
}
function stringsSlot({ node }: { node: any }) {
  return `<span style='display:block;text-align:center;'>${node.data.strings ?? '--'}</span>`;
}
function revisionSlot({ node }: { node: any }) {
  return `<span style='display:block;text-align:center;'>${node.data.revision ?? '--'}</span>`;
}
function actionsSlot({ node }: { node: any }) {
  let downloadBtn = '';
  if (!isFolder(node)) {
    downloadBtn = `<button class='p-button p-button-rounded p-button-text p-button-sm pi pi-download' title='Download' style='min-width:32px;min-height:32px;border-radius:50%;margin:0 2px;' onclick='window.__downloadFile && window.__downloadFile(${JSON.stringify(node.data)})'></button>`;
  }
  return `
    <div style='display:flex;gap:8px;justify-content:center;'>
      <button class='p-button p-button-rounded p-button-text p-button-sm pi pi-cog' title='Configure' disabled style='min-width:32px;min-height:32px;border-radius:50%;margin:0 2px;'></button>
      <button class='p-button p-button-rounded p-button-text p-button-sm pi pi-refresh' title='Update' disabled style='min-width:32px;min-height:32px;border-radius:50%;margin:0 2px;'></button>
      ${downloadBtn}
    </div>
  `;
}

// Thêm computed filteredFiles để search
const filteredFiles = computed(() => {
  if (!searchValue.value) return props.projectFiles;
  return props.projectFiles.filter((f: any) => f.fileName.toLowerCase().includes(searchValue.value.toLowerCase()));
});

// Helper: Tách tên gốc và version từ tên file
function parseFileNameVersion(fileName: string) {
  // Tìm _vX.X hoặc -vX.X hoặc (vX.X) ở cuối tên file
  const match = fileName.match(/(.+?)([_\-\(\s]?v(\d+(?:\.\d+)*))?\.[^.]+$/i);
  if (match) {
    return {
      baseName: match[1].trim(),
      version: match[3] ? 'v' + match[3] : 'v1.0',
    };
  }
  // Không có version, trả về tên gốc và v1.0
  const dotIdx = fileName.lastIndexOf('.');
  return {
    baseName: dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName,
    version: 'v1.0',
  };
}

// XÓA: groupFilesByBaseName, groupedFiles, selectedVersion, getSelectedFile, onSelectVersion

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
    editingFileId.value = file.id || file.fileId;
    editingFileName.value = file.fileName;
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
  const fileId = fileToDelete.value?.id || fileToDelete.value?.fileId;
  console.log('confirmDelete called', fileToDelete.value, 'id dùng để xóa:', fileId);
  if (!fileId) {
    console.warn('No file to delete or missing id');
    return;
  }
  deletingFile.value = true;
  try {
    await axiosInstance.delete(`/files/${fileId}`);
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
  if (!props.members) return [];
  return props.members.map(m => ({
    ...m,
    roles: Array.isArray(m.roles)
      ? m.roles.map(r => {
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
    <div v-if="!props.branchId" class="warning-message" style="color:#e53e3e; margin-bottom: 1em; font-weight:600;">
      This project has no branch. Please create a branch before uploading files.
    </div>
    <div class="toolbar">
      <div class="toolbar-left">
        <InputText v-model="searchValue" placeholder="Search files by name..." class="search-input custom-search-input" />
      </div>
      <div class="toolbar-right">
        <Button label="Add File" icon="pi pi-upload" class="p-button-success p-button-lg add-file-btn"
                @click="canAttachFiles && triggerUpload()"
                :disabled="uploading || !props.branchId || !canAttachFiles"
                :title="!canAttachFiles ? 'You do not have permission to add files (requires AttachFiles permission)' : ''"
        />
        <input ref="uploadInput" type="file" style="display:none" @change="handleFileChange" />
      </div>
    </div>
    <div class="file-format-note" style="background:#fffbe6;border:1.2px solid #ffe58f;color:#ad8b00;padding:11px 16px;border-radius:9px;margin:13px 0 16px 0;font-size:0.98em;display:flex;align-items:center;gap:0.65em;">
      <i class="pi pi-exclamation-triangle" style="color:#faad14;font-size:1.2em;"></i>
      <span>
        <b>Note:</b><br>
        - For <b>DOCX</b> files: The exported translation will retain about <b>80–90%</b> of the original formatting and layout. Some complex layouts or advanced styles may not be fully preserved.<br>
        - For <b>PDF</b> files:<br>
        &nbsp;&nbsp;• If the PDF contains selectable text, about <b>60–70%</b> of the original formatting may be preserved.<br>
        &nbsp;&nbsp;• If the PDF is a scanned image (OCR), only the text content will be extracted; formatting and layout will <b>not</b> be preserved.
      </span>
    </div>
    <div v-if="uploadError" style="color:#e53e3e; margin-bottom: 0.5em">{{ uploadError }}</div>
    <div v-if="searchLoading" class="search-loading">Searching...</div>
    <div v-else-if="filteredFiles.length === 0 && searchQuery" class="no-files-found">No files found for: "{{ searchQuery }}"</div>
    <table v-else class="file-table">
      <thead>
      <tr>
        <th>Name</th>
        <th></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="file in filteredFiles" :key="file.id || file.fileId">
        <td class="file-name-cell">
          <i :class="getFileIcon(file.fileName)" style="color:#6366f1" />
          <div v-if="editingFileId === (file.id || file.fileId)" class="inline-edit-container">
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
            <i class="pi pi-spin pi-spinner" style="font-size:1em;margin-left:8px;"></i> Processing...
          </span>
          <span v-else-if="file.status === 'error'" class="file-status error" style="color:#e53e3e;margin-left:8px;">Error extracting strings</span>
        </td>
        <td class="file-actions-cell" style="position:relative;">
          <Button icon="pi pi-ellipsis-v" class="p-button-rounded p-button-text p-button-sm" @click="toggleDropdown(file.id || file.fileId)" :ref="setEllipsisBtnRef(file.id || file.fileId)" />
          <transition name="fade">
            <div v-if="dropdownOpenId === (file.id || file.fileId)" class="custom-dropdown-menu" :ref="setDropdownMenuRef(file.id || file.fileId)">
              <button class="dropdown-item"
                      @click="canViewFiles && handleAction('download', file.id || file.fileId)"
                      :disabled="!canViewFiles"
                      :title="!canViewFiles ? 'You do not have permission to download files (requires ViewFiles permission)' : ''"
              >
                <i class="pi pi-download"></i>
                <span>Download</span>
              </button>
              <button class="dropdown-item"
                      @click="canManageFiles && handleAction('rename', file.id || file.fileId)"
                      :disabled="!canManageFiles"
                      :title="!canManageFiles ? 'You do not have permission to rename files (requires ManageFiles permission)' : ''"
              >
                <i class="pi pi-pencil"></i>
                <span>Rename</span>
              </button>
              <button class="dropdown-item delete"
                      @click="canManageFiles && handleAction('delete', file.id || file.fileId)"
                      :disabled="!canManageFiles"
                      :title="!canManageFiles ? 'You do not have permission to delete files (requires ManageFiles permission)' : ''"
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
  margin-bottom: 1.5rem;
  position: relative;
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
}
.file-table th, .file-table td {
  padding: 0.5em 0.8em;
  font-size: 0.9em;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
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
  align-items: center;
  gap: 8px;
}
.file-base-name {
  font-weight: 500;
  max-width: none;
  overflow: visible;
  white-space: normal;
  font-size: 0.9em;
  word-wrap: break-word;
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
}
.file-status.error {
  color: #e53e3e;
  font-weight: 500;
  margin-left: 8px;
}
</style>
