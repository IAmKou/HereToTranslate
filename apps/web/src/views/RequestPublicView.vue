<template>
  <div class="public-requests-page">
    <h2>All Public Requests</h2>
    <p class="desc">Browse and discover all public translation requests. Use filters to find requests that match your skills!</p>
    <div class="search-filter-card">
      <div class="search-group">
        <span class="search-icon pi pi-search"></span>
        <InputText v-model="search" placeholder="Search by title..." class="search-input" />
      </div>
      <div class="filter-group">
        <span class="filter-icon pi pi-tag"></span>
        <Dropdown v-model="selectedCategory" :options="categoryOptions" optionLabel="name" optionValue="id" placeholder="All Categories" class="category-select" showClear />
      </div>
    </div>
    <div v-if="loading" class="card-list">
      <Skeleton v-for="i in 6" :key="i" width="100%" height="160px" class="card-skeleton" borderRadius="16px" />
    </div>
    <div v-else-if="filteredRequests.length === 0" class="empty-state">
      <i class="pi pi-search empty-icon"></i>
      <div>No public requests found.</div>
    </div>
    <div v-else class="card-list">
      <div v-for="req in filteredRequests" :key="req.id" class="request-card">
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Badge from 'primevue/badge'

const requests = ref([])
const loading = ref(true)
const categories = ref([])
const search = ref('')
const selectedCategory = ref(null)

onMounted(async () => {
  try {
    const [reqRes, catRes] = await Promise.all([
      axios.get('/api/requests/all'),
      axios.get('/api/categories/all')
    ])
    requests.value = reqRes.data
    categories.value = catRes.data
  } catch (e) {
    requests.value = []
    categories.value = []
  } finally {
    loading.value = false
  }
})

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
  if (selectedCategory.value) {
    list = list.filter(r => String(r.category?.id) === String(selectedCategory.value))
  }
  return list
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString()
}
function formatDeal(amount) {
  if (amount == null) return '-'
  return amount.toLocaleString() + ' đ'
}
</script>

<style scoped>
.public-requests-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1rem 2rem 1rem;
}
h2 {
  font-size: 2.1rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}
.desc {
  color: #64748b;
  margin-bottom: 1.5rem;
}
.search-filter-card {
  display: flex;
  gap: 1.2rem;
  margin-bottom: 2.2rem;
  background: #f8fafc;
  border-radius: 16px;
  box-shadow: 0 2px 12px 0 rgba(80, 112, 255, 0.07);
  padding: 1.1rem 1.3rem 1.1rem 1.3rem;
  align-items: center;
  flex-wrap: wrap;
}
.search-group {
  display: flex;
  align-items: center;
  flex: 2 1 350px;
  min-width: 220px;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #2563eb;
  font-size: 1.25rem;
  pointer-events: none;
  z-index: 2;
}
.search-input {
  width: 100%;
  padding-left: 2.3rem !important;
}
.filter-group {
  display: flex;
  align-items: center;
  flex: 1 1 180px;
  min-width: 180px;
  position: relative;
}
.filter-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 1.1rem;
  pointer-events: none;
  z-index: 2;
}
.category-select {
  width: 100%;
  padding-left: 2.1rem !important;
}
/* PrimeVue input override */
.search-input :deep(.p-inputtext) {
  height: 2.6rem;
  font-size: 1.1rem;
  border-radius: 10px;
  border-width: 2px;
  padding-left: 2.3rem;
  transition: border-color 0.18s;
}
.search-input :deep(.p-inputtext:focus) {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #dbeafe;
}
.category-select :deep(.p-dropdown) {
  height: 2.6rem;
  font-size: 1.1rem;
  border-radius: 10px;
  padding-left: 2.1rem;
  transition: border-color 0.18s;
}
.category-select :deep(.p-dropdown:focus-within) {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #dbeafe;
}
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}
.request-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px 0 rgba(80, 112, 255, 0.08);
  padding: 1.3rem 1.2rem 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.18s, transform 0.18s;
  border: 1.5px solid #f1f5f9;
  position: relative;
}
.request-card:hover {
  box-shadow: 0 6px 24px 0 rgba(80, 112, 255, 0.16);
  transform: translateY(-2px) scale(1.012);
  border-color: #b6ccff;
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
.card-skeleton {
  margin-bottom: 0.5rem;
}
.empty-state {
  text-align: center;
  color: #64748b;
  margin: 3rem 0 2rem 0;
  font-size: 1.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  font-size: 3.2rem;
  margin-bottom: 0.7rem;
  color: #2563eb;
}
@media (max-width: 700px) {
  .search-filter-card {
    flex-direction: column;
    gap: 0.7rem;
    padding: 1rem 0.7rem;
  }
  .search-group, .filter-group {
    width: 100%;
    min-width: 0;
  }
}
</style>
