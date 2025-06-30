<template>
  <div class="layout-wrapper">
    <div class="main-content">
      <div class="content">
        <div class="requests-container">
          <!-- Header & Filters -->
          <div class="header-filters-wrapper">
            <!-- Animated Header -->
            <div class="requests-header" :class="{ 'header-animated': isHeaderVisible }">
              <div class="header-content">
                <div class="header-left">
                  <div class="icon-circle">
                    <div class="icon-inner">
                      <i class="pi pi-inbox header-icon" />
                    </div>
                    <div class="icon-glow"></div>
                  </div>
                  <div class="header-text">
                    <h1 class="requests-title">Public Requests</h1>
                    <p class="requests-desc">
                      Browse and discover all public translation requests. Use filters to find requests that match your skills!
                    </p>
                    <div class="header-stats">
                      <div class="stat-item">
                        <i class="pi pi-list stat-icon"></i>
                        <span>{{ requests.length }} Requests</span>
                      </div>
                      <div class="stat-item">
                        <i class="pi pi-clock stat-icon"></i>
                        <span>Active now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Animated Filters -->
            <div class="filters-container" :class="{ 'filters-animated': isFiltersVisible }">
              <div class="filters">
                <div class="search-container">
                  <div class="search-wrapper">
                    <i class="pi pi-search search-icon"></i>
                    <InputText v-model="search" placeholder="Search by title..." class="search-input" @focus="searchFocus = true" @blur="searchFocus = false" />
                  </div>
                </div>
                <div class="filter-options">
                  <Dropdown v-model="selectedCategory" :options="categoryOptions" optionLabel="name" optionValue="id" placeholder="All Categories" class="filter-select" @focus="categoryFocus = true" @blur="categoryFocus = false" />
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
              <Button label="Try Again" @click="loadRequests" class="btn btn-secondary" />
            </div>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredRequests.length === 0" class="empty-container">
            <div class="empty-content">
              <div class="empty-icon">
                <i class="pi pi-inbox"></i>
              </div>
              <h3>No public requests found</h3>
              <p v-if="search || selectedCategory">
                No requests match your current filters. Try adjusting your search criteria.
              </p>
              <p v-else>
                There are no public requests yet. Check back later!
              </p>
            </div>
          </div>

          <!-- Requests Grid -->
          <div v-else class="requests-grid-container" :class="{ 'grid-animated': isGridVisible }">
            <div class="requests-grid">
              <div
                v-for="(req, index) in paginatedRequests"
                :key="req.id"
                class="request-card"
                :class="{ 'card-animated': true }"
                :style="{ animationDelay: `${index * 0.1}s` }"
              >
                <div class="card-header">
                  <span class="card-title" :title="req.title">{{ req.title }}</span>
                  <Badge :value="req.status || 'Pending'" :severity="req.status?.toLowerCase() === 'closed' ? 'danger' : 'info'" />
                </div>
                <div class="card-body">
                  <div class="deal"><i class="pi pi-money-bill"></i> {{ formatDeal(req.dealAmount) }}</div>
                  <div class="meta">
                    <span><i class="pi pi-calendar"></i> {{ formatDate(req.deadline) }}</span>
                    <span><i class="pi pi-tag"></i> {{ req.category?.name }}</span>
                  </div>
                  <div class="meta">
                    <span><i class="pi pi-user"></i> {{ req.requester?.username }}</span>
                    <span><i class="pi pi-clock"></i> {{ formatDate(req.createdAt) }}</span>
                  </div>
                </div>
                <Button icon="pi pi-eye" label="Details" class="p-button-text detail-btn" />
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import Paginator from 'primevue/paginator'
import axios from 'axios'

const requests = ref([])
const loading = ref(true)
const error = ref(null)
const categories = ref([])
const search = ref('')
const selectedCategory = ref(null)
const searchFocus = ref(false)
const categoryFocus = ref(false)

// Animation triggers
const isHeaderVisible = ref(false)
const isFiltersVisible = ref(false)
const isGridVisible = ref(false)

const pageSize = 8
const currentPage = ref(0)

onMounted(() => {
  setTimeout(() => { isHeaderVisible.value = true }, 100)
  setTimeout(() => { isFiltersVisible.value = true }, 300)
  setTimeout(() => { isGridVisible.value = true }, 500)
  loadRequests()
})

