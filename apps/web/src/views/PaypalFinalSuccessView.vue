<template>
  <div class="paypal-success">
    <div v-if="loading" class="status-box">
      <div class="paypal-logo enhanced">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" />
      </div>
      <div class="icon loading">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#0070ba" stroke-width="6" opacity="0.2"/><circle cx="32" cy="32" r="28" stroke="#0070ba" stroke-width="6" stroke-dasharray="44 100" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="1s" repeatCount="indefinite"/></circle></svg>
      </div>
      <h2 style="color:#0070BA">Verifying your final payment...</h2>
    </div>
    <div v-else-if="error" class="status-box">
      <div class="paypal-logo enhanced">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" />
      </div>
      <div class="icon fail">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#ff3b30" stroke-width="6" opacity="0.2"/><path d="M22 22L42 42M42 22L22 42" stroke="#ff3b30" stroke-width="6" stroke-linecap="round"/></svg>
      </div>
      <h2 style="color:#ff3b30">Final Payment Failed</h2>
      <p class="error-msg">{{ error }}</p>
      <button class="paypal-btn" @click="goHome">Back to Home</button>
    </div>
    <div v-else class="status-box">
      <div class="paypal-logo enhanced paypal-logo-animated">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" />
      </div>
      <div class="icon success animated-tick" :class="{ 'tick-animate': !loading }">
        <!-- Animated SVG tick -->
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="32" stroke="#0070BA" stroke-width="6" opacity="0.18"/>
          <circle cx="36" cy="36" r="32" stroke="#0070BA" stroke-width="6" opacity="0.5" stroke-dasharray="201" stroke-dashoffset="201">
            <animate attributeName="stroke-dashoffset" from="201" to="0" dur="0.7s" fill="freeze"/>
          </circle>
          <path d="M22 38L33 49L50 27" stroke="#0070BA" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <animate attributeName="stroke-dasharray" from="0 60" to="60 0" dur="0.5s" begin="0.5s" fill="freeze"/>
          </path>
        </svg>
      </div>
      <h2 class="success-title animated-title" v-if="!loading">
        <span class="emoji">🎉</span> Final Payment Successful!
      </h2>
      <div class="thankyou">
        <span v-if="details.amount">
          Your final payment of <strong>{{ details.amount }} {{ details.currency || 'USD' }}</strong> has been processed successfully.
        </span>
        <span v-else>
          Your final payment has been processed successfully.
        </span>
      </div>

      <!-- Transaction Summary for Final Payment -->
      <div class="transaction-summary info-block">
        <h3>Transaction Summary</h3>
        <div class="summary-item">
          <span class="summary-label">Initial Deposit (50%):</span>
          <span class="summary-value">${{ details.depositAmount || '0.00' }}</span>
          <span class="summary-status completed">Completed</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Final Payment (50%):</span>
          <span class="summary-value">${{ details.amount || '0.00' }}</span>
          <span class="summary-status completed">Completed</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item total">
          <span class="summary-label">Total Paid to Translator:</span>
          <span class="summary-value">${{ details.totalAmount || '0.00' }}</span>
          <span class="summary-status completed">100% Complete</span>
        </div>
      </div>

      <div class="details enhanced-details info-block">
        <div class="info-row" v-if="details.orderId">
          <span class="info-icon">📄</span>
          <span class="info-label">Order ID:</span>
          <span class="info-value">{{ details.orderId || 'Unknown' }}</span>
        </div>
        <div class="info-row" v-if="details.amount">
          <span class="info-icon">💵</span>
          <span class="info-label">Final Amount Paid:</span>
          <span class="info-value">${{ details.amount }} {{ details.currency || '' }}</span>
        </div>
        <div class="info-row" v-if="details.requestId">
          <span class="info-icon">📝</span>
          <span class="info-label">Request ID:</span>
          <span class="info-value">#{{ details.requestId }}</span>
        </div>
        <div class="info-row" v-if="details.depositAmount">
          <span class="info-icon">💰</span>
          <span class="info-label">Initial Deposit:</span>
          <span class="info-value">${{ details.depositAmount }}</span>
        </div>
        <div class="info-row" v-if="details.totalAmount">
          <span class="info-icon">🎯</span>
          <span class="info-label">Total for Translator:</span>
          <span class="info-value">${{ details.totalAmount }}</span>
        </div>
      </div>

      <div class="actions nav-actions">
        <button class="paypal-btn home-btn" @click="goHome"><span class="btn-icon">🏠</span> Home</button>
        <button class="paypal-btn outline" v-if="details.requestId" @click="goRequest"><span class="btn-icon">📄</span> View Request</button>
        <button class="paypal-btn outline" @click="goTransactionHistory"><span class="btn-icon">📊</span> Transaction History</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref('');
