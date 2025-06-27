<template>
  <div class="page-container">
    <div class="requests-panel">
      <h1 class="text-3xl font-bold mb-6 text-center">Requests</h1>

      <div class="text-center mb-6">
        <router-link to="/createrequest">
          <button class="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            + Create New Request
          </button>
        </router-link>
      </div>

      <div v-if="requests.length">
        <RequestCard
          v-for="req in requests"
          :key="req.id"
          :request="req"
          @approve="handleReview($event, 'APPROVED')"
          @reject="handleReview($event, 'REJECTED')"
          @edit="handleEdit"
          @view="handleView"
          @cancel="handleCancel"
        />
      </div>
      <div v-else class="text-gray-500 text-center">No requests available.</div>
    </div>
  </div>
</template>


<script>
import axios from 'axios';
import RequestCard from '../components/RequestCard.vue';

export default {
  components: { RequestCard },
  data() {
    return {
      requests: []
    };
  },
  created() {
    this.fetchRequests();
  },
  methods: {
    fetchRequests() {
      axios.get('http://localhost:3000/api/requests').then(res => {
        this.requests = res.data;
      });
    },
    handleReview(id, status) {
      axios.patch('http://localhost:3000/api/requests/review', { id, status })
        .then(() => this.fetchRequests());
    },
    handleEdit(request) {
      const updated = prompt('Edit description:', request.description);
      if (updated !== null) {
        axios.patch('http://localhost:3000/api/requests', {
          id: request.id,
          description: updated
        }).then(() => this.fetchRequests());
      }
    },
    handleView(id) {
      axios.get(`http://localhost:3000/api/requests/${id}`)
        .then(res => alert(JSON.stringify(res.data, null, 2)));
    },
    handleCancel(id) {
      if (confirm('Are you sure you want to cancel this request?')) {
        axios.delete(`http://localhost:3000/api/requests/${id}`)
          .then(() => this.fetchRequests());
      }
    }
  }
};
</script>

<style scoped>
.page-container {
  margin-left: 240px; /* sidebar width */
  padding: 2rem;
  min-height: calc(100vh - 80px);
  background-color: #f9f9f9;

  display: flex;
  justify-content: center;
  align-items: center;
}

.requests-panel {
  width: 100%;
  max-width: 700px;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}
</style>
