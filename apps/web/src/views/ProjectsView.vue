<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div
      :class="{ 'sidebar-collapsed': isSidebarCollapsed }"
      class="main-content"
    >
      <Sidebar />
      <div class="content">
        <div class="projects-container">
          <div class="header-filters-wrapper">
            <!-- Enhanced Header -->
            <div
              :class="{ 'header-animated': isHeaderVisible }"
              class="projects-header"
            >
              <div class="header-content">
                <div class="header-left">
                  <div class="icon-circle">
                    <div class="icon-inner">
                      <i class="pi pi-folder header-icon" />
                    </div>
                    <div class="icon"></div>
                  </div>
                  <div class="header-text">
                    <h1 class="projects-title">Projects</h1>
                    <div class="header-stats">
                      <div class="stat-item">
                        <i class="pi pi-folder stat-icon"></i>
                        <span>{{ projects.length }} Projects</span>
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

            <!-- Filters sát tiêu đề -->
            <div
              :class="{ 'filters-animated': isFiltersVisible }"
              class="filters-container filters-tight"
            >
              <div class="filters">
                <div class="search-container">
                  <div class="search-wrapper">
                    <i class="pi pi-search search-icon"></i>
                    <input
                      v-model="searchQuery"
                      type="text"
                      placeholder="Search projects..."
                      class="search-input"
                    />
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
                  </select>
                  <button
                    class="btn clear-filter-btn"
                    @click.prevent="clearFilter"
                  >
                    <i class="pi pi-filter-slash"></i>
                    Clear Filter
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <p>Loading projects...</p>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-container">
            <div class="error-content">
              <div class="error-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h3>Oops! Something went wrong</h3>
              <p>{{ error }}</p>
              <button class="btn btn-secondary" @click="loadProjects">
                Try Again
              </button>
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
                No projects match your current filters. Try adjusting your
                search criteria.
              </p>
              <p v-else>Get started by creating your first project!</p>
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
                v-for="(project, index) in paginatedProjects"
                :key="String((project as Project).id)"
                class="project-card project-card-highlight"
                :class="{ 'card-animated': true }"
                :style="{ animationDelay: `${index * 0.1}s` }"
                @click="handleSingleClick((project as Project).id)"
              >
                <div class="project-header">
                  <h3
                    :title="(project as Project).name"
                    class="project-title-strong"
                  >
                    {{ (project as Project).name }}
                  </h3>
                  <div class="project-badges">
                    <span v-if="!project.isPrivate" class="badge badge-public">
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
                  class="description description-truncate"
                  :title="project.description"
                >
                  {{
                    project.description.length > 120
                      ? project.description.substring(0, 120) + '...'
                      : project.description
                  }}
                </p>

                <div
                  v-if="project.tags && project.tags.length > 0"
                  class="tags"
                >
                  <span
                    v-for="tag in (project as Project).tags"
                    :key="tag.id"
                    class="tag"
                  >
                    {{ tag.name }}
                  </span>
                </div>
                <div
                  v-if="project.tags && project.tags.length > 5"
                  class="tag-more"
                >
                  ({{ project.tags.length }} tags)
                </div>

                <div class="project-meta">
                  <div class="meta-item">
                    <i class="pi pi-calendar-plus meta-icon"></i>
                    <span class="meta-value">{{
                        formatDate(project.createdAt)
                      }}</span>
                  </div>
                  <div class="meta-item" v-if="project.category">
                    <i class="pi pi-tag meta-icon"></i>
                    <span class="meta-value">{{ project.category.name }}</span>
                  </div>
                  <div class="meta-item" v-if="project.updatedAt && project.updatedAt !== project.createdAt">
                    <i class="pi pi-refresh meta-icon"></i>
                    <span class="meta-value"
                    >Updated: {{ formatDate(project.updatedAt) }}</span
                    >
                  </div>
                </div>

                <!-- Thêm thông tin chi tiết hơn -->
                <div class="project-details">
                  <div class="detail-row">
                    <div class="detail-item" v-if="project.members && project.members.length > 0">
                      <i class="pi pi-users detail-icon"></i>
                      <span class="detail-label">Members:</span>
                      <span class="detail-value">{{ project.members.length }}</span>
                    </div>
                    <div class="detail-item" v-if="project.tags && project.tags.length > 0">
                      <i class="pi pi-tags detail-icon"></i>
                      <span class="detail-label">Tags:</span>
                      <span class="detail-value">{{ project.tags.length }}</span>
                    </div>
                  </div>

                  <div class="detail-row" v-if="project.createdBy">
                    <div class="detail-item">
                      <i class="pi pi-user detail-icon"></i>
                      <span class="detail-label">Owner:</span>
                      <span class="detail-value">
                         {{ project.createdBy.fullName || project.createdBy.username }}
                       </span>
                    </div>
                  </div>

                  <div class="detail-row" v-if="project.status">
                    <div class="detail-item">
                      <i class="pi pi-circle-fill detail-icon status-indicator" :class="`status-${project.status}`"></i>
                      <span class="detail-label">Status:</span>
                      <span class="detail-value status-text" :class="`status-${project.status}`">
                        {{ project.status === 'archived' ? 'Archived' : 'Active' }}
                      </span>
                    </div>
                  </div>

                  <div class="detail-row" v-if="project.updatedAt && project.updatedAt !== project.createdAt">
                    <div class="detail-item">
                      <i class="pi pi-clock detail-icon"></i>
                      <span class="detail-label">Last Updated:</span>
                      <span class="detail-value">{{ formatRelativeTime(project.updatedAt) }}</span>
                    </div>
                  </div>
                </div>

                <div class="project-actions">
                  <button
                    class="btn btn-outline"
                    @click.stop="editProject(project.id)"
                  >
                    <i class="pi pi-pencil"></i>
                    Edit
                  </button>
                  <button
                    class="btn btn-outline"
                    @click.stop="manageProject(project.id)"
                  >
                    <i class="pi pi-cog"></i>
                    Manage
                  </button>
                </div>

                <div class="project-status" v-if="project.status">
                  <span
                    :class="`status-${project.status}`"
                    class="status-badge"
                  >
                    {{ project.status === 'archived' ? 'Archived' : 'Active' }}
                  </span>
                </div>
              </div>
            </div>
            <Paginator
              :rows="pageSize"
              :totalRecords="filteredProjects.length"
              v-model:first="currentPage"
              @page="onPageChange"
              class="paginator paginator-spaced"
            />
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import AppFooter from '../components/AppFooter.vue';
import Paginator from 'primevue/paginator';
import { isSidebarCollapsed } from '../store/sidebar';
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
  members?: Array<{ id: string; username: string }>;
  category?: { id: string; name: string };
  updatedAt?: string;
  status?: string;
}

