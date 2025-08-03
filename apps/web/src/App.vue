<template>
  <div class="app-layout">
    <Toast position="top-right" />
    <router-view />

    <!-- Project Invitation Popup - Disabled to avoid duplicate notifications -->
    <!-- <ProjectInvitationPopup
      v-if="showInvitationPopup"
      :invitation="currentInvitation"
      :show="showInvitationPopup"
      @dismiss="dismissInvitationPopup"
      @see-all="navigateToInvitations"
      @invitation-responded="handleInvitationResponse"
    /> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from './services/auth.service';
import { projectInvitationService, type ProjectInvitation } from './services/project-invitation.service';
import ProjectInvitationPopup from './components/ProjectInvitationPopup.vue';

const router = useRouter();
const showInvitationPopup = ref(false);
const currentInvitation = ref<ProjectInvitation | null>(null);
let invitationCheckInterval: NodeJS.Timeout | null = null;

const checkForNewInvitations = async () => {
  try {
    const response = await projectInvitationService.getMyInvitations('pending');
    if (response.invitations.length > 0 && !showInvitationPopup.value) {
      // Show the first pending invitation
      currentInvitation.value = response.invitations[0];
      showInvitationPopup.value = true;

      // Auto hide after 10 seconds
      setTimeout(() => {
        dismissInvitationPopup();
      }, 10000);
    }
  } catch (error) {
    console.error('Error checking for invitations:', error);
  }
};

const dismissInvitationPopup = () => {
  showInvitationPopup.value = false;
  currentInvitation.value = null;
};

const navigateToInvitations = () => {
  router.push('/project-invitations');
  dismissInvitationPopup();
};

const handleInvitationResponse = (invitation: ProjectInvitation) => {
  dismissInvitationPopup();
  // Check for more invitations
  setTimeout(checkForNewInvitations, 1000);
};

onMounted(() => {
  // Temporarily disable getCurrentUser to debug login issue
  // authService.getCurrentUser();

  // Check for invitations every 30 seconds - Disabled to avoid duplicate notifications
  // invitationCheckInterval = setInterval(checkForNewInvitations, 30000);

  // Initial check after 5 seconds - Disabled to avoid duplicate notifications
  // setTimeout(checkForNewInvitations, 5000);
});

onUnmounted(() => {
  if (invitationCheckInterval) {
    clearInterval(invitationCheckInterval);
  }
});
</script>

<style>
/* Reset CSS */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background-color: #f9f9f9;
}

/* Layout styles */
.app-layout {
  min-height: 100vh;
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Utility classes */
.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-left {
  text-align: left;
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.p-2 {
  padding: 0.5rem;
}

.p-4 {
  padding: 1rem;
}

.rounded {
  border-radius: 0.25rem;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.shadow {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Responsive */
@media (max-width: 768px) {
  .p-4 {
    padding: 0.75rem;
  }
}

body.modal-open .header,
body.modal-open .sidebar {
  z-index: 10 !important;
}
</style>
