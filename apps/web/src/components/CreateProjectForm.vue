<template>
  <div class="create-project-form">
    <div class="form-header">
      <h2>Create New Project</h2>
      <p class="form-description">Fill in the details below to create a new project</p>
    </div>

    <form @submit.prevent="handleSubmit" class="form">
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
          placeholder="Enter a descriptive project name"
        >
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="form.description"
          class="form-control"
          rows="4"
          placeholder="Provide details about your project (optional)"
        ></textarea>
        <span class="help-text">A good description helps others understand your project better</span>
      </div>

      <div class="form-group">
        <label for="category">
          Category
          <span class="required-mark">*</span>
        </label>
        <select
          id="category"
          v-model="form.categoryId"
          class="form-control"
          required
        >
          <option value="">Select a category</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="loading-spinner"></span>
          {{ isSubmitting ? 'Creating Project...' : 'Create Project' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
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
  isPublic?: boolean;
  tags?: string[];
  categoryId: string;
}

const router = useRouter()

const form = ref<CreateProjectData>({
  name: '',
  description: '',
  categoryId: '',
  tags: [],
  isPublic: false
})

const newTag = ref('')
const isSubmitting = ref(false)
const categories = ref<Category[]>([])

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

const fetchCategories = async () => {
  try {
    const response = await fetch('/api/categories/all')
    categories.value = await response.json()
  } catch (error) {
    console.error('Error fetching categories:', error)
    alert('Failed to load categories')
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
  if (!form.value.name) return alert('Project name is required')
  if (!form.value.categoryId) return alert('Category is required')

  isSubmitting.value = true

  try {
    const result = await apiCall('/projects/create', {
      method: 'POST',
      body: JSON.stringify(form.value)
    })
    alert('Project created successfully!')
    router.push(`/projects/${result.projectId}`)
  } catch (error: any) {
    console.error(error)
    alert('Failed to create project: ' + error.message)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.create-project-form {
  max-width: 700px;
  margin: 2rem auto;
  padding: 2.5rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.form-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

h2 {
  color: #1a202c;
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: 600;
}

.form-description {
  color: #718096;
  font-size: 1rem;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subcategory-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-subcategory-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  font-size: 1.25rem;
  font-weight: bold;
}

label {
  color: #2d3748;
  font-weight: 500;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
}

.form-control {
  padding: 0.875rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background-color: #f8fafc;
  color: #2d3748;
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  background-color: white;
}

.form-control:disabled {
  background-color: #edf2f7;
  cursor: not-allowed;
}

textarea.form-control {
  resize: vertical;
  min-height: 120px;
}

.form-actions {
  margin-top: 1rem;
}

.btn {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background-color: #4299e1;
  color: white;
  width: 100%;
}

.btn-secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3182ce;
  transform: translateY(-1px);
}

.btn-secondary:hover:not(:disabled) {
  background-color: #cbd5e0;
  transform: translateY(-1px);
}

.btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #718096;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: #f7fafc;
  color: #2d3748;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

/* Loading spinner */
.loading-spinner {
  width: 1rem;
  height: 1rem;
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

/* Responsive adjustments */
@media (max-width: 640px) {
  .create-project-form {
    margin: 1rem;
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  .form-control {
    padding: 0.75rem;
  }

  .modal-content {
    padding: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1.25rem;
  }
}
</style>

