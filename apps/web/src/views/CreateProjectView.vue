<template>
  <div class="create-project-view">
    <CreateProjectForm />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CreateProjectForm from '../components/CreateProjectForm.vue';

export default defineComponent({
  name: 'CreateProjectView',
  components: {
    CreateProjectForm,
  },
});
</script>
<style scoped>
.create-project-view {
  padding: 2rem;
}
</style> 