<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <AdminNavbar />
    <div class="main-content">
      <AdminSidebar v-model:collapsed="isSidebarCollapsed" />
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
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon info"><i class="pi pi-folder"></i></div>
                <div class="stat-text">
                  <div class="stat-label">Total Categories</div>
                  <div class="stat-value">{{ categories.length }}</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon success"><i class="pi pi-tag"></i></div>
                <div class="stat-text">
                  <div class="stat-label">Total Tags</div>
                  <div class="stat-value">{{ tags.length }}</div>
                </div>
              </div>
            </div>
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
                v-model:selection="selectedCategories"
                dataKey="id"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5,10,20,50]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} categories"
              >
                <template #header>
                  <div class="toolbar">
                    <div class="toolbar-left">
                      <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters.global.value" placeholder="Search..." />
                      </span>
                      <Button icon="pi pi-filter-slash" label="Clear" class="p-button-text" @click="clearCategoryFilters" />
                    </div>
                    <div class="toolbar-right">
                      <Button icon="pi pi-refresh" label="Refresh" class="p-button-secondary" @click="refreshCategories" :loading="loading" />
                      <Button icon="pi pi-trash" label="Delete Selected" class="p-button-danger" @click="bulkDeleteSelected" :disabled="selectedCategories.length === 0" />
                      <Button
                        icon="pi pi-plus"
                        label="Add Category"
                        @click="openAddModal"
                        class="p-button-primary"
                      />
                    </div>
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
                <Column selectionMode="multiple" style="width: 3rem" />
                <Column header="STT" style="width: 60px">
                  <template #body="slotProps">
                    {{ categories.indexOf(slotProps.data) + 1 }}
                  </template>
                </Column>

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

                <Column field="updatedAt" header="Last Update Time" sortable style="min-width: 150px">
                  <template #body="slotProps">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-clock text-gray-400"></i>
                      <span>{{ formatDate(slotProps.data.updatedAt) }}</span>
                    </div>
                  </template>
                </Column>
                <Column header="Action" style="min-width: 150px">
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
                  <div class="toolbar">
                    <div class="toolbar-left">
                      <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="tagFilters.global.value" placeholder="Search..." />
                      </span>
                      <Button icon="pi pi-filter-slash" label="Clear" class="p-button-text" @click="tagFilters.global.value = null" />
                    </div>
                    <div class="toolbar-right">
                      <Button icon="pi pi-plus" label="Add Tag" @click="openAddTagDialog" class="p-button-primary" />
                    </div>
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

                <Column field="createdAt" header="Created At" sortable style="min-width: 180px">
                  <template #body="slotProps">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-calendar text-gray-400"></i>
                      <span>{{ formatDate(slotProps.data.createdAt) }}</span>
                    </div>
                  </template>
                </Column>

                <Column field="updatedAt" header="Last Updated" sortable style="min-width: 180px">
                  <template #body="slotProps">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-clock text-gray-400"></i>
                      <span>{{ formatDate(slotProps.data.updatedAt) }}</span>
                    </div>
                  </template>
                </Column>
                <Column header="Action" style="min-width: 150px">
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
            </div>
          </template>
        </Card>

        <!-- Compact Category Dialog -->
        <Dialog
          v-model:visible="showDialog"
          :style="{width: '800px'}"
          :modal="true"
          :closable="false"
          :closeOnEscape="true"
          class="compact-dialog"
          :transition="'dialog'"
        >
          <template #header>
            <div class="dialog-header">
              <div class="header-content">
                <div class="header-icon">
                  <i class="pi pi-folder"></i>
                </div>
                <div class="header-text">
                  <h3>{{ isEditing ? 'Edit Category' : 'Create Category' }}</h3>
                  <p>{{ isEditing ? 'Update category information' : 'Add a new category' }}</p>
                </div>
              </div>
              <Button
                icon="pi pi-times"
                class="p-button-rounded p-button-text close-btn"
                @click="closeDialog"
                aria-label="Close dialog"
              />
            </div>
          </template>

          <div class="dialog-content">
            <div class="form-container">
              <div class="form-group">
                <label for="name" class="form-label">
                  <span class="label-text">Category Name</span>
                  <span class="required">*</span>
                </label>
                <div class="input-container">
                  <i class="pi pi-folder input-icon"></i>
                  <InputText
                    id="name"
                    v-model="currentCategory.name"
                    required
                    autofocus
                    :class="{'error': submitted && !currentCategory.name}"
                    placeholder="e.g., Web Development"
                    class="clean-input"
                    :maxlength="100"
                  />
                </div>
                <div class="input-meta">
                  <span class="char-count">{{ currentCategory.name.length }}/100</span>
                  <div v-if="submitted && !currentCategory.name" class="error-message">
                    <i class="pi pi-exclamation-circle"></i>
                    <span>Category name is required</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="description" class="form-label">
                  <span class="label-text">Description</span>
                  <span class="optional">(Optional)</span>
                </label>
                <div class="input-container">
                  <i class="pi pi-info-circle input-icon"></i>
                  <Textarea
                    id="description"
                    v-model="currentCategory.description"
                    placeholder="Describe what this category is for..."
                    rows="2"
                    class="clean-textarea"
                    autoResize
                    :maxlength="descriptionMax"
                  />
                </div>
                <div class="input-meta">
                  <span class="char-count">{{ descriptionLength }}/{{ descriptionMax }}</span>
                </div>
              </div>

              <div v-if="isEditing" class="info-section">
                <div class="info-header">
                  <i class="pi pi-clock"></i>
                  <span>Category Details</span>
                </div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Created</div>
                    <div class="info-value">
                      {{ currentCategory.createdAt ? formatDate(currentCategory.createdAt) : 'N/A' }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Last Updated</div>
                    <div class="info-value">
                      {{ currentCategory.updatedAt ? formatDate(currentCategory.updatedAt) : 'N/A' }}
                    </div>
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
                class="p-button-text cancel-btn"
                @click="closeDialog"
                :disabled="saving"
              />
              <Button
                :label="isEditing ? 'Update' : 'Create'"
                :icon="isEditing ? 'pi pi-save' : 'pi pi-plus'"
                class="p-button-primary action-btn"
                @click="saveCategory"
                :loading="saving"
              />
            </div>
          </template>
        </Dialog>

        <!-- Compact Tag Dialog -->
        <Dialog
          v-model:visible="showTagDialog"
          :style="{width: '700px'}"
          :modal="true"
          :closable="false"
          :closeOnEscape="true"
          class="compact-dialog tag-dialog"
          :transition="'dialog'"
        >
          <template #header>
            <div class="dialog-header">
              <div class="header-content">
                <div class="header-icon">
                  <i class="pi pi-tag"></i>
                </div>
                <div class="header-text">
                  <h3>{{ isEditingTag ? 'Edit Tag' : 'Create Tag' }}</h3>
                  <p>{{ isEditingTag ? 'Update tag information' : 'Add a new tag' }}</p>
                </div>
              </div>
              <Button
                icon="pi pi-times"
                class="p-button-rounded p-button-text close-btn"
                @click="closeTagDialog"
                aria-label="Close dialog"
              />
            </div>
          </template>

          <div class="dialog-content">
            <div class="form-container">
              <div class="form-group">
                <label for="tagName" class="form-label">
                  <span class="label-text">Tag Name</span>
                  <span class="required">*</span>
                </label>
                <div class="input-container">
                  <i class="pi pi-tag input-icon"></i>
                  <InputText
                    id="tagName"
                    v-model="currentTag.name"
                    required
                    autofocus
                    :class="{'error': tagSubmitted && !currentTag.name}"
                    placeholder="e.g., Frontend, Backend"
                    class="clean-input"
                    :maxlength="50"
                  />
                </div>
                <div class="input-meta">
                  <span class="char-count">{{ currentTag.name.length }}/50</span>
                  <div v-if="tagSubmitted && !currentTag.name" class="error-message">
                    <i class="pi pi-exclamation-circle"></i>
                    <span>Tag name is required</span>
                  </div>
                </div>
              </div>

              <div v-if="isEditingTag" class="info-section">
                <div class="info-header">
                  <i class="pi pi-clock"></i>
                  <span>Tag Details</span>
                </div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Created</div>
                    <div class="info-value">
                      {{ currentTag.createdAt ? formatDate(currentTag.createdAt) : 'N/A' }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Last Updated</div>
                    <div class="info-value">
                      {{ currentTag.createdAt ? formatDate(currentTag.updatedAt) : 'N/A' }}
                    </div>
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
                class="p-button-text cancel-btn"
                @click="closeTagDialog"
                :disabled="tagSaving"
              />
              <Button
                :label="isEditingTag ? 'Update' : 'Create'"
                :icon="isEditingTag ? 'pi pi-save' : 'pi pi-plus'"
                class="p-button-primary action-btn"
                @click="saveTag"
                :loading="tagSaving"
              />
            </div>
          </template>
        </Dialog>

        <!-- Enhanced Confirm Dialog for Delete -->
        <ConfirmDialog class="enhanced-confirm-dialog"></ConfirmDialog>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import AdminSidebar from '../components/AdminSidebar.vue';
import AdminNavbar from '../components/AdminNavbar.vue';
import axiosInstance from '../api';

// PrimeVue Components
import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import ConfirmDialog from 'primevue/confirmdialog';


interface Category {
  id?: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  projectId?: number;
}

interface Tag {
  id?: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const categories = ref<Category[]>([]);
const loading = ref(false);
const saving = ref(false);
const showDialog = ref(false);
const isEditing = ref(false);
const submitted = ref(false);
const currentCategory = ref<Category>({
  name: '',
  description: ''
});
const selectedCategories = ref<Category[]>([]);
const descriptionMax = 300;
const descriptionLength = computed(() => (currentCategory.value.description?.length || 0));
const lastUpdatedPretty = computed(() => {
  const latest = categories.value
    .map(c => c.updatedAt ? new Date(c.updatedAt).getTime() : 0)
    .reduce((a, b) => Math.max(a, b), 0);
  if (!latest) return '-';
  const d = new Date(latest);
  return d.toLocaleString();
});

const tags = ref([]);
const showTagDialog = ref(false);
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

const isSidebarCollapsed = ref(false);

const normalizeTagData = (tag: any) => {
  // Get current timestamp for fallback
  const now = new Date().toISOString();

  // Try to extract date from various possible field names
  let createdAt = tag.createdAt || tag.created_at || tag.createDate || tag.create_date || tag.createdAt || now;
  let updatedAt = tag.updatedAt || tag.updated_at || tag.updateDate || tag.update_date || tag.updatedAt || now;

  // If dates are strings but not ISO format, try to convert them
  if (typeof createdAt === 'string' && !createdAt.includes('T')) {
    try {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        createdAt = date.toISOString();
      }
    } catch (e) {
      console.warn('Could not parse createdAt:', createdAt);
      createdAt = now;
    }
  }

  if (typeof updatedAt === 'string' && !updatedAt.includes('T')) {
    try {
      const date = new Date(updatedAt);
      if (!isNaN(date.getTime())) {
        updatedAt = date.toISOString();
      }
    } catch (e) {
      console.warn('Could not parse updatedAt:', updatedAt);
      updatedAt = now;
    }
  }

  const normalizedTag = {
    id: tag.id,
    name: tag.name,
    createdAt: createdAt,
    updatedAt: updatedAt
  };

  console.log('Normalizing tag:', tag, '→', normalizedTag);
  return normalizedTag;
};

const fetchCategories = async () => {
  loading.value = true;
  try {
    const response = await axiosInstance.get('/categories/all');
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

const refreshCategories = async () => {
  await fetchCategories();
};

const clearCategoryFilters = () => {
  filters.value = {
    global: { value: null, matchMode: 'contains' },
    name: { value: null, matchMode: 'contains' },
    description: { value: null, matchMode: 'contains' }
  } as any;
};

const bulkDeleteSelected = async () => {
  if (selectedCategories.value.length === 0) return;
  confirm.require({
    message: `Delete ${selectedCategories.value.length} selected categor${selectedCategories.value.length > 1 ? 'ies' : 'y'}?`,
    header: 'Bulk Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Yes, Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        const ids = selectedCategories.value.map(c => c.id).filter((id): id is number => !!id);
        await Promise.all(ids.map(id => axiosInstance.delete(`/categories/${id}/delete`)));
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Selected categories deleted', life: 3000 });
        selectedCategories.value = [];
        await fetchCategories();
      } catch (error) {
        console.error('Bulk delete error:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete selected', life: 3000 });
      }
    },
    reject: () => {}
  });
};

const fetchTags = async () => {
  tagLoading.value = true;
  try {
    const res = await axiosInstance.get('/project-tag/all');
    console.log('Tags API response:', res.data);
    console.log('Tags data structure:', res.data.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      createdAtType: typeof tag.createdAt,
      updatedAtType: typeof tag.updatedAt,
      rawCreatedAt: tag.createdAt,
      rawUpdatedAt: tag.updatedAt
    })));

    // Normalize tag data to ensure date fields exist
    tags.value = res.data.map(normalizeTagData);

    console.log('Normalized tags:', tags.value);
  } catch (error) {
    console.error('Error fetching tags:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tags', life: 3000 });
  } finally {
    tagLoading.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  currentCategory.value = {
    name: '',
    description: ''
  };
  showDialog.value = true;
  submitted.value = false;
};

