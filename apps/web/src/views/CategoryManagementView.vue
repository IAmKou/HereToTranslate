<template>
  <div class="category-management">
    <h1 class="page-title">Category Management</h1>
    
    <!-- Create/Edit Category Form -->
    <div class="form-section">
      <h2>{{ editMode ? 'Edit Category' : 'Create New Category' }}</h2>
      <form @submit.prevent="saveCategory" class="category-form">
        <div class="form-group">
          <label for="categoryName">Category Name:</label>
          <input 
            id="categoryName" 
            v-model="categoryForm.name" 
            type="text" 
            required 
            class="text-input"
            placeholder="Enter category name"
          />
        </div>
        
        <div class="form-group">
          <label for="categoryDescription">Description:</label>
          <textarea
            id="categoryDescription"
            v-model="categoryForm.description"
            class="text-input"
            rows="3"
            placeholder="Enter category description (optional)"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="material-icons">{{ editMode ? 'update' : 'add_circle' }}</span>
            {{ editMode ? 'Update' : 'Create' }}
          </button>
          <button v-if="editMode" type="button" @click="cancelEdit" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>

    <!-- Categories List -->
    <div class="categories-section">
      <h2>Categories</h2>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="categories.length === 0" class="no-data">
        <span class="material-icons" style="font-size: 3rem; opacity: 0.5; display: block; margin-bottom: 1rem;">
          category
        </span>
        No categories found
        <p>Create your first category using the form above.</p>
      </div>
      <div v-else class="categories-list">
        <div v-for="category in categories" :key="category.id" class="category-card">
          <div class="category-header">
            <h3>{{ category.name }}</h3>
            <div class="category-actions">
              <button @click="editCategory(category)" class="btn-icon">
                <span class="material-icons">edit</span>
              </button>
              <button @click="confirmDeleteCategory(category)" class="btn-icon btn-danger">
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>
          
          <div class="category-details">
            <p v-if="category.description">{{ category.description }}</p>
            <p v-else class="text-muted">No description</p>
            <div class="category-meta">
              <small>Created: {{ new Date(category.createdAt).toLocaleDateString() }}</small>
              <small>Updated: {{ new Date(category.updatedAt).toLocaleDateString() }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirm" class="modal-overlay">
      <div class="modal-dialog">
        <h3>{{ confirmTitle }}</h3>
        <p>{{ confirmMessage }}</p>
        <div class="modal-actions">
          <button @click="confirmAction" class="btn btn-danger">Confirm</button>
          <button @click="cancelConfirm" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { categoryService, Category, CreateCategoryRequest } from '../services/category.service';

// State
const categories = ref<Category[]>([]);
const loading = ref(true);
const editMode = ref(false);

// Form state
const categoryForm = ref<CreateCategoryRequest>({
  name: '',
  description: ''
});

// Current editing category id
const currentCategoryId = ref<number | null>(null);

// Confirmation dialog
const showConfirm = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmCallback = ref<() => void>(() => {});

// Load categories on component mount
onMounted(async () => {
  try {
    await loadCategories();
  } finally {
    loading.value = false;
  }
});

// Functions
async function loadCategories() {
  try {
    categories.value = await categoryService.getCategories();
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

function editCategory(category: Category) {
  editMode.value = true;
  currentCategoryId.value = category.id;
  categoryForm.value = {
    name: category.name,
    description: category.description || ''
  };
}

function cancelEdit() {
  editMode.value = false;
  currentCategoryId.value = null;
  categoryForm.value = {
    name: '',
    description: ''
  };
}

async function saveCategory() {
  try {
    if (editMode.value && currentCategoryId.value) {
      await categoryService.updateCategory(currentCategoryId.value, categoryForm.value);
    } else {
      await categoryService.createCategory(categoryForm.value);
    }
    
    // Reset form and reload data
    cancelEdit();
    await loadCategories();
  } catch (error: any) {
    console.error('Failed to save category:', error);
    if (error.response && error.response.status === 409) {
      alert('A category with this name already exists');
    } else {
      alert('Failed to save category');
    }
  }
}

function confirmDeleteCategory(category: Category) {
  confirmTitle.value = 'Delete Category';
  confirmMessage.value = `Are you sure you want to delete the category "${category.name}"?`;
  confirmCallback.value = async () => {
    try {
      await categoryService.deleteCategory(category.id);
      await loadCategories();
      cancelConfirm();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };
  showConfirm.value = true;
}

function confirmAction() {
  confirmCallback.value();
}

function cancelConfirm() {
  showConfirm.value = false;
  confirmTitle.value = '';
  confirmMessage.value = '';
  confirmCallback.value = () => {};
}
</script>

<style scoped>
.category-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

.page-title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #1e40af;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.75rem;
}

.form-section {
  background-color: #f0f9ff;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border-left: 4px solid #3b82f6;
}

.form-section h2 {
  margin-top: 0;
  color: #1e40af;
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
}

.category-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #4b5563;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.categories-section {
  margin-top: 2rem;
}

.categories-section h2 {
  color: #1e40af;
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.categories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.category-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #e5e7eb;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
}

.category-header {
  background-color: #f1f5f9;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.category-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1e3a8a;
}

.category-details {
  padding: 1.25rem;
}

.category-details p {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #4b5563;
}

.text-muted {
  color: #9ca3af;
  font-style: italic;
}

.category-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 1rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
}

/* Inputs */
.text-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
}

.text-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

textarea.text-input {
  resize: vertical;
  min-height: 80px;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #4b5563;
}

.btn-secondary:hover {
  background-color: #d1d5db;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background-color: #f9fafb;
  transition: background-color 0.2s, color 0.2s;
}

.btn-icon:hover {
  background-color: #f3f4f6;
}

.btn-icon.btn-danger {
  color: #ef4444;
}

.btn-icon.btn-danger:hover {
  background-color: #fee2e2;
}

/* States */
.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  font-style: italic;
}

.no-data {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
  font-style: italic;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-dialog {
  background-color: white;
  padding: 1.75rem;
  border-radius: 8px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  animation: modalFadeIn 0.2s ease-out;
}

.modal-dialog h3 {
  margin-top: 0;
  color: #1e3a8a;
  font-size: 1.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.75rem;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .categories-list {
    grid-template-columns: 1fr;
  }
  
  .category-management {
    padding: 1rem;
  }
}
</style>