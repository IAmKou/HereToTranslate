<template>
  <div>
    <Navbar />
    <div class="main-content-wrapper">
      <Sidebar />
      <div class="main-content">
        <div class="wallet-layout">
          <div class="wallet-left">
            <div class="wallet-card wallet-upgrade">
              <div class="wallet-header">
                <div class="wallet-icon">
                  <i class="pi pi-wallet"></i>
                </div>
                <div>
                  <h1>Wallet</h1>
                </div>
              </div>
              <div v-if="loading" class="loading">Loading...</div>
              <div v-else-if="error" class="error">{{ error }}</div>
              <div v-else-if="wallet">
                <div class="balance-label">Balance</div>
                <div class="wallet-balance">
                  <span class="money-icon">💵</span>
                  {{ formatCurrency(wallet.balance) }}
                </div>
                <div class="withdraw-fee-tip">
                  <span v-if="wallet && wallet.balance > 0">
                    If you withdraw all, you will receive: <b>{{ formatCurrency(wallet.balance * 0.95) }}</b> after 5% fee.
                  </span>
                </div>
                <div class="user-info-block">
                  <div class="user-avatar user-avatar-upgrade">
                    <template v-if="wallet.user?.avatar">
                      <img :src="wallet.user.avatar" alt="avatar" class="avatar-img avatar-img-upgrade" />
                    </template>
                    <template v-else>
                      <i class="pi pi-user user-avatar-icon"></i>
                    </template>
                  </div>
                  <div class="user-info user-info-upgrade">
                    <div class="user-name user-line">
                      <i class="pi pi-id-card user-info-icon"></i>
                      <span class="user-name-text">{{ wallet.user?.fullName ?? '' }}</span>
                      <span v-if="wallet.user?.status" :class="['user-status-badge', wallet.user.status.toLowerCase()]">
                        <span v-if="wallet.user.status === 'Active'">🟢 Active</span>
                        <span v-else-if="wallet.user.status === 'Inactive'">🔴 Inactive</span>
                        <span v-else>🟡 Pending</span>
                      </span>
                    </div>
                    <div class="user-username user-line">
                      <i class="pi pi-at user-info-icon"></i>
                      @{{ wallet.user?.username ?? '' }}
                    </div>
                    <div class="user-email user-line">
                      <i class="pi pi-envelope user-info-icon"></i>
                      <span>{{ wallet.user?.email ?? '' }}</span>
                      <span v-if="wallet.user?.email" class="copy-icon" @click="copyToClipboard(wallet.user.email)" title="Copy email">
                        <i class="pi pi-copy"></i>
                      </span>
                    </div>
                    <div class="user-phone user-line" v-if="wallet.user?.phone">
                      <i class="pi pi-phone user-info-icon"></i>
                      {{ wallet.user?.phone ?? '' }}
                    </div>
                  </div>
                </div>
                <!-- Bỏ hoàn toàn phần liên kết PayPal/email PayPal -->
                <div class="wallet-actions wallet-actions-upgrade">
                  <button class="wallet-btn withdraw custom-withdraw-btn" title="Withdraw" @click="openWithdrawModal">
                    ⬆ <span>Withdraw</span>
                  </button>
                  <button class="wallet-btn history custom-history-btn" title="View all transactions" @click="goToTransactionHistory">
                    📄 <span>Transaction History</span>
                  </button>
                </div>
              </div>
              <div v-else>
                <p>No wallet information found.</p>
              </div>
            </div>
            <!-- XÓA phần Pending Withdrawals Section ở đây -->
          </div>
          <div class="wallet-right">
            <div v-if="wallet">
              <div class="wallet-finance-grid">
                <div class="mini-stat-card deposit" @click="filterTransactions('deposit')" tabindex="0" title="Show only deposits">
                  <div class="mini-stat-icon">
                    <!-- SVG icon for deposit -->
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="14" cy="14" r="14" fill="#E0F7EF"/>
                      <path d="M14 8v8m0 0l-4-4m4 4l4-4" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="mini-stat-label">Total Deposits</div>
                  <div class="mini-stat-value" :class="currencyClass(wallet.totalDeposits)">{{ formatCurrency(wallet.totalDeposits) }}</div>
                </div>
                <div class="mini-stat-card withdraw" @click="filterTransactions('withdraw')" tabindex="0" title="Show only withdrawals">
                  <div class="mini-stat-icon">
                    <!-- SVG icon for withdraw -->
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="14" cy="14" r="14" fill="#FFF7E0"/>
                      <path d="M14 20v-8m0 0l4 4m-4-4l-4 4" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="mini-stat-label">Total Withdrawn</div>
                  <div class="mini-stat-value" :class="currencyClass(wallet.totalWithdrawn)">{{ formatCurrency(wallet.totalWithdrawn) }}</div>
                </div>
                <div class="mini-stat-card pending" @click="filterTransactions('pending')" tabindex="0" title="Show only pending withdrawals">
                  <div class="mini-stat-icon">
                    <!-- SVG icon for pending -->
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="14" cy="14" r="14" fill="#FEF9C3"/>
                      <path d="M14 8v6l4 2" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="mini-stat-label">Pending Withdrawals</div>
                  <div class="mini-stat-value" :class="currencyClass(wallet.pendingWithdrawals)">{{ formatCurrency(wallet.pendingWithdrawals) }}</div>
                </div>
              </div>
              <div v-if="wallet.latestTransaction" class="latest-transaction-summary">
                <div class="lts-title">Latest Transaction</div>
                <div class="lts-row lts-desc">
                  <span class="lts-desc-icon">
                    <template v-if="wallet.latestTransaction.type === 'Deposit'">💰</template>
                    <template v-else-if="wallet.latestTransaction.type === 'Payment'">💳</template>
                    <template v-else-if="wallet.latestTransaction.type === 'Withdrawal'">💸</template>
                    <template v-else>🔄</template>
                  </span>
                  <span class="lts-desc-text">
                    <template v-if="wallet.latestTransaction.type === 'Deposit'">
                      You deposited {{ formatCurrency(wallet.latestTransaction.amount) }} via PayPal.
                    </template>
                    <template v-else-if="wallet.latestTransaction.type === 'Payment'">
                      You received {{ formatCurrency(wallet.latestTransaction.amount) }} for translation work.
                    </template>
                    <template v-else-if="wallet.latestTransaction.type === 'Withdrawal'">
                      You withdrew {{ formatCurrency(Math.abs(wallet.latestTransaction.amount)) }} to PayPal.
                    </template>
                    <template v-else>
                      Transaction of {{ formatCurrency(Math.abs(wallet.latestTransaction.amount)) }}.
                    </template>
                  </span>
                </div>
                <div class="lts-row">
                  <span class="lts-label">Amount:</span>
                  <span :class="['lts-value', currencyClass(wallet.latestTransaction.amount), wallet.latestTransaction.type === 'Deposit' ? 'deposit' : 'withdraw']">
                    {{ formatCurrency(Math.abs(wallet.latestTransaction.amount)) }}
                  </span>
                </div>
                <div class="lts-row">
                  <span class="lts-label">Type:</span>
                  <span class="lts-value">{{ wallet.latestTransaction.type }}</span>
                </div>
                <div class="lts-row">
                  <span class="lts-label">Status:</span>
                  <span class="lts-value" :class="['status-badge',
                    wallet.latestTransaction.status === 'COMPLETED' ? 'completed' :
                    wallet.latestTransaction.status === 'REJECTED' ? 'rejected' :
                    ['HOLD', 'WAITING_APPROVAL', 'IN_PROGRESS'].includes(wallet.latestTransaction.status) ? 'hold' : 'pending']">
                    <template v-if="wallet.latestTransaction.status === 'COMPLETED'">
                      ✅ <span>Completed</span>
                    </template>
                    <template v-else-if="wallet.latestTransaction.status === 'REJECTED'">
                      ❌ <span>Rejected</span>
                    </template>
                    <template v-else-if="['HOLD', 'WAITING_APPROVAL', 'IN_PROGRESS'].includes(wallet.latestTransaction.status)">
                      ⏸ <span>Hold</span>
                    </template>
                    <template v-else>
                      ⏳ <span>Pending</span>
                    </template>
                  </span>
                </div>
                <div class="lts-row">
                  <span class="lts-label">Time:</span>
                  <span class="lts-value">{{ formatDateTime(wallet.latestTransaction.createdAt) }}</span>
                </div>
              </div>
              <div v-else class="latest-transaction-empty">
                <div class="lts-empty-icon">📄</div>
                <div class="lts-empty-title">No transactions yet</div>
                <div class="lts-empty-desc">Your recent transactions will appear here once you make a deposit or withdrawal.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
    <!-- Modal dialog ở giữa màn hình -->
    <div v-if="showWithdrawModal" class="modal-backdrop">
      <div class="modal-content withdraw-modal">
        <h3>Withdraw to PayPal</h3>
        <div class="withdraw-info-tip">
          💡 <span>Fee: 5%<span class="fee-tooltip" title="A 5% fee will be deducted from your withdrawal amount to cover transaction and processing costs.">ℹ️</span></span> | Processed within 24h<br>
          <span class="withdraw-admin-tip" title="Withdrawals require admin approval.">Withdrawals will be processed after admin approval.</span>
        </div>
        <form @submit.prevent="handleWithdrawSubmit">
          <div class="form-group">
            <label for="withdraw-amount"><span class="amount-label-icon">💵</span> Amount (USD):</label>
            <input id="withdraw-amount" v-model.number="withdrawAmount" type="number" min="1" :max="wallet?.balance || 0" placeholder="Enter amount (e.g. 10)" @input="validateWithdrawAmount" :class="{'input-invalid': withdrawAmountError || withdrawAmount <= 0}" />
            <div v-if="withdrawAmountError" class="input-error">{{ withdrawAmountError }}</div>
            <div v-if="withdrawAmount > 0 && !withdrawAmountError" class="after-fee-tip">
              You will receive <b>{{ formatCurrency(withdrawAmount * 0.95) }}</b> after the 5% fee.
            </div>
          </div>
          <div class="form-group">
            <label for="withdraw-email"><span class="email-label-icon">📧</span> PayPal Email:</label>
            <input id="withdraw-email" v-model="withdrawEmail" type="email" placeholder="Enter your PayPal email" @input="validateWithdrawEmail" :class="{'input-invalid': withdrawEmailError}" />
            <div v-if="withdrawEmailError" class="input-error">{{ withdrawEmailError }}</div>
            <div class="email-warning" style="color: #ef4444; font-size: 0.97rem; margin-top: 4px;">
              <i class="pi pi-exclamation-triangle" style="margin-right: 4px;"></i>
              <b>We are not responsible if you enter the wrong PayPal email. Please double-check before confirming!</b>
            </div>
          </div>
          <div v-if="withdrawError" class="input-error">{{ withdrawError }}</div>
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary" :disabled="withdrawLoading || withdrawAmountError || withdrawEmailError || hasPendingWithdraw || withdrawAmount <= 0 || withdrawAmount > (wallet?.balance || 0)">
              <span v-if="withdrawLoading" class="spinner"></span>
              <span v-if="withdrawLoading">Processing…</span>
              <span v-else>Confirm</span>
            </button>
            <button type="button" class="btn btn-secondary" @click="closeWithdrawModal" :disabled="withdrawLoading">Cancel</button>
          </div>
          <div v-if="hasPendingWithdraw" class="pending-withdraw-tip">
            You already have a pending withdrawal request. Please wait for admin approval before submitting another.
          </div>
        </form>
      </div>
    </div>
    <!-- Modal xác nhận lần 2 nếu số tiền lớn hơn $100 -->
    <div v-if="showSecondConfirm" class="modal-backdrop">
      <div class="modal-content withdraw-modal">
        <h3>Confirm Withdrawal</h3>
        <div style="margin-bottom: 18px; color: #f59e0b; font-weight: 500;">
          You are about to withdraw <b>{{ formatCurrency(withdrawAmount) }}</b>.<br>
          After fee, you will receive <b>{{ formatCurrency(withdrawAmount * 0.95) }}</b>.<br>
          Are you sure you want to proceed?
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="doFinalWithdraw" :disabled="withdrawLoading">Yes, Withdraw</button>
          <button class="btn btn-secondary" @click="showSecondConfirm = false" :disabled="withdrawLoading">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import AppFooter from '../components/AppFooter.vue';