const editCategory = (category: Category) => {
  isEditing.value = true;
  const { tags, ...rest } = category as any;
  currentCategory.value = { ...rest };
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
      const response = await axiosInstance.put(`/categories/${currentCategory.value.id}/update`, {
        name: currentCategory.value.name,
        description: currentCategory.value.description
      });
      console.log('Category update response:', response.data);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Category updated successfully',
        life: 3000
      });
      await fetchCategories();
      closeDialog();
    } else {
      const response = await axiosInstance.post('/categories/create', {
        name: currentCategory.value.name,
        description: currentCategory.value.description
      });
      console.log('Category create response:', response.data);

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
        description: ''
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
    await axiosInstance.delete(`/categories/${category.id}/delete`);
    await fetchCategories();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Category deleted successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete category', life: 3000 });
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
      const response = await axiosInstance.put(`/project-tag/update/${currentTag.value.id}`, {
        name: currentTag.value.name
      });
      console.log('Tag update response:', response.data);

      // Update local tag with response data or current timestamp
      const updatedTag = response.data || {
        ...currentTag.value,
        updatedAt: new Date().toISOString()
      };

      // Ensure the updated tag has proper date fields
      const normalizedUpdatedTag = normalizeTagData(updatedTag);

      // Update local state immediately
      const tagIndex = tags.value.findIndex(t => t.id === currentTag.value.id);
      if (tagIndex > -1) {
        tags.value[tagIndex] = normalizedUpdatedTag;
      }

      toast.add({ severity: 'success', summary: 'Success', detail: 'Tag updated successfully', life: 3000 });
      closeTagDialog();
    } else {
      const response = await axiosInstance.post('/project-tag/create', {
        name: currentTag.value.name
      });
      console.log('Tag create response:', response.data);

      // Create new tag object with proper structure
      const newTag = {
        id: response.data?.id || Date.now(), // Use backend ID if available
        name: currentTag.value.name,
        createdAt: response.data?.createdAt || new Date().toISOString(),
        updatedAt: response.data?.updatedAt || new Date().toISOString()
      };

      // Ensure the new tag has proper date fields
      const normalizedNewTag = normalizeTagData(newTag);

      // Add to beginning of tags array
      tags.value.unshift(normalizedNewTag);

      toast.add({ severity: 'success', summary: 'Success', detail: 'Tag created successfully', life: 3000 });

      // Reset form and close dialog
      showTagDialog.value = false;
      tagSubmitted.value = false;
      currentTag.value = { name: '' };
    }
  } catch (error) {
    console.error('Error saving tag:', error);
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
    await axiosInstance.delete(`/project-tag/delete/${tag.id}`);
    await fetchTags();
    toast.add({ severity: 'success', summary: 'Success', detail: 'Tag deleted successfully', life: 3000 });
  } catch (error) {
    console.error('Error deleting tag:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete tag', life: 3000 });
  }
};

