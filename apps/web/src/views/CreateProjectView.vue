<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <Navbar />
    <div class="main-content">
      <Sidebar :collapsed="sidebarCollapsed" @update:collapsed="sidebarCollapsed = $event" />
      <div class="content">
        <!-- Header (giống bên request, full width) -->
        <div class="header-center-container">
          <div class="create-header big-header">
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
        <div class="create-project-container">
          <!-- Form Card -->
          <div class="create-form-card">
            <CreateProjectForm />
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import CreateProjectForm from '../components/CreateProjectForm.vue';

export default defineComponent({
  name: 'CreateProjectView',
  components: {
    Sidebar,
    Navbar,
    Footer,
    CreateProjectForm,
  },
  data() {
    return {
      sidebarCollapsed: false,
    };
  },
});
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main-content {
  display: flex;
  flex: 1;
  width: 100vw;

  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.content {
  flex: 1;
  padding: 32px 20px;
  background: #f6f8fa;
}
.create-project-container {
  max-width: 1200px;
  width: 100%;
  margin-left: 10rem;
  margin-top: 0px;
  padding: 0 32px;
}
.header-center-container {
  max-width: 1200px;
  margin: 0 auto 0 auto;
  padding: 0 0 0 0;
  margin-left: 240px;
  transition: margin-left 0.2s cubic-bezier(.4,0,.2,1);
}

.layout-wrapper.sidebar-collapsed .header-center-container {
  margin-left: 72px;
}

@media (max-width: 1024px) {
  .main-content {
    margin-left: 72px;
  }
  .content {
    width: calc(100vw - 72px);
  }
  .header-center-container,
  .layout-wrapper.sidebar-collapsed .header-center-container {
    margin-left: 0;
  }
}
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
  .content {
    width: 100vw;
  }
}
.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px;
  padding: 32px 48px 32px 48px;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.10),
    0 8px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
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
}
.big-header {
  min-width: 0;
  width: 100%;
  min-height: 180px;
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
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.emoji {
  font-size: 2.2rem;
}
.create-desc {
  color: #6b7280;
  font-size: 1.25rem;
  margin-bottom: 0;
}
.header-illustration {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.create-illustration {
  width: 140px;
  height: auto;
  display: block;
}
.floating-elements {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
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
.create-form-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 16px 0 rgba(60,60,60,0.08);
  padding: 36px 32px 32px 32px;
  margin-top: 0;
  width: 100%;
}
</style>
