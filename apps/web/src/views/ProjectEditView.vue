<template>
  <div class="project-edit-page">
    <!-- Navbar -->
    <Navbar />

    <div class="main-content">
      <!-- Sidebar -->
      <Sidebar />

      <!-- Main content area -->
      <div class="content-wrapper">
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
                <svg
                  fill="none"
                  height="36"
                  viewBox="0 0 24 24"
                  width="36"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect fill="#4299e1" height="24" rx="12" width="24" />
                  <path
                    d="M7 17.25V19H8.75L15.81 11.94L14.06 10.19L7 17.25ZM17.71 9.04C18.1 8.65 18.1 8.02 17.71 7.63L16.37 6.29C15.98 5.9 15.35 5.9 14.96 6.29L13.13 8.12L15.88 10.87L17.71 9.04Z"
                    fill="white"
                  />
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
              <svg
                fill="none"
                height="20"
                viewBox="0 0 20 20"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="10" cy="10" fill="#3182ce" r="10" />
                <rect fill="white" height="6" rx="1" width="2" x="9" y="7" />
                <rect fill="white" height="2" rx="1" width="2" x="9" y="5" />
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
                    @blur="nameTouched = true"
                  />
                  <span v-if="nameErrorMessage" class="error-text">
              {{ nameErrorMessage }}
            </span>
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
                  <span class="char-count"
                  >{{ form.description?.length || 0 }}/500</span
                  >
                </div>
              </section>

              <section class="form-section">
                <h2 class="section-title">
            <span class="section-icon">
              <!-- Category SVG Icon -->
              <svg
                fill="none"
                height="20"
                viewBox="0 0 20 20"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  fill="#38a169"
                  height="12"
                  rx="3"
                  width="16"
                  x="2"
                  y="4"
                />
                <rect fill="white" height="4" rx="1" width="8" x="6" y="8" />
              </svg>
            </span>
                  Category & Tags
                </h2>
                <div class="form-group mt-4">
                  <label for="category"
                  >Category
                    <span class="help-text"
                    >Choose the appropriate project category.</span
                    >
                  </label>
                  <select
                    id="category"
                    v-model="form.categoryId"
                    class="form-control"
                    @blur="categoryTouched = true"
                  >
                    <option value="">Select a category</option>
                    <option
                      v-for="category in categories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ category.name }}
                    </option>
                  </select>
                  <span v-if="categoryError" class="error-text">
              Category is required.
            </span>
                </div>

                <div class="form-group mt-4">
                  <label for="tags"
                  >Tags
                    <span class="help-text"
                    >Tags help categorize and search your project.</span
                    ></label
                  >
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
                  />
                  <span class="help-text">Select one or many tags.</span>
                </div>
              </section>

              <section class="form-section">
                <h2 class="section-title">
            <span class="section-icon">
              <!-- Visibility SVG Icon -->
              <svg
                fill="none"
                height="20"
                viewBox="0 0 20 20"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse cx="10" cy="10" fill="#ecc94b" rx="8" ry="5" />
                <circle cx="10" cy="10" fill="white" r="2.5" />
              </svg>
            </span>
                  Visibility
                </h2>
                <div class="form-group">
                  <label class="switch-label">
                    <input
                      v-model="form.isPrivate"
                      type="checkbox"
                      class="switch-input"
                      @change="() => {}"
                    />
                    <span class="switch-slider"></span>
                    <span class="switch-text">
                {{ form.isPrivate ? 'Private' : 'Public' }}
              </span>
                  </label>
                  <span class="help-text">
              {{
                      form.isPrivate
                        ? 'Only you and collaborators can see this project.'
                        : 'Public projects are visible to all users.'
                    }}
            </span>
                </div>
              </section>

              <div class="form-actions">
                <button type="button" @click="cancelEdit" class="btn btn-secondary">
                  Cancel
                </button>
                <button
                  :disabled="isSubmitting"
                  class="btn btn-primary"
                  type="submit"
                >
                  <span v-if="isSubmitting" class="loading-spinner small"></span>
                  {{ isSubmitting ? 'Updating...' : 'Update Project' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '../api';
import Multiselect from 'vue-multiselect';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import AppFooter from '../components/AppFooter.vue';

// Toast notification
const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 2200);
};

const route = useRoute();
const router = useRouter();

// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
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
  isPrivate?: boolean;
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

const project = ref<Project | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const newTag = ref('');
const allTags = ref<string[]>([]);
const tagInputFocused = ref(false);
const nameTouched = ref(false);
const categories = ref<Category[]>([]);
const categoryTouched = ref(false);

const form = ref<UpdateProjectData>({
  name: '',
  description: '',
  categoryId: '',
  tags: [],
  isPrivate: false,
});

const nameErrorMessage = computed(() => {
  if (!form.value.name) return 'Project name is required.';
  if (form.value.name.length < 3)
    return 'Project name must be at least 3 characters.';
  return null;
});
const categoryError = computed(
  () => categoryTouched.value && !form.value.categoryId
);

