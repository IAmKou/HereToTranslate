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
                  <div v-if="isUserRegistered(req)" class="registered-indicator" title="You are registered for this request">
                    <i class="pi pi-check-circle"></i>
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
                  <span class="meta-item">
                    <i class="pi pi-user"></i>
                    {{ req.requester?.username }}
                  </span>
                  <span class="meta-item">
                    <i class="pi pi-folder"></i>
                    {{ req.category?.name }}
                  </span>
                </div>
                <div class="meta-row">
                  <span class="meta-item">
                    <i class="pi pi-calendar"></i>
                    {{ formatDate(req.deadline) }}
                  </span>
                  <span v-if="req.targetLanguages && req.targetLanguages.length" class="meta-item languages-compact">
                    <i class="pi pi-globe"></i>
                    <span v-for="(lang) in req.targetLanguages.slice(0, 2)" :key="lang" class="language-tag-compact">
                      {{ getLanguageName(lang) }}
                    </span>
                    <span v-if="req.targetLanguages.length > 2" class="more-languages">
                      +{{ req.targetLanguages.length - 2 }}
                    </span>
                  </span>
                </div>
                <div v-if="req.sourceLanguage" class="meta-row">
                  <span class="meta-item">
                    <i class="pi pi-arrow-right"></i>
                    From: {{ getLanguageName(req.sourceLanguage) }}
                  </span>
                  <span class="meta-item source-language-display">
                    <i class="pi pi-language"></i>
                    <span class="source-language-tag">
                      {{ getLanguageName(req.sourceLanguage) }}
                    </span>
                  </span>
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
import axiosInstance from '../api';
import AppFooter from '../components/AppFooter.vue';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import { SUPPORTED_LANGUAGES } from '../utils/languages';

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
    console.log('🔍 loadRequests - currentUser:', currentUser.value);
    console.log('🔍 loadRequests - axiosInstance.defaults:', axiosInstance.defaults);

    const [reqRes, catRes] = await Promise.all([
      axiosInstance.get('/requests/all'),
      axiosInstance.get('/categories/all'),
    ]);

    console.log('🔍 loadRequests - response headers:', reqRes.headers);
    console.log('🔍 loadRequests - response status:', reqRes.status);

    categories.value = catRes.data;
    requests.value = reqRes.data.map((req) => {
      const cat = categories.value.find(
        (cat) => cat.name === req.category?.name
      );
      console.log('Request data:', req); // Debug log
      console.log('Current user ID:', currentUser.value?.id, 'Type:', typeof currentUser.value?.id); // Debug current user ID
      console.log('Request registrants:', req.registrants); // Debug registrants
      console.log('Is registered check:', req.registrants?.some(r => String(r.id) === String(currentUser.value?.id))); // Debug comparison with string conversion
      return {
        ...req,
        category: cat || req.category,
      };
    });
  } catch (e) {
    console.error('Error loading requests:', e); // Debug log
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

  // Chỉ hiển thị những request có status là PENDING
  list = list.filter((r) => (r.status || '').toUpperCase() === 'PENDING');

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

  // Add isRegistered calculation if not provided by backend
  return list.map(req => ({
    ...req,
    isRegistered: req.isRegistered !== undefined ? req.isRegistered :
      (req.registrants && currentUser.value ?
        req.registrants.some(r => String(r.id) === String(currentUser.value.id)) :
        false)
  }));
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

function isUserRegistered(req) {
  if (!currentUser.value || !req.registrants) return false;
  return req.registrants.some(r => String(r.id) === String(currentUser.value.id));
}

function getLanguageName(code) {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.name : code;
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
  padding: 1.75rem;
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
  border-radius: 20px;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 1.25rem;
  overflow: hidden;
}
.requests-header {
  padding: 1.25rem 1.75rem;
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
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}
.icon-inner {
  background: white;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-icon {
  font-size: 1.2rem;
  color: #667eea;
}
.header-text {
  flex: 1;
}
.requests-title {
  font-size: 1.6rem;
  font-weight: 700;
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
  padding: 8px 14px 8px 36px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
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
  left: 10px;
  color: #a0aec0;
  font-size: 0.9rem;
}
.filter-options {
  display: flex;
  gap: 12px;
}
.filter-select {
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
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
  border-radius: 18px;
  padding: 25px 20px;
  text-align: center;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
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
  width: 50px;
  height: 50px;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #667eea;
  animation: spin 1s linear infinite;
}
.error-icon,
.empty-icon {
  font-size: 3.5rem;
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
  margin-bottom: 12px;
}
.grid-animated {
  opacity: 1;
  transform: translateY(0);
}
.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 18px;
}
.improved-request-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(37, 99, 235, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px 20px 16px 20px;
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
  position: relative;
  min-height: 220px;
  padding-top: 72px;
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
  padding: 12px 20px 0 20px;
  box-sizing: border-box;
  z-index: 2;
  margin-bottom: 0;
}
.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #fff;
  border: 2px solid #fff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  gap: 4px;
  transition: all 0.2s ease;
}
.status-badge:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  transform: scale(1.05);
}
.status-icon {
  background: #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  margin-right: 3px;
}

