<template>
  <div class="projects-view">
    <div class="header">
      <div class="header-content">
        <h1>Projects</h1>
        <p class="subtitle">Manage and collaborate on your translation projects</p>
      </div>
      <router-link
        to="/projects/create"
        class="btn btn-primary"
      >
        <span class="icon">+</span>
        Create New Project
      </router-link>
    </div>

    <div class="filters">
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search projects..."
          class="search-input"
        >
        <span class="search-icon">🔍</span>
      </div>
      <div class="filter-options">
        <select v-model="visibilityFilter" class="filter-select">
          <option value="">All Projects</option>
          <option value="public">Public Only</option>
          <option value="private">Private Only</option>
        </select>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      <div class="loading-spinner"></div>
      <p>Loading projects...</p>
    </div>

    <div
      v-else-if="error"
      class="error"
    >
      <p>{{ error }}</p>
      <button @click="loadProjects" class="btn btn-secondary">Try Again</button>
    </div>

    <div
      v-else-if="filteredProjects.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">📁</div>
      <h3>No projects found</h3>
      <p v-if="searchQuery || visibilityFilter">
        No projects match your current filters. Try adjusting your search criteria.
      </p>
      <p v-else>
        Get started by creating your first project!
      </p>
      <router-link to="/projects/create" class="btn btn-primary">
        Create Your First Project
      </router-link>
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
            <span class="meta-label">Created by:</span>
            <span class="meta-value">{{ project.createdBy.username }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Created:</span>
            <span class="meta-value">{{ formatDate(project.createdAt) }}</span>
          </div>
        </div>

        <div class="project-actions">
          <button class="btn btn-outline" @click.stop="editProject(project.id)">
            Edit
          </button>
          <button class="btn btn-outline" @click.stop="manageProject(project.id)">
            Manage
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';

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
  setup() {
    const router = useRouter();
    const projects = ref<Project[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const searchQuery = ref('');
    const visibilityFilter = ref('');

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
      filteredProjects,
      formatDate,
      loadProjects,
      viewProject,
      editProject,
      manageProject,
    };
  },
});
</script>

<style scoped>
.projects-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: #1a202c;
  font-size: 2.5rem;
  font-weight: 700;
}

.subtitle {
  color: #718096;
  margin: 0;
  font-size: 1.1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background-color: #4299e1;
  color: white;
}

.btn-primary:hover {
  background-color: #3182ce;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background-color: #cbd5e0;
}

.btn-outline {
  background-color: transparent;
  color: #4299e1;
  border: 1px solid #4299e1;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-outline:hover {
  background-color: #4299e1;
  color: white;
}

.icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
}

.search-input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  cursor: pointer;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.project-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
}

.project-badges {
  display: flex;
  gap: 0.5rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-public {
  background-color: #c6f6d5;
  color: #22543d;
}

.badge-private {
  background-color: #fed7d7;
  color: #742a2a;
}

.description {
  color: #4a5568;
  margin-bottom: 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  padding: 0.25rem 0.5rem;
  background-color: #edf2f7;
  color: #4a5568;
  border-radius: 4px;
  font-size: 0.75rem;
}

.tag-more {
  padding: 0.25rem 0.5rem;
  color: #718096;
  font-size: 0.75rem;
  font-style: italic;
}

.project-meta {
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.meta-label {
  color: #718096;
}

.meta-value {
  color: #2d3748;
  font-weight: 500;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.loading,
.error,
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #718096;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  color: #e53e3e;
}

.empty-state {
  color: #718096;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
}

@media (max-width: 768px) {
  .projects-view {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-content h1 {
    font-size: 2rem;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    max-width: none;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .project-actions {
    flex-direction: column;
  }
}
</style>