import axios from 'axios';
import { useToast } from 'primevue/usetoast';

interface UserInfo {
  id: number | string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  avatar?: string;
  status?: 'Active' | 'Inactive' | 'Pending';
  paypalEmail?: string;
}
interface Wallet {
  id: number | string;
  balance: number;
  user?: UserInfo;
  totalDeposits: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  holdAmount: number;
  latestTransaction?: {
    id: number;
    type: 'Deposit' | 'Withdrawal' | 'Transfer';
    amount: number;
    status: 'Pending' | 'Completed' | 'Failed' | 'HOLD' | 'WAITING_APPROVAL' | 'IN_PROGRESS';
    createdAt: string;
  };
}

const wallet = ref<Wallet | null>(null);
const loading = ref(true);
const error = ref('');
const showWithdrawModal = ref(false);
const withdrawAmount = ref(0);
const withdrawEmail = ref('');
const withdrawError = ref('');
const withdrawLoading = ref(false);
const pendingWithdrawals = ref([]);
const withdrawAmountError = ref('');
const withdrawEmailError = ref('');
const withdrawSuccessMsg = ref('');
const showSecondConfirm = ref(false);

const router = useRouter();
const toast = useToast();

function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}
function formatDate(date: any): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  } catch { return ''; }
}
function formatCurrency(amount: number | string | undefined | null): string {
  const num = Number(amount);
  if (isNaN(num)) return '$0';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDateTime(date: any): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    d.setHours(d.getHours() + 7); // Cộng thêm 7 tiếng để khớp múi giờ Việt Nam
    return d.toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return ''; }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

