<template>
  <div>
    <AdminNavbar />
    <div style="display: flex; min-height: 80vh; background: #f8f9fb;">
      <AdminSidebar />
      <div class="main-content-admin">
        <div class="admin-withdrawals-container page-container">
          <h2 class="box-title"><span class="box-title-icon">💸</span> <span>Pending Withdrawals</span></h2>
          <!-- Filter Section (copy from TransactionHistoryView, đã rút gọn) -->
          <div class="card filter-section">
            <form class="filter-form" @submit.prevent="() => {}">
              <div class="filter-group">
                <label>Status:</label>
                <div class="custom-select-wrapper">
                  <select v-model="filterDraft.status" class="filter-select custom-status-select">
                    <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
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
                  <input v-model="filterDraft.startDate" type="date" class="filter-input" />
                  <span class="date-range-sep">-</span>
                  <input v-model="filterDraft.endDate" type="date" class="filter-input" />
                </div>
              </div>
              <div class="filter-group amount-range-group">
                <label>Amount Range:</label>
                <div class="amount-range-inputs">
                  <input v-model.number="filterDraft.minAmount" type="number" class="filter-input" placeholder="Min $" min="0" />
                  <span class="amount-range-sep">-</span>
                  <input v-model.number="filterDraft.maxAmount" type="number" class="filter-input" placeholder="Max $" min="0" />
                </div>
              </div>
              <div class="filter-actions-group">
                <button type="button" class="reset-btn" @click="resetFilters">Reset</button>
              </div>
            </form>
          </div>
          <div v-if="loading" class="loading">Loading...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else>
            <div class="sticky-action-bar">
              <button @click="openBatchApproveModal" :disabled="selectedIds.length === 0 || approvingAll" class="btn btn-approve-selected">
                <span class="btn-icon">✅</span> Approve Selected
              </button>
              <button @click="rejectSelected" :disabled="selectedIds.length === 0 || approvingAll" class="btn btn-reject-selected">
                <span class="btn-icon">❌</span> Reject Selected
              </button>
              <span v-if="approvingAll" style="color: #888; margin-left: 8px;">Processing...</span>
            </div>
            <div class="table-wrapper">
              <table class="withdrawals-table">
                <thead>
                <tr>
                  <th class="checkbox-header">
                    <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" class="select-all-checkbox" />
                  </th>
                  <th>No</th>
                  <th @click="sortTable('user')" style="cursor: pointer;">
                    User
                    <i :class="['sort-icon', getSortIcon('user')]" />
                  </th>
                  <th @click="sortTable('email')" style="cursor: pointer;">
                    Email
                    <i :class="['sort-icon', getSortIcon('email')]" />
                  </th>
                  <th @click="sortTable('amount')" style="cursor: pointer;">
                    Amount
                    <i :class="['sort-icon', getSortIcon('amount')]" />
                  </th>
                  <th class="status-header">Status</th>
                  <th @click="sortTable('createdAt')" style="cursor: pointer;">
                    Created At
                    <i :class="['sort-icon', getSortIcon('createdAt')]" />
                  </th>
                  <th class="action-header">Action</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(txn, idx) in paginatedWithdrawals" :key="txn.id" @click="openDetailModal(txn)" class="table-row-clickable">
                  <td class="checkbox-cell" @click.stop>
                    <input type="checkbox" :value="txn.id" v-model="selectedIds" class="row-checkbox" />
                  </td>
                  <td>{{ startIndex + idx + 1 }}</td>
                  <td>{{ txn.user?.fullName || txn.user?.username || txn.user?.email }}</td>
                  <td>
                    <span class="email-link">{{ txn.user?.email }}</span>
                  </td>
                  <td>
                    <span class="amount-value">{{ formatCurrency(Math.abs(txn.amount)) }}</span>
                  </td>
                  <td class="status-cell">
                    <span :class="badgeClass(txn.status)" class="status-badge">
                      <span v-if="txn.status === 'PENDING'" class="status-icon">⏳</span>
                      <span v-else-if="txn.status === 'APPROVED'" class="status-icon">✅</span>
                      <span v-else-if="txn.status === 'REJECTED'" class="status-icon">❌</span>
                      <span v-else-if="txn.status === 'FAILED'" class="status-icon">⚠️</span>
                      <span v-else class="status-icon">🔄</span>
                      <span class="status-text">
                        <span v-if="txn.status === 'PENDING'">Pending</span>
                        <span v-else-if="txn.status === 'APPROVED'">Approved</span>
                        <span v-else-if="txn.status === 'REJECTED'">Rejected</span>
                        <span v-else-if="txn.status === 'FAILED'">Failed</span>
                        <span v-else>{{ txn.status }}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <div class="date-info">
                      <div class="date-primary">{{ formatDate(txn.createdAt) }}</div>
                      <div class="date-secondary">{{ formatDateRelative(txn.createdAt) }}</div>
                    </div>
                  </td>
                  <td class="action-cell" @click.stop>
                    <button @click="openApproveModal(txn)" :disabled="approvingId === txn.id" class="btn btn-approve">
                      <span class="btn-icon">✅</span> Approve
                    </button>
                    <button @click="reject(txn.id)" :disabled="approvingId === txn.id || rejectingId === txn.id" class="btn btn-reject">
                      <span class="btn-icon">❌</span> Reject
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination Controls -->
            <div class="pagination-controls">
              <div class="pagination-info">
                <span>Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ withdrawals.length }} withdrawals</span>
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
              <div class="page-size-selector">
                <label for="pageSize">Show:</label>
                <select id="pageSize" v-model="itemsPerPage" @change="currentPage = 1" class="page-size-select">
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span>per page</span>
              </div>
            </div>

            <div v-if="withdrawals.length === 0" class="empty">No pending withdrawals.</div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
    <!-- Modal xác nhận duyệt từng dòng -->
    <div v-if="showApproveModal" class="modal-backdrop">
      <div class="modal-content modal-approve">
        <h3>✅ Approve Withdrawal?</h3>
        <div style="margin-bottom: 18px; font-size: 1.08rem;">
          You are about to approve a withdrawal of <b>{{ formatCurrency(Math.abs(approveTarget?.amount)) }}</b> to <b>{{ approveTarget?.user?.email }}</b>.
        </div>
        <div class="modal-tip" title="Funds will be sent to the user's PayPal account immediately after approval.">
          💡 Funds will be sent to the user's PayPal account immediately after approval. <span style="cursor: help; color: #f59e0b;">ℹ️</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="confirmApprove" :disabled="approvingId === approveTarget?.id">Confirm</button>
          <button class="btn btn-secondary" @click="closeApproveModal" :disabled="approvingId === approveTarget?.id">Cancel</button>
        </div>
      </div>
    </div>
    <!-- Modal xác nhận duyệt hàng loạt -->
    <div v-if="showBatchApproveModal" class="modal-backdrop">
      <div class="modal-content modal-approve">
        <h3>✅ Approve Withdrawals?</h3>
        <div style="margin-bottom: 18px; font-size: 1.08rem;">
          You are about to approve <b>{{ selectedIds.length }}</b> withdrawal(s).<br>
          <span v-if="selectedIds.length === 1">
            Amount: <b>{{ formatCurrency(Math.abs(batchApproveAmount)) }}</b> to <b>{{ batchApproveEmail }}</b>.
          </span>
        </div>
        <div class="modal-tip" title="Funds will be sent to the user's PayPal account immediately after approval.">
          💡 Funds will be sent to the user's PayPal account immediately after approval. <span style="cursor: help; color: #f59e0b;">ℹ️</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="confirmBatchApprove" :disabled="approvingAll">Confirm</button>
          <button class="btn btn-secondary" @click="closeBatchApproveModal" :disabled="approvingAll">Cancel</button>
        </div>
      </div>
    </div>
    <!-- Modal chi tiết withdrawal -->
    <div v-if="showDetailModal" class="modal-backdrop">
      <div class="modal-content modal-detail">
        <div class="modal-header">
          <h3>💸 Withdrawal Details</h3>
          <button @click="closeDetailModal" class="close-btn">×</button>
        </div>
        <div class="detail-content" v-if="detailTarget">
          <div class="detail-section">
            <h4>💰 Amount</h4>
            <div class="detail-value amount-value">{{ formatCurrency(Math.abs(detailTarget.amount)) }}</div>
          </div>

          <div class="detail-section">
            <h4>👤 User Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{{ detailTarget.user?.fullName || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Username:</span>
                <span class="detail-value">{{ detailTarget.user?.username || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ detailTarget.user?.email || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">User ID:</span>
                <span class="detail-value">{{ detailTarget.user?.id || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>💳 PayPal Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">PayPal Email:</span>
                <span class="detail-value">{{ detailTarget.paypalEmail || 'Not provided' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>📊 Status Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Current Status:</span>
                <span :class="['detail-value', 'status-badge', badgeClass(detailTarget.status)]">
                  <span v-if="detailTarget.status === 'PENDING'" class="status-icon">⏳</span>
                  <span v-else-if="detailTarget.status === 'APPROVED'" class="status-icon">✅</span>
                  <span v-else-if="detailTarget.status === 'REJECTED'" class="status-icon">❌</span>
                  <span v-else-if="detailTarget.status === 'FAILED'" class="status-icon">⚠️</span>
                  <span v-else class="status-icon">🔄</span>
                  <span class="status-text">
                    <span v-if="detailTarget.status === 'PENDING'">Pending</span>
                    <span v-else-if="detailTarget.status === 'APPROVED'">Approved</span>
                    <span v-else-if="detailTarget.status === 'REJECTED'">Rejected</span>
                    <span v-else-if="detailTarget.status === 'FAILED'">Failed</span>
                    <span v-else>{{ detailTarget.status }}</span>
                  </span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ formatDate(detailTarget.createdAt) }}</span>
              </div>

            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeDetailModal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { useToast } from 'primevue/usetoast';
import AdminSidebar from '../components/AdminSidebar.vue';
import AdminNavbar from '../components/AdminNavbar.vue';
import AppFooter from '../components/AppFooter.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const rawWithdrawals = ref([]);
const withdrawals = computed(() => {
  return rawWithdrawals.value.filter((txn: any) => {
    // Status filter
    if (filterDraft.value.status && txn.status !== filterDraft.value.status) return false;
    // Date range filter
    if (filterDraft.value.startDate) {
      const txnDate = new Date(txn.createdAt);
      const start = new Date(filterDraft.value.startDate);
      if (txnDate < start) return false;
    }
    if (filterDraft.value.endDate) {
      const txnDate = new Date(txn.createdAt);
      const end = new Date(filterDraft.value.endDate);
      if (txnDate > end) return false;
    }
    // Amount filter
    if (filterDraft.value.minAmount !== '' && !isNaN(Number(filterDraft.value.minAmount))) {
      if (Math.abs(txn.amount) < Number(filterDraft.value.minAmount)) return false;
    }
    if (filterDraft.value.maxAmount !== '' && !isNaN(Number(filterDraft.value.maxAmount))) {
      if (Math.abs(txn.amount) > Number(filterDraft.value.maxAmount)) return false;
    }
    return true;
  });
});

// Pagination state
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Sort state
const sortKey = ref('');
const sortOrder = ref(1);

function sortTable(key: string) {
  if (sortKey.value === key) {
    sortOrder.value *= -1;
  } else {
    sortKey.value = key;
    sortOrder.value = 1;
  }
}

function getSortIcon(key: string) {
  if (sortKey.value !== key) return 'pi pi-sort';
  return sortOrder.value === 1 ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
}

const sortedWithdrawals = computed(() => {
  let arr = [...withdrawals.value];
  if (sortKey.value === 'amount') {
    arr.sort((a, b) => (Math.abs(a.amount) - Math.abs(b.amount)) * sortOrder.value);
  } else if (sortKey.value === 'createdAt') {
    arr.sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sortOrder.value);
  } else if (sortKey.value === 'email') {
    arr.sort((a, b) => (a.user?.email || '').localeCompare(b.user?.email || '') * sortOrder.value);
  } else if (sortKey.value === 'user') {
    arr.sort((a, b) => {
      const aName = a.user?.fullName || a.user?.username || a.user?.email || '';
      const bName = b.user?.fullName || b.user?.username || b.user?.email || '';
      return aName.localeCompare(bName) * sortOrder.value;
    });
  }
  return arr;
});

const paginatedWithdrawals = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedWithdrawals.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(sortedWithdrawals.value.length / itemsPerPage.value);
});

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() => Math.min(currentPage.value * itemsPerPage.value, withdrawals.value.length));

// Pagination methods
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function goToPage(page: number) {
  currentPage.value = page;
}

// Reset pagination when filters change
watch(withdrawals, () => {
  currentPage.value = 1;
});

const loading = ref(true);
const error = ref('');
const approvingId = ref<number|null>(null);
const approvingAll = ref(false);
const selectedIds = ref<number[]>([]);
const rejectingId = ref<number|null>(null);

const allSelected = computed(() =>
  withdrawals.value.length > 0 && selectedIds.value.length === withdrawals.value.length
);

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = withdrawals.value.map((txn: any) => txn.id);
  }
}

