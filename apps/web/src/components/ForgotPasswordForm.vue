<template>
  <div class="forgot-password-form">
    <h2 class="form-title">Khôi phục mật khẩu</h2>
    
    <div v-if="!emailSent" class="form-container">
      <p class="form-description">
        Nhập địa chỉ email của bạn để nhận hướng dẫn đặt lại mật khẩu.
      </p>
      
      <form @submit.prevent="submitForm" class="form">
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
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu' }}
          </button>
        </div>
        
        <div class="form-footer">
          <router-link to="/login" class="link">
            Quay lại đăng nhập
          </router-link>
        </div>
      </form>
    </div>
    
    <div v-else class="success-message">
      <div class="success-icon">✓</div>
      <h3>Yêu cầu đã được gửi!</h3>
      <p>
        Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu đến 
        <strong>{{ email }}</strong>.
      </p>
      <p>
        Vui lòng kiểm tra hộp thư (và thư mục spam) để tiếp tục.
      </p>
      <button @click="resetForm" class="submit-button">
        Gửi lại email
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'

export default defineComponent({
  name: 'ForgotPasswordForm',
  
  setup() {
    const email = ref('')
    const isSubmitting = ref(false)
    const emailSent = ref(false)
    const errors = reactive({
      email: ''
    })

    const validateEmail = (): boolean => {
      errors.email = ''
      
      if (!email.value) {
        errors.email = 'Email không được để trống'
        return false
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.value)) {
        errors.email = 'Email không hợp lệ'
        return false
      }
      
      return true
    }
    
    const submitForm = async () => {
      if (!validateEmail()) return
      
      isSubmitting.value = true
      
      // Simulate API call
      setTimeout(() => {
        // Mock validation - reject non-existent email
        if (email.value === 'nonexistent@example.com') {
          errors.email = 'Email này chưa được đăng ký trong hệ thống'
          isSubmitting.value = false
          return
        }
        
        // For all other emails, simulate success
        emailSent.value = true
        isSubmitting.value = false
      }, 1500) // Simulate network delay
    }
    
    const resetForm = () => {
      emailSent.value = false
      email.value = ''
      errors.email = ''
    }
    
    return {
      email,
      errors,
      isSubmitting,
      emailSent,
      submitForm,
      resetForm
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
</style>