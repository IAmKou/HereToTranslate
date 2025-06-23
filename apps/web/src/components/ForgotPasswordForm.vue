<template>
  <div class="forgot-password-form">
    <h2 class="form-title">Reset Your Password</h2>

    <div v-if="!emailSent" class="form-container">
      <p class="form-description">
        Enter your email address to receive password reset instructions.
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
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
          <p v-if="errors.email" class="error-message">{{ errors.email }}</p>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="submit-button"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Sending...' : 'Send Request' }}
          </button>
        </div>

        <div class="form-footer">
          <router-link to="/login" class="link">
            Back to Login
          </router-link>
        </div>
      </form>
    </div>

    <div v-else class="success-message">
      <div class="success-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2l4-4"/></svg>
      </div>
      <h3>Request Sent!</h3>
      <p>
        We've sent password reset instructions to
        <strong>{{ email }}</strong>.
      </p>
      <p>
        Please check your inbox (and spam folder) to continue.
      </p>
      <button @click="resetForm" class="submit-button">
        Resend Email
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
        errors.email = 'Email is required.'
        return false
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.value)) {
        errors.email = 'Please enter a valid email address.'
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
          errors.email = 'This email is not registered in our system.'
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
  max-width: 420px;
  margin: 0 auto;
  padding: 2.5rem 2rem 2rem 2rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.10);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-title {
  text-align: center;
  margin-bottom: 0.5rem;
  color: #22223b;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.form-description {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #6c6f7d;
  font-size: 1.05rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #3a3a4a;
  font-size: 1rem;
}

.form-control {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1.5px solid #e0e0e7;
  border-radius: 6px;
  font-size: 1rem;
  background: #f8f9fa;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  color: #22223b;
}

.form-control:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px #6366f120;
  background: #fff;
}

.input-error {
  border-color: #ef4444;
  background: #fff0f0;
}

.error-message {
  color: #ef4444;
  font-size: 0.92rem;
  margin-top: 0.4rem;
  font-weight: 500;
}

.submit-button {
  width: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.85rem 1rem;
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  margin-top: 0.5rem;
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.13);
}

.submit-button:disabled {
  background: #c7d2fe;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.link {
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: color 0.2s;
}

.link:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.success-message {
  text-align: center;
  padding: 1.5rem 0.5rem 0.5rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}

.success-icon {
  background: #10b981;
  color: white;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px #10b98122;
}

.success-message h3 {
  color: #10b981;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.success-message p {
  color: #444;
  font-size: 1.05rem;
  margin-bottom: 0.2rem;
}

@media (max-width: 600px) {
  .forgot-password-form {
    padding: 1.2rem 0.5rem;
    border-radius: 8px;
  }
  .form-title {
    font-size: 1.3rem;
  }
}
</style>
