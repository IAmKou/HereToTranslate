<template>
  <div class="paypal-success">
    <h2>Đang xác nhận thanh toán...</h2>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '../api';

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const orderId = route.query.token;
  if (!orderId) {
    alert('Không tìm thấy mã giao dịch!');
    router.push('/');
    return;
  }
  try {
    await axiosInstance.post('/paypal/capture', { orderId });
    alert('Thanh toán thành công!');
    router.push('/projects');
  } catch (e) {
    alert('Có lỗi khi xác nhận thanh toán!');
    router.push('/');
  }
});
</script>

<style scoped>
.paypal-success {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
}
</style>
