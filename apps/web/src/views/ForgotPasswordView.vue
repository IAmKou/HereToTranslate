<template>
  <div>
    <h2>Reset Password</h2>

    <!-- STEP 1: Enter email -->
    <div v-if="!codeSent">
      <input v-model="email" placeholder="Enter your email" />
      <button @click="sendCode">Send Reset Code</button>
    </div>

    <!-- STEP 2: Enter verification code -->
    <div v-else-if="!codeVerified">
      <input v-model="code" placeholder="Enter the code from email" />
      <button @click="verifyCode">Verify Code</button>
    </div>

    <!-- STEP 3: Enter new password & confirm -->
    <div v-else>
      <input v-model="newPassword" type="password" placeholder="New Password" />
      <input v-model="confirmPassword" type="password" placeholder="Re-Enter New Password" />
      <button :disabled="!isPasswordValid" @click="resetPassword">Reset Password</button>
      <p v-if="newPassword && confirmPassword && !isPasswordValid" style="color: red;">
        Passwords do not match
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const baseUrl = 'http://localhost:3000/api'
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const codeSent = ref(false)
const codeVerified = ref(false)

const isPasswordValid = computed(() => {
  return newPassword.value && confirmPassword.value && newPassword.value === confirmPassword.value
})

async function sendCode() {
  try {
    await axios.post(`${baseUrl}/auth/forgot-password`, { email: email.value })
    codeSent.value = true
    alert('Code sent to your email')
  } catch (e) {
    alert(e.response?.data?.message || 'Error sending reset code')
  }
}

async function verifyCode() {
  try {
    await axios.post(`${baseUrl}/auth/verify-code`, {
      email: email.value,
      code: code.value,
    })
    codeVerified.value = true
    alert('Code verified! Now set a new password.')
  } catch (e) {
    alert(e.response?.data?.message || 'Invalid or expired code')
  }
}

async function resetPassword() {
  if (!isPasswordValid.value) {
    alert('Passwords do not match')
    return
  }
  try {
    await axios.post(`${baseUrl}/auth/reset-password`, {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value,
    })
    alert('Password reset successful!')
    // Optionally redirect to login page
  } catch (e) {
    alert(e.response?.data?.message || 'Failed to reset password')
  }
}
</script>
