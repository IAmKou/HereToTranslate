<template>
  <div class="admin-settings">
    <div class="settings-header">
      <h2>Admin Settings</h2>
      <p>Manage system-wide settings and configurations</p>
    </div>

    <div class="settings-section">
      <div class="section-header">
        <h3>Fee Management</h3>
        <p>Configure the default fee percentage for transactions</p>
      </div>

      <div class="fee-form">
        <div class="current-fee-display">
          <label>Current Default Fee:</label>
          <div class="fee-value">
            <span class="fee-percentage">{{ currentFee }}%</span>
            <span class="fee-description">per transaction</span>
          </div>
        </div>

        <form @submit.prevent="updateFee" class="fee-update-form">
          <div class="form-group">
            <label for="newFee">New Fee Percentage:</label>
            <div class="input-group">
              <input
                id="newFee"
                v-model.number="newFee"
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="form-input"
                placeholder="Enter fee percentage (0-100)"
                :disabled="isUpdating"
              />
              <span class="input-suffix">%</span>
            </div>
            <small class="form-help">Fee must be between 0% and 100%</small>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isUpdating || !isValidFee || newFee === currentFee"
            >
              <span v-if="isUpdating" class="loading-spinner"></span>
              {{ isUpdating ? 'Updating...' : 'Update Fee' }}
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              @click="resetForm"
              :disabled="isUpdating"
            >
              Reset
            </button>
          </div>
        </form>

        <div v-if="message" :class="['message', messageType]">
          {{ message }}
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="section-header">
        <h3>Fee Information</h3>
        <p>Understanding how fees work in the system</p>
      </div>
      
      <div class="info-cards">
        <div class="info-card">
          <div class="card-icon">💰</div>
          <h4>Default Fee</h4>
          <p>The default fee percentage is applied to all transactions unless overridden by specific rules.</p>
        </div>
        
        <div class="info-card">
          <div class="card-icon">⚙️</div>
          <h4>System-wide Setting</h4>
          <p>This setting affects the entire system and should be configured carefully.</p>
        </div>
        
        <div class="info-card">
          <div class="card-icon">📊</div>
          <h4>Range Validation</h4>
          <p>Fees must be between 0% (no fee) and 100% (full amount).</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import axiosInstance from '../api'
// Types
interface FeeResponse {
  success: boolean
  fee: number
}

// Composables
const toast = useToast()

// Reactive state
const currentFee = ref<number>(5.0)
const newFee = ref<number>(5.0)
const isUpdating = ref<boolean>(false)
const message = ref<string>('')
const messageType = ref<'success' | 'error' | 'info'>('info')

// Computed properties
const isValidFee = computed(() => {
  return newFee.value >= 0 && newFee.value <= 100 && !isNaN(newFee.value)
})

// Methods
const fetchCurrentFee = async () => {
  try {
    const response = await axiosInstance.get('/admin/get/fee')
    const data = response.data
    if (data.success) {
      currentFee.value = data.fee
      newFee.value = data.fee
    }
  } catch (error) {
    console.error('Failed to fetch current fee:', error)
    toast.error('Failed to load current fee setting')
  }
}

const updateFee = async () => {
  // Ensure we have a valid number value
  let feeToUpdate = newFee.value
  
  // Handle null/empty/invalid input - fallback to default fee of 5
  if (feeToUpdate === null || feeToUpdate === undefined || isNaN(feeToUpdate) || String(feeToUpdate).trim() === '') {
    feeToUpdate = 5.0
    newFee.value = 5.0
    toast.info('Input was empty or invalid, using default fee of 5%')
  }

  // Final validation before sending to API
  if (feeToUpdate < 0 || feeToUpdate > 100) {
    toast.error('Fee must be between 0% and 100%')
    return
  }

  if (feeToUpdate === currentFee.value) {
    toast.info('Fee is already set to this value')
    return
  }

  isUpdating.value = true
  message.value = ''

  try {
    const response = await axiosInstance.patch('/admin/fee', {
      fee: Number(feeToUpdate) // Ensure it's a number
    })
    const data: FeeResponse = response.data
    
    if (data.success) {
      currentFee.value = data.fee
      message.value = `Fee successfully updated to ${data.fee}%`
      messageType.value = 'success'
      toast.success(`Fee updated to ${data.fee}%`)
    } else {
      throw new Error('Failed to update fee')
    }
  } catch (error) {
    console.error('Failed to update fee:', error)
    message.value = 'Failed to update fee. Please try again.'
    messageType.value = 'error'
    toast.error('Failed to update fee')
  } finally {
    isUpdating.value = false
  }
}

const resetForm = () => {
  newFee.value = currentFee.value
  message.value = ''
}

// Lifecycle
onMounted(() => {
  fetchCurrentFee()
})
</script>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.settings-header {
  text-align: center;
  margin-bottom: 3rem;
}

.settings-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.settings-header p {
  font-size: 1.1rem;
  color: #718096;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.section-header {
  margin-bottom: 2rem;
}

.section-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.section-header p {
  color: #718096;
  font-size: 1rem;
}

.fee-form {
  max-width: 500px;
}

.current-fee-display {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.current-fee-display label {
  display: block;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.fee-value {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.fee-percentage {
  font-size: 2rem;
  font-weight: 700;
  color: #2b6cb0;
}

.fee-description {
  color: #718096;
  font-size: 1rem;
}

.fee-update-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

.form-input:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
}

.input-suffix {
  position: absolute;
  right: 1rem;
  color: #718096;
  font-weight: 500;
}

.form-help {
  display: block;
  margin-top: 0.5rem;
  color: #718096;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3182ce;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2c5aa0;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e0;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.message {
  padding: 1rem;
  border-radius: 8px;
  font-weight: 500;
}

.message.success {
  background: #f0fff4;
  color: #22543d;
  border: 1px solid #9ae6b4;
}

.message.error {
  background: #fed7d7;
  color: #742a2a;
  border: 1px solid #feb2b2;
}

.message.info {
  background: #ebf8ff;
  color: #2a4365;
  border: 1px solid #90cdf4;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.info-card {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.info-card h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.75rem;
}

.info-card p {
  color: #718096;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Responsive design */
@media (max-width: 768px) {
  .admin-settings {
    padding: 1rem;
  }
  
  .settings-section {
    padding: 1.5rem;
  }
  
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .info-cards {
    grid-template-columns: 1fr;
  }
}
</style>
