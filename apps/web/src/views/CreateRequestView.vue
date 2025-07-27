<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <Navbar />
    <div class="main-content">
      <Sidebar :collapsed="sidebarCollapsed" @update:collapsed="sidebarCollapsed = $event" />
      <div class="content">
        <!-- Enhanced Header with better visual hierarchy -->
        <div class="header-center-container">
          <div class="create-header">
            <div class="header-content">
              <div class="title-section">
                <div class="title-badge">
                  <span class="emoji">✨</span>
                  <span class="badge-text">New Request</span>
                </div>
                <h1 class="create-title">
                  Create Your Translation Request
                </h1>
                <p class="create-desc">
                  Start your journey by creating a new translation request. Fill in the details below and let our community help you!
                </p>
              </div>

            </div>
            <div class="header-illustration">
              <img src="https://illustrations.popsy.co/gray/web-design.svg" alt="Create Request" class="create-illustration" />
              <div class="floating-elements">
                <div class="floating-dot dot-1"></div>
                <div class="floating-dot dot-2"></div>
                <div class="floating-dot dot-3"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Enhanced Form Section -->
        <div class="form-card-row">
          <div class="create-form-card">
            <div class="form-header">
              <div class="form-progress">

                <div class="progress-line"></div>

              </div>
            </div>
            <CreateRequestForm @success="onSuccess" @cancel="onCancel" />
          </div>
        </div>

        <!-- Success Animation Overlay -->
        <div v-if="showSuccess" class="success-overlay">
          <div class="success-content">
            <div class="success-icon">🎉</div>
            <h2>Request Created Successfully!</h2>
            <p>Your translation request has been submitted. Redirecting to your requests...</p>
            <div class="loading-dots">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import CreateRequestForm from '../components/CreateRequestForm.vue';

const router = useRouter();
const showSuccess = ref(false);
const sidebarCollapsed = ref(false);

function onSuccess() {
  showSuccess.value = true;
  setTimeout(() => {
    router.push('/my-requests');
  }, 3000)
}

function onCancel() {
  router.back();
}
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.main-content {
  display: flex;
  flex: 1;
  width: 100vw;
  margin-left: 240px;
  transition: margin-left 0.2s cubic-bezier(.4, 0, .2, 1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
}

/* Responsive design */
@media (max-width: 1024px) {
  .main-content,
  .layout-wrapper.sidebar-collapsed .main-content {
    margin-left: 0;
  }

  .content {
    width: 100vw;
  }
}

/* Mobile view - ẩn sidebar */
@media (max-width: 768px) {
  .main-content,
  .layout-wrapper.sidebar-collapsed .main-content {
    margin-left: 0;
  }

  .content {
    width: 100vw;
  }
}

.content {
  flex: 1;
  width: calc(100vw - 240px);
  padding: 32px 0;
  background: transparent;
  position: relative;
  transition: width 0.2s cubic-bezier(.4, 0, .2, 1);
}

.layout-wrapper.sidebar-collapsed .content {
  width: calc(100vw - 72px);
}

.header-center-container {
  max-width: 1250px;
  margin: 0 auto 40px auto;
  padding: 0 32px;
  transition: margin-left 0.2s cubic-bezier(.4, 0, .2, 1);
}

.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08),
  0 8px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
}

.create-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border-radius: 24px 24px 0 0;
}

.header-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  width: fit-content;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.badge-text {
  font-size: 0.875rem;
  font-weight: 600;
}

.create-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.create-desc {
  color: #64748b;
  font-size: 1.125rem;
  margin: 0;
  line-height: 1.6;
  max-width: 500px;
}

.header-stats {
  display: flex;
  gap: 32px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.header-illustration {
  position: relative;
  flex-shrink: 0;
}

.create-illustration {
  width: 200px;
  height: auto;
  display: block;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.1));
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.floating-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  animation: float-dot 4s ease-in-out infinite;
}

.dot-1 {
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.dot-2 {
  top: 60%;
  right: 20%;
  animation-delay: 1.5s;
}

.dot-3 {
  bottom: 30%;
  left: 30%;
  animation-delay: 3s;
}

@keyframes float-dot {
  0%, 100% {
    transform: translateY(0px) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-15px) scale(1.2);
    opacity: 1;
  }
}

.form-card-row {
  width: 100%;
  margin-right: 2rem;
  display: flex;
  padding: 0 32px;
  justify-content: center;
  margin-top: 16px;
}

.create-form-card {
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1),
  0 10px 20px rgba(0, 0, 0, 0.05);
  padding: 0;
  margin-top: 0;
  width: 100%;
  max-width: 1200px;
  margin-left: 0;
  margin-right: 0;
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  overflow: hidden;
  position: relative;
}

.create-form-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
}

.form-header {
  padding: 32px 48px 24px 48px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.form-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.progress-step.active {
  opacity: 1;
}

.step-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.progress-step:not(.active) .step-icon {
  background: #e2e8f0;
  color: #64748b;
  box-shadow: none;
}

.step-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
}

.progress-step.active .step-text {
  color: #667eea;
}

.progress-line {
  width: 80px;
  height: 2px;
  background: #e2e8f0;
  border-radius: 1px;
}

/* Success Overlay */
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.success-content {
  background: white;
  border-radius: 24px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 24px;
  animation: bounce 1s ease;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.success-content h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.success-content p {
  color: #64748b;
  font-size: 1.125rem;
  margin: 0 0 32px 0;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.loading-dots .dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: loadingDot 1.4s ease-in-out infinite both;
}

.loading-dots .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loadingDot {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Responsive Design */
@media (max-width: 1200px) {
  .create-header {
    flex-direction: column;
    text-align: center;
    gap: 32px;
  }

  .header-stats {
    justify-content: center;
  }

  .create-title {
    font-size: 2rem;
  }

  .create-illustration {
    width: 150px;
  }
}

@media (max-width: 768px) {
  .header-center-container {
    padding: 0 16px;
  }

  .create-header {
    padding: 32px 24px;
    border-radius: 16px;
  }

  .create-title {
    font-size: 1.75rem;
  }

  .create-desc {
    font-size: 1rem;
  }

  .header-stats {
    flex-direction: column;
    gap: 16px;
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .form-card-row {
    padding: 0 16px;
  }

  .form-header {
    padding: 24px 24px 16px 24px;
  }

  .success-content {
    margin: 16px;
    padding: 32px 24px;
  }
}
</style>
