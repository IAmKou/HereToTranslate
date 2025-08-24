<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <router-link to="/" class="brand-link">


          <span class="brand-name">HereToTranslate</span>
        </router-link>
      </div>
      <div class="navbar-menu">
        <div class="navbar-start">
          <router-link to="/userhome" class="navbar-item" aria-label="Home">
            <i class="pi pi-home nav-icon"></i> Home
          </router-link>
          <router-link to="/projects" class="navbar-item" aria-label="Projects">
            <i class="pi pi-briefcase nav-icon"></i> Projects
          </router-link>
          <router-link to="/wallet" class="navbar-item" aria-label="Wallet">
            <i class="pi pi-wallet nav-icon"></i> Wallet
          </router-link>
          <router-link to="/chat" class="navbar-item" aria-label="Chat" exact>
            <i class="pi pi-comments nav-icon"></i> Chat
            <span v-if="totalUnreadCount > 0" class="unread-badge">{{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}</span>
          </router-link>


        </div>
        <div class="navbar-end">
          <div class="navbar-item" v-if="!currentUser">
            <router-link to="/login" class="button is-primary">Sign In</router-link>
          </div>
          <div v-else class="user-menu" style="position: relative;">
            <!-- Realtime Notifications -->
            <RealtimeNotifications />

            <div class="user-info-display">
              <span class="username-display">{{ currentUser.username }}</span>
              <Button
                @click="menuVisible = !menuVisible"
                aria-haspopup="menu"
                :aria-expanded="menuVisible"
                class="avatar-button"
                aria-label="Open user menu"
              >
                <template v-if="currentUser.avatarUrl">
                  <img :src="getFullAvatarUrl(currentUser.avatarUrl)" alt="Avatar" class="navbar-avatar-img" />
                </template>
                <template v-else>
                  <Avatar
                    :label="getInitials(currentUser.fullName)"
                    size="large"
                    shape="circle"
                    :style="{ backgroundColor: getRandomColor(currentUser.username), boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #e0e7ef' }"
                  />
                </template>
              </Button>
            </div>
            <transition name="fade-scale">
              <div
                v-if="menuVisible"
                class="user-dropdown-menu"
                tabindex="-1"
                @keydown.esc="menuVisible = false"
              >
                <!-- User Info -->
                <div class="user-info">
                  <div class="dropdown-avatar">
                    <template v-if="currentUser.avatarUrl">
                      <img
                        :src="getFullAvatarUrl(currentUser.avatarUrl)"
                        alt="Avatar"
                        class="dropdown-avatar-img"
                      />
                    </template>
                    <template v-else>
                      <div
                        class="avatar-initials"
                        :style="{ background: getRandomColor(currentUser.username) }"
                      >
                        {{ getInitials(currentUser.fullName) }}
                      </div>
                    </template>
                  </div>

                  <div>
                    <div class="user-name">{{ currentUser.fullName }}</div>
                    <div class="user-username">@{{ currentUser.username }}</div>
                  </div>
                </div>
                <div class="menu-section">
                  <router-link to="/userprofile" class="menu-item" tabindex="0">
                    <i class="pi pi-user"></i> View Profile <span class="shortcut"></span>
                  </router-link>
                  <router-link to="/settings" class="menu-item" tabindex="0">
                    <i class="pi pi-cog"></i> Settings <span class="shortcut"></span>
                  </router-link>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                  <div class="menu-header">Team</div>
                  <div class="menu-item" tabindex="0"><i class="pi pi-users"></i> Team <span class="shortcut"></span></div>
                  <div class="menu-item" tabindex="0"><i class="pi pi-user-plus"></i> Invite Member <span class="shortcut"></span></div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                  <div class="menu-header">Help</div>
                  <div class="menu-item" tabindex="0"><i class="pi pi-question-circle"></i> Support <span class="shortcut"></span></div>
                  <div class="menu-item" tabindex="0"><i class="pi pi-comments"></i> Community <span class="shortcut"></span></div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                  <div class="menu-item sign-out" tabindex="0" @click="signOut">
                    <i class="pi pi-sign-out"></i> Sign Out <span class="shortcut"></span>
                  </div>
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
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import RealtimeNotifications from './RealtimeNotifications.vue';
import axiosInstance from '../api';

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
  avatarUrl?: string;
}

const router = useRouter();
const menuVisible = ref(false);
const currentUser = ref<User | null>(null);
const totalUnreadCount = ref(0);
let unreadCountInterval: number | null = null;

const signOut = async () => {
  await authService.logout();
  currentUser.value = null;
  router.push('/login');
  menuVisible.value = false;
};

// Fetch total unread message count
const fetchUnreadCount = async () => {
  try {
    if (!currentUser.value) return;

    const response = await axiosInstance.get('/chat/unread-count/total');
    totalUnreadCount.value = response.data.totalUnreadCount || 0;
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    totalUnreadCount.value = 0;
  }
};

// Start periodic unread count updates
const startUnreadCountUpdates = () => {
  if (unreadCountInterval) return;

  // Fetch immediately
  fetchUnreadCount();

  // Then update every 30 seconds
  unreadCountInterval = window.setInterval(fetchUnreadCount, 30000);
};

