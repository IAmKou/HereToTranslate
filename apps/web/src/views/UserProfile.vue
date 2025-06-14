<template>
  <div class="user-profile">
    <div class="profile-container">
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar">
            {{ userInitials }}
          </div>
          <h2>{{ user.fullName }}</h2>
          <p class="username">@{{ user.username }}</p>
        </div>
      </div>

      <div class="profile-content">
        <div class="profile-section">
          <h3>Personal Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Email</label>
              <p>{{ user.email }}</p>
            </div>
            <div class="info-item">
              <label>Phone</label>
              <p>{{ user.phone }}</p>
            </div>
            <div class="info-item">
              <label>Member Since</label>
              <p>{{ formatDate(user.createdAt) }}</p>
            </div>
          </div>
          <button @click="showUpdateForm = !showUpdateForm" class="btn-secondary">
            {{ showUpdateForm ? 'Cancel Update' : 'Update Profile' }}
          </button>
        </div>

        <div v-if="showUpdateForm" class="profile-section">
          <h3>Update Profile</h3>
          <form @submit.prevent="updateProfile" class="update-form">
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <input type="text" id="fullName" v-model="updateForm.fullName" :placeholder="user.fullName" />
            </div>
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" v-model="updateForm.phone" :placeholder="user.phone" />
            </div>
            <button type="submit" class="btn-primary">Save Changes</button>
          </form>
        </div>

        <div class="profile-section">
          <h3>Change Password</h3>
          <button @click="showPasswordForm = !showPasswordForm" class="btn-secondary">
            {{ showPasswordForm ? 'Cancel' : 'Change Password' }}
          </button>
          <form v-if="showPasswordForm" @submit.prevent="changePassword" class="update-form">
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input type="password" id="currentPassword" v-model="passwordForm.currentPassword" required />
            </div>
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input type="password" id="newPassword" v-model="passwordForm.newPassword" required />
            </div>
            <button type="submit" class="btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import {
  userService,
  UserProfile,
  UpdateProfileData,
  ChangePasswordData,
} from '../services/user.service';
import { authService } from '../services/auth.service';

export default defineComponent({
  name: 'UserProfile',
  setup() {
    const user = ref<UserProfile>({
      id: BigInt(0),
      username: '',
      email: '',
      phone: '',
      fullName: '',
      role: null,
      createdAt: new Date(),
    });

    const showUpdateForm = ref(false);
    const showPasswordForm = ref(false);

    const updateForm = ref<UpdateProfileData>({
      fullName: '',
      phone: '',
    });

    const passwordForm = ref<ChangePasswordData>({
      currentPassword: '',
      newPassword: '',
    });

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
        if (!authService.isAuthenticated()) {
          throw new Error('User is not authenticated');
        }
        user.value = await userService.getUserProfile();
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const updateProfile = async () => {
      try {
        const updatedUser = await userService.updateProfile(updateForm.value);
        user.value = updatedUser;
        updateForm.value = {
          fullName: '',
          phone: '',
        };
        showUpdateForm.value = false;
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      }
    };

    const changePassword = async () => {
      try {
        await userService.changePassword(passwordForm.value);
        passwordForm.value = {
          currentPassword: '',
          newPassword: '',
        };
        showPasswordForm.value = false;
        alert('Password changed successfully!');
      } catch (error) {
        console.error('Error changing password:', error);
        alert(
          'Failed to change password. Please check your current password and try again.'
        );
      }
    };

    onMounted(() => {
      fetchUserData();
    });

    return {
      user,
      userInitials,
      formatDate,
      updateForm,
      passwordForm,
      updateProfile,
      changePassword,
      showUpdateForm,
      showPasswordForm,
    };
  },
});
</script>

<style scoped>
.user-profile {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.profile-header {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  padding: 3rem 2rem;
  color: white;
  text-align: center;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 120px;
  height: 120px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: bold;
  color: #4f46e5;
}

.username {
  opacity: 0.8;
  font-size: 1.1rem;
}

.profile-content {
  padding: 2rem;
}

.profile-section {
  margin-bottom: 2rem;
}

.profile-section h3 {
  color: #1f2937;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
}

.info-item label {
  display: block;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.info-item p {
  color: #1f2937;
  font-weight: 500;
}

@media (max-width: 768px) {
  .user-profile {
    padding: 1rem;
  }

  .profile-header {
    padding: 2rem 1rem;
  }

  .avatar {
    width: 100px;
    height: 100px;
    font-size: 2rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}

.update-form {
  max-width: 500px;
  margin-top: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4b5563;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.15s ease-in-out;
}

.form-group input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.btn-primary {
  background: #4f46e5;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.btn-primary:hover {
  background: #4338ca;
}

.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.75rem 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  margin-top: 1rem;
}

.btn-secondary:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.btn-secondary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
}
</style>
