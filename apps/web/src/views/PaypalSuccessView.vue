<template>
  <div class="paypal-success">
    <div v-if="loading" class="status-box">
      <div class="paypal-logo enhanced">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" />
      </div>
      <div class="icon loading">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#0070ba" stroke-width="6" opacity="0.2"/><circle cx="32" cy="32" r="28" stroke="#0070ba" stroke-width="6" stroke-dasharray="44 100" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="1s" repeatCount="indefinite"/></circle></svg>
      </div>
      <h2 style="color:#0070BA">Verifying your payment...</h2>
    </div>
    <div v-else-if="error" class="status-box">
      <div class="paypal-logo enhanced">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" />
      </div>
      <div class="icon fail">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#ff3b30" stroke-width="6" opacity="0.2"/><path d="M22 22L42 42M42 22L22 42" stroke="#ff3b30" stroke-width="6" stroke-linecap="round"/></svg>
      </div>
      <h2 style="color:#ff3b30">Payment Failed</h2>
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
        <span class="emoji">🎉</span> Payment Successful!
      </h2>
      <div class="thankyou">
        <span v-if="details.amount">
          Your payment of <strong>{{ details.amount }} {{ details.currency || 'USD' }}</strong> has been processed successfully.
        </span>
        <span v-else>
          Your payment has been processed successfully.
        </span>
      </div>
      <div class="details enhanced-details info-block">
        <div class="info-row" v-if="details.orderId">
          <span class="info-icon">📄</span>
          <span class="info-label">Order ID:</span>
          <span class="info-value">{{ details.orderId || 'Unknown' }}</span>
        </div>
        <div class="info-row" v-if="details.amount">
          <span class="info-icon">💵</span>
          <span class="info-label">Amount Paid:</span>
          <span class="info-value">${{ details.amount }} {{ details.currency || '' }}</span>
        </div>
        <div class="info-row" v-if="details.payerEmail">
          <span class="info-icon">📧</span>
          <span class="info-label">Payer Email:</span>
          <span class="info-value">{{ details.payerEmail }}</span>
        </div>
        <div class="info-row" v-if="details.receiver">
          <span class="info-icon">👤</span>
          <span class="info-label">Receiver:</span>
          <span class="info-value">{{ details.receiver }}</span>
        </div>
        <div class="info-row" v-if="details.description">
          <span class="info-icon">📝</span>
          <span class="info-label">Description:</span>
          <span class="info-value">{{ details.description }}</span>
        </div>
        <div class="info-row" v-if="details.requestId">
          <span class="info-icon">📝</span>
          <span class="info-label">Request ID:</span>
          <span class="info-value">#{{ details.requestId }}</span>
        </div>
        <div class="info-row" v-if="details.projectId">
          <span class="info-icon">📁</span>
          <span class="info-label">Project ID:</span>
          <span class="info-value">#{{ details.projectId }}</span>
        </div>
      </div>
      <div class="actions nav-actions">
        <button class="paypal-btn home-btn" @click="goHome"><span class="btn-icon">🏠</span> Home</button>
        <button class="paypal-btn outline" v-if="details.requestId" @click="goRequest"><span class="btn-icon">📄</span> View Request</button>
        <button class="paypal-btn outline" v-if="details.projectId" @click="goProject"><span class="btn-icon">📁</span> View Project</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '../api';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref('');
const details = ref<any>({});

function goHome() {
  router.push('/userhome');
}
function goRequest() {
  router.push('/myrequests');
}
function goProject() {
  if (details.value.projectId) {
    router.push(`/projects/${details.value.projectId}`);
  }
}

onMounted(async () => {
  const orderId = route.query.token;
  if (!orderId) {
    error.value = 'Order ID not found!';
    loading.value = false;
    return;
  }
  try {
    const res = await axiosInstance.post('/payment/paypal/capture', { orderId });
    details.value = { ...res.data, orderId };
    loading.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'An error occurred while verifying payment!';
    loading.value = false;
  }
});
</script>

