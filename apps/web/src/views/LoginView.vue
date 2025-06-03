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
import { ref } from 'vue'
import axios from 'axios'

const username = ref('')
const password = ref('')
const errorMessage = ref('')

const login = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: username.value,
      password: password.value
    })

    const token = response.data.token
    localStorage.setItem('jwt', token)
    alert('Login successful!')
    // redirect or emit event
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Login failed'
  }
}
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
