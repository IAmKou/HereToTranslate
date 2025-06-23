<template>
  <div class="profile-page">
    <TopNavbar />
    <div class="profile-container">
      <aside class="sidebar">
        <Sidebar />
      </aside>
      <main class="profile-main">
        <section class="profile-header">
          <div class="avatar-section" @click="triggerAvatarUpload">
            <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
            <div v-else class="avatar-fallback">{{ userInitials }}</div>
            <input type="file" ref="avatarInput" @change="onAvatarChange" style="display:none" />
            <span class="avatar-edit"><i class="pi pi-camera"></i></span>
          </div>
          <div class="user-info">
            <h2>{{ user.fullName || user.username }}</h2>
           
            <p class="user-joined">Joined: {{ formatDate(user.createdAt) }}</p>
          </div>
        </section>

        <nav class="profile-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', {active: activeTab === tab.key}]"
            @click="activeTab = tab.key"
          >
            <i :class="tab.icon"></i> {{ tab.label }}
          </button>
        </nav>

        <section class="profile-content">
          <!-- Profile Tab -->
          <div v-if="activeTab === 'profile'" class="tab-panel">
            <form class="profile-form" @submit.prevent="updateProfile">
              <h3>General Information</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="fullName">Full Name</label>
                  <input type="text" id="fullName" v-model="updateForm.fullName" :placeholder="user.fullName" required />
                </div>
                <div class="form-group">
                  <label for="phone">Phone Number</label>
                  <input type="text" id="phone" v-model="updateForm.phone" :placeholder="user.phone" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="username">Username</label>
                  <input type="text" id="username" :value="user.username" disabled />
                </div>
                <div class="form-group">
                  <label for="email">Email</label>
                  <input type="email" id="email" :value="user.email" disabled />
                  <small class="form-note">Not public. Used for notifications.</small>
                </div>
              </div>
              <button type="submit" class="btn-primary" :disabled="isLoading">
                <span v-if="!isLoading">Save Changes</span>
                <span v-else class="loading-spinner"></span>
              </button>
              <div v-if="updateSuccess" class="success-message">
                <i class="pi pi-check-circle"></i> Profile updated!
              </div>
            </form>
          </div>

          <!-- Account Tab -->
          <div v-if="activeTab === 'account'" class="tab-panel">
            <form @submit.prevent="changePassword" class="password-form">
              <h3>Change Password</h3>
              <div class="form-group">
                <label for="currentPassword">Current Password</label>
                <div class="password-input-wrapper">
                  <input
                    :type="showCurrentPassword ? 'text' : 'password'"
                    id="currentPassword"
                    v-model="passwordForm.currentPassword"
                    required
                  />
                  <button type="button" class="toggle-password" @click="showCurrentPassword = !showCurrentPassword">
                    <i :class="showCurrentPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label for="newPassword">New Password</label>
                <div class="password-input-wrapper">
                  <input
                    :type="showNewPassword ? 'text' : 'password'"
                    id="newPassword"
                    v-model="passwordForm.newPassword"
                    required
                  />
                  <button type="button" class="toggle-password" @click="showNewPassword = !showNewPassword">
                    <i :class="showNewPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                  </button>
                </div>
                <div class="password-requirements">
                  <ul>
                    <li :class="{ met: passwordForm.newPassword.length >= 8 }">8+ characters</li>
                    <li :class="{ met: /[A-Z]/.test(passwordForm.newPassword) }">Uppercase letter</li>
                    <li :class="{ met: /[a-z]/.test(passwordForm.newPassword) }">Lowercase letter</li>
                    <li :class="{ met: /[0-9]/.test(passwordForm.newPassword) }">Number</li>
                    <li :class="{ met: /[^A-Za-z0-9]/.test(passwordForm.newPassword) }">Special character</li>
                  </ul>
                  <div class="password-strength-bar">
                    <div :style="{width: passwordStrength + '%', background: passwordStrengthColor}" class="strength-bar"></div>
                  </div>
                </div>
              </div>
              <button type="submit" class="btn-primary" :disabled="isLoading || !isPasswordValid">
                <span v-if="!isLoading">Update Password</span>
                <span v-else class="loading-spinner"></span>
              </button>
              <div v-if="passwordSuccess" class="success-message">
                <i class="pi pi-check-circle"></i> Password changed!
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  userService,
  UserProfile,
  UpdateProfileData,
  ChangePasswordData,
} from '../services/user.service';
import { authService } from '../services/auth.service';
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';

const tabs = [
  { key: 'profile', label: 'Profile', icon: 'pi pi-user' },
  { key: 'account', label: 'Account', icon: 'pi pi-lock' }
];

const user = ref<UserProfile>({
  id: BigInt(0),
  username: '',
  email: '',
  phone: '',
  fullName: '',
  role: null,
  createdAt: new Date(),
});

const isLoading = ref(false);
const updateSuccess = ref(false);
const passwordSuccess = ref(false);
const activeTab = ref<'profile'|'account'>('profile');
const avatarUrl = ref<string | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);

const updateForm = ref<UpdateProfileData>({
  fullName: '',
  phone: '',
});

const passwordForm = ref<ChangePasswordData>({
  currentPassword: '',
  newPassword: '',
});

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);

