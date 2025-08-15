<template>
  <div :class="['layout-wrapper', { 'sidebar-collapsed': isSidebarCollapsed }]">
    <TopNavbar />
    <div class="main-content">
      <Sidebar :collapsed="isSidebarCollapsed" @update:collapsed="isSidebarCollapsed = $event" />
      <div class="content">
        <div class="profile-container">
          <div class="profile-layout">
            <!-- Left Column: Avatar + Change Password -->
            <div class="profile-left-col">
              <!-- Avatar Card -->
              <div class="avatar-card card-header">
                <div class="avatar-wrapper">
                  <img
                    v-if="fullAvatarUrl"
                    :src="fullAvatarUrl"
                    alt="Avatar"
                    class="avatar"
                    @click="triggerAvatarUpload"
                    @load="() => console.log('🟣 [DEBUG] Avatar image loaded successfully:', fullAvatarUrl)"
                    @error="(e: Event) => console.error('🟣 [DEBUG] Avatar image failed to load:', fullAvatarUrl, e)"
                  />
                  <div v-else class="avatar avatar-fallback" @click="triggerAvatarUpload">
                    <i class="pi pi-user"></i>
                  </div>
                  <button class="avatar-edit-btn" @click.stop="triggerAvatarUpload" tabindex="0" aria-label="Edit avatar" title="Change Avatar">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <input type="file" ref="avatarInput" @change="onAvatarChange" accept="image/*" style="display:none" aria-label="Upload avatar" />
                </div>
                <div class="avatar-info">
                  <h3>{{ user.fullName || 'Your Name' }}</h3>
                  <p>{{ user.email }}</p>
                </div>
              </div>

              <div v-if="avatarChanged" class="avatar-actions">
                <button class="btn-primary" @click="uploadAvatar" :disabled="avatarUploading">
                  <i v-if="!avatarUploading" class="pi pi-save"></i>
                  <span v-if="!avatarUploading">Save Avatar</span>
                  <span v-else class="loading-spinner"></span>
                </button>
                <button class="btn-secondary" @click="() => { avatarChanged=false; avatarUrl=null; avatarFile=null; }" :disabled="avatarUploading">Cancel</button>
              </div>
              <div v-if="avatarError" class="error-message">{{ avatarError }}</div>

              <!-- Change Password Card -->
              <div class="profile-card password-card">
                <div class="section-header password-section-header">
                  <div class="header-left">
                    <i class="pi pi-shield"></i>
                    <h3>Password Security</h3>
                  </div>
                  <button
                    type="button"
                    class="btn-secondary toggle-password-btn"
                    @click="togglePasswordForm"
                    :aria-label="showPasswordForm ? 'Hide password form' : 'Show password form'"
                  >
                    <i :class="showPasswordForm ? 'pi pi-eye-slash' : 'pi pi-key'"></i>
                    <span>{{ showPasswordForm ? 'Hide' : 'Change Password' }}</span>
                  </button>
                </div>

                <div v-if="showPasswordForm" class="password-form-container">
                  <form @submit.prevent="changePassword" class="password-form" :class="{ 'shake': shakePassword }">
                    <div class="form-group">
                      <label for="currentPassword" class="input-label"><i class="pi pi-lock"></i> Current Password</label>
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
                      <label for="newPassword" class="input-label"><i class="pi pi-key"></i> New Password</label>
                      <div class="input-wrapper">
                        <input
                          :type="showNewPassword ? 'text' : 'password'"
                          id="newPassword"
                          v-model="passwordForm.newPassword"
                          placeholder="Enter your new password"
                          required
                          aria-label="New Password"
                          tabindex="0"
                          @focus="showPasswordRequirements = true"
                          @input="showPasswordRequirements = true"
                          @blur="onNewPasswordBlur"
                        />
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
                    <transition name="fade-slide" mode="out-in">
                      <div v-if="showPasswordRequirements" class="password-requirements">
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
                    </transition>
                    <div class="form-actions" v-if="showPasswordForm">
                      <button type="submit" class="btn-primary" :disabled="isLoading || !isPasswordValid" @click="logUpdatePasswordClick">
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

            <!-- Right Column: Profile Info Form -->
            <div class="profile-right-col">
              <div class="profile-card">
                <form class="profile-form" @submit.prevent="updateProfile">
                  <div class="form-section">
                    <div class="section-header">
                      <i class="pi pi-id-card"></i>
                      <h3>Personal Information</h3>
                    </div>
                    <div class="form-grid">
                      <div class="form-group" :class="{ 'has-error': profileError.fullName, 'shake': shakeProfile }">
                        <label for="fullName" class="input-label"><i class="pi pi-user"></i> Full Name</label>
                        <div class="input-wrapper">
                          <input type="text" id="fullName" v-model="updateForm.fullName" :placeholder="''" required aria-label="Full Name" tabindex="0" />
                        </div>
                        <div v-if="profileError.fullName" class="error-message">{{ profileError.fullName }}</div>
                      </div>
                      <div class="form-group" :class="{ 'has-error': profileError.phone, 'shake': shakeProfile }">
                        <label for="phone" class="input-label"><i class="pi pi-phone"></i> Phone Number</label>
                        <div class="input-wrapper">
                          <input type="tel" id="phone" v-model="updateForm.phone" :placeholder="''" aria-label="Phone Number" tabindex="0" />
                        </div>
                        <div v-if="profileError.phone" class="error-message">{{ profileError.phone }}</div>
                      </div>
                      <div class="form-group">
                        <label for="username" class="input-label">
                          <i class="pi pi-at"></i>
                          Username
                        </label>
                        <div class="input-wrapper disabled readonly-input">
                          <input
                            type="text"
                            id="username"
                            :value="user.username"
                            disabled
                          />
                        </div>
                        <small class="field-note">Username cannot be changed</small>
                      </div>
                      <div class="form-group">
                        <label for="email" class="input-label">
                          <i class="pi pi-envelope"></i>
                          Email Address
                        </label>
                        <div class="input-wrapper disabled readonly-input">
                          <input
                            type="email"
                            id="email"
                            :value="user.email"
                            disabled
                          />
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
  uploadAvatar as uploadAvatarApi,
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
const isSidebarCollapsed = ref(false);
const showPasswordRequirements = ref(false);
const showPasswordForm = ref(false);

