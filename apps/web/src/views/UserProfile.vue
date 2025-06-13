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
              <label>Role</label>
              <p>{{ user.role?.name || 'Member' }}</p>
            </div>
            <div class="info-item">
              <label>Member Since</label>
              <p>{{ formatDate(user.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { userService, UserProfile } from '../services/user.service';
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
      createdAt: new Date()
    });

    const userInitials = computed(() => {
      if (!user.value.fullName) return '';
      return user.value.fullName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase();
    });

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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
        // TODO: Handle error appropriately (e.g., redirect to login)
      }
    };

    onMounted(() => {
      fetchUserData();
    });

    return {
      user,
      userInitials,
      formatDate
    };
  }
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
</style>
