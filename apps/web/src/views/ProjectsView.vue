<template>
  <div class="projects-view">
    <div class="header">
      <h1>Projects</h1>
      <router-link
        to="/projects/create"
        class="btn btn-primary"
      >
        Create New Project
      </router-link>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading projects...
    </div>

    <div 
      v-else-if="error" 
      class="error"
    >
      {{ error }}
    </div>

    <div 
      v-else-if="projects.length === 0" 
      class="empty-state"
    >
      No projects found. Create your first project!
    </div>

    <div 
      v-else
      class="projects-grid"
    >
      <div
        v-for="project in projects"
        :key="String(project.id)"
        class="project-card"
      >
        <h3>{{ project.name }}</h3>
        <p
          v-if="project.description" 
          class="description"
        >
          {{ project.description }}
        </p>
        <div class="project-meta">
          <span>Created by {{ project.createdBy.username }}</span>
          <span>Created {{ formatDate(project.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { ProjectService, type Project } from '../services/project.service';

export default defineComponent({
  name: 'ProjectsView',
  setup() {
    const projectService = ProjectService.getInstance();
    const projects = ref<Project[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);

    const loadProjects = async () => {
      try {
        loading.value = true;
        error.value = null;
        projects.value = await projectService.getProjects();
      } catch (err) {
        error.value = 'Failed to load projects. Please try again later.';
        console.error('Error loading projects:', err);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString();
    };

    onMounted(loadProjects);

    return {
      projects,
      loading,
      error,
      formatDate,
    };
  },
});
</script>

<style scoped>
.projects-view {
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.project-card h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.description {
  color: #666;
  margin-bottom: 1rem;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  color: #888;
  font-size: 0.9rem;
}

.loading,
.error,
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #dc3545;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #4a90e2;
  color: white;
}

.btn-primary:hover {
  background-color: #357abd;
}
</style> 