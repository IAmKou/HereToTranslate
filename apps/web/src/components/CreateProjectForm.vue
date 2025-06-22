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
            <h3>Project Details</h3>
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
              <div class="select-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
            <div class="input-info">
              <span v-if="errors.categoryId" class="error-message">{{ errors.categoryId }}</span>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !isFormValid">
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
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth.service'


interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CreateProjectData {
  name: string;

  description?: string;
  isPrivate?: boolean;
  tags?: string[];
  categoryId: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  categoryId?: string;
}

const router = useRouter()

const form = ref<CreateProjectData>({
  name: '',

  description: '',
  categoryId: '',
  tags: [],
  isPrivate: false,
})

const errors = ref<FormErrors>({})
const isSubmitting = ref(false)
const categories = ref<Category[]>([])


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

const validateForm = () => {
  const isNameValid = validateName()
  const isDescriptionValid = validateDescription()
  const isCategoryValid = validateCategory()

  return isNameValid && isDescriptionValid && isCategoryValid
}

// Computed property to check if form is valid
const isFormValid = computed(() => {
  return form.value.name.trim().length >= 3 &&
    form.value.name.trim().length <= 50 &&
    form.value.categoryId &&
    !errors.value.name &&
    !errors.value.description &&
    !errors.value.categoryId
})

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = authService.getAccessToken()

  if (!token) {
    throw new Error('Authentication required. Please log in.')
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  })

  if (response.status === 401) {
    // Token might be expired, try to refresh
    try {
      await authService.refreshTokens()
      const newToken = authService.getAccessToken()
      if (newToken) {
        // Retry the request with new token
        const retryResponse = await fetch(`/api${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`,
            ...options.headers
          }
        })

        if (!retryResponse.ok) {
          throw new Error(`API call failed: ${retryResponse.statusText}`)
        }
        return retryResponse.json()
      }
    } catch (refreshError) {
      // Refresh failed, redirect to login
      authService.logout()
      router.push('/login')
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}

const fetchCategories = async () => {
  try {
    const token = authService.getAccessToken()
    if (!token) {
      console.error('No authentication token available')
      return
    }

    const response = await fetch('/api/categories/all', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      categories.value = await response.json()
    } else {
      console.error('Failed to fetch categories:', response.statusText)
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

const handleSubmit = async () => {
  // Validate form before submission
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {




    const result = await apiCall('/projects/create', {
      method: 'POST',
      body: JSON.stringify(form.value)
    })

    // Show success message
    const successMessage = document.createElement('div')
    successMessage.className = 'success-message'
    successMessage.innerHTML = `
      <div class="success-content">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.76488 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Project created successfully!</span>
      </div>
    `
    document.body.appendChild(successMessage)

    // Wait 3 seconds before redirecting
    setTimeout(() => {
      // Remove success message
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage)
      }
      // Redirect to project page
      router.push(`/projects/${result.projectId}`)
    }, 3000)

  } catch (error: any) {
    console.error('Project creation error:', error)

    if (error.message.includes('Authentication required') || error.message.includes('Session expired')) {
      alert('Please log in to create a project')
      router.push('/login')
    } else {
      alert('Failed to create project: ' + error.message)
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  // Check if user is authenticated before fetching data
  if (!authService.isAuthenticated()) {
    router.push('/login')
    return
  }

  fetchCategories()
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
</style>