export default defineComponent({
  name: 'ProjectsView',
  components: {
    Sidebar,
    TopNavbar,
    AppFooter,
    Paginator,
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
    const pageSize = 9;
    const currentPage = ref(0);

    let lastClick = 0;
    const handleSingleClick = (projectId: string) => {
      const now = Date.now();
      if (now - lastClick < 700) return; // Chặn double click trong 700ms
      lastClick = now;
      viewProject(projectId);
    };

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

    const loadProjects = async () => {
      try {
        loading.value = true;
        error.value = null;
        const { data } = await axiosInstance.get('/projects/me/projects');
        projects.value = data;
      } catch (err: any) {
        error.value = 'Failed to load your projects.';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const filteredProjects = computed<Project[]>(() => {
      let filtered: Project[] = projects.value;

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(
          (project) =>
            project.name.toLowerCase().includes(query) ||
            project.description?.toLowerCase().includes(query) ||
            project.tags?.some((tag) => tag.name.toLowerCase().includes(query))
        );
      }

      // Apply visibility filter
      if (visibilityFilter.value === 'public') {
        filtered = filtered.filter((project) => !project.isPrivate);
      } else if (visibilityFilter.value === 'private') {
        filtered = filtered.filter((project) => project.isPrivate);
      }

      // Apply sorting
      filtered.sort((a: Project, b: Project) => {
        switch (sortBy.value) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'updatedAt':
            return (
              new Date(b.updatedAt || b.createdAt).getTime() -
              new Date(a.updatedAt || a.createdAt).getTime()
            );
          default:
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      });

      return filtered;
    });

    const paginatedProjects = computed(() => {
      const start = currentPage.value * pageSize;
      return filteredProjects.value.slice(start, start + pageSize);
    });

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatRelativeTime = (date: string) => {
      const now = new Date();
      const targetDate = new Date(date);
      const diffInMs = now.getTime() - targetDate.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      if (diffInDays > 0) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else if (diffInHours > 0) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else if (diffInMinutes > 0) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else {
        return 'Just now';
      }
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

    const clearFilter = () => {
      searchQuery.value = '';
      visibilityFilter.value = '';
      sortBy.value = 'createdAt';
    };

    const onPageChange = (e: { page: number }) => {
      currentPage.value = e.page;
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
      formatRelativeTime,
      loadProjects,
      viewProject,
      editProject,
      manageProject,
      isHeaderVisible,
      isFiltersVisible,
      isGridVisible,
      isSidebarCollapsed,
      clearFilter,
      pageSize,
      currentPage,
      paginatedProjects,
      onPageChange,
      Paginator,
      handleSingleClick,
    };
  },
});
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: #fff; /* hoặc bỏ dòng này */
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
  padding: 1.5rem 1.75rem;
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
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.3);
  animation: pulse 2s infinite;
}