const logUpdatePasswordClick = () => {
  console.log('🟣 [DEBUG] Update Password clicked', {
    isLoading: isLoading.value,
    isPasswordValid: isPasswordValid.value,
    currentPasswordLength: passwordForm.value.currentPassword.length,
    newPasswordLength: passwordForm.value.newPassword.length,
    showPasswordRequirements: showPasswordRequirements.value
  });
};

const onNewPasswordBlur = () => {
  // Giữ nút Update luôn hiển thị khi đã mở form đổi mật khẩu
  showPasswordRequirements.value = true;
};

const togglePasswordForm = () => {
  showPasswordForm.value = !showPasswordForm.value;
  if (!showPasswordForm.value) {
    // Reset form khi ẩn
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
    };
    passwordError.value = '';
    showPasswordRequirements.value = false;
    showCurrentPassword.value = false;
    showNewPassword.value = false;
  }
};

const userInitials = computed(() => {
  if (!user.value.fullName) return '';
  return user.value.fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase();
});

const fullAvatarUrl = computed(() => {
  console.log('🟣 [DEBUG] fullAvatarUrl computed - avatarUrl:', avatarUrl.value);
  console.log('🟣 [DEBUG] fullAvatarUrl computed - user.avatarUrl:', user.value.avatarUrl);

  // Ưu tiên avatarUrl.value (avatar mới upload) trước
  if (avatarUrl.value) {
    if (avatarUrl.value.startsWith('data:')) return avatarUrl.value; // Data URL từ preview
    if (avatarUrl.value.startsWith('http')) return avatarUrl.value; // Full URL
    // Relative URL từ server - sử dụng endpoint database
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const result = base + '/users' + avatarUrl.value + '?t=' + Date.now(); // Force refresh
    console.log('🟣 [DEBUG] fullAvatarUrl computed - returning avatarUrl result:', result);
    return result;
  }

  // Fallback về user.value.avatarUrl
  if (!user.value.avatarUrl) {
    console.log('🟣 [DEBUG] fullAvatarUrl computed - no avatarUrl, returning null');
    return null;
  }
  if (user.value.avatarUrl.startsWith('http')) {
    console.log('🟣 [DEBUG] fullAvatarUrl computed - returning user.avatarUrl (http):', user.value.avatarUrl);
    return user.value.avatarUrl;
  }

  // Lấy baseURL từ env hoặc mặc định - sử dụng endpoint database
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const result = base + '/users' + user.value.avatarUrl + '?t=' + Date.now(); // Force refresh
  console.log('🟣 [DEBUG] fullAvatarUrl computed - returning user.avatarUrl result:', result);
  return result;
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
      const result = ev.target?.result as string;
      avatarUrl.value = result;
    };
    reader.readAsDataURL(file);
  }
};
const uploadAvatar = async () => {
  if (!avatarFile.value) return;
  avatarUploading.value = true;
  avatarError.value = '';
  try {
    const url = await uploadAvatarApi(avatarFile.value);

    console.log('🟣 [DEBUG] Avatar upload response:', url);

    // Cập nhật cả hai giá trị để đảm bảo reactive
    avatarUrl.value = url;
    user.value.avatarUrl = url;

    console.log('🟣 [DEBUG] After update - avatarUrl:', avatarUrl.value);
    console.log('🟣 [DEBUG] After update - user.avatarUrl:', user.value.avatarUrl);
    console.log('🟣 [DEBUG] After update - fullAvatarUrl:', fullAvatarUrl.value);

    // Force re-render và trigger reactive update
    await nextTick();

    // Force trigger reactive update bằng cách reassign
    avatarUrl.value = url;
    await nextTick();

    avatarChanged.value = false;
    avatarFile.value = null; // Reset file

    // Thông báo cho Navbar.vue cập nhật avatar mới
    window.dispatchEvent(new Event('user-avatar-updated'));

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Avatar updated successfully!',
      life: 2500
    });
  } catch (e) {
    console.error('🟣 [DEBUG] Avatar upload error:', e);
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
    const userData = await userService.getUserProfile();

    user.value = userData;
    updateForm.value.fullName = user.value.fullName || '';
    updateForm.value.phone = user.value.phone || '';
    avatarUrl.value = user.value.avatarUrl || null;

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

  // Validate required fields
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword) {
    passwordError.value = 'Please fill in all password fields.';
    shakePassword.value = true;
    setTimeout(() => shakePassword.value = false, 600);
    return;
  }

  if (!user.value.id) {
    passwordError.value = 'User ID not found. Please refresh the page.';
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

    // Thêm toast notification thành công
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Password changed successfully!',
      life: 3000
    });

    setTimeout(() => {
      passwordSuccess.value = false;
      showPasswordForm.value = false; // Tự động ẩn form sau khi thành công
    }, 3000);
  } catch (error) {
    passwordError.value = 'Failed to change password. Please check your current password and try again.';
    shakePassword.value = true;
    setTimeout(() => shakePassword.value = false, 600);
    // Xóa toast error để tránh hiển thị trùng lặp với error message dưới input
  } finally {
    isLoading.value = false;
  }
};

