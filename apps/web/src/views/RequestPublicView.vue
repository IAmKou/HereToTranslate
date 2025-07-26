<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <Sidebar :collapsed="sidebarCollapsed" @update:collapsed="sidebarCollapsed = $event" />
    <Navbar />
    <div class="main-content">
      <div class="content">
        <div class="requests-container">
          <!-- Header & Filters -->
          <div class="header-filters-wrapper">
            <!-- Simplified Header -->
            <div
              :class="{ 'header-animated': isHeaderVisible }"
              class="requests-header"
            >
              <div class="header-content">
                <div class="header-left">
                  <div class="icon-circle">
                    <div class="icon-inner">
                      <i class="pi pi-send header-icon" />
                    </div>
                  </div>
                  <div class="header-text">
                    <h1 class="requests-title">Public Requests</h1>
                  </div>
                </div>
                <!-- Search and Filter moved here -->
                <div class="header-controls">
                  <div class="search-container">
                    <div class="search-wrapper">
                      <i class="pi pi-search search-icon"></i>
                      <InputText
                        v-model="search"
                        class="search-input"
                        placeholder="Search by title..."
                        @blur="searchFocus = false"
                        @focus="searchFocus = true"
                      />
                    </div>
                  </div>
                  <div class="filter-options">
                    <Dropdown
                      v-model="selectedCategory"
                      :options="categoryOptions"
                      class="filter-select"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="All Categories"
                      @blur="categoryFocus = false"
                      @focus="categoryFocus = true"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <p>Loading requests...</p>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-container">
            <div class="error-content">
              <div class="error-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h3>Oops! Something went wrong</h3>
              <p>{{ error }}</p>
              <Button
                class="btn btn-secondary"
                label="Try Again"
                @click="loadRequests"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="filteredRequests.length === 0"
            class="empty-container"
          >
            <div class="empty-content">
              <div class="empty-icon">
                <i class="pi pi-inbox"></i>
              </div>
              <h3>No public requests found</h3>
              <p v-if="search || selectedCategory">
                No requests match your current filters. Try adjusting your
                search criteria.
              </p>
              <p v-else>There are no public requests yet. Check back later!</p>
            </div>
          </div>

          <!-- Requests Grid -->
          <div
            v-else
            :class="{ 'grid-animated': isGridVisible }"
            class="requests-grid-container"
          >
            <div class="requests-grid">
              <div
                v-for="(req, index) in paginatedRequests"
                :key="req.id"
                class="request-card improved-request-card"
                :style="{ animationDelay: `${index * 0.1}s` }"
                @click="goToDetail(req.id)"
                style="cursor: pointer; position: relative"
              >
                <div class="card-badges">
                  <Badge :class="badgeClass(req.status) + ' status-badge'">
                    <i :class="statusIconClass(req.status) + ' status-icon'" />
                    {{ (req.status || 'Pending').toUpperCase() }}
                  </Badge>
                  <div v-if="req.isRegistered" class="registered-badge">
                    <i class="pi pi-check-circle"></i> Registered
                  </div>
                </div>
                <div :title="req.title" class="card-title improved-title">
                  {{ req.title }}
                </div>
                <div class="card-description" v-if="req.description">
                  {{ truncateDescription(req.description) }}
                </div>
                <div class="deal improved-deal">
                  <i class="pi pi-wallet"></i> {{ formatDeal(req.dealAmount) }}
                </div>
                <div class="meta-row">
                  <span
                  ><i class="pi pi-user-edit"></i>
                    {{ req.requester?.username }}</span
                  >
                  <span
                  ><i class="pi pi-calendar-plus"></i> <b>Created:</b>
                    {{ formatDate(req.createdAt) }}</span
                  >
                </div>
                <div class="meta-row">
                  <span
                  ><i class="pi pi-hourglass"></i> <b>Deadline:</b>
                    {{ formatDate(req.deadline) }}</span
                  >
                  <span
                  ><i class="pi pi-bookmark"></i>
                    {{ req.category?.name }}</span
                  >
                </div>
              </div>
            </div>
            <Paginator
              :rows="pageSize"
              :totalRecords="filteredRequests.length"
              v-model:first="currentPage"
              @page="onPageChange"
              class="paginator"
            />
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import Paginator from 'primevue/paginator';
import axios from 'axios';
import AppFooter from '../components/AppFooter.vue';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';

const requests = ref([]);
const loading = ref(true);
const error = ref(null);
const categories = ref([]);
const search = ref('');
const selectedCategory = ref(null);
const sidebarCollapsed = ref(false);
const searchFocus = ref(false);
const categoryFocus = ref(false);