// Stop periodic updates
const stopUnreadCountUpdates = () => {
  if (unreadCountInterval) {
    clearInterval(unreadCountInterval);
    unreadCountInterval = null;
  }
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

const getFullAvatarUrl = (avatarUrl: string) => {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  if (avatarUrl.startsWith('data:')) return avatarUrl; // Data URL từ preview

  // Sử dụng endpoint database với prefix /api/users
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const result = base + '/users' + avatarUrl;
  console.log('🟣 [NAVBAR] getFullAvatarUrl:', { avatarUrl, result });
  return result;
};

const loadUserInfo = async (): Promise<void> => {
  try {
    const user = await authService.getCurrentUser();
    if (user) {
      currentUser.value = user;
    } else {
      currentUser.value = null;
    }
  } catch (error) {
    console.error('Error loading user info:', error);
    currentUser.value = null;
  }
};

onMounted(() => {
  loadUserInfo();

  // Listen for avatar update events
  window.addEventListener('user-avatar-updated', async () => {
    console.log('🟣 [NAVBAR] Avatar updated, reloading user info');
    await loadUserInfo();
  });

  document.addEventListener('sign-out', async () => {
    try {
      await authService.logout();
      currentUser.value = null;
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });

  // Listen for chat room updates to refresh unread count
  window.addEventListener('chat-room-opened', () => {
    console.log('🟣 [NAVBAR] Chat room opened, refreshing unread count');
    fetchUnreadCount();
  });

  // Start unread count updates when user is loaded
  if (currentUser.value) {
    startUnreadCountUpdates();
  }
});

// Watch for user changes to start/stop unread count updates
watch(currentUser, (newUser: User | null) => {
  if (newUser) {
    startUnreadCountUpdates();
  } else {
    stopUnreadCountUpdates();
    totalUnreadCount.value = 0;
  }
});

// Cleanup on unmount
onUnmounted(() => {
  stopUnreadCountUpdates();
  window.removeEventListener('user-avatar-updated', loadUserInfo);
  window.removeEventListener('chat-room-opened', fetchUnreadCount);
  document.removeEventListener('sign-out', signOut);
});
</script>

<style scoped>
.navbar {
  background: linear-gradient(90deg, #f8fafc 0%, #e0e7ef 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background 0.3s;
}

.navbar-container {
  width: 100%;
  padding: 0 24px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  height: 64px;
}

.navbar-brand {
  padding-left: 10rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.brand-link {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 4rem;
}

.logo {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 700;
  color: #2d3748;
  letter-spacing: -0.5px;
  margin-left: 2rem;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 2.5rem;
  margin-left: auto;
}

.navbar-start {
  display: flex;
  gap: 12px;
}

.navbar-item {
  text-decoration: none;
  color: #4b5563;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 6px 14px;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
  position: relative;
}

.navbar-item:hover, .navbar-item.router-link-exact-active {
  color: #2563eb;
  background: #f1f5f9;
}

.nav-icon {
  font-size: 1.1em;
  margin-right: 2px;
}

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.button.is-primary {
  height: 36px;
  padding: 0 20px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 6px;
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(37,99,235,0.08);
  transition: background 0.3s;
}

.button.is-primary:hover {
  background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%);
}

.user-info-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username-display {
  font-size: 15px;
  font-weight: 500;
  color: #475569;
  margin-right: 8px;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-button {
  padding: 2px;
  border-radius: 50%;
  transition: background-color 0.15s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.avatar-button:hover {
  background-color: rgba(37, 99, 235, 0.08);
}

.avatar-button:active {
  background-color: rgba(37, 99, 235, 0.16);
}

:deep(.p-avatar) {
  width: 36px;
  height: 36px;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.navbar-avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e7ef;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.fade-scale-enter-active, .fade-scale-leave-active {
  transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-4px);
}
.user-dropdown-menu {
  position: absolute;
  right: 0;
  top: 48px;
  min-width: 240px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
  z-index: 1001;
  padding: 0;
  overflow: hidden;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 12px 16px;
  background: linear-gradient(90deg, #f8fafc 0%, #e0e7ef 100%);
  border-bottom: 1px solid #f0f0f0;
}
.avatar-initials {
  width: 32px;
  height: 32px;
  font-size: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  border: 2px solid #e0e7ef;
}
.user-name { font-size: 14px; }
.user-username { font-size: 12px; }
.menu-section { padding: 8px 0; }
.menu-header {
  font-size: 11px;
  padding: 6px 16px 2px 16px;
}
.menu-item {
  text-decoration: none !important;
  color: inherit !important;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  min-height: 36px;
  border-radius: 8px;
  margin: 0 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.18s, color 0.18s, transform 0.12s;
  outline: none;
}
.menu-item:hover, .menu-item:focus-visible {
  background: #f3f4f6;
  color: #2563eb;
  transform: scale(1.02);
  text-decoration: none !important;
}
.menu-item.router-link-exact-active {
  color: inherit;
  background: none;
  text-decoration: none !important;
}
.menu-divider {
  border-top: 1px solid #f0f0f0; margin: 8px 0;
}
.shortcut { color: #9ca3af; font-size: 12px; font-weight: 400; margin-left: auto; }
.sign-out { background: rgba(255,59,48,0.08); color: #ff3b30; font-weight: 700; }
.sign-out:hover, .sign-out:focus-visible { background: rgba(255,59,48,0.16); }
@media (max-width: 600px) {
  .user-dropdown-menu { min-width: 100vw; border-radius: 0; left: 0 !important; right: 0 !important; }
  .user-info { border-radius: 0; }
  .user-info-display {
    gap: 8px;
  }
  .username-display {
    font-size: 14px;
    margin-right: 4px;
  }
}
.dropdown-avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e7ef;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.dropdown-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
