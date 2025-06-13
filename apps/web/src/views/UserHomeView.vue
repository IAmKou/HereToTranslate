<script setup lang="ts">
import { ref } from 'vue';
import { authService } from '../services/auth.service';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const toast = useToast();

const user = ref({
  name: 'John Doe',
  avatar: 'https://via.placeholder.com/150',
  role: 'Translator',
  languages: ['English', 'Vietnamese', 'Japanese'],
  completedProjects: 89,
  accuracy: '98%'
});

const projects = ref([
  {
    id: 1,
    name: 'Website Localization',
    progress: 75,
    sourceLanguage: 'English',
    targetLanguage: 'Vietnamese',
    strings: 1250,
    translated: 938,
    lastActivity: '2 hours ago'
  },
  {
    id: 2,
    name: 'Mobile App Translation',
    progress: 45,
    sourceLanguage: 'English',
    targetLanguage: 'Japanese',
    strings: 850,
    translated: 382,
    lastActivity: '5 hours ago'
  },
  {
    id: 3,
    name: 'Documentation',
    progress: 90,
    sourceLanguage: 'English',
    targetLanguage: 'Vietnamese',
    strings: 500,
    translated: 450,
    lastActivity: '1 day ago'
  }
]);

const handleLogout = async () => {
  try {
    await authService.logout();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Logged out successfully',
      life: 3000
    });
    router.push('/login');
  } catch (error) {
    console.error('Logout failed:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to logout',
      life: 3000
    });
  }
};

const getProgressColor = (progress: number) => {
  if (progress >= 90) return '#28a745';
  if (progress >= 60) return '#17a2b8';
  if (progress >= 30) return '#ffc107';
  return '#dc3545';
};
</script>

<template>
  <div class="user-home">
    <!-- Top Navigation -->
    <nav class="top-nav">
      <div class="nav-left">
        <img src="../assets/logo.png" alt="Logo" class="logo" />
        <div class="nav-links">
          <a href="#" class="active">Projects</a>
          <a href="#">Strings</a>
          <a href="#">Glossary</a>
          <a href="#">Reports</a>
        </div>
      </div>
      <div class="nav-right">
        <div class="user-menu">
          <img :src="user.avatar" :alt="user.name" class="avatar" />
          <div class="user-dropdown">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-role">{{ user.role }}</span>
          </div>
        </div>
        <button @click="handleLogout" class="logout-btn">
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Welcome Section -->
      <section class="welcome-section">
        <div class="welcome-content">
          <h1>Welcome back, {{ user.name }}</h1>
          <div class="user-stats">
            <div class="stat">
              <span class="stat-value">{{ user.completedProjects }}</span>
              <span class="stat-label">Completed Projects</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ user.accuracy }}</span>
              <span class="stat-label">Translation Accuracy</span>
            </div>
          </div>
        </div>
        <div class="language-badges">
          <span v-for="lang in user.languages" :key="lang" class="language-badge">
            {{ lang }}
          </span>
        </div>
      </section>

      <!-- Projects Section -->
      <section class="projects-section">
        <div class="section-header">
          <h2>Your Projects</h2>
          <button class="new-project-btn">
            <i class="pi pi-plus"></i>
            New Project
          </button>
        </div>

        <div class="projects-grid">
          <div v-for="project in projects" :key="project.id" class="project-card">
            <div class="project-header">
              <h3>{{ project.name }}</h3>
              <div class="project-languages">
                <span class="language">{{ project.sourceLanguage }}</span>
                <i class="pi pi-arrow-right"></i>
                <span class="language">{{ project.targetLanguage }}</span>
              </div>
            </div>

            <div class="project-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${project.progress}%`, backgroundColor: getProgressColor(project.progress) }"
                ></div>
              </div>
              <span class="progress-text">{{ project.progress }}%</span>
            </div>

            <div class="project-stats">
              <div class="stat">
                <i class="pi pi-list"></i>
                <span>{{ project.strings }} strings</span>
              </div>
              <div class="stat">
                <i class="pi pi-check"></i>
                <span>{{ project.translated }} translated</span>
              </div>
              <div class="stat">
                <i class="pi pi-clock"></i>
                <span>{{ project.lastActivity }}</span>
              </div>
            </div>

            <div class="project-actions">
              <button class="action-btn">
                <i class="pi pi-pencil"></i>
                Continue Translation
              </button>
              <button class="action-btn secondary">
                <i class="pi pi-eye"></i>
                View Details
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.user-home {
  min-height: 100vh;
  background-color: #f8f9fa;
}

/* Top Navigation */
.top-nav {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo {
  height: 100px;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  color: #6c757d;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 0;
  position: relative;
}

.nav-links a.active {
  color: #2c3e50;
}

.nav-links a.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #2c3e50;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-dropdown {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  color: #2c3e50;
}

.user-role {
  font-size: 0.875rem;
  color: #6c757d;
}

.logout-btn {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.3s;
}

.logout-btn:hover {
  background-color: #f8f9fa;
  color: #2c3e50;
}

/* Main Content */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Welcome Section */
.welcome-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.welcome-content h1 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.user-stats {
  display: flex;
  gap: 2rem;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.stat-label {
  color: #6c757d;
  font-size: 0.875rem;
}

.language-badges {
  display: flex;
  gap: 0.5rem;
}

.language-badge {
  background: #e9ecef;
  color: #2c3e50;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Projects Section */
.projects-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  margin: 0;
  color: #2c3e50;
}

.new-project-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #2c3e50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.new-project-btn:hover {
  background: #1a252f;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.project-header {
  margin-bottom: 1rem;
}

.project-header h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.project-languages {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.project-progress {
  margin-bottom: 1rem;
}

.progress-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: #6c757d;
}

.project-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.project-stats .stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.project-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.action-btn:not(.secondary) {
  background: #2c3e50;
  color: white;
}

.action-btn:not(.secondary):hover {
  background: #1a252f;
}

.action-btn.secondary {
  background: #e9ecef;
  color: #2c3e50;
}

.action-btn.secondary:hover {
  background: #dee2e6;
}

@media (max-width: 768px) {
  .top-nav {
    padding: 1rem;
  }

  .nav-links {
    display: none;
  }

  .main-content {
    padding: 1rem;
  }

  .welcome-section {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .user-stats {
    justify-content: center;
  }

  .language-badges {
    justify-content: center;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .project-actions {
    flex-direction: column;
  }
}
</style>
