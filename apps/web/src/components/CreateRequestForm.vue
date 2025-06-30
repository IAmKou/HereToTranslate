<template>
  <div class="create-request-container">
    <div class="create-request-form">
      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Request Information</h3>
            <p class="section-subtitle">Fill in the information below to create your translation request</p>
          </div>

          <div class="form-grid">
            <!-- Request Type -->
            <div class="form-group request-type-group">
              <label class="form-label">
                Request Type <span class="required-mark">*</span>
              </label>
              <div class="radio-group">
                <label class="radio-option" :class="{ active: requestType === 'public' }">
                  <input type="radio" value="public" v-model="requestType" class="radio-input">
                  <div class="radio-custom">
                    <div class="radio-dot"></div>
                  </div>
                  <div class="radio-content">
                    <div class="radio-icon">🌍</div>
                    <div class="radio-text">
                      <div class="radio-title">Public Request</div>
                      <div class="radio-description">Available to all translators in the community</div>
                    </div>
                  </div>
                </label>
                <label class="radio-option" :class="{ active: requestType === 'private' }">
                  <input type="radio" value="private" v-model="requestType" class="radio-input">
                  <div class="radio-custom">
                    <div class="radio-dot"></div>
                  </div>
                  <div class="radio-content">
                    <div class="radio-icon">🔒</div>
                    <div class="radio-text">
                      <div class="radio-title">Private Request</div>
                      <div class="radio-description">Assigned to a specific translator</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Assignee (for private requests) -->
            <div class="form-group" v-if="requestType === 'private'">
              <label for="assignee" class="form-label">
                Assignee <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="assignee"
                  v-model="assigneeEmail"
                  type="email"
                  required
                  class="form-control"
                  :class="{ 'error': assigneeTouched && !!assigneeError }"
                  placeholder="Enter assignee email address"
                  @input="assigneeTouched = true"
                  @blur="assigneeTouched = true"
                >
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span v-if="assigneeTouched && assigneeError" class="error-message">{{ assigneeError }}</span>
                <span v-else class="help-text">Enter the email of the translator you want to assign</span>
              </div>
            </div>

            <!-- Title -->
            <div class="form-group full-width">
              <label for="title" class="form-label">
                Title <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="title"
                  v-model="title"
                  type="text"
                  required
                  class="form-control"
                  :class="{ 'error': titleTouched && !!titleError }"
                  placeholder="Enter a descriptive request title"
                  maxlength="255"
                  @input="titleTouched = true"
                  @blur="titleTouched = true"
                >
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span class="char-count" :class="{ 'warning': title.length > 200 }">{{ title.length }}/255</span>
                <span v-if="titleTouched && titleError" class="error-message">{{ titleError }}</span>
              </div>
            </div>

            <!-- Description -->
            <div class="form-group full-width">
              <label for="description" class="form-label">Description</label>
              <div class="textarea-wrapper">
                <textarea
                  id="description"
                  v-model="description"
                  class="form-control"
                  rows="4"
                  placeholder="Describe your request in detail (optional)"
                  maxlength="1000"
                  @input="descTouched = true"
                  @blur="descTouched = true"
                ></textarea>
                <div class="textarea-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span class="char-count" :class="{ 'warning': description.length > 800 }">{{ description.length }}/1000</span>
                <span v-if="descTouched && descriptionError" class="error-message">{{ descriptionError }}</span>
              </div>
            </div>

            <!-- Deal Amount -->
            <div class="form-group">
              <label for="dealAmount" class="form-label">
                Deal Amount <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="dealAmount"
                  v-model.number="dealAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  class="form-control"
                  :class="{ 'error': amountTouched && !!dealAmountError }"
                  placeholder="0.00"
                  @input="amountTouched = true"
                  @blur="amountTouched = true"
                >
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1V23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17 5H9.5C7.01472 5 5 7.01472 5 9.5C5 11.9853 7.01472 14 9.5 14H14.5C16.9853 14 19 16.0147 19 18.5C19 20.9853 16.9853 23 14.5 23H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span v-if="amountTouched && dealAmountError" class="error-message">{{ dealAmountError }}</span>
                <span v-else class="help-text">Set the budget for this translation request</span>
              </div>
            </div>

            <!-- Deadline -->
            <div class="form-group">
              <label for="deadline" class="form-label">
                Deadline <span class="required-mark">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="deadline"
                  v-model="deadline"
                  type="date"
                  :min="minDateString"
                  required
                  class="form-control"
                  :class="{ 'error': deadlineTouched && !!deadlineError }"
                  @input="deadlineTouched = true"
                  @blur="deadlineTouched = true"
                >
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 7V3M16 7V3M3 11H21M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span v-if="deadlineTouched && deadlineError" class="error-message">{{ deadlineError }}</span>
                <span v-else class="help-text">Deadline must be at least 7 days from now</span>
              </div>
            </div>

            <!-- Category -->
            <div class="form-group">
              <label for="category" class="form-label">
                Category <span class="required-mark">*</span>
              </label>
              <div class="select-wrapper">
                <select
                  id="category"
                  v-model="categoryId"
                  class="form-control"
                  :class="{ 'error': categoryTouched && !!categoryError }"
                  required
                  @change="categoryTouched = true"
                  @blur="categoryTouched = true"
                >
                  <option value="">Choose a category</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
                <div class="select-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <div class="input-info">
                <span v-if="categoryTouched && categoryError" class="error-message">{{ categoryError }}</span>
                <span v-else class="help-text">Select the most appropriate category for your request</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !isFormValid"
          >
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else class="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            {{ loading ? 'Creating Request...' : 'Create Request' }}
          </button>
          <button type="button" class="btn btn-secondary" @click.prevent="onCancel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Cancel
          </button>
        </div>
      </form>
      <Toast />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineEmits } from 'vue'