// Animation triggers
const isHeaderVisible = ref(false);
const isFiltersVisible = ref(false);
const isGridVisible = ref(false);

const pageSize = 8;
const currentPage = ref(0);

const router = useRouter();
const currentUser = ref(null);

onMounted(async () => {
  setTimeout(() => {
    isHeaderVisible.value = true;
  }, 100);
  setTimeout(() => {
    isGridVisible.value = true;
  }, 300);
  currentUser.value = await authService.getCurrentUser();
  loadRequests();
});

async function loadRequests() {
  loading.value = true;
  error.value = null;
  try {
    const [reqRes, catRes] = await Promise.all([
      axios.get('${import.meta.env.VITE_API_URL}/requests/all'),
      axios.get('${import.meta.env.VITE_API_URL}/categories/all'),
    ]);
    categories.value = catRes.data;
    requests.value = reqRes.data.map((req) => {
      const cat = categories.value.find(
        (cat) => cat.name === req.category?.name
      );
      return {
        ...req,
        category: cat || req.category,
      };
    });
  } catch (e) {
    requests.value = [];
    categories.value = [];
    error.value = 'Failed to load public requests.';
  } finally {
    loading.value = false;
  }
}

const categoryOptions = computed(() => [
  { id: null, name: 'All Categories' },
  ...categories.value,
]);

const filteredRequests = computed(() => {
  let list = requests.value;
  if (search.value) {
    const s = search.value.toLowerCase();
    list = list.filter((r) => r.title?.toLowerCase().includes(s));
  }
  if (selectedCategory.value !== null) {
    list = list.filter(
      (r) => String(r.category?.id) === String(selectedCategory.value)
    );
  }
  if (currentUser.value) {
    list = list.filter((r) => r.requester?.id !== currentUser.value.id);
  }
  list = list.filter((r) => r.status !== 'APPROVED');
  list = list.filter((r) => r.status !== 'CANCELLED');
  return list;
});

const paginatedRequests = computed(() => {
  const start = currentPage.value * pageSize;
  return filteredRequests.value.slice(start, start + pageSize);
});

function onPageChange(e) {
  currentPage.value = e.page;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDeal(amount) {
  if (amount == null) return '-';
  return '$' + amount.toLocaleString();
}

function truncateDescription(description) {
  if (!description) return '';
  return description.length > 120
    ? description.substring(0, 120) + '...'
    : description;
}

function badgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'p-badge-info';
    case 'cancelled':
      return 'p-badge-danger';
    case 'approved':
      return 'p-badge-success';
    case 'completed':
      return 'p-badge-success';
    case 'rejected':
      return 'p-badge-warning';
    default:
      return 'p-badge-info';
  }
}

function statusIconClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'pi pi-clock';
    case 'approved':
      return 'pi pi-check-circle';
    case 'completed':
      return 'pi pi-check';
    case 'cancelled':
      return 'pi pi-times-circle';
    case 'rejected':
      return 'pi pi-ban';
    default:
      return 'pi pi-info-circle';
  }
}

