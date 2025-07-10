<script setup lang="ts">
import { ref, defineProps, computed, watch, nextTick } from 'vue';
import type { Ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { FilterMatchMode } from 'primevue/api';
import Menu from 'primevue/menu';
import axiosInstance from '../api';

interface ProjectFile {
  id: string | number;
  fileName: string;
  projectId?: string | number;
  children?: ProjectFile[];
  strings?: number;
  revision?: string;
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

const actionMenuVisible = ref<Record<string, boolean>>({});
const actionMenuRef = ref<Record<string, any>>({});
function setMenuRef(key: string) {
  return (el: any) => {
    if (el) actionMenuRef.value[key] = el;
  };
}
const renamingFile = ref<any>(null);
const renameInput = ref('');
const showRenameDialog = ref(false);
const showDeleteDialog = ref(false);
const fileToDelete = ref<any>(null);
const showRevisionDialog = ref(false);
const revisionFile = ref<any>(null);
const deletingFile = ref(false);

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
  uploading.value = true;
  uploadError.value = '';
  try {
    const formData = new FormData();
    formData.append('file', file);
    const projectId = props.projectId;
    if (!projectId) throw new Error('Project ID not found');
    console.log('Uploading file:', file.name, 'to project:', projectId);
    const response = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
    });
    const respText = await response.text();
    console.log('Upload response status:', response.status, 'body:', respText);
    if (!response.ok) {
      throw new Error('File upload failed: ' + respText);
    }
    // Tăng delay lên 2500ms để backend ghi file xong
    await new Promise(r => setTimeout(r, 2500));
    // Reload file list
    const result = props.loadFiles();
    if (result instanceof Promise) {
      await result;
    }
    toast.add({ severity: 'success', summary: 'Success', detail: 'File uploaded successfully!', life: 3000 });
  } catch (e: any) {
    uploadError.value = e.message || 'Upload failed';
    toast.add({ severity: 'error', summary: 'Error', detail: uploadError.value, life: 3000 });
    console.error('File upload error:', e);
  } finally {
    uploading.value = false;
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
  // Fuzzy: tất cả ký tự query xuất hiện theo thứ tự trong str
  let i = 0;
  for (let c of q) {
    i = s.indexOf(c, i);
    if (i === -1) return false;
    i++;
  }
  return true;
}

// Tìm kiếm và gợi ý gần đúng
watch(searchValue, (val) => {
  searchQuery.value = val;
  searchLoading.value = true;
  setTimeout(() => {
    if (!val) {
      searchResults.value = props.projectFiles;
    } else {
      // Lọc theo tên file hoặc version fuzzy
      searchResults.value = props.projectFiles.filter(f => {
        const base = f.fileName;
        if (fuzzyMatch(base, val)) return true;
        // Kiểm tra version
        return false; // No version in this simplified view
      });
    }
    searchLoading.value = false;
  }, 350); // Giả lập loading
}, { immediate: true });

function openMenu(fileId: string, event: Event) {
  nextTick(() => {
    const menu = actionMenuRef.value[fileId];
    if (menu) menu.toggle(event);
  });
}
function onMenuHide(fileId: string) {
  actionMenuVisible.value[fileId] = false;
}
function getMenuModel(file: ProjectFile) {
  return [
    { label: 'Download', icon: 'pi pi-download', command: () => { console.log('Menu Download for fileId:', file.id); handleAction('download', file.id); }, pt: { root: { title: 'Download file' } } },
    { label: 'Rename', icon: 'pi pi-pencil', command: () => { console.log('Menu Rename for fileId:', file.id); handleAction('rename', file.id); }, pt: { root: { title: 'Rename file' } } },
    { label: 'Delete', icon: 'pi pi-trash', command: () => { console.log('Menu Delete for fileId:', file.id); handleAction('delete', file.id); }, pt: { root: { title: 'Delete file' } } }
  ];
}