const formatDate = (date: string | Date | undefined) => {
  if (!date) return 'N/A';

  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      // Handle different date string formats
      if (date.includes('T') || date.includes('Z')) {
        // ISO format
        dateObj = new Date(date);
      } else if (date.includes('-')) {
        // Date only format
        dateObj = new Date(date + 'T00:00:00');
      } else {
        // Try parsing as timestamp
        dateObj = new Date(parseInt(date));
      }
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date value:', date, 'type:', typeof date);
      return 'Invalid Date';
    }

    return dateObj.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', date, 'type:', typeof date, 'error:', error);
    return 'Invalid Date';
  }
};

onMounted(() => {
  fetchCategories();
  fetchTags();
});
</script>

<style scoped>
.category-list {
  /* Spacing scale */
  --s-4: 4px;
  --s-8: 8px;
  --s-12: 12px;
  --s-16: 16px;
  --s-20: 20px;
  --s-24: 24px;
  --s-32: 32px;
  --s-40: 40px;

  /* Theme tokens */
  --surface-bg: #ffffff;
  --surface-muted: #f8f9fa;
  --border-color: #e9ecef;
  --text-muted: #64748b;

  padding: var(--s-24);
  max-width: 1400px;
  margin: 0 auto;
  margin-left: 16.25rem;
  transition: margin-left 0.2s;
}

