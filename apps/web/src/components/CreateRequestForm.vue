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
            <h3>Request Details</h3>
          </div>

          <div class="form-group">
            <label>Request Type <span class="required-mark">*</span></label>
            <div style="display: flex; gap: 1rem;">
              <label><input type="radio" value="public" v-model="requestType"> Public</label>
              <label><input type="radio" value="private" v-model="requestType"> Private</label>
            </div>
          </div>

          <div class="form-group" v-if="requestType === 'private'">
            <label for="assignee">Assignee <span class="required-mark">*</span></label>
            <div class="input-wrapper">
              <input
                id="assignee"
                v-model="assigneeEmail"
                type="email"
                required
                class="form-control"
                :class="{ 'error': assigneeTouched && !assigneeEmail }"
                placeholder="Enter assignee email"
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
              <span v-if="assigneeTouched && !assigneeEmail" class="error-message">Please enter assignee email</span>
            </div>
          </div>

          <div class="form-group">
            <label for="title">
              Title <span class="required-mark">*</span>
            </label>
            <div class="input-wrapper">
              <input
                id="title"
                v-model="title"
                type="text"
                required
                class="form-control"
                :class="{ 'error': titleTouched && !title }"
                placeholder="Enter a descriptive request title"
                maxlength="100"
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
              <span class="char-count">{{ title.length }}/100</span>
              <span v-if="titleTouched && !title" class="error-message">Title is required</span>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <div class="textarea-wrapper">
              <textarea
                id="description"
                v-model="description"
                class="form-control"
                rows="4"
                placeholder="Describe your request (optional)"
                maxlength="500"
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
              <span class="char-count">{{ description.length }}/500</span>
              <span v-if="descTouched && description.length > 500" class="error-message">Description too long</span>
              <span v-else class="help-text">A good description helps others understand your request better</span>
            </div>
          </div>

          <div class="form-group">
            <label for="dealAmount">Deal Amount <span class="required-mark">*</span></label>
            <div class="input-wrapper">
              <input
                id="dealAmount"
                v-model.number="dealAmount"
                type="number"
                min="0"
                required
                class="form-control"
                :class="{ 'error': amountTouched && !isDealAmountValid }"
                placeholder="Enter deal amount"
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
              <span v-if="amountTouched && !isDealAmountValid" class="error-message">Deal amount must be greater than 0</span>
            </div>
          </div>

          <div class="form-group">
            <label for="deadline">Deadline <span class="required-mark">*</span></label>
            <div class="input-wrapper">
              <input
                id="deadline"
                v-model="deadline"
                type="date"
                :min="minDateString"
                required
                class="form-control"
                :class="{ 'error': deadlineTouched && !deadline }"
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
              <span v-if="deadlineTouched && !deadline" class="error-message">Please select a deadline</span>
              <span v-else class="help-text">Deadline must be at least 7 days from now</span>
            </div>
          </div>

          <div class="form-group">
            <label for="category">
              Category <span class="required-mark">*</span>
            </label>
            <div class="select-wrapper">
              <select
                id="category"
                v-model="categoryId"
                class="form-control"
                :class="{ 'error': categoryTouched && !categoryId }"
                required
                @change="categoryTouched = true"
                @blur="categoryTouched = true"
              >
                <option value="">Choose a category for your request</option>
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
              <span v-if="categoryTouched && !categoryId" class="error-message">Please select a category</span>
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
          <button type="button" class="btn" @click.prevent="onCancel">Cancel</button>
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

const isDealAmountValid = computed(() => dealAmount.value !== null && dealAmount.value > 0)
const isFormValid = computed(() => {
  if (requestType.value === 'private') {
    return title.value && isDealAmountValid.value && deadline.value && assigneeEmail.value && categoryId.value
  } else {
    return title.value && isDealAmountValid.value && deadline.value && categoryId.value
  }
})

const minDateString = computed(() => {
  const d = minDate.value
  return d.toISOString().split('T')[0]
})

onMounted(async () => {
  try {
    const categoriesRes = await axios.get('/api/categories/all')
    categories.value = categoriesRes.data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch categories', life: 3000 })
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
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all required information', life: 3000 })
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
        const response = await axios.get(`/api/users/search?q=${assigneeEmail.value}`)
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
    toast.add({ severity: 'success', summary: 'Success', detail: 'Request created successfully!', life: 3000 })
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
  padding: 2rem 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  background: #f8fafc;
  width: 100%;
  margin-right: 10rem;
}
.create-request-form {
  width: 100%;
  max-width: none;
  background: white;
  border-radius: 0;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

}
.form {
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: none;
  align-items: flex-start;
}
.form-section {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f1f5f9;
}
.section-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.section-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  align-items: flex-start;
  width: 100%;
}
.form-group:last-child {
  margin-bottom: 0;
}
label {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  font-style: italic;
}
.input-wrapper,
.textarea-wrapper,
.select-wrapper {
  position: relative;
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}
.form-control {
  width: 100%;
  max-width: 400px;
  min-width: 0;
  box-sizing: border-box;
  padding: 1rem 1rem 1rem 3.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  background-color: #f9fafb;
  color: #374151;
  font-weight: 500;
  margin: 0 auto;
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
  max-width: 400px;
  margin: 0 auto;
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
.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
  flex: 1;
}
.file-link {
  margin-top: 0.5rem;
  font-size: 0.95rem;
}
.form-actions {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
}
.btn {
  width: 100%;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
</style>