const isPasswordValid = computed(() => {
  const password = passwordForm.value.newPassword;
  const isValid = (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );

  return isValid;
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
  --profile-font-size: 0.85rem;
  --profile-title-size: 1.3rem;
  --profile-icon-size: 1rem;
  --profile-padding: 1rem;
  --profile-avatar-size: 120px;
}

.layout-wrapper,
.layout-wrapper.sidebar-collapsed,
.main-content,
.content {
  background: #f8fafc !important;
  background-image: none !important;
}

.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  margin-left: 240px;
  transition: margin-left 0.3s, padding-left 0.3s;
  padding-left: 0;
}
.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
  padding-left: 24px;
}
@media (max-width: 1024px) {
  .main-content {
    margin-left: 0 !important;
    padding-left: 0 !important;
  }
}

.content {
  flex: 1;
  padding: 2rem;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative;
}
@media (min-width: 1200px) {
  .content {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Container căn giữa max-width 1200px */
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative;
}

/* Layout 2 cột 60/40 */
.profile-layout {
  display: grid;
  grid-template-columns: 40% 1fr;
  gap: 2rem;
  align-items: start;
  width: 100%;
  max-width: 100%;
  position: relative;
}
.profile-left-col {
  width: 100%;
  max-width: 420px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.profile-right-col {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative;
}
@media (max-width: 1024px) {
  .profile-layout {
    flex-direction: column;
    gap: 1.5rem;
  }
  .profile-left-col, .profile-right-col {
    max-width: 100%;
    min-width: 0;
    flex: 1 1 100%;
  }
}

/* Avatar Card với gradient và shadow mềm */
.avatar-card {
  display: flex;
  align-items: center;
  gap: 2rem;
}
.card-header {
  background: linear-gradient(135deg, #f5f7fa, #e4e8f0);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.05);
}

/* Avatar lớn với hiệu ứng hover */
.avatar-wrapper {
  position: relative;
}
.avatar {
  border: 3px solid #6c63ff;
  border-radius: 50%;
  width: 120px;
  height: 120px;
  transition: transform 0.3s;
  cursor: pointer;
  object-fit: cover;
}
.avatar:hover {
  transform: scale(1.05);
}
.avatar-fallback {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3rem;
}
.avatar-edit-btn {
  position: absolute;
  right: 0;
  bottom: 0;
  background: #6c63ff;
  border: 3px solid #fff;
  color: #fff;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(108,99,255,0.3);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.avatar-edit-btn:hover {
  background: #5854d6;
  transform: scale(1.1);
}

/* Avatar info - tên lớn, email nhỏ màu xám */
.avatar-info h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}
.avatar-info p {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

/* Avatar actions */
.avatar-actions {
  display: flex;
  gap: 1rem;
  margin-top: -1rem;
}

/* Profile Card */
.profile-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 2rem !important;
}

/* Section Headers */
.form-section {
  margin-bottom: 2.5rem;
}

.section-header i {
  color: #6366f1;
  font-size: var(--profile-icon-size) !important;
}

.section-header h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.password-section-header {
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-password-btn {
  background: #f8fafc;
  color: #6366f1;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.4rem 0.8rem !important;
  font-weight: 500;
  font-size: 0.8rem !important;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.toggle-password-btn:hover {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.toggle-password-btn i {
  font-size: 1rem;
}

.password-form-container {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-header p {
  color: #64748b;
  font-size: 1rem;
  margin: 0.5rem 0 0 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
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

.input-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #6c63ff;
  margin-bottom: 0.25rem;
  letter-spacing: 0.01em;
}
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 0.6rem 0.5rem 0.6rem 0.7rem !important;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem !important;
  background: #f8fafc;
  transition: all 0.3s, box-shadow 0.2s;
  color: #1e293b;
  box-shadow: none;
}
.input-wrapper input:focus {
  outline: none;
  border-color: #6c63ff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(108,99,255,0.2);
  transform: translateY(-1px);
}
.input-wrapper input:hover:not(:disabled) {
  box-shadow: 0 0 0 2px rgba(108,99,255,0.10);
  border-color: #b3b3ff;
}
.readonly-input input {
  background: #f3f4f6 !important;
  color: #6b7280 !important;
  border: 2px solid #e5e7eb !important;
  cursor: not-allowed;
  font-weight: 500;
}
.readonly-input input:focus {
  box-shadow: none !important;
  border-color: #e5e7eb !important;
  transform: none !important;
}
.readonly-input input:hover {
  box-shadow: none !important;
  border-color: #e5e7eb !important;
}
.readonly-input .input-icon {
  color: #a1a1aa;
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
  font-size: 0.8rem;
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
  padding: 0.5rem 1rem !important;
  font-weight: 600;
  font-size: 0.85rem !important;
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
  font-size: 1rem;
  margin-bottom: 0.25rem;
  display: block;
}

.success-message p {
  color: #166534;
  margin: 0;
  font-size: 0.85rem;
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
.password-card {
  background: white;
}

.password-form {
  max-width: 100%;
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
  font-size: 0.8rem;
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
  font-size: 0.75rem;
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

/* Tab Content Animation */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity 0.35s, transform 0.35s;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
.fade-slide-enter-to, .fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Responsive Design */
@media (max-width: 768px) {
  .content {
    padding: 1rem;
  }

  .profile-card,
  .password-card {
    padding: 1.5rem !important;
  }

  .avatar-card {
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

  .avatar {
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
  font-size: 0.8rem !important;
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

.btn-secondary {
  background: #fff;
  color: #6366f1;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 1rem !important;
  font-weight: 500;
  font-size: 0.85rem !important;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-secondary:hover {
  border-color: #6366f1;
  color: #4f46e5;
}
</style>

