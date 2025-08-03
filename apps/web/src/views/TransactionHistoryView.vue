<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <Navbar />
    <div class="main-content-wrapper">
      <Sidebar :collapsed="sidebarCollapsed" @update:collapsed="sidebarCollapsed = $event" />
      <div class="main-content">
        <div class="transaction-history-container">
          <div class="header-section">
            <h2>Transaction History</h2>
            <p class="subtitle">View all your transaction history</p>
          </div>

          <!-- Summary Section (card) -->
          <div class="card summary-section">
            <div class="summary-cards">
              <div class="summary-card deposit">
                <div class="summary-icon"><span>💰</span></div>
                <div class="summary-info">
                  <div class="summary-label" title="Số tiền bạn đã nạp vào hệ thống.">Total Deposits <span class="info-tooltip">&#9432;</span></div>
                  <div class="summary-value positive">{{ formatCurrency(totalDeposits) }}</div>
                </div>
              </div>
              <div class="summary-card withdraw">
                <div class="summary-icon"><span>💸</span></div>
                <div class="summary-info">
                  <div class="summary-label" title="Tổng số tiền bạn đã rút khỏi hệ thống.">Total Withdrawals <span class="info-tooltip">&#9432;</span></div>
                  <div class="summary-value negative">{{ formatCurrency(totalWithdrawals) }}</div>
                </div>
              </div>
              <div class="summary-card balance" v-if="wallet && typeof wallet.balance === 'number'">
                <div class="summary-icon"><span>💼</span></div>
                <div class="summary-info">
                  <div class="summary-label" title="Số dư hiện tại trong ví của bạn.">Current Balance <span class="info-tooltip">&#9432;</span></div>
                  <div class="summary-value balance">{{ formatCurrency(wallet.balance) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Filter Section (card) -->
          <div class="card filter-section">
            <form class="filter-form" @submit.prevent="() => {}">
              <div class="filter-group">
                <label>Type:</label>
                <div class="custom-select-wrapper">
                  <select v-model="filterDraft.type" class="filter-select custom-type-select" @change="applyFilters">
                    <option value="">All Types</option>
                    <option value="deposit">💳 Deposit</option>
                    <option value="payment">💸 Payment</option>
                    <option value="withdraw">💸 Withdraw</option>
                  </select>
                  <span v-if="filterDraft.type" class="type-icon-preview">
                    <span v-if="filterDraft.type === 'deposit'">💳</span>
                    <span v-else-if="filterDraft.type === 'payment'">💸</span>
                    <span v-else-if="filterDraft.type === 'withdraw'">💸</span>
                    <span v-else>🔄</span>
                  </span>
                </div>
              </div>
              <div class="filter-group">
                <label>Status:</label>
                <div class="custom-select-wrapper">
                  <select v-model="filterDraft.status" class="filter-select custom-status-select" @change="applyFilters">
                    <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                      <span :class="['status-badge', opt.color]">{{ opt.label }}</span>
                    </option>
                  </select>
                  <span v-if="filterDraft.status" class="status-badge-preview">
                    <span :class="['status-badge', statusOptions.find(o => o.value === filterDraft.status)?.color]">
                      {{ statusOptions.find(o => o.value === filterDraft.status)?.label }}
                    </span>
                  </span>
                </div>
              </div>
              <div class="filter-group date-range-group">
                <label>Date Range:</label>
                <div class="date-range-inputs">
                  <input v-model="filterDraft.startDate" type="date" class="filter-input" @input="applyFilters" />
                  <span class="date-range-sep">-</span>
                  <input v-model="filterDraft.endDate" type="date" class="filter-input" @input="applyFilters" />
                </div>
              </div>
              <div class="filter-group min-amount-group">
                <label>Min Amount:</label>
                <input v-model.number="filterDraft.minAmount" type="number" class="filter-input" placeholder="Min $" min="0" @input="applyFilters" />
              </div>
              <div class="filter-group">
                <label>Max Amount:</label>
                <input v-model.number="filterDraft.maxAmount" type="number" class="filter-input" placeholder="Max $" min="0" @input="applyFilters" />
              </div>
              <!-- Remove Apply/Reset buttons for auto-apply filter -->
            </form>
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

          <!-- Transactions List/Table (card) -->
          <div class="card transactions-section">
            <div v-if="filteredTransactions.length === 0" class="empty-state">
              <!-- SVG Illustration -->
              <div class="empty-illustration">
                <!-- Ví rỗng sinh động -->
                <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="20" y="50" width="120" height="40" rx="16" fill="#E0E7EF"/>
                  <rect x="32" y="60" width="96" height="20" rx="8" fill="#F3F4F6"/>
                  <rect x="50" y="70" width="60" height="8" rx="4" fill="#CBD5E1"/>
                  <ellipse cx="80" cy="100" rx="32" ry="8" fill="#F3F4F6"/>
                  <g>
                    <rect x="60" y="38" width="40" height="24" rx="8" fill="#fbbf24"/>
                    <rect x="68" y="44" width="24" height="8" rx="4" fill="#fde68a"/>
                    <circle cx="80" cy="50" r="4" fill="#f59e0b"/>
                  </g>
                  <g>
                    <path d="M90 38 Q92 30 100 32" stroke="#fbbf24" stroke-width="2" fill="none"/>
                    <circle cx="100" cy="32" r="2" fill="#fbbf24"/>
                  </g>
                  <g>
                    <path d="M70 38 Q68 30 60 32" stroke="#fbbf24" stroke-width="2" fill="none"/>
                    <circle cx="60" cy="32" r="2" fill="#fbbf24"/>
                  </g>
                </svg>
              </div>
              <h3>No transactions found</h3>
              <p>No transactions match your current filters.</p>
              <div class="empty-cta-group">
                <button class="empty-cta-btn" @click="goToWallet">Top up Wallet</button>
                <button class="empty-cta-btn secondary" @click="goToCreateRequest">Create a Request</button>
              </div>
            </div>

            <div v-else class="transactions-table-wrapper">
              <table class="transactions-table">
                <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th @click="sortBy('amount')" class="sortable">
                    Amount
                    <span :class="getSortIcon('amount')"></span>
                  </th>
                  <th>Status</th>
                  <th @click="sortBy('date')" class="sortable">
                    Date
                    <span :class="getSortIcon('date')"></span>
                  </th>
                  <th>PayPal Email</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(transaction, idx) in paginatedTransactions" :key="transaction.id" @click="openDetailModal(transaction)" style="cursor:pointer;">
                  <td>{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
                  <td class="type-cell">
                      <span :class="['type-icon', getTransactionTypeClass(transaction)]">
                        <span v-if="getTransactionTitle(transaction) === 'Deposit'">💳</span>
                        <span v-else-if="getTransactionTitle(transaction) === 'Payment'">💸</span>
                        <span v-else-if="getTransactionTitle(transaction) === 'Withdrawal'">💸</span>
                        <span v-else-if="getTransactionTitle(transaction) === 'Refund'">🔄</span>
                        <span v-else>🔄</span>
                      </span>
                    <span :class="['type-label', getTransactionTypeClass(transaction)]">
                        {{ getTransactionTitle(transaction) }}
                      </span>
                  </td>
                  <td>
                      <span :class="['amount', transaction.amount > 0 ? 'positive' : transaction.amount < 0 ? 'negative' : 'neutral']">
                        {{ formatCurrency(Math.abs(transaction.amount)) }}
                      </span>
                  </td>
                  <td>
                      <span :class="['status-badge', `status-${transaction.status.toLowerCase()}`,
                        (transaction.status && transaction.status.replace(/[-_ ]/g, '').toUpperCase() === 'ONHOLD') ? 'badge-on-hold' : '']"
                            :title="getStatusTooltip(transaction.status)">
                        {{ formatStatus(transaction.status) }}
                      </span>
                  </td>
                  <td>
                    <div>
                      <span>📅 {{ formatDate(transaction.createdAt) }}</span>
                    </div>
                    <div style="color: #64748b; font-size: 0.93em; margin-top: 2px;">
                      <span>🕒 {{ formatDateRelative(transaction.createdAt) }}</span>
                    </div>
                  </td>
                  <td>
                      <span v-if="transaction.paypalEmail && transaction.paypalEmail !== '-'" class="paypal-email">
                        {{ transaction.paypalEmail }}
                      </span>
                    <span v-else class="paypal-email-system">System</span>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="pagination">
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                class="pagination-btn"
              >
                <i class="pi pi-chevron-left"></i>
              </button>

              <div class="page-numbers">
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="goToPage(page)"
                  :class="['page-btn', { active: page === currentPage }]"
                >
                  {{ page }}
                </button>
              </div>

              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="pagination-btn"
              >
                <i class="pi pi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>

  <!-- Modal chi tiết transaction -->
  <template v-if="showDetailModal && detailTarget">
    <div class="modal-backdrop" @click.self="closeDetailModal">
      <div class="modal-content modal-detail modal-detail-boxed">
        <div class="modal-header">
          <h3 class="modal-title-with-icon">
            <span class="modal-title-icon">💸</span> Transaction Details
          </h3>
          <button @click="closeDetailModal" class="close-btn">×</button>
        </div>
        <div class="modal-box-table">
          <!-- Amount & PayPal -->
          <div class="box-row">
            <div class="box-title"><span>💰</span> <b>Amount:</b></div>
            <div class="box-value amount-value">{{ formatCurrency(Math.abs(detailTarget.amount)) }}</div>
          </div>
          <div class="box-row">
            <div class="box-title"><span>📧</span> <b>PayPal:</b></div>
            <div class="box-value">
              <template v-if="getTransactionTitle(detailTarget) === 'Deposit' || getTransactionTitle(detailTarget) === 'Payment'">
                System
              </template>
              <template v-else>
                {{ detailTarget.paypalEmail ? detailTarget.paypalEmail : 'Chưa cung cấp' }}
              </template>
            </div>
          </div>
          <!-- Transaction Info -->
          <div class="box-row box-section-title"><span>📝</span> <b>Transaction Info</b></div>
          <div class="box-row">
            <div class="box-title">Type:</div>
            <div class="box-value type-label"
                 :class="{
                deposit: getTransactionTitle(detailTarget) === 'Deposit',
                withdraw: getTransactionTitle(detailTarget) === 'Withdrawal',
                refund: getTransactionTitle(detailTarget) === 'Refund',
                payment: getTransactionTitle(detailTarget) === 'Payment'
              }"
                 style="display: flex; align-items: center; gap: 6px; font-size: 1.05em;"
            >
              <span v-if="getTransactionTitle(detailTarget) === 'Deposit'">💳</span>
              <span v-else-if="getTransactionTitle(detailTarget) === 'Payment'">💸</span>
              <span v-else-if="getTransactionTitle(detailTarget) === 'Withdrawal'">💸</span>
              <span v-else-if="getTransactionTitle(detailTarget) === 'Refund'">🔄</span>
              {{ getTransactionTitle(detailTarget) }}
            </div>
          </div>
          <div class="box-row">
            <div class="box-title">Status:</div>
            <div class="box-value">
              <span :class="['status-badge',
                detailTarget.status.toLowerCase() === 'completed' ? 'status-completed' :
                detailTarget.status.toLowerCase() === 'pending' ? 'status-pending' :
                detailTarget.status.toLowerCase() === 'failed' ? 'status-failed' : '']">
                <span v-if="detailTarget.status.toLowerCase() === 'completed'">✅</span>
                <span v-else-if="detailTarget.status.toLowerCase() === 'pending'">⏳</span>
                <span v-else-if="detailTarget.status.toLowerCase() === 'failed'">❌</span>
                {{ formatStatus(detailTarget.status) }}
              </span>
            </div>
          </div>
          <div class="box-row">
            <div class="box-title">Created:</div>
            <div class="box-value">{{ formatDate(detailTarget.createdAt) }}</div>
          </div>
          <!-- Request Info -->
          <div class="box-row box-section-title"><span>📋</span> <b>Request Info</b></div>
          <div class="box-row">
            <div class="box-title">Request:</div>
            <div class="box-value">
              <template v-if="detailTarget.request && detailTarget.request.title && detailTarget.request.id">
                <template v-if="detailTarget.isRequester === true">
                  <router-link :to="`/requests/${detailTarget.request.id}`" class="link">{{ detailTarget.request.title }} <span style='font-size:1em;'>🔗</span></router-link>
                </template>
                <template v-else>
                  {{ detailTarget.request.title }}
                </template>
              </template>
              <template v-else>-</template>
            </div>
          </div>
          <div class="box-row">
            <div class="box-title">Project:</div>
            <div class="box-value">
              <template v-if="detailTarget.request && detailTarget.request.project && detailTarget.request.project.name && detailTarget.request.project.id">
                <template v-if="detailTarget.isRequester === false">
                  <router-link :to="`/projects/${detailTarget.request.project.id}`" class="link">{{ detailTarget.request.project.name }} <span style='font-size:1em;'>🔗</span></router-link>
                </template>
                <template v-else>
                  {{ detailTarget.request.project.name }}
                </template>
              </template>
              <template v-else>-</template>
            </div>
          </div>
          <!-- Translator -->
          <div v-if="detailTarget.request && detailTarget.request.assignee">
            <div class="box-row box-section-title"><span>👤</span> <b>Translator</b></div>
            <div class="box-row">
              <div class="box-title">{{ detailTarget.request.assignee.fullName || detailTarget.request.assignee.username || detailTarget.request.assignee.email || '-' }}</div>
              <div class="box-value"></div>
            </div>
            <div class="box-row">
              <div class="box-title"><span>📧</span> Email:</div>
              <div class="box-value">{{ detailTarget.request.assignee.email || '-' }}</div>
            </div>
            <div class="box-row">
              <div class="box-title"><span>📞</span> Phone:</div>
              <div class="box-value">{{ detailTarget.request.assignee.phone || '-' }}</div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeDetailModal">Close</button>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import AppFooter from '../components/AppFooter.vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

