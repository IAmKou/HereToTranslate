<template>
  <div class="forgot-password-view">
    <div class="view-container">
      <div class="logo-container">
        <!-- <img src="/assets/logo.png" alt="Logo" class="logo" /> -->
      </div>

      <ForgotPasswordForm />

      <div class="additional-help">
        <h3>Need more help?</h3>
        <p>If you're still having trouble resetting your password, please contact our support team at <a href="mailto:support@example.com">support@example.com</a></p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import ForgotPasswordForm from '../components/ForgotPasswordForm.vue'

export default defineComponent({
  name: 'ForgotPasswordView',
  components: {
    ForgotPasswordForm
  }
})
</script>

<style scoped>
.forgot-password-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb;
  padding: 2rem 1rem;
}

.view-container {
  width: 100%;
  max-width: 500px;
}

.logo-container {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  height: 50px;
}

.additional-help {
  margin-top: 3rem;
  text-align: center;
  padding: 1.5rem;
  background-color: #f3f4f6;
  border-radius: 8px;
}

.additional-help h3 {
  margin-bottom: 0.75rem;
  color: #333;
}

.additional-help p {
  color: #666;
  font-size: 0.875rem;
}

.additional-help a {
  color: #4f46e5;
  text-decoration: none;
}

.additional-help a:hover {
  text-decoration: underline;
}
</style>
