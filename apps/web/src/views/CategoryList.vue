<template>
  <div class="category-list">
    <div class="page-header">
      <h2>Categories Management</h2>
      <p class="page-description">Create and manage categories and their subcategories</p>
    </div>

    <!-- Add Category Form -->
    <div class="add-category-form">
      <div class="form-group">
        <input 
          v-model="newCategory.name" 
          placeholder="Category Name" 
          class="input" 
        />
        <input 
          v-model="newCategory.description" 
          placeholder="Description (optional)" 
          class="input" 
        />
        <button @click="createCategory" class="button primary">
          <span class="icon">+</span>
          Add Category
        </button>
      </div>
    </div>

    <!-- Categories Table -->
    <div class="categories-table">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="category in categories" :key="category.id">
            <tr>
              <td>
                <div class="category-header">
                  <span 
                    class="toggle-icon" 
                    @click="toggleSubcategories(category.id)"
                    :class="{ 'expanded': isExpanded(category.id) }"
                  >
                    {{ isExpanded(category.id) ? '▼' : '▶' }}
                  </span>
                  <input 
                    v-if="editingId === category.id" 
                    v-model="editingCategory.name" 
                    class="input edit-input" 
                  />
                  <span v-else class="category-name">{{ category.name }}</span>
                </div>
              </td>
              <td>
                <input 
                  v-if="editingId === category.id" 
                  v-model="editingCategory.description" 
                  class="input edit-input" 
                />
                <span v-else class="category-description">{{ category.description || 'No description' }}</span>
              </td>
              <td>
                <div class="actions">
                  <template v-if="editingId === category.id">
                    <button @click="saveEdit(category.id)" class="button save">
                      <span class="icon">✓</span>
                      Save
                    </button>
                    <button @click="cancelEdit" class="button cancel">
                      <span class="icon">×</span>
                      Cancel
                    </button>
                  </template>
                  <template v-else>
                    <button @click="startEdit(category)" class="button edit">
                      <span class="icon">✎</span>
                      Edit
                    </button>
                    <button @click="deleteCategory(category.id)" class="button delete">
                      <span class="icon">🗑</span>
                      Delete
                    </button>
                    <button @click="showAddSubcategory(category)" class="button add-sub">
                      <span class="icon">+</span>
                      Add Sub
                    </button>
                  </template>
                </div>
              </td>
            </tr>

            <!-- Subcategories -->
            <tr v-if="isExpanded(category.id)">
              <td colspan="3">
                <div class="subcategories-container">
                  <!-- Add Subcategory Form -->
                  <div v-if="addingSubcategoryTo === category.id" class="add-subcategory-form">
                    <input 
                      v-model="newSubcategory.name" 
                      placeholder="Subcategory Name" 
                      class="input" 
                    />
                    <div class="subcategory-actions">
                      <button @click="createSubcategory(category.id)" class="button primary">
                        <span class="icon">+</span>
                        Add Subcategory
                      </button>
                      <button @click="cancelAddSubcategory" class="button cancel">
                        <span class="icon">×</span>
                        Cancel
                      </button>
                    </div>
                  </div>

                  <!-- Subcategory List -->
                  <div v-if="category.subCategories?.length" class="subcategories-list">
                    <div v-for="subcategory in category.subCategories" :key="subcategory.id" class="subcategory-item">
                      <span class="subcategory-name">{{ subcategory.name }}</span>
                      <div class="subcategory-actions">
                        <button @click="editSubcategory(subcategory)" class="button edit">
                          <span class="icon">✎</span>
                          Edit
                        </button>
                        <button @click="deleteSubcategory(subcategory.id)" class="button delete">
                          <span class="icon">🗑</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="no-subcategories">
                    <span class="icon">ℹ</span>
                    No subcategories yet
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

interface Category {
  id?: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  projectId?: number;
  subCategories?: Category[];
}

const API_BASE_URL = 'http://localhost:3000/api';

const categories = ref<Category[]>([]);
const newCategory = ref<Category>({ name: '', description: '' });
const newSubcategory = ref<Category>({ name: '' });
const editingId = ref<number | null>(null);
const editingCategory = ref<Category>({ name: '', description: '' });
const expandedCategories = ref<Set<number>>(new Set());
const addingSubcategoryTo = ref<number | null>(null);

const isExpanded = (categoryId: number | undefined) => {
  return categoryId !== undefined && expandedCategories.value.has(categoryId);
};

const toggleSubcategories = (categoryId: number | undefined) => {
  if (!categoryId) return;
  expandedCategories.value.has(categoryId)
    ? expandedCategories.value.delete(categoryId)
    : expandedCategories.value.add(categoryId);
};

