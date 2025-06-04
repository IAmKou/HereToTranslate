<template>
  <div class="register-form">
    <h2>Register</h2>
    <form @submit.prevent="submitForm">
      <input v-model="form.username" placeholder="Username" />
      <div v-if="errors.username" class="error">{{ errors.username }}</div>

      <input v-model="form.email" type="email" placeholder="Email" />
      <div v-if="errors.email" class="error">{{ errors.email }}</div>

      <input v-model="form.password" type="password" placeholder="Password" />
      <div v-if="errors.password" class="error">{{ errors.password }}</div>

      <input v-model="form.confirmPassword" type="password" placeholder="Confirm Password" />
      <div v-if="errors.confirmPassword" class="error">{{ errors.confirmPassword }}</div>

      <input v-model="form.phone" placeholder="Phone" />
      <div v-if="errors.phone" class="error">{{ errors.phone }}</div>

      <input v-model="form.fullName" placeholder="Full Name" />
      <div v-if="errors.fullName" class="error">{{ errors.fullName }}</div>

      <button type="submit">Register</button>
    </form>

    <div v-if="message" class="message">{{ message }}</div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import axios from 'axios';

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  fullName: '',
  roleId: 2, // hardcoded roleId
});

const message = ref('');
const errors = reactive({});

const validateForm = () => {
  Object.keys(errors).forEach(key => (errors[key] = ''));

  let valid = true;

  if (!form.username) {
    errors.username = 'Username is required.';
    valid = false;
  }

  if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
    errors.email = 'A valid email is required.';
    valid = false;
  }

  if (!form.password || form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
    valid = false;
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
    valid = false;
  }

  if (!form.phone) {
    errors.phone = 'Phone number is required.';
    valid = false;
  }

  if (!form.fullName) {
    errors.fullName = 'Full name is required.';
    valid = false;
  }

  return valid;
};

const submitForm = async () => {
  if (!validateForm()) return;

  const payload = {
    username: form.username,
    email: form.email,
    password: form.password,
    phone: form.phone,
    fullName: form.fullName,
    roleId: form.roleId,
  };

  try {
    await axios.post('http://localhost:3000/api/auth/register', payload);
    message.value = 'Registration successful!';
    Object.assign(form, {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      fullName: '',
    });
  } catch (err) {
    message.value = err.response?.data?.message || 'Registration failed.';
  }
};
</script>

<style scoped>
.register-form {
  max-width: 400px;
  margin: auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 10px;
}

input {
  display: block;
  margin-bottom: 8px;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
}

button {
  padding: 10px;
  width: 100%;
  margin-top: 10px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
}

.error {
  color: red;
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.message {
  margin-top: 15px;
  font-weight: bold;
  color: green;
  text-align: center;
}
</style>
