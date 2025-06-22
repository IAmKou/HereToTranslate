<template>
  <div class="forgot-password-container">
    <Card class="forgot-password-card">
      <template #title>
        <h2>Reset Password</h2>
      </template>
      <template #content>
        <!-- STEP 1: Enter email -->
        <div v-if="!codeSent">
          <div class="form-group">
            <label for="email">Email</label>
            <InputText id="email" v-model="email" placeholder="Enter your email" class="input" />
          </div>
          <Button label="Send Reset Code" @click="sendCode" class="action-btn" />
        </div>

        <!-- STEP 2: Enter verification code -->
        <div v-else-if="!codeVerified">
          <div class="form-group">
            <label for="code">Verification Code</label>
            <InputText id="code" v-model="code" placeholder="Enter the code from email" class="input" />
          </div>
          <Button label="Verify Code" @click="verifyCode" class="action-btn" />
        </div>

        <!-- STEP 3: Enter new password & confirm -->
        <div v-else>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <InputText id="newPassword" v-model="newPassword" type="password" placeholder="New Password" class="input" />
          </div>
          <div class="form-group">
            <label for="confirmPassword">Re-Enter New Password</label>
            <InputText id="confirmPassword" v-model="confirmPassword" type="password" placeholder="Re-Enter New Password" class="input" />
          </div>
          <Button :disabled="!isPasswordValid" label="Reset Password" @click="resetPassword" class="action-btn" />
          <p v-if="newPassword && confirmPassword && !isPasswordValid" class="error-message">
            Passwords do not match
          </p>
        </div>
      </template>
    </Card>
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'primevue/usetoast';

const baseUrl = 'http://localhost:3000/api'
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const codeSent = ref(false)
const codeVerified = ref(false)

const toast = useToast();

const isPasswordValid = computed(() => {
  return newPassword.value && confirmPassword.value && newPassword.value === confirmPassword.value
})

async function sendCode() {
  try {
    await axios.post(`${baseUrl}/auth/forgot-password`, { email: email.value })
    codeSent.value = true
    toast.add({ severity: 'success', summary: 'Success', detail: 'Code sent to your email', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Error sending reset code', life: 3000 })
  }
}

async function verifyCode() {
  try {
    await axios.post(`${baseUrl}/auth/verify-code`, {
      email: email.value,
      code: code.value,
    })
    codeVerified.value = true
    toast.add({ severity: 'success', summary: 'Verified', detail: 'Code verified! Now set a new password.', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Invalid or expired code', life: 3000 })
  }
}

async function resetPassword() {
  if (!isPasswordValid.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Passwords do not match', life: 3000 })
    return
  }
  try {
    await axios.post(`${baseUrl}/auth/reset-password`, {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value,
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Password reset successful!', life: 3000 })
    this.$router.push('/login')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Failed to reset password', life: 3000 })
  }
}
</script>

<style scoped lang="scss">
.forgot-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.forgot-password-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem 1.5rem;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  border-radius: 12px;
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
}

.input {
  margin-top: 0.5rem;
}

.action-btn {
  width: 100%;
  margin-top: 0.5rem;
}

.error-message {
  color: #e53935;
  margin-top: 0.5rem;
  font-size: 0.95rem;
  text-align: center;
}
</style>
