<template>
  <div class="create-project-form">
    <h2>Create New Project</h2>
    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label for="name">Project Name</label>
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
          placeholder="Enter project description"
        ></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? 'Creating...' : 'Create Project' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import axios from 'axios'

// Environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const form = ref({
  name: '',
  description: '',
})

const isSubmitting = ref(false)

const createdBy = '1' // dummy user ID

const handleSubmit = async () => {
  if (!form.value.name) return alert('Project name is required')

  isSubmitting.value = true

  try {
    await axios.post(`${API_BASE_URL}/projects`, {
      ...form.value,
      createdBy,
    })

    alert('Project created successfully!')
    form.value.name = ''
    form.value.description = ''
  } catch (error: any) {
    console.error(error)
    alert('Failed to create project: ' + (error?.response?.data?.message || error.message))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.create-project-form {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: 600;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  color: #4a5568;
  font-weight: 500;
  font-size: 0.95rem;
}

.form-control {
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background-color: #f8fafc;
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  background-color: white;
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  margin-top: 1rem;
}

.btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #4299e1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3182ce;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.7;
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
    padding: 0.6rem 0.8rem;
  }
}
</style>

