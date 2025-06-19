<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <span v-if="currentUser" class="username">{{ currentUser.username }}</span>
        <span v-else class="username">Guest</span>
      </div>

      <div class="navbar-menu">
        <div class="navbar-start">
          <router-link to="/" class="navbar-item">Home</router-link>
          <router-link to="/projects" class="navbar-item">Projects</router-link>
          <router-link to="/translate" class="navbar-item">Translate</router-link>
          <router-link to="/history" class="navbar-item">History</router-link>
        </div>

        <div class="navbar-end">
          <div class="navbar-item" v-if="!currentUser">
            <router-link to="/login" class="button is-primary">Sign In</router-link>
          </div>
          <div v-else class="user-menu">
            <Button
              v-if="currentUser"
              @click="toggleMenu"
              aria-haspopup="true"
              class="avatar-button"
            >
              <Avatar
                :label="getInitials(currentUser.fullName)"
                size="large"
                shape="circle"
                :style="{ backgroundColor: getRandomColor(currentUser.username) }"
              />
            </Button>
            <Menu ref="menu" :model="menuItems" :popup="true" />
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
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: {
    id: number;
    name: string;
  };
  isActive: boolean;
  phone?: string;
  createdAt: string;
}

const router = useRouter();
const menu = ref();
const currentUser = ref<User | null>(null);

const menuItems: MenuItem[] = [
  {
    template: () => {
      return `
        <div class="user-info">
          <Avatar
            label="${currentUser.value?.fullName ? getInitials(currentUser.value.fullName) : ''}"
            size="large"
            shape="circle"
            style="width: 36px; height: 36px; font-size: 15px; background-color: ${currentUser.value?.username ? getRandomColor(currentUser.value.username) : '#4CAF50'}"
          />
          <div class="user-details">
            <div class="user-name">${currentUser.value?.fullName || 'Godzilla D. White'}</div>
            <div class="user-email">${currentUser.value?.email || 'supportingtext@gmail.com'}</div>
          </div>
        </div>
      `;
    }
  },
  {
    label: 'View Profile',
    icon: 'pi pi-user',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content">
          <div class="menu-item-icon">
            <i class="pi pi-user"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">View Profile</span>
            <span class="menu-shortcut">⌘ F</span>
          </div>
        </div>
      `;
    }
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content selected">
          <div class="menu-item-icon">
            <i class="pi pi-cog"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Settings</span>
            <span class="menu-shortcut">⌘ G</span>
          </div>
        </div>
      `;
    }
  },
  {
    label: 'Subscription',
    icon: 'pi pi-credit-card',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content">
          <div class="menu-item-icon">
            <i class="pi pi-credit-card"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Subscription</span>
            <span class="menu-shortcut">⌘ ⇧ D</span>
          </div>
        </div>
      `;
    }
  },
  { separator: true },
  {
    label: 'Changelog',
    icon: 'pi pi-clock',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content">
          <div class="menu-item-icon">
            <i class="pi pi-clock"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Changelog</span>
            <span class="menu-shortcut">⌘ F</span>
          </div>
        </div>
      `;
    }
  },
  {
    label: 'Team',
    icon: 'pi pi-users',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content">
          <div class="menu-item-icon">
            <i class="pi pi-users"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Team</span>
            <span class="menu-shortcut">⇧ N</span>
          </div>
        </div>
      `;
    }
  },
  {
    label: 'Invite Member',
    icon: 'pi pi-user-plus',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content">
          <div class="menu-item-icon">
            <i class="pi pi-user-plus"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Invite Member</span>
            <span class="menu-shortcut">⌘ F</span>
          </div>
        </div>
      `;
    }
  },
  { separator: true },
  {
    label: 'Support',
    icon: 'pi pi-question-circle',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content">
          <div class="menu-item-icon">
            <i class="pi pi-question-circle"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Support</span>
            <span class="menu-shortcut">⇧ R</span>
          </div>
        </div>
      `;
    }
  },
  {
    label: 'Community',
    icon: 'pi pi-comments',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content">
          <div class="menu-item-icon">
            <i class="pi pi-comments"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Community</span>
            <span class="menu-shortcut">⌘ ⇧ P</span>
          </div>
        </div>
      `;
    }
  },
  { separator: true },
  {
    label: 'Sign Out',
    icon: 'pi pi-sign-out',
    template: (item: MenuItem) => {
      return `
        <div class="menu-item-content" onclick="document.dispatchEvent(new CustomEvent('sign-out'))">
          <div class="menu-item-icon">
            <i class="pi pi-sign-out"></i>
          </div>
          <div class="menu-item-details">
            <span class="menu-item-label">Sign Out</span>
            <span class="menu-shortcut">⌘ F</span>
          </div>
        </div>
      `;
    }
  }
];

