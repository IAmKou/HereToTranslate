<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="user-profile">
          <div class="profile-card">
            <!-- Tab Navigation -->
            <div class="profile-tabs">
              <button :class="['tab-btn', {active: activeTab==='profile'}]" @click="activeTab='profile'">Profile</button>
              <button :class="['tab-btn', {active: activeTab==='account'}]" @click="activeTab='account'">Account</button>
            </div>

            <!-- Profile Tab -->
            <div v-if="activeTab==='profile'">
              <div class="avatar-upload-row">
                <div class="avatar-preview">
                  <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-img" />
                  <div v-else class="avatar-fallback">{{ userInitials }}</div>
                </div>
              </div>
              <form class="profile-form" @submit.prevent="updateProfile">
                <div class="form-title">General Information</div>
                <div class="form-group">
                  <label for="fullName">Full Name</label>
                  <input type="text" id="fullName" v-model="updateForm.fullName" :placeholder="user.fullName" required />
                </div>
                <div class="form-group">
                  <label for="username">Username</label>
                  <input type="text" id="username" :value="user.username" disabled />
                </div>
                <div class="form-group">
                  <label for="email">Email</label>
                  <input type="email" id="email" :value="user.email" disabled />
                  <div class="form-note">
                    Not publicly visible. Email will be used for account-related notifications.
                  </div>
                </div>
                <button type="submit" class="btn-primary" :disabled="isLoading">
                  <span v-if="!isLoading">Save Changes</span>
                  <span v-else class="loading-spinner"></span>
                </button>
                <div v-if="updateSuccess" class="success-message">
                  Profile updated successfully!
                </div>
              </form>
            </div>

            <!-- Account Tab -->
            <div v-if="activeTab==='account'" class="account-tab">
              <div class="account-section">
                <div class="section-header">
                  <h3>Change Password</h3>
                  <p class="section-description">Update your password to keep your account secure</p>
                </div>
                <form @submit.prevent="changePassword" class="password-form">
                  <div class="form-group">
                    <label for="currentPassword">Current Password</label>
                    <div class="password-input-wrapper">
                      <input
                        :type="showCurrentPassword ? 'text' : 'password'"
                        id="currentPassword"
                        v-model="passwordForm.currentPassword"
                        required
                      />
                      <button
                        type="button"
                        class="toggle-password"
                        @click="showCurrentPassword = !showCurrentPassword"
                      >
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
                      <button
                        type="button"
                        class="toggle-password"
                        @click="showNewPassword = !showNewPassword"
                      >
                        <i :class="showNewPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                      </button>
                    </div>
                    <div class="password-requirements">
                      <p>Password must contain:</p>
                      <ul>
                        <li :class="{ met: passwordForm.newPassword.length >= 8 }">
                          At least 8 characters
                        </li>
                        <li :class="{ met: /[A-Z]/.test(passwordForm.newPassword) }">
                          One uppercase letter
                        </li>
                        <li :class="{ met: /[a-z]/.test(passwordForm.newPassword) }">
                          One lowercase letter
                        </li>
                        <li :class="{ met: /[0-9]/.test(passwordForm.newPassword) }">
                          One number
                        </li>
                        <li :class="{ met: /[^A-Za-z0-9]/.test(passwordForm.newPassword) }">
                          One special character
                        </li>
                      </ul>
                    </div>
                  </div>
                  <button type="submit" class="btn-primary" :disabled="isLoading || !isPasswordValid">
                    <span v-if="!isLoading">Update Password</span>
                    <span v-else class="loading-spinner"></span>
                  </button>
                  <div v-if="passwordSuccess" class="success-message">
                    Password changed successfully!
                  </div>
                </form>
              </div>

              <div class="account-section">
                <div class="section-header">
                  <h3>Account Security</h3>
                  <p class="section-description">Manage your account security settings</p>
                </div>
                <div class="security-options">
                  <div class="security-option">
                    <div class="option-info">
                      <h4>Two-Factor Authentication</h4>
                      <p>Add an extra layer of security to your account</p>
                    </div>
                    <button class="btn-secondary">Enable</button>
                  </div>
                  <div class="security-option">
                    <div class="option-info">
                      <h4>Login History</h4>
                      <p>View your recent login activity</p>
                    </div>
                    <button class="btn-secondary">View History</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

const updateForm = ref<UpdateProfileData>({
  fullName: '',
  phone: '',
  company: '',
  jobTitle: '',
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

.user-profile {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.profile-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  padding: 2.5rem 2rem;
  max-width: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.profile-tabs {
  display: flex;
  gap: 2rem;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 2.5rem;
}
.tab-btn {
  background: none;
  border: none;
  outline: none;
  font-size: 1.1rem;
  font-weight: 500;
  color: #6b7280;
  padding: 0.5rem 0;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn.active {
  color: #4f46e5;
  border-bottom: 2px solid #4f46e5;
}

.avatar-upload-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
}

.avatar-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}

.avatar-fallback {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: #fff;
  border-radius: 12px;
  padding: 2rem 0 0 0;
}
.form-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1f2937;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.form-group label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.2rem;
}
.form-group input {
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  padding: 0.85rem 1rem;
  font-size: 1rem;
  background: #f9fafb;
  transition: border-color 0.2s;
}
.form-group input:focus {
  border-color: #6366f1;
  outline: none;
  background: #fff;
}
.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group {
  flex: 1;
}
.form-note {
  font-size: 0.92rem;
  color: #16a34a;
  margin-top: 0.2rem;
}
.btn-primary {
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.85rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  margin-top: 1.2rem;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}
.btn-secondary {
  background: #fff;
  color: #6366f1;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 0.6rem 1.1rem;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-secondary:hover {
  border-color: #6366f1;
  color: #4f46e5;
}
.success-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 8px;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
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
@keyframes slideIn {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.password-section {
  border-top: 1.5px solid #e5e7eb;
  margin-top: 2.5rem;
  padding-top: 2.5rem;
}
@media (max-width: 600px) {
  .profile-card {
    padding: 1.2rem 0.5rem;
  }
  .avatar-upload-row {
    flex-direction: column;
    align-items: stretch;
    gap: 1.2rem;
  }
  .profile-form {
    padding: 1rem 0 0 0;
  }
  .password-section {
    padding-top: 1.2rem;
    margin-top: 1.2rem;
  }
  .form-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}

.account-tab {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.account-section {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.section-description {
  color: #6b7280;
  font-size: 0.95rem;
}

.password-form {
  max-width: 500px;
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

.password-requirements p {
  color: #4b5563;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.password-requirements ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.password-requirements li {
  color: #6b7280;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.password-requirements li::before {
  content: '○';
  color: #d1d5db;
}

.password-requirements li.met {
  color: #059669;
}

.password-requirements li.met::before {
  content: '●';
  color: #059669;
}

.security-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.security-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.option-info h4 {
  font-size: 1rem;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.option-info p {
  color: #6b7280;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .security-option {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .security-option .btn-secondary {
    width: 100%;
  }
}
</style>
