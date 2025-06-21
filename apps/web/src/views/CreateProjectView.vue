<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="create-project-container">
          <!-- Header -->
          <div class="create-header">
            <div>
              <h1 class="create-title">
                <span class="emoji">🚀</span> Create a New Project
              </h1>
              <p class="create-desc">
                Start a new translation project. Fill in the details below and invite your team!
              </p>
            </div>
            <!-- Optional illustration or icon -->
            <img src="https://illustrations.popsy.co/gray/web-design.svg" alt="Create Project" class="create-illustration" />
          </div>
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
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import CreateProjectForm from '../components/CreateProjectForm.vue';

export default defineComponent({
  name: 'CreateProjectView',
  components: {
    Sidebar,
    TopNavbar,
    Footer,
    CreateProjectForm,
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
}
.content {
  flex: 1;
  padding: 32px 20px;
  background: #f6f8fa;
}
.create-project-container {
  max-width: 700px;
  margin: 0 auto;
}
.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 32px;
}
.create-title {
  font-size: 2.2rem;
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
  font-size: 1.1rem;
  margin-bottom: 0;
}
.create-illustration {
  width: 120px;
  height: auto;
  display: block;
}
.create-form-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 16px 0 rgba(60,60,60,0.08);
  padding: 36px 32px 32px 32px;
  margin-top: 0;
}
</style>