const userInitials = computed(() => {
  if (!user.value.fullName) return '';
  return user.value.fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase();
});

const triggerAvatarUpload = () => {
  avatarInput.value?.click();
};
const onAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarUrl.value = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const passwordStrength = computed(() => {
  const pwd = passwordForm.value.newPassword;
  let score = 0;
  if (pwd.length >= 8) score += 20;
  if (/[A-Z]/.test(pwd)) score += 20;
  if (/[a-z]/.test(pwd)) score += 20;
  if (/[0-9]/.test(pwd)) score += 20;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
  return score;
});
const passwordStrengthColor = computed(() => {
  if (passwordStrength.value < 40) return '#ef4444';
  if (passwordStrength.value < 80) return '#f59e42';
  return '#10b981';
});

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const fetchUserData = async () => {
  try {
    isLoading.value = true;
    if (!authService.isAuthenticated()) {
      throw new Error('User is not authenticated');
    }
    user.value = await userService.getUserProfile();
  } catch (error) {
    console.error('Error fetching user data:', error);
  } finally {
    isLoading.value = false;
  }
};

const updateProfile = async () => {
  try {
    isLoading.value = true;
    const updatedUser = await userService.updateProfile(updateForm.value);
    user.value = updatedUser;
    updateSuccess.value = true;
    setTimeout(() => {
      updateSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Failed to update profile. Please try again.');
  } finally {
    isLoading.value = false;
  }
};

const changePassword = async () => {
  try {
    isLoading.value = true;
    await userService.changePassword(passwordForm.value);
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
    };
    passwordSuccess.value = true;
    setTimeout(() => {
      passwordSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Error changing password:', error);
    alert(
      'Failed to change password. Please check your current password and try again.'
    );
  } finally {
    isLoading.value = false;
  }
};

const isPasswordValid = computed(() => {
  const password = passwordForm.value.newPassword;
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
});

onMounted(() => {
  fetchUserData();
});
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f6fb;
}
.profile-container {
  display: flex;
  flex: 1;
  min-height: 0;
}
.sidebar {
  min-width: 220px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
}
.profile-main {
  flex: 1;
  padding: 32px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2.5rem;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px #6366f11a;
  padding: 2rem 2.5rem;
  width: 100%;
  max-width: 700px;
}
.avatar-section {
  position: relative;
  cursor: pointer;
}
.avatar-img, .avatar-fallback {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #6366f1;
  border: 3px solid #e5e7eb;
  box-shadow: 0 2px 8px #0001;
}
.avatar-edit {
  position: absolute;
  bottom: 0; right: 0;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px #0001;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  color: #6366f1; border: 2px solid #fff;
  font-size: 1.3rem;
  transition: background 0.2s, color 0.2s;
}
.avatar-section:hover .avatar-edit {
  background: #6366f1; color: #fff;
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.user-info h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}
.user-role {
  color: #6366f1;
  font-weight: 500;
}
.user-joined {
  color: #6b7280;
  font-size: 0.95rem;
}
.profile-tabs {
  display: flex;
  gap: 1.5rem;
  margin: 2rem 0 1.5rem 0;
  width: 100%;
  max-width: 700px;
}
.tab-btn {
  background: none;
  border: none;
  outline: none;
  font-size: 1.1rem;
  font-weight: 500;
  color: #6b7280;
  padding: 0.7rem 1.5rem;
  border-radius: 12px;
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tab-btn.active {
  color: #fff;
  background: linear-gradient(90deg, #6366f1 0%, #4f46e5 100%);
  font-weight: 600;
  box-shadow: 0 2px 8px #6366f122;
}
.profile-content {
  width: 100%;
  max-width: 700px;
}
.tab-panel {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px #6366f11a;
  padding: 2rem 2.5rem;
  margin-bottom: 2rem;
}
.profile-form, .password-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.form-row {
  display: flex;
  gap: 1.5rem;
}
.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.form-group label {
  font-weight: 500;
  color: #374151;
}
.form-group input {
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  padding: 0.85rem 1rem;
  font-size: 1rem;
  background: #f9fafb;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px #6366f133;
  background: #fff;
}
.form-note {
  font-size: 0.92rem;
  color: #16a34a;
  margin-top: 0.2rem;
}
.btn-primary {
  background: linear-gradient(90deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  margin-top: 1.2rem;
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px #6366f122;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  transform: translateY(-2px) scale(1.03);
}
.success-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.password-input-wrapper input {
  padding-right: 2.5rem;
}
.toggle-password {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}
.toggle-password:hover {
  color: #4b5563;
}
.password-requirements {
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}
.password-requirements ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: row;
  gap: 1.2rem;
  flex-wrap: wrap;
}
.password-requirements li {
  color: #6b7280;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.password-requirements li.met {
  color: #059669;
  font-weight: 600;
}
.password-strength-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 6px;
  margin-top: 10px;
  overflow: hidden;
}
.strength-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s, background 0.3s;
}
@media (max-width: 900px) {
  .profile-header, .profile-content, .profile-tabs {
    max-width: 100%;
    padding: 1.2rem;
  }
  .profile-main {
    padding: 16px 0;
  }
}
@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
  }
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
  .profile-tabs {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
