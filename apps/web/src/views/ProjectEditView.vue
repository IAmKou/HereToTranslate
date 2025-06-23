<template>
  <div class="project-edit-view">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Loading project...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadProject" class="btn btn-secondary">Try Again</button>
    </div>

    <div v-else-if="project" class="edit-content">
      <div class="edit-header">
        <div class="edit-header-icon">
          <!-- Pencil/Edit SVG Icon -->
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="12" fill="#4299e1"/>
            <path d="M7 17.25V19H8.75L15.81 11.94L14.06 10.19L7 17.25ZM17.71 9.04C18.1 8.65 18.1 8.02 17.71 7.63L16.37 6.29C15.98 5.9 15.35 5.9 14.96 6.29L13.13 8.12L15.88 10.87L17.71 9.04Z" fill="white"/>
          </svg>
        </div>
        <div>
          <h1>Edit Project</h1>
          <p class="subtitle">Update project information and settings</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="edit-form">
        <section class="form-section">
          <h2 class="section-title">
            <span class="section-icon">
              <!-- Info SVG Icon -->
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="10" fill="#3182ce"/>
                <rect x="9" y="7" width="2" height="6" rx="1" fill="white"/>
                <rect x="9" y="5" width="2" height="2" rx="1" fill="white"/>
              </svg>
            </span>
            Basic Information
          </h2>
          <div class="form-group">
            <label for="name">
              Project Name
              <span class="required-mark">*</span>
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              class="form-control"
              placeholder="Enter project name"
              maxlength="100"
            >
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="form.description"
              class="form-control"
              rows="4"
              placeholder="Provide details about your project"
              maxlength="500"
            ></textarea>
            <span class="char-count">{{ form.description?.length || 0 }}/500</span>
          </div>
        </section>

        <section class="form-section">
          <h2 class="section-title">
            <span class="section-icon">
              <!-- Category SVG Icon -->
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="16" height="12" rx="3" fill="#38a169"/>
                <rect x="6" y="8" width="8" height="4" rx="1" fill="white"/>
              </svg>
            </span>
            Category & Tags
          </h2>
          <div class="form-group">
            <label for="category">Category</label>
            <select
              id="category"
              v-model="form.categoryId"
              class="form-control"
            >
              <option value="">Select a category</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="tags">Tags</label>
            <div class="tags-input-container">
              <div class="tags-display">
                <span
                  v-for="(tag, index) in form.tags"
                  :key="index"
                  class="tag"
                >
                  <span class="tag-icon">
                    <!-- Tag SVG Icon -->
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="6" width="16" height="8" rx="3" fill="#4299e1"/>
                    </svg>
                  </span>
                  {{ tag }}
                  <button
                    type="button"
                    class="tag-remove"
                    @click="removeTag(index)"
                    aria-label="Remove tag"
                  >
                    ×
                  </button>
                </span>
              </div>
              <input
                id="tags"
                v-model="newTag"
                type="text"
                class="form-control"
                placeholder="Add tags (press Enter to add)"
                @keydown.enter.prevent="addTag"
                maxlength="30"
              >
            </div>
            <span class="help-text">Tags help users find your project. Press Enter to add.</span>
          </div>
        </section>

        <section class="form-section">
          <h2 class="section-title">
            <span class="section-icon">
              <!-- Visibility SVG Icon -->
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="10" cy="10" rx="8" ry="5" fill="#ecc94b"/>
                <circle cx="10" cy="10" r="2.5" fill="white"/>
              </svg>
            </span>
            Visibility
          </h2>
          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="form.isPublic"
                type="checkbox"
                class="checkbox-input"
              >
              <span class="checkbox-text">Make this project public</span>
            </label>
            <span class="help-text">Public projects are visible to all users</span>
          </div>
        </section>

        <div class="form-actions">
          <button type="button" @click="cancelEdit" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="loading-spinner small"></span>
            {{ isSubmitting ? 'Updating...' : 'Update Project' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '../services/auth.service'

const route = useRoute()
const router = useRouter()

// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  tags?: Array<{ id: string; name: string }>;
  category?: { id: string; name: string };
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  isPublic?: boolean;
  addTags?: string[];
  removeTags?: string[];
  categoryId?: string;
  tags?: string[]; // For form handling
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

const project = ref<Project | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const isSubmitting = ref(false)
const newTag = ref('')

const categories = ref<Category[]>([])

const form = ref<UpdateProjectData>({
  name: '',
  description: '',
  categoryId: '',
  tags: [],
  isPublic: false
})

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = authService.getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}

const loadProject = async () => {
  try {
    loading.value = true
    error.value = null
    const projectId = route.params.projectId as string
    project.value = await apiCall(`/projects/${projectId}`)

    // Populate form with current project data
    if (project.value) {
      form.value = {
        name: project.value.name,
        description: project.value.description || '',
        categoryId: project.value.category?.id || '',
        tags: project.value.tags?.map((tag: any) => tag.name) || [],
        isPublic: project.value.isPublic
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load project'
    console.error('Error loading project:', err)
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const response = await fetch('/api/categories/all')
    categories.value = await response.json()
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && form.value.tags && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
  }
  newTag.value = ''
}

const removeTag = (index: number) => {
  if (form.value.tags) {
    form.value.tags.splice(index, 1)
  }
}

const handleSubmit = async () => {
  if (!project.value || !form.value.name) return

  isSubmitting.value = true

  try {
    await apiCall(`/projects/${project.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(form.value)
    })
    alert('Project updated successfully!')
    router.push(`/projects/${project.value.id}`)
  } catch (err: any) {
    alert('Failed to update project: ' + err.message)
  } finally {
    isSubmitting.value = false
  }
}

const cancelEdit = () => {
  router.push(`/projects/${project.value?.id}`)
}

onMounted(() => {
  loadProject()
  fetchCategories()
})
</script>

<style scoped>
.project-edit-view {
  padding: 2.5rem 2rem;
  max-width: 700px;
  margin: 0 auto;
  background: #f7fafc;
  min-height: 100vh;
}

.loading,
.error {
  text-align: center;
  padding: 3rem 2rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}
.loading-spinner.small {
  width: 1.2rem;
  height: 1.2rem;
  border-width: 2px;
  margin: 0 0.5rem 0 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.edit-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  text-align: left;
  margin-bottom: 2.5rem;
  border-bottom: 1.5px solid #e2e8f0;
  padding-bottom: 1.5rem;
}
.edit-header-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e6f0fa;
  border-radius: 50%;
  width: 56px;
  height: 56px;
}
.edit-header h1 {
  margin: 0 0 0.25rem 0;
  color: #1a202c;
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -1px;
}
.subtitle {
  color: #718096;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 400;
}

.edit-form {
  background: white;
  padding: 2.2rem 2rem 2rem 2rem;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 2.2rem;
}

.form-section {
  margin-bottom: 0;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1.1rem;
  letter-spacing: -0.5px;
}
.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-group {
  margin-bottom: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.form-group label {
  color: #2d3748;
  font-weight: 500;
  margin-bottom: 0.2rem;
  font-size: 1rem;
}
.required-mark {
  color: #e53e3e;
  font-size: 1.1rem;
  line-height: 1;
  margin-left: 0.2rem;
}
.help-text {
  color: #718096;
  font-size: 0.89rem;
  margin-top: 0.18rem;
  display: block;
}
.char-count {
  color: #a0aec0;
  font-size: 0.85rem;
  margin-top: 0.1rem;
  text-align: right;
}

.form-control {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background-color: #f8fafc;
  color: #2d3748;
  transition: all 0.2s ease;
  font-family: inherit;
}
.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.09);
  background-color: white;
}
textarea.form-control {
  resize: vertical;
  min-height: 110px;
}

.tags-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.5rem 0.5rem 0.2rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #f8fafc;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.22rem 0.6rem 0.22rem 0.4rem;
  background-color: #4299e1;
  color: white;
  border-radius: 4px;
  font-size: 0.93rem;
  font-weight: 500;
  position: relative;
}
.tag-icon {
  margin-right: 0.18rem;
  display: flex;
  align-items: center;
}
.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 0 0 0.2rem;
  width: 1.1rem;
  height: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.15s;
}
.tag-remove:hover {
  background: rgba(0,0,0,0.13);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.checkbox-input {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #4299e1;
}
.checkbox-text {
  font-weight: 500;
  color: #2d3748;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.2rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-primary {
  background-color: #4299e1;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background-color: #3182ce;
}
.btn-secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}
.btn-secondary:hover {
  background-color: #cbd5e0;
}
.btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 900px) {
  .project-edit-view {
    padding: 1.2rem 0.5rem;
    max-width: 100vw;
  }
  .edit-form {
    padding: 1.2rem 0.5rem 1.2rem 0.5rem;
  }
}
@media (max-width: 600px) {
  .edit-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
    padding-bottom: 1rem;
  }
  .edit-header-icon {
    width: 44px;
    height: 44px;
  }
  .edit-header h1 {
    font-size: 1.4rem;
  }
  .edit-form {
    padding: 0.7rem 0.2rem 1rem 0.2rem;
    border-radius: 8px;
    gap: 1.2rem;
  }
  .form-actions {
    flex-direction: column;
    gap: 0.7rem;
    padding-top: 0.7rem;
  }
  .btn {
    width: 100%;
    justify-content: center;
  }
  .section-title {
    font-size: 1rem;
  }
}
</style>