.layout-wrapper.sidebar-collapsed .category-list {
  margin-left: 4.5rem;
}

/* Enhanced Confirm Dialog */
:deep(.p-confirm-dialog) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  max-width: 450px;
  width: 90% !important;
  border: none;
  margin: 0 auto;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

:deep(.p-confirm-dialog .p-dialog-header) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 24px 24px 20px;
  border: none;
  position: relative;
}

:deep(.p-confirm-dialog .p-dialog-title) {
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;
  color: white;
  letter-spacing: -0.025em;
}

:deep(.p-confirm-dialog .p-dialog-content) {
  padding: 24px;
  background: white;
  border: none;
}

:deep(.p-confirm-dialog .p-dialog-message) {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1rem;
  color: #374151;
  margin: 0;
  line-height: 1.6;
  font-weight: 500;
}

:deep(.p-confirm-dialog .p-dialog-message i) {
  font-size: 2rem;
  color: #ef4444;
  flex-shrink: 0;
  background: #fef2f2;
  padding: 12px;
  border-radius: 50%;
  border: 2px solid #fecaca;
}

:deep(.p-confirm-dialog .p-dialog-footer) {
  padding: 20px 24px 24px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  gap: 16px;
}

:deep(.p-confirm-dialog .p-button) {
  min-width: 120px;
  height: 42px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

:deep(.p-confirm-dialog .p-button.p-button-danger) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
}

