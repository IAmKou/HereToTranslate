<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <AdminNavbar />
    <div class="main-content">
      <AdminSidebar v-model:collapsed="isSidebarCollapsed" />
      <div class="content">
        <div class="admin-transaction-history">
          <!-- Header Section -->
          <div class="page-header">
            <div class="header-content">
              <div class="header-left">
                <h1>Transaction History</h1>
                <p class="subtitle">Monitor all system transactions</p>
              </div>
            </div>

            <!-- Stats Cards -->
            <div class="stats-container">
              <div class="stat-card stat-card-total">
                <div class="stat-icon total">
                  <i class="pi pi-list"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ totalTransactions }}</span>
                  <span class="stat-label">Total Transactions</span>
                </div>
              </div>
              <div class="stat-card stat-card-deposits">
                <div class="stat-icon deposits">
                  <i class="pi pi-arrow-down"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ formatCurrency(totalDeposits) }}</span>
                  <span class="stat-label">Total Deposits</span>
                </div>
              </div>
              <div class="stat-card stat-card-withdrawals">
                <div class="stat-icon withdrawals">
                  <i class="pi pi-arrow-up"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ formatCurrency(totalWithdrawals) }}</span>
                  <span class="stat-label">Total Withdrawals</span>
                </div>
              </div>
              <div class="stat-card stat-card-pending">
                <div class="stat-icon pending">
                  <i class="pi pi-clock"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ pendingTransactions }}</span>
                  <span class="stat-label">Pending</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Filters Section -->
          <div class="filters-section">
            <div class="filters-row">
              <div class="filter-group">
                <label>Type:</label>
                <select v-model="filters.type" class="filter-select">
                  <option value="">All Types</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAW">Withdraw</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Status:</label>
                <select v-model="filters.status" class="filter-select">
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Date Range:</label>
                <select v-model="filters.dateRange" class="filter-select">
                  <option value="">All Time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Amount Range:</label>
                <div class="amount-range">
                  <input
                    v-model="filters.minAmount"
                    type="number"
                    placeholder="Min"
                    class="amount-input"
                  />
                  <span>-</span>
                  <input
                    v-model="filters.maxAmount"
                    type="number"
                    placeholder="Max"
                    class="amount-input"
                  />
                </div>
              </div>
              <button @click="clearFilters" class="clear-filters-btn">
                <i class="pi pi-refresh"></i>
                Clear Filters
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading transactions...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <p>{{ error }}</p>
            <button @click="loadTransactions" class="retry-btn">Retry</button>
          </div>

          <!-- Transactions Table -->
          <div v-else class="table-section">
            <div v-if="filteredTransactions.length === 0" class="empty-state">
              <i class="pi pi-inbox"></i>
              <h3>No transactions found</h3>
              <p>No transactions match your current filters.</p>
            </div>

            <div v-else class="transactions-table-container">
              <table class="transactions-table">
                <thead>
                <tr>
                  <th>No.</th>
                  <th @click="sortBy('user')" class="sortable">
                    User
                    <i :class="getSortIcon('user')"></i>
                  </th>
                  <th @click="sortBy('amount')" class="sortable">
                    Amount
                    <i :class="getSortIcon('amount')"></i>
                  </th>
                  <th @click="sortBy('type')" class="sortable">
                    Type
                    <i :class="getSortIcon('type')"></i>
                  </th>
                  <th @click="sortBy('status')" class="sortable">
                    Status
                    <i :class="getSortIcon('status')"></i>
                  </th>
                  <th @click="sortBy('createdAt')" class="sortable">
                    Date
                    <i :class="getSortIcon('createdAt')"></i>
                  </th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(transaction, idx) in paginatedTransactions" :key="transaction.id" class="transaction-row">
                  <td class="transaction-no">{{ startIndex + idx + 1 }}</td>
                  <td class="user-cell">
                    <div class="user-info">
                      <div class="user-avatar">
                        <img v-if="transaction.user?.avatar" :src="transaction.user.avatar" :alt="transaction.user.fullName" />
                        <div v-else class="user-initials">
                          {{ getInitials(transaction.user?.fullName || transaction.user?.username || transaction.user?.email) }}
                        </div>
                      </div>
                      <div class="user-details">
                        <div class="user-name">{{ transaction.user?.fullName || transaction.user?.username || 'Unknown' }}</div>
                        <div class="user-email">{{ transaction.user?.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="amount-cell">
                      <span :class="['amount', transaction.amount > 0 ? 'positive' : 'negative']">
                        {{ formatCurrency(Math.abs(transaction.amount)) }}
                      </span>
                  </td>
                  <td class="type-cell">
                      <span :class="['type-badge', `type-${getTransactionType(transaction).toLowerCase()}`]">
                        {{ getTransactionType(transaction) }}
                      </span>
                  </td>
                  <td class="status-cell">
                      <span :class="['status-badge', `status-${transaction.status.toLowerCase()}`]">
                        {{ formatStatus(transaction.status) }}
                      </span>
                  </td>
                  <td class="date-cell">
                    {{ formatDate(transaction.createdAt) }}
                  </td>
                  <td class="actions-cell">
                    <button @click="viewTransactionDetails(transaction)" class="action-btn view-btn" title="View Details">
                      <i class="pi pi-eye"></i>
                    </button>
                    <button v-if="transaction.status === 'pending'" @click="approveTransaction(transaction.id)" class="action-btn approve-btn" title="Approve">
                      <i class="pi pi-check"></i>
                    </button>
                    <button v-if="transaction.status === 'pending'" @click="rejectTransaction(transaction.id)" class="action-btn reject-btn" title="Reject">
                      <i class="pi pi-times"></i>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination giống MyRequestView.vue -->
            <div class="pagination-controls">
              <div class="pagination-info">
                <span>Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ filteredTransactions.length }} transactions</span>
              </div>
              <div class="pagination-buttons">
                <button @click="prevPage" :disabled="currentPage === 1" class="btn btn-secondary">
                  <i class="pi pi-chevron-left"></i> Previous
                </button>
                <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
                <button @click="nextPage" :disabled="currentPage === totalPages" class="btn btn-secondary">
                  Next <i class="pi pi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar.vue';
