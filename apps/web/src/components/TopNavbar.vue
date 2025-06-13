<template>
  <nav class="layout-navbar">
    <div class="navbar-left">
      <div class="logo">
        <img src="../assets/logo.png" alt="HereToTranslate" class="logo-image" />
        <span class="logo-text">HereToTranslate</span>
      </div>
    </div>

    <div class="navbar-right">
      <div class="search-box">
        <i class="pi pi-search search-icon"></i>
        <input type="text" placeholder="Search projects, strings, or glossary..." class="search-input" />
      </div>

      <PButton class="p-button-text notification-button">
        <i class="pi pi-bell"></i>
        <span class="notification-badge">3</span>
      </PButton>

      <Dropdown v-model="selectedUser"
                :options="userMenuItems"
                optionLabel="label"
                class="user-dropdown">
        <template #value="slotProps">
          <div class="user-info">
            <img src="../assets/avatar.png" alt="User" class="user-avatar" />
            <span class="user-name">John Doe</span>
          </div>
        </template>
        <template #option="slotProps">
          <div class="user-menu-item" @click="navigate(slotProps.option.to)">
            <i :class="[slotProps.option.icon, 'menu-icon']"></i>
            <span>{{ slotProps.option.label }}</span>
          </div>
        </template>
      </Dropdown>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import PButton from 'primevue/button';
import Dropdown from 'primevue/dropdown';

const router = useRouter();
const isMenuOpen = ref(false);
const selectedUser = ref(null);

const userMenuItems = ref([
  {
    label: 'Profile',
    icon: 'pi pi-user',
    to: '/profile'
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    to: '/settings'
  },
  {
    label: 'Logout',
    icon: 'pi pi-sign-out',
    to: '/logout'
  }
]);

const navigate = (path: string) => {
  router.push(path);
};
</script>

<style scoped>
.layout-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4rem;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  z-index: 1000;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.navbar-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logo:hover {
  transform: translateY(-1px);
}

.logo-image {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2563eb;
  letter-spacing: -0.025em;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.search-box {
  position: relative;
  width: 32rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 1rem;
}

.search-input {
  width: 100%;
  height: 3rem;
  padding: 0 1rem 0 2.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  font-size: 1rem;
  color: #374151;
  transition: all 0.2s ease;
  background: #f9fafb;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
  font-size: 1rem;
}

.notification-button {
  position: relative;
  width: 3rem;
  height: 3rem;
  border-radius: 0.625rem;
  color: #6b7280;
  transition: all 0.2s ease;
}

.notification-button:hover {
  background: #f3f4f6;
  color: #374151;
  transform: translateY(-1px);
}

.notification-badge {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: #ef4444;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.5rem;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
}

.user-dropdown {
  :deep(.p-dropdown) {
    background: transparent;
    border: none;
    padding: 0;
  }

  :deep(.p-dropdown-trigger) {
    display: none;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  padding: 0.625rem;
  border-radius: 0.625rem;
  transition: all 0.2s ease;
}

.user-info:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.user-avatar {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.625rem;
  object-fit: cover;
  border: 2px solid #f3f4f6;
  transition: all 0.2s ease;
}

.user-info:hover .user-avatar {
  border-color: #e5e7eb;
}

.user-name {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
  font-size: 1rem;
}

.user-menu-item:hover {
  background: #f3f4f6;
  color: #2563eb;
  transform: translateX(4px);
}

.menu-icon {
  font-size: 1rem;
  color: #6b7280;
  transition: all 0.2s ease;
}

.user-menu-item:hover .menu-icon {
  color: inherit;
  transform: scale(1.1);
}

@media (max-width: 991px) {
  .search-box {
    width: 24rem;
  }

  .logo-text {
    display: none;
  }
}

@media (max-width: 767px) {
  .layout-navbar {
    padding: 0 1rem;
  }

  .search-box {
    display: none;
  }

  .user-name {
    display: none;
  }
}
</style>