function goToDetail(id) {
  router.push(`/requests/${id}`);
}
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #fff;
}
.main-content {
  display: flex;
  flex: 1;
  margin-left: 240px; /* Ensure main content is not hidden behind sidebar */
  transition: margin-left 0.2s cubic-bezier(.4,0,.2,1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
}

@media (max-width: 900px) {
  .main-content,
  .layout-wrapper.sidebar-collapsed .main-content {
    margin-left: 0;
  }
}
.content {
  flex: 1;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 80px);
}
.requests-container {
  max-width: none;
  margin: 0;
  position: relative;
  padding-left: 0;
}
.header-filters-wrapper {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 1.5rem;
  overflow: hidden;
}
.requests-header {
  padding: 1.5rem 2rem;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.header-animated {
  opacity: 1;
  transform: translateY(0);
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}
.icon-circle {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}
.icon-inner {
  background: white;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-icon {
  font-size: 1.5rem;
  color: #667eea;
}
.header-text {
  flex: 1;
}
.requests-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.2;
}
.header-controls {
  display: flex;
  gap: 15px;
  align-items: center;
}
.search-container {
  width: 300px;
}
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-input {
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  background: white;
  transition: all 0.3s ease;
}
.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.search-icon {
  position: absolute;
  left: 12px;
  color: #a0aec0;
  font-size: 1rem;
}
.filter-options {
  display: flex;
  gap: 12px;
}
.filter-select {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
}
.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.filter-select .p-dropdown-label {
  padding-right: 2.5em !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.filter-select .p-dropdown-clear-icon {
  right: 1.5em !important;
  z-index: 2;
}
.loading-container,
.error-container,
.empty-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 30px 25px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}
.loading-content,
.error-content,
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #667eea;
  animation: spin 1s linear infinite;
}
.error-icon,
.empty-icon {
  font-size: 4rem;
  color: #667eea;
}
.error-icon {
  color: #e53e3e;
}
.requests-grid-container {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.2s;
  margin-bottom: 15px;
}
.grid-animated {
  opacity: 1;
  transform: translateY(0);
}
.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}
.improved-request-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(37, 99, 235, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 28px 28px 24px 28px;
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
  position: relative;
  min-height: 280px;
  padding-top: 80px;
  overflow: visible;
}
.improved-request-card:hover {
  box-shadow: 0 16px 48px rgba(37, 99, 235, 0.2),
  0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-6px) scale(1.02);
}
.card-badges {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  padding: 0 20px;
  box-sizing: border-box;
  z-index: 2;
  margin-bottom: 0;
}
.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  gap: 6px;
  transition: all 0.2s ease;
}
.status-badge:hover {
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.25);
  transform: scale(1.05);
}
.status-icon {
  background: #fff;
  color: #2563eb;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
  margin-right: 4px;
}
.p-badge-info.status-badge {
  background: #2563eb !important;
}
.p-badge-success.status-badge {
  background: #22c55e !important;
}
.p-badge-danger.status-badge {
  background: #ef4444 !important;
}
.p-badge-warning.status-badge {
  background: #f59e42 !important;
}
.registered-badge {
  background: #22c55e;
  color: #fff;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.15);
}
.registered-badge i {
  color: #fff;
  font-size: 1em;
}
.card-title.improved-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 12px;
  letter-spacing: 0.01em;
  line-height: 1.3;
}
.card-description {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 16px;
  font-weight: 400;

  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}
.improved-deal {
  color: #2563eb;
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 6px;
  gap: 16px;
}
.meta-row i {
  margin-right: 0.3em;
  font-size: 0.9em;
  color: #6366f1;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.paginator {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}
.request-card .p-badge {
  font-size: 0.9rem;
  padding: 0.4em 1em;
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  height: 2em;
}
@media (max-width: 1024px) {
  .content {
    padding: 1.5rem;
  }
  .requests-header {
    padding: 20px;
    margin-bottom: 12px;
  }
  .loading-container,
  .error-container,
  .empty-container {
    padding: 25px 20px;
    margin-bottom: 12px;
  }
  .requests-grid-container {
    margin-bottom: 12px;
  }
  .requests-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 15px;
  }
  .header-content {
    flex-direction: column;
    gap: 20px;
  }
  .header-controls {
    width: 100%;
    justify-content: center;
  }
  .search-container {
    width: 100%;
    max-width: 400px;
  }
  .requests-title {
    font-size: 1.8rem;
  }
}
@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-left: 0;
  }
  .requests-header {
    padding: 18px 15px;
    margin-bottom: 10px;
  }
  .loading-container,
  .error-container,
  .empty-container {
    padding: 20px 15px;
    margin-bottom: 10px;
  }
  .requests-grid-container {
    margin-bottom: 10px;
  }
  .requests-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .header-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .search-container {
    max-width: none;
  }
  .filter-options {
    flex-direction: column;
  }
  .requests-title {
    font-size: 1.6rem;
  }
  .icon-circle {
    width: 40px;
    height: 40px;
  }
  .icon-inner {
    width: 30px;
    height: 30px;
  }
  .header-icon {
    font-size: 1.2rem;
  }
}
@media (max-width: 480px) {
  .content {
    padding: 1rem;
  }
  .requests-header {
    padding: 15px 12px;
    margin-bottom: 8px;
  }
  .loading-container,
  .error-container,
  .empty-container {
    padding: 15px 12px;
    margin-bottom: 8px;
  }
  .requests-grid-container {
    margin-bottom: 8px;
  }
  .requests-grid {
    gap: 12px;
  }
  .requests-title {
    font-size: 1.4rem;
  }
  .icon-circle {
    width: 35px;
    height: 35px;
  }
  .icon-inner {
    width: 25px;
    height: 25px;
  }
  .header-icon {
    font-size: 1rem;
  }
}
</style>