interface Transaction {
  id: number;
  amount: number;
  status: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  paypalEmail?: string; // Added paypalEmail
  requestId?: string; // Added requestId
  isRequester?: boolean; // Added isRequester flag
  request?: {
    assignee?: {
      id: number;
    };
  }; // Added request object
}

interface Filters {
  type: string;
  status: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
}

const transactions = ref<Transaction[]>([]);
const loading = ref(true);
const error = ref('');
const sidebarCollapsed = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filters = ref({
  type: '',
  status: '',
  dateRange: '',
  minAmount: '',
  maxAmount: ''
});

const filterDraft = ref({
  type: '',
  status: '',
  minAmount: '',
  maxAmount: '',
  startDate: '',
  endDate: ''
});

const hasActiveFilters = computed(() => {
  return filters.value.type || filters.value.status || filters.value.dateRange || filters.value.minAmount || filters.value.maxAmount;
});

// Computed properties
// --- FILTERED TRANSACTIONS ---
const filteredTransactions = computed(() => {
  let filtered = [...transactions.value];

  // Filter by type
  if (filterDraft.value.type) {
    if (filterDraft.value.type === 'deposit') {
      filtered = filtered.filter((t: any) => t.amount > 0 && getTransactionTitle(t) === 'Deposit');
    } else if (filterDraft.value.type === 'payment') {
      filtered = filtered.filter((t: any) => getTransactionTitle(t) === 'Payment');
    } else if (filterDraft.value.type === 'withdraw') {
      filtered = filtered.filter((t: any) => t.amount < 0);
    }
  }

  // Filter by status
  if (filterDraft.value.status) {
    filtered = filtered.filter((t: any) => t.status && t.status.toLowerCase() === filterDraft.value.status.toLowerCase());
  }

  // Filter by min amount
  if (filterDraft.value.minAmount !== '' && !isNaN(Number(filterDraft.value.minAmount))) {
    filtered = filtered.filter((t: any) => Math.abs(Number(t.amount)) >= Number(filterDraft.value.minAmount));
  }
  // Filter by max amount
  if (filterDraft.value.maxAmount !== '' && !isNaN(Number(filterDraft.value.maxAmount))) {
    filtered = filtered.filter((t: any) => Math.abs(Number(t.amount)) <= Number(filterDraft.value.maxAmount));
  }

  // Filter by date range
  if (filterDraft.value.startDate) {
    const start = new Date(filterDraft.value.startDate);
    filtered = filtered.filter((t: any) => new Date(t.createdAt) >= start);
  }
  if (filterDraft.value.endDate) {
    const end = new Date(filterDraft.value.endDate);
    filtered = filtered.filter((t: any) => new Date(t.createdAt) <= end);
  }

  return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / itemsPerPage.value));

