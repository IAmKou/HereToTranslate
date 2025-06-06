<script setup lang="ts">
import { authService } from '../services/auth.service';
import { useRouter } from 'vue-router';

const router = useRouter();

const handleLogout = async () => {
  try {
    // Call logout service
    await authService.logout();
    // Redirect to login page
    router.push('/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
</script>

<template>
  <div class="user-home">
    <h1>Welcome to User Home</h1>
    <button @click="handleLogout" class="logout-btn">Logout</button>
  </div>
</template>

<style scoped>
.user-home {
  padding: 20px;
  text-align: center;
}

.logout-btn {
  padding: 10px 20px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
}

.logout-btn:hover {
  background-color: #c82333;
}
</style>
