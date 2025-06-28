<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="user-profile">
          <!-- Header Section -->
          <div class="profile-header">
            <div class="header-content">
              <h1 class="page-title">
                <i class="pi pi-user-circle"></i>
                User Profile
              </h1>
              <p class="page-subtitle">Manage your account settings and personal information</p>
            </div>
          </div>

          <div class="profile-card">
            <!-- Enhanced Tab Navigation -->
            <div class="profile-tabs">
              <button
                :class="['tab-btn', {active: activeTab==='profile'}]"
                @click="activeTab='profile'"
              >
                <div class="tab-icon">
                  <i class="pi pi-user"></i>
                </div>
                <span>Profile</span>
              </button>
              <button
                :class="['tab-btn', {active: activeTab==='account'}]"
                @click="activeTab='account'"
              >
                <div class="tab-icon">
                  <i class="pi pi-lock"></i>
                </div>
                <span>Security</span>
              </button>
            </div>

            <!-- Profile Tab -->
            <div v-if="activeTab==='profile'" class="tab-content">
              <div class="avatar-section">
                <div class="avatar-container">
                  <div class="avatar-preview" @click="triggerAvatarUpload" :aria-label="'Change avatar'" tabindex="0">
                    <div class="avatar-wrapper">
                      <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-img" />
                      <div v-else class="avatar-fallback">
                        <i class="pi pi-user"></i>
                      </div>
                    </div>
                    <div class="avatar-overlay">
                      <i class="pi pi-camera"></i>
                      <span>Change Photo</span>
                    </div>
                    <input type="file" ref="avatarInput" @change="onAvatarChange" accept="image/*" style="display:none" aria-label="Upload avatar" />
                  </div>
                  <div v-if="avatarChanged" class="avatar-actions">
                    <button class="btn-primary" @click="uploadAvatar" :disabled="avatarUploading">
                      <span v-if="!avatarUploading">Save Avatar</span>
                      <span v-else class="loading-spinner"></span>
                    </button>
                    <button class="btn-secondary" @click="() => { avatarChanged=false; avatarUrl=null; avatarFile=null; }" :disabled="avatarUploading">Cancel</button>
                  </div>
                  <div v-if="avatarError" class="error-message">{{ avatarError }}</div>
                </div>
                <div class="avatar-info">
                  <h3>{{ user.fullName || 'Your Name' }}</h3>
                  <p>{{ user.email }}</p>

                </div>
              </div>

              <form class="profile-form" @submit.prevent="updateProfile">
                <div class="form-section">
                  <div class="section-header">
                    <i class="pi pi-id-card"></i>
                    <h3>Personal Information</h3>
                  </div>

                  <div class="form-grid">
                    <div class="form-group" :class="{ 'has-error': profileError.fullName, 'shake': shakeProfile }">
                      <label for="fullName"><i class="pi pi-user"></i> Full Name</label>
                      <div class="input-wrapper">
                        <input type="text" id="fullName" v-model="updateForm.fullName" :placeholder="user.fullName || 'Enter your full name'" required aria-label="Full Name" tabindex="0" />
                        <i class="pi pi-user input-icon" v-tooltip="'Your full name'" aria-label="Full Name"></i>
                      </div>
                      <div v-if="profileError.fullName" class="error-message">{{ profileError.fullName }}</div>
                    </div>

                    <div class="form-group" :class="{ 'has-error': profileError.phone, 'shake': shakeProfile }">
                      <label for="phone"><i class="pi pi-phone"></i> Phone Number</label>
                      <div class="input-wrapper">
                        <input type="tel" id="phone" v-model="updateForm.phone" :placeholder="user.phone || 'Enter your phone number'" aria-label="Phone Number" tabindex="0" />
                        <i class="pi pi-phone input-icon" v-tooltip="'Your phone number'" aria-label="Phone Number"></i>
                      </div>
                      <div v-if="profileError.phone" class="error-message">{{ profileError.phone }}</div>
                    </div>

                    <div class="form-group">
                      <label for="username">
                        <i class="pi pi-at"></i>
                        Username
                      </label>
                      <div class="input-wrapper disabled">
                        <input
                          type="text"
                          id="username"
                          :value="user.username"
                          disabled
                        />
                        <i class="pi pi-at input-icon"></i>
                      </div>
                      <small class="field-note">Username cannot be changed</small>
                    </div>

                    <div class="form-group">
                      <label for="email">
                        <i class="pi pi-envelope"></i>
                        Email Address
                      </label>
                      <div class="input-wrapper disabled">
                        <input
                          type="email"
                          id="email"
                          :value="user.email"
                          disabled
                        />
                        <i class="pi pi-envelope input-icon"></i>
                      </div>
                      <small class="field-note">
                        <i class="pi pi-info-circle"></i>
                        Email is used for account notifications and cannot be changed
                      </small>
                    </div>
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn-primary" :disabled="isLoading">
                    <i v-if="!isLoading" class="pi pi-check"></i>
                    <span v-if="!isLoading">Save Changes</span>
                    <div v-else class="loading-spinner"></div>
                  </button>
                </div>

                <div v-if="updateSuccess" class="success-message">
                  <i class="pi pi-check-circle"></i>
                  <div>
                    <strong>Profile Updated!</strong>
                    <p>Your profile has been successfully updated.</p>
                  </div>
                </div>
              </form>
            </div>

            <!-- Account Tab -->
            <div v-if="activeTab==='account'" class="tab-content">
              <div class="account-section">
                <div class="section-header">
                  <i class="pi pi-shield"></i>
                  <h3>Password Security</h3>
                  <p>Update your password to keep your account secure</p>
                </div>

                <form @submit.prevent="changePassword" class="password-form" :class="{ 'shake': shakePassword }">
                  <div class="form-group">
                    <label for="currentPassword"><i class="pi pi-lock"></i> Current Password</label>
                    <div class="input-wrapper">
                      <input
                        :type="showCurrentPassword ? 'text' : 'password'"
                        id="currentPassword"
                        v-model="passwordForm.currentPassword"
                        placeholder="Enter your current password"
                        required
                        aria-label="Current Password"
                        tabindex="0"
                      />
                      <i class="pi pi-lock input-icon" v-tooltip="'Your current password'" aria-label="Current Password"></i>
                      <button
                        type="button"
                        class="toggle-password"
                        @click="showCurrentPassword = !showCurrentPassword"
                        :aria-label="showCurrentPassword ? 'Hide password' : 'Show password'"
                        tabindex="0"
                      >
                        <i :class="showCurrentPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="newPassword"><i class="pi pi-key"></i> New Password</label>
                    <div class="input-wrapper">
                      <input
                        :type="showNewPassword ? 'text' : 'password'"
                        id="newPassword"
                        v-model="passwordForm.newPassword"
                        placeholder="Enter your new password"
                        required
                        aria-label="New Password"
                        tabindex="0"
                      />
                      <i class="pi pi-key input-icon" v-tooltip="'Your new password'" aria-label="New Password"></i>
                      <button
                        type="button"
                        class="toggle-password"
                        @click="showNewPassword = !showNewPassword"
                        :aria-label="showNewPassword ? 'Hide password' : 'Show password'"
                        tabindex="0"
                      >
                        <i :class="showNewPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                      </button>
                    </div>
                  </div>

                  <div v-if="passwordError" class="error-message">{{ passwordError }}</div>

                  <!-- Enhanced Password Requirements -->
                  <div class="password-requirements">
                    <div class="requirements-header">
                      <i class="pi pi-info-circle"></i>
                      <span>Password Requirements</span>
                    </div>
                    <div class="requirements-grid">
                      <div :class="['requirement-item', { met: passwordForm.newPassword.length >= 8 }]">
                        <i :class="passwordForm.newPassword.length >= 8 ? 'pi pi-check' : 'pi pi-circle'"></i>
                        <span>At least 8 characters</span>
                      </div>
                      <div :class="['requirement-item', { met: /[A-Z]/.test(passwordForm.newPassword) }]">
                        <i :class="/[A-Z]/.test(passwordForm.newPassword) ? 'pi pi-check' : 'pi pi-circle'"></i>
                        <span>One uppercase letter</span>
                      </div>
                      <div :class="['requirement-item', { met: /[a-z]/.test(passwordForm.newPassword) }]">
                        <i :class="/[a-z]/.test(passwordForm.newPassword) ? 'pi pi-check' : 'pi pi-circle'"></i>
                        <span>One lowercase letter</span>
                      </div>
                      <div :class="['requirement-item', { met: /[0-9]/.test(passwordForm.newPassword) }]">
                        <i :class="/[0-9]/.test(passwordForm.newPassword) ? 'pi pi-check' : 'pi pi-circle'"></i>
                        <span>One number</span>
                      </div>
                      <div :class="['requirement-item', { met: /[^A-Za-z0-9]/.test(passwordForm.newPassword) }]">
                        <i :class="/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? 'pi pi-check' : 'pi pi-circle'"></i>
                        <span>One special character</span>
                      </div>
                    </div>

                    <!-- Password Strength Indicator -->
                    <div class="password-strength">
                      <div class="strength-label">
                        <span>Password Strength:</span>
                        <span :class="['strength-text', strengthClass]">{{ strengthText }}</span>
                      </div>
                      <div class="strength-bar-container">
                        <div class="strength-bar">
                          <div
                            :class="['strength-fill', strengthClass]"
                            :style="{width: passwordStrength + '%'}"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="form-actions">
                    <button type="submit" class="btn-primary" :disabled="isLoading || !isPasswordValid">
                      <i v-if="!isLoading" class="pi pi-shield"></i>
                      <span v-if="!isLoading">Update Password</span>
                      <div v-else class="loading-spinner"></div>
                    </button>
                  </div>

                  <div v-if="passwordSuccess" class="success-message">
                    <i class="pi pi-check-circle"></i>
                    <div>
                      <strong>Password Updated!</strong>
                      <p>Your password has been successfully changed.</p>
                    </div>
                  </div>
                </form>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import {
  userService,
  UserProfile,
  UpdateProfileData,
  ChangePasswordData,
} from '../services/user.service';
import { authService } from '../services/auth.service';
import { useToast } from 'primevue/usetoast';
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
const activeTab = ref<'profile'|'account'>(localStorage.getItem('userProfileTab') as 'profile'|'account' || 'profile');
const avatarUrl = ref<string | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);
const avatarFile = ref<File|null>(null);
const avatarUploading = ref(false);
const avatarChanged = ref(false);
const avatarError = ref('');
const toast = useToast();
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
const passwordError = ref('');
const profileError = ref<{[key:string]:string}>({});
const shakePassword = ref(false);
const shakeProfile = ref(false);

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
    avatarFile.value = file;
    avatarChanged.value = true;
    avatarError.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarUrl.value = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};
