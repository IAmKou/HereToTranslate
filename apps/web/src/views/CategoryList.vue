<template>
  <div class="category-list">
    <h2>Categories</h2>

    <!-- Add Category Form -->
    <div class="add-category-form">
      <input v-model="newCategory.name" placeholder="Category Name" class="input" />
      <input v-model="newCategory.description" placeholder="Description (optional)" class="input" />
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
            <tr>
              <td>
                <div class="category-header">
                  <span class="toggle-icon" @click="toggleSubcategories(category.id)">
                    {{ isExpanded(category.id) ? '▼' : '▶' }}
                  </span>
                  <input v-if="editingId === category.id" v-model="editingCategory.name" class="input" />
                  <span v-else>{{ category.name }}</span>
                </div>
              </td>
              <td>
                <input v-if="editingId === category.id" v-model="editingCategory.description" class="input" />
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

            <!-- Subcategories -->
            <tr v-if="isExpanded(category.id)">
              <td colspan="3">
                <div class="subcategories-container">
                  <!-- Add Subcategory Form -->
                  <div v-if="addingSubcategoryTo === category.id" class="add-subcategory-form">
                    <input v-model="newSubcategory.name" placeholder="Subcategory Name" class="input" />
                    <button @click="createSubcategory(category.id)" class="button">Add Subcategory</button>
                    <button @click="cancelAddSubcategory" class="button cancel">Cancel</button>
                  </div>

                  <!-- Subcategory List -->
                  <div v-if="category.subCategories?.length" class="subcategories-list">
                    <div v-for="subcategory in category.subCategories" :key="subcategory.id" class="subcategory-item">
                      <span>{{ subcategory.name }}</span>
                      <div class="subcategory-actions">
                        <button @click="editSubcategory(subcategory)" class="button edit">Edit</button>
                        <button @click="deleteSubcategory(subcategory.id)" class="button delete">Delete</button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="no-subcategories">No subcategories yet</div>
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
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  font-size: 24px;
  color: #333;
}

.add-category-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.button {
  padding: 8px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  color: white;
}

.button:hover {
  opacity: 0.9;
}

.button.edit {
  background-color: #2196f3;
}

.button.delete {
  background-color: #f44336;
}

.button.save {
  background-color: #4caf50;
}

.button.cancel {
  background-color: #9e9e9e;
}

.button.add-sub {
  background-color: #795548;
}

.categories-table {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-icon {
  cursor: pointer;
  user-select: none;
  font-size: 16px;
  width: 20px;
}

.subcategories-container {
  padding: 16px;
  background-color: #f9f9f9;
  border: 1px dashed #ccc;
  border-radius: 6px;
  margin-top: 8px;
}

.add-subcategory-form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.subcategories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subcategory-item {
  display: flex;
  justify-content: space-between;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  padding: 8px;
  border-radius: 4px;
}

.subcategory-actions {
  display: flex;
  gap: 6px;
}

.no-subcategories {
  font-style: italic;
  color: #888;
}
</style>
