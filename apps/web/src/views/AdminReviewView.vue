<template>
  <div class="admin-review-wrapper">
    <AdminNavbar />
    <div class="main-content">
      <AdminSidebar />
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <h1><i class="pi pi-shield"></i> Admin Review Panel</h1>
          <p>Review 100% completed translation rejections</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <i class="pi pi-spin pi-spinner"></i>
          <p>Loading pending reviews...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
          <i class="pi pi-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>{{ error }}</p>
          <button @click="loadPendingReviews" class="btn btn-primary">Try Again</button>
        </div>

        <!-- No Pending Reviews -->
        <div v-else-if="!loading && !error && pendingReviews.length === 0" class="no-reviews-container">
          <i class="pi pi-check-circle"></i>
          <h3>No Pending Reviews</h3>
          <p>All admin reviews have been processed.</p>
          <button @click="loadPendingReviews" class="btn btn-primary">Refresh</button>
        </div>

        <!-- Pending Reviews List -->
        <div v-else class="reviews-content">
          <div class="reviews-header">
            <h2>Pending Reviews ({{ pendingReviews.length }})</h2>
            <div class="header-actions">
              <div class="search-box">
                <i class="pi pi-search"></i>
                <input
                  v-model="searchQuery"
                  placeholder="Search reviews..."
                  @input="filterReviews"
                />
              </div>
              <button @click="loadPendingReviews" class="btn btn-secondary">
                <i class="pi pi-refresh"></i> Refresh
              </button>
            </div>
          </div>

          <div class="reviews-table">
            <table>
              <thead>
              <tr>
                <th>Title</th>
                <th>Requester</th>
                <th>Translator</th>
                <th>Amount</th>
                <th>Rating</th>
                <th>Evidence</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="review in filteredReviews" :key="review.id">
                <td class="title-cell">
                  <strong>{{ review.title }}</strong>
                </td>
                <td>{{ review.requesterName }}</td>
                <td>{{ review.translatorName }}</td>
                <td class="amount-cell">${{ review.dealAmount }}</td>
                <td class="rating-cell">
                  <i v-for="star in 5" :key="star"
                     :class="['pi', star <= review.reviewRating ? 'pi-star-fill' : 'pi-star']"
                     :style="{ color: star <= review.reviewRating ? '#fbbf24' : '#d1d5db' }">
                  </i>
                  <span class="rating-text">{{ review.reviewRating }}/5</span>
                </td>
                <td class="evidence-cell">
                  <span class="evidence-badge">{{ review.evidenceFilesCount }} files</span>
                </td>
                <td class="date-cell">{{ formatDate(review.reviewedAt) }}</td>
                <td class="actions-cell">
                  <button @click="viewReviewDetails(review.id)" class="btn btn-primary btn-sm">
                    <i class="pi pi-eye"></i> Review
                  </button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="pagination">
            <button
              @click="changePage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="btn btn-secondary"
            >
              <i class="pi pi-chevron-left"></i> Previous
            </button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="btn btn-secondary"
            >
              Next <i class="pi pi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import axiosInstance from '../api';
import AdminNavbar from '../components/AdminNavbar.vue';
import AdminSidebar from '../components/AdminSidebar.vue';

const toast = useToast();

// State
const loading = ref(true);
const error = ref('');
const pendingReviews = ref<any[]>([]);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = ref(1);

// Computed
const filteredReviews = computed(() => {
  if (!searchQuery.value) return pendingReviews.value;

  return pendingReviews.value.filter(review =>
    review.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    review.requesterName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    review.translatorName.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Methods
async function loadPendingReviews() {
  loading.value = true;
  error.value = '';

  try {
    const response = await axiosInstance.get('/admin/review/pending');
    pendingReviews.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load pending reviews';
  } finally {
    loading.value = false;
  }
}

async function viewReviewDetails(requestId: string) {
  // Navigate to detail page instead of showing modal
  window.location.href = `/admin/review/${requestId}`;
}

function filterReviews() {
  // Search is handled by computed property
  currentPage.value = 1; // Reset to first page when searching
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadPendingReviews();
  }
}



function formatDate(date: string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('vi-VN');
}



onMounted(() => {
  loadPendingReviews();
});
</script>

<style scoped>
.admin-review-wrapper {
  min-height: 100vh;
  background: #f8fafc;
}

.main-content {
  display: flex;
  min-height: calc(100vh - 60px);
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  margin-left: 260px;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
  color: #1e293b;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.loading-container,
.error-container,
.no-reviews-container {
  text-align: center;
  color: #1e293b;
  padding: 2rem;
}

.loading-container i,
.error-container i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-container i {
  color: #ff6b6b;
}

.no-reviews-container i {
  color: #51cf66;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  color: #1e293b;
}

.reviews-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-size: 0.875rem;
}

.search-box input {
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 250px;
  background: white;
}

.search-box input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
}

.reviews-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.reviews-table table {
  width: 100%;
  border-collapse: collapse;
}

.reviews-table th {
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e2e8f0;
}

.reviews-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #4a5568;
}

.reviews-table tr:hover {
  background: #f8fafc;
}

.title-cell {
  font-weight: 500;
  color: #2d3748;
}

.amount-cell {
  font-weight: 600;
  color: #059669;
}

.rating-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rating-text {
  font-size: 0.875rem;
  color: #6b7280;
}

.evidence-cell {
  text-align: center;
}

.evidence-badge {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.date-cell {
  color: #6b7280;
  font-size: 0.875rem;
}

.actions-cell {
  text-align: center;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}





.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e0;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
}

.page-info {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-left: 72px;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .reviews-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .search-box input {
    width: 100%;
  }

  .reviews-table {
    overflow-x: auto;
  }

  .reviews-table table {
    min-width: 600px;
  }
}
</style>