function handleAction(action: string, fileId: string | number) {
  const file = props.projectFiles.find(f => f.id === fileId || f.fileId === fileId);
  if (!file) {
    console.warn('File not found for id:', fileId);
    return;
  }
  console.log('handleAction', action, file);
  if (action === 'download') {
    props.downloadFile(file);
  } else if (action === 'rename') {
    renamingFile.value = file;
    renameInput.value = file.fileName;
    showRenameDialog.value = true;
  } else if (action === 'delete') {
    fileToDelete.value = { ...file };
    showDeleteDialog.value = true;
    console.log('Open delete modal for file:', fileToDelete.value);
  } else if (action === 'revisions') {
    revisionFile.value = file;
    showRevisionDialog.value = true;
  }
}
function confirmRename() {
  // Mock: chỉ log, chưa gọi backend
  alert('Renamed to: ' + renameInput.value);
  showRenameDialog.value = false;
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
    props.loadFiles();
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'File deleted successfully!', life: 3000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Delete failed', life: 3000 });
  } finally {
    deletingFile.value = false;
  }
}
</script>
<template>
  <div class="project-section files-section">
    <div class="toolbar">
      <div class="toolbar-left">
        <InputText v-model="searchValue" placeholder="Search files by name..." class="search-input custom-search-input" />
      </div>
      <div class="toolbar-right">
        <Button label="Add File" icon="pi pi-upload" class="p-button-success p-button-lg add-file-btn" @click="triggerUpload" :disabled="uploading" />
        <input ref="uploadInput" type="file" style="display:none" @change="handleFileChange" />
      </div>
    </div>
    <div v-if="uploadError" style="color:#e53e3e; margin-bottom: 0.5em">{{ uploadError }}</div>
    <div v-if="searchLoading" class="search-loading">Searching...</div>
    <div v-else-if="filteredFiles.length === 0 && searchQuery" class="no-files-found">No files found for: "{{ searchQuery }}"</div>
    <table v-else class="file-table">
      <thead>
      <tr>
        <th>Name</th>
        <th>Strings</th>
        <th></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="file in filteredFiles" :key="file.id">
        <td class="file-name-cell">
          <i :class="getFileIcon(file.fileName)" style="color:#6366f1" />
          <span class="file-base-name">{{ file.fileName }}</span>
        </td>
        <td class="file-strings-cell">{{ file.strings ?? '--' }}</td>
        <td class="file-actions-cell">
          <Button icon="pi pi-ellipsis-v" class="p-button-rounded p-button-text p-button-sm" @click="openMenu(file.id, $event)" />
          <Menu :ref="setMenuRef(file.id)" :model="getMenuModel(file)" :popup="true" @hide="onMenuHide(file.id)" />
        </td>
      </tr>
      </tbody>
    </table>
    <!-- Rename/Delete Dialog giữ nguyên -->
    <Dialog v-model:visible="showRenameDialog" header="Rename File" :modal="true" :closable="true">
      <div>
        <InputText v-model="renameInput" style="width:100%" />
      </div>
      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showRenameDialog = false" />
        <Button label="Rename" class="p-button-primary" @click="confirmRename" />
      </template>
    </Dialog>
    <!-- Modal xác nhận xóa file đẹp -->
    <div v-if="showDeleteDialog" class="delete-dialog-modal">
      <div class="modal-overlay" @click="showDeleteDialog = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Delete File</h3>
          <button class="close-btn" @click="showDeleteDialog = false">
            <i class="pi pi-times"></i>
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
          <button class="btn btn-secondary" @click="showDeleteDialog = false">Keep File</button>
          <button class="btn btn-danger" @click="confirmDelete" :disabled="deletingFile">
            <span v-if="deletingFile" class="loading-spinner"></span>
            {{ deletingFile ? 'Deleting...' : 'Delete File' }}
          </button>
        </div>
      </div>
    </div>
    <!-- End modal đẹp -->
  </div>
</template>
<style scoped>
.project-section.files-section {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 32px rgba(49,130,206,0.10), 0 2px 8px rgba(76,34,128,0.08);
  padding: 2.2rem 2.2rem 1.5rem 2.2rem;
  margin-bottom: 2.2rem;
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
  min-width: 220px;
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
  padding: 0.7em 1em;
  font-size: 1em;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}
.file-table th {
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  font-size: 1.05em;
}
.file-table tbody tr:hover {
  background: #f3f4f6;
}
.file-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.file-base-name {
  font-weight: 500;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  border-radius: 8px !important;
  border: 1.5px solid #e5e7eb !important;
  padding: 10px 16px !important;
  font-size: 1.04em;
  transition: box-shadow 0.18s, border-color 0.18s;
  background: #fff;
  min-width: 220px;
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
  font-size: 1.08em;
  padding: 0.7em 1.6em;
  border-radius: 8px;
  box-shadow: 0 2px 8px #22c55e22;
  transition: background 0.15s, box-shadow 0.15s, color 0.15s;
}
::v-deep .add-file-btn .p-button-icon {
  margin-right: 1.1em !important;
  font-size: 1.25em !important;
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
  z-index: 1000;
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
  background: rgba(0, 0, 0, 0.5);
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
</style>
