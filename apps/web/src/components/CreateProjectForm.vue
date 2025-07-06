<template>
  <div class="create-project-container">
    <div class="create-project-form">
      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Project Information</h3>
          </div>

          <div class="form-group">
            <label for="name">
              Project Name
              <span class="required-mark">*</span>
            </label>
            <div class="input-wrapper">
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                class="form-control"
                :class="{ 'error': errors.name }"
                placeholder="Enter a descriptive project name"
                maxlength="50"
                @input="validateName"
                @blur="validateName"
              >
              <div class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
            <div class="input-info">
              <span class="char-count">{{ form.name.length }}/50</span>
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
              <span v-if="nameCheckLoading" class="help-text">Checking name...</span>
              <span v-if="nameCheckError" class="error-message">{{ nameCheckError }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <div class="textarea-wrapper">
              <textarea
                id="description"
                v-model="form.description"
                class="form-control"
                :class="{ 'error': errors.description }"
                rows="4"
                placeholder="Provide details about your project (optional)"
                maxlength="500"
                @input="validateDescription"
                @blur="validateDescription"
              ></textarea>
              <div class="textarea-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
            <div class="input-info">
              <span class="char-count">{{ (form.description || '').length }}/500</span>
              <span v-if="errors.description" class="error-message">{{ errors.description }}</span>
              <span v-else class="help-text">A good description helps others understand your project better</span>
            </div>
          </div>

          <!-- Project Visibility Toggle -->
          <div class="form-group">
            <label for="isPublic">
              Project Visibility
            </label>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <InputSwitch
                id="isPublic"
                v-model="form.isPublic"
                :true-value="true"
                :false-value="false"
              />
              <span>{{ form.isPublic ? 'Public ' : 'Private ' }}</span>
            </div>
          </div>

          <!-- Project Tags -->
          <div class="form-group">
            <label for="tags">
              Project Tags
            </label>
            <Multiselect
              v-model="form.tags"
              :options="allTags"
              :multiple="true"
              :close-on-select="false"
              :clear-on-select="false"
              :preserve-search="true"
              placeholder="Select tag..."
              :taggable="false"
              class="multiselect-custom"
              label="name"
              track-by="id"
            />
            <div class="input-info">
              <span v-if="errors.tags" class="error-message">{{ errors.tags }}</span>
              <span v-else class="help-text">Select one or many tags to help others find your project</span>
            </div>
          </div>

          <!-- File Upload -->
          <div class="form-group">
            <label for="files">
              Files <span class="required-mark">*</span>
            </label>
            <div class="file-upload-container">
              <div class="file-upload-area"
                   :class="{ 'drag-over': isDragOver, 'has-files': uploadedFiles.length > 0 }"
                   @drop="handleFileDrop"
                   @dragover.prevent="isDragOver = true"
                   @dragleave.prevent="isDragOver = false"
                   @click="triggerFileInput">
                <div class="file-upload-content">
                  <div class="file-upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="file-upload-text">
                    <p class="upload-title">Drop files here or click to browse</p>
                    <p class="upload-subtitle">Support: PDF, DOC, DOCX, TXT, RTF - At least one file is required</p>
                  </div>
                </div>
                <input
                  ref="fileInput"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.rtf"
                  @change="handleFileSelect"
                  class="file-input-hidden"
                >
              </div>

              <!-- File List -->
              <div v-if="uploadedFiles.length > 0" class="file-list">
                <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                  <div class="file-info">
                    <div class="file-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="file-details">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="file-remove-btn"
                    @click="removeFile(index)"
                    title="Remove file">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="input-info">
              <span v-if="fileError" class="error-message">{{ fileError }}</span>
              <span v-else-if="uploadedFiles.length === 0" class="error-message">At least one file is required</span>
              <span v-else class="help-text">Upload files related to your project. At least one file is required.</span>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3H21V5H3V3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 7H21V9H3V7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 11H21V13H3V11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 15H21V17H3V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 19H21V21H3V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Category</h3>
          </div>

          <div class="form-group">
            <label for="category">
              Select Category
              <span class="required-mark">*</span>
            </label>
            <div class="select-wrapper">
              <select
                id="category"
                v-model="form.categoryId"
                class="form-control"
                :class="{ 'error': errors.categoryId }"
                required
                @change="validateCategory"
                @blur="validateCategory"
              >
                <option value="">Choose a category for your project</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>

            </div>
            <div class="input-info">
              <span v-if="errors.categoryId" class="error-message">{{ errors.categoryId }}</span>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isSubmitting || !isFormValid || hasSubmitted"
            @click="handleSubmitClick"
          >
            <span v-if="isSubmitting" class="loading-spinner"></span>
            <span v-else class="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            {{ isSubmitting ? 'Creating Project...' : 'Create Project' }}
          </button>
        </div>
      </form>
    </div>
    <div v-if="showLoadingOverlay" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Creating project, please wait...</div>
    </div>
    <div v-if="showSuccessScreen" class="success-screen">
      <div class="success-card">
        <div class="success-icon">🎉</div>
        <h2>Project Created Successfully!</h2>
        <p>Your project has been created. Redirecting to your projects...</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth.service'
import InputSwitch from 'primevue/inputswitch'
import Multiselect from 'vue-multiselect'

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Tag {
  id: string;
  name: string;
}

interface CreateProjectData {
  name: string;
  description?: string;
  isPublic?: boolean;
  tags?: Tag[];
  categoryId: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  categoryId?: string;
  tags?: string;
}

const router = useRouter()

const form = ref<CreateProjectData>({
  name: '',
  description: '',
  categoryId: '',
  tags: [],
  isPublic: false
})

const errors = ref<FormErrors>({})
const isSubmitting = ref(false)
const hasSubmitted = ref(false)
const categories = ref<Category[]>([])
const allTags = ref<Tag[]>([])

// File upload variables
const uploadedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const fileError = ref('')

const showLoadingOverlay = ref(false)
const showSuccessScreen = ref(false)

const nameExists = ref(false)
const nameCheckLoading = ref(false)
const nameCheckError = ref('')

// Validation functions
const validateName = () => {
  const name = form.value.name.trim()

  if (!name) {
    errors.value.name = 'Project name is required'
    return false
  }

  if (name.length < 3) {
    errors.value.name = 'Project name must be at least 3 characters long'
    return false
  }

  if (name.length > 50) {
    errors.value.name = 'Project name cannot exceed 50 characters'
    return false
  }

  // Check for special characters that might cause issues
  const specialCharRegex = /[<>:"/\\|?*]/
  if (specialCharRegex.test(name)) {
    errors.value.name = 'Project name cannot contain special characters: < > : " / \\ | ? *'
    return false
  }

  errors.value.name = undefined
  return true
}

const validateDescription = () => {
  const description = form.value.description || ''

  if (description.length > 500) {
    errors.value.description = 'Description cannot exceed 500 characters'
    return false
  }

  errors.value.description = undefined
  return true
}

const validateCategory = () => {
  if (!form.value.categoryId) {
    errors.value.categoryId = 'Please select a category'
    return false
  }

  errors.value.categoryId = undefined
  return true
}

const validateTags = () => {
  if (form.value.tags && form.value.tags.length > 10) {
    errors.value.tags = 'You can only select up to 10 tags'
    return false
  }

  errors.value.tags = undefined
  return true
}

const validateFiles = () => {
  if (uploadedFiles.value.length === 0) {
    fileError.value = 'At least one file is required'
    return false
  }
  fileError.value = ''
  return true
}

const validateForm = () => {
  const isNameValid = validateName()
  const isDescriptionValid = validateDescription()
  const isCategoryValid = validateCategory()
  const isTagsValid = validateTags()
  const isFileValid = validateFiles()

  return isNameValid && isDescriptionValid && isCategoryValid && isTagsValid && isFileValid
}

// File upload functions
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  addFiles(files)
  target.value = '' // Reset input
}

const handleFileDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  addFiles(files)
}