import axios from 'axios'
import { useToast } from 'primevue/usetoast'

const emit = defineEmits(['success', 'cancel'])

const title = ref('')
const description = ref('')
const dealAmount = ref(null)
const deadline = ref('')
const categoryId = ref('')
const loading = ref(false)
const minDate = ref(new Date())
// Set minDate to 7 days from now to match backend validation
minDate.value.setDate(minDate.value.getDate() + 7)
const toast = useToast()

const categories = ref([])

const titleTouched = ref(false)
const descTouched = ref(false)
const amountTouched = ref(false)
const deadlineTouched = ref(false)
const categoryTouched = ref(false)
const assigneeEmail = ref('')
const assigneeTouched = ref(false)

const requestType = ref('public')

const currentUserId = ref(null)

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Regex chỉ cho phép chữ cái, số, khoảng trắng, dấu câu cơ bản và tiếng Việt
const specialCharRegex = /^[a-zA-Z0-9\s.,!?\'"\-À-ỹà-ỹ]+$/u
const userEmail = ref('')

const isDealAmountValid = computed(() => dealAmount.value !== null && dealAmount.value > 0)

const minDateString = computed(() => {
  const d = minDate.value
  return d.toISOString().split('T')[0]
})

const titleError = computed(() => {
  if (!titleTouched.value) return ''
  if (!title.value) return 'Title is required'
  if (title.value.length < 3) return 'Title must be at least 3 characters'
  if (title.value.length > 255) return 'Title is too long (max 255 characters)'
  if (!specialCharRegex.test(title.value)) return 'Title contains invalid special characters'
  return ''
})
const descriptionError = computed(() => {
  if (!descTouched.value) return ''
  if (description.value.length > 1000) return 'Description too long (max 1000 characters)'
  if (description.value && !specialCharRegex.test(description.value)) return 'Description contains invalid special characters'
  return ''
})
const dealAmountError = computed(() => {
  if (!amountTouched.value) return ''
  if (dealAmount.value === null || dealAmount.value === '' || isNaN(dealAmount.value)) return 'Deal amount is required'
  if (dealAmount.value <= 0) return 'Deal amount must be greater than 0'
  return ''
})
const deadlineError = computed(() => {
  if (!deadlineTouched.value) return ''
  if (!deadline.value) return 'Please select a deadline'
  const deadlineDate = new Date(deadline.value)
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  if (deadlineDate < sevenDaysFromNow) return 'Deadline must be at least 7 days from now'
  return ''
})
const categoryError = computed(() => {
  if (!categoryTouched.value) return ''
  if (!categoryId.value) return 'Please select a category'
  return ''
})
const assigneeError = computed(() => {
  if (requestType.value !== 'private') return ''
  if (!assigneeTouched.value) return ''
  if (!assigneeEmail.value) return 'Please enter assignee email'
  if (!emailRegex.test(assigneeEmail.value)) return 'Invalid email format'
  if (userEmail.value && assigneeEmail.value === userEmail.value) return 'You cannot assign the request to yourself'
  return ''
})

const isFormValid = computed(() => {
  if (requestType.value === 'private') {
    return (
      !titleError.value &&
      !descriptionError.value &&
      !dealAmountError.value &&
      !deadlineError.value &&
      !categoryError.value &&
      !assigneeError.value
    )
  } else {
    return (
      !titleError.value &&
      !descriptionError.value &&
      !dealAmountError.value &&
      !deadlineError.value &&
      !categoryError.value
    )
  }
})

onMounted(async () => {
  try {
    const categoriesRes = await axios.get('/api/categories/all')
    categories.value = categoriesRes.data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch categories', life: 3000 })
  }

  const storedId = localStorage.getItem('userId')
  if (storedId) {
    currentUserId.value = storedId
  }
  const storedEmail = localStorage.getItem('email')
  if (storedEmail) {
    userEmail.value = storedEmail
  }
})

async function handleSubmit() {
  titleTouched.value = true
  descTouched.value = true
  amountTouched.value = true
  deadlineTouched.value = true
  assigneeTouched.value = true
  categoryTouched.value = true
  if (!isFormValid.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fix all validation errors', life: 3000 })
    return
  }
  loading.value = true
  try {
    // Validate deadline is at least 7 days from now (backend requirement)
    const deadlineDate = new Date(deadline.value)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    if (deadlineDate < sevenDaysFromNow) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Deadline must be at least 7 days from now',
        life: 3000
      })
      loading.value = false
      return
    }

    // Map requestType to backend fields
    let isPublic = false
    let assigneeId = undefined

    if (requestType.value === 'public') {
      isPublic = true
      assigneeId = undefined
    } else if (requestType.value === 'private') {
      isPublic = false
      // Find assigneeId from email
      try {
        console.log('Searching for user with email:', assigneeEmail.value)
        if (!currentUserId.value) {
          throw new Error('Current user ID not found in localStorage')
        }
        const response = await axios.get(`/api/requests/search?keyword=${encodeURIComponent(assigneeEmail.value)}&currentUserId=${currentUserId.value}`)
        console.log('Search response:', response.data)
        if (response.data && response.data.length > 0) {
          // Find exact email match
          const user = response.data.find(u => u.email === assigneeEmail.value)
          console.log('Found user:', user)
          if (user) {
            assigneeId = Number(user.id) // Convert bigint to number for backend
            console.log('Assignee ID converted:', assigneeId, 'Type:', typeof assigneeId)
          } else {
            toast.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No user found with this email',
              life: 3000
            })
            loading.value = false
            return
          }
        } else {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No user found with this email',
            life: 3000
          })
          loading.value = false
          return
        }
      } catch (error) {
        console.error('Error searching for user:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No user found with this email',
          life: 3000
        })
        loading.value = false
        return
      }
    }

    const requestData = {
      title: title.value,
      description: description.value,
      dealAmount: dealAmount.value,
      deadline: deadline.value,
      isPublic: Boolean(isPublic),
      categoryId: categoryId.value
    }

    // Only add assigneeId if it's defined
    if (assigneeId !== undefined) {
      requestData.assigneeId = assigneeId
    }

    console.log('=== DEBUG INFO ===')
    console.log('Request type selected:', requestType.value)
    console.log('isPublic value:', isPublic, 'Type:', typeof isPublic)
    console.log('assigneeId value:', assigneeId, 'Type:', typeof assigneeId)
    console.log('Full request data being sent:', JSON.stringify(requestData, null, 2))
    console.log('=== END DEBUG ===')

    const response = await axios.post('/api/requests/create', requestData)
    console.log('Backend response:', response.data)
    emit('success')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Failed to create request', life: 3000 })
  } finally {
    loading.value = false
  }
}

