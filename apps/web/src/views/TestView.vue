<template>
  <div class="p-6 max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-4">Translation Progress</h2>

    <!-- Progress Bar -->
    <div class="w-full bg-gray-200 rounded-full h-6 mb-4">
      <div
        class="bg-green-500 h-6 rounded-full text-center text-white text-sm leading-6"
        :style="{ width: progress.percentage + '%' }"
      >
        {{ progress.percentage }}%
      </div>
    </div>

    <!-- Stats -->
    <div class="flex justify-between text-sm">
      <span>Total: {{ progress.total }}</span>
      <span>Completed: {{ progress.completed }}</span>
    </div>

    <!-- Refresh Button -->
    <button
      @click="fetchProgress"
      class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Refresh
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";

const progress = ref({
  total: 0,
  completed: 0,
  percentage: 0,
});

const fetchProgress = async () => {
  try {
    const { data } = await axios.get(
      `/api/translation/progress?projectId=66&branchId=66`
    );
    progress.value = data;
  } catch (err) {
    console.error("Failed to fetch progress", err);
  }
};

onMounted(() => {
  fetchProgress();
});
</script>

<style scoped>
/* Optional: smooth animation */
div > div {
  transition: width 0.5s ease;
}
</style>
