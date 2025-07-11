<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import { TranslationService, type TranslationString } from '../services/translation.service';

const props = defineProps<{
  projectId: string;
  branchId?: string;
  repo?: string;
  customTitle?: string;
}>();

const toast = useToast();

// State
const translations = ref<TranslationString[]>([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');
const editingTranslation = ref<TranslationString | null>(null);
const showEditDialog = ref(false);
const showCommitDialog = ref(false);
const committing = ref(false);
const saving = ref(false);

// Computed
const filteredTranslations = computed(() => {
  if (!searchQuery.value) return translations.value;
  const query = searchQuery.value.toLowerCase();
  return translations.value.filter(t =>
    t.originalText.toLowerCase().includes(query) ||
    t.translatedText.toLowerCase().includes(query)
  );
});

const hasUntranslated = computed(() =>
  translations.value.some(t => !t.translatedText || t.translatedText.trim() === '')
);

const hasTranslated = computed(() =>
  translations.value.some(t => t.translatedText && t.translatedText.trim() !== '')
);

// Methods
async function loadTranslations() {
  if (!props.projectId || !props.branchId) {
    error.value = 'Project ID and Branch ID are required';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    translations.value = await TranslationService.getTranslationStrings(props.projectId, props.branchId);
  } catch (err: any) {
    error.value = err.message || 'Failed to load translations';
    toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 });
  } finally {
    loading.value = false;
  }
}

async function saveTranslation() {
  if (!editingTranslation.value) return;

  saving.value = true;
  try {
    await TranslationService.updateTranslation(
      editingTranslation.value.id,
      editingTranslation.value.translatedText
    );

    // Update local state
    const index = translations.value.findIndex(t => t.id === editingTranslation.value!.id);
    if (index !== -1) {
      translations.value[index] = { ...editingTranslation.value };
    }

    showEditDialog.value = false;
    editingTranslation.value = null;
    toast.add({ severity: 'success', summary: 'Success', detail: 'Translation saved successfully!', life: 3000 });
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message || 'Failed to save translation', life: 3000 });
  } finally {
    saving.value = false;
  }
}

async function commitTranslations() {
  if (!props.projectId || !props.branchId || !props.repo) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Missing project, branch, or repo information', life: 3000 });
    return;
  }

  committing.value = true;
  try {
    await TranslationService.commitTranslations(props.projectId, props.branchId, props.repo);
    showCommitDialog.value = false;
    toast.add({ severity: 'success', summary: 'Success', detail: 'Translations committed to GitHub successfully!', life: 3000 });
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message || 'Failed to commit translations', life: 3000 });
  } finally {
    committing.value = false;
  }
}

function editTranslation(translation: TranslationString) {
  editingTranslation.value = { ...translation };
  showEditDialog.value = true;
}

function cancelEdit() {
  editingTranslation.value = null;
  showEditDialog.value = false;
}

// Lifecycle
onMounted(() => {
  loadTranslations();
});
</script>

