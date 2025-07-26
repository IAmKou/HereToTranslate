<template>
  <div class="page-container">
    <div class="requests-panel">
      <h1 class="text-3xl font-bold mb-6 text-center">Requests</h1>

      <div class="text-center mb-6">
        <router-link to="/createrequest">
          <button
            class="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Create New Request
          </button>
        </router-link>
      </div>

      <!-- Sortable Headers -->
      <div class="grid grid-cols-5 gap-4 font-semibold text-gray-700 mb-3 px-2">
        <div class="cursor-pointer" @click="setSort('id')">
          ID
          <span v-if="sortKey === 'id'">{{ sortOrder === 1 ? '▲' : '▼' }}</span>
        </div>
        <div class="cursor-pointer" @click="setSort('title')">
          Title
          <span v-if="sortKey === 'title'">{{
            sortOrder === 1 ? '▲' : '▼'
          }}</span>
        </div>
        <div class="cursor-pointer" @click="setSort('project')">
          Project
          <span v-if="sortKey === 'project'">{{
            sortOrder === 1 ? '▲' : '▼'
          }}</span>
        </div>
        <div class="cursor-pointer" @click="setSort('category')">
          Category
          <span v-if="sortKey === 'category'">{{
            sortOrder === 1 ? '▲' : '▼'
          }}</span>
        </div>
        <div class="cursor-pointer" @click="setSort('dealAmount')">
          Amount
          <span v-if="sortKey === 'dealAmount'">{{
            sortOrder === 1 ? '▲' : '▼'
          }}</span>
        </div>
        <div class="cursor-pointer" @click="setSort('deadline')">
          Deadline
          <span v-if="sortKey === 'deadline'">{{
            sortOrder === 1 ? '▲' : '▼'
          }}</span>
        </div>
      </div>

      <div v-if="requests.length" class="space-y-4">
        <RequestCard
          v-for="req in sortedRequests"
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
      requests: [],
      sortKey: '',
      sortOrder: 1,
    };
  },
  created() {
    this.fetchRequests();
  },
  methods: {
    fetchRequests() {
      axios.get('${import.meta.env.VITE_API_URL}/requests').then((res) => {
        this.requests = res.data;
      });
    },
    handleReview(id, status) {
      axios
        .patch('${import.meta.env.VITE_API_URL}/requests/review', { id, status })
        .then(() => this.fetchRequests());
    },
    handleEdit(request) {
      const updated = prompt('Edit description:', request.description);
      if (updated !== null) {
        axios
          .patch('${import.meta.env.VITE_API_URL}/requests', {
            id: request.id,
            description: updated,
          })
          .then(() => this.fetchRequests());
      }
    },
    handleView(id) {
      axios
        .get(`${import.meta.env.VITE_API_URL}/requests/${id}`)
        .then((res) => alert(JSON.stringify(res.data, null, 2)));
    },
    handleCancel(id) {
      if (confirm('Are you sure you want to cancel this request?')) {
        axios
          .delete(`${import.meta.env.VITE_API_URL}/requests/${id}`)
          .then(() => this.fetchRequests());
      }
    },
    setSort(key) {
      if (this.sortKey === key) {
        this.sortOrder *= -1;
      } else {
        this.sortKey = key;
        this.sortOrder = 1;
      }
    },
    computed: {
      sortedRequests() {
        const getValue = (req, key) => {
          switch (key) {
            case 'id':
              return Number(req.id);
            case 'title':
              return req.title || '';
            case 'project':
              return req.project?.name || '';
            case 'category':
              return req.category?.name || '';
            case 'dealAmount':
              return parseFloat(req.dealAmount) || 0;
            case 'deadline':
              return new Date(req.deadline).getTime();
            default:
              return '';
          }
        };

        if (!this.sortKey) return this.requests;

        return [...this.requests].sort((a, b) => {
          const valA = getValue(a, this.sortKey);
          const valB = getValue(b, this.sortKey);

          if (typeof valA === 'string') {
            return this.sortOrder * valA.localeCompare(valB);
          } else {
            return this.sortOrder * (valA - valB);
          }
        });
      },
    },
  },
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