import AdminSidebar from '../components/AdminSidebar.vue';
import AppFooter from '../components/AppFooter.vue';

interface User {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  avatar?: string;
}

interface Transaction {
  id: number;
  amount: number;
  status: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

interface Filters {
  userId: string;
  type: string;
  status: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
}

const transactions = ref<Transaction[]>([]);
const users = ref<User[]>([]);
const loading = ref(true);
const error = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const isSidebarCollapsed = ref(false);

const filters = ref<Filters>({
  userId: '',
  type: '',
  status: '',
  dateRange: '',
  minAmount: '',
  maxAmount: ''
});

const sortKey = ref('');
const sortOrder = ref(1);

// Xoá itemsPerPageOptions và selector

// Computed properties
const filteredTransactions = computed(() => {
  let filtered = [...transactions.value];

  // Filter by type
  if (filters.value.type) {
    filtered = filtered.filter((t: any) => {
      if (filters.value.type === 'DEPOSIT') return t.amount > 0;
      if (filters.value.type === 'WITHDRAW') return t.amount < 0;
      return true;
    });
  }

  // Filter by status
  if (filters.value.status) {
    filtered = filtered.filter(t => t.status.toLowerCase() === filters.value.status.toLowerCase());
  }

  // Filter by date range
  if (filters.value.dateRange) {
    const days = parseInt(filters.value.dateRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= cutoffDate;
    });
  }

  // Filter by amount range
  if (filters.value.minAmount) {
    const minAmount = parseFloat(filters.value.minAmount);
    filtered = filtered.filter(t => Math.abs(t.amount) >= minAmount);
  }

  if (filters.value.maxAmount) {
    const maxAmount = parseFloat(filters.value.maxAmount);
    filtered = filtered.filter(t => Math.abs(t.amount) <= maxAmount);
  }

  // Sort
  if (sortKey.value) {
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortKey.value) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'user':
          aVal = a.user.fullName || a.user.username || a.user.email;
          bVal = b.user.fullName || b.user.username || b.user.email;
          break;
        case 'amount':
          aVal = Math.abs(a.amount);
          bVal = Math.abs(b.amount);
          break;
        case 'type':
          aVal = getTransactionType(a);
          bVal = getTransactionType(b);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -1 * sortOrder.value;
      if (aVal > bVal) return 1 * sortOrder.value;
      return 0;
    });
  } else {
    // Default sort by date descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return filtered;
});

const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / itemsPerPage.value));

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredTransactions.value.slice(start, end);
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, filteredTransactions.value.length));

// Sidebar state (example, adjust as needed)
// Xoá tất cả các khai báo isSidebarCollapsed trùng lặp, chỉ giữ lại một khai báo duy nhất ở đầu <script setup>

