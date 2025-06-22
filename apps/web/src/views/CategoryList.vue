<template>
  <div class="category-list">
    <!-- Header Section -->
    <div class="page-header mb-4">
      <div class="header-content">
        <div class="header-icon">
          <i class="pi pi-folder"></i>
        </div>
        <div class="header-text">
          <h2>Categories Management</h2>
          <p class="page-description">Create and manage categories and their subcategories</p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <Card class="mb-4">
      <template #title>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-xl"></i>
            <h2 class="text-xl font-semibold m-0">
              {{ activeTab === 'categories' ? 'Categories' : 'Tags' }}
            </h2>
          </div>
          <div class="flex gap-2">
            <Button
              v-if="activeTab === 'categories'"
              icon="pi pi-tags"
              label="Manage Tags"
              class="p-button-secondary"
              @click="activeTab = 'tags'"
            />
            <Button
              v-if="activeTab === 'tags'"
              icon="pi pi-list"
              label="Manage Categories"
              class="p-button-secondary"
              @click="activeTab = 'categories'"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="activeTab === 'categories'">
          <DataTable
            :value="categories"
            :paginator="true"
            :rows="10"
            :loading="loading"
            :filters="filters"
            filterDisplay="menu"
            :globalFilterFields="['name', 'description']"
            class="p-datatable-sm"
            v-model:filters1="filters"
            stripedRows
            showGridlines
            responsiveLayout="scroll"
            :rowHover="true"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            :rowsPerPageOptions="[5,10,20,50]"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} categories"
          >
            <template #header>
              <div class="flex justify-between items-center mb-2">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText v-model="filters.global.value" placeholder="Search..." />
                </span>
                <Button
                  icon="pi pi-plus"
                  label="Add Category"
                  @click="openAddModal"
                  class="p-button-primary"
                />
              </div>
            </template>
            <template #empty>
              <div class="text-center p-4">
                <i class="pi pi-folder text-4xl text-gray-400 mb-2"></i>
                <p class="text-gray-500">No categories found.</p>
              </div>
            </template>
            <template #loading>
              <div class="text-center p-4">
                <i class="pi pi-spin pi-spinner text-2xl"></i>
                <p class="mt-2">Loading categories...</p>
              </div>
            </template>

            <Column field="name" header="Name" sortable style="min-width: 200px">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <i class="pi pi-folder text-primary"></i>
                  <span>{{ data.name }}</span>
                </div>
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="filterModel.value"
                    @input="filterCallback()"
                    placeholder="Search by name"
                    class="p-column-filter"
                  />
                </span>
              </template>
            </Column>
            <Column field="description" header="Description" sortable style="min-width: 300px">
              <template #body="{ data }">
                <span class="text-gray-600">{{ data.description || 'No description' }}</span>
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="filterModel.value"
                    @input="filterCallback()"
                    placeholder="Search by description"
                    class="p-column-filter"
                  />
                </span>
              </template>
            </Column>

            <Column field="updatedAt" header="Created At" sortable style="min-width: 150px">
              <template #body="slotProps">
                <div class="flex items-center gap-2">
                  <i class="pi pi-clock text-gray-400"></i>
                  <span>{{ formatDate(slotProps.data.updatedAt) }}</span>
                </div>
              </template>
            </Column>
            <Column field="tags" header="Tags" style="min-width: 200px">
              <template #body="{ data }">
                <div class="flex flex-wrap gap-2">
                  <template v-if="data.tags && data.tags.length > 0">
                    <Tag
                      v-for="tag in data.tags"
                      :key="tag"
                      :value="tag"
                      severity="info"
                      class="category-tag"
                    />
                  </template>
                  <span v-else class="text-gray-400 italic">No tags</span>
                </div>
              </template>
            </Column>
            <Column style="min-width: 150px">
              <template #body="slotProps">
                <div class="flex gap-2">
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-rounded p-button-text p-button-sm"
                    @click="editCategory(slotProps.data)"
                    v-tooltip.top="'Edit Category'"
                  />
                  <Button
                    icon="pi pi-trash"
                    class="p-button-rounded p-button-text p-button-danger p-button-sm"
                    @click="confirmDelete(slotProps.data)"
                    v-tooltip.top="'Delete Category'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
        <div v-else>
          <!-- Tag Management Table -->
          <DataTable
            :value="tags"
            :paginator="true"
            :rows="10"
            :loading="tagLoading"
            :filters="tagFilters"
            filterDisplay="menu"
            :globalFilterFields="['name']"
            class="p-datatable-sm"
            stripedRows
            showGridlines
            responsiveLayout="scroll"
            :rowHover="true"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            :rowsPerPageOptions="[5,10,20,50]"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tags"
          >
            <template #header>
              <div class="flex justify-between items-center mb-2">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText v-model="tagFilters.global.value" placeholder="Search..." />
                </span>
                <Button icon="pi pi-plus" label="Add Tag" @click="openAddTagDialog" class="p-button-primary" />
              </div>
            </template>
            <template #empty>
              <div class="text-center p-4">
                <i class="pi pi-tags text-4xl text-gray-400 mb-2"></i>
                <p class="text-gray-500">No tags found.</p>
              </div>
            </template>
            <template #loading>
              <div class="text-center p-4">
                <i class="pi pi-spin pi-spinner text-2xl"></i>
                <p class="mt-2">Loading tags...</p>
              </div>
            </template>
            <Column field="name" header="Tag Name" sortable style="min-width: 200px">
              <template #body="{ data }">
                <span>{{ data.name }}</span>
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="filterModel.value"
                    @input="filterCallback()"
                    placeholder="Search by tag name"
                    class="p-column-filter"
                  />
                </span>
              </template>
            </Column>

            <Column field="updatedAt" header="Created At" sortable style="min-width: 150px">
              <template #body="slotProps">
                <div class="flex items-center gap-2">
                  <i class="pi pi-clock text-gray-400"></i>
                  <span>{{ formatDate(slotProps.data.updatedAt) }}</span>
                </div>
              </template>
            </Column>
            <Column style="min-width: 150px">
              <template #body="slotProps">
                <div class="flex gap-2">
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-rounded p-button-text p-button-sm"
                    @click="editTag(slotProps.data)"
                    v-tooltip.top="'Edit Tag'"
                  />
                  <Button
                    icon="pi pi-trash"
                    class="p-button-rounded p-button-text p-button-danger p-button-sm"
                    @click="confirmDeleteTag(slotProps.data)"
                    v-tooltip.top="'Delete Tag'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
          <!-- Add/Edit Tag Dialog -->
          <Dialog
            v-model:visible="showTagDialog"
            :header="isEditingTag ? 'Edit Tag' : 'Add New Tag'"
            :style="{width: '400px'}"
            :modal="true"
            :closable="true"
            :closeOnEscape="true"
            class="category-dialog"
          >
            <div class="p-fluid">
              <div class="dialog-content">
                <div class="form-section">
                  <div class="section-header">
                    <i class="pi pi-tag text-primary"></i>
                    <h3>Tag Information</h3>
                  </div>
                  <div class="field">
                    <label for="tagName" class="font-medium flex items-center gap-2">
                      <i class="pi pi-tag text-primary"></i>
                      Tag Name
                      <span class="required-mark">*</span>
                    </label>
                    <InputText
                      id="tagName"
                      v-model="currentTag.name"
                      required
                      autofocus
                      :class="{'p-invalid': tagSubmitted && !currentTag.name}"
                      placeholder="Enter tag name"
                      class="w-full"
                    />
                    <small class="p-error flex items-center gap-1 mt-1" v-if="tagSubmitted && !currentTag.name">
                      <i class="pi pi-exclamation-circle"></i>
                      Name is required
                    </small>
                  </div>
                </div>
              </div>
            </div>
            <template #footer>
              <div class="dialog-footer">
                <Button
                  label="Cancel"
                  icon="pi pi-times"
                  class="p-button-text p-button-rounded"
                  @click="closeTagDialog"
                  :disabled="tagSaving"
                />
                <Button
                  :label="isEditingTag ? 'Update Tag' : 'Create Tag'"
                  :icon="isEditingTag ? 'pi pi-save' : 'pi pi-plus'"
                  class="p-button-primary p-button-rounded"
                  @click="saveTag"
                  :loading="tagSaving"
                />
              </div>
            </template>
          </Dialog>
          <!-- Confirm Dialog for Delete -->
          <ConfirmDialog></ConfirmDialog>
        </div>
      </template>
    </Card>

    <!-- Add/Edit Category Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditing ? 'Edit Category' : 'Add New Category'"
      :style="{width: '600px'}"
      :modal="true"
      :closable="true"
      :closeOnEscape="true"
      class="category-dialog"
    >
      <div class="p-fluid">
        <div class="dialog-content">
          <div class="form-section">
            <div class="section-header">
              <i class="pi pi-folder text-primary"></i>
              <h3>Category Information</h3>
            </div>
            <div class="field">
              <label for="name" class="font-medium flex items-center gap-2">
                <i class="pi pi-tag text-primary"></i>
                Category Name
                <span class="required-mark">*</span>
              </label>
              <InputText
                id="name"
                v-model="currentCategory.name"
                required
                autofocus
                :class="{'p-invalid': submitted && !currentCategory.name}"
                placeholder="Enter category name"
                class="w-full"
              />
              <small class="p-error flex items-center gap-1 mt-1" v-if="submitted && !currentCategory.name">
                <i class="pi pi-exclamation-circle"></i>
                Name is required
              </small>
            </div>
            <div class="field">
              <label for="description" class="font-medium flex items-center gap-2">
                <i class="pi pi-info-circle text-primary"></i>
                Description
                <span class="text-sm text-gray-500">(Optional)</span>
              </label>
              <Textarea
                id="description"
                v-model="currentCategory.description"
                placeholder="Enter category description"
                rows="4"
                class="w-full"
                autoResize
              />
              <small class="text-gray-500 mt-1">
                <i class="pi pi-info-circle"></i>
                Add a brief description to help identify this category
              </small>
            </div>
            <div class="field">
              <label for="tags" class="font-medium flex items-center gap-2">
                <i class="pi pi-tags text-primary"></i>
                Tags
                <span class="text-sm text-gray-500">(Select from existing tags)</span>
              </label>
              <MultiSelect
                id="tags"
                v-model="currentCategory.tags"
                :options="tags"
                optionLabel="name"
                optionValue="id"
                placeholder="Select tags for this category"
                class="w-full"
                display="chip"
                :maxSelectedLabels="5"
              />
              <small class="text-gray-500 mt-1">
                <i class="pi pi-info-circle"></i>
                Only select tags from the list. You cannot add new tags here.
              </small>
            </div>
          </div>

          <div class="form-section" v-if="isEditing">
            <div class="section-header">
              <i class="pi pi-clock text-primary"></i>
              <h3>Category Details</h3>
            </div>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Created At</span>
                <span class="detail-value">{{ formatDate(currentCategory.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <Button
            label="Cancel"
            icon="pi pi-times"
            class="p-button-text p-button-rounded"
            @click="closeDialog"
            :disabled="saving"
          />
          <Button
            :label="isEditing ? 'Update Category' : 'Create Category'"
            :icon="isEditing ? 'pi pi-save' : 'pi pi-plus'"
            class="p-button-primary p-button-rounded"
            @click="saveCategory"
            :loading="saving"
          />
        </div>
      </template>
    </Dialog>

    <!-- Confirm Dialog for Delete -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

// PrimeVue Components
import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import ConfirmDialog from 'primevue/confirmdialog';
import PrimeTag from 'primevue/tag';
import MultiSelect from 'primevue/multiselect';


interface Category {
  id?: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  projectId?: number;
  tags?: string[];
}

interface Tag {
  id?: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const API_BASE_URL = 'http://localhost:3000/api';

const categories = ref<Category[]>([]);
const loading = ref(false);
const saving = ref(false);
const showDialog = ref(false);
const showSubcategoryDialog = ref(false);
const isEditing = ref(false);
const submitted = ref(false);
const currentCategory = ref<Category>({
  name: '',
  description: '',
  tags: []
});
const newSubcategory = ref<Category>({
  name: ''
});
const selectedParentCategory = ref<Category | null>(null);
const tags = ref([]);
const showTagDialog = ref(false);
const newTag = ref('');
const editingTag = ref(null);
const editTagName = ref('');
const activeTab = ref<'categories' | 'tags'>('categories');

const confirm = useConfirm();
const toast = useToast();

const filters = ref({
  global: { value: null, matchMode: 'contains' },
  name: { value: null, matchMode: 'contains' },
  description: { value: null, matchMode: 'contains' }
});

const tagLoading = ref(false);
const tagSaving = ref(false);
const tagFilters = ref({
  global: { value: null, matchMode: 'contains' },
  name: { value: null, matchMode: 'contains' }
});

const isEditingTag = ref(false);
const currentTag = ref<Tag>({ name: '' });
const tagSubmitted = ref(false);

const fetchCategories = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`${API_BASE_URL}/categories/all`);
    console.log('API Response:', response.data); // Debug log
    categories.value = response.data;
    console.log('Categories after update:', categories.value); // Debug log
  } catch (error) {
    console.error('Error fetching categories:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load categories',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const fetchTags = async () => {
  tagLoading.value = true;
  try {
    const res = await axios.get(`${API_BASE_URL}/project-tag/all`);
    tags.value = res.data;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tags', life: 3000 });
  } finally {
    tagLoading.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  currentCategory.value = {
    name: '',
    description: '',
    tags: []
  };
  showDialog.value = true;
  submitted.value = false;
};

const editCategory = (category: Category) => {
  isEditing.value = true;
  currentCategory.value = { ...category };
  showDialog.value = true;
  submitted.value = false;
};

const closeDialog = () => {
  if (saving.value) return;
  showDialog.value = false;
  submitted.value = false;
};

const saveCategory = async () => {
  submitted.value = true;

  if (!currentCategory.value.name) {
    return;
  }

  // Kiểm tra trùng tên Category
  const nameExists = categories.value.some(cat =>
    cat.name.trim().toLowerCase() === currentCategory.value.name.trim().toLowerCase() &&
    (!isEditing.value || cat.id !== currentCategory.value.id)
  );
  if (nameExists) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Category name already exists',
      life: 3000
    });
    saving.value = false;
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value && currentCategory.value.id) {
      await axios.put(`${API_BASE_URL}/categories/${currentCategory.value.id}/update`, {
        name: currentCategory.value.name,
        description: currentCategory.value.description,
        tags: currentCategory.value.tags
      });
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Category updated successfully',
        life: 3000
      });
      await fetchCategories();
      closeDialog();
    } else {
      await axios.post(`${API_BASE_URL}/categories/create`, {
        name: currentCategory.value.name,
        description: currentCategory.value.description,
        tags: currentCategory.value.tags
      });

      // Show success toast
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Category created successfully',
        life: 3000
      });

      // Close modal and reset form
      showDialog.value = false;
      submitted.value = false;
      currentCategory.value = {
        name: '',
        description: '',
        tags: []
      };

      // Then refresh the categories list
      await fetchCategories();
    }
  } catch (error) {
    console.error('Error saving category:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save category',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (category: Category) => {
  confirm.require({
    message: 'Are you sure you want to delete this category?',
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteCategory(category),
    reject: () => {},
    acceptLabel: 'Yes, Delete',
    rejectLabel: 'Cancel',
    acceptIcon: 'pi pi-trash',
    rejectIcon: 'pi pi-times'
  });
};

const deleteCategory = async (category: Category) => {
  if (!category.id) return;

  try {
    await axios.delete(`${API_BASE_URL}/category/delete/${category.id}`);
    await fetchCategories();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Category deleted successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete category',
      life: 3000
    });
  }
};