const sortKey = ref('date');
const sortOrder = ref(-1); // -1: desc, 1: asc

function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value *= -1;
  } else {
    sortKey.value = key;
    sortOrder.value = key === 'amount' ? -1 : 1;
  }
}
function getSortIcon(key) {
  if (sortKey.value !== key) return 'pi pi-sort';
  return sortOrder.value === 1 ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
}

const sortedTransactions = computed(() => {
  let arr = [...filteredTransactions.value];
  if (sortKey.value === 'amount') {
    arr.sort((a: any, b: any) => (Math.abs(a.amount) - Math.abs(b.amount)) * sortOrder.value);
  } else if (sortKey.value === 'date') {
    arr.sort((a: any, b: any) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sortOrder.value);
  }
  return arr;
});

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedTransactions.value.slice(start, end);
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
    .filter((t: any) => t.amount < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
});

const wallet = ref(null);

async function reloadWallet() {
  try {
    const res = await axios.get('/api/wallet');
    wallet.value = res.data;
  } catch (err) {
    wallet.value = null;
  }
}

// Methods
async function loadTransactions() {
  loading.value = true;
  error.value = '';
  try {
    const response = await axios.get('/api/wallet/transactions');
    console.log('API /api/wallet/transactions response:', response.data);
    // Map lại dữ liệu để lấy đúng trường ngày và paypalEmail
    transactions.value = (response.data || []).map((txn: any) => ({
      ...txn,
      createdAt: txn.createdAt || txn.created_at || txn.date || '-',
      paypalEmail: txn.paypalEmail || txn.user?.paypalEmail || txn.meta?.paypalEmail || '-',
    }));
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to load transactions.';
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  filters.value = { ...filterDraft.value };
  currentPage.value = 1;
}
function resetFilters() {
  filterDraft.value = {
    type: '',
    status: '',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: ''
  };
  filters.value = { ...filterDraft.value };
  currentPage.value = 1;
}

function getTransactionIcon(transaction: Transaction): string {
  if (transaction.amount > 0) return 'pi pi-arrow-down';
  if (transaction.amount < 0) return 'pi pi-arrow-up';
  return 'pi pi-exchange';
}

function getTransactionTitle(transaction: Transaction): string {
  console.log('Transaction object:', transaction);
  if (transaction.amount > 0 && transaction.requestId) {
    if (transaction.isRequester === true || transaction.isRequester === 'true') return 'Deposit';
    return 'Payment';
  }
  if (transaction.amount < 0) return 'Withdrawal';
  return 'Transfer';
}

function getTransactionCardClass(transaction: Transaction): string {
  const baseClass = 'transaction-card';
  if (transaction.status === 'completed' || transaction.status === 'approved') {
    return `${baseClass} completed`;
  }
  if (transaction.status === 'pending') {
    return `${baseClass} pending`;
  }
  if (transaction.status === 'failed') {
    return `${baseClass} failed`;
  }
  return baseClass;
}

function formatStatus(status: string): string {
  if (!status) return '';
  const s = status.replace(/[-_ ]/g, '').toUpperCase();
  if (s === 'ONHOLD') return 'On Hold';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setHours(date.getHours() + 7); // Cộng thêm 7 tiếng để fix lệch múi giờ
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateRelative(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setHours(date.getHours() + 7); // Cộng thêm 7 tiếng để khớp với giờ hiển thị
  return dayjs(date).fromNow();
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

function goToWallet() {
  router.push('/wallet');
}
function goToCreateRequest() {
  router.push('/requests/create');
}

function getTransactionTypeClass(transaction: Transaction) {
  if (transaction.amount > 0) {
    // Kiểm tra xem có phải là giao dịch payment cho translator không
    if (transaction.requestId) {
      // Sử dụng isRequester để phân biệt
      if (transaction.isRequester) {
        return 'deposit';
      } else {
        return 'payment';
      }
    }
    return 'deposit';
  }
  if (transaction.amount < 0) return 'withdraw';
  return 'transfer';
}

function getStatusTooltip(status: string): string {
  if (status === 'pending') {
    return 'This transaction is awaiting admin approval.';
  }
  return '';
}

// Watch for filter changes to reset pagination
import { watch } from 'vue';
const statusOptions = [
  { label: 'All Status', value: '', color: '' },
  { label: 'Pending', value: 'pending', color: 'status-pending' },
  { label: 'Completed', value: 'completed', color: 'status-completed' },
  { label: 'Approved', value: 'approved', color: 'status-approved' },
  { label: 'Rejected', value: 'rejected', color: 'status-failed' },
  { label: 'Failed', value: 'failed', color: 'status-failed' },
];

// --- WATCH FILTERS ---
watch(
  () => ({ ...filterDraft.value }),
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

// Automatically apply filter when status changes
// watch(() => filterDraft.value.status, () => {
//   filters.value.status = filterDraft.value.status;
//   currentPage.value = 1;
// });

const showDetailModal = ref(false);
const detailTarget = ref<Transaction | null>(null);
function openDetailModal(transaction: Transaction) {
  detailTarget.value = transaction;
  showDetailModal.value = true;
}
function closeDetailModal() {
  showDetailModal.value = false;
  detailTarget.value = null;
}

onMounted(() => {
  loadTransactions();
  reloadWallet();
});
</script>

<style scoped>
.transaction-history-container {
  width: 100%;
  margin: 0;
  padding: 0 8px;
}

.header-section {
  text-align: center;
  margin-bottom: 32px;
}

.header-section h2 {
  color: #1f2937;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
}

.filter-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  align-items: end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 100px;
  flex: 1 1 0;
  max-width: 220px;
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
  min-width: 120px;
}

.filter-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 80px;
}

.clear-filters-btn {
  padding: 8px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-end;
  margin-left: 8px;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
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

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.transaction-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  align-items: flex-start;
  transition: all 0.2s;
}

.transaction-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.transaction-card.completed {
  border-left: 4px solid #10b981;
}

.transaction-card.pending {
  border-left: 4px solid #f59e0b;
}

.transaction-card.failed {
  border-left: 4px solid #ef4444;
}

.transaction-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
  flex-shrink: 0;
}

.transaction-card.completed .transaction-icon {
  background: #10b981;
}

.transaction-card.pending .transaction-icon {
  background: #f59e0b;
}

.transaction-card.failed .transaction-icon {
  background: #ef4444;
}

.transaction-details {
  flex: 1;
  min-width: 0;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.transaction-header h4 {
  margin: 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-completed, .status-approved {
  background: #d1fae5;
  color: #059669;
}

.status-failed {
  background: #fee2e2;
  color: #dc2626;
}

.transaction-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.transaction-amount .amount {
  font-size: 1.25rem;
  font-weight: 700;
}

.amount.positive {
  color: #10b981;
}

.amount.negative {
  color: #ef4444;
}

.transaction-meta {
  display: flex;
  gap: 16px;
  font-size: 0.875rem;
  color: #6b7280;
}

.transaction-description {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}

.pagination-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover {
  background: #f3f4f6;
}

.page-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.summary-section {
  margin-bottom: 0;
  box-shadow: none;
  padding-bottom: 18px;
}
.summary-cards {
  display: flex;
  gap: 24px;
  justify-content: space-between;
  flex-wrap: wrap;
  width: 100%;
}
/* Add pulse animation for balance icon */
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.18); }
  70% { box-shadow: 0 0 0 8px rgba(37,99,235,0.08); }
  100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.18); }
}
.summary-card {
  background: linear-gradient(120deg, #f0f7ff 0%, #f7faff 100%);
  border-radius: 20px;
  padding: 20px 28px 18px 20px;
  box-shadow: 0 2px 8px 0 rgba(60,60,60,0.08); /* subtle shadow-sm */
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 210px;
  min-height: 80px;
  transition: box-shadow 0.2s, background 0.2s;
  cursor: pointer;
  flex: 1 1 0;
  max-width: 340px;
}
.summary-card:hover {
  box-shadow: 0 8px 24px 0 rgba(60,60,60,0.16); /* hover:shadow-md */
  background: linear-gradient(120deg, #e0e7ef 0%, #f1f5f9 100%);
}
.summary-card:hover {
  background-color: #f9fafb;
}
.summary-card.balance .summary-icon {
  animation: pulse 1.8s infinite;
}
.summary-card.deposit .summary-icon {
  background: #d1fae5;
  color: #10b981;
}
.summary-card.withdraw .summary-icon {
  background: #fee2e2;
  color: #ef4444;
}
.summary-card.balance .summary-icon {
  background: #dbeafe;
  color: #2563eb;
}
.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  margin-right: 8px;
}
.summary-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.summary-label {
  color: #6b7280;
  font-size: 0.95rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}
.info-tooltip {
  font-size: 1.1em;
  color: #2563eb;
  cursor: help;
  margin-left: 2px;
  vertical-align: middle;
}
.summary-value {
  font-weight: 700;
  font-size: 1.25rem;
}
.summary-value.positive {
  color: #10b981;
}
.summary-value.negative {
  color: #ef4444;
}
.summary-value.balance {
  color: #2563eb;
}
.summary-card:hover {
  box-shadow: 0 10px 32px 0 rgba(60,60,60,0.16);
  background: linear-gradient(120deg, #e0f2fe 0%, #f1f5f9 100%);
}
@media (max-width: 900px) {
  .summary-cards {
    flex-direction: column;
    gap: 12px;
  }
  .summary-card {
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }
}
.main-content-wrapper {
  display: flex;
  min-height: 80vh;
  background: #f8f9fb;
}

.main-content {
  flex: 1;
  padding: 40px 0;
  margin-left: 240px; /* Đảm bảo không bị che bởi sidebar */
  min-width: 0;
  transition: margin-left 0.2s cubic-bezier(.4,0,.2,1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  margin-left: 72px;
}

@media (max-width: 1200px) {
  .filter-form {
    flex-wrap: wrap;
  }
  .filter-group, .filter-actions-group {
    min-width: 0;
    flex: 1 1 220px;
    padding-top: 0;
  }
}
@media (max-width: 900px) {
  .main-content,
  .layout-wrapper.sidebar-collapsed .main-content {
    margin-left: 0;
  }
  .filter-form {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .filter-group, .filter-actions-group {
    min-width: 0;
    width: 100%;
    flex-direction: column !important;
    align-items: stretch;
    padding-top: 0;
  }
}
@media (max-width: 768px) {
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .transaction-card {
    flex-direction: column;
    gap: 12px;
  }

  .transaction-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .transaction-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .transaction-meta {
    flex-direction: column;
    gap: 4px;
  }
}
.empty-illustration {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 18px;
}
.empty-cta-group {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 18px;
}
.empty-cta-btn {
  padding: 10px 22px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.empty-cta-btn.secondary {
  background: #f3f4f6;
  color: #2563eb;
  border: 1px solid #2563eb;
}
.empty-cta-btn:hover {
  background: #1d4ed8;
}
.empty-cta-btn.secondary:hover {
  background: #e0e7ef;
}
.transactions-table-wrapper {
  margin-bottom: 24px;
  overflow-x: auto;
}
.transactions-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  font-size: 1rem;
  min-width: 700px;
}
.transactions-table th, .transactions-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  text-align: left;
}
.transactions-table th {
  background: #f9fafb;
  font-weight: 700;
  color: #374151;
  user-select: none;
}
.transactions-table th.sortable {
  cursor: pointer;
}
.transactions-table th.sortable:hover {
  background: #e0e7ef;
}
.transactions-table tr:last-child td {
  border-bottom: none;
}
.transactions-table tr:hover td {
  background: #f3f4f6;
  cursor: pointer;
}
.type-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.type-icon {
  font-size: 1.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.type-label.deposit {
  color: #22c55e;
  font-weight: 600;
}
.type-label.payment {
  color: #2563eb;
  font-weight: 600;
}
.type-label.withdraw {
  color: #ef4444;
  font-weight: 600;
}
.type-label.transfer {
  color: #2563eb;
  font-weight: 600;
}
.type-icon.deposit {
  color: #10b981;
}
.type-icon.payment {
  color: #2563eb;
}
.type-icon.withdraw {
  color: #ef4444;
}
.type-icon.transfer {
  color: #2563eb;
}
.amount.positive {
  color: #10b981;
  font-weight: 600;
}
.amount.negative {
  color: #ef4444;
  font-weight: 600;
}
.amount.neutral {
  color: #2563eb;
  font-weight: 600;
}
.card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.09);
  padding: 32px 28px 24px 28px;
  margin-bottom: 32px;
}
.summary-section {
  margin-bottom: 0;
  box-shadow: none;
  padding-bottom: 18px;
}
.filter-section {
  margin-bottom: 0;
  box-shadow: none;
  padding-bottom: 18px;
}
.transactions-section {
  margin-bottom: 0;
  box-shadow: none;
  padding-bottom: 18px;
}
.note-tooltip {
  cursor: pointer;
  text-decoration: underline dotted;
}
.paypal-email {
  color: #2563eb;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: underline dotted;
}
.paypal-email-empty {
  color: #6b7280;
  font-style: italic;
  font-size: 0.875rem;
}
@media (max-width: 900px) {
  .transactions-table {
    font-size: 0.95rem;
    min-width: 520px;
  }
}
@media (max-width: 600px) {
  .transactions-table {
    font-size: 0.9rem;
    min-width: 400px;
  }
}
.custom-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.custom-type-select {
  padding-right: 36px;
}
.type-icon-preview {
  position: absolute;
  right: 10px;
  font-size: 1.2rem;
  pointer-events: none;
}
.filter-form {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  gap: 40px;
  align-items: flex-end;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 100px;
  flex: 1 1 0;
  max-width: 220px;
}
.date-range-group {
  min-width: 260px;
}
/* Add margin-left only to Min Amount filter group to separate from Date Range */
.filter-group.min-amount-group {
  margin-left: 40px;
}
.date-range-group .date-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
}
.date-range-group .filter-input[type="date"] {
  min-width: 130px;
  width: 130px;
  max-width: 180px;
}
.date-range-sep {
  color: #888;
  font-size: 1.1rem;
  margin: 0 2px;
}
.filter-actions-group {
  flex-direction: row !important;
  align-items: flex-end;
  gap: 12px;
  min-width: 0;
  margin-left: auto;
  margin-bottom: 0;
  padding-top: 18px;
  flex: 0 0 auto;
}
@media (max-width: 900px) {
  .filter-form {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .filter-group, .filter-actions-group {
    min-width: 0;
    width: 100%;
    flex-direction: column !important;
    align-items: stretch;
    padding-top: 0;
  }
}
.filter-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.apply-btn {
  padding: 8px 20px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.apply-btn:hover {
  background: #1d4ed8;
}
.reset-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #2563eb;
  border: 1px solid #2563eb;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.reset-btn:hover {
  background: #e0e7ef;
}
/* Add style for status badge in dropdown */
.custom-status-select option {
  padding-left: 28px;
}
.status-badge-preview {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.98em;
  pointer-events: none;
}
.custom-type-select,
.custom-status-select {
  min-width: 170px;
  width: 180px;
}
.badge-on-hold {
  background: #fef3c7 !important;
  color: #d97706 !important;
  font-weight: 600;
  border-radius: 12px !important;
  padding: 4px 16px !important;
  font-size: 0.98em;
  display: inline-block;
  text-align: center;
}
.paypal-email-system {
  color: #2563eb;
  font-weight: 600;
  font-style: normal;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
}
/* Modal style copy từ admin */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 41, 59, 0.48);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.25s;
  backdrop-filter: blur(4px);
  animation: overlay-fade-in 0.22s cubic-bezier(.4,1.4,.6,1) 1;
}
@keyframes overlay-fade-in {
  0% { background: rgba(30,41,59,0.01); opacity: 0; }
  100% { background: rgba(30,41,59,0.48); opacity: 1; }
}
.modal-content.modal-detail {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 6px 24px 0 rgba(37,99,235,0.12), 0 1px 4px rgba(0,0,0,0.06);
  padding: 32px 28px;
  min-width: 420px;
  max-width: 98vw;
  width: 650px;
  max-height: none;
  overflow-y: visible;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
  margin: 0;
  box-sizing: border-box;
  z-index: 3100;
  animation: modal-pop-detail 0.22s cubic-bezier(.4,1.4,.6,1) 1;
  border: 2px solid #3b82f6;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  margin: 0;
  color: #2563eb;
  font-size: 1.25rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s;
}
.close-btn:hover {
  color: #374151;
}
/* Thay đổi .modal-detail-grid thành 1 cột cho toàn bộ phần info bên phải */
.modal-detail-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 12px;
}
.modal-detail-col {
  width: 100%;
  padding: 0;
}
.detail-section {
  margin-bottom: 12px;
}
.detail-section .section-title-with-icon {
  margin-bottom: 8px;
}
.detail-section .detail-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  margin-bottom: 6px;
}
.detail-label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.96rem;
}
.detail-value {
  color: #1f2937;
  font-size: 1.01rem;
  font-weight: 500;
  word-break: break-word;
}
.link {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
}
.amount-value {
  font-size: 1.08rem;
  font-weight: 700;
  color: #2563eb;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 12px;
  padding: 6px 12px;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.status-icon {
  font-size: 0.9em;
}
.status-text {
  font-weight: 600;
}
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.btn {
  padding: 8px 22px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, opacity 0.18s, border 0.18s;
  margin-right: 8px;
  outline: none;
}
.btn-secondary {
  background: #fff;
  color: #2563eb;
  border: 2px solid #2563eb;
  border-radius: 10px;
}
.btn-secondary:disabled {
  background: #e5e7eb;
  color: #a5b4fc;
  cursor: not-allowed;
  opacity: 0.7;
}
.btn-secondary:hover:not(:disabled) {
  background: #f3f4f6;
  color: #1d4ed8;
  border-color: #1d4ed8;
}
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-grid-vertical .detail-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  margin-bottom: 6px;
}
.detail-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.detail-label {
  min-width: 90px;
  font-weight: 600;
  color: #374151;
}
.detail-value {
  flex: 1;
  color: #374151;
  word-break: break-word;
}
.link {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
}
.detail-section,
.detail-row,
.detail-label,
.detail-value,
.link {
  font-size: 0.97rem;
}
/* Card section cho từng nhóm thông tin trong modal */
.modal-section-card {
  background: #f7fafc;
  border-radius: 14px;
  box-shadow: 0 2px 8px 0 rgba(60,60,60,0.06);
  padding: 18px 20px 14px 20px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.modal-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.08rem;
  font-weight: 700;
  margin-bottom: 8px;
}
.modal-section-title.amount {
  color: #22c55e;
}
.modal-section-title.paypal {
  color: #2563eb;
}
.modal-section-title.transinfo {
  color: #a21caf;
}
.modal-section-title.reqinfo {
  color: #eab308;
}
/* Badge trạng thái */
.status-badge.status-completed {
  background: #d1fae5;
  color: #059669;
  font-weight: 700;
  font-size: 1.01rem;
  padding: 7px 16px;
  border-radius: 16px;
  gap: 8px;
}
.status-badge.status-completed .status-icon {
  font-size: 1.2em;
  margin-right: 4px;
}
/* Type badge màu riêng */
.type-label.deposit, .type-icon.deposit {
  color: #22c55e;
}
.type-label.withdraw, .type-icon.withdraw {
  color: #ef4444;
}
.type-label.refund, .type-icon.refund {
  color: #eab308;
}
.type-label.payment, .type-icon.payment {
  color: #2563eb;
}
/* Font đậm cho label, thường cho value */
.detail-label {
  font-weight: 700;
  color: #374151;
}
.detail-value {
  font-weight: 400;
  color: #1f2937;
}
.modal-detail-boxed .modal-box-table {
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  font-family: inherit;
  padding: 18px 18px 8px 18px;
  margin-bottom: 0;
  margin-top: 0;
  font-size: 1.01rem;
  box-shadow: none;
}
.modal-detail-boxed .box-row {
  display: flex;
  align-items: flex-start;
  border-bottom: 1px dashed #e5e7eb;
  padding: 2px 0 2px 0;
}
.modal-detail-boxed .box-row:last-child {
  border-bottom: none;
}
.modal-detail-boxed .box-title {
  min-width: 120px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
}
.modal-detail-boxed .box-value {
  flex: 1;
  color: #1f2937;
  font-weight: 400;
  word-break: break-word;
}
.modal-detail-boxed .amount-value {
  color: #2563eb;
  font-weight: 700;
}
.modal-detail-boxed .box-section-title {
  border-bottom: 1.5px solid #e5e7eb;
  background: #fff;
  color: #2563eb;
  font-size: 1.08rem;
  font-weight: 700;
  margin-top: 8px;
  margin-bottom: 2px;
  padding: 4px 0 2px 0;
}
.modal-detail-boxed .status-badge.status-completed {
  background: #d1fae5;
  color: #059669;
  font-weight: 700;
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 1em;
  margin-right: 4px;
}
.modal-detail-boxed .status-badge.status-pending {
  background: #fde68a;
  color: #eab308;
  font-weight: 700;
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 1em;
  margin-right: 4px;
}
.modal-detail-boxed .status-badge.status-failed {
  background: #fee2e2;
  color: #ef4444;
  font-weight: 700;
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 1em;
  margin-right: 4px;
}
.modal-detail-boxed .link {
  color: #2563eb;
  text-decoration: underline;
  font-weight: 600;
  cursor: pointer;
}
</style>
