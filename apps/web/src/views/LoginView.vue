<template>
  <div class="login-form">
    <h2>Login</h2>
    <form @submit.prevent="login">
      <input v-model="username" placeholder="Username" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
      <p v-if="errorMessage" style="color:red">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const username = ref('');
const password = ref('');
const router = useRouter();
const error = ref('');

const login = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: username.value,
      password: password.value,
    });

    const { token, role, username: returnedUsername } = response.data;

    // Store in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', returnedUsername);

    // Redirect based on role
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
