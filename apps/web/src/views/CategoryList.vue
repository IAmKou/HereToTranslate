<template>
  <div class="category-list">
    <h2>Categories</h2>
    
    <!-- Add Category Form -->
    <div class="add-category-form">
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
      <button @click="createCategory" class="button">Add Category</button>
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
            <!-- Main Category Row -->
            <tr>
              <td>
                <div class="category-header">
                  <span class="toggle-icon" @click="toggleSubcategories(category.id)">
                    {{ isExpanded(category.id) ? '▼' : '▶' }}
                  </span>
                  <input
                    v-if="editingId === category.id"
                    v-model="editingCategory.name"
                    class="input"
                  />
                  <span v-else>{{ category.name }}</span>
                </div>
              </td>
              <td>
                <input
                  v-if="editingId === category.id"
                  v-model="editingCategory.description"
                  class="input"
                />
                <span v-else>{{ category.description }}</span>
              </td>
              <td>
                <div class="actions">
                  <template v-if="editingId === category.id">
                    <button @click="saveEdit(category.id)" class="button save">Save</button>
                    <button @click="cancelEdit" class="button cancel">Cancel</button>
                  </template>
                  <template v-else>
                    <button @click="startEdit(category)" class="button edit">Edit</button>
                    <button @click="deleteCategory(category.id)" class="button delete">Delete</button>
                    <button @click="showAddSubcategory(category)" class="button add-sub">Add Sub</button>
                  </template>
                </div>
              </td>
            </tr>
            
            <!-- Subcategories Section -->
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
                    <input
                      v-model="newSubcategory.description"
                      placeholder="Description (optional)"
                      class="input"
                    />
                    <button @click="createSubcategory(category.id)" class="button">Add Subcategory</button>
                    <button @click="cancelAddSubcategory" class="button cancel">Cancel</button>
                  </div>
                  
                  <!-- Subcategories List -->
                  <div v-if="category.subcategories && category.subcategories.length > 0" class="subcategories-list">
                    <div v-for="subcategory in category.subcategories" :key="subcategory.id" class="subcategory-item">
                      <span>{{ subcategory.name }}</span>
                      <span class="subcategory-description">{{ subcategory.description }}</span>
                      <div class="subcategory-actions">
                        <button @click="editSubcategory(subcategory)" class="button edit">Edit</button>
                        <button @click="deleteSubcategory(subcategory.id)" class="button delete">Delete</button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="no-subcategories">
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
  subcategories?: Category[];
}

const API_BASE_URL = 'http://localhost:3000/api'; 

const categories = ref<Category[]>([]);
const newCategory = ref<Category>({ name: '', description: '' });
const newSubcategory = ref<Category>({ name: '', description: '' });
const editingId = ref<number | null>(null);
const editingCategory = ref<Category>({ name: '', description: '' });
const expandedCategories = ref<Set<number>>(new Set());
const addingSubcategoryTo = ref<number | null>(null);

const isExpanded = (categoryId: number | undefined) => {
  if (!categoryId) return false;
  return expandedCategories.value.has(categoryId);
};

const toggleSubcategories = (categoryId: number | undefined) => {
  if (!categoryId) return;
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId);
  } else {
    expandedCategories.value.add(categoryId);
  }
};

const showAddSubcategory = (category: Category) => {
  if (!category.id) return;
  addingSubcategoryTo.value = category.id;
  newSubcategory.value = { name: '', description: '' };
};

const cancelAddSubcategory = () => {
  addingSubcategoryTo.value = null;
  newSubcategory.value = { name: '', description: '' };
};

const createSubcategory = async (parentId: number) => {
  if (!newSubcategory.value.name) return;
  
  try {
    const subcategoryData = {
      ...newSubcategory.value,
      parentId: parentId
    };
    await axios.post(`${API_BASE_URL}/category/create`, subcategoryData);
    newSubcategory.value = { name: '', description: '' };
    addingSubcategoryTo.value = null;
    await loadCategories();
  } catch (error) {
    console.error('Error creating subcategory:', error);
  }
};

const editSubcategory = (subcategory: Category) => {
  editingId.value = subcategory.id || null;
  editingCategory.value = { ...subcategory };
};

const deleteSubcategory = async (id: number | undefined) => {
  if (!id) return;
  if (!confirm('Are you sure you want to delete this subcategory?')) return;
  
  try {
    await axios.delete(`${API_BASE_URL}/category/delete/${id}`);
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
  if (!id) return;
  if (!confirm('Are you sure you want to delete this category?')) return;
  
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
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.add-category-form {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.button:hover {
  opacity: 0.9;
}

button {
  background-color: #4CAF50;
  color: white;
}

button.edit {
  background-color: #2196F3;
}

button.delete {
  background-color: #f44336;
}

button.save {
  background-color: #4CAF50;
}

button.cancel {
  background-color: #9e9e9e;
}

.categories-table {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f5f5f5;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-icon {
  cursor: pointer;
  user-select: none;
  width: 20px;
  text-align: center;
}

.subcategories-container {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin: 8px 0;
}

.add-subcategory-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.subcategories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subcategory-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.subcategory-description {
  color: #666;
  flex: 1;
}

.subcategory-actions {
  display: flex;
  gap: 8px;
}

.no-subcategories {
  color: #666;
  text-align: center;
  padding: 16px;
}

button.add-sub {
  background-color: #9c27b0;
}
</style> 