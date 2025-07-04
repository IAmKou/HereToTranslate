<template>
  <div class="paypal-success">
    <div v-if="loading" class="status-box">
      <div class="paypal-logo">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" style="height:64px;" />
      </div>
      <div class="icon loading">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#0070ba" stroke-width="6" opacity="0.2"/><circle cx="32" cy="32" r="28" stroke="#0070ba" stroke-width="6" stroke-dasharray="44 100" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="1s" repeatCount="indefinite"/></circle></svg>
      </div>
      <h2>Verifying your payment...</h2>
    </div>
    <div v-else-if="error" class="status-box">
      <div class="paypal-logo">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" style="height:64px;" />
      </div>
      <div class="icon fail">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#ff3b30" stroke-width="6" opacity="0.2"/><path d="M22 22L42 42M42 22L22 42" stroke="#ff3b30" stroke-width="6" stroke-linecap="round"/></svg>
      </div>
      <h2>Payment Failed</h2>
      <p class="error-msg">{{ error }}</p>
      <button class="paypal-btn" @click="goHome">Back to Home</button>
    </div>
    <div v-else class="status-box">
      <div class="paypal-logo">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" style="height:64px;" />
      </div>
      <div class="icon success">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#12b347" stroke-width="6" opacity="0.2"/><path d="M20 34L29 43L44 25" stroke="#12b347" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h2>Payment Successful!</h2>
      <div class="thankyou">Thank you for your payment!</div>
      <div class="details">
        <div class="row"><span>Order ID:</span><span>{{ details.orderId || 'Unknown' }}</span></div>
        <div class="row" v-if="details.amount"><span>Amount:</span><span>{{ details.amount }} {{ details.currency || '' }}</span></div>
        <div class="row" v-if="details.payerEmail"><span>Payer Email:</span><span>{{ details.payerEmail }}</span></div>
        <div class="row" v-if="details.receiver"><span>Receiver:</span><span>{{ details.receiver }}</span></div>
        <div class="row" v-if="details.description"><span>Description:</span><span>{{ details.description }}</span></div>
        <div class="row" v-if="details.requestId"><span>Request ID:</span><span>{{ details.requestId }}</span></div>
        <div class="row" v-if="details.projectId"><span>Project ID:</span><span>{{ details.projectId }}</span></div>
      </div>
      <div class="actions">
        <button class="paypal-btn" @click="goHome">Back to Home</button>
        <button class="paypal-btn outline" v-if="details.requestId" @click="goRequest">View Request</button>
        <button class="paypal-btn outline" v-if="details.projectId" @click="goProject">View Project</button>
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
  if (details.value.requestId) {
    router.push({ name: 'request-detail', params: { requestId: details.value.requestId } });
  }
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
    console.log('Paypal capture response:', res.data);
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
}
.paypal-logo {
  margin-bottom: 18px;
  margin-top: -10px;
}
.icon {
  margin-bottom: 18px;
}
.icon.success svg {
  display: block;
}
.icon.fail svg {
  display: block;
}
.icon.loading svg {
  display: block;
}
h2 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: #222;
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
.details {
  width: 100%;
  margin: 10px 0 10px 0;
  background: #f6fafd;
  border-radius: 10px;
  padding: 18px 20px;
  font-size: 1rem;
  font-weight: 400;
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
  box-shadow: 0 2px 8px 0 rgba(0,112,186,0.08);
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
</style>