function onCancel() {
  emit('cancel')
}
</script>

<style scoped>
.create-request-container {
  min-height: 100vh;
  padding: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  background: transparent;
  width: 100%;
  margin-right: 0;
}

.create-request-form {
  width: 100%;
  max-width: 100%;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.form {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 100%;
  align-items: flex-start;
}

.form-section {
  background: white;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.section-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 2rem;
  padding: 0 48px;
  width: 100%;
}

.section-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.section-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.section-subtitle {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  width: 100%;
  padding: 0 48px 48px 48px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0;
  align-items: flex-start;
  width: 100%;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group.request-type-group {
  grid-column: 1 / -1;
}

.form-label {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
}

.required-mark {
  color: #ef4444;
  font-size: 1.2rem;
  line-height: 1;
  font-weight: bold;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-style: normal;
  line-height: 1.4;
}

/* Radio Group Styles */
.radio-group {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.radio-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.radio-option:hover {
  border-color: #667eea;
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.1);
}

.radio-option.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.radio-option.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.radio-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.radio-option.active .radio-custom {
  border-color: #667eea;
  background: #667eea;
}

.radio-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  transform: scale(0);
  transition: transform 0.3s ease;
}

.radio-option.active .radio-dot {
  transform: scale(1);
}

.radio-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.radio-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
}

