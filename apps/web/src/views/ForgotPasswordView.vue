<template>
  <div class="forgot-password-container">
    <div class="logo-container">
      <img src="/src/assets/logo.png" alt="Logo" class="logo" />
    </div>
    <transition name="fade-step" mode="out-in">
      <Card class="forgot-password-card" :key="step">
        <template #title>
          <h2 class="main-title">Forgot Password</h2>
          <div class="step-indicator">
            <div class="step-progress">
              <div class="progress-bar" :style="{ width: `${(step - 1) * 50}%` }"></div>
            </div>
            <div class="step-items">
              <div class="step-item" :class="{ active: step === 1 }">
                <span class="step-icon"><i class="pi pi-envelope"></i></span>
                <div class="step-label">Email</div>
              </div>
              <div class="step-connector" />
              <div class="step-item" :class="{ active: step === 2 }">
                <span class="step-icon"><i class="pi pi-key"></i></span>
                <div class="step-label">Verification</div>
              </div>
              <div class="step-connector" />
              <div class="step-item" :class="{ active: step === 3 }">
                <span class="step-icon"><i class="pi pi-lock"></i></span>
                <div class="step-label">Password</div>
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <!-- STEP 1: Enter email -->
          <div v-if="step === 1" class="step-content">
            <div class="section-title"><i class="pi pi-envelope"></i> Enter your email</div>
            <div class="form-group floating-label-group">
              <InputText id="email" v-model="email" class="input" :class="{'input-error': emailTouched && !isEmailValid}" @blur="emailTouched = true" ref="emailInput" autofocus aria-label="Email" />
              <label for="email" :class="{ floated: email }">Email</label>
              <span class="input-icon"><i class="pi pi-envelope"></i></span>
            </div>
            <p v-if="emailTouched && !isEmailValid" class="error-message">
              <i class="pi pi-times-circle"></i> Invalid email address
            </p>
            <button :disabled="loading || !isEmailValid" @click="sendCode" class="action-btn primary-btn">
              <span v-if="loading" class="spinner"><i class="pi pi-spin pi-spinner"></i></span>
              <span v-else>Send Verification Code</span>
            </button>
          </div>

          <!-- STEP 2: Enter verification code -->
          <div v-else-if="step === 2" class="step-content">
            <div class="section-title"><i class="pi pi-key"></i> Enter verification code</div>
            <div class="form-group floating-label-group">
              <InputText id="code" v-model="code" class="input" :class="{'input-error': codeTouched && !isCodeValid}" @blur="codeTouched = true" ref="codeInput" autofocus aria-label="Verification code" />
              <label for="code" :class="{ floated: code }">Verification Code</label>
              <span class="input-icon"><i class="pi pi-key"></i></span>
            </div>
            <p v-if="codeTouched && !isCodeValid" class="error-message">
              <i class="pi pi-times-circle"></i> Code cannot be empty
            </p>
            <button :disabled="loading || !isCodeValid" @click="verifyCode" class="action-btn primary-btn">
              <span v-if="loading" class="spinner"><i class="pi pi-spin pi-spinner"></i></span>
              <span v-else>Verify Code</span>
            </button>
            <button :disabled="loading || countdown > 0" @click="resendCode" class="action-btn link-btn">
              <span v-if="countdown > 0">Resend code ({{ countdown }}s)</span>
              <span v-else>Resend code</span>
            </button>
            <button class="action-btn back-btn" @click="goBack(1)" :disabled="loading"><i class="pi pi-arrow-left"></i> Back</button>
          </div>

          <!-- STEP 3: Enter new password & confirm -->
          <div v-else class="step-content">
            <div class="section-title"><i class="pi pi-lock"></i> Reset your password</div>
            <div class="form-group password-group floating-label-group">
              <InputText id="newPassword" v-model="newPassword" :type="showPassword ? 'text' : 'password'" class="input" :class="{'input-error': passwordTouched && !isNewPasswordValid}" @blur="passwordTouched = true" ref="newPasswordInput" autofocus aria-label="New password" />
              <label for="newPassword" :class="{ floated: newPassword }">New Password</label>
              <span class="input-icon"><i class="pi pi-lock"></i></span>
              <span class="toggle-password" @click="showPassword = !showPassword">
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </span>
            </div>
            <div class="form-group password-group floating-label-group">
              <InputText id="confirmPassword" v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" class="input" :class="{'input-error': confirmTouched && !isPasswordValid}" @blur="confirmTouched = true" aria-label="Confirm new password" />
              <label for="confirmPassword" :class="{ floated: confirmPassword }">Confirm Password</label>
              <span class="input-icon"><i class="pi pi-lock"></i></span>
            </div>
            <p v-if="passwordTouched && !isNewPasswordValid" class="error-message">
              <i class="pi pi-times-circle"></i> Password must be at least 8 characters and include uppercase, lowercase, number, and special character
            </p>
            <p v-if="confirmTouched && !isPasswordValid" class="error-message">
              <i class="pi pi-times-circle"></i> Passwords do not match
            </p>
            <button :disabled="!isPasswordValid || !isNewPasswordValid || loading" @click="resetPassword" class="action-btn primary-btn">
              <span v-if="loading" class="spinner"><i class="pi pi-spin pi-spinner"></i></span>
              <span v-else>Reset Password</span>
            </button>
            <button class="action-btn back-btn" @click="goBack(2)" :disabled="loading"><i class="pi pi-arrow-left"></i> Back</button>
          </div>
        </template>
      </Card>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import axiosInstance from '../utils/axios'
