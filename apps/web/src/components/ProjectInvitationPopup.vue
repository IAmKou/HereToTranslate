<template>
  <Transition name="invitation-popup">
    <div v-if="show" class="project-invitation-popup">
      <div class="notification-header">
        <h3 class="notification-title">Recent Notifications</h3>
      </div>

      <div class="notification-content">
        <div class="notification-item">
          <div class="notification-icon">
            <span class="icon">👤✅</span>
          </div>

          <div class="notification-bubble">
            <div class="bubble-content">
              <p class="invitation-text">Bạn được mời tham gia dự án {{ invitation.project?.name || 'Unknown' }}.</p>
            </div>

            <div class="sender-info">
              <span class="sender-name">{{ invitation.invitedByUser?.fullName || invitation.invitedByUser?.username || 'Unknown' }}</span>
              <span v-if="invitation.invitedByUser?.username" class="sender-username">({{ invitation.invitedByUser.username }})</span>
            </div>

            <div class="invitation-english">
              You're invited to join the project {{ invitation.project?.name || 'Unknown' }}.
            </div>

            <div class="invitation-actions">
              <button
                class="join-project-btn"
                @click="acceptInvitation"
                :disabled="responding"
              >
                <span v-if="responding" class="loading-spinner-small"></span>
                <span v-else>Join Project</span>
              </button>
            </div>
          </div>

          <button class="dismiss-btn" @click="$emit('dismiss')">
            <span class="dismiss-icon">↑</span>
          </button>
        </div>
      </div>

      <div class="notification-footer">
        <a href="#" class="see-all-link" @click="$emit('see-all')">See All</a>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { projectInvitationService, type ProjectInvitation } from '../services/project-invitation.service';

interface Props {
  invitation: ProjectInvitation;
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'see-all'): void;
  (e: 'invitation-responded', invitation: ProjectInvitation): void;
}>();

const toast = useToast();
const responding = ref(false);

const acceptInvitation = async () => {
  responding.value = true;

  try {
    const result = await projectInvitationService.respondToInvitation(
      props.invitation.id,
      'accepted'
    );

    toast.add({
      severity: 'success',
      summary: 'Welcome!',
      detail: `You've successfully joined ${props.invitation.project?.name}`,
      life: 5000
    });

    emit('invitation-responded', result.invitation);
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to accept invitation',
      life: 5000
    });
  } finally {
    responding.value = false;
  }
};
</script>

<style scoped>
.project-invitation-popup {
  position: fixed;
  top: 80px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  max-width: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  z-index: 1000;
}

.notification-header {
  padding: 1rem 1.5rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.notification-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.notification-content {
  padding: 1rem 1.5rem;
}

.notification-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.notification-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  background: #f8fafc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-icon .icon {
  font-size: 1.2rem;
}

.notification-bubble {
  flex: 1;
  background: #e0f2fe;
  border-radius: 12px;
  padding: 1rem;
  position: relative;
}

.notification-bubble::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 1rem;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid #e0f2fe;
}

.bubble-content {
  margin-bottom: 0.75rem;
}

.invitation-text {
  margin: 0;
  color: #0c4a6e;
  font-size: 0.9rem;
  line-height: 1.4;
}

.sender-info {
  margin-bottom: 0.5rem;
}

.sender-name {
  color: #059669;
  font-weight: 600;
  font-size: 0.9rem;
}

.sender-username {
  color: #059669;
  font-size: 0.85rem;
  margin-left: 0.25rem;
}

.invitation-english {
  color: #0c4a6e;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  line-height: 1.3;
}

.invitation-actions {
  display: flex;
  justify-content: center;
}

.join-project-btn {
  background: #059669;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.join-project-btn:hover:not(:disabled) {
  background: #047857;
  transform: translateY(-1px);
}

.join-project-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner-small {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-radius: 50%;
  border-top-color: currentColor;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dismiss-btn {
  background: #f1f5f9;
  border: none;
  border-radius: 4px;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.dismiss-btn:hover {
  background: #e2e8f0;
}

.dismiss-icon {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: bold;
}

.notification-footer {
  padding: 0.75rem 1.5rem 1rem;
  border-top: 1px solid #f1f5f9;
  text-align: center;
}

.see-all-link {
  color: #059669;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.see-all-link:hover {
  text-decoration: underline;
}

/* Animation */
.invitation-popup-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.invitation-popup-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.invitation-popup-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.invitation-popup-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .project-invitation-popup {
    right: 12px;
    left: 12px;
    max-width: none;
  }
}
</style>