.radio-description {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
}

.input-wrapper,
.textarea-wrapper,
.select-wrapper {
  position: relative;
  max-width: 100%;
  width: 100%;
  margin: 0;
}

.form-control {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 1rem 1rem 1rem 3.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #f9fafb;
  color: #374151;
  font-weight: 500;
  margin: 0;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  background-color: white;
  transform: translateY(-1px);
}

.form-control.error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.form-control.error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.form-control:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

textarea.form-control {
  resize: vertical;
  min-height: 120px;
  padding-top: 1rem;
  padding-bottom: 1rem;
  max-width: 100%;
  margin: 0;
}

.input-icon,
.textarea-icon,
.select-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  transition: color 0.3s ease;
}

.textarea-icon {
  top: 1.5rem;
  transform: none;
}

.form-control:focus + .input-icon,
.form-control:focus + .textarea-icon {
  color: #667eea;
}

.form-control.error + .input-icon,
.form-control.error + .textarea-icon {
  color: #ef4444;
}

.select-icon {
  right: 1rem;
  left: auto;
  pointer-events: none;
}

.input-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-top: 0.5rem;
}

.char-count {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.char-count.warning {
  color: #f59e0b;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
  flex: 1;
}

.form-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  padding: 0 48px 48px 48px;
  width: 100%;
}

.btn {
  flex: 1;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  letter-spacing: 0.5px;
  min-height: 48px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-secondary {
  background: #f8fafc;
  color: #64748b;
  border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 1.25rem;
  height: 1.25rem;
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

/* Responsive Design */
@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .radio-group {
    flex-direction: column;
  }

  .section-header {
    padding: 0 32px;
  }

  .form-grid {
    padding: 0 32px 32px 32px;
  }

  .form-actions {
    padding: 0 32px 32px 32px;
  }
}

@media (max-width: 768px) {
  .section-header {
    padding: 0 24px;
  }

  .form-grid {
    padding: 0 24px 24px 24px;
    gap: 1rem;
  }

  .form-actions {
    padding: 0 24px 24px 24px;
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .radio-option {
    padding: 16px;
  }

  .radio-content {
    gap: 8px;
  }

  .radio-icon {
    width: 32px;
    height: 32px;
    font-size: 1.25rem;
  }

  .section-header h3 {
    font-size: 1.25rem;
  }

  .section-subtitle {
    font-size: 0.875rem;
  }
}
</style>
