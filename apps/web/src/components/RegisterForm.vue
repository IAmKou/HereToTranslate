<template>
  <div class="register-container">
    <!-- Logo section (left) -->
    <div class="logo-section">
      <div class="logo-content">
        <img :src="logo" alt="Here To Translate Logo" class="logo-img" />
        <h1>Here To Translate</h1>
        <p class="tagline">Breaking language barriers, connecting worlds</p>
      </div>
    </div>
    <!-- Form section (right) -->
    <div class="form-section">
      <div class="register-form">
        <div class="form-header">
          <h2>Create Account</h2>
          <p class="subtitle">Join our community today</p>
        </div>
        <div
          v-if="message"
          :class="['message', messageType]"
          style="margin-bottom: 1.5rem"
        >
          <i
            :class="
              messageType === 'success'
                ? 'pi pi-check-circle'
                : 'pi pi-times-circle'
            "
          ></i>
          {{ message }}
        </div>
        <form @submit.prevent="submitForm" class="form-content">
          <div class="form-group">
            <label for="username">
              <i class="pi pi-user"></i>
              Username
            </label>
            <input
              id="username"
              v-model="form.username"
              @input="validateField('username')"
              @blur="validateField('username')"
              placeholder="Enter your username"
              :class="{ 'input-error': errors.username }"
            />
            <div v-if="errors.username" class="error-message">
              <i class="pi pi-exclamation-circle"></i>
              {{ errors.username }}
            </div>
          </div>

          <div class="form-group">
            <label for="email">
              <i class="pi pi-envelope"></i>
              Email
            </label>
            <input
              id="email"
              v-model="form.email"
              @input="validateField('email')"
              @blur="validateField('email')"
              type="email"
              placeholder="Enter your email"
              :class="{ 'input-error': errors.email }"
            />
            <div v-if="errors.email" class="error-message">
              <i class="pi pi-exclamation-circle"></i>
              {{ errors.email }}
            </div>
          </div>

          <div class="form-group">
            <label for="password">
              <i class="pi pi-lock"></i>
              Password
            </label>
            <div class="password-input">
              <input
                id="password"
                v-model="form.password"
                @input="validateField('password')"
                @blur="validateField('password')"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                :class="{ 'input-error': errors.password }"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </button>
            </div>
            <div v-if="errors.password" class="error-message">
              <i class="pi pi-exclamation-circle"></i>
              {{ errors.password }}
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">
              <i class="pi pi-lock"></i>
              Confirm Password
            </label>
            <div class="password-input">
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                @input="validateField('confirmPassword')"
                @blur="validateField('confirmPassword')"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm your password"
                :class="{ 'input-error': errors.confirmPassword }"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <i
                  :class="showConfirmPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"
                ></i>
              </button>
            </div>
            <div v-if="errors.confirmPassword" class="error-message">
              <i class="pi pi-exclamation-circle"></i>
              {{ errors.confirmPassword }}
            </div>
          </div>

          <div class="form-group">
            <label for="phone">
              <i class="pi pi-phone"></i>
              Phone Number
            </label>
            <input
              id="phone"
              v-model="form.phone"
              @input="validateField('phone')"
              @blur="validateField('phone')"
              placeholder="Enter your phone number (e.g. +84123456789)"
              :class="{ 'input-error': errors.phone }"
            />
            <div v-if="errors.phone" class="error-message">
              <i class="pi pi-exclamation-circle"></i>
              {{ errors.phone }}
            </div>
          </div>

          <div class="form-group">
            <label for="fullName">
              <i class="pi pi-id-card"></i>
              Full Name
            </label>
            <input
              id="fullName"
              v-model="form.fullName"
              @input="validateField('fullName')"
              @blur="validateField('fullName')"
              placeholder="Enter your full name"
              :class="{ 'input-error': errors.fullName }"
            />
            <div v-if="errors.fullName" class="error-message">
              <i class="pi pi-exclamation-circle"></i>
              {{ errors.fullName }}
            </div>
          </div>

          <button type="submit" class="submit-button" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="loading-spinner"></span>
            <i v-else class="pi pi-user-plus"></i>
            {{ isSubmitting ? 'Creating Account...' : 'Create Account' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import logo from '../assets/logo.png';

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  fullName: '',
  roleId: 3,
});

const message = ref('');
const messageType = ref('success');
const errors = reactive({});
const isSubmitting = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const router = useRouter();