const uploadAvatar = async () => {
  if (!avatarFile.value) return;
  avatarUploading.value = true;
  avatarError.value = '';
  try {
    // Giả lập upload, bạn thay bằng API thực tế
    await new Promise((res) => setTimeout(res, 1200));
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Avatar updated successfully!',
      life: 2500
    });
    avatarChanged.value = false;
  } catch (e) {
    avatarError.value = 'Failed to upload avatar. Please try again.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: avatarError.value,
      life: 2500
    });
  } finally {
    avatarUploading.value = false;
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
const strengthClass = computed(() => {
  if (passwordStrength.value < 40) return 'weak';
  if (passwordStrength.value < 80) return 'medium';
  return 'strong';
});
const strengthText = computed(() => {
  if (passwordStrength.value < 40) return 'Weak';
  if (passwordStrength.value < 80) return 'Medium';
  return 'Strong';
});

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

const validateProfile = () => {
  const errors: {[key:string]:string} = {};
  if (!updateForm.value.fullName.trim()) errors.fullName = 'Full name is required.';
  if (updateForm.value.phone && !/^\+?\d{7,15}$/.test(updateForm.value.phone)) errors.phone = 'Invalid phone number.';
  return errors;
};

const updateProfile = async () => {
  profileError.value = {};
  const errors = validateProfile();
  if (Object.keys(errors).length) {
    profileError.value = errors;
    shakeProfile.value = true;
    setTimeout(() => shakeProfile.value = false, 600);
    return;
  }
  try {
    isLoading.value = true;
    const updatedUser = await userService.updateProfile(updateForm.value, user.value.id.toString());
    user.value = updatedUser;
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Profile updated successfully!',
      life: 3000
    });
    updateSuccess.value = true;
    setTimeout(() => {
      updateSuccess.value = false;
    }, 3000);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update profile. Please try again.',
      life: 3000
    });
  } finally {
    isLoading.value = false;
  }
};