function formatCurrency(amount: number) {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0';
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function formatDate(date: any): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const formattedDate = d.toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    return `📅 ${formattedDate}`;
  } catch { return ''; }
}
function formatDateRelative(date: any): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `⏱️ ${dayjs(d).fromNow()}`;
  } catch { return ''; }
}

function badgeClass(status: string) {
  switch (status) {
    case 'PENDING': return 'badge bg-yellow-100 text-yellow-700';
    case 'APPROVED': return 'badge bg-green-100 text-green-700';
    case 'FAILED': return 'badge bg-gray-100 text-gray-700';
    default: return 'badge';
  }
}

// FILTER LOGIC (rút gọn)
const statusOptions = [
  { label: 'All Status', value: '', color: '' },
  { label: 'Pending', value: 'PENDING', color: 'status-pending' },
  { label: 'Approved', value: 'APPROVED', color: 'status-approved' },
  { label: 'Failed', value: 'FAILED', color: 'status-failed' },
];
const filterDraft = ref({
  status: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: ''
});
function applyFilters() {
  loadWithdrawals();
}
function resetFilters() {
  filterDraft.value = {
    status: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  };
  loadWithdrawals();
}

async function loadWithdrawals() {
  loading.value = true;
  error.value = '';
  try {
    const params: any = {};
    if (filterDraft.value.status) params.status = filterDraft.value.status;
    if (filterDraft.value.startDate) params.dateFrom = filterDraft.value.startDate;
    if (filterDraft.value.endDate) params.dateTo = filterDraft.value.endDate;
    if (filterDraft.value.minAmount !== '' && !isNaN(Number(filterDraft.value.minAmount))) params.minAmount = filterDraft.value.minAmount;
    if (filterDraft.value.maxAmount !== '' && !isNaN(Number(filterDraft.value.maxAmount))) params.maxAmount = filterDraft.value.maxAmount;
    const res = await axios.get('/api/payment/withdrawals/pending', { params });
    rawWithdrawals.value = res.data || [];
    selectedIds.value = selectedIds.value.filter(id => rawWithdrawals.value.some((txn: any) => txn.id === id));
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to load withdrawals.';
  } finally {
    loading.value = false;
  }
}

