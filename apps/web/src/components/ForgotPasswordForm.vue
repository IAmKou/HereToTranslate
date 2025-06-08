<template>
  <div class="forgot-password-form">
    <h2 class="form-title">Recover Password</h2>
    
    <!-- Step 1: Email Verification -->
    <div v-if="!emailVerified" class="form-container">
      <p class="form-description">
        Enter your email address to reset your password.
      </p>
      
      <p v-if="errors.server" class="server-error">{{ errors.server }}</p>
      
      <form @submit.prevent="verifyEmail" class="form">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            id="email"
            v-model="email"
            type="email" 
            class="form-control"
            :class="{ 'input-error': errors.email }"
            placeholder="example@example.com"
            required
          />
          <p v-if="errors.email" class="error-message">{{ errors.email }}</p>
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="submit-button"
            :disabled="isVerifying"
          >
            {{ isVerifying ? 'Verifying...' : 'Continue' }}
          </button>
        </div>
        
        <div class="form-footer">
          <router-link to="/login" class="link">
            Back to login
          </router-link>
        </div>
      </form>
    </div>
    
    <!-- Step 2: Reset Password -->
    <div v-else-if="!resetSuccess" class="form-container">
      <p class="form-description">
        Enter your new password.
      </p>
      
      <p v-if="errors.server" class="server-error">{{ errors.server }}</p>
      
      <form @submit.prevent="resetPassword" class="form">
        <div class="form-group">
          <label for="newPassword">New password</label>
          <input 
            id="newPassword"
            v-model="newPassword"
            type="password" 
            class="form-control"
            :class="{ 'input-error': errors.password }"
            placeholder="Enter new password"
            required
          />
          <p v-if="errors.password" class="error-message">{{ errors.password }}</p>
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirm password</label>
          <input 
            id="confirmPassword"
            v-model="confirmPassword"
            type="password" 
            class="form-control"
            :class="{ 'input-error': errors.confirmPassword }"
            placeholder="Re-enter new password"
            required
          />
          <p v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</p>
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="submit-button"
            :disabled="isResetting"
          >
            {{ isResetting ? 'Resetting...' : 'Reset password' }}
          </button>
        </div>
      </form>
    </div>
    
    <!-- Success Message -->
    <div v-else class="success-message">
      <div class="success-icon">✓</div>
      <h3>Password has been reset!</h3>
      <p>
        Your password has been successfully reset.
      </p>
      <div class="form-actions">
        <router-link to="/login" class="submit-button" style="display: block; text-decoration: none;">
          Login
        </router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'
import { authService } from '../services/auth.service'

export default defineComponent({
  name: 'ForgotPasswordForm',
  
  setup() {
    const email = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const isVerifying = ref(false)
    const isResetting = ref(false)
    const emailVerified = ref(false)
    const resetSuccess = ref(false)
    const errors = reactive({
      email: '',
      password: '',
      confirmPassword: '',
      server: ''
    })

    const validateEmail = (): boolean => {
      errors.email = ''
      errors.server = ''
      
      if (!email.value) {
        errors.email = 'Email cannot be empty'
        return false
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.value)) {
        errors.email = 'Invalid email'
        return false
      }
      
      return true
    }
    
    const verifyEmail = async () => {
      if (!validateEmail()) return
      
      isVerifying.value = true
      errors.server = ''
      
      try {
        await authService.forgotPassword(email.value)
        emailVerified.value = true
      } catch (error: any) {
        errors.server = error.message || 'An error occurred, please try again later'
      } finally {
        isVerifying.value = false
      }
    }
    
    const validatePasswordForm = (): boolean => {
      errors.password = ''
      errors.confirmPassword = ''
      errors.server = ''
      
      if (!newPassword.value) {
        errors.password = 'New password cannot be empty'
        return false
      }
      
      if (newPassword.value.length < 8) {
        errors.password = 'Password must be at least 8 characters'
        return false
      }
      
      if (newPassword.value !== confirmPassword.value) {
        errors.confirmPassword = 'Password confirmation doesn\'t match'
        return false
      }
      
      return true
    }
    
    const resetPassword = async () => {
      if (!validatePasswordForm()) return
      
      isResetting.value = true
      errors.server = ''
      
      try {
        await authService.resetPassword(email.value, newPassword.value)
        resetSuccess.value = true
      } catch (error: any) {
        errors.server = error.message || 'An error occurred, please try again later'
      } finally {
        isResetting.value = false
      }
    }
    
    return {
      email,
      newPassword,
      confirmPassword,
      errors,
      isVerifying,
      isResetting,
      emailVerified,
      resetSuccess,
      verifyEmail,
      resetPassword
    }
  }
})
</script>

<style scoped>
.forgot-password-form {
  max-width: 450px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-title {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.5rem;
}

.form-description {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #666;
}

.form-group {
  margin-bottom: 1.5rem;
  padding-right: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-control:focus {
  border-color: #4f46e5;
  outline: none;
}

.input-error {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.submit-button {
  width: 100%;
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-button:hover {
  background-color: #4338ca;
}

.submit-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.form-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.success-message {
  text-align: center;
  padding: 1rem;
}

.success-icon {
  background-color: #10b981;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin: 0 auto 1rem;
}

.server-error {
  text-align: center;
  color: #ef4444;
  background-color: #fee2e2;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}
</style>