const changePassword = async () => {
  passwordError.value = '';
  if (!isPasswordValid.value) {
    passwordError.value = 'Password does not meet requirements.';
    shakePassword.value = true;
    setTimeout(() => shakePassword.value = false, 600);
    return;
  }
  try {
    isLoading.value = true;
    await userService.changePassword(passwordForm.value, user.value.id.toString());
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
    };
    passwordSuccess.value = true;
    setTimeout(() => {
      passwordSuccess.value = false;
    }, 3000);
  } catch (error) {
    passwordError.value = 'Failed to change password. Please check your current password and try again.';
    shakePassword.value = true;
    setTimeout(() => shakePassword.value = false, 600);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: passwordError.value,
      life: 3000
    });
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

// Animation chuyển tab + lưu trạng thái tab
watch(activeTab, (val) => {
  localStorage.setItem('userProfileTab', val);
  nextTick(() => {
    if (val === 'profile') {
      document.getElementById('fullName')?.focus();
    } else {
      document.getElementById('currentPassword')?.focus();
    }
  });
});

onMounted(() => {
  fetchUserData();
  nextTick(() => {
    if (activeTab.value === 'profile') {
      document.getElementById('fullName')?.focus();
    } else {
      document.getElementById('currentPassword')?.focus();
    }
  });
});
</script>

