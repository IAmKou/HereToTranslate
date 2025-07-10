<script setup lang="ts">
const props = defineProps({
  translations: {
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
  <div class="translation-tab-wrapper">
    <h2 v-if="customTitle" class="translation-title">{{ customTitle }}</h2>
    <div class="translation-section">
      <div v-if="loading" class="translation-loading">
        <div class="loading-spinner-small"></div>
        <span>Loading translations...</span>
      </div>
      <div v-else-if="error" class="translation-error">
        <span class="error-icon">⚠️</span>
        <span>{{ error }}</span>
        <button v-if="onReload" class="btn btn-outline btn-sm" @click="onReload">Retry</button>
      </div>
      <div v-else-if="translations && translations.length > 0" class="translation-list">
        <!-- Hiển thị danh sách bản dịch ở đây -->
        <slot name="list" :translations="translations" />
      </div>
      <div v-else class="no-translation">
        <div class="no-content-icon">🌐</div>
        <p>No translations available for this project yet.</p>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.translation-tab-wrapper {
  padding: 1.5em 0;
}
.translation-title {
  font-size: 1.3em;
  font-weight: 600;
  margin-bottom: 1em;
  color: #2b6cb0;
}
.translation-section {
  margin-top: 1em;
}
.translation-list {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
.translation-loading {
  text-align: center;
  padding: 2em 0;
}
.translation-error {
  text-align: center;
  color: #e53e3e;
  padding: 2em 0;
}
.no-translation {
  text-align: center;
  padding: 2em 0;
}
.no-content-icon {
  font-size: 2.5em;
  margin-bottom: 0.5em;
}
</style>