const showAddSubcategory = (category: Category) => {
  addingSubcategoryTo.value = category.id || null;
  newSubcategory.value = { name: '' };
};

const cancelAddSubcategory = () => {
  addingSubcategoryTo.value = null;
  newSubcategory.value = { name: '' };
};

const createSubcategory = async (parentId: number) => {
  if (!newSubcategory.value.name) return;
  try {
    const subcategoryData = {
      name: newSubcategory.value.name,
      categoryId: parentId
    };
    await axios.post(`${API_BASE_URL}/subcategory/create`, subcategoryData);
    cancelAddSubcategory();
    await loadCategories();
  } catch (error) {
    console.error('Error creating subcategory:', error);
    alert('Failed to create subcategory.');
  }
};

const editSubcategory = (subcategory: Category) => {
  editingId.value = subcategory.id || null;
  editingCategory.value = { ...subcategory };
};

const deleteSubcategory = async (id: number | undefined) => {
  if (!id || !confirm('Are you sure you want to delete this subcategory?')) return;
  try {
    await axios.delete(`${API_BASE_URL}/subcategory/delete/${id}`);
    await loadCategories();
  } catch (error) {
    console.error('Error deleting subcategory:', error);
  }
};

const loadCategories = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/category/all`);
    categories.value = response.data;
  } catch (error) {
    console.error('Error loading categories:', error);
    alert('Failed to load categories.');
  }
};

const createCategory = async () => {
  if (!newCategory.value.name) return;
  try {
    await axios.post(`${API_BASE_URL}/category/create`, newCategory.value);
    newCategory.value = { name: '', description: '' };
    await loadCategories();
  } catch (error) {
    console.error('Error creating category:', error);
  }
};

const startEdit = (category: Category) => {
  editingId.value = category.id || null;
  editingCategory.value = { ...category };
};

const saveEdit = async (id: number | undefined) => {
  if (!id) return;
  try {
    await axios.put(`${API_BASE_URL}/category/update/${id}`, editingCategory.value);
    editingId.value = null;
    await loadCategories();
  } catch (error) {
    console.error('Error updating category:', error);
  }
};

const cancelEdit = () => {
  editingId.value = null;
};
  
const deleteCategory = async (id: number | undefined) => {
  if (!id || !confirm('Are you sure you want to delete this category?')) return;
  try {
    await axios.delete(`${API_BASE_URL}/category/delete/${id}`);
    await loadCategories();
  } catch (error) {
    console.error('Error deleting category:', error);
  }
};

onMounted(loadCategories);
</script>

<style scoped>
.category-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

h2 {
  margin: 0;
  font-size: 2rem;
  color: #1a202c;
  font-weight: 600;
}

.page-description {
  margin: 0.5rem 0 0;
  color: #718096;
  font-size: 1rem;
}

.add-category-form {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background-color: #f8fafc;
}

.input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  background-color: white;
}

.edit-input {
  background-color: white;
  border-color: #4299e1;
}

.button {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
}

.button:hover {
  transform: translateY(-1px);
}

.button.primary {
  background-color: #4299e1;
}

.button.edit {
  background-color: #3182ce;
}

.button.delete {
  background-color: #e53e3e;
}

.button.save {
  background-color: #38a169;
}

.button.cancel {
  background-color: #718096;
}

.button.add-sub {
  background-color: #805ad5;
}

.icon {
  font-size: 1.1rem;
  line-height: 1;
}

.categories-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background-color: #f7fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  border-bottom: 2px solid #e2e8f0;
}

td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #2d3748;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-icon {
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-icon:hover {
  background-color: #f7fafc;
}

.toggle-icon.expanded {
  color: #4299e1;
}

.category-name {
  font-weight: 500;
}

.category-description {
  color: #718096;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.subcategories-container {
  padding: 1.5rem;
  background-color: #f8fafc;
  border-radius: 8px;
  margin-top: 0.5rem;
}

.add-subcategory-form {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.subcategories-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.subcategory-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.subcategory-name {
  font-weight: 500;
  color: #2d3748;
}

.subcategory-actions {
  display: flex;
  gap: 0.5rem;
}

.no-subcategories {
  text-align: center;
  padding: 2rem;
  color: #718096;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .category-list {
    padding: 1rem;
  }

  .form-group {
    flex-direction: column;
  }

  .actions {
    flex-wrap: wrap;
  }

  .button {
    width: 100%;
  }

  .subcategory-item {
    flex-direction: column;
    gap: 1rem;
  }

  .subcategory-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

