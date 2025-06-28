<template>
  <div class="layout-wrapper">
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="create-request-container">
          <!-- Header -->
          <div class="create-header">
            <div>
              <h1 class="create-title">
                <span class="emoji">📝</span> Create New Request
              </h1>
              <p class="create-desc">
                Start a new translation request. Fill in the details below !
              </p>
            </div>
            <!-- Optional illustration or icon -->
            <img src="https://illustrations.popsy.co/gray/web-design.svg" alt="Create Request" class="create-illustration" />
          </div>
          <!-- Form Card -->
          <div class="create-form-card">
            <CreateRequestForm @success="onSuccess" @cancel="onCancel" />
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import CreateRequestForm from '../components/CreateRequestForm.vue';

function onSuccess() {
  setTimeout(() => {
    window.location.href = '/my-requests'
  }, 2000)
}

function onCancel() {
  window.history.back()
}
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
.create-request-container {
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
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.emoji {
  font-size: 2.5rem;
}
.create-desc {
  font-size: 1.1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}
.create-illustration {
  width: 200px;
  height: auto;
  opacity: 0.8;
}
.create-form-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
</style>
