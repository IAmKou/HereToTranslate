<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <router-link to="/" class="brand-link">
          <img src="../assets/logo.png" alt="HereToTranslate" class="logo" />
          <span class="brand-name">HereToTranslate</span>
        </router-link>
      </div>

      <div class="navbar-menu">
        <div class="navbar-start">
          <router-link to="/" class="navbar-item">Home</router-link>
          
        </div>

        <div class="navbar-end">
          <div class="navbar-item" v-if="!currentUser">
            <router-link to="/login" class="button is-primary">Sign In</router-link>
            <router-link to="/register" class="button is-secondary">Sign Up</router-link>
          </div>
          <div v-else class="user-menu relative">
            <button
              @click.stop="toggleDropdown"
              class="avatar-button focus:outline-none inline-block"
              type="button"
            >
              <Avatar
                :label="getInitials(currentUser.fullName)"
                size="large"
                shape="circle"
                :style="{ backgroundColor: getRandomColor(currentUser.username) }"
              />
            </button>
            <!-- Dropdown -->
            <transition name="fade">
              <div
                v-if="dropdownOpen"
                ref="dropdown"
                class="absolute right-0 top-full w-64 bg-white rounded-xl shadow-xl z-50 border border-gray-100"
                style="margin-top: 8px;"
                @click.stop
              >
                <div class="px-5 py-4 border-b">
                  <div class="font-semibold text-blue-600 text-base">{{ currentUser.fullName }}</div>
                  <div class="text-gray-500 text-sm">{{ currentUser.email }}</div>
                </div>
                <div class="flex flex-col py-2">
                  <button @click="goToProfile" class="dropdown-item">
                    <i class="pi pi-user mr-2 text-blue-500"></i> View Profile
                  </button>
                  <button class="dropdown-item">
                    <i class="pi pi-cog mr-2 text-blue-500"></i> Settings
                  </button>
                  <button class="dropdown-item">
                    <i class="pi pi-comments mr-2 text-blue-500"></i> Community
                  </button>
                  <button @click="signOut" class="dropdown-item text-red-500 hover:bg-red-50">
                    <i class="pi pi-sign-out mr-2 text-red-500"></i> Sign Out
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import Avatar from 'primevue/avatar';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

const router = useRouter();
const currentUser = ref<User | null>(null);

const dropdownOpen = ref(false);
const dropdown = ref<HTMLElement | null>(null);

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value;
};

const goToProfile = () => {
  dropdownOpen.value = false;
  router.push('/userprofile');
};

const signOut = async () => {
  await authService.logout();
  currentUser.value = null;
  router.push('/login');
};

const getInitials = (name: string): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
};

const getRandomColor = (seed: string): string => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];
  const index = seed.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

const loadUserInfo = async (): Promise<void> => {
  try {
    const user = authService.getUser();
    if (user) {
      currentUser.value = user as User;
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
};

onMounted(() => {
  loadUserInfo();
});
</script>

<style scoped>
.navbar {
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
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
  gap: 8px;
}

.navbar-item {
  text-decoration: none;
  color: #666;
  font-size: 18px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.navbar-item:hover {
  color: #2563eb;
}

.button.is-primary {
  height: 32px;
  padding: 0 16px;
  font-size: 18px;
  font-weight: 500;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
}

.button.is-primary:hover {
  background-color: #0056b3;
}

.button.is-secondary {
  height: 32px;
  padding: 0 16px;
  font-size: 18px;
  font-weight: 500;
  border-radius: 4px;
  background-color: transparent;
  color: #007bff;
  border: 1px solid #007bff;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.button.is-secondary:hover {
  background-color: #007bff;
  color: white;
}

.user-menu {
  position: relative;
}

.avatar-button {
  padding: 2px;
  border-radius: 50%;
  border: 2px solid #e0e7ff;
  background: #f3f4f6;
  transition: box-shadow 0.18s, border 0.18s;
}

.user-menu .avatar-button:hover {
  box-shadow: 0 4px 16px #3b82f622;
  border: 2px solid #3b82f6;
}

.user-menu .avatar-button {
  box-shadow: 0 4px 16px #3b82f622;
  border: 2px solid #3b82f6;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  background: none;
  border: none;
  outline: none;
  width: 100%;
  text-align: left;
  border-radius: 0;
  transition: background 0.15s, color 0.15s;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f3f4f6;
  color: #2563eb;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