const loadProject = async () => {
  try {
    loading.value = true;
    error.value = null;
    const projectId = route.params.projectId as string;
    const { data } = await axiosInstance.get(`/projects/${projectId}`);
    project.value = data;

    // Populate form
    if (project.value) {
      form.value = {
        name: project.value.name,
        description: project.value.description || '',
        categoryId: project.value.category?.id || '',
        tags: project.value.tags?.map((tag) => tag.name) || [],
        isPrivate: project.value.isPrivate,
      };
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to load project';
    error.value = msg;
    showToast(msg, 'error');
    console.error('Error loading project:', err);
  } finally {
    loading.value = false;
  }
};

const fetchTags = async () => {
  try {
    const res = await axiosInstance.get('/project-tag/all');
    allTags.value = res.data.map((tag: any) => tag.name);
  } catch (err) {
    console.error('Error fetching tags:', err);
  }
};

const fetchCategories = async () => {
  try {
    const response = await axiosInstance.get('/categories/all');
    categories.value = response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const handleSubmit = async () => {
  nameTouched.value = true;
  if (!project.value || !form.value.name) return;
  isSubmitting.value = true;
  try {
    // Tính toán addTags và removeTags
    const oldTags = project.value?.tags?.map((tag) => tag.name) || [];
    const newTags = form.value.tags || [];
    const addTags = newTags.filter((tag) => !oldTags.includes(tag));
    const removeTags = oldTags.filter((tag) => !newTags.includes(tag));

    await axiosInstance.patch(`/projects/${project.value.id}`, {
      ...form.value,
      addTags,
      removeTags,
    });
    showToast('Project updated successfully!', 'success');
    setTimeout(() => router.push(`/projects/${project.value.id}`), 1200);
  } catch (err: any) {
    showToast('Failed to update project: ' + err.message, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const cancelEdit = () => {
  router.push(`/projects/${project.value?.id}`);
};

onMounted(() => {
  loadProject();
  fetchCategories();
  fetchTags();
});
</script>

<style scoped>
.project-edit-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  display: flex;
  flex: 1;
}

.content-wrapper {
  flex: 1;
  padding: 2rem;
  background: #f7fafc;
  overflow-y: auto;
}

.project-edit-view {
  max-width: 700px;
  margin: 0 auto;
  background: #f7fafc;
}

.multiselect-custom .multiselect__tags {
  min-height: 48px;
  padding: 0.85rem 1.1rem;
  font-size: 1.05rem;
  background-color: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  box-shadow: none;
}

.multiselect__input {
  font-size: 1.05rem;
}

.multiselect-custom .multiselect__placeholder {
  margin-bottom: 0;
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
  padding: 2.5rem 2.2rem 2.2rem 2.2rem;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.09);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 2.7rem;
}

.form-section {
  margin-bottom: 0;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 1.18rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 1.3rem;
  letter-spacing: -0.5px;
}
.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-group label {
  color: #2d3748;
  font-weight: 500;
  margin-bottom: 0.2rem;
  font-size: 1rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  vertical-align: middle;
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
  padding: 0.85rem 1.1rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1.05rem;
  background-color: #f8fafc;
  color: #2d3748;
  transition: all 0.2s;
  font-family: inherit;
  box-shadow: none;
}
.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.13);
  background-color: #fff;
}
textarea.form-control {
  resize: vertical;
  min-height: 110px;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  cursor: pointer;
  font-size: 1.05rem;
  user-select: none;
}
.switch-input {
  display: none;
}
.switch-slider {
  width: 40px;
  height: 22px;
  background: #e2e8f0;
  border-radius: 11px;
  position: relative;
  transition: background 0.2s;
}
.switch-input:checked + .switch-slider {
  background: #4299e1;
}
.switch-slider::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.switch-input:checked + .switch-slider::before {
  transform: translateX(18px);
}
.switch-text {
  font-weight: 500;
  color: #2d3748;
}
.error-text {
  color: #e53e3e;
  font-size: 0.92rem;
  margin-top: 0.1rem;
}
.form-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.2rem 1rem;
  margin-bottom: 1.2rem;
  border: 1px solid #e2e8f0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1.2rem;
  margin-top: 1.7rem;
  padding-top: 1.3rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 0.8rem 1.7rem;
  border: none;
  border-radius: 10px;
  font-size: 1.07rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-primary {
  background-color: #4299e1;
  color: white;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.07);
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

/* Toast notification */
.custom-toast {
  position: fixed;
  top: 2.5rem;
  right: 2.5rem;
  z-index: 9999;
  background: #4299e1;
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.08rem;
  font-weight: 600;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-30px);
  transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.13);
}
.custom-toast.show {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.custom-toast.error {
  background: #e53e3e;
}

@media (max-width: 900px) {
  .content-wrapper {
    padding: 1rem;
  }
  .project-edit-view {
    max-width: 100%;
  }
  .edit-form {
    padding: 1.2rem 0.5rem 1.2rem 0.5rem;
  }
  .custom-toast {
    right: 1rem;
    top: 1rem;
    padding: 0.8rem 1.2rem;
    font-size: 0.98rem;
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

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
