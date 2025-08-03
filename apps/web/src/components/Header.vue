<template>
  <header class="header">
    <div class="header-content">
      <div class="search-container">
        <input class="search-input" placeholder="Search projects" />
        <span class="material-icons search-icon">search</span>
      </div>
      <div class="header-actions">
        <RealtimeNotifications />
        <button class="icon-btn"><span class="material-icons">chat_bubble_outline</span></button>
        <img src="../assets/logo.png" class="avatar" alt="avatar" />
      </div>
    </div>
  </header>
</template>

<script setup>
import RealtimeNotifications from './RealtimeNotifications.vue'
</script>

<style scoped>
.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  height: 64px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  height: 32px;
}

.logo-img {
  height: 100%;
  width: auto;
}

.main-nav {
  display: flex;
  gap: 24px;
}

.nav-item {
  text-decoration: none;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: #f3f4f6;
  color: #2563eb;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.search-box {
  position: relative;
  width: 240px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  background-color: #f9fafb;
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
  background-color: #ffffff;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 20px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.notification-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-profile:hover {
  background-color: #f3f4f6;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}
@import url('https://fonts.googleapis.com/css?family=Inter:400,500,600,700&display=swap');
.header, .header-content {
  font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
}
.username {
  font-size: 18px;
  font-weight: 600;
}
.search-input, .icon-btn {
  font-size: 15px;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e5e7eb;
}
</style>