const validateForm = () => {
  // Clear all previous errors
  Object.keys(errors).forEach((key) => (errors[key] = ''));
  let valid = true;

  // Username validation
  if (!form.username.trim()) {
    errors.username = 'Username is required';
    valid = false;
  } else if (form.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
    valid = false;
  }

  // Email validation
  if (!form.email.trim()) {
    errors.email = 'Email is required';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address';
    valid = false;
  }

  // Password validation
  if (!form.password) {
    errors.password = 'Password is required';
    valid = false;
  } else {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(form.password)) {
      errors.password =
        'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character';
      valid = false;
    }
  }

  // Confirm password validation
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
    valid = false;
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
    valid = false;
  }

  // Phone validation
  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required';
    valid = false;
  } else {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(form.phone)) {
      errors.phone =
        'Phone number must be a valid international format, e.g. +84123456789';
      valid = false;
    }
  }

  // Full name validation
  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required';
    valid = false;
  }

  return valid;
};

// Add real-time validation
const validateField = (field) => {
  switch (field) {
    case 'username':
      if (!form.username.trim()) {
        errors.username = 'Username is required';
      } else if (form.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else {
        errors.username = '';
      }
      break;
    case 'email':
      if (!form.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'Please enter a valid email address';
      } else {
        errors.email = '';
      }
      break;
    case 'password':
      if (!form.password) {
        errors.password = 'Password is required';
      } else {
        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(form.password)) {
          errors.password =
            'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character';
        } else {
          errors.password = '';
        }
      }
      break;
    case 'confirmPassword':
      if (!form.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      } else {
        errors.confirmPassword = '';
      }
      break;
    case 'phone':
      if (!form.phone.trim()) {
        errors.phone = 'Phone number is required';
      } else {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(form.phone)) {
          errors.phone =
            'Phone number must be a valid international format, e.g. +84123456789';
        } else {
          errors.phone = '';
        }
      }
      break;
    case 'fullName':
      if (!form.fullName.trim()) {
        errors.fullName = 'Full name is required';
      } else {
        errors.fullName = '';
      }
      break;
  }
};

const submitForm = async () => {
  if (!validateForm()) return;
  isSubmitting.value = true;
  const payload = {
    username: form.username,
    email: form.email,
    password: form.password,
    phone: form.phone,
    fullName: form.fullName,
    roleId: form.roleId,
  };
  try {
    await axios.post('${import.meta.env.VITE_API_URL}/users/register', payload);
    message.value = 'Register sucess! You will be redirected to login page.';
    messageType.value = 'success';
    Object.assign(form, {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      fullName: '',
    });
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  } catch (err) {
    message.value =
      err.response?.data?.message || 'Register failed. Please try again.';
    messageType.value = 'error';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  background: #f5f7fa;
}

.logo-section {
  width: 50%;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-content {
  text-align: center;
  max-width: 400px;
}

.logo-img {
  width: 220px;
  height: 220px;
  object-fit: contain;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  padding: 2rem;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

.logo-content h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.tagline {
  font-size: 1.2rem;
  opacity: 0.9;
}

.form-section {
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  padding: 2rem 0;
}

.register-form {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.form-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
}

label i {
  color: #4caf50;
}

input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e1e1e1;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #f8f9fa;
}

input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  background-color: white;
}

.input-error {
  border-color: #dc3545 !important;
  background-color: #fff8f8 !important;
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2) !important;
}

.password-input {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.toggle-password:hover {
  background-color: #f0f0f0;
  color: #4caf50;
}

.submit-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
}

.submit-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: fadeIn 0.3s ease-in-out;
}

.error-message i {
  font-size: 1rem;
}

.message {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.message i {
  font-size: 1.25rem;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .register-container {
    flex-direction: column;
  }
  .logo-section,
  .form-section {
    width: 100%;
  }
  .logo-img {
    width: 150px;
    height: 150px;
    padding: 1rem;
  }
}

@media (max-width: 640px) {
  .logo-section {
    padding: 2rem 1rem;
  }
  .logo-img {
    width: 100px;
    height: 100px;
    margin-bottom: 1.5rem;
    padding: 0.5rem;
  }
  .logo-content h1 {
    font-size: 1.5rem;
  }
  .tagline {
    font-size: 1rem;
  }
  .register-form {
    padding: 1.5rem;
  }
}
</style>