<template>
  <div class="translation-tab-wrapper">
    <div class="translation-header">
      <h2 v-if="customTitle" class="translation-title">{{ customTitle }}</h2>
      <div class="translation-actions">
        <InputText
          v-model="searchQuery"
          placeholder="Search translations..."
          class="search-input"
        />
        <Button
          v-if="hasTranslated"
          label="Commit to GitHub"
          icon="pi pi-github"
          class="p-button-success"
          @click="showCommitDialog = true"
          :disabled="committing"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          class="p-button-outlined"
          @click="loadTranslations"
          :disabled="loading"
        />
      </div>
    </div>

    <div class="translation-section">
      <div v-if="loading" class="translation-loading">
        <div class="loading-spinner-small"></div>
        <span>Loading translations...</span>
      </div>

      <div v-else-if="error" class="translation-error">
        <span class="error-icon">⚠️</span>
        <span>{{ error }}</span>
        <Button label="Retry" class="p-button-outlined p-button-sm" @click="loadTranslations" />
      </div>

      <div v-else-if="filteredTranslations.length > 0" class="translation-list">
        <div class="translation-stats">
          <span class="stat-item">
            <i class="pi pi-list"></i>
            Total: {{ translations.length }}
          </span>
          <span class="stat-item">
            <i class="pi pi-check-circle"></i>
            Translated: {{ translations.filter(t => t.translatedText && t.translatedText.trim()).length }}
          </span>
          <span class="stat-item">
            <i class="pi pi-clock"></i>
            Pending: {{ translations.filter(t => !t.translatedText || t.translatedText.trim() === '').length }}
          </span>
        </div>

        <div class="translation-items">
          <div
            v-for="translation in filteredTranslations"
            :key="translation.id"
            class="translation-item"
            :class="{ 'has-translation': translation.translatedText && translation.translatedText.trim() }"
          >
            <div class="translation-content">
              <div class="original-text">
                <label>Original Text:</label>
                <p>{{ translation.originalText }}</p>
              </div>
              <div class="translated-text">
                <label>Translation:</label>
                <div v-if="translation.translatedText && translation.translatedText.trim()" class="translation-display">
                  <p>{{ translation.translatedText }}</p>
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-text p-button-sm"
                    @click="editTranslation(translation)"
                  />
                </div>
                <div v-else class="no-translation">
                  <span class="no-translation-text">No translation yet</span>
                  <Button
                    label="Add Translation"
                    icon="pi pi-plus"
                    class="p-button-outlined p-button-sm"
                    @click="editTranslation(translation)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="searchQuery" class="no-results">
        <div class="no-content-icon">🔍</div>
        <p>No translations found for "{{ searchQuery }}"</p>
        <Button label="Clear Search" class="p-button-outlined" @click="searchQuery = ''" />
      </div>

      <div v-else class="no-translation">
        <div class="no-content-icon">🌐</div>
        <p>No translations available for this project yet.</p>
        <p class="sub-text">Upload files to extract translatable strings.</p>
      </div>
    </div>

    <!-- Edit Translation Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Edit Translation"
      :modal="true"
      :closable="true"
      class="translation-dialog"
    >
      <div v-if="editingTranslation" class="edit-form">
        <div class="form-group">
          <label>Original Text:</label>
          <div class="original-display">{{ editingTranslation.originalText }}</div>
        </div>
        <div class="form-group">
          <label>Translation:</label>
          <Textarea
            v-model="editingTranslation.translatedText"
            rows="4"
            placeholder="Enter your translation..."
            class="translation-textarea"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="cancelEdit" />
        <Button
          label="Save"
          class="p-button-primary"
          @click="saveTranslation"
          :disabled="saving"
          :loading="saving"
        />
      </template>
    </Dialog>

    <!-- Commit Dialog -->
    <Dialog
      v-model:visible="showCommitDialog"
      header="Commit Translations to GitHub"
      :modal="true"
      :closable="true"
    >
      <div class="commit-content">
        <p>This will commit all translated strings to the GitHub repository.</p>
        <div class="commit-info">
          <strong>Repository:</strong> {{ repo || 'Not specified' }}<br>
          <strong>Branch:</strong> {{ branchId || 'Not specified' }}<br>
          <strong>Files to commit:</strong> {{ translations.filter(t => t.translatedText && t.translatedText.trim()).length }} translations
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showCommitDialog = false" />
        <Button
          label="Commit to GitHub"
          class="p-button-success"
          @click="commitTranslations"
          :disabled="committing"
          :loading="committing"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.translation-tab-wrapper {
  padding: 1.5em 0;
}

.translation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5em;
  gap: 1em;
}

.translation-title {
  font-size: 1.3em;
  font-weight: 600;
  color: #2b6cb0;
  margin: 0;
}

.translation-actions {
  display: flex;
  gap: 0.8em;
  align-items: center;
}

.search-input {
  min-width: 250px;
}

.translation-section {
  margin-top: 1em;
}

.translation-stats {
  display: flex;
  gap: 1.5em;
  margin-bottom: 1.5em;
  padding: 1em;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.9em;
  color: #64748b;
}

.stat-item i {
  color: #6366f1;
}

.translation-items {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.translation-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5em;
  transition: all 0.2s;
}

.translation-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.translation-item.has-translation {
  border-left: 4px solid #10b981;
}

.translation-content {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.original-text, .translated-text {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.original-text label, .translated-text label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9em;
}

.original-text p {
  margin: 0;
  padding: 0.8em;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  line-height: 1.4;
}

.translation-display {
  display: flex;
  align-items: flex-start;
  gap: 0.8em;
}

.translation-display p {
  flex: 1;
  margin: 0;
  padding: 0.8em;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
  color: #166534;
  line-height: 1.4;
}

.no-translation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8em;
  background: #fef2f2;
  border-radius: 6px;
  border: 1px solid #fecaca;
}

.no-translation-text {
  color: #dc2626;
  font-style: italic;
}

.translation-loading, .translation-error, .no-translation, .no-results {
  text-align: center;
  padding: 3em 0;
}

.loading-spinner-small {
  border: 2px solid #f3f4f6;
  border-top: 2px solid #6366f1;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1em;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 2em;
  margin-bottom: 0.5em;
  display: block;
}

.no-content-icon {
  font-size: 3em;
  margin-bottom: 0.5em;
}

.sub-text {
  color: #6b7280;
  font-size: 0.9em;
  margin-top: 0.5em;
}

/* Dialog Styles */
.translation-dialog ::v-deep .p-dialog {
  min-width: 600px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.5em;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.form-group label {
  font-weight: 600;
  color: #374151;
}

.original-display {
  padding: 1em;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-family: 'Courier New', monospace;
  line-height: 1.4;
}

.translation-textarea {
  font-family: inherit;
  resize: vertical;
}

.commit-content {
  padding: 1em 0;
}

.commit-info {
  margin-top: 1em;
  padding: 1em;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 0.9em;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 768px) {
  .translation-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1em;
  }

  .translation-actions {
    flex-direction: column;
  }

  .search-input {
    min-width: auto;
  }

  .translation-stats {
    flex-direction: column;
    gap: 0.8em;
  }
}
</style>