async function reloadWallet() {
  loading.value = true;
  error.value = '';
  try {
    const res = await axios.get('/api/wallet');
    wallet.value = res.data;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to load wallet info.';
  } finally {
    loading.value = false;
  }
}

async function loadPendingWithdrawals() {
  try {
    const res = await axios.get('/api/wallet/pending-withdrawals');
    pendingWithdrawals.value = res.data || [];
  } catch {
    pendingWithdrawals.value = [];
  }
}

async function submitWithdraw() {
  withdrawError.value = '';
  withdrawSuccessMsg.value = '';
  if (!withdrawAmount.value || withdrawAmount.value <= 0) {
    withdrawError.value = 'Amount must be greater than 0';
    toast.add({ severity: 'error', summary: 'Error', detail: withdrawError.value, life: 3000 });
    return;
  }
  if (!withdrawEmail.value || !/^[^\s@]+@[^"\s]+\.[^\s@]+$/.test(withdrawEmail.value)) {
    withdrawError.value = 'Invalid PayPal email';
    toast.add({ severity: 'error', summary: 'Error', detail: withdrawError.value, life: 3000 });
    return;
  }
  if (withdrawAmount.value > (wallet.value?.balance || 0)) {
    withdrawError.value = 'Insufficient balance';
    toast.add({ severity: 'error', summary: 'Error', detail: withdrawError.value, life: 3000 });
    return;
  }
  withdrawLoading.value = true;
  try {
    await axios.post('/api/wallet/withdraw', {
      amount: withdrawAmount.value,
      paypalEmail: withdrawEmail.value,
    });
    await loadPendingWithdrawals();
    withdrawSuccessMsg.value = 'Your withdrawal request has been submitted and is pending admin approval.';
    toast.add({ severity: 'success', summary: 'Success', detail: withdrawSuccessMsg.value, life: 3000 });
    showWithdrawModal.value = false;
  } catch (e: any) {
    withdrawError.value = e?.response?.data?.message || 'Withdraw failed';
    toast.add({ severity: 'error', summary: 'Error', detail: withdrawError.value, life: 3000 });
  } finally {
    withdrawLoading.value = false;
  }
}

function openWithdrawModal() {
  withdrawAmount.value = 0;
  withdrawEmail.value = wallet.value?.user?.email || '';
  withdrawError.value = '';
  showWithdrawModal.value = true;
}
function closeWithdrawModal() {
  showWithdrawModal.value = false;
  withdrawError.value = '';
}

function validateWithdrawAmount() {
  withdrawAmountError.value = '';
  if (!withdrawAmount.value || withdrawAmount.value <= 0) {
    withdrawAmountError.value = 'Amount must be greater than 0';
  } else if (withdrawAmount.value > (wallet.value?.balance || 0)) {
    withdrawAmountError.value = 'Insufficient balance';
  }
}
function validateWithdrawEmail() {
  withdrawEmailError.value = '';
  if (!withdrawEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(withdrawEmail.value)) {
    withdrawEmailError.value = 'Invalid PayPal email';
  }
}

function filterTransactions(type: string) {
  // Gọi hàm filter hoặc emit sự kiện filter theo type
  // Ví dụ: chuyển sang trang Transaction History và filter theo type
  // Hoặc set biến filterType trong component này nếu có
  // alert('Filter: ' + type);
  // TODO: Thực hiện filter thực tế theo logic của bạn
}

function currencyClass(amount: number | undefined | null) {
  if (!amount || amount === 0) return 'currency-zero';
  return 'currency-positive';
}

const hasPendingWithdraw = computed(() => {
  return pendingWithdrawals.value && pendingWithdrawals.value.some(txn => txn.status === 'Pending');
});

function handleWithdrawSubmit() {
  if (withdrawAmount.value > 100) {
    showSecondConfirm.value = true;
  } else {
    submitWithdraw();
  }
}
function doFinalWithdraw() {
  showSecondConfirm.value = false;
  submitWithdraw();
}

function goToTransactionHistory() {
  // Chuyển hướng đến trang Transaction History
  router.push('/transactions');
}

onMounted(() => {
  reloadWallet();
  loadPendingWithdrawals();
});
</script>

<style scoped>
.wallet-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  align-items: flex-start;
}
.wallet-left {
  min-width: 320px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
}
.wallet-right {
  min-width: 320px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
@media (max-width: 1100px) {
  .wallet-layout { grid-template-columns: 1fr; gap: 18px; }
  .wallet-left, .wallet-right { max-width: 100%; min-width: 0; }
}
.wallet-card, .wallet-finance-details, .latest-transaction-summary {
  transition: box-shadow 0.18s, transform 0.18s;
}
.wallet-card:hover, .wallet-finance-details:hover, .latest-transaction-summary:hover {
  box-shadow: 0 8px 32px rgba(37,99,235,0.13), 0 2px 8px rgba(0,0,0,0.07);
  transform: translateY(-4px) scale(1.01);
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.leading-6 {
  line-height: 1.7;
}
.user-info-icon {
  margin-right: 8px;
  color: #2563eb;
  font-size: 1.1rem;
  vertical-align: middle;
}
.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(37,99,235,0.08);
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.user-avatar-icon {
  font-size: 2rem;
  color: #fff;
}
/* Giữ lại các style cũ và nâng cấp khác */
.wallet-balance {
  font-size: 2.7rem;
  font-weight: 800;
  color: #10b981;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.money-icon {
  font-size: 2.1rem;
  margin-right: 6px;
  vertical-align: middle;
}
.currency {
  font-size: 1.2rem;
  color: #10b981;
  margin-left: 2px;
  font-weight: 700;
}
.wallet-upgrade {
  margin-top: 2.5rem;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 6px 32px rgba(37,99,235,0.10), 0 1.5px 6px rgba(0,0,0,0.04);
  border-radius: 2rem;
  transition: box-shadow 0.18s, transform 0.18s;
  padding: 40px 36px 36px 36px;
}
.wallet-upgrade:hover {
  box-shadow: 0 12px 40px rgba(37,99,235,0.16), 0 2px 8px rgba(0,0,0,0.06);
  transform: translateY(-2px) scale(1.01);
}
.wallet-actions-upgrade {
  display: flex;
  gap: 16px;
  margin: 18px 0 10px 0;
  justify-content: flex-start;
  flex-wrap: wrap; /* Cho phép các nút xuống dòng khi thiếu chỗ */
  width: 100%; /* Đảm bảo container không bị tràn */
}
.wallet-btn {
  padding: 8px 22px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: #f1f5ff;
  color: #2563eb;
  box-shadow: 0 1px 4px rgba(37,99,235,0.07);
  transition: background 0.18s, color 0.18s, transform 0.12s, opacity 0.18s;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  min-width: 0; /* Ngăn nút tràn ngoài khi co nhỏ */
}
.wallet-btn:hover {
  background: #2563eb;
  color: #fff;
  transform: scale(1.04);
  opacity: 0.8;
}
.wallet-btn.deposit { background: #e0f7ef; color: #10b981; }
.wallet-btn.deposit:hover { background: #10b981; color: #fff; }
.wallet-btn.withdraw { background: #fff7e0; color: #f59e0b; }
.wallet-btn.withdraw:hover { background: #f59e0b; color: #fff; }
.wallet-btn.history { background: #f1f5ff; color: #2563eb; }
.wallet-btn.history:hover { background: #2563eb; color: #fff; }
.wallet-btn.deposit .action-icon { color: #10b981; }
.wallet-btn.withdraw .action-icon { color: #f59e0b; }
.wallet-btn.history .action-icon { color: #2563eb; }
.wallet-card {
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.09);
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.wallet-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 8px;
}
.wallet-icon {
  font-size: 2.5rem;
  color: #2563eb;
  background: #f1f5ff;
  border-radius: 50%;
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(37,99,235,0.08);
}
.wallet-header h1 {
  font-size: 2.1rem;
  font-weight: 800;
  color: #2563eb;
  margin: 0;
}
.wallet-id {
  font-size: 0.95rem;
  color: #888;
  margin-top: 2px;
}
.balance-label {
  font-size: 1.1rem;
  color: #888;
  margin-bottom: 2px;
}
.user-info-block {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
}
.user-status.active { color: #10b981; }
.user-status.inactive { color: #e53e3e; }
.loading {
  color: #888;
  text-align: center;
}
.error {
  color: #e53e3e;
  font-weight: 500;
  text-align: center;
}
.wallet-finance-details {
  margin: 18px 0 10px 0;
  padding: 18px 18px 10px 18px;
  background: #f8fafc;
  border-radius: 14px;
  box-shadow: 0 1px 6px rgba(37,99,235,0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.finance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.08rem;
  font-weight: 500;
  padding: 2px 0;
}
.finance-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
}
.finance-value {
  font-weight: 700;
}
.finance-icon {
  font-size: 1.15rem;
  vertical-align: middle;
}
.finance-value.deposit, .finance-icon.deposit { color: #10b981; }
.finance-value.withdraw, .finance-icon.withdraw { color: #ef4444; }
.finance-value.pending, .finance-icon.pending { color: #f59e0b; }
.finance-value.hold, .finance-icon.hold { color: #2563eb; }
.latest-transaction-summary {
  margin: 18px 0 10px 0;
  padding: 16px 18px 10px 18px;
  background: #f5f7fa;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(37,99,235,0.04);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lts-title {
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 6px;
  font-size: 1.08rem;
}
.lts-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.01rem;
  padding: 1px 0;
}
.lts-label {
  color: #475569;
}
.lts-value.deposit { color: #10b981; font-weight: 700; }
.lts-value.withdraw { color: #ef4444; font-weight: 700; }
.lts-desc {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.08rem;
  margin-bottom: 6px;
}
.lts-desc-icon {
  font-size: 1.5rem;
}
.lts-desc-text {
  font-weight: 500;
  color: #222;
}
.latest-transaction-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0 18px 0;
  color: #888;
  background: #f8fafc;
  border-radius: 12px;
  min-height: 120px;
}
.lts-empty-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}
.lts-empty-title {
  font-size: 1.13rem;
  font-weight: 700;
  margin-bottom: 2px;
}
.lts-empty-desc {
  font-size: 1.01rem;
  color: #888;
}
.wallet-finance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 24px 0 16px 0;
}
@media (max-width: 700px) {
  .wallet-finance-grid { grid-template-columns: 1fr; gap: 18px; }
}
.mini-stat-card {
  background: #fff;
  border-radius: 20px; /* rounded-xl */
  box-shadow: 0 2px 12px rgba(37,99,235,0.07);
  padding: 24px 18px 18px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  transition: box-shadow 0.18s, transform 0.18s;
  cursor: pointer;
  outline: none;
}
.mini-stat-card:hover, .mini-stat-card:focus {
  box-shadow: 0 8px 32px rgba(37,99,235,0.13), 0 2px 8px rgba(0,0,0,0.07);
  transform: translateY(-2px) scale(1.01);
  background: #f3f4f6;
}
.mini-stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  margin-bottom: 2px;
}
.mini-stat-card.deposit .mini-stat-icon { background: #e0f7ef; color: #10b981; }
.mini-stat-card.withdraw .mini-stat-icon { background: #fff7e0; color: #f59e0b; }
.mini-stat-card.pending .mini-stat-icon { background: #fef9c3; color: #f59e0b; }
.mini-stat-card.hold .mini-stat-icon { background: #e0e7ff; color: #2563eb; }
.mini-stat-label {
  font-size: 1.01rem;
  color: #475569;
  font-weight: 500;
}
.mini-stat-value {
  font-size: 1.18rem;
  font-weight: 700;
  /* Mặc định màu xám, sẽ override bằng class */
  color: #888;
}
.currency-positive { color: #10b981 !important; }
.currency-zero { color: #888 !important; }
.user-avatar-upgrade {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(37,99,235,0.10);
}
.avatar-img-upgrade {
  border-radius: 12px;
}
.user-info-upgrade {
  line-height: 1.8;
  font-size: 1.08rem;
  font-weight: 400;
  gap: 10px;
}
.user-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
  font-weight: 500;
}
.user-name-text {
  font-weight: 700;
  font-size: 1.13rem;
  color: #222;
}
.user-status-badge {
  margin-left: 10px;
  font-size: 0.98rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
}
.user-status-badge.active { color: #10b981; background: #e0f7ef; }
.user-status-badge.inactive { color: #ef4444; background: #ffe4e6; }
.user-status-badge.pending { color: #f59e0b; background: #fef9c3; }
.copy-icon {
  margin-left: 6px;
  color: #2563eb;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.copy-icon:hover { opacity: 1; color: #1d4ed8; }
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.18);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Đảm bảo dialog luôn ở giữa màn hình, phủ toàn trang */
}
.modal-content {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(37,99,235,0.13);
  padding: 32px 28px 24px 28px;
  min-width: 320px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
  /* Loại bỏ margin tự động nếu có */
  margin: 0;
  /* Đảm bảo không bị lệch khi co nhỏ màn hình */
  box-sizing: border-box;
}
.form-group { margin-bottom: 12px; }
.form-group label { font-weight: 600; margin-bottom: 4px; display: block; }
.form-group input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #e0e7ef; font-size: 1.08rem; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.pending-withdrawals-section { margin-top: 24px; }
.pending-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
.pending-table th, .pending-table td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
.pending-table th { background: #f3f4f6; font-weight: 700; }
.pending-table tr:last-child td { border-bottom: none; }
.main-content-wrapper {
  display: flex;
  min-height: 80vh;
  background: #f8f9fb;
}
.main-content {
  flex: 1;
  min-width: 0;
  padding: 48px 0;
  margin-left: 240px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
@media (max-width: 900px) {
  .main-content {
    margin-left: 72px;
  }
}
.withdraw-modal {
  min-width: 340px;
  max-width: 98vw;
}
.form-group label {
  font-weight: 600;
  margin-bottom: 4px;
  display: block;
  color: #222;
}
.input-error {
  color: #e53e3e;
  font-size: 0.98rem;
  margin-top: 4px;
  font-weight: 500;
}
.btn {
  padding: 8px 22px;
  border-radius: 10px; /* rounded-md */
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, opacity 0.18s, border 0.18s;
  margin-right: 8px;
  outline: none;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(37,99,235,0.07);
}
.btn-primary:disabled {
  background: #a5b4fc;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.7;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-primary:active:not(:disabled), .btn-primary:focus:not(:disabled) {
  background: #2563eb;
}
.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  filter: brightness(1.08);
}
.btn-primary:active:not(:disabled) {
  background: #1e40af;
}
.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid #fff;
  border-top: 2.5px solid #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
.withdraw-info-tip {
  background: #f3f4f6;
  color: #2563eb;
  font-size: 1.01rem;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 28px;
  font-weight: 500;
  flex-wrap: wrap;
}
.withdraw-info-tip > span, .withdraw-info-tip > b, .withdraw-info-tip > div {
  white-space: nowrap;
}
@media (max-width: 600px) {
  .withdraw-info-tip {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
.amount-label-icon, .email-label-icon {
  margin-right: 4px;
  font-size: 1.1em;
  vertical-align: middle;
}
.fee-tooltip {
  margin-left: 4px;
  color: #f59e0b;
  cursor: pointer;
  font-size: 1.08em;
  vertical-align: middle;
}
.modal-content.withdraw-modal {
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 12px 48px rgba(37,99,235,0.18), 0 2px 12px rgba(0,0,0,0.10);
  padding: 56px 48px 40px 48px;
  min-width: 420px;
  max-width: 98vw;
  width: 520px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: stretch;
  margin: 0;
  box-sizing: border-box;
  position: relative;
  animation: modal-pop 0.18s cubic-bezier(.4,1.4,.6,1) 1;
}
@media (max-width: 700px) {
  .modal-content.withdraw-modal {
    min-width: 0;
    width: 98vw;
    padding: 28px 4vw 24px 4vw;
  }
}
@keyframes modal-pop {
  0% { transform: scale(0.92) translateY(30px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
.withdraw-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 40px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  align-items: flex-start;
}
.withdraw-grid-left {
  min-width: 320px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
}
.withdraw-grid-right {
  min-width: 320px;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.withdraw-modal-static {
  position: static !important;
  box-shadow: 0 6px 32px rgba(37,99,235,0.10), 0 1.5px 6px rgba(0,0,0,0.04);
  margin: 0;
  min-width: 0;
  width: 100%;
  max-width: 480px;
  border-radius: 22px;
  animation: none;
}
@media (max-width: 1100px) {
  .withdraw-grid-layout { grid-template-columns: 1fr; gap: 18px; }
  .withdraw-grid-left, .withdraw-grid-right { max-width: 100%; min-width: 0; }
}
.withdraw-success-msg {
  background: #e0f7ef;
  color: #10b981;
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
}
.pending-approval-tip {
  color: #2563eb;
  font-size: 0.98rem;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.withdraw-admin-tip {
  color: #f59e0b;
  font-size: 0.98rem;
  font-style: italic;
  margin-top: 2px;
  display: inline-block;
  cursor: help;
}
.pending-withdraw-tip {
  color: #e53e3e;
  font-size: 1.01rem;
  margin-top: 10px;
  font-weight: 500;
  background: #fef2f2;
  border-radius: 8px;
  padding: 8px 12px;
}
.input-invalid {
  border: 1.5px solid #e53e3e !important;
  background: #fef2f2;
}
.after-fee-tip {
  color: #10b981;
  font-size: 1.13rem;
  margin-top: 12px;
  font-weight: 700;
  background: #e0f7ef;
  border-radius: 8px;
  padding: 8px 14px;
  display: inline-block;
}
.pending-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0 18px 0;
  color: #888;
  background: #f8fafc;
  border-radius: 12px;
  min-height: 100px;
  margin-top: 8px;
}
.pending-empty-icon {
  font-size: 2.2rem;
  margin-bottom: 8px;
}
.pending-empty-title {
  font-size: 1.13rem;
  font-weight: 700;
  margin-bottom: 2px;
}
.pending-empty-desc {
  font-size: 1.01rem;
  color: #888;
}
.status-badge.completed {
  background: #e6f9ed;
  color: #16a34a;
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-badge.rejected {
  background: #ffeaea;
  color: #ef4444;
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-badge.pending {
  background: #fff7e0;
  color: #f59e0b;
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.custom-withdraw-btn {
  background: #fef9c3;
  color: #b45309;
  font-weight: 600;
  transition: background 0.18s, color 0.18s;
}
.custom-withdraw-btn:hover {
  background: #fde68a;
  color: #a16207;
}
.custom-history-btn {
  background: #dbeafe;
  color: #2563eb;
  font-weight: 600;
  transition: background 0.18s, color 0.18s;
}
.custom-history-btn:hover {
  background: #bfdbfe;
  color: #1d4ed8;
}
.withdraw-fee-tip {
  margin-top: 4px;
  color: #b45309;
  font-size: 0.98rem;
  font-weight: 500;
}
.status-badge.hold {
  background: #e0e7ff;
  color: #6366f1;
  border-radius: 8px;
  padding: 2px 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.hold-tip {
  font-size: 0.95rem;
  color: #6366f1;
  margin-top: 2px;
}
</style>