const details = ref({
  orderId: '',
  amount: '',
  currency: 'USD',
  requestId: '',
  depositAmount: '',
  totalAmount: '',
  payerEmail: '',
  receiver: '',
  description: '',
  projectId: ''
});

onMounted(async () => {
  try {
    // Extract payment details from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);

    details.value = {
      orderId: urlParams.get('token') || urlParams.get('PayerID') || '',
      amount: urlParams.get('amount') || '0.00',
      currency: urlParams.get('currency') || 'USD',
      requestId: urlParams.get('requestId') || '',
      depositAmount: urlParams.get('depositAmount') || '0.00',
      totalAmount: urlParams.get('totalAmount') || '0.00',
      payerEmail: urlParams.get('payerEmail') || '',
      receiver: urlParams.get('receiver') || '',
      description: urlParams.get('description') || '',
      projectId: urlParams.get('projectId') || ''
    };

    console.log('PayPal Final Success - Payment details:', details.value);

    // Simulate loading for better UX
    setTimeout(() => {
      loading.value = false;
    }, 1500);

  } catch (err) {
    console.error('Error processing final payment success:', err);
    error.value = 'Failed to process payment details';
    loading.value = false;
  }
});

function goHome() {
  router.push('/');
}

function goRequest() {
  if (details.value.requestId) {
    router.push(`/requests/${details.value.requestId}`);
  }
}

function goTransactionHistory() {
  router.push('/transactions');
}
</script>

<style scoped>
.paypal-success {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.status-box {
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.paypal-logo {
  margin-bottom: 20px;
  transition: transform 0.3s ease;
}

.paypal-logo img {
  height: 40px;
  width: auto;
}

.paypal-logo-animated {
  animation: logoBounce 0.6s ease-out;
}

@keyframes logoBounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

.icon {
  margin: 20px 0;
  display: inline-block;
}

.icon.loading svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.icon.success {
  opacity: 0;
  animation: fadeInScale 0.5s ease-out 0.3s forwards;
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.success-title {
  opacity: 0;
  animation: slideInUp 0.6s ease-out 0.5s forwards;
  margin-bottom: 15px;
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.emoji {
  font-size: 1.2em;
  margin-right: 8px;
}

.thankyou {
  color: #666;
  margin-bottom: 25px;
  font-size: 16px;
  line-height: 1.5;
}

.thankyou strong {
  color: #0070BA;
  font-weight: 600;
}

.transaction-summary {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  text-align: left;
}

.transaction-summary h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
  text-align: center;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e9ecef;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item.total {
  font-weight: 600;
  color: #0070BA;
  border-top: 2px solid #0070BA;
  padding-top: 15px;
  margin-top: 10px;
}

.summary-label {
  color: #666;
  flex: 1;
}

.summary-value {
  font-weight: 600;
  color: #333;
  margin: 0 20px;
}

.summary-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.summary-status.completed {
  background: #d4edda;
  color: #155724;
}

.summary-divider {
  height: 1px;
  background: #dee2e6;
  margin: 15px 0;
}

.info-block {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  text-align: left;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-icon {
  margin-right: 12px;
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.info-label {
  font-weight: 600;
  color: #555;
  min-width: 120px;
  margin-right: 15px;
}

.info-value {
  color: #333;
  font-weight: 500;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.paypal-btn {
  background: #0070BA;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.paypal-btn:hover {
  background: #005ea6;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 112, 186, 0.3);
}

.paypal-btn.outline {
  background: transparent;
  color: #0070BA;
  border: 2px solid #0070BA;
}

.paypal-btn.outline:hover {
  background: #0070BA;
  color: white;
}

.home-btn {
  background: #28a745;
}

.home-btn:hover {
  background: #218838;
}

.btn-icon {
  font-size: 16px;
}

@media (max-width: 600px) {
  .status-box {
    padding: 30px 20px;
    margin: 20px;
  }

  .actions {
    flex-direction: column;
  }

  .paypal-btn {
    width: 100%;
    justify-content: center;
  }

  .info-label {
    min-width: 100px;
    font-size: 14px;
  }
}
</style>
