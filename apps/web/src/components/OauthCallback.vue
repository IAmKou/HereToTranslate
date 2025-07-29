<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';

// IMMEDIATE TEST - This should execute as soon as component loads
console.log('🚀 OAuth Callback component loaded!');

// Catch any JavaScript errors
window.addEventListener('error', (event) => {
  console.error('❌ JavaScript Error in OAuth Callback:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled Promise Rejection in OAuth Callback:', event.reason);
});

const router = useRouter();
const loading = ref(true);
const error = ref('');

const goToLogin = () => {
  console.log('🔄 Redirecting to login...');
  router.push('/login');
};

onMounted(async () => {
  console.log('🚀 OAuth Callback onMounted started!');

  try {
    console.log('🔍 OAuth Callback - Full URL:', window.location.href);
    console.log('🔍 OAuth Callback - Hash:', window.location.hash);
    console.log('🔍 OAuth Callback - Search:', window.location.search);

    // Basic check if this is actually the OAuth callback
    if (!window.location.pathname.includes('oauth-callback')) {
      throw new Error('Not on OAuth callback route');
    }

    const hash = window.location.hash.substring(1);
    console.log('🔍 OAuth Callback - Raw hash:', hash);

    if (!hash) {
      throw new Error('No hash fragment in URL - Google OAuth may have failed');
    }

    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');
    const errorParam = params.get('error');

    console.log('🔍 OAuth Callback - Hash params:', Object.fromEntries(params));
    console.log('🔍 OAuth Callback - ID Token:', idToken ? `Present (${idToken.length} chars)` : 'Missing');
    console.log('🔍 OAuth Callback - Access Token:', accessToken ? `Present (${accessToken.length} chars)` : 'Missing');
    console.log('🔍 OAuth Callback - Error param:', errorParam);

    if (errorParam) {
      throw new Error(`Google OAuth error: ${errorParam}`);
    }

    if (idToken || accessToken) {
      console.log('🔍 OAuth Callback - Attempting Google login with token...');

      try {
        const response = await authService.loginWithGoogle(idToken || accessToken);
        console.log('🔍 OAuth Callback - Login response:', response);

        // Check if response contains user data
        if (!response || !response.user) {
          throw new Error('No user data in login response');
        }

        const user = authService.getUser();
        console.log('🔍 OAuth Callback - User from auth service:', user);

        if (!user) {
          throw new Error('User not found in auth service after login');
        }

        // Test if user is actually authenticated
        const isAuthenticated = authService.isAuthenticated();
        console.log('🔍 OAuth Callback - Is authenticated:', isAuthenticated);

        // Wait a moment for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check role ID
        console.log('🔍 OAuth Callback - User role:', user.role);

        if (user?.role?.id === 1 || user?.role?.id === 2) {
          console.log('🔍 OAuth Callback - Redirecting to admin home');
          await router.push('/adminhome');
        } else {
          console.log('🔍 OAuth Callback - Redirecting to user home');
          await router.push('/userhome');
        }

        loading.value = false;

      } catch (loginError) {
        console.error('❌ Login API call failed:', loginError);
        throw loginError;
      }
    } else {
      throw new Error('No authentication tokens found in URL hash');
    }
  } catch (err) {
    console.error('❌ Google OAuth callback failed:', err);
    error.value = err.message || 'Unknown error occurred';
    loading.value = false;

    // Auto redirect to login after 3 seconds
    setTimeout(() => {
      if (error.value) {
        goToLogin();
      }
    }, 3000);
  }
});
</script>

<template>
  <div class="oauth-callback">
    <div v-if="loading" class="loading-message">
      <i class="pi pi-spin pi-spinner"></i>
      <p>Processing Google sign-in...</p>
    </div>
    <div v-else-if="error" class="error-message">
      <i class="pi pi-exclamation-triangle"></i>
      <p>Google sign-in failed: {{ error }}</p>
      <button @click="goToLogin" class="retry-button">Go to Login</button>
    </div>
  </div>
</template>

<style scoped>
.oauth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f7fa;
}

.loading-message, .error-message {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 400px;
}

.loading-message i {
  font-size: 2rem;
  color: #2563eb;
  margin-bottom: 1rem;
}

.error-message i {
  font-size: 2rem;
  color: #ef4444;
  margin-bottom: 1rem;
}

.loading-message p, .error-message p {
  margin: 0;
  color: #4b5563;
  font-size: 1.1rem;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.retry-button:hover {
  background: #1d4ed8;
}
</style>
