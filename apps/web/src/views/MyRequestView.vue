<template>
  <div class="my-requests-container">
    <h2>My Requests</h2>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else>
      <table class="requests-table">
        <thead>
        <tr>
          <th>Title</th>
          <th>Project</th>
          <th>Deal Amount</th>
          <th>Deadline</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="req in requests" :key="req.id">
          <td>{{ req.title }}</td>
          <td>{{ req.projectName || '-' }}</td>
          <td>{{ req.dealAmount }}</td>
          <td>{{ req.deadline }}</td>
          <td>{{ req.status }}</td>
          <td>
            <button @click="onEdit(req)">Edit</button>
            <button @click="onCancel(req)">Cancel</button>
            <button v-if="canReview(req)" @click="onReview(req)">Review</button>
          </td>
        </tr>
        </tbody>
      </table>
      <div v-if="requests.length === 0" class="empty">No requests found.</div>
    </div>
    <EditRequestForm v-if="showEdit" :request="selectedRequest" @close="showEdit = false" @updated="fetchRequests" />
    <ReviewRequestDialog v-if="showReview" :request="selectedRequest" @close="showReview = false" @reviewed="fetchRequests" />
    <CancelRequestDialog v-if="showCancel" :request="selectedRequest" @close="showCancel = false" @cancelled="fetchRequests" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import EditRequestForm from '../components/EditRequestForm.vue'
import ReviewRequestDialog from '../components/ReviewRequestDialog.vue'
import CancelRequestDialog from '../components/CancelRequestDialog.vue'

const requests = ref([])
const loading = ref(false)
const showEdit = ref(false)
const showReview = ref(false)
const showCancel = ref(false)
const selectedRequest = ref(null)

function fetchRequests() {
  loading.value = true
  axios.get('/api/projects/0/requests/myRequests')
    .then(res => {
      requests.value = res.data
    })
    .finally(() => loading.value = false)
}

function onEdit(req) {
  selectedRequest.value = req
  showEdit.value = true
}
function onReview(req) {
  selectedRequest.value = req
  showReview.value = true
}
function onCancel(req) {
  selectedRequest.value = req
  showCancel.value = true
}
function canReview(req) {
  // Tùy quyền, ví dụ: return req.status === 'pending' && userIsAdmin
  return false
}

onMounted(fetchRequests)
</script>

<style scoped>
.my-requests-container {
  padding: 2rem;
}
.requests-table {
  width: 100%;
  border-collapse: collapse;
}
.requests-table th, .requests-table td {
  border: 1px solid #e5e7eb;
  padding: 0.75rem;
  text-align: left;
}
.loading {
  margin: 2rem 0;
}
.empty {
  margin: 2rem 0;
  color: #888;
}
</style>
