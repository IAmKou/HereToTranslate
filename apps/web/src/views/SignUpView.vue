<template>
  <div class="signup-container">
    <header class="header">
      <span>HereToTranslate</span>
      <button @click="goToLogin" class="login-button">Log in</button>
    </header>

    <form @submit.prevent="submitForm" class="signup-form">
      <div class="form-row">
        <input v-model="form.username" type="text" placeholder="Username" required />
        <input v-model="form.fullName" type="text" placeholder="Full Name" required />
      </div>
      <div class="form-row">
        <input v-model="form.password" type="password" placeholder="Password" required />
        <input v-model="form.confirmPassword" type="password" placeholder="Confirm Password" required />
      </div>
      <div class="form-row">
        <input v-model="form.email" type="email" placeholder="Email" required />
        <input v-model="form.phone" type="tel" placeholder="Phone (e.g. +1234567890)" required />
      </div>

      <button type="submit" class="submit-button">Sign up</button>
    </form>
    <div>
      <h1> Pingas </h1>
    </div>
    <div>
      <h2>conflict maybe</h2>
    </div>

    <footer class="footer">© 2025 HereToTranslate</footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import axios from 'axios';
import router from '../router';

export default defineComponent({
  name: 'SignupPage',
  setup() {
    const form = reactive({
      username: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      email: '',
      phone: '',
    });

    const submitForm = async () => {
      if (form.password !== form.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      try {
        const payload = {
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          password: form.password,
          email: form.email.trim(),
          phone: form.phone.trim(),
        };

        const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/auth/register', payload);
        alert(res.data.message || 'Sign-up successful!');
        router.push('/userhome')
      } catch (err: any) {
        const message = err.response?.data?.message || 'Sign-up failed';
        alert(message);
      }
    };

    const goToLogin = () => {
      router.push('/login');
    };

    return {
      form,
      submitForm,
      goToLogin,
    };
  },
});
</script>

<style scoped>
.signup-container {
  max-width: 600px;
  margin: auto;
  padding: 2rem;
  background: #f7f7f7;
  border-radius: 10px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: bold;
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

input {
  flex: 1;
  padding: 0.75rem;
  border-radius: 5px;
  border: 1px solid #ccc;
  background-color: #fff;
}

.submit-button {
  background-color: #20005a;
  color: white;
  padding: 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.9rem;
  color: #999;
}
</style>