const openAddTagDialog = () => {
  isEditingTag.value = false;
  currentTag.value = { name: '' };
  showTagDialog.value = true;
  tagSubmitted.value = false;
};

const editTag = (tag: Tag) => {
  isEditingTag.value = true;
  currentTag.value = { ...tag };
  showTagDialog.value = true;
  tagSubmitted.value = false;
};

const closeTagDialog = () => {
  if (tagSaving.value) return;
  showTagDialog.value = false;
  tagSubmitted.value = false;
};

const saveTag = async () => {
  tagSubmitted.value = true;
  if (!currentTag.value.name) return;

  // Kiểm tra trùng tên Tag
  const tagNameExists = tags.value.some(tag =>
    tag.name.trim().toLowerCase() === currentTag.value.name.trim().toLowerCase() &&
    (!isEditingTag.value || tag.id !== currentTag.value.id)
  );
  if (tagNameExists) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Tag name already exists',
      life: 3000
    });
    tagSaving.value = false;
    return;
  }

  tagSaving.value = true;
  try {
    if (isEditingTag.value && currentTag.value.id) {
      await axios.put(`${API_BASE_URL}/project-tag/update/${currentTag.value.id}`, { name: currentTag.value.name });
      toast.add({ severity: 'success', summary: 'Success', detail: 'Tag updated successfully', life: 3000 });
      await fetchTags();
      closeTagDialog();
    } else {
      await axios.post(`${API_BASE_URL}/project-tag/create`, { name: currentTag.value.name });
      toast.add({ severity: 'success', summary: 'Success', detail: 'Tag created successfully', life: 3000 });
      showTagDialog.value = false;
      tagSubmitted.value = false;
      currentTag.value = { name: '' };
      await fetchTags();
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save tag', life: 3000 });
  } finally {
    tagSaving.value = false;
  }
};

