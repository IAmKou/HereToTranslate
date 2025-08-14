<template>
  <Teleport to="body">
    <div class="edit-request-modal">
      <div class="modal-overlay" @click="$emit('close')"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Request</h3>
          <button class="close-btn" @click="$emit('close')">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="edit-form">
          <div class="form-group">
            <label for="title">Title <span class="required">*</span></label>
            <input
              id="title"
              v-model="form.title"
              type="text"
              required
              class="form-control"
              :class="{ 'error': errors.title }"
              placeholder="Enter request title"
              style="width: 100%;"
            >
            <span v-if="errors.title" class="error-message">{{ errors.title }}</span>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="form.description"
              class="form-control"
              :class="{ 'error': errors.description }"
              rows="8"
              placeholder="Enter request description"
              style="width: 100%; resize: vertical;"
            ></textarea>
            <span v-if="errors.description" class="error-message">{{ errors.description }}</span>
          </div>

          <div class="form-group">
            <label for="targetLanguages">Target Languages <span class="required">*</span></label>
            <div class="multi-select-container" ref="multiSelectContainer">
              <div class="selected-languages">
                <span
                  v-for="langCode in form.targetLanguages"
                  :key="langCode"
                  class="selected-language-tag"
                >
                  {{ getLanguageName(langCode) }}
                  <button
                    type="button"
                    @click.stop="removeLanguage(langCode)"
                    class="remove-lang-btn"
                  >
                    ×
                  </button>
                </span>
                <button
                  v-if="!showLanguageDropdown"
                  type="button"
                  @click.stop="toggleLanguageDropdown"
                  class="add-language-btn"
                >
                  <i class="pi pi-plus"></i>
                  Add Language
                </button>
              </div>

              <div v-show="showLanguageDropdown" class="language-dropdown">
                <div class="dropdown-header">
                  <div class="search-container">
                    <i class="pi pi-search search-icon"></i>
                    <input
                      v-model="languageSearch"
                      type="text"
                      placeholder="Search languages..."
                      class="language-search"
                      @focus="showLanguageDropdown = true"
                      @click.stop
                    >
                  </div>
                  <button
                    type="button"
                    @click.stop="showLanguageDropdown = false"
                    class="close-dropdown-btn"
                  >
                    <i class="pi pi-times"></i>
                  </button>
                </div>
                <div class="language-list">
                  <div
                    v-for="language in filteredLanguages"
                    :key="language.code"
                    @click.stop="addLanguage(language.code)"
                    class="language-option"
                    :class="{ 'selected': form.targetLanguages.includes(language.code) }"
                  >
                    <div class="language-info">
                      <span class="language-name">{{ language.name }}</span>
                      <span class="language-native">{{ language.nativeName }}</span>
                    </div>
                    <i v-if="form.targetLanguages.includes(language.code)" class="pi pi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>
            <span v-if="errors.targetLanguages" class="error-message">{{ errors.targetLanguages }}</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="dealAmount">Deal Amount <span class="required">*</span></label>
              <input
                id="dealAmount"
                v-model.number="form.dealAmount"
                type="number"
                min="0"
                required
                class="form-control"
                :class="{ 'error': errors.dealAmount }"
                placeholder="Enter deal amount"
              >
              <span v-if="errors.dealAmount" class="error-message">{{ errors.dealAmount }}</span>
            </div>

            <div class="form-group">
              <label for="deadline">Deadline <span class="required">*</span></label>
              <input
                id="deadline"
                v-model="form.deadline"
                type="date"
                :min="minDateString"
                required
                class="form-control"
                :class="{ 'error': errors.deadline }"
              >
              <span v-if="errors.deadline" class="error-message">{{ errors.deadline }}</span>
              <span v-else class="help-text">Deadline must be at least 7 days from now</span>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              {{ loading ? 'Updating...' : 'Update Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import axiosInstance from '../api'
import { useToast } from 'primevue/usetoast'
import { SUPPORTED_LANGUAGES, getLanguageName } from '../utils/languages'

const props = defineProps({
  request: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const form = ref({
  title: '',
  description: '',
  dealAmount: 0,
  deadline: '',
  targetLanguages: []
})

const errors = ref({})
const loading = ref(false)
const showLanguageDropdown = ref(false)
const languageSearch = ref('')
const multiSelectContainer = ref(null)

const minDate = ref(new Date())
minDate.value.setDate(minDate.value.getDate() + 7)

const minDateString = computed(() => {
  return minDate.value.toISOString().split('T')[0]
})

const filteredLanguages = computed(() => {
  if (!languageSearch.value) {
    return SUPPORTED_LANGUAGES.filter(lang => !form.value.targetLanguages.includes(lang.code))
  }
  return SUPPORTED_LANGUAGES.filter(lang =>
    !form.value.targetLanguages.includes(lang.code) &&
    (lang.name.toLowerCase().includes(languageSearch.value.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(languageSearch.value.toLowerCase()))
  )
})

const toast = useToast ? useToast() : null

// Handle click outside to close dropdown
function handleClickOutside(event) {
  if (multiSelectContainer.value && !multiSelectContainer.value.contains(event.target)) {
    showLanguageDropdown.value = false
  }
}

function toggleLanguageDropdown() {
  showLanguageDropdown.value = !showLanguageDropdown.value

  if (showLanguageDropdown.value) {
    // Focus on search input when dropdown opens
    setTimeout(() => {
      const searchInput = document.querySelector('.language-search')
      if (searchInput) {
        searchInput.focus()
      }
    }, 100)
  }
}

onMounted(() => {
  if (props.request) {
    // Handle both targetLanguages and targetLanguage fields
    let targetLangs = []
    if (props.request.targetLanguages && props.request.targetLanguages.length > 0) {
      targetLangs = props.request.targetLanguages
    } else if (props.request.targetLanguage && props.request.targetLanguage.length > 0) {
      targetLangs = props.request.targetLanguage
    }

    form.value = {
      title: props.request.title || '',
      description: props.request.description || '',
      dealAmount: props.request.dealAmount || 0,
      deadline: props.request.deadline ? new Date(props.request.deadline).toISOString().split('T')[0] : '',
      targetLanguages: targetLangs
    }
  }

  // Add event listener for click outside
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Remove event listener
  document.removeEventListener('click', handleClickOutside)
})

function addLanguage(langCode) {
  if (!form.value.targetLanguages.includes(langCode)) {
    form.value.targetLanguages.push(langCode)
  }
  languageSearch.value = ''
  showLanguageDropdown.value = false
}

function removeLanguage(langCode) {
  const index = form.value.targetLanguages.indexOf(langCode)
  if (index > -1) {
    form.value.targetLanguages.splice(index, 1)
  }
}

function validateForm() {
  errors.value = {}

  if (!form.value.title.trim()) {
    errors.value.title = 'Title is required'
  }

  if (form.value.dealAmount <= 0) {
    errors.value.dealAmount = 'Deal amount must be greater than 0'
  }

  if (!form.value.deadline) {
    errors.value.deadline = 'Deadline is required'
  } else {
    const deadlineDate = new Date(form.value.deadline)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    if (deadlineDate < sevenDaysFromNow) {
      errors.value.deadline = 'Deadline phải cách hiện tại ít nhất 7 ngày'
    }
  }

  if (!form.value.targetLanguages || form.value.targetLanguages.length === 0) {
    errors.value.targetLanguages = 'At least one target language is required'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const response = await axiosInstance.post(`/requests/${props.request.id}/update`, {
      title: form.value.title,
      description: form.value.description,
      dealAmount: Number(form.value.dealAmount),
      deadline: form.value.deadline,
      targetLanguages: form.value.targetLanguages
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    })

    if (toast) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Request updated successfully',
        life: 3000
      })
    } else {
      alert('Request updated successfully')
    }

    emit('updated')
    emit('close')
  } catch (error) {
    console.error('Error updating request:', error)
    console.error('Error response:', error.response?.data)

    // Show error message to user
    const errorMessage = error.response?.data?.message || 'Failed to update request'
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.edit-request-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 700px;
  max-width: 95vw;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 6px;
  transition: all 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #374151;
  transform: scale(1.05);
}

.edit-form {
  padding: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.form-row .form-group {
  flex: 1;
  margin-bottom: 0;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
  letter-spacing: 0.025em;
}

.required {
  color: #ef4444;
  font-weight: 700;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.8rem;
  transition: all 0.2s;
  background: #ffffff;
  color: #1e293b;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.form-control.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.error-message {
  color: #ef4444;
  font-size: 0.7rem;
  margin-top: 0.375rem;
  display: block;
  font-weight: 500;
}

.help-text {
  color: #64748b;
  font-size: 0.7rem;
  margin-top: 0.375rem;
  display: block;
  font-weight: 500;
}

/* Multi-select styles */
.multi-select-container {
  position: relative;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  min-height: 40px;
  background: white;
  transition: all 0.2s;
}

.multi-select-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.selected-languages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.5rem;
  min-height: 40px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.selected-language-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid #93c5fd;
  transition: all 0.2s;
}

.selected-language-tag:hover {
  background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.remove-lang-btn {
  background: none;
  border: none;
  color: #1e40af;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.125rem;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-lang-btn:hover {
  background: rgba(30, 64, 175, 0.1);
  transform: scale(1.1);
}

.add-language-btn {
  background: none;
  border: 2px dashed #cbd5e1;
  color: #64748b;
  padding: 0.375rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 2;
  position: relative;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.add-language-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
  transform: translateY(-1px);
}

.add-language-btn i {
  font-size: 0.7rem;
}

.language-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-header {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.search-container {
  display: flex;
  align-items: center;
  flex: 1;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.375rem 0.5rem;
  background: white;
  transition: all 0.2s;
}

.search-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-container .search-icon {
  color: #64748b;
  margin-right: 0.375rem;
  font-size: 0.75rem;
}

.language-search {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.75rem;
  padding: 0;
  background: transparent;
  color: #1e293b;
}

.language-search:focus {
  outline: none;
}

.language-search::placeholder {
  color: #9ca3af;
}

.close-dropdown-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.375rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  transition: all 0.2s;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-dropdown-btn:hover {
  background: #f1f5f9;
  color: #374151;
  transform: scale(1.05);
}

.language-list {
  max-height: 150px;
  overflow-y: auto;
}

.language-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid #f8fafc;
}

.language-option:hover {
  background: #f8fafc;
  transform: translateX(2px);
}

.language-option.selected {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
}

.language-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.language-name {
  font-weight: 600;
  font-size: 0.75rem;
  color: inherit;
}

.language-native {
  font-size: 0.65rem;
  color: #64748b;
  font-style: italic;
}

.language-option.selected .language-native {
  color: #1e40af;
}

.check-icon {
  color: #1e40af;
  font-size: 0.875rem;
  margin-left: 0.375rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f1f5f9;
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  letter-spacing: 0.025em;
  min-width: 100px;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #374151;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.loading-spinner {
  width: 0.875rem;
  height: 0.875rem;
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

/* Scrollbar styling */
.language-list::-webkit-scrollbar {
  width: 4px;
}

.language-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.language-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.language-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    max-height: 90vh;
  }

  .edit-form {
    padding: 1.25rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }
}
</style>