async function approve(id: number) {
  approvingId.value = id;
  try {
    await axios.post(`/api/payment/${id}/approve`);
    await loadWithdrawals();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Withdrawal approved successfully.',
      life: 3000
    });
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Approve failed');
  } finally {
    approvingId.value = null;
  }
}

async function approveSelected() {
  if (selectedIds.value.length === 0) return;
  approvingAll.value = true;
  try {
    await Promise.all(selectedIds.value.map(id => axios.post(`/api/payment/${id}/approve`)));
    await loadWithdrawals();
    selectedIds.value = [];
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Selected withdrawals approved successfully.',
      life: 3000
    });
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Approve failed');
  } finally {
    approvingAll.value = false;
  }
}

async function rejectSelected() {
  if (selectedIds.value.length === 0) return;
  approvingAll.value = true;
  try {
    await Promise.all(selectedIds.value.map(id => axios.post(`/api/payment/${id}/reject`)));
    await loadWithdrawals();
    selectedIds.value = [];
    toast.add({
      severity: 'error',
      summary: 'Rejected',
      detail: 'Selected withdrawals rejected and refunded.',
      life: 3000
    });
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Reject failed');
  } finally {
    approvingAll.value = false;
  }
}

const showApproveModal = ref(false);
const approveTarget = ref<any>(null);
const showBatchApproveModal = ref(false);
const batchApproveAmount = ref(0);
const batchApproveEmail = ref('');

