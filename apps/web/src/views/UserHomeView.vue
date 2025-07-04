<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import { ref, onMounted, computed } from 'vue';
import { UserProfile } from '../services/user.service';
import axiosInstance from '../api';

// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  tags?: Array<{ id: string; name: string }>;
}

const user = ref<UserProfile | null>(null);
const isLoadingUser = ref(false);
const projects = ref<Project[]>([]);
const isLoadingProjects = ref(false);
const projectsError = ref<string | null>(null);

const fetchUserData = async () => {
  try {
    isLoadingUser.value = true;
    const { data } = await axiosInstance.get('/auth/me');
    user.value = data;
  } catch (error) {
    console.error('Error fetching user data:', error);
  } finally {
    isLoadingUser.value = false;
  }
};


const fetchProjects = async () => {
  try {
    isLoadingProjects.value = true;
    projectsError.value = null;
    const { data } = await axiosInstance.get('/projects/me/projects');
    projects.value = data;
  } catch (err: any) {
    projectsError.value = 'Failed to load your projects.';
    console.error('Error fetching projects:', err);
  } finally {
    isLoadingProjects.value = false;
  }
};

// Computed properties for stats
const inProgressProjects = computed(() => {
  return projects.value.length;
});

const completedProjects = computed(() => {
  return 0;
});

const totalProjects = computed(() => {
  return projects.value.length;
});

// Format date helper
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Get time ago helper
const getTimeAgo = (date: string) => {
  const now = new Date();
  const projectDate = new Date(date);
  const diffInMs = now.getTime() - projectDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

onMounted(() => {
  fetchUserData();
  fetchProjects();
});


</script>

<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <main class="userhome-main">
          <!-- Greeting -->
          <div class="greeting-row">
            <span class="greeting-emoji">👋</span>
            <h1 class="greeting-title">
              Hello, <span class="greeting-name">{{ user?.fullName }}</span>! This is your dashboard.
            </h1>
          </div>
          <!-- Cards -->
          <div class="stats-row">
            <div class="stat-card stat-blue">
              <div class="stat-icon"><i class="pi pi-refresh"></i></div>
              <div>
                <div class="stat-number">{{ inProgressProjects }}</div>
                <div class="stat-label">In Progress</div>
              </div>
            </div>
            <div class="stat-card stat-green">
              <div class="stat-icon"><i class="pi pi-check"></i></div>
              <div>
                <div class="stat-number">{{ completedProjects }}</div>
                <div class="stat-label">Completed</div>
              </div>
            </div>
            <div class="stat-card stat-yellow">
              <div class="stat-icon"><i class="pi pi-box"></i></div>
              <div>
                <div class="stat-number">{{ totalProjects }}</div>
                <div class="stat-label">Total Projects</div>
              </div>
            </div>
          </div>
          <!-- Project Table -->
          <div class="project-table-wrap">
            <!-- Loading State -->
            <div v-if="isLoadingProjects" class="loading-container">
              <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Loading projects...</p>
              </div>
            </div>

            <!-- Error State -->
            <div v-else-if="projectsError" class="error-container">
              <div class="error-content">
                <div class="error-icon">
                  <i class="pi pi-exclamation-triangle"></i>
                </div>
                <h3>Oops! Something went wrong</h3>
                <p>{{ projectsError }}</p>
                <button @click="fetchProjects" class="btn btn-secondary">Try Again</button>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="projects.length === 0" class="empty-container">
              <div class="empty-content">
                <div class="empty-icon">
                  <i class="pi pi-folder-open"></i>
                </div>
                <h3>No projects found</h3>
                <p>Get started by creating your first project!</p>
                <router-link to="/projects/create" class="btn btn-primary">
                  <i class="pi pi-plus"></i>
                  Create Your First Project
                </router-link>
              </div>
            </div>

            <!-- Projects Table -->
            <table v-else class="project-table">
              <thead>
              <tr>
                <th>Project</th>
                <th>Source Words</th>
                <th>Language</th>
                <th>Issues</th>
                <th>Created</th>
                <th>Star</th>
                <th>More</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="project in projects" :key="project.id">
                <td>
                  <div class="project-name">
                    <router-link :to="`/projects/${project.id}`" class="project-link">{{ project.name }}</router-link>
                    <i v-if="!project.isPrivate" class="pi pi-lock project-lock"></i>
                  </div>
                  <div class="project-meta">
                    Updated {{ getTimeAgo(project.createdAt) }} • {{ project.createdBy.fullName || project.createdBy.username }}
                  </div>
                </td>
                <td class="text-center">
                  <span class="project-empty">No source words</span>
                </td>
                <td class="text-center">
                  <span class="project-empty">No languages</span>
                </td>
                <td class="text-center">
                  <span class="project-empty">-</span>
                </td>
                <td class="text-center">
                  <span class="project-value">{{ formatDate(project.createdAt) }}</span>
                </td>
                <td class="text-center">
                  <i class="pi pi-star text-gray-400"></i>
                </td>
                <td class="text-center">
                  <i class="pi pi-ellipsis-v text-gray-400"></i>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
    <Footer />
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  min-width: 0;
  padding-left: 16rem;
}

.content {
  flex: 1;
  padding: 20px;
  min-width: 0;
}

.user-home {
  padding: 20px;
  text-align: center;
}

.logout-btn {
  padding: 10px 20px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
}

