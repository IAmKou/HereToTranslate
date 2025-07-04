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
    const res = await axiosInstance.post('/payment/paypal/capture', { orderId });
    // Ưu tiên redirect về trang chi tiết request nếu có
    if (res.data && res.data.requestId) {
      router.push({ name: 'request-detail', params: { requestId: res.data.requestId } });
    } else if (res.data && res.data.projectId) {
      router.push(`/projects/${res.data.projectId}`);
    } else {
      alert('Thanh toán thành công!');
      router.push('/');
    }
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