const confirmDeleteTag = (tag: Tag) => {
  confirm.require({
    message: 'Are you sure you want to delete this tag?',
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteTag(tag),
    reject: () => {},
    acceptLabel: 'Yes, Delete',
    rejectLabel: 'Cancel',
    acceptIcon: 'pi pi-trash',
    rejectIcon: 'pi pi-times'
  });
};

const deleteTag = async (tag: Tag) => {
  if (!tag.id) return;
  try {
    await axios.delete(`${API_BASE_URL}/project-tag/delete/${tag.id}`);
    await fetchTags();
    toast.add({ severity: 'success', summary: 'Success', detail: 'Tag deleted successfully', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete tag', life: 3000 });
  }
};

const formatDate = (date: string | Date | undefined) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

onMounted(() => {
  fetchCategories();
  fetchTags();
});
</script>

<style scoped>
.category-list {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  border-radius: 12px;
  padding: 2rem;
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.header-text h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.page-description {
  margin: 0.5rem 0 0;
  opacity: 0.9;
  font-size: 1rem;
}

:deep(.p-datatable) {
  font-size: 0.875rem;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: #f8f9fa;
  color: #495057;
  font-weight: 600;
  padding: 1rem;
  border-bottom: 2px solid #e9ecef;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: #f8f9fa;
}

:deep(.p-datatable .p-datatable-tbody > tr.p-highlight) {
  background: #EFF6FF;
}

:deep(.category-dialog) {
  .p-dialog-header {
    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
    color: white;
    padding: 1.5rem;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;

    .p-dialog-title {
      font-weight: 600;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .p-dialog-header-icon {
      color: white;
      opacity: 0.8;

      &:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .p-dialog-content {
    padding: 0;
  }

  .p-dialog-footer {
    padding: 1.5rem;
    border-top: 1px solid #e9ecef;
    background: #f8f9fa;
  }
}

.dialog-content {
  padding: 2rem;
}

.form-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;

  i {
    font-size: 1.25rem;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #374151;
  }
}

.field {
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.field label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.95rem;
}

.required-mark {
  color: #EF4444;
  font-weight: bold;
}

:deep(.p-inputtext),
:deep(.p-textarea) {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #ced4da;
  transition: all 0.2s;
  font-size: 0.95rem;

  &:hover {
    border-color: #3B82F6;
  }

  &:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  &.p-invalid {
    border-color: #EF4444;

    &:focus {
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }
  }
}

:deep(.p-textarea) {
  resize: none;
  min-height: 120px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.detail-item {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.detail-label {
  display: block;
  font-size: 0.875rem;
  color: #6B7280;
  margin-bottom: 0.25rem;
}

.detail-value {
  font-weight: 500;
  color: #374151;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Button Styles */
:deep(.p-button) {
  font-weight: 600;
  font-size: 1.05rem;
  border: none;
  border-radius: 32px;
  height: 44px;
  padding: 0 1.5rem;
  box-shadow: 0 2px 8px 0 rgba(59,130,246,0.08);
  transition: all 0.18s cubic-bezier(.4,0,.2,1);
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  outline: none;
}

:deep(.p-button-primary) {
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  color: #fff;
  box-shadow: 0 4px 16px 0 rgba(59,130,246,0.10);
}
:deep(.p-button-primary):hover,
:deep(.p-button-primary):focus {
  background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%);
  box-shadow: 0 8px 24px 0 rgba(59,130,246,0.18);
  transform: translateY(-2px) scale(1.03);
}
:deep(.p-button-primary):active {
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  box-shadow: 0 2px 8px 0 rgba(59,130,246,0.10);
  transform: none;
}
:deep(.p-button-primary:disabled) {
  background: #a5b4fc;
  color: #e0e7ff;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.7;
}

:deep(.p-button-success) {
  background: linear-gradient(90deg, #10b981 0%, #22d3ee 100%);
  color: #fff;
}
:deep(.p-button-success):hover,
:deep(.p-button-success):focus {
  background: linear-gradient(90deg, #059669 0%, #06b6d4 100%);
  box-shadow: 0 8px 24px 0 rgba(16,185,129,0.18);
  transform: translateY(-2px) scale(1.03);
}
:deep(.p-button-success):active {
  background: linear-gradient(90deg, #10b981 0%, #22d3ee 100%);
  box-shadow: 0 2px 8px 0 rgba(16,185,129,0.10);
  transform: none;
}
:deep(.p-button-success:disabled) {
  background: #6ee7b7;
  color: #e0f2fe;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.7;
}

:deep(.p-button-danger) {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
  color: #fff;
}
:deep(.p-button-danger):hover,
:deep(.p-button-danger):focus {
  background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
  box-shadow: 0 8px 24px 0 rgba(239,68,68,0.18);
  transform: translateY(-2px) scale(1.03);
}
:deep(.p-button-danger):active {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
  box-shadow: 0 2px 8px 0 rgba(239,68,68,0.10);
  transform: none;
}
:deep(.p-button-danger:disabled) {
  background: #fecaca;
  color: #fee2e2;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.7;
}

:deep(.p-button-text) {
  background: transparent;
  color: #2563eb;
  box-shadow: none;
  padding: 0 1rem;
}
:deep(.p-button-text):hover,
:deep(.p-button-text):focus {
  background: #e0e7ff;
  color: #1d4ed8;
  transform: translateY(-1px) scale(1.01);
}
:deep(.p-button-text):active {
  background: #dbeafe;
  color: #2563eb;
  transform: none;
}
:deep(.p-button-text:disabled) {
  color: #a5b4fc;
  background: transparent;
  opacity: 0.6;
}

:deep(.p-button-cancel) {
  background: #f3f4f6;
  color: #374151;
}
:deep(.p-button-cancel):hover,
:deep(.p-button-cancel):focus {
  background: #e5e7eb;
  color: #111827;
}
:deep(.p-button-cancel):active {
  background: #d1d5db;
  color: #374151;
}

:deep(.p-button-sm) {
  height: 36px;
  min-width: 36px;
  padding: 0;
  border-radius: 50%;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.p-button .p-button-icon) {
  font-size: 1.3rem;
  margin-right: 0.5rem;
}
:deep(.p-button-sm .p-button-icon) {
  margin-right: 0;
}

:deep(.p-button:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

.dialog-footer .p-button {
  min-width: 140px;
  height: 44px;
  font-size: 1.05rem;
}

.page-header .p-button-primary {
  height: 48px;
  padding: 0 2rem;
  font-size: 1.1rem;
  box-shadow: 0 4px 16px 0 rgba(59,130,246,0.10);
}

/* Confirm Dialog Styles */
:deep(.p-confirm-dialog) {
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 800px;
  width: 90% !important;
}

:deep(.p-confirm-dialog .p-dialog-header) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 2.5rem;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
}

:deep(.p-confirm-dialog .p-dialog-title) {
  font-size: 1.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  letter-spacing: -0.025em;
}

:deep(.p-confirm-dialog .p-dialog-content) {
  padding: 3rem;
  background: white;
}

:deep(.p-confirm-dialog .p-dialog-message) {
  display: flex;
  align-items: center;
  gap: 2rem;
  font-size: 1.5rem;
  color: #374151;
  margin: 0;
  line-height: 1.6;
  letter-spacing: -0.025em;
}

:deep(.p-confirm-dialog .p-dialog-message i) {
  font-size: 3rem;
  color: #ef4444;
  flex-shrink: 0;
}

:deep(.p-confirm-dialog .p-dialog-footer) {
  padding: 2.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 2rem;
}

:deep(.p-confirm-dialog .p-button) {
  min-width: 180px;
  height: 52px;
  font-size: 1.2rem;
  font-weight: 600;
  border-radius: 32px;
  transition: all 0.2s ease;
  letter-spacing: -0.025em;
}

:deep(.p-confirm-dialog .p-button.p-button-danger) {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

:deep(.p-confirm-dialog .p-button.p-button-danger:hover) {
  background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
}

:deep(.p-confirm-dialog .p-button.p-button-text) {
  background: transparent;
  color: #6b7280;
  box-shadow: none;
}

:deep(.p-confirm-dialog .p-button.p-button-text:hover) {
  background: #f3f4f6;
  color: #374151;
  transform: translateY(-1px);
}

:deep(.p-confirm-dialog .p-button .p-button-icon) {
  font-size: 1.3rem;
  margin-right: 1rem;
}

@media (max-width: 768px) {
  .category-list {
    padding: 1rem;
  }

  .page-header {
    padding: 1.5rem;
  }

  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .header-icon {
    margin: 0 auto;
  }

  :deep(.category-dialog) {
    width: 95% !important;
    max-width: 450px;
  }

  .dialog-content {
    padding: 1rem;
  }

  .form-section {
    padding: 1rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-footer .p-button {
    width: 100%;
    height: 48px;
    font-size: 1.1rem;
  }

  .page-header .p-button-primary {
    width: 100%;
    margin-top: 1rem;
  }

  :deep(.p-confirm-dialog) {
    width: 95% !important;
    max-width: 600px;
  }

  :deep(.p-confirm-dialog .p-dialog-header) {
    padding: 2rem;
  }

  :deep(.p-confirm-dialog .p-dialog-title) {
    font-size: 1.5rem;
  }

  :deep(.p-confirm-dialog .p-dialog-content) {
    padding: 2.5rem;
  }

  :deep(.p-confirm-dialog .p-dialog-message) {
    font-size: 1.25rem;
    gap: 1.5rem;
  }

  :deep(.p-confirm-dialog .p-dialog-message i) {
    font-size: 2.5rem;
  }

  :deep(.p-confirm-dialog .p-dialog-footer) {
    padding: 2rem;
    flex-direction: column-reverse;
    gap: 1rem;
  }

  :deep(.p-confirm-dialog .p-button) {
    width: 100%;
    height: 56px;
    font-size: 1.2rem;
  }
}

:deep(.category-tag) {
  background: #FEF9C3;
  color: #CA8A04;
  border: 1px solid #FDE68A;
  padding: 0.5rem 1rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}
:deep(.category-tag:hover) {
  background: #FDE68A;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(202, 138, 4, 0.1);
}

.navbar {
  background: #fff;
  box-shadow: 0 4px 24px rgba(59,130,246,0.08);
  border-radius: 0 0 24px 24px;
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 0;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.username {
  font-size: 1.2rem;
  font-weight: 600;
  color: #3b82f6;
  letter-spacing: 0.01em;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

.navbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  transition: background 0.18s, color 0.18s;
}

.navbar-item:hover {
  background: #f3f4f6;
  color: #3b82f6;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.avatar-button:hover {
  background: #f3f4f6;
}

.menu-items {
  padding: 1rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(59,130,246,0.08);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: background 0.18s;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-item:last-child {
  margin-top: 0.75rem;
}

.menu-item:last-child .menu-item {
  padding-left: 1.5rem;
}

.menu-item:last-child .menu-item:hover {
  background: #f3f4f6;
}
</style>