.logout-btn:hover {
  background-color: #c82333;
}

.userhome-main {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 16px 0 rgba(60,60,60,0.08);
  max-width: 1700px;
  margin: 32px auto 0 auto;
  padding: 32px 32px 40px 32px;
}

.userhome-greeting {
  margin-bottom: 32px;
}

.userhome-greeting h1 {
  font-size: 2rem;
  font-weight: bold;
  color: #23272f;
  display: flex;
  align-items: center;
  gap: 12px;
}

.userhome-cards {
  display: flex;
  gap: 24px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.userhome-card {
  flex: 1 1 0;
  min-width: 220px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s;
  cursor: pointer;
  background: #f9fafb;
}

.userhome-card:hover {
  box-shadow: 0 4px 24px 0 rgba(60,60,60,0.12);
}

.userhome-card-content {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 0;
}

.userhome-card-icon {
  border-radius: 50%;
  padding: 14px;
  font-size: 2em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.userhome-card-icon-blue { background: #e0edff; color: #2563eb; }
.userhome-card-icon-green { background: #e6fbe7; color: #22c55e; }
.userhome-card-icon-gray { background: #e5e7eb; color: #6b7280; }

.userhome-card-number {
  font-size: 2.2em;
  font-weight: 800;
  line-height: 1;
}

.userhome-card-number-blue { color: #2563eb; }
.userhome-card-number-green { color: #22c55e; }
.userhome-card-number-gray { color: #6b7280; }

.userhome-card-label {
  font-size: 1em;
  color: #6b7280;
  margin-top: 2px;
}

.userhome-tablebox {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px 0 rgba(60,60,60,0.07);
  border: 1px solid #e5e7eb;
  padding: 28px 20px 20px 20px;
  margin-top: 8px;
}

.userhome-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.userhome-link {
  color: #2563eb;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
}

.userhome-link:hover {
  color: #1d4ed8;
}

.userhome-table-updated {
  font-size: 0.95em;
  color: #6b7280;
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
th, td {
  border-bottom: 1px solid #353945;
}
th {
  background: #23272f;
}
tr:last-child td {
  border-bottom: none;
}

.greeting-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 32px;
}
.greeting-emoji {
  font-size: 2.8rem;
}
.greeting-title {
  font-size: 2.1rem;
  font-weight: 800;
  color: #23272f;
}
.greeting-name {
  color: #2563eb;
}
.stats-row {
  display: flex;
  gap: 32px;
  margin-bottom: 36px;
  flex-wrap: wrap;
}
.stat-card {
  flex: 1 1 0;
  min-width: 220px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px 0 rgba(60,60,60,0.07);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px 28px;
  transition: box-shadow 0.2s;
}
.stat-card:hover {
  box-shadow: 0 6px 24px 0 rgba(60,60,60,0.13);
}
.stat-icon {
  border-radius: 50%;
  padding: 18px;
  font-size: 2.2em;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-blue { border-left: 6px solid #2563eb; }
.stat-blue .stat-icon { background: #e0edff; color: #2563eb; }
.stat-green { border-left: 6px solid #22c55e; }
.stat-green .stat-icon { background: #e6fbe7; color: #22c55e; }
.stat-yellow { border-left: 6px solid #eab308; }
.stat-yellow .stat-icon { background: #fef9c3; color: #eab308; }
.stat-number {
  font-size: 2.3em;
  font-weight: 800;
  line-height: 1;
}
.stat-label {
  font-size: 1.1em;
  color: #6b7280;
  margin-top: 2px;
}
.project-table-wrap {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px 0 rgba(60,60,60,0.07);
  border: 1px solid #e5e7eb;
  padding: 0;
  margin-top: 18px;
  overflow-x: auto;
}
.project-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.project-table thead tr {
  background: #23272f;
}
.project-table th, .project-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 1em;
}
.project-table th {
  color: #fff;
  font-weight: 700;
  text-align: left;
}
.project-table td {
  background: #fff;
  color: #23272f;
}
.project-table tr:last-child td {
  border-bottom: none;
}
.project-name {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
}
.project-link {
  color: #2563eb;
  text-decoration: none;
}
.project-link:hover {
  text-decoration: underline;
}
.project-lock {
  font-size: 1em;
  color: #6b7280;
}
.project-meta {
  font-size: 0.95em;
  color: #6b7280;
  margin-top: 2px;
}
.project-value {
  color: #23272f;
  font-weight: 500;
}
.project-empty {
  color: #b0b0b0;
  font-style: italic;
}
.text-center {
  text-align: center;
}

/* Loading, Error, and Empty States */
.loading-container,
.error-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 40px 20px;
}

.loading-content,
.error-content,
.empty-content {
  text-align: center;
  max-width: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.error-icon {
  color: #ef4444;
}

.empty-icon {
  color: #6b7280;
}

.loading-content p,
.error-content h3,
.error-content p,
.empty-content h3,
.empty-content p {
  margin: 10px 0;
  color: #6b7280;
}

.error-content h3,
.empty-content h3 {
  color: #23272f;
  font-size: 1.5rem;
  font-weight: 600;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

/* Đảm bảo Sidebar luôn width cố định, không bị co lại khi thu nhỏ màn hình */
.main-content > *:first-child {
  width: 16rem;
  min-width: 16rem;
  max-width: 16rem;
  flex-shrink: 0;
}
</style>
