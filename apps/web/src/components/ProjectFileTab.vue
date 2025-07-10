<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const props = defineProps({
  projectFiles: {
    type: Array,
    required: true
  },
  filesLoading: {
    type: Boolean,
    default: false
  },
  filesError: {
    type: String,
    default: ''
  },
  isImage: {
    type: Function,
    required: true
  },
  isPDF: {
    type: Function,
    required: true
  },
  downloadFile: {
    type: Function,
    required: true
  },
  loadFiles: {
    type: Function,
    required: true
  },
  projectId: {
    type: String,
    required: true
  }
});

const uploading = ref(false);
const uploadError = ref('');
const uploadInput = ref<HTMLInputElement|null>(null);

function triggerUpload() {
  uploadInput.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  uploading.value = true;
  uploadError.value = '';
  try {
    // Giả sử có prop projectId hoặc lấy từ route
    const projectId = props.projectId || (typeof window !== 'undefined' ? window.location.pathname.split('/').find(x => x.match(/^\d+$/)) : null);
    if (!projectId) throw new Error('Missing projectId');
    const formData = new FormData();
    formData.append('file', file);
    // Gọi API upload file
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {}
    const fileId = data?.fileId || data?.id;
    if (!res.ok || !data || !fileId) {
      throw new Error('Upload failed');
    }
    // Upload thành công, reset lỗi
    uploadError.value = '';
    // Reload danh sách file
    props.loadFiles();
    toast.add({ severity: 'success', summary: 'Success', detail: 'File uploaded successfully!', life: 3000 });
  } catch (e: any) {
    uploadError.value = e.message || 'Upload failed';
    toast.add({ severity: 'error', summary: 'Error', detail: 'File upload failed!', life: 3000 });
  } finally {
    uploading.value = false;
    if (uploadInput.value) uploadInput.value.value = '';
  }
}
</script>
<template>
  <div class="project-section files-section">
    <div class="section-header">
      <h2 class="section-title">
        <span class="title-icon">📁</span>
        Files
      </h2>
    </div>
    <!-- Upload file button -->
    <div style="margin-bottom:1rem;display:flex;align-items:center;gap:1rem">
      <button class="btn btn-primary" @click="triggerUpload" :disabled="uploading">
        <span v-if="uploading" class="loading-spinner-small"></span>
        <span v-else>Upload File</span>
      </button>
      <input ref="uploadInput" type="file" style="display:none" @change="handleFileChange" />
      <span v-if="uploadError" style="color:#e53e3e">{{ uploadError }}</span>
    </div>
    <div class="files-content">
      <div v-if="props.filesLoading" class="files-loading">
        <div class="loading-spinner-small"></div>
        <span>Loading files...</span>
      </div>
      <div v-else-if="props.filesError" class="files-error">
        <span class="error-icon">⚠️</span>
        <span>{{ props.filesError }}</span>
        <button class="btn btn-outline btn-sm" @click="props.loadFiles">Retry</button>
      </div>
      <div v-else-if="props.projectFiles && props.projectFiles.length > 0" class="files-list">
        <div
          v-for="file in props.projectFiles"
          :key="file.id"
          :title="'Click to download'"
          class="file-item file-hoverable"
          @click="props.downloadFile(file)"
        >
          <div class="file-info">
            <div class="file-icon file-thumb">
              <template v-if="props.isImage(file)">
                <img :src="`/api/files/${file.id}/download`" alt="Image" class="file-thumbnail" />
              </template>
              <template v-else-if="props.isPDF(file)">
                <span class="pdf-icon">PDF</span>
              </template>
              <template v-else>
                <svg fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                  <path d="M14 2V8H20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
              </template>
            </div>
            <div class="file-details">
              <span class="file-name" :title="file.fileName">
                {{ file.fileName.length > 30 ? file.fileName.slice(0, 27) + '...' : file.fileName }}
              </span>
            </div>
          </div>
          <span class="file-download-icon" title="Download">
            <svg fill="none" height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3V17M12 17L7 12M12 17L17 12" stroke="#3182ce" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
              <rect fill="#3182ce" height="2" rx="1" width="16" x="4" y="19" />
            </svg>
          </span>
        </div>
      </div>
      <div v-else class="no-files">
        <div class="no-content-icon">📄</div>
        <p>No files have been uploaded to this project yet.</p>
      </div>
    </div>
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
.section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #2d3748;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}
.title-icon {
  font-size: 2.2rem;
  width: 3.2rem;
  height: 3.2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.files-content {
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
}
.files-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
}
.file-item {
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1.5rem 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  gap: 1em;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  margin-bottom: 1rem;
}
.file-item:hover {
  background: #e6f0fa;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
.file-info {
  display: flex;
  align-items: center;
  gap: 0.7em;
}
.file-icon.file-thumb {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.file-thumbnail {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 0.3em;
}
.pdf-icon {
  background: #e53e3e;
  color: #fff;
  border-radius: 0.3em;
  padding: 0.2em 0.6em;
  font-size: 0.95em;
  font-weight: 600;
}
.file-details {
  display: flex;
  flex-direction: column;
}
.file-name {
  font-weight: 500;
  font-size: 1.05em;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
}
.file-download-icon {
  margin-left: auto;
  display: flex;
  align-items: center;
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  pointer-events: none;
  transition: opacity 0.18s;
}
.file-item:hover .file-download-icon {
  opacity: 1;
  filter: drop-shadow(0 2px 6px #3182ce33);
}
.no-files {
  text-align: center;
  padding: 2em 0;
  color: #718096;
}
.no-content-icon {
  font-size: 2.5em;
  margin-bottom: 0.5em;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.18s;
  box-shadow: 0 2px 8px #3182ce11;
}
.btn-primary {
  background: linear-gradient(135deg, #38b2ac 0%, #4299e1 100%);
  color: #fff;
  box-shadow: 0 4px 16px #4299e133;
  border: 2px solid #4299e1;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #4299e1 0%, #38b2ac 100%);
  color: #fff;
  border-color: #3182ce;
  box-shadow: 0 8px 32px #4299e133;
  transform: translateY(-2px) scale(1.04);
  filter: brightness(1.08);
}
.btn-outline {
  background: #fff;
  color: #2563eb;
  border: 2px solid #2563eb;
  font-weight: 700;
  box-shadow: 0 2px 8px #2563eb22;
  transition: all 0.18s;
}
.btn-outline:hover {
  background: #2563eb;
  color: #fff;
  border-color: #1e40af;
  box-shadow: 0 6px 24px #2563eb33;
}
.btn-sm {
  font-size: 0.95em;
  padding: 0.5em 1.1em;
  border-radius: 8px;
}
</style>
