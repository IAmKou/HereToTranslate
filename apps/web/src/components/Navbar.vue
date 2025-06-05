<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <span class="username">richchoi6</span>

      </div>

      <div class="navbar-menu">
        <div class="navbar-start">
          <router-link to="/" class="navbar-item">Home</router-link>
          <router-link to="/translate" class="navbar-item">Translate</router-link>
          <router-link to="/history" class="navbar-item">History</router-link>
        </div>

        <div class="navbar-end">
          <div class="navbar-item">
            <button class="button is-primary">Sign In</button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Navbar',
});
</script>

<style scoped>
.navbar {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.brand-link {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo {
  height: 32px;
  width: auto;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.navbar-start {
  display: flex;
  gap: 1.5rem;
}

.navbar-item {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  transition: color 0.3s ease;
}

.navbar-item:hover {
  color: #007bff;
}

.button.is-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.button.is-primary:hover {
  background-color: #0056b3;
}
@import url('https://fonts.googleapis.com/css?family=Inter:400,500,600,700&display=swap');
.header, .header-content {
  font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
}
.username {
  font-size: 20px;
  font-weight: 700;
  color: #2563eb;
}
.search-input {
  font-size: 16px;
}
.header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: fixed;
  left: 240px;
  right: 0;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
}
.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
}
.search-container {
  position: relative;
  width: 320px;
}
.search-input {
  width: 100%;
  padding: 8px 12px 8px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 22px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: background 0.2s;
}
.icon-btn:hover {
  background: #f3f4f6;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e5e7eb;
}

</style>