<style scoped>
:root {
  --profile-font-size: 0.95rem;
  --profile-title-size: 1.5rem;
  --profile-icon-size: 1.1rem;
  --profile-padding: 1rem;
  --profile-avatar-size: 120px;
}

.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.main-content {
  display: flex;
  flex: 1;
}

.content {
  flex: 1;
  padding: 2rem;
  background: #f8fafc;
}

.user-profile {
  max-width: 900px;
  margin: 0 auto;
}

/* Header Section */
.profile-header {
  margin-bottom: 2rem;
  text-align: center;
}

.header-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: var(--profile-title-size) !important;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.page-title i {
  color: #6366f1;
  font-size: 2.2rem;
}

.page-subtitle {
  color: #64748b;
  font-size: 1.1rem;
  margin: 0;
}

/* Profile Card */
.profile-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: var(--profile-padding) !important;
}

/* Enhanced Tab Navigation */
.profile-tabs {
  display: flex;
  background: #f8fafc;
  padding: 0.5rem;
  gap: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  outline: none;
  padding: 0.7rem 0.5rem !important;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  font-size: 0.95rem !important;
}

.tab-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 16px;
}

.tab-btn.active::before {
  opacity: 1;
}

.tab-btn:hover:not(.active) {
  background: #f1f5f9;
  transform: translateY(-2px);
}

.tab-btn.active {
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
}

.tab-icon {
  position: relative;
  z-index: 1;
  width: 32px !important;
  height: 32px !important;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--profile-icon-size) !important;
  transition: all 0.3s ease;
}

.tab-btn.active .tab-icon {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.tab-btn span {
  position: relative;
  z-index: 1;
  font-weight: 600;
  font-size: 0.95rem !important;
  transition: all 0.3s ease;
}

/* Tab Content */
.tab-content {
  padding: 2.5rem;
}

/* Avatar Section */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 20px;
}

.avatar-container {
  position: relative;
}

.avatar-preview {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  transition: all 0.3s ease;
}

.avatar-preview:hover {
  transform: scale(1.05);
}

