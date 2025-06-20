<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
      <Sidebar />
      <div class="content">
        <div class="projects-container">
          <div class="header-filters-wrapper">
            <!-- Enhanced Header -->
            <div class="projects-header" :class="{ 'header-animated': isHeaderVisible }">
              <div class="header-content">
                <div class="header-left">
                  <div class="icon-circle">
                    <div class="icon-inner">
                      <i class="pi pi-folder header-icon" />
                    </div>
                    <div class="icon-glow"></div>
                  </div>
                  <div class="header-text">
                    <h1 class="projects-title">Projects</h1>
                    <p class="projects-desc">
                      Manage and collaborate on your translation projects
                    </p>
                    <div class="header-stats">
                      <div class="stat-item">
                        <i class="pi pi-users stat-icon"></i>
                        <span>{{ projects.length }} Projects</span>
                      </div>
                      <div class="stat-item">
                        <i class="pi pi-clock stat-icon"></i>
                        <span>Active collaboration</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="header-actions">
                  <router-link
                    to="/projects/create"
                    class="btn btn-primary create-btn"
                  >
                    <i class="pi pi-plus"></i>
                    Create New Project
                  </router-link>
                </div>
              </div>
            </div>

            <!-- Enhanced Filters -->
            <div class="filters-container" :class="{ 'filters-animated': isFiltersVisible }">
              <div class="filters">
                <div class="search-container">
                  <div class="search-wrapper">
                    <i class="pi pi-search search-icon"></i>
                    <input
                      v-model="searchQuery"
                      type="text"
                      placeholder="Search projects..."
                      class="search-input"
                    >
                  </div>
                </div>
                <div class="filter-options">
                  <select v-model="visibilityFilter" class="filter-select">
                    <option value="">All Projects</option>
                    <option value="public">Public Only</option>
                    <option value="private">Private Only</option>
                  </select>
                  <select v-model="sortBy" class="filter-select">
                    <option value="createdAt">Sort by Date</option>
                    <option value="name">Sort by Name</option>
                    <option value="updatedAt">Sort by Updated</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="loading"
            class="loading-container"
          >
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <p>Loading projects...</p>
            </div>
          </div>

          <!-- Error State -->
          <div
            v-else-if="error"
            class="error-container"
          >
            <div class="error-content">
              <div class="error-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h3>Oops! Something went wrong</h3>
              <p>{{ error }}</p>
              <button @click="loadProjects" class="btn btn-secondary">Try Again</button>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="filteredProjects.length === 0"
            class="empty-container"
          >
            <div class="empty-content">
              <div class="empty-icon">
                <i class="pi pi-folder-open"></i>
              </div>
              <h3>No projects found</h3>
              <p v-if="searchQuery || visibilityFilter">
                No projects match your current filters. Try adjusting your search criteria.
              </p>
              <p v-else>
                Get started by creating your first project!
              </p>
              <router-link to="/projects/create" class="btn btn-primary">
                <i class="pi pi-plus"></i>
                Create Your First Project
              </router-link>
            </div>
          </div>

          <!-- Projects Grid -->
          <div
            v-else
            class="projects-grid-container"
            :class="{ 'grid-animated': isGridVisible }"
          >
            <div class="projects-grid">
              <div
                v-for="(project, index) in filteredProjects"
                :key="String(project.id)"
                class="project-card"
                :class="{ 'card-animated': true }"
                :style="{ animationDelay: `${index * 0.1}s` }"
                @click="viewProject(project.id)"
              >
                <div class="project-header">
                  <h3>{{ project.name }}</h3>
                  <div class="project-badges">
                    <span v-if="project.isPublic" class="badge badge-public">
                      <i class="pi pi-globe"></i>
                      Public
                    </span>
                    <span v-else class="badge badge-private">
                      <i class="pi pi-lock"></i>
                      Private
                    </span>
                  </div>
                </div>

                <p
                  v-if="project.description"
                  class="description"
                >
                  {{ project.description }}
                </p>

                <div v-if="project.tags && project.tags.length > 0" class="tags">
                  <span
                    v-for="tag in project.tags.slice(0, 3)"
                    :key="tag.id"
                    class="tag"
                  >
                    {{ tag.name }}
                  </span>
                  <span v-if="project.tags.length > 3" class="tag-more">
                    +{{ project.tags.length - 3 }} more
                  </span>
                </div>
    <div
      v-else
      class="projects-grid"
    >
      <div
        v-for="project in filteredProjects"
        :key="String(project.id)"
        class="project-card"
        @click="viewProject(project.id)"
      >
        <div class="project-header">
          <h3>{{ project.name }}</h3>
          <div class="project-badges">
            <span v-if="project.isPublic" class="badge badge-public">Public</span>
            <span v-else class="badge badge-private">Private</span>
          </div>
        </div>

        <p
          v-if="project.description"
          class="description"
        >
          {{ project.description }}
        </p>

        <div v-if="project.tags && project.tags.length > 0" class="tags">
          <span
            v-for="tag in project.tags.slice(0, 3)"
            :key="tag.id"
            class="tag"
          >
            {{ tag.name }}
          </span>
          <span v-if="project.tags.length > 3" class="tag-more">
            +{{ project.tags.length - 3 }} more
          </span>
        </div>

                <div class="project-meta">
                  <div class="meta-item">
                    <i class="pi pi-user meta-icon"></i>
                    <span class="meta-value">{{ project.createdBy.username }}</span>
                  </div>
                  <div class="meta-item">
                    <i class="pi pi-calendar meta-icon"></i>
                    <span class="meta-value">{{ formatDate(project.createdAt) }}</span>
                  </div>
                </div>

                <div class="project-actions">
                  <button class="btn btn-outline" @click.stop="editProject(project.id)">
                    <i class="pi pi-pencil"></i>
                    Edit
                  </button>
                  <button class="btn btn-outline" @click.stop="manageProject(project.id)">
                    <i class="pi pi-cog"></i>
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import { authService } from '../services/auth.service';
import { isSidebarCollapsed } from '../store/sidebar';

// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  tags?: Array<{ id: string; name: string }>;
}

export default defineComponent({
  name: 'ProjectsView',
  components: {
    Sidebar,
    TopNavbar,
    Footer,
  },
  setup() {
    const router = useRouter();
    const projects = ref<Project[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const searchQuery = ref('');
    const visibilityFilter = ref('');
    const sortBy = ref('createdAt');
    const isHeaderVisible = ref(false);
    const isFiltersVisible = ref(false);
    const isGridVisible = ref(false);

    // Animation triggers
    onMounted(() => {
      setTimeout(() => {
        isHeaderVisible.value = true;
      }, 100);
      setTimeout(() => {
        isFiltersVisible.value = true;
      }, 300);
      setTimeout(() => {
        isGridVisible.value = true;
      }, 500);
    });

    // API helper function
    const apiCall = async (endpoint: string, options: RequestInit = {}) => {
      const token = authService.getAccessToken()
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }

      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`)
      }

      return response.json()
    }

    const loadProjects = async () => {
      try {
        loading.value = true;
        error.value = null;

        const data = await apiCall(`/me/projects`);
        projects.value = data;

      } catch (err: any) {
        error.value = 'Failed to load your projects.';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const filteredProjects = computed(() => {
      let filtered = projects.value;

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(project =>
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query) ||
          project.tags?.some(tag => tag.name.toLowerCase().includes(query))
        );
      }

      // Apply visibility filter
      if (visibilityFilter.value === 'public') {
        filtered = filtered.filter(project => project.isPublic);
      } else if (visibilityFilter.value === 'private') {
        filtered = filtered.filter(project => !project.isPublic);
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortBy.value) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'updatedAt':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      return filtered;
    });

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const viewProject = (projectId: string) => {
      router.push(`/projects/${projectId}`);
    };

    const editProject = (projectId: string) => {
      router.push(`/projects/${projectId}/edit`);
    };

    const manageProject = (projectId: string) => {
      router.push(`/projects/${projectId}/manage`);
    };

    onMounted(loadProjects);

    return {
      projects,
      loading,
      error,
      searchQuery,
      visibilityFilter,
      sortBy,
      filteredProjects,
      formatDate,
      loadProjects,
      viewProject,
      editProject,
      manageProject,
      isHeaderVisible,
      isFiltersVisible,
      isGridVisible,
      isSidebarCollapsed,
    };
  },
});
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.main-content {
  display: flex;
  flex: 1;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 260px;
}

.main-content.sidebar-collapsed {
  margin-left: 70px;
}

.content {
  flex: 1;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 80px);
  transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.projects-container {
  max-width: none;
  margin: 0;
  position: relative;
  padding-left: 0;
}

.header-filters-wrapper {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 1.5rem;
  overflow: hidden;
}

/* Enhanced Header Styles */
.projects-header {
  padding: 1.75rem 2rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-animated {
  opacity: 1;
  transform: translateY(0);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  flex: 1;
}

.icon-circle {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  animation: pulse 2s infinite;
}

.icon-inner {
  background: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-glow {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.3;
  animation: glow 3s ease-in-out infinite alternate;
}

.header-icon {
  font-size: 2.5rem;
  color: #667eea;
  z-index: 1;
}

.header-text {
  flex: 1;
}

.projects-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
  line-height: 1.2;
}

.projects-desc {
  color: #64748b;
  font-size: 1.2rem;
  margin-bottom: 24px;
  line-height: 1.6;
}

.header-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(102, 126, 234, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 500;
}

.stat-icon {
  font-size: 1rem;
  color: #10b981;
}

.header-actions {
  display: flex;
  align-items: center;
}

.create-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
}

/* Filters Container */
.filters-container {
  padding: 1.25rem 2rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.2s;
}

.filters-animated {
  opacity: 1;
  transform: translateY(0);
}

.filters {
  display: flex;
  gap: 20px;
  align-items: center;
}

.search-container {
  flex: 1;
  max-width: 400px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  left: 16px;
  color: #a0aec0;
  font-size: 1.1rem;
}

.filter-options {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Loading, Error, Empty States */
.loading-container,
.error-container,
.empty-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 30px 25px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}

.loading-content,
.error-content,
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #667eea;
  animation: spin 1s linear infinite;
}

.error-icon,
.empty-icon {
  font-size: 4rem;
  color: #667eea;
}

.error-icon {
  color: #e53e3e;
}

/* Projects Grid */
.projects-grid-container {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.4s;
  margin-bottom: 15px;
}

.grid-animated {
  opacity: 1;
  transform: translateY(0);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 15px;
}

.project-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
  opacity: 0;
  transform: translateY(20px);
  animation: card-fade-in 0.6s ease-out forwards;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.4rem;
  font-weight: 700;
  flex: 1;
  line-height: 1.3;
}

.project-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge-public {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.badge-private {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.description {
  color: #64748b;
  margin-bottom: 16px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  padding: 4px 12px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

.tag-more {
  padding: 4px 12px;
  color: #94a3b8;
  font-size: 0.8rem;
  font-style: italic;
}

.project-meta {
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.meta-icon {
  color: #94a3b8;
  font-size: 0.9rem;
}

.meta-value {
  color: #475569;
  font-weight: 500;
}

.project-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #64748b;
  color: white;
}

.btn-secondary:hover {
  background: #475569;
  transform: translateY(-1px);
}

/* Animations */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes glow {
  0% { opacity: 0.3; transform: scale(1); }
  100% { opacity: 0.6; transform: scale(1.1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes card-fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .main-content {
    margin-left: 70px;
  }
  .main-content.sidebar-collapsed {
    margin-left: 70px;
  }
  .content {
    padding: 1.5rem;
  }

  .projects-container {
    padding-left: 0;
  }

  .projects-header {
    padding: 20px;
    margin-bottom: 12px;
  }

  .filters-container {
    padding: 12px;
    margin-bottom: 12px;
  }

  .loading-container,
  .error-container,
  .empty-container {
    padding: 25px 20px;
    margin-bottom: 12px;
  }

  .projects-grid-container {
    margin-bottom: 12px;
  }

  .projects-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }

  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 32px;
  }

  .header-left {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .header-stats {
    justify-content: center;
  }

  .projects-title {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-left: 0;
  }

  .projects-container {
    padding-left: 0;
  }

  .projects-header {
    padding: 18px 15px;
    margin-bottom: 10px;
  }

  .filters-container {
    padding: 10px;
    margin-bottom: 10px;
  }

  .loading-container,
  .error-container,
  .empty-container {
    padding: 20px 15px;
    margin-bottom: 10px;
  }

  .projects-grid-container {
    margin-bottom: 10px;
  }

  .projects-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    max-width: none;
  }

  .filter-options {
    flex-direction: column;
  }

  .project-actions {
    flex-direction: column;
  }

  .projects-title {
    font-size: 1.75rem;
  }

  .projects-desc {
    font-size: 1rem;
  }

  .header-stats {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .content {
    padding: 1rem;
  }

  .projects-container {
    padding-left: 0;
  }

  .projects-header {
    padding: 15px 12px;
    margin-bottom: 8px;
  }

  .filters-container {
    padding: 8px;
    margin-bottom: 8px;
  }

  .loading-container,
  .error-container,
  .empty-container {
    padding: 15px 12px;
    margin-bottom: 8px;
  }

  .projects-grid-container {
    margin-bottom: 8px;
  }

  .projects-grid {
    gap: 8px;
  }

  .icon-circle {
    width: 60px;
    height: 60px;
  }

  .icon-inner {
    width: 45px;
    height: 45px;
  }

  .header-icon {
    font-size: 2rem;
  }

  .projects-title {
    font-size: 1.5rem;
  }
}
</style>
