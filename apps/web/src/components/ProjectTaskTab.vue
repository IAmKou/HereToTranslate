<script setup lang="ts">
const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  onReload: {
    type: Function,
    default: null
  },
  customTitle: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <div class="task-tab-wrapper">
    <h2 v-if="customTitle" class="task-title">{{ customTitle }}</h2>
    <div class="task-section">
      <div v-if="loading" class="task-loading">
        <div class="loading-spinner-small"></div>
        <span>Loading tasks...</span>
      </div>
      <div v-else-if="error" class="task-error">
        <span class="error-icon">⚠️</span>
        <span>{{ error }}</span>
        <button v-if="onReload" class="btn btn-outline btn-sm" @click="onReload">Retry</button>
      </div>
      <div v-else-if="tasks && tasks.length > 0" class="task-list">
        <!-- Hiển thị danh sách task ở đây -->
        <slot name="list" :tasks="tasks" />
      </div>
      <div v-else class="no-task">
        <div class="no-content-icon">📝</div>
        <p>No tasks available for this project yet.</p>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.task-tab-wrapper {
  padding: 1.5em 0;
}
.task-title {
  font-size: 1.3em;
  font-weight: 600;
  margin-bottom: 1em;
  color: #2b6cb0;
}
.task-section {
  margin-top: 1em;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
.task-loading {
  text-align: center;
  padding: 2em 0;
}
.task-error {
  text-align: center;
  color: #e53e3e;
  padding: 2em 0;
}
.no-task {
  text-align: center;
  padding: 2em 0;
}
.no-content-icon {
  font-size: 2.5em;
  margin-bottom: 0.5em;
}
</style>
