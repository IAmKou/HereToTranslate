<template>
  <div>
    <AdminNavbar />
    <div style="display: flex; min-height: 80vh; background: #f8f9fb;">
      <AdminSidebar />
      <div class="main-content-admin">
        <div class="admin-withdrawals-container">
          <h2 class="box-title"><span class="box-title-icon">💸</span> <span>Pending Withdrawals</span></h2>
          <div class="filters-row">
            <select v-model="filterStatus" class="filter-select">
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input v-model="searchText" class="filter-input" type="text" placeholder="Search user or email..." @keyup.enter="applyFilters" />
            <input v-model="dateFrom" class="filter-date" type="date" />
            <span style="margin: 0 6px;">-</span>
            <input v-model="dateTo" class="filter-date" type="date" />
            <button class="btn btn-primary" @click="applyFilters" style="margin-left: 10px;">Apply</button>
            <button class="btn btn-secondary" @click="resetFilters">Reset</button>
          </div>
          <div v-if="loading" class="loading">Loading...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else>
            <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
              <button @click="openBatchApproveModal" :disabled="selectedIds.length === 0 || approvingAll" class="btn btn-approve-selected"><span class="btn-icon">✅</span> Approve Selected</button>
              <button @click="rejectSelected" :disabled="selectedIds.length === 0 || approvingAll" class="btn btn-reject-selected"><span class="btn-icon">❌</span> Reject Selected</button>
              <span v-if="approvingAll" style="color: #888; margin-left: 8px;">Processing...</span>
            </div>
            <div class="table-wrapper">
              <table class="withdrawals-table">
                <thead>
                <tr>
                  <th><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
                  <th>No</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(txn, idx) in withdrawals" :key="txn.id">
                  <td><input type="checkbox" :value="txn.id" v-model="selectedIds" /></td>
                  <td>{{ idx + 1 }}</td>
                  <td>{{ txn.user?.fullName || txn.user?.username || txn.user?.email }}</td>
                  <td>{{ txn.user?.email }}</td>
                  <td>{{ formatCurrency(Math.abs(txn.amount)) }}</td>
                  <td>
                    <span :class="badgeClass(txn.status)" style="white-space:nowrap; display:inline-flex; align-items:center;">
                      <span v-if="txn.status === 'PENDING'">⏳ Pending</span>
                      <span v-else-if="txn.status === 'APPROVED'">✅ Approved</span>
                      <span v-else-if="txn.status === 'REJECTED'">❌ Rejected</span>
                      <span v-else-if="txn.status === 'FAILED'">⚠️ Failed</span>
                      <span v-else>{{ txn.status }}</span>
                    </span>
                  </td>
                  <td>{{ formatDate(txn.createdAt) }}</td>
                  <td>
                    <button @click="openApproveModal(txn)" :disabled="approvingId === txn.id" class="btn btn-approve"><span class="btn-icon">✅</span> Approve</button>
                  </td>
                </tr>
                </tbody>
              </table>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import AdminSidebar from '../components/AdminSidebar.vue';
import AdminNavbar from '../components/AdminNavbar.vue';
import AppFooter from '../components/AppFooter.vue';

const withdrawals = ref([]);
const loading = ref(true);
const error = ref('');
const approvingId = ref<number|null>(null);
const approvingAll = ref(false);
const selectedIds = ref<number[]>([]);

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
    return d.toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return ''; }
}

function badgeClass(status: string) {
  switch (status) {
    case 'PENDING': return 'badge bg-yellow-100 text-yellow-700';
    case 'APPROVED': return 'badge bg-green-100 text-green-700';
    case 'REJECTED': return 'badge bg-red-100 text-red-700';
    case 'FAILED': return 'badge bg-gray-100 text-gray-700';
    default: return 'badge';
  }
}

const filterStatus = ref('ALL');
const searchText = ref('');
const dateFrom = ref('');
const dateTo = ref('');

function applyFilters() {
  loadWithdrawals();
}
function resetFilters() {
  filterStatus.value = 'ALL';
  searchText.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  loadWithdrawals();
}

async function loadWithdrawals() {
  loading.value = true;
  error.value = '';
  try {
    const params: any = {};
    if (filterStatus.value !== 'ALL') params.status = filterStatus.value;
    if (searchText.value) params.search = searchText.value;
    if (dateFrom.value) params.dateFrom = dateFrom.value;
    if (dateTo.value) params.dateTo = dateTo.value;
    const res = await axios.get('/api/payment/withdrawals/pending', { params });
    withdrawals.value = res.data || [];
    selectedIds.value = selectedIds.value.filter(id => withdrawals.value.some((txn: any) => txn.id === id));
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
    toast.success('Withdrawal approved successfully!');
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Approve failed');
  } finally {
    approvingId.value = null;
  }
}
function openBatchApproveModal() {
  if (selectedIds.value.length === 0) return;
  if (selectedIds.value.length === 1) {
    const txn = withdrawals.value.find((t: any) => t.id === selectedIds.value[0]);
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
    toast.success('Selected withdrawals approved successfully!');
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Approve failed');
  } finally {
    approvingAll.value = false;
  }
}

const toast = useToast();

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
  margin-left: 240px; /* đúng bằng chiều rộng sidebar */
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
}
.withdrawals-table th, .withdrawals-table td {
  padding: 14px 18px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 1.05rem;
  white-space: nowrap;
}
.withdrawals-table th {
  background: #f3f4f6;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 2;
}
.withdrawals-table tr:last-child td {
  border-bottom: none;
}
.withdrawals-table tr:hover td {
  background: #f1f5ff;
  transition: background 0.15s;
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
  background: rgba(0,0,0,0.18);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
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
.filters-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.filter-select, .filter-input, .filter-date {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 1.01rem;
  min-width: 120px;
}
.filter-input { min-width: 200px; }
.filter-date { min-width: 140px; }
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
  border-radius: 999px;
  padding: 7px 22px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.18s, color 0.18s;
}
.btn-approve-selected:disabled {
  background: #bcd0f7;
  color: #fff;
  cursor: not-allowed;
}
.btn-approve-selected:hover:not(:disabled) {
  background: #059669;
}
.btn-reject-selected {
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 7px 22px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.18s, color 0.18s;
}
.btn-reject-selected:disabled {
  background: #fca5a5;
  color: #fff;
  cursor: not-allowed;
}
.btn-reject-selected:hover:not(:disabled) {
  background: #b91c1c;
}
.btn-icon {
  font-size: 1.15em;
  margin-right: 4px;
}
</style>