/* PENDING - Màu cam để thể hiện tính cấp bách */
.p-badge-info.status-badge {
  background: linear-gradient(90deg, #ff8c00 0%, #ffa500 100%) !important;
}
.p-badge-info.status-badge .status-icon {
  color: #ff8c00;
}

/* APPROVED - Màu xanh lá */
.p-badge-success.status-badge {
  background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%) !important;
}
.p-badge-success.status-badge .status-icon {
  color: #22c55e;
}

/* CANCELLED/REJECTED - Màu đỏ */
.p-badge-danger.status-badge {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%) !important;
}
.p-badge-danger.status-badge .status-icon {
  color: #ef4444;
}

/* COMPLETED - Màu xanh dương */
.p-badge-warning.status-badge {
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%) !important;
}
.p-badge-warning.status-badge .status-icon {
  color: #3b82f6;
}

.registered-indicator {
  background: #22c55e;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.2);
  transition: all 0.2s ease;
  cursor: help;
}
.registered-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}
.registered-indicator i {
  color: #fff;
  font-size: 0.9em;
}
.card-title.improved-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 3px;
  letter-spacing: 0.01em;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-description {
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 14px;
  font-weight: 400;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.improved-deal {
  color: #2563eb;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  color: #4b5563;
  font-size: 0.875rem;
  margin-bottom: 8px;
  gap: 12px;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.meta-item i {
  font-size: 0.875em;
  color: #6366f1;
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

.languages-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.language-tag-compact {
  background: #dbeafe;
  color: #1e40af;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #bfdbfe;
  white-space: nowrap;
}

.more-languages {
  background: #f3f4f6;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}

.source-language-display {
  display: flex;
  align-items: center;
  gap: 4px;
}

.source-language-tag {
  background: #fef3c7;
  color: #d97706;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #fde68a;
  white-space: nowrap;
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
  font-size: 0.85rem;
  padding: 0.35em 0.9em;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  height: 1.8em;
}
@media (max-width: 1024px) {
  .content {
    padding: 1.25rem;
  }
  .requests-header {
    padding: 18px;
    margin-bottom: 10px;
  }
  .loading-container,
  .error-container,
  .empty-container {
    padding: 20px 18px;
    margin-bottom: 10px;
  }
  .requests-grid-container {
    margin-bottom: 10px;
  }
  .requests-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
  }
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  .header-controls {
    width: 100%;
    justify-content: center;
  }
  .search-container {
    width: 100%;
    max-width: 350px;
  }
  .requests-title {
    font-size: 1.5rem;
  }
}
@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-left: 0;
  }
  .requests-header {
    padding: 16px 14px;
    margin-bottom: 8px;
  }
  .loading-container,
  .error-container,
  .empty-container {
    padding: 18px 14px;
    margin-bottom: 8px;
  }
  .requests-grid-container {
    margin-bottom: 8px;
  }
  .requests-grid {
    grid-template-columns: 1fr;
    gap: 12px;
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
    font-size: 1.4rem;
  }
  .icon-circle {
    width: 36px;
    height: 36px;
  }
  .icon-inner {
    width: 28px;
    height: 28px;
  }
  .header-icon {
    font-size: 1.1rem;
  }
}
@media (max-width: 480px) {
  .content {
    padding: 0.875rem;
  }
  .requests-header {
    padding: 14px 12px;
    margin-bottom: 6px;
  }
  .loading-container,
  .error-container,
  .empty-container {
    padding: 16px 12px;
    margin-bottom: 6px;
  }
  .requests-grid-container {
    margin-bottom: 6px;
  }
  .requests-grid {
    gap: 10px;
  }
  .requests-title {
    font-size: 1.3rem;
  }
  .icon-circle {
    width: 32px;
    height: 32px;
  }
  .icon-inner {
    width: 24px;
    height: 24px;
  }
  .header-icon {
    font-size: 0.95rem;
  }
}
</style>