<style scoped>
.paypal-success {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7fafd;
}
.status-box {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.08);
  padding: 40px 36px 32px 36px;
  min-width: 340px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2.5px solid #0070BA22;
}
.paypal-logo.enhanced {
  margin-bottom: 18px;
  margin-top: -10px;
  padding: 10px 18px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 24px 0 #0070ba44, 0 2px 8px 0 #0070ba22;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s, transform 0.2s;
}
.paypal-logo-animated:hover {
  box-shadow: 0 8px 32px 0 #0070ba66, 0 2px 8px 0 #0070ba22;
  transform: scale(1.05);
}
.paypal-logo.enhanced img {
  height: 64px;
  border-radius: 8px;
  background: #fff;
}
.icon {
  margin-bottom: 18px;
}
.animated-tick {
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.5s cubic-bezier(.4,1.4,.6,1), transform 0.5s cubic-bezier(.4,1.4,.6,1);
}
.tick-animate {
  opacity: 1;
  transform: scale(1);
}
.animated-title {
  opacity: 0;
  transform: translateY(-24px);
  transition: opacity 0.7s cubic-bezier(.4,1.4,.6,1), transform 0.7s cubic-bezier(.4,1.4,.6,1);
}
.animated-title[style*="display: none"] {
  opacity: 0 !important;
}
.status-box .animated-title {
  opacity: 1;
  transform: translateY(0);
  animation: fadeSlideIn 0.7s 0.3s cubic-bezier(.4,1.4,.6,1) both;
}
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(-24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.success-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: #0070BA;
  display: flex;
  align-items: center;
  gap: 8px;
}
.success-title .emoji {
  font-size: 1.5rem;
  margin-right: 4px;
}
.thankyou {
  font-size: 1.1rem;
  color: #0070ba;
  margin-bottom: 10px;
  font-weight: 500;
}
.amount-box {
  margin: 10px 0 18px 0;
  background: #f6fafd;
  border-radius: 10px;
  padding: 12px 32px;
  font-size: 2rem;
  font-weight: 700;
  color: #003087;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px 0 rgba(0,112,186,0.06);
}
.amount-box .currency {
  font-size: 1.2rem;
  font-weight: 500;
  color: #009cde;
  margin-left: 4px;
}
.details.enhanced-details {
  width: 100%;
  margin: 10px 0 10px 0;
  background: #f6fafd;
  border-radius: 10px;
  padding: 18px 20px;
  font-size: 1rem;
  font-weight: 400;
  border: 1.5px solid #0070BA22;
  box-shadow: 0 2px 8px 0 #0070ba11;
}
.details .row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.details .row:last-child {
  margin-bottom: 0;
}
.actions {
  display: flex;
  gap: 16px;
  margin-top: 18px;
}
.paypal-btn {
  font-size: 1rem;
  padding: 10px 28px;
  border-radius: 6px;
  border: none;
  background: #0070ba;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 2px 8px 0 #0070ba22;
  transition: background 0.2s, color 0.2s;
}
.paypal-btn.outline {
  background: #fff;
  color: #0070ba;
  border: 2px solid #0070ba;
}
.paypal-btn:hover {
  background: #005c99;
  color: #fff;
}
.paypal-btn.outline:hover {
  background: #e6f0fa;
  color: #005c99;
}
.error-msg {
  color: #ff3b30;
  margin: 8px 0 0 0;
  font-size: 1rem;
  font-weight: 500;
}
.info-block {
  background: #f8fafc;
  border-radius: 10px;
  box-shadow: 0 2px 8px 0 #0070ba11;
  padding: 20px 22px;
  margin: 12px 0 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.04rem;
  padding: 6px 0;
  border-bottom: 1px solid #e5e7eb;
}
.info-row:last-child {
  border-bottom: none;
}
.info-icon {
  font-size: 1.18rem;
  width: 1.7em;
  text-align: center;
  opacity: 0.85;
}
.info-label {
  font-weight: 600;
  color: #374151;
  min-width: 110px;
}
.info-value {
  color: #222;
  font-weight: 500;
  word-break: break-all;
}
.nav-actions {
  display: flex;
  gap: 24px;
  margin-top: 18px;
  justify-content: center;
  flex-wrap: wrap;
}
.paypal-btn, .paypal-btn.outline {
  padding-left: 24px;
  padding-right: 24px;
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1.08rem;
  transition: all 0.18s cubic-bezier(.4,1.4,.6,1);
}
.paypal-btn:hover {
  background: #0056b3;
  color: #fff;
  box-shadow: 0 2px 8px 0 #0070ba33;
}
.paypal-btn.outline {
  background: #fff;
  color: #0070ba;
  border: 2px solid #0070ba;
}
.paypal-btn.outline:hover {
  background: #0070ba;
  color: #fff;
  border-color: #0056b3;
}
.home-btn {
  background: linear-gradient(135deg, #0070ba 0%, #009cde 100%);
  box-shadow: 0 4px 16px 0 #0070ba33;
}
.home-btn:hover {
  background: linear-gradient(135deg, #0056b3 0%, #0070ba 100%);
  box-shadow: 0 6px 20px 0 #0070ba44;
  transform: translateY(-1px);
}
.btn-icon {
  font-size: 1.18em;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
}
</style>
