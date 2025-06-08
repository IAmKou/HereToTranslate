<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <img src="../assets/logo.png" alt="Logo" class="logo-img" />

    </div>
    <nav class="sidebar-menu">
      <router-link to="/" class="menu-item" exact-active-class="active">
        <span class="material-icons">home</span>
        <span>Home</span>
      </router-link>
      <router-link to="/todo" class="menu-item">
        <span class="material-icons">check_circle</span>
        <span>To Do</span>
      </router-link>
      <router-link to="/project-groups" class="menu-item">
        <span class="material-icons">group_work</span>
        <span>Groups</span>
      </router-link>
      <router-link to="/managers" class="menu-item">
        <span class="material-icons">group</span>
        <span>Managers</span>
      </router-link>
      <router-link to="/translation-memories" class="menu-item">
        <span class="material-icons">history_edu</span>
        <span>Translation Memories</span>
      </router-link>
      <router-link to="/glossaries" class="menu-item">
        <span class="material-icons">menu_book</span>
        <span>Glossaries</span>
      </router-link>
      <router-link to="/machine-translation" class="menu-item">
        <span class="material-icons">smart_toy</span>
        <span>Machine Translation</span>
      </router-link>
      <router-link to="/ai" class="menu-item">
        <span class="material-icons">psychology</span>
        <span>AI</span>
      </router-link>
      <router-link to="/vendors" class="menu-item">
        <span class="material-icons">storefront</span>
        <span>Vendors</span>
      </router-link>
      <router-link to="/store" class="menu-item">
        <span class="material-icons">shopping_cart</span>
        <span>Store</span>
      </router-link>
      <router-link to="/profile" class="menu-item">
        <span class="material-icons">account_circle</span>
        <span class="menu-text">My Profile</span>
      </router-link>
      <router-link to="/categories" class="menu-item">
        <span class="material-icons">category</span>
        <span>Categories</span>
      </router-link>
    </nav>
    <div class="sidebar-bottom">
      <router-link to="/whats-new" class="menu-item">
        <span class="material-icons">new_releases</span>
        <span>What's New</span>
      </router-link>
      <router-link to="/help" class="menu-item">
        <span class="material-icons">help_outline</span>
        <span>Help & Support</span>
      </router-link>
    </div>
  </aside>
</template>

<script setup>
// Layout only
</script>

<style scoped>
.sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px 24px 16px 24px;
}
.logo-img {
  height: 80px;
  width: auto;
  display: block;
  margin: 0 auto 12px auto;
}
.logo-text {
  font-size: 28px;
  font-weight: 800;
  color: #2563eb;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 1px;
}
.sidebar-menu, .sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  color: #374151;
  text-decoration: none;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s, color 0.2s;
  letter-spacing: 0.01em;
}
.menu-item .material-icons {
  font-size: 22px;
  color: #9ca3af;
}
.menu-item.active, .menu-item.router-link-exact-active {
  background: #f3f4f6;
  color: #2563eb;
  font-weight: 700;
}
.menu-item.active .material-icons, .menu-item.router-link-exact-active .material-icons {
  color: #2563eb;
}
.menu-item:hover {
  background: #f3f4f6;
  color: #2563eb;
}
.menu-item:hover .material-icons {
  color: #2563eb;
}
.sidebar-bottom {
  margin-top: auto;
  padding-bottom: 16px;
}
.logo-img {
  height: 230px; /* hoặc lớn hơn */
  width: auto;
}
@import url('https://fonts.googleapis.com/css?family=Inter:400,500,600,700&display=swap');
.sidebar {
  font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
}
.logo-text {
  font-size: 22px;
  font-weight: 700;
}
.menu-item {
  font-size: 15px;
  font-weight: 500;
}
</style>