:deep(.p-confirm-dialog .p-button.p-button-text) {
  background: transparent;
  color: #6b7280;
  border: 2px solid #d1d5db;

  &:hover {
    background: #f3f4f6;
    color: #374151;
    border-color: #9ca3af;
    transform: translateY(-1px);
  }
}

/* Clean Page Header */
.page-header {
  background: #1f2937;
  border-radius: 12px;
  padding: 32px;
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: #3b82f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.header-text h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
}

.page-description {
  margin: 0.5rem 0 0;
  opacity: 0.9;
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 400;
}

/* Clean Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.stat-icon.info {
  background: #3b82f6;
}

.stat-icon.success {
  background: #10b981;
}

.stat-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

/* Clean Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Clean Search Input */
:deep(.p-inputtext) {
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 10px 14px;
  transition: all 0.2s ease;
  background: white;
  font-size: 0.9rem;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    outline: none;
  }
}

/* Clean DataTable */
:deep(.p-datatable) {
  font-size: 0.9rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  background: white;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: #f9fafb;
  color: #374151;
  font-weight: 600;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: #f8fafc;
}

:deep(.p-datatable .p-datatable-tbody > tr.p-highlight) {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

/* Clean Modern Dialog Styles */
.clean-dialog {
  :deep(.p-dialog) {
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    border: none;
    overflow: hidden;
    background: #ffffff;
  }

  :deep(.p-dialog-header) {
    background: transparent;
    border: none;
    padding: 0;
  }

  :deep(.p-dialog-content) {
    background: transparent;
    border: none;
    padding: 0;
    border-radius: 0;
  }

  :deep(.p-dialog-footer) {
    background: transparent;
    border: none;
    padding: 0;
  }
}

/* Enhanced Dialog Styling */
.compact-dialog {
  :deep(.p-dialog) {
    border-radius: 12px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    border: none;
    overflow: hidden;
    background: #ffffff;
    margin: 0 auto;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  :deep(.p-dialog-header) {
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    display: none;
  }

  :deep(.p-dialog-content) {
    background: transparent;
    border: none;
    padding: 0;
    border-radius: 0;
    margin: 0;
  }

  :deep(.p-dialog-footer) {
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 20px 16px;
  background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
  color: white;
  position: relative;
  border-radius: 12px 12px 0 0;
  width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
  flex: 1;
}

.header-icon {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.header-text h3 {
  font-size: 1.35rem;
  font-weight: 700;
  color: white;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.header-text p {
  font-size: 0.85rem;
  color: #e5e7eb;
  margin: 0;
  line-height: 1.4;
  font-weight: 400;
  opacity: 0.9;
}

.close-btn {
  background: #d1d5db;
  color: #374151;
  border: none;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #9ca3af;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.dialog-content {
  padding: 20px;
  background: #ffffff;
  text-align: center;
  margin-top: 0;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: stretch;
  width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
  width: 100%;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
  justify-content: flex-start;
  width: 100%;

  .label-text {
    color: #111827;
    font-weight: 600;
  }

  .required {
    color: #ef4444;
    font-weight: 700;
    font-size: 1rem;
  }

  .optional {
    color: #6b7280;
    font-size: 0.8rem;
    font-weight: 400;
  }
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: stretch;

  .input-icon {
    position: absolute;
    left: 12px;
    color: #9ca3af;
    font-size: 0.9rem;
    z-index: 1;
  }

  .clean-input,
  .clean-textarea {
    padding-left: 36px;
    width: 100%;
  }
}

.clean-input,
.clean-textarea {
  width: 100%;
  padding: 12px 14px 12px 36px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  background: #ffffff;
  font-weight: 400;
  text-align: left;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    border-color: #9ca3af;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    outline: none;
    text-align: left;
  }

  &.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);

    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
    text-align: left;
  }
}

.clean-textarea {
  resize: none;
  min-height: 80px;
  line-height: 1.5;
}

.input-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 2px;
}

.char-count {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 400;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 500;
  background: #fef2f2;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #fecaca;

  i {
    font-size: 0.8rem;
    color: #ef4444;
  }
}

.info-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
  justify-content: flex-start;

  i {
    color: #6b7280;
    font-size: 0.9rem;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
}

.info-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-weight: 500;
  color: #374151;
  font-size: 0.85rem;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  text-align: left;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px 20px;
  background: #ffffff;
  border-top: 1px solid #f3f4f6;
  border-radius: 0 0 12px 12px;
}