const toggleMenu = (event: MouseEvent): void => {
  menu.value.toggle(event);
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
  document.addEventListener('sign-out', async () => {
    try {
      await authService.logout();
      currentUser.value = null;
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });
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
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.navbar-item:hover {
  color: #2563eb;
}

.button.is-primary {
  height: 32px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.button.is-primary:hover {
  background-color: #0056b3;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.user-menu {
  position: relative;
}

.avatar-button {
  padding: 2px;
  border-radius: 50%;
  transition: background-color 0.15s ease;
}

.avatar-button:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.avatar-button:active {
  background-color: rgba(0, 0, 0, 0.08);
}

:deep(.p-avatar) {
  width: 36px;
  height: 36px;
  border: none;
}

:deep(.p-menu) {
  min-width: 300px;
  padding: 20px 0;
  border-radius: 20px;
  border: none;
  background: #fff;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.user-name {
  color: #111827;
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
  margin-bottom: 1px;
}

.user-email {
  color: #6B7280;
  font-size: 13px;
  line-height: 1.3;
}

.menu-item-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;
  min-height: 40px;
}

.menu-item-content:hover {
  background: #F3F4F6;
}

.menu-item-content.selected {
  background: #EEF2FF;
}

.menu-item-content.selected .menu-item-label {
  color: #4F46E5;
}

.menu-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #4B5563;
  flex-shrink: 0;
}

.menu-item-icon i {
  font-size: 18px;
}

.menu-item-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.menu-item-label {
  color: #374151;
  font-weight: 450;
  font-size: 14px;
  letter-spacing: -0.01em;
}

.menu-shortcut {
  color: #9CA3AF;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

:deep(.p-menu .p-menuitem) {
  margin: 0;
}

:deep(.p-menu .p-separator) {
  border-top: 1px solid #f0f0f0;
  margin: 8px 0;
}

/* Sections styling */
.menu-section {
  padding: 8px 0;
}

/* Sign out styling */
.sign-out .menu-item-content {
  margin: 4px 8px 8px;
}

.sign-out .menu-item-icon {
  background: rgba(255, 59, 48, 0.15);
}

.sign-out .menu-item-icon i {
  color: #ff3b30;
}

.sign-out .menu-item-label {
  color: #ff3b30;
  font-weight: 500;
}

.sign-out .menu-item-content:hover {
  background: rgba(255, 59, 48, 0.1);
}

.sign-out .menu-item-content:hover .menu-item-icon {
  background: rgba(255, 59, 48, 0.2);
}

/* Menu animation */
:deep(.p-menu.p-menu-overlay) {
  transform-origin: top right;
  animation: menuFadeIn 0.12s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.98) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Avatar styling */
:deep(.p-avatar) {
  width: 36px;
  height: 36px;
  border: none;
}

/* Avatar button */
.avatar-button {
  padding: 2px;
  border-radius: 50%;
  transition: background-color 0.15s ease;
}

.avatar-button:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.avatar-button:active {
  background-color: rgba(0, 0, 0, 0.08);
}

/* Active menu item */
.menu-item-content:active {
  transform: scale(0.98) translateX(4px);
  background: rgba(255, 255, 255, 0.08);
}
</style>
