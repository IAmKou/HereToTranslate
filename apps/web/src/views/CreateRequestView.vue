<template>
  <div class="center-container">
    <div class="form-card">
      <h1 class="text-3xl font-bold mb-6 text-center">Create New Request</h1>

      <form @submit.prevent="submitRequest" enctype="multipart/form-data" class="space-y-4">
        <div>
          <label class="block font-semibold mb-1">Title *</label>
          <input v-model="form.title" required class="w-full border rounded p-2" />
        </div>

        <div>
          <label class="block font-semibold mb-1">Description *</label>
          <textarea v-model="form.description" required class="w-full border rounded p-2" rows="3"></textarea>
        </div>

        <div>
          <label class="block font-semibold mb-1">Deal Amount</label>
          <input v-model.number="form.dealAmount" type="number" min="0" class="w-full border rounded p-2" />
        </div>

        <div>
          <label class="block font-semibold mb-1">Deadline</label>
          <input v-model="form.deadline" type="date" class="w-full border rounded p-2" />
        </div>

        <div>
          <label class="block font-semibold mb-1">Attach File</label>
          <input @change="handleFileUpload" type="file" class="w-full" />
        </div>

        <button type="submit" class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Submit Request
        </button>

        <p v-if="error" class="text-red-600 text-sm mt-2 text-center">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();

const form = ref({
  title: '',
  description: '',
  dealAmount: null,
  deadline: '',
  targetUserId: null,
  projectId: null,
});

const file = ref(null);
const error = ref(null);

const handleFileUpload = (event) => {
  file.value = event.target.files[0];
};

const submitRequest = async () => {
  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();

    for (const [key, value] of Object.entries(form.value)) {
      if (value !== null && value !== '') {
        formData.append(key, value);
      }
    }

    if (file.value) {
      formData.append('file', file.value);
    }

    await axios.post('http://localhost:3000/api/requests', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    router.push('/request');
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to create request.';
  }
};
</script>

<style scoped>
.center-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px); /* header-safe */
  padding: 2rem;
  background-color: #f5f5f5;
  margin-left: 240px; /* offset for sidebar */
}

.form-card {
  background: white;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
</style>