async function loadRequests() {
  loading.value = true
  error.value = null
  try {
    const [reqRes, catRes] = await Promise.all([
      axios.get('/api/requests/all'),
      axios.get('/api/categories/all')
    ])
    categories.value = catRes.data
    requests.value = reqRes.data.map(req => {
      const cat = categories.value.find(cat => cat.name === req.category?.name)
      return {
        ...req,
        category: cat || req.category
      }
    })
  } catch (e) {
    requests.value = []
    categories.value = []
    error.value = 'Failed to load public requests.'
  } finally {
    loading.value = false
  }
}

const categoryOptions = computed(() => [
  { id: null, name: 'All Categories' },
  ...categories.value
])

const filteredRequests = computed(() => {
  let list = requests.value
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter(r => r.title?.toLowerCase().includes(s))
  }
  if (selectedCategory.value !== null) {
    list = list.filter(r => String(r.category?.id) === String(selectedCategory.value))
  }
  return list
})

const paginatedRequests = computed(() => {
  const start = currentPage.value * pageSize
  return filteredRequests.value.slice(start, start + pageSize)
})

function onPageChange(e) {
  currentPage.value = e.page
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function formatDeal(amount) {
  if (amount == null) return '-'
  return amount.toLocaleString() + ' đ'
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
  margin-left: 0;
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
  padding: 1.75rem 2rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
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
  gap: 40px;
}
.header-left {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  flex: 1;
}
.icon-circle {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  animation: pulse 2s infinite;
}
.icon-inner {
  background: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-glow {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.3;
  animation: glow 3s ease-in-out infinite alternate;
}
.header-icon {
  font-size: 2.5rem;
  color: #667eea;
  z-index: 1;
}
.header-text {
  flex: 1;
}
.requests-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
  line-height: 1.2;
}
.requests-desc {
  color: #64748b;
  font-size: 1.2rem;
  margin-bottom: 24px;
  line-height: 1.6;
}
.header-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(102, 126, 234, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 500;
}
.stat-icon {
  font-size: 1rem;
  color: #10b981;
}
.filters-container {
  padding: 1.25rem 2rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.2s;
}
.filters-animated {
  opacity: 1;
  transform: translateY(0);
}
.filters {
  display: flex;
  gap: 20px;
  align-items: center;
}
.search-container {
  flex: 1;
  max-width: 400px;
}
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
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
  left: 16px;
  color: #a0aec0;
  font-size: 1.1rem;
}
.filter-options {
  display: flex;
  gap: 12px;
}
.filter-select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
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
  transition-delay: 0.4s;
  margin-bottom: 15px;
}
.grid-animated {
  opacity: 1;
  transform: translateY(0);
}
.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 15px;
}
.request-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
  animation: card-fade-in 0.6s ease-out forwards;
}
.request-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.7rem;
}
.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1e293b;
  max-width: 210px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.deal {
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 0.2rem;
}
.meta {
  display: flex;
  gap: 1.2rem;
  color: #64748b;
  font-size: 0.98em;
  align-items: center;
}
.meta i {
  margin-right: 0.3em;
}
.detail-btn {
  align-self: flex-end;
  margin-top: 0.7rem;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes glow {
  0% { opacity: 0.3; transform: scale(1); }
  100% { opacity: 0.6; transform: scale(1.1); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes card-fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.paginator {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}
@media (max-width: 1024px) {
  .content {
    padding: 1.5rem;
  }
  .requests-header {
    padding: 20px;
    margin-bottom: 12px;
  }
  .filters-container {
    padding: 12px;
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
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 32px;
  }
  .header-left {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .header-stats {
    justify-content: center;
  }
  .requests-title {
    font-size: 2rem;
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
  .filters-container {
    padding: 10px;
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
    gap: 10px;
  }
  .filters {
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
    font-size: 1.75rem;
  }
  .requests-desc {
    font-size: 1rem;
  }
  .header-stats {
    flex-direction: column;
    align-items: center;
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
  .filters-container {
    padding: 8px;
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
    gap: 8px;
  }
  .icon-circle {
    width: 60px;
    height: 60px;
  }
  .icon-inner {
    width: 45px;
    height: 45px;
  }
  .header-icon {
    font-size: 2rem;
  }
  .requests-title {
    font-size: 1.5rem;
  }
}
</style> 
