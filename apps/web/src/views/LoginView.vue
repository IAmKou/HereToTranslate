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
              placeholder="Enter your username"
              required
            />
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
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
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
          </div>

          <div v-if="error" class="error-message">
            <i class="pi pi-exclamation-circle"></i>
            {{ error }}
          </div>

          <button type="submit" class="submit-button" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="loading-spinner"></span>
            <i v-else class="pi pi-sign-in"></i>
            {{ isSubmitting ? 'Signing in...' : 'Log In' }}
          </button>

          <div class="divider">
            <span>or</span>
          </div>

          <div class="google-signin">
            <div id="g_id_onload"></div>
            <div id="g_id_signin"></div>
          </div>

          <div class="register-section">
            <p>Don't have an account?</p>
            <button type="button" class="register-button" @click="goToRegister">
              <i class="pi pi-user-plus"></i>
              Register Now
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import logo from '../assets/logo.png';

const username = ref('');
const password = ref('');
const error = ref('');
const isSubmitting = ref(false);
const showPassword = ref(false);
const router = useRouter();

const login = async () => {
  try {
    isSubmitting.value = true;
    error.value = '';
    await authService.login({
      username: username.value,
      password: password.value,
    });

    const user = authService.getUser();
    if (user?.role === 'admin') {
      await router.push('/adminhome');
    } else {
      await router.push('/userhome');
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Login failed.';
  } finally {
    isSubmitting.value = false;
  }
};

const goToRegister = () => {
  router.push('/register');
};

onMounted(() => {
  // Load Google Sign-In script
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = () => {
    // Initialize Google Sign-In after script loads
    window.google.accounts.id.initialize({
      client_id: '580928535531-od62udfr22bcl2r6d49ev4esoeh880mf.apps.googleusercontent.com',
      callback: handleGoogleSignIn
    });
    window.google.accounts.id.renderButton(
      document.getElementById('g_id_signin'),
      {
        type: 'standard',
        size: 'large',
        theme: 'outline',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      }
    );
  };
  document.head.appendChild(script);
});

const handleGoogleSignIn = async (response) => {
  try {
    isSubmitting.value = true;
    error.value = '';
    await authService.loginWithGoogle(response.credential);

    const user = authService.getUser();
    if (user?.role === 'admin') {
      await router.push('/adminhome');
    } else {
      await router.push('/userhome');
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Google sign-in failed.';
  } finally {
    isSubmitting.value = false;
  }
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
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
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
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  padding: 2rem;
  box-shadow: 0 8px 32px 0 rgba(31,38,135,0.15);
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
  color: #4CAF50;
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
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  background-color: white;
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
  color: #4CAF50;
}

.submit-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
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
  color: #4CAF50;
  border: 2px solid #4CAF50;
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
  background: #4CAF50;
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
  .logo-section, .form-section {
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
