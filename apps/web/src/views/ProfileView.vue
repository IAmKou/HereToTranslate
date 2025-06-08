<template>
  <div class="profile-view">
    <div class="profile-header">
      <h1 class="page-title">My Profile</h1>
      <div v-if="user.username" class="profile-avatar-container">
        <div class="profile-avatar">
          <div class="avatar-placeholder">{{ userInitials }}</div>
        </div>
        <div class="user-name">{{ user.fullName }}</div>
        <div class="user-role">{{ user.role?.name || 'User' }}</div>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading your profile information...</p>
    </div>
    
    <div v-else class="profile-container">
      <div class="profile-tabs">
        <button 
          @click="activeTab = 'info'" 
          :class="['tab-button', { active: activeTab === 'info' }]"
        >
          <i class="tab-icon">👤</i> Profile Info
        </button>
        <button 
          @click="activeTab = 'edit'" 
          :class="['tab-button', { active: activeTab === 'edit' }]"
        >
          <i class="tab-icon">✏️</i> Edit Profile
        </button>
        <button 
          @click="activeTab = 'password'" 
          :class="['tab-button', { active: activeTab === 'password' }]"
        >
          <i class="tab-icon">🔒</i> Change Password
        </button>
      </div>
      
      <div class="tab-content">
        <!-- Profile Information Tab -->
        <div v-if="activeTab === 'info'" class="tab-pane">
          <h2 class="section-title">Profile Information</h2>
          <div class="info-card">
            <div class="info-row">
              <div class="info-label">Username</div>
              <div class="info-value">{{ user.username }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Full Name</div>
              <div class="info-value">{{ user.fullName }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email</div>
              <div class="info-value">{{ user.email }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Phone</div>
              <div class="info-value">{{ user.phone }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Role</div>
              <div class="info-value">{{ user.role?.name || 'User' }}</div>
            </div>
          </div>
        </div>
        
        <!-- Edit Profile Tab -->
        <div v-if="activeTab === 'edit'" class="tab-pane">
          <h2 class="section-title">Edit Profile</h2>
          <div class="notification-area">
            <div v-if="updateSuccess" class="success-message">
              <i class="message-icon">✅</i> Profile updated successfully!
            </div>
            <div v-if="updateError" class="error-message">
              <i class="message-icon">❌</i> {{ updateError }}
            </div>
          </div>
          
          <form @submit.prevent="updateProfile" class="profile-form">
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <div class="input-container">
                <i class="input-icon">👤</i>
                <input 
                  id="fullName"
                  v-model="profileForm.fullName"
                  type="text"
                  class="form-control"
                  placeholder="Your full name"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="email">Email</label>
              <div class="input-container">
                <i class="input-icon">✉️</i>
                <input 
                  id="email"
                  v-model="profileForm.email"
                  type="email"
                  class="form-control"
                  placeholder="Your email address"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="phone">Phone</label>
              <div class="input-container">
                <i class="input-icon">📱</i>
                <input 
                  id="phone"
                  v-model="profileForm.phone"
                  type="text"
                  class="form-control"
                  placeholder="Your phone number"
                />
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                type="button" 
                class="cancel-button"
                @click="resetProfileForm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="submit-button"
                :disabled="updateLoading"
              >
                <span v-if="updateLoading" class="button-spinner"></span>
                <span>{{ updateLoading ? 'Saving...' : 'Save Changes' }}</span>
              </button>
            </div>
          </form>
        </div>
        
        <!-- Change Password Tab -->
        <div v-if="activeTab === 'password'" class="tab-pane">
          <h2 class="section-title">Change Password</h2>
          <div class="notification-area">
            <div v-if="passwordSuccess" class="success-message">
              <i class="message-icon">✅</i> Password changed successfully!
            </div>
            <div v-if="passwordError" class="error-message">
              <i class="message-icon">❌</i> {{ passwordError }}
            </div>
          </div>
          
          <form @submit.prevent="changePassword" class="profile-form">
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <div class="input-container">
                <i class="input-icon">🔑</i>
                <input 
                  id="currentPassword"
                  v-model="passwordForm.currentPassword"
                  type="password"
                  class="form-control"
                  placeholder="Enter your current password"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <div class="input-container">
                <i class="input-icon">🔒</i>
                <input 
                  id="newPassword"
                  v-model="passwordForm.newPassword"
                  type="password"
                  class="form-control"
                  placeholder="Enter your new password"
                />
              </div>
              <div class="password-strength-hint">
                Password should be at least 8 characters long
              </div>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <div class="input-container">
                <i class="input-icon">🔒</i>
                <input 
                  id="confirmPassword"
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  class="form-control"
                  placeholder="Confirm your new password"
                  :class="{ 'input-error': passwordsDoNotMatch }"
                />
              </div>
              <div v-if="passwordsDoNotMatch" class="input-error-message">
                Passwords do not match
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                type="button" 
                class="cancel-button"
                @click="resetPasswordForm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="submit-button"
                :disabled="passwordLoading || passwordsDoNotMatch"
              >
                <span v-if="passwordLoading" class="button-spinner"></span>
                <span>{{ passwordLoading ? 'Changing...' : 'Change Password' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, watch } from 'vue';
import { userService, User, UpdateProfileData, ChangePasswordData } from '../services/user.service';

export default defineComponent({
  name: 'ProfileView',
  
  setup() {
    // Active tab state
    const activeTab = ref('info');
    
    // User profile data - Clone to prevent reference sharing
    const user = ref<User>({} as User);
    const loading = ref(true);
    
    // Edit profile
    const profileForm = reactive<UpdateProfileData>({
      fullName: '',
      email: '',
      phone: ''
    });
    const updateLoading = ref(false);
    const updateSuccess = ref(false);
    const updateError = ref('');
    
    // Change password
    const passwordForm = reactive<ChangePasswordData>({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    const passwordLoading = ref(false);
    const passwordSuccess = ref(false);
    const passwordError = ref('');

    // Check if passwords match
    const passwordsDoNotMatch = computed(() => {
      return passwordForm.newPassword !== '' && 
             passwordForm.confirmPassword !== '' && 
             passwordForm.newPassword !== passwordForm.confirmPassword;
    });

    // Computed property for user initials
    const userInitials = computed(() => {
      if (!user.value.fullName) return '';
      return user.value.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    });

    // Load user profile
    const loadProfile = async () => {
      try {
        loading.value = true;
        const userData = await userService.getProfile();
        
        // Create a new object to prevent reference sharing
        user.value = JSON.parse(JSON.stringify(userData));
        
        // Initialize form values with cloned data
        resetProfileForm();
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        loading.value = false;
      }
    };

    // Reset profile form to current user values
    const resetProfileForm = () => {
      profileForm.fullName = user.value.fullName || '';
      profileForm.email = user.value.email || '';
      profileForm.phone = user.value.phone || '';
      updateError.value = '';
      updateSuccess.value = false;
    };

    // Reset password form
    const resetPasswordForm = () => {
      passwordForm.currentPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
      passwordError.value = '';
      passwordSuccess.value = false;
    };

    // Update user profile
    const updateProfile = async () => {
      try {
        updateLoading.value = true;
        updateError.value = '';
        updateSuccess.value = false;
        
        const updatedUser = await userService.updateProfile({...profileForm});
        
        // Update user data with a new object
        user.value = JSON.parse(JSON.stringify(updatedUser));
        updateSuccess.value = true;
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          updateSuccess.value = false;
        }, 3000);
      } catch (error: any) {
        updateError.value = error.response?.data?.message || 'Failed to update profile';
      } finally {
        updateLoading.value = false;
      }
    };

    // Change password
    const changePassword = async () => {
      try {
        // Validate passwords match
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          passwordError.value = 'New password and confirmation do not match';
          return;
        }
        
        passwordLoading.value = true;
        passwordError.value = '';
        passwordSuccess.value = false;
        
        await userService.changePassword({...passwordForm});
        passwordSuccess.value = true;
        
        // Reset form
        passwordForm.currentPassword = '';
        passwordForm.newPassword = '';
        passwordForm.confirmPassword = '';
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          passwordSuccess.value = false;
        }, 3000);
      } catch (error: any) {
        passwordError.value = error.response?.data?.message || 'Failed to change password';
      } finally {
        passwordLoading.value = false;
      }
    };

    // Reset forms when switching tabs
    watch(activeTab, (newTab) => {
      if (newTab === 'edit') {
        resetProfileForm();
      } else if (newTab === 'password') {
        resetPasswordForm();
      }
    });

    // Load profile when component mounts
    onMounted(loadProfile);

    return {
      activeTab,
      user,
      loading,
      profileForm,
      updateLoading,
      updateSuccess,
      updateError,
      passwordForm,
      passwordLoading,
      passwordSuccess,
      passwordError,
      passwordsDoNotMatch,
      userInitials,
      updateProfile,
      changePassword,
      resetProfileForm,
      resetPasswordForm
    };
  }
});
</script>

<style scoped>
.profile-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
  text-align: center;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.profile-avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-avatar {
  margin-bottom: 1rem;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.user-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #1f2937;
}

.user-role {
  font-size: 1rem;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #6b7280;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left: 4px solid #4f46e5;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.profile-container {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.profile-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.tab-button {
  flex: 1;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  color: #6b7280;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-button:hover {
  color: #4f46e5;
  background-color: rgba(79, 70, 229, 0.05);
}

.tab-button.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
  background-color: white;
}

.tab-icon {
  margin-right: 0.5rem;
  font-style: normal;
}

.tab-content {
  padding: 2rem;
}

.tab-pane {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.info-card {
  background-color: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
}

.info-row {
  display: flex;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  width: 30%;
  font-weight: 500;
  color: #6b7280;
}

.info-value {
  width: 70%;
  color: #1f2937;
  word-break: break-word;
}

.notification-area {
  margin-bottom: 1.5rem;
}

.success-message,
.error-message {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  animation: slideIn 0.3s ease;
}

.success-message {
  background-color: #ecfdf5;
  color: #047857;
  border-left: 4px solid #10b981;
}

.error-message {
  background-color: #fef2f2;
  color: #b91c1c;
  border-left: 4px solid #ef4444;
}

.message-icon {
  margin-right: 0.75rem;
  font-style: normal;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-form {
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4b5563;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  font-style: normal;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-control:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
  outline: none;
}

.form-control.input-error {
  border-color: #ef4444;
}

.input-error-message,
.password-strength-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.input-error-message {
  color: #ef4444;
}

.password-strength-hint {
  color: #6b7280;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.submit-button,
.cancel-button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-button {
  background-color: #4f46e5;
  color: white;
  border: none;
  flex: 1;
}

.submit-button:hover:not(:disabled) {
  background-color: #4338ca;
}

.submit-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.cancel-button {
  background-color: white;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.cancel-button:hover {
  background-color: #f3f4f6;
}

.button-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid white;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .profile-view {
    padding: 1.5rem 1rem;
  }
  
  .tab-button {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .tab-content {
    padding: 1.5rem 1rem;
  }
  
  .info-row {
    flex-direction: column;
    padding: 0.75rem 1rem;
  }
  
  .info-label,
  .info-value {
    width: 100%;
  }
  
  .info-label {
    margin-bottom: 0.25rem;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .submit-button,
  .cancel-button {
    width: 100%;
  }
}
</style>