// Format currency utility
function formatCurrency(amount: number | string) {
  const num = Number(amount);
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Total transactions
const totalTransactions = computed(() => filteredTransactions.value.length);

const totalDeposits = computed(() => {
  return filteredTransactions.value
    .filter((t: any) => Number(t.amount) > 0)
    .reduce((sum: number, t: any) => {
      const amt = Number(t.amount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
});

const totalWithdrawals = computed(() => {
  return filteredTransactions.value
    .filter((t: any) => Number(t.amount) < 0)
    .reduce((sum: number, t: any) => {
      const amt = Math.abs(Number(t.amount));
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
});

const pendingTransactions = computed(() => {
  return filteredTransactions.value.filter(t => t.status === 'pending').length;
});

// Methods
async function loadTransactions() {
  loading.value = true;
  error.value = '';

  try {
    const [transactionsRes, usersRes] = await Promise.all([
      axios.get('/api/admin/transactions'),
      axios.get('/api/admin/transactions/users')
    ]);

    transactions.value = transactionsRes.data || [];
    users.value = usersRes.data || [];
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to load transactions.';
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.value = {
    userId: '',
    type: '',
    status: '',
    dateRange: '',
    minAmount: '',
    maxAmount: ''
  };
  currentPage.value = 1;
}

function sortBy(key: string) {
  if (sortKey.value === key) {
    sortOrder.value *= -1;
  } else {
    sortKey.value = key;
    sortOrder.value = 1;
  }
}

function getSortIcon(key: string): string {
  if (sortKey.value !== key) return 'pi pi-sort';
  return sortOrder.value === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
}

function getTransactionType(transaction: Transaction): string {
  if (transaction.amount > 0) return 'Deposit';
  if (transaction.amount < 0) return 'Withdraw';
  return 'Transfer';
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function goToPage(page: number) {
  currentPage.value = page;
}

function viewTransactionDetails(transaction: Transaction) {
  // TODO: Implement transaction details modal
  console.log('View transaction details:', transaction);
}

async function approveTransaction(transactionId: number) {
  try {
    await axios.post(`/api/admin/transactions/${transactionId}/approve`);
    await loadTransactions();
  } catch (err: any) {
    console.error('Failed to approve transaction:', err);
  }
}

async function rejectTransaction(transactionId: number) {
  try {
    await axios.post(`/api/admin/transactions/${transactionId}/reject`);
    await loadTransactions();
  } catch (err: any) {
    console.error('Failed to reject transaction:', err);
  }
}

// Watch for filter changes to reset pagination
watch(filters, () => {
  currentPage.value = 1;
}, { deep: true });

onMounted(loadTransactions);
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  /* Add margin-left to avoid being covered by sidebar */
  margin-left: 260px;
  transition: margin-left 0.2s cubic-bezier(.4,0,.2,1);
}
.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
}

.content {
  flex: 1;
  padding: 20px;
  background: #f8f9fb;
}

.admin-transaction-history {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.header-content {
  margin-bottom: 24px;
}

.header-left h1 {
  color: #1f2937;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
}

.stat-icon.total { background: #3b82f6; }
.stat-icon.deposits { background: #10b981; }
.stat-icon.withdrawals { background: #ef4444; }
.stat-icon.pending { background: #f59e0b; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.filters-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.filter-group {
  margin-right: 0;
  margin-bottom: 0;
}
.clear-filters-btn {
  margin-left: auto;
  height: 40px;
  align-self: center;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.amount-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 80px;
}

.filters-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.clear-filters-btn, .export-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.clear-filters-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
}

.export-btn {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background: #2563eb;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 48px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state i {
  font-size: 2rem;
  color: #ef4444;
  margin-bottom: 16px;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.empty-state i {
  font-size: 3rem;
  color: #9ca3af;
  margin-bottom: 16px;
}

.transactions-table-container {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
}

.transactions-table th {
  background: #f9fafb;
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.transactions-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.transactions-table th.sortable:hover {
  background: #f3f4f6;
}

.transactions-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #f3f4f6;
}

.transaction-row:hover {
  background: #f9fafb;
}

.user-cell {
  min-width: 200px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-initials {
  width: 100%;
  height: 100%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
}

.user-details {
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.user-email {
  font-size: 0.875rem;
  color: #6b7280;
}

.amount-cell {
  font-weight: 600;
}

.amount.positive {
  color: #10b981;
}

.amount.negative {
  color: #ef4444;
}

.type-badge, .status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.type-deposit {
  background: #d1fae5;
  color: #065f46;
}

.type-withdraw {
  background: #fee2e2;
  color: #991b1b;
}

.type-transfer {
  background: #dbeafe;
  color: #1e40af;
}

.status-completed, .status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.date-cell {
  color: #6b7280;
  font-size: 0.875rem;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.view-btn {
  background: #dbeafe;
  color: #1e40af;
}

.view-btn:hover {
  background: #bfdbfe;
}

.approve-btn {
  background: #d1fae5;
  color: #065f46;
}

.approve-btn:hover {
  background: #a7f3d0;
}

.reject-btn {
  background: #fee2e2;
  color: #991b1b;
}

.reject-btn:hover {
  background: #fecaca;
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
}
.pagination-controls button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.pagination-controls button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}
.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pagination-info {
  flex: 1;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}
.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.page-info {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  padding: 0 0.5rem;
}
@media (max-width: 768px) {
  .pagination-controls {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  .pagination-info {
    order: 1;
  }
  .pagination-buttons {
    order: 2;
    justify-content: center;
  }
}
.filter-group .filter-select,
.filter-group select,
.filter-group input[type="text"],
.filter-group input[type="number"] {
  width: 160px;
  max-width: 100%;
}
@media (max-width: 900px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .clear-filters-btn {
    margin-left: 0;
    margin-top: 8px;
    width: 100%;
  }
  .filter-group .filter-select,
  .filter-group select,
  .filter-group input[type="text"],
  .filter-group input[type="number"] {
    width: 120px;
  }
}
</style>