/* Enhanced Button Styles */
:deep(.p-button) {
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  height: 38px;
  padding: 0 16px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  outline: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

:deep(.p-button-primary) {
  background: #3b82f6;
  color: #fff;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
  }
}

:deep(.p-button-text) {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;

  &:hover {
    background: #e5e7eb;
    color: #374151;
    border-color: #9ca3af;
    transform: translateY(-1px);
  }
}

.action-btn {
  min-width: 120px;
}

.cancel-btn {
  min-width: 100px;
}

/* Responsive Design */
/* Remove all mobile media queries - web only */

/* Focus on web layout only */
.category-list {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  margin-left: 16.25rem;
  transition: margin-left 0.2s;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: calc(100vw - 16.25rem - 40px);
}

.layout-wrapper.sidebar-collapsed .category-list {
  margin-left: 4.5rem;
  width: calc(100vw - 4.5rem - 40px);
}

/* Center the main content */
.main-content {
  display: flex;
  width: 100%;
}

/* Center the page header */
.page-header {
  background: #1f2937;
  border-radius: 10px;
  padding: 24px;
  color: white;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  width: 100%;
  max-width: 100%;
}

/* Center the stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 100%;
}

/* Center the toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 100%;
}

/* Center the data table */
:deep(.p-datatable) {
  font-size: 0.85rem;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  background: white;
  width: 100%;
  max-width: 100%;
}

/* Center the card content */
:deep(.p-card) {
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}

:deep(.p-card .p-card-body) {
  padding: 0;
  width: 100%;
}

:deep(.p-card .p-card-content) {
  padding: 0;
  width: 100%;
}

