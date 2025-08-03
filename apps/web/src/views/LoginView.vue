<template>
  <div class="login-container">
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
      <div class="login-form">
        <div class="form-header">
          <h2>Welcome Back</h2>
          <p class="subtitle">Log in to your account</p>
        </div>
        <form @submit.prevent="login" class="form-content">
          <div class="form-group">
            <label for="username">
              <i class="pi pi-user"></i>
              Username
            </label>
            <input
              id="username"
              v-model="username"
              @blur="validateUsername"
              @input="clearUsernameError"
              placeholder="Enter your username"
              :class="{ 'error-input': usernameError }"
              required
            />
            <div v-if="usernameError" class="field-error">
              <i class="pi pi-exclamation-circle"></i>
              {{ usernameError }}
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
                v-model="password"
                @blur="validatePassword"
                @input="clearPasswordError"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                :class="{ 'error-input': passwordError }"
                required
              />
              <button
                type="button"
                class="toggle-password"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </button>
            </div>
            <div v-if="passwordError" class="field-error">
              <i class="pi pi-exclamation-circle"></i>
              {{ passwordError }}
            </div>
            <div style="text-align: right; margin-top: 0.25rem">
              <router-link
                to="/forgot-password"
                style="
                  font-size: 0.95em;
                  color: #4caf50;
                  text-decoration: underline;
                "
              >Forgot Password?</router-link
              >
            </div>
          </div>

          <div v-if="error" class="error-message" style="display: block !important; margin-bottom: 1rem; opacity: 1 !important;">
            <i class="pi pi-exclamation-circle"></i>
            <strong>{{ error }}</strong>
          </div>

          <button type="submit" class="submit-button" :disabled="isSubmitting || hasValidationErrors">
            <span v-if="isSubmitting" class="loading-spinner"></span>
            <i v-else class="pi pi-sign-in"></i>
            {{ isSubmitting ? 'Signing in...' : 'Log In' }}
          </button>

          <div class="divider">
            <span>or</span>
          </div>
          <div class="register-section">
            <p>Don't have an account?</p>
            <button type="button" class="register-button" @click="goToRegister">
              <i class="pi pi-user-plus"></i>
              Register Now
            </button>
          </div>
        </form>
        <div class="google-signin">
          <button @click="signInWithGoogleRedirect" class="submit-button">
            <i class="pi pi-google"></i>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import logo from '../assets/logo.png';

const username = ref('');
const password = ref('');
const error = ref('');
const isSubmitting = ref(false);
const showPassword = ref(false);
const usernameError = ref('');
const passwordError = ref('');
const router = useRouter();

// Computed property to check if there are any validation errors
const hasValidationErrors = computed(() => {
  return !!(usernameError.value || passwordError.value);
});

// Validation functions
const validateUsername = () => {
  if (!username.value.trim()) {
    usernameError.value = 'Username is required';
    return false;
  }
  // Remove minimum length requirement for username
  usernameError.value = '';
  return true;
};

const validatePassword = () => {
  if (!password.value) {
    passwordError.value = 'Password is required';
    return false;
  }
  // Remove minimum length requirement for password
  passwordError.value = '';
  return true;
};

// Clear error functions
const clearUsernameError = () => {
  if (usernameError.value) {
    usernameError.value = '';
  }
  // Also clear general error when user starts typing
  if (error.value) {
    error.value = '';
  }
};

const clearPasswordError = () => {
  if (passwordError.value) {
    passwordError.value = '';
  }
  // Also clear general error when user starts typing
  if (error.value) {
    error.value = '';
  }
};

const login = async () => {
  // Clear previous errors but keep them visible for a moment
  error.value = '';
  console.log('Starting login process...');

  // Force Vue to update the DOM
  await nextTick();

  // Validate all fields
  const isUsernameValid = validateUsername();
  const isPasswordValid = validatePassword();

  if (!isUsernameValid || !isPasswordValid) {
    console.log('Validation failed, not proceeding with login');
    return; // Don't proceed if validation fails
  }

  try {
    isSubmitting.value = true;

    const response = await authService.login({
      username: username.value.trim(),
      password: password.value,
    });

    const user = authService.getUser();
    console.log('Login successful, user role:', user?.role);

    // Only redirect if login was successful and we have a user
    if (user && user.id) {
      if (user?.role?.id === 1) {
        await router.push('/adminhome');
      } else if (user?.role?.id === 2) {
        await router.push('/adminhome');
      } else {
        await router.push('/userhome');
      }
    } else {
      // If no user after login, something went wrong
      error.value = 'Login failed. Please try again.';
    }

  } catch (err) {
    console.error('Login error:', err);

    // Ensure user is cleared on login failure (auth service already does this)
    authService.clearAuthData();

    // Handle different types of errors
    if (err.response) {
      // Server responded with error status
      const errorMessage = err.response.data?.message || err.response.data?.error || 'Invalid username or password';
      error.value = errorMessage;
      console.log('Setting error message:', errorMessage);
    } else if (err.request) {
      // Network error
      error.value = 'Network error. Please check your connection and try again.';
      console.log('Setting network error message');
    } else {
      // Other errors
      error.value = err.message || 'Login failed. Please check your credentials and try again.';
      console.log('Setting generic error message:', error.value);
    }

    // Ensure we stay on the login page by preventing any navigation
    console.log('Login failed, staying on login page to show error');
  } finally {
    isSubmitting.value = false;
  }
};

const goToRegister = () => {
  router.push('/register');
};

const signInWithGoogleRedirect = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '580928535531-od62udfr22bcl2r6d49ev4esoeh880mf.apps.googleusercontent.com';

  // Use current window origin to support both localhost and network IP
  const redirectUri = `${window.location.origin}/oauth-callback`;

  console.log('🔍 Google OAuth - Client ID:', clientId);
  console.log('🔍 Google OAuth - Redirect URI:', redirectUri);
  console.log('🔍 Google OAuth - Window origin:', window.location.origin);

  const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token id_token&scope=openid%20email%20profile&nonce=secure_nonce`;

  console.log('🔍 Google OAuth - Full URL:', googleOAuthUrl);

  window.location.href = googleOAuthUrl;
};
</script>

<style scoped>
.login-container {
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

.login-form {
  width: 100%;
  max-width: 400px;
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

input.error-input {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2);
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

.submit-button:hover:not(:disabled) {
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
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: fadeIn 0.3s ease-in-out;
  padding: 0.75rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

.error-message i {
  font-size: 1rem;
}

.field-error {
  color: #dc3545;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  animation: fadeIn 0.3s ease-in-out;
}

.field-error i {
  font-size: 0.9rem;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e1e1e1;
}

.divider span {
  padding: 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.google-signin {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
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

.register-section {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e1e1e1;
}

.register-section p {
  color: #666;
  margin-bottom: 0.75rem;
}

.register-button {
  background: white;
  color: #4caf50;
  border: 2px solid #4caf50;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
}

.register-button:hover {
  background: #4caf50;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(76, 175, 80, 0.2);
}

.register-button i {
  font-size: 1.1rem;
}

@media (max-width: 1024px) {
  .login-container {
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
  .login-form {
    padding: 1.5rem;
  }
}
</style>
