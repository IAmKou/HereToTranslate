<template>
  <div class="container">
    <h1>Vue + NestJS Testing shit</h1>
    <button @click="getMessage">Get Message from Nest</button>
    <p v-if="message">📩 Message: {{ message }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const message = ref('');

const getMessage = async () => {
  try {
    const res = await fetch('http://localhost:3000/test'); // <-- NestJS URL
    const data = await res.json();
    message.value = data.message;
  } catch (err) {
    console.error('Fetch error:', err);
  }
};
</script>

<style>
.container {
  max-width: 600px;
  margin: 2rem auto;
  text-align: center;
  font-family: Arial, sans-serif;
}
button {
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
}
</style>
