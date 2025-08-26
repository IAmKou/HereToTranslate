<template>
  <div class="paypal-cancel-wrapper">
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <!-- Cancel Header -->
        <div class="cancel-header">
          <div class="cancel-icon">
            <i class="pi pi-times-circle"></i>
          </div>
          <h1>Final Payment Cancelled</h1>
          <p>You have cancelled the final 50% payment</p>
        </div>

        <!-- Cancel Details Card -->
        <div class="cancel-details-card">
          <h3><i class="pi pi-info-circle"></i> What Happened?</h3>

          <div class="cancel-info">
            <div class="info-item">
              <i class="pi pi-exclamation-triangle"></i>
              <div class="info-content">
                <h4>Payment Not Processed</h4>
                <p>Your final 50% payment was not completed. No charges were made to your account.</p>
              </div>
            </div>

            <div class="info-item">
              <i class="pi pi-shield"></i>
              <div class="info-content">
                <h4>Initial Deposit Still Held</h4>
                <p>Your initial 50% deposit remains safely held in the system and has not been released.</p>
              </div>
            </div>

            <div class="info-item">
              <i class="pi pi-clock"></i>
              <div class="info-content">
                <h4>Request Status Unchanged</h4>
                <p>The translation request remains in "Waiting Approval" status until final payment is completed.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Steps Card -->
        <div class="next-steps-card">
          <h3><i class="pi pi-arrow-right"></i> What Can You Do Next?</h3>

          <div class="steps-list">
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Review Translation</h4>
                <p>Go back to the translation handover page to review the completed work.</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Complete Final Payment</h4>
                <p>When you're ready, you can complete the final 50% payment to finish the request.</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Contact Support</h4>
                <p>If you have any questions or need assistance, contact our support team.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button @click="goToTranslationHandover" class="btn btn-primary">
            <i class="pi pi-arrow-left"></i>
            Back to Translation Review
          </button>

          <button @click="goToMyRequests" class="btn btn-secondary">
            <i class="pi pi-list"></i>
            View My Requests
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';

const router = useRouter();

function goToTranslationHandover() {
  // Extract requestId from URL if available, otherwise go to my-requests
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('requestId');

  if (requestId) {
    router.push(`/translation-handover/${requestId}`);
  } else {
    router.push('/my-requests');
  }
}

function goToMyRequests() {
  router.push('/my-requests');
}
</script>

<style scoped>
.paypal-cancel-wrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.main-content {
  display: flex;
  min-height: calc(100vh - 60px);
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  margin-left: 250px;
}

.cancel-header {
  text-align: center;
  margin-bottom: 3rem;
  color: white;
}

.cancel-icon {
  font-size: 4rem;
  color: #ef4444;
  margin-bottom: 1rem;
}

.cancel-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.cancel-header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.cancel-details-card,
.next-steps-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.cancel-details-card h3,
.next-steps-card h3 {
  margin-bottom: 1.5rem;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-details-card h3 i,
.next-steps-card h3 i {
  color: #f093fb;
}

.cancel-info {
  display: grid;
  gap: 1.5rem;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.info-item i {
  font-size: 1.5rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.info-content h4 {
  margin: 0 0 0.5rem 0;
  color: #991b1b;
}

.info-content p {
  margin: 0;
  color: #7f1d1d;
  line-height: 1.6;
}

.steps-list {
  display: grid;
  gap: 1.5rem;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.step-number {
  width: 2rem;
  height: 2rem;
  background: #f093fb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
}

.step-content p {
  margin: 0;
  color: #718096;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(240, 147, 251, 0.3);
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-left: 0;
  }

  .cancel-header h1 {
    font-size: 2rem;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
