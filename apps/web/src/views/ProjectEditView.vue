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
        <h1>Edit Project</h1>
        <p class="subtitle">Update project information and settings</p>
      </div>

      <form @submit.prevent="handleSubmit" class="edit-form">
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
          ></textarea>
        </div>

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
                {{ tag }}
                <button
                  type="button"
                  class="tag-remove"
                  @click="removeTag(index)"
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
            >
          </div>
        </div>

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

        <div class="form-actions">
          <button type="button" @click="cancelEdit" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="loading-spinner"></span>
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
        tags: project.value.tags?.map(tag => tag.name) || [],
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
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.edit-header {
  text-align: center;
  margin-bottom: 2rem;
}

.edit-header h1 {
  margin: 0 0 0.5rem 0;
  color: #1a202c;
  font-size: 2rem;
  font-weight: 600;
}

.subtitle {
  color: #718096;
  margin: 0;
  font-size: 1rem;
}

.edit-form {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  color: #2d3748;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.required-mark {
  color: #e53e3e;
  font-size: 1.2rem;
  line-height: 1;
}

.help-text {
  color: #718096;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background-color: #f8fafc;
  color: #2d3748;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  background-color: white;
}

textarea.form-control {
  resize: vertical;
  min-height: 120px;
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
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #f8fafc;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: #4299e1;
  color: white;
  border-radius: 4px;
  font-size: 0.875rem;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-remove:hover {
  opacity: 0.8;
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
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 0.75rem 1.5rem;
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

@media (max-width: 768px) {
  .project-edit-view {
    padding: 1rem;
  }

  .edit-form {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