.avatar-wrapper {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid white;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 3rem;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 50%;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay i {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.avatar-overlay span {
  font-size: 0.8rem;
  font-weight: 500;
}

.avatar-info h3 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.avatar-info p {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

/* Form Sections */
.form-section {
  margin-bottom: 2.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.section-header i {
  color: #6366f1;
  font-size: var(--profile-icon-size) !important;
}

.section-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.section-header p {
  color: #64748b;
  font-size: 1rem;
  margin: 0.5rem 0 0 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem !important;
}

.form-group label i {
  color: #6366f1;
  font-size: var(--profile-icon-size) !important;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 0.6rem 0.6rem 0.6rem 2.2rem !important;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem !important;
  background: #f8fafc;
  transition: all 0.3s ease;
  color: #1e293b;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

.input-wrapper.disabled input {
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: #6366f1;
  font-size: var(--profile-icon-size) !important;
  z-index: 1;
}

.toggle-password {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.toggle-password:hover {
  color: #6366f1;
  background: #f1f5f9;
}

.field-note {
  color: #64748b;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.field-note i {
  color: #6366f1;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.6rem 1.1rem !important;
  font-weight: 600;
  font-size: 0.95rem !important;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-primary:hover:not(:disabled)::before {
  left: 100%;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary i {
  font-size: 1.1rem;
}

/* Success Message */
.success-message {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  border: 1px solid #86efac;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  animation: slideInUp 0.5s ease-out;
}

.success-message i {
  color: #16a34a;
  font-size: 1.5rem;
  margin-top: 0.25rem;
}

.success-message strong {
  color: #15803d;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
  display: block;
}

.success-message p {
  color: #166534;
  margin: 0;
  font-size: 0.95rem;
}

/* Loading Spinner */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Account Tab Styles */
.account-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 20px;
  padding: 2rem;
}

.password-form {
  max-width: 600px;
}

/* Password Requirements */
.password-requirements {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.requirements-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #374151;
  font-weight: 600;
}

.requirements-header i {
  color: #6366f1;
}

.requirements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.3s ease;
}

.requirement-item.met {
  background: #dcfce7;
  color: #15803d;
}

.requirement-item i {
  font-size: 1rem;
  transition: all 0.3s ease;
}

.requirement-item.met i {
  color: #16a34a;
}

.requirement-item span {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Password Strength */
.password-strength {
  margin-top: 1rem;
}

.strength-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.strength-text {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

.strength-text.weak {
  color: #dc2626;
}

.strength-text.medium {
  color: #ea580c;
}

.strength-text.strong {
  color: #16a34a;
}

.strength-bar-container {
  width: 100%;
}

.strength-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.strength-fill.weak {
  background: linear-gradient(90deg, #dc2626, #ef4444);
}

.strength-fill.medium {
  background: linear-gradient(90deg, #ea580c, #f97316);
}

.strength-fill.strong {
  background: linear-gradient(90deg, #16a34a, #22c55e);
}

/* Responsive Design */
@media (max-width: 768px) {
  .content {
    padding: 1rem;
  }

  .profile-card,
  .account-section {
    padding: 0.5rem !important;
  }

  .tab-content {
    padding: 0.5rem !important;
  }

  .avatar-section {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .requirements-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 2rem;
  }

  .profile-tabs {
    flex-direction: column;
  }

  .tab-btn {
    flex-direction: row;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 1.5rem;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .tab-content {
    padding: 1rem;
  }

  .avatar-wrapper {
    width: 100px;
    height: 100px;
  }

  .avatar-fallback {
    font-size: 2.5rem;
  }
}

.has-error input {
  border-color: #ef4444 !important;
}
.error-message {
  color: #ef4444;
  font-size: 0.92rem !important;
  margin-top: 0.2rem;
  font-weight: 500;
}
.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}
.avatar-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
.btn-secondary {
  background: #fff;
  color: #6366f1;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 0.6rem 1.1rem !important;
  font-weight: 500;
  font-size: 0.95rem !important;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-secondary:hover {
  border-color: #6366f1;
  color: #4f46e5;
}
.user-meta {
  margin-top: 0.5rem;
  display: flex;
  gap: 1.5rem;
  color: #64748b;
  font-size: 0.95rem;
  align-items: center;
}
.user-meta i {
  color: #6366f1;
  margin-right: 0.3rem;
}
</style>