/* Center dialog positioning */
.compact-dialog {
  :deep(.p-dialog) {
    border-radius: 10px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    border: none;
    overflow: hidden;
    background: #ffffff;
    margin: 0 auto;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  :deep(.p-dialog-header) {
    background: transparent;
    border: none;
    padding: 0;
  }

  :deep(.p-dialog-content) {
    background: transparent;
    border: none;
    padding: 0;
    border-radius: 0;
  }

  :deep(.p-dialog-footer) {
    background: transparent;
    border: none;
    padding: 0;
  }
}

/* Center confirm dialog */
:deep(.p-confirm-dialog) {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90% !important;
  border: none;
  margin: 0 auto;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Ensure proper centering for all content */
.category-list > * {
  width: 100%;
  max-width: 100%;
}

/* Center the header content */
.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
  width: 100%;
}

/* Center the stats cards */
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  width: 100%;
}

/* Center the toolbar content */
.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

/* Ensure proper table centering */
:deep(.p-datatable-wrapper) {
  width: 100%;
  max-width: 100%;
}

:deep(.p-datatable-table) {
  width: 100%;
  max-width: 100%;
}

/* Center pagination */
:deep(.p-paginator) {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
}

/* Center the page title and description */
.page-header .header-text {
  text-align: center;
  width: 100%;
}

.page-header .header-text h2,
.page-header .header-text .page-description {
  text-align: center;
  width: 100%;
}

/* Extend content to use full width */
.stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.stat-card {
  min-height: 80px;
  padding: 20px;
}

/* Extend toolbar to use full width */
.toolbar {
  justify-content: space-between;
  padding: 20px;
}

.toolbar-left {
  flex: 1;
  justify-content: flex-start;
}

.toolbar-right {
  flex: 0 0 auto;
  justify-content: flex-end;
}

/* Extend table to use full width */
:deep(.p-datatable) {
  min-width: 100%;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  padding: 16px 12px;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 14px 12px;
}

/* Better use of available space */
.category-list {
  margin-right: 20px;
}

.layout-wrapper.sidebar-collapsed .category-list {
  margin-right: 20px;
}

/* Compact Spacing */
.mb-4 {
  margin-bottom: 1rem !important;
}

.mb-2 {
  margin-bottom: 0.5rem !important;
}

/* Compact Form Elements */
.form-group {
  margin-bottom: 0;
}

/* Compact Info Section */
.info-section {
  margin-top: 0;
}

/* Compact Button Groups */
.toolbar .p-button {
  height: 32px;
  padding: 0 12px;
  font-size: 0.85rem;
}

/* Compact Table */
:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 10px 8px;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  padding: 12px 8px;
}

/* Compact Pagination */
:deep(.p-paginator) {
  padding: 0.5rem;
}

:deep(.p-paginator .p-paginator-pages .p-paginator-page) {
  min-width: 2rem;
  height: 2rem;
}

/* Center dialog content */
.dialog-content {
  padding: 16px;
  background: #ffffff;
  text-align: center;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: stretch;
  width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
  width: 100%;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
  justify-content: flex-start;
  width: 100%;

  .label-text {
    color: #111827;
    font-weight: 600;
  }

  .required {
    color: #ef4444;
    font-weight: 700;
    font-size: 1rem;
  }

  .optional {
    color: #6b7280;
    font-size: 0.8rem;
    font-weight: 400;
  }
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: stretch;

  .input-icon {
    position: absolute;
    left: 12px;
    color: #6b7280;
    font-size: 0.9rem;
    z-index: 1;
  }

  .clean-input,
  .clean-textarea {
    padding-left: 36px;
    width: 100%;
  }
}

.clean-input,
.clean-textarea {
  width: 100%;
  padding: 12px 14px 12px 36px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  background: #ffffff;
  font-weight: 400;
  text-align: left;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    outline: none;
    text-align: left;
  }

  &.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);

    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
    text-align: left;
  }
}

.clean-textarea {
  resize: none;
  min-height: 80px;
  line-height: 1.5;
}

.input-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.char-count {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 400;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 500;

  i {
    font-size: 0.8rem;
    color: #ef4444;
  }
}

.info-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  width: 100%;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
  justify-content: flex-start;

  i {
    color: #6b7280;
    font-size: 0.9rem;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
}

.info-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-weight: 500;
  color: #374151;
  font-size: 0.85rem;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 16px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}
</style>
