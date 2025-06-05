<template>
  <div class="login-form">
    <h2>Login</h2>
    <form @submit.prevent="login">
      <input v-model="username" placeholder="Username" required >
      <input v-model="password" type="password" placeholder="Password" required >
      <button type="submit">Login</button>
      <p v-if="error" style="color:red">{{ error }}</p>
    </form>

    <div style="margin-top: 20px; text-align: center">
      <p>Or sign in with</p>
      <div id="g_id_onload"></div>
      <div id="g_id_signin"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const username = ref('');
const password = ref('');
const error = ref('');
const router = useRouter();

const login = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: username.value,
      password: password.value,
    });

    const { token, role, username: returnedUsername } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', returnedUsername);

    if (role === 'admin') {
      await router.push('/admin-home');
    } else if (role === 'member') {
      await router.push('/user-home');
    } else {
      await router.push('/');
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Login failed.';
    alert('Login failed: ' + error.value);
  }
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
      client_id: '580928535531-jmj6kfgfr6madkfbb7btjlb85h1sastj.apps.googleusercontent.com',
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

// Move handleGoogleSignIn outside of window object
const handleGoogleSignIn = async (response) => {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/google', {
      idToken: response.credential,
    });

    const { token, role, username: returnedUsername } = res.data;

    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', returnedUsername);

    if (role === 'admin') {
      await router.push('/admin-home');
    } else if (role === 'member') {
      await router.push('/user-home');
    } else {
      await router.push('/');
    }
  } catch (err) {
    alert('Google sign-in failed: ' + (err.response?.data?.message || err.message));
  }
};
</script>

<style>
.login-form {
  width: 300px;
  margin: auto;
  padding: 2rem;
  border: 1px solid #ccc;
  border-radius: 1rem;
}
.login-form input {
  display: block;
  margin-bottom: 1rem;
  width: 100%;
}
</style>