function openApproveModal(txn: any) {
  approveTarget.value = txn;
  showApproveModal.value = true;
}
function closeApproveModal() {
  showApproveModal.value = false;
  approveTarget.value = null;
}
async function confirmApprove() {
  if (!approveTarget.value) return;
  approvingId.value = approveTarget.value.id;
  try {
    await axios.post(`/api/payment/${approveTarget.value.id}/approve`);
    await loadWithdrawals();
    closeApproveModal();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Withdrawal approved successfully.',
      life: 3000
    });
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Approve failed');
  } finally {
    approvingId.value = null;
  }
}
function openBatchApproveModal() {
  if (selectedIds.value.length === 0) return;
  if (selectedIds.value.length === 1) {
    const txn = rawWithdrawals.value.find((t: any) => t.id === selectedIds.value[0]);
    batchApproveAmount.value = txn ? txn.amount : 0;
    batchApproveEmail.value = txn?.user?.email || '';
  } else {
    batchApproveAmount.value = 0;
    batchApproveEmail.value = '';
  }
  showBatchApproveModal.value = true;
}
function closeBatchApproveModal() {
  showBatchApproveModal.value = false;
}
async function confirmBatchApprove() {
  if (selectedIds.value.length === 0) return;
  approvingAll.value = true;
  try {
    await Promise.all(selectedIds.value.map(id => axios.post(`/api/payment/${id}/approve`)));
    await loadWithdrawals();
    selectedIds.value = [];
    closeBatchApproveModal();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Selected withdrawals approved successfully.',
      life: 3000
    });
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Approve failed');
  } finally {
    approvingAll.value = false;
  }
}