import { useToast } from 'primevue/usetoast';

const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const step = ref(1)
const loading = ref(false)
const countdown = ref(0)
const showPassword = ref(false)

const toast = useToast();

const emailTouched = ref(false)
const codeTouched = ref(false)
const passwordTouched = ref(false)
const confirmTouched = ref(false)

const emailInput = ref(null)
const codeInput = ref(null)
const newPasswordInput = ref(null)

const isEmailValid = computed(() => {
  // Simple email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})
const isCodeValid = computed(() => code.value.trim().length > 0)
const isNewPasswordValid = computed(() => {
  const pwd = newPassword.value
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd)
})
const isPasswordValid = computed(() => newPassword.value && confirmPassword.value && newPassword.value === confirmPassword.value)

watch(step, async (val) => {
  await nextTick()
  if (val === 1 && emailInput.value) emailInput.value.$el.querySelector('input')?.focus()
  if (val === 2 && codeInput.value) codeInput.value.$el.querySelector('input')?.focus()
  if (val === 3 && newPasswordInput.value) newPasswordInput.value.$el.querySelector('input')?.focus()
})

let timer = null

function startCountdown() {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(timer)
    }
  }, 1000)
}

async function sendCode() {
  emailTouched.value = true
  if (!isEmailValid.value) return
  loading.value = true
  try {
    await axiosInstance.post('/auth/forgot-password', { email: email.value })
    step.value = 2
    code.value = ''
    codeTouched.value = false
    startCountdown()
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Verification code has been sent to your email',
      life: 3000
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.response?.data?.message || 'Failed to send verification code',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

async function resendCode() {
  await sendCode()
}

async function verifyCode() {
  codeTouched.value = true
  if (!isCodeValid.value) return
  loading.value = true
  try {
    await axiosInstance.post('/auth/verify-code', {
      email: email.value,
      code: code.value,
    })
    step.value = 3
    newPassword.value = ''
    confirmPassword.value = ''
    passwordTouched.value = false
    confirmTouched.value = false
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Verification successful! Please set a new password.',
      life: 3000
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.response?.data?.message || 'Invalid or expired verification code',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

async function resetPassword() {
  passwordTouched.value = true
  confirmTouched.value = true
  if (!isNewPasswordValid.value || !isPasswordValid.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Invalid password', life: 3000 })
    return
  }
  loading.value = true
  try {
    await axiosInstance.post('/auth/reset-password', {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value,
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Password reset successfully!', life: 3000 })
    setTimeout(() => {
      window.location.href = '/login'
    }, 3000)
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.response?.data?.message || 'Failed to reset password',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

function goBack(targetStep) {
  if (targetStep === 1) {
    step.value = 1
    code.value = ''
    codeTouched.value = false
  } else if (targetStep === 2) {
    step.value = 2
    newPassword.value = ''
    confirmPassword.value = ''
    passwordTouched.value = false
    confirmTouched.value = false
  }
}
</script>

<style scoped lang="scss">
.forgot-password-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e3f0ff 0%, #f5f7fa 100%);
  position: relative;
}

.logo-container {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

.logo {
  width: 250px;
  height: 250px;
  border-radius: 16px;
  box-shadow: 0 2px 12px #1976d23a;
  background: #fff;
  padding: 0.5rem;
}

.forgot-password-card {
  width: 100%;
  max-width: 440px;
  padding: 3rem 2.2rem 2.2rem 2.2rem;
  box-shadow: 0 8px 40px rgba(25, 118, 210, 0.16);
  border-radius: 22px;
  background: #fff;
  transition: box-shadow 0.2s;
  border: 1.5px solid #e3eafc;
}

.forgot-password-card:hover {
  box-shadow: 0 16px 48px rgba(25, 118, 210, 0.18);
}

.main-title {
  text-align: center;
  font-size: 2.1rem;
  font-weight: 800;
  color: #1976d2;
  margin-bottom: 0.5rem;
}

.step-indicator {
  margin-bottom: 1.7rem;
}

.step-progress {
  width: 100%;
  height: 4px;
  background: #e3eafc;
  border-radius: 2px;
  margin-bottom: 0.7rem;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #1976d2 60%, #42a5f5 100%);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-items {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.5rem;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 60px;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e3eafc;
  color: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  box-shadow: 0 2px 8px #1976d23a;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}

.step-item.active .step-icon {
  background: linear-gradient(135deg, #1976d2 60%, #42a5f5 100%);
  color: #fff;
  transform: scale(1.1);
  box-shadow: 0 4px 16px #1976d23a;
}

.step-label {
  font-size: 0.9rem;
  color: #b0b8c1;
  margin-top: 0.1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.step-item.active .step-label {
  color: #1976d2;
}

.step-connector {
  width: 32px;
  height: 2px;
  background: #e3eafc;
  border-radius: 1px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-group {
  margin-bottom: 1.3rem;
  display: flex;
  flex-direction: column;
  position: relative;
}

.floating-label-group {
  position: relative;
  margin-bottom: 1.7rem;
}

.floating-label-group label {
  position: absolute;
  left: 2.5rem;
  top: 1.2rem;
  color: #b0b8c1;
  font-size: 1.05rem;
  pointer-events: none;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
  padding: 0 0.2rem;
  z-index: 3;
}

.floating-label-group label.floated,
.floating-label-group input:focus + label {
  top: -0.7rem;
  left: 2.2rem;
  font-size: 0.85rem;
  color: #1976d2;
  background: #fff;
  padding: 0 0.3rem;
  border-radius: 4px;
  box-shadow: 0 1px 4px #1976d21a;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #b0b8c1;
  font-size: 1.15rem;
  z-index: 2;
}

.input {
  margin-top: 0.5rem;
  font-size: 1.08rem;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 10px;
  border: 1.5px solid #cfd8dc;
  transition: border 0.2s, box-shadow 0.2s;
  background: #f7fafd;
  box-shadow: 0 1px 4px #1976d21a;
}

.input:focus {
  border: 1.5px solid #1976d2;
  background: #fff;
  box-shadow: 0 2px 8px #1976d23a;
}

.input-error {
  border: 1.5px solid #e53935 !important;
  background: #fff0f0;
}

.password-group {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #b0b8c1;
  font-size: 1.15rem;
  z-index: 2;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: #1976d2;
}

.action-btn {
  width: 100%;
  margin-top: 0.2rem;
  font-size: 1.12rem;
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  min-height: 48px;
  box-shadow: 0 1px 4px #1976d21a;
}

.primary-btn {
  background: linear-gradient(135deg, #1976d2 60%, #42a5f5 100%);
  border: none;
  color: #fff;
  box-shadow: 0 2px 8px #1976d23a;
}

.primary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1256a3 60%, #1976d2 100%);
  box-shadow: 0 4px 16px #1976d23a;
}

.link-btn {
  background: none;
  color: #1976d2;
  border: none;
  margin-top: 0.5rem;
  text-decoration: underline;
  font-size: 1rem;
}

.link-btn:disabled {
  color: #b0b8c1;
}

.back-btn {
  background: none;
  color: #1976d2;
  border: 1.5px solid #e3eafc;
  margin-top: 0.7rem;
  font-size: 1rem;
  transition: border 0.2s, color 0.2s;
}

.back-btn:hover:not(:disabled) {
  color: #1256a3;
  border: 1.5px solid #1976d2;
}

.spinner {
  display: flex;
  align-items: center;
  font-size: 1.2em;
}

.error-message {
  color: #e53935;
  margin-top: 0.7rem;
  font-size: 1rem;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
  background: #fff0f0;
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  box-shadow: 0 1px 4px #e5393522;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.fade-step-enter-active, .fade-step-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-step-enter-from, .fade-step-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.step-content {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