const addFiles = (files: File[]) => {
  fileError.value = ''

  for (const file of files) {
    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      fileError.value = `File type ${fileExtension} is not supported. Please upload PDF, DOC, DOCX, TXT, or RTF files.`
      continue
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      fileError.value = `File ${file.name} is too large. Maximum size is 10MB.`
      continue
    }

    // Check if file already exists
    const existingFile = uploadedFiles.value.find(f => f.name === file.name)
    if (existingFile) {
      fileError.value = `File ${file.name} is already uploaded.`
      continue
    }

    // Check total number of files (max 5 files)
    if (uploadedFiles.value.length >= 5) {
      fileError.value = 'Maximum 5 files allowed.'
      continue
    }

    uploadedFiles.value.push(file)
  }
}

const removeFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
  fileError.value = ''
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Computed property to check if form is valid
const isFormValid = computed(() => {
  return form.value.name.trim().length >= 3 &&
    form.value.name.trim().length <= 50 &&
    form.value.categoryId &&
    !errors.value.name &&
    !errors.value.description &&
    !errors.value.categoryId &&
    (form.value.tags || []).length <= 10 &&
    uploadedFiles.value.length > 0 &&
    !fileError.value &&
    !nameExists.value
})

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    credentials: 'include', // ✅ Important for cookies
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    try {
      await authService.refreshTokens();

      const retryResponse = await fetch(`/api${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      if (!retryResponse.ok) {
        throw new Error(`API call failed: ${retryResponse.statusText}`);
      }

      return retryResponse.json();
    } catch (refreshError) {
      // Refresh failed, redirect to login
      await authService.logout();
      router.push('/login');
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API call failed:', response.status, errorText);
    throw new Error(`API call failed: ${response.statusText} - ${errorText}`);
  }

  return response.json();
};

const fetchCategories = async () => {
  try {
    const response = await fetch('/api/categories/all', {
      credentials: 'include'
    });

    if (response.ok) {
      categories.value = await response.json();
    } else {
      console.error('Failed to fetch categories:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const fetchTags = async () => {
  try {
    const response = await fetch('/api/project-tag/all', {
      credentials: 'include'
    });

    if (response.ok) {
      allTags.value = await response.json();
    } else {
      console.error('Failed to fetch tags:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching tags:', error);
  }
};

// Prevent double submission
const handleSubmitClick = (event: Event) => {
  event.preventDefault()

  // Prevent multiple submissions
  if (isSubmitting.value || hasSubmitted.value) {
    console.log('Form submission already in progress or completed')
    return
  }

  handleSubmit()
}

const handleSubmit = async () => {
  // Additional guard to prevent double submission
  if (isSubmitting.value || hasSubmitted.value) {
    console.log('Form submission already in progress or completed')
    return
  }

  // Validate form before submission
  if (!validateForm()) {
    return
  }

  // Validate that at least one file is uploaded
  if (uploadedFiles.value.length === 0) {
    fileError.value = 'At least one file is required'
    return
  }

  // Set submission flags
  isSubmitting.value = true
  hasSubmitted.value = true
  showLoadingOverlay.value = true

  try {
    console.log('Submitting project creation request...')

    // Convert tags to string array for backend
    const payload = {
      name: form.value.name,
      description: form.value.description,
      tags: form.value.tags ? form.value.tags.map((tag: Tag) => tag.name) : [],
      isPrivate: !form.value.isPublic,
      categoryId: String(form.value.categoryId),
    }

    const result = await apiCall('/projects/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    console.log('Project create response:', result)
    // Lấy branchId từ response (thử cả 2 cách)
    const branchId = result.branchId || (result.data && result.data.branchId);
    console.log('branchId:', branchId);
    const projectId = result.projectId || (result.data && result.data.projectId);
    console.log('Uploading files with projectId:', projectId, 'branchId:', branchId)

    // Upload từng file với đúng projectId và branchId
    for (const file of uploadedFiles.value) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('branchId', branchId);

      console.log('Uploading file:', file.name, 'to project:', projectId, 'branch:', branchId);

      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!uploadResponse.ok) {
        console.error('File upload failed:', file.name, uploadResponse.statusText)
        throw new Error(`File upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('File upload response for', file.name, ':', uploadResult);
    }

    // Show success message with file upload info
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
      <div class="success-content">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.76488 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Project created successfully with ${uploadedFiles.value.length} file(s) uploaded!</span>
      </div>
    `;
    document.body.appendChild(successMessage);

    // Wait 3 seconds before redirecting
    setTimeout(() => {
      // Remove success message
      const existingMessage = document.querySelector('.success-message');
      if (existingMessage && existingMessage.parentNode) {
        existingMessage.parentNode.removeChild(existingMessage);
      }
      // Redirect to project page
      router.push(`/projects/${result.projectId}`);
    }, 3000);

    showLoadingOverlay.value = false
    showSuccessScreen.value = true
    setTimeout(() => {
      router.push('/projects')
    }, 2500)
  } catch (error: any) {
    console.error('Project creation error:', error)

    // Reset submission flags on error
    hasSubmitted.value = false

    if (error.message.includes('Authentication required') || error.message.includes('Session expired')) {
      alert('Please log in to create a project')
      router.push('/login')
    } else {
      alert('Failed to create project: ' + error.message)
    }
  } finally {
    isSubmitting.value = false
    showLoadingOverlay.value = false
  }
}

const checkProjectName = async (name: string) => {
  if (!name || name.length < 3) {
    nameExists.value = false
    nameCheckError.value = ''
    return
  }
  nameCheckLoading.value = true
  try {
    const res = await fetch(`/api/projects/check-name?name=${encodeURIComponent(name)}`, { credentials: 'include' })
    const data = await res.json()
    nameExists.value = data.exists
    nameCheckError.value = nameExists.value ? 'Project name already exists. Please choose another.' : ''
  } catch (e) {
    nameCheckError.value = 'Could not check project name.'
  } finally {
    nameCheckLoading.value = false
  }
}

// Debounce project name check on input
let nameCheckTimeout: any
watch(() => form.value.name, (newName: string) => {
  clearTimeout(nameCheckTimeout)
  nameCheckTimeout = setTimeout(() => {
    checkProjectName(newName)
  }, 500)
})

onMounted(() => {
  // Check if user is authenticated before fetching data
  if (!authService.isAuthenticated()) {
    router.push('/login')
    return
  }

  fetchCategories()
  fetchTags()
})
</script>

<style scoped>
.create-project-container {
  min-height: 100vh;
  padding: 2rem 0 2rem 0;
  padding-left: 0 !important;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  background: #f8fafc;
  width: 100vw;
  max-width: 100vw;
}

.create-project-form {
  width: 100vw;
  max-width: 100vw;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-left: -8rem;
}

.form {
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: none;
}

.form-section {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f1f5f9;
}

.section-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.section-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

label {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.required-mark {
  color: #ef4444;
  font-size: 1.2rem;
  line-height: 1;
  font-weight: bold;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-style: italic;
}

.input-wrapper,
.textarea-wrapper,
.select-wrapper {
  position: relative;
}

.form-control {
  width: 100%;
  max-width: none;
  min-width: 0;
  box-sizing: border-box;
  padding: 1rem 1rem 1rem 3.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  background-color: #f9fafb;
  color: #374151;
  font-weight: 500;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  background-color: white;
  transform: translateY(-1px);
}

.form-control.error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.form-control.error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.form-control:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

textarea.form-control {
  resize: vertical;
  min-height: 120px;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.input-icon,
.textarea-icon,
.select-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  transition: color 0.3s ease;
}

.textarea-icon {
  top: 1.5rem;
  transform: none;
}

.form-control:focus + .input-icon,
.form-control:focus + .textarea-icon {
  color: #667eea;
}

.form-control.error + .input-icon,
.form-control.error + .textarea-icon {
  color: #ef4444;
}

.select-icon {
  right: 1rem;
  left: auto;
  pointer-events: none;
}

.input-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-top: 0.5rem;
}

.char-count {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
  flex: 1;
}

.form-actions {
  margin-top: 1rem;
}

.btn {
  width: 100%;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading spinner */
.loading-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Success message styles */
.success-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 1.5rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
  z-index: 1000;
  animation: slideDown 0.4s ease-out;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 320px;
  text-align: center;
}

.success-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-weight: 600;
}

.success-content svg {
  color: white;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.success-content span {
  font-size: 1rem;
}

@keyframes slideDown {
  from {
    transform: translateX(-50%) translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

/* Multiselect custom styles */
.multiselect-custom {
  margin-bottom: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .create-project-container {
    padding: 1rem;
  }

  .create-project-form {
    border-radius: 20px;
  }

  .form {
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .form-section {
    padding: 1.25rem;
  }

  .form-control {
    padding: 0.875rem 0.875rem 0.875rem 2.75rem;
  }

  .input-icon,
  .textarea-icon {
    left: 0.875rem;
  }

  .textarea-icon {
    top: 1.25rem;
  }

  .btn {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }

  .success-message {
    top: 10px;
    padding: 1.25rem 2rem;
    min-width: 280px;
  }

  .success-content svg {
    width: 20px;
    height: 20px;
  }

  .success-content span {
    font-size: 1rem;
  }

  .input-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .form {
    padding: 1rem;
  }

  .form-section {
    padding: 1rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .section-icon {
    width: 35px;
    height: 35px;
  }

  .section-header h3 {
    font-size: 1.1rem;
  }

  .success-message {
    top: 10px;
    padding: 1rem 1.5rem;
    min-width: 250px;
  }

  .success-content svg {
    width: 18px;
    height: 18px;
  }

  .success-content span {
    font-size: 0.95rem;
  }
}

/* File Upload Styles */
.file-upload-container {
  width: 100%;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f9fafb;
  position: relative;
  overflow: hidden;
}

.file-upload-area:hover {
  border-color: #667eea;
  background: #f0f4ff;
  transform: translateY(-1px);
}

.file-upload-area.drag-over {
  border-color: #667eea;
  background: #e0e7ff;
}

.file-upload-area.has-files {
  border-color: #10b981;
  background: #f0fdf4;
}

.file-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.file-upload-icon {
  color: #6b7280;
  transition: color 0.3s ease;
}

.file-upload-area:hover .file-upload-icon {
  color: #667eea;
}

.file-upload-area.drag-over .file-upload-icon {
  color: #667eea;
}

.file-upload-area.has-files .file-upload-icon {
  color: #10b981;
}

.file-upload-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.upload-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.upload-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.file-input-hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.file-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.file-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.file-icon {
  color: #6b7280;
  flex-shrink: 0;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: #6b7280;
}

.file-remove-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.file-remove-btn:hover {
  background: #fef2f2;
  color: #dc2626;
  transform: scale(1.1);
}

.file-remove-btn:focus {
  outline: none;
  background: #fef2f2;
  color: #dc2626;
}

/* Responsive adjustments for file upload */
@media (max-width: 768px) {
  .file-upload-area {
    padding: 1.5rem;
  }

  .upload-title {
    font-size: 1rem;
  }

  .upload-subtitle {
    font-size: 0.8rem;
  }

  .file-item {
    padding: 0.5rem 0.75rem;
  }

  .file-name {
    font-size: 0.8rem;
  }

  .file-size {
    font-size: 0.7rem;
  }
}

.loading-overlay {
  position: fixed;
  z-index: 2000;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 6px solid #e5e7eb;
  border-top: 6px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1.2rem;
  color: #374151;
  font-weight: 500;
}

.success-screen {
  position: fixed;
  z-index: 3000;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 41, 59, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.success-card {
  background: #fff;
  border-radius: 24px;
  padding: 2.5rem 3rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  text-align: center;
  min-width: 340px;
}
.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.success-card h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #1e293b;
  font-weight: 700;
}
.success-card p {
  color: #64748b;
  font-size: 1.1rem;
}
</style>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