async function reject(id: number) {
  rejectingId.value = id;
  try {
    await axios.post(`/api/payment/${id}/reject`);
    await loadWithdrawals();
    toast.add({
      severity: 'error',
      summary: 'Rejected',
      detail: 'Withdrawal rejected and refunded.',
      life: 3000
    });
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Reject failed');
  } finally {
    rejectingId.value = null;
  }
}

const toast = useToast();

const showDetailModal = ref(false);
const detailTarget = ref<any>(null);

function openDetailModal(txn: any) {
  detailTarget.value = txn;
  showDetailModal.value = true;
}

function closeDetailModal() {
  showDetailModal.value = false;
  detailTarget.value = null;
}

onMounted(loadWithdrawals);
</script>

<style scoped>
.main-content-admin {
  flex: 1;
  padding: 40px 0;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin-left: 260px; /* tăng khoảng cách với sidebar */
}
.admin-withdrawals-container {
  width: 100%;
  max-width: 1200px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.09);
  padding: 32px 28px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.97rem;
}
.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}
.sticky-action-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 10;
  background: #fff;
  padding: 12px 0 8px 0;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 2px 8px rgba(37,99,235,0.04);
}
@media (max-width: 900px) {
  .page-container {
    padding-left: 8px;
    padding-right: 8px;
  }
  .sticky-action-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 0 6px 0;
  }
}
.table-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  overflow-x: auto;
}
.withdrawals-table {
  width: 100%;
  min-width: 950px;
  border-collapse: collapse;
  margin-top: 8px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.withdrawals-table th, .withdrawals-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f3f4f6;
  text-align: left;
  font-size: 0.97rem;
  white-space: nowrap;
}
.withdrawals-table th {
  background: #f9fafb;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 2;
  color: #374151;
}
.checkbox-header, .checkbox-cell {
  width: 50px;
  text-align: center;
}
.status-header, .status-cell {
  text-align: center;
}
.action-header, .action-cell {
  text-align: center;
  width: 200px;
}
.select-all-checkbox, .row-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
}
.withdrawals-table tr:last-child td {
  border-bottom: none;
}

/* Zebra row styling */
.withdrawals-table tbody tr:nth-child(even) {
  background: #f9fafb;
}