.icon-inner {
  background: white;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon {
  font-size: 1.8rem;
  color: #667eea;
  z-index: 1;
}

.header-text {
  flex: 1;
}

.projects-title {
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  line-height: 1.2;
}

.projects-desc {
  color: #64748b;
  font-size: 1rem;
  margin-bottom: 20px;
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
  gap: 6px;
  background: rgba(102, 126, 234, 0.1);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  color: #667eea;
  font-weight: 500;
}

.stat-icon {
  font-size: 0.9rem;
  color: #10b981;
}

.header-actions {
  display: flex;
  align-items: center;
}

.create-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
  font-size: 0.9rem;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
}

/* Filters Container */
.filters-container {
  padding: 1rem 1.75rem;
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
  padding: 10px 14px 10px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
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
  left: 14px;
  color: #a0aec0;
  font-size: 1rem;
}

.filter-options {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.project-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
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
  font-size: 1.2rem;
  font-weight: 700;
  flex: 1;
  line-height: 1.3;
}

.project-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
}

.badge-public {
  background: #d1fae5;
  color: #065f46;
  font-weight: 700;
  border: 1px solid #34d399;
}

.badge-private {
  background: #fee2e2;
  color: #991b1b;
  font-weight: 700;
  border: 1px solid #f87171;
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
  padding: 3px 10px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag-more {
  padding: 4px 12px;
  color: #94a3b8;
  font-size: 0.8rem;
  font-style: italic;
}

.project-meta {
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 0.8rem;
}

.meta-icon {
  color: #94a3b8;
  font-size: 0.8rem;
}

.meta-value {
  color: #475569;
  font-weight: 500;
}

/* Project Details Styles */
.project-details {
  background: rgba(102, 126, 234, 0.03);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.detail-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.detail-icon {
  color: #667eea;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.detail-label {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
  flex-shrink: 0;
}

.detail-value {
  color: #1e293b;
  font-size: 0.8rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-indicator {
  font-size: 0.6rem;
}

.status-text {
  font-weight: 700;
}

.status-text.status-active {
  color: #059669;
}

.status-text.status-archived {
  color: #dc2626;
}

.status-indicator.status-active {
  color: #10b981;
}

.status-indicator.status-archived {
  color: #ef4444;
}

.project-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes glow {
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  100% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

  .detail-row {
    flex-direction: column;
    gap: 8px;
  }

  .detail-item {
    justify-content: flex-start;
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

/* Làm nổi bật card project */
.project-card.project-card-highlight {
  border: 2px solid #764ba2;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25),
  0 2px 8px rgba(118, 75, 162, 0.15);
  background: #f8f6ff;
}

/* Mô tả rút gọn 2 dòng */
.description-truncate {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

/* Trạng thái project */
.project-status {
  margin-top: 8px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #3730a3;
  margin-right: 8px;
}

.status-archived {
  background: #fca5a5;
  color: #991b1b;
}

.status-active {
  background: #bbf7d0;
  color: #166534;
}

.project-title-strong {
  font-size: 1.1rem;
  font-weight: 800;
  color: #3b3663;
  line-height: 1.2;
  margin-bottom: 0.3rem;
  word-break: break-word;
}

.clear-filter-btn {
  margin-left: 6px;
  padding: 6px 16px;
  border: 1.5px solid #e53e3e;
  color: #e53e3e;
  background: #fff0f1;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(229, 62, 62, 0.08);
  transition: all 0.2s;
}

.clear-filter-btn:hover {
  background: #e53e3e;
  color: #fff;
  border-color: #e53e3e;
}

.paginator-spaced {
  margin-top: 32px;
  margin-bottom: 8px;
}
</style>
