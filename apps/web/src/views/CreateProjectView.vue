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
                  <span class="emoji">🚀</span>
                  <span class="badge-text">New Project</span>
                </div>
                <h1 class="create-title">
                  Create a New Project
                </h1>
                <p class="create-desc">
                  Start a new translation project. Fill in the details below and invite your team!
                </p>
              </div>
            </div>
            <div class="header-illustration">
              <img src="https://illustrations.popsy.co/gray/web-design.svg" alt="Create Project" class="create-illustration" />
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
            <CreateProjectForm @success="onSuccess" />
          </div>
        </div>

        <!-- Success Animation Overlay -->
        <Teleport to="body">
          <div v-if="showSuccess" class="success-overlay">
            <div class="success-content">
              <div class="success-icon">🎉</div>
              <h2>Project Created Successfully!</h2>
              <p>Your project has been created. Redirecting to your projects...</p>
              <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>
          </div>
        </Teleport>
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
import CreateProjectForm from '../components/CreateProjectForm.vue';

const router = useRouter();
const showSuccess = ref(false);
const sidebarCollapsed = ref(false);

function onSuccess() {
  showSuccess.value = true;
  setTimeout(() => {
    router.push('/projects');
  }, 3000)
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
  min-width: 0;
  padding-left: 220px;
  transition: padding-left 0.2s cubic-bezier(.4, 0, .2, 1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  padding-left: 60px;
}

/* Responsive design */
@media (max-width: 1024px) {
  .main-content,
  .layout-wrapper.sidebar-collapsed .main-content {
    padding-left: 0;
  }

  .content {
    width: 100%;
  }
}

/* Mobile view - ẩn sidebar */
@media (max-width: 768px) {
  .main-content,
  .layout-wrapper.sidebar-collapsed .main-content {
    padding-left: 0;
  }

  .content {
    width: 100%;
  }
}

.content {
  flex: 1;
  padding: 16px;
  min-width: 0;
  background: transparent;
  position: relative;
}

.header-center-container {
  max-width: 1000px;
  margin: 0 auto 0px auto;
  padding: 0;
}

.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px 24px 0 0;
  padding: 32px 48px 32px 48px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.10),
  0 8px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
  margin-bottom: 0px;
  min-width: 0;
}

.create-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border-radius: 24px 24px 0 0;
  z-index: 1;
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
  padding: 10px 22px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 600;
  width: fit-content;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.badge-text {
  font-size: 1rem;
  font-weight: 600;
}

.create-title {
  font-size: 2.7rem;
  font-weight: 800;
  color: #23272f;
  margin: 0;
  line-height: 1.3;
}

.create-desc {
  color: #6b7280;
  font-size: 1.25rem;
  margin: 0;
  line-height: 1.5;
  max-width: 500px;
}

.header-illustration {
  position: relative;
  flex-shrink: 0;
}

.create-illustration {
  width: 140px;
  height: auto;
  display: block;
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
  border-radius: 50%;
  background: #a5b4fc;
  opacity: 0.7;
  width: 14px; height: 14px;
  animation: floatDot 2.5s infinite ease-in-out;
}

.dot-1 { left: 10px; top: 10px; animation-delay: 0s; }
.dot-2 { right: 18px; top: 24px; animation-delay: 0.7s; }
.dot-3 { left: 40px; bottom: 12px; animation-delay: 1.2s; }
@keyframes floatDot {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.form-card-row {
  width: 100%;
  display: flex;
  padding: 0;
  justify-content: center;
  margin-top: -10px;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
}

.create-form-card {
  background: #fff;
  border-radius: 0 0 18px 18px;
  box-shadow: 0 2px 16px 0 rgba(60,60,60,0.08);
  padding: 36px 32px 32px 32px;
  margin-top: 0;
  width: 100%;
  margin-bottom: 0;
}







/* Ensure form content is visible */
.create-form-card > * {
  position: relative;
  z-index: 2;
}

.create-form-card .create-project-container {
  position: relative;
  z-index: 3;
}

/* Override any conflicting styles from CreateProjectForm */
.create-form-card :deep(.form-group) {
  position: relative;
  z-index: 4;
}

/* Fix multiselect layout */
.create-form-card :deep(.multiselect-custom .multiselect__tags) {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.5rem !important;
  min-height: auto !important;
}

.create-form-card :deep(.multiselect-custom .multiselect__tags-wrap) {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.25rem !important;
  margin-bottom: 0.5rem !important;
  min-height: auto !important;
}

.create-form-card :deep(.multiselect-custom .multiselect__input) {
  display: block !important;
  width: 100% !important;
  margin-top: 0.5rem !important;
  position: relative !important;
  z-index: 1 !important;
}

.create-form-card :deep(label) {
  color: #374151 !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  margin-bottom: 0.5rem !important;
  display: block !important;
}

.create-form-card :deep(input),
.create-form-card :deep(textarea) {
  color: #1f2937 !important;
  background-color: #ffffff !important;
  border: 1px solid #d1d5db !important;
  border-radius: 0.375rem !important;
  padding: 0.75rem !important;
  font-size: 0.875rem !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.create-form-card :deep(input:focus),
.create-form-card :deep(textarea:focus) {
  outline: none !important;
  border-color: #667eea !important;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .create-header {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .create-title {
    font-size: 1.5rem;
  }

  .create-illustration {
    width: 120px;
  }
}

@media (max-width: 768px) {
  .header-center-container {
    padding: 0 12px;
  }

  .create-header {
    padding: 20px 16px;
    border-radius: 12px;
  }

  .create-title {
    font-size: 1.375rem;
  }

  .create-desc {
    font-size: 0.875rem;
  }

  .form-card-row {
    padding: 0 12px;
  }
}

/* Success Overlay Styles */
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
}

.success-content {
  background: white;
  border-radius: 24px;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
  animation: slideIn 0.5s ease-out;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: bounce 1s ease-in-out;
}

.success-content h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.success-content p {
  color: #64748b;
  font-size: 1.1rem;
  margin: 0 0 2rem 0;
  line-height: 1.5;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: pulse 1.5s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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

@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>