.withdrawals-table tbody tr:nth-child(odd) {
  background: #ffffff;
}

.withdrawals-table tr:hover td {
  background: #f0f7ff !important;
  transition: background 0.15s;
}

/* Ensure hover overrides zebra styling */
.withdrawals-table tbody tr:nth-child(even):hover td {
  background: #f0f7ff !important;
}

.withdrawals-table tbody tr:nth-child(odd):hover td {
  background: #f0f7ff !important;
}
.badge {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  font-size: 1.01rem;
  border-radius: 12px;
  padding: 6px 18px;
  margin-right: 2px;
  margin-bottom: 2px;
  vertical-align: middle;
  line-height: 1.5;
  box-sizing: border-box;
}
.bg-yellow-100 { background: #fef9c3; }
.text-yellow-700 { color: #b45309; }
.bg-green-100 { background: #d1fae5; }
.text-green-700 { color: #047857; }
.bg-red-100 { background: #fee2e2; }
.text-red-700 { color: #b91c1c; }
.bg-gray-100 { background: #f3f4f6; }
.text-gray-700 { color: #374151; }
button { padding: 7px 18px; border-radius: 8px; border: none; font-size: 1rem; font-weight: 600; cursor: pointer; background: #2563eb; color: #fff; transition: background 0.18s, opacity 0.15s; }
button:disabled { background: #bcd0f7; cursor: not-allowed; }
h2 { margin-bottom: 18px; color: #2563eb; }
.loading, .error, .empty { text-align: center; margin: 18px 0; color: #888; }
.error { color: #e53e3e; font-weight: 500; }
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 41, 59, 0.48); /* overlay tối hơn */
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
.modal-content.modal-approve {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(37,99,235,0.13);
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: stretch;
  margin: 0;
  box-sizing: border-box;
  animation: modal-pop 0.18s cubic-bezier(.4,1.4,.6,1) 1;
}
@keyframes modal-pop {
  0% { transform: scale(0.92) translateY(30px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { padding: 8px 22px; border-radius: 10px; font-size: 1rem; font-weight: 600; border: none; cursor: pointer; transition: background 0.18s, color 0.18s, opacity 0.18s, border 0.18s; margin-right: 8px; outline: none; }
.btn-primary { background: #2563eb; color: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(37,99,235,0.07); }
.btn-primary:disabled { background: #a5b4fc; color: #fff; cursor: not-allowed; opacity: 0.7; }
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-primary:active:not(:disabled), .btn-primary:focus:not(:disabled) { background: #2563eb; }
.btn-secondary { background: #fff; color: #2563eb; border: 2px solid #2563eb; border-radius: 10px; }
.btn-secondary:disabled { background: #e5e7eb; color: #a5b4fc; cursor: not-allowed; opacity: 0.7; }
.btn-secondary:hover:not(:disabled) { background: #f3f4f6; color: #1d4ed8; border-color: #1d4ed8; }
.modal-tip { color: #2563eb; font-size: 1.01rem; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; font-weight: 500; background: #f3f4f6; display: flex; align-items: center; gap: 8px; }
.card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.09);
  padding: 32px 28px 24px 28px;
  margin-bottom: 32px;
}
/* --- FILTER SECTION STYLES (giữ lại phần cần thiết) --- */
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
.date-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
}
.date-range-sep {
  color: #888;
  font-size: 1.1rem;
  margin: 0 2px;
}
.filter-input[type="date"] {
  min-width: 130px;
  width: 130px;
  max-width: 180px;
}
.filter-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 80px;
}
.custom-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.custom-status-select {
  min-width: 180px;
  width: 200px;
  max-width: 220px;
  height: 38px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  background: #fff;
  /* appearance: none; */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-badge-preview {
  display: none !important;
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
.badge.bg-yellow-100.text-yellow-700 {
  background: #fef3c7 !important;
  color: #d97706 !important;
}
.badge.bg-green-100.text-green-700 {
  background: #d1fae5 !important;
  color: #059669 !important;
}
.badge.bg-red-100.text-red-700 {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}
.badge.bg-gray-100.text-gray-700 {
  background: #f3f4f6 !important;
  color: #374151 !important;
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
.box-title {
  display: flex;
  align-items: center;
  font-size: 1.35rem;
  font-weight: 600;
  margin-bottom: 18px;
  color: #2563eb;
  gap: 10px;
}
.box-title-icon {
  font-size: 1.6rem;
  margin-right: 6px;
}
.btn-approve {
  background: #2563eb;
  color: #fff;
  border-radius: 999px;
  padding: 7px 22px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.18s, color 0.18s;
}
.btn-approve:disabled {
  background: #bcd0f7;
  color: #fff;
  cursor: not-allowed;
}
.btn-approve:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-approve-selected {
  background: #10b981;
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-approve-selected:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.btn-approve-selected:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}
.btn-reject-selected {
  background: #ef4444;
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-reject-selected:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.btn-reject-selected:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}
.btn-icon {
  font-size: 0.8em;
  margin-right: 2px;
}
.btn-reject {
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 7px 22px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.18s, color 0.18s;
  margin-left: 8px;
}
.btn-reject:disabled {
  background: #fca5a5;
  color: #fff;
  cursor: not-allowed;
}
.btn-reject:hover:not(:disabled) {
  background: #b91c1c;
}
.action-cell .btn {
  margin: 0 4px;
  padding: 6px 12px;
  font-size: 0.85rem;
}
.date-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.date-primary {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}
.date-secondary {
  color: #6b7280;
  font-size: 0.8rem;
  font-style: italic;
}
.amount-range-group {
  min-width: 260px;
}
.amount-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
}
.amount-range-sep {
  color: #888;
  font-size: 1.1rem;
  margin: 0 2px;
}
.table-row-clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}
.withdrawals-table tr.table-row-clickable:hover, .table-row-clickable:hover td {
  background: #f0f7ff !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.10);
  z-index: 2;
  position: relative;
}
.modal-detail {
  max-width: 600px;
  width: 90vw;
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
.detail-content {
  margin-bottom: 8px; /* giảm margin-bottom */
}
.detail-section {
  margin-bottom: 8px; /* giảm khoảng cách giữa các section */
}
.detail-section h4 {
  margin: 0 0 6px 0;
  color: #374151;
  font-size: 0.93rem; /* giảm font-size */
  font-weight: 600;
}
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 4px; /* giảm gap */
}
.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0; /* giảm padding trên/dưới mỗi dòng */
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.91rem; /* giảm font-size */
}
.detail-item:last-child {
  border-bottom: none;
}
.detail-label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.91rem;
}
.detail-value {
  color: #374151;
  font-size: 0.91rem;
}
.amount-value {
  font-size: 1.01rem;
  font-weight: 700;
  color: #2563eb;
}
.modal-content.modal-detail {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 48px 0 rgba(37,99,235,0.18), 0 2px 8px rgba(0,0,0,0.08);
  padding: 12px 16px 8px 16px; /* giảm padding trên/dưới */
  min-width: 320px;
  max-width: 420px; /* giảm max-width nếu muốn nhỏ hơn */
  display: flex;
  flex-direction: column;
  gap: 6px; /* giảm khoảng cách giữa các section */
  align-items: stretch;
  margin: 0;
  box-sizing: border-box;
  z-index: 3100;
  animation: modal-pop-detail 0.22s cubic-bezier(.4,1.4,.6,1) 1;
  border: 2px solid #3b82f6;
}
@keyframes modal-pop-detail {
  0% { transform: scale(0.88) translateY(40px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
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

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.page-size-selector label {
  font-weight: 500;
}

.page-size-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
}

.page-size-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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

  .page-size-selector {
    order: 3;
    justify-content: center;
  }
}
.sort-icon {
  margin-left: 6px;
  font-size: 0.85rem;
  color: #9ca3af;
  transition: color 0.2s ease;
}

th:hover .sort-icon {
  color: #1f2937;
}

th[style*="cursor: pointer"]:hover {
  background: #f1f5f9;
  transition: background 0.2s ease;
}

/* Enhanced information styling */
.email-link {
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.email-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.amount-value {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-primary {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.date-secondary {
  color: #6b7280;
  font-size: 0.8rem;
  font-style: italic;
}
</style>
