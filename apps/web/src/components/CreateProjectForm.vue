<template>
  <div class="create-project-form">
    <h2>Create New Project</h2>
    <form 
      class="form" 
      @submit.prevent="handleSubmit"
    >
      <div class="form-group">
        <label for="name">Project Name</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="form-control"
          placeholder="Enter project name"
        >
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="form.description"
          class="form-control"
          rows="4"
          placeholder="Enter project description"
        />
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? 'Creating...' : 'Create Project' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ProjectService, type CreateProjectDto } from '../services/project.service';

export default defineComponent({
  name: 'CreateProjectForm',
  setup() {
    const router = useRouter();
    const projectService = ProjectService.getInstance();
    const isSubmitting = ref(false);

    const form = ref<CreateProjectDto>({
      name: '',
      description: '',
      createdBy: '1', 
    });

    const handleSubmit = async () => {
      try {
        isSubmitting.value = true;
        await projectService.createProject(form.value);
        router.push('/projects');
      } catch (error) {
        console.error('Failed to create project:', error);
      } finally {
        isSubmitting.value = false;
      }
    };

    return {
      form,
      isSubmitting,
      handleSubmit,
    };
  },
});
</script>

<style scoped>
.create-project-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-control:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #4a90e2;
  color: white;
}

.btn-primary:hover {
  background-color: #357abd;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style> 