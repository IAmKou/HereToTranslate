<script setup lang="ts">
import { authService } from '../services/auth.service';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';

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
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="user-home">
          <h1>Welcome to User Home</h1>
          <button @click="handleLogout" class="logout-btn">Logout</button>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
}

.content {
  flex: 1;
  padding: 20px;
}

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
