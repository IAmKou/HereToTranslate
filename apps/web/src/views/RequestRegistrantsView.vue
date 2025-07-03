<template>
  <div class="registrants-wrapper">
    <Navbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <div class="page-header">
          <button class="back-btn" @click="goBack">
            <i class="pi pi-arrow-left"></i>
          </button>
          <div>
            <h1 class="page-title">Request Registrants</h1>
            <div class="page-desc">List of candidates who have registered for this request.</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-card-title">Registered Candidates</div>
          <div v-if="loading" class="loading">
            <span class="spinner"></span> Loading...
          </div>
          <div v-else-if="registrants.length === 0" class="empty-state">
            <img src="../assets/no-candidates.svg" alt="No candidates" class="empty-img" />
            <div class="empty-title">No candidates have registered yet.</div>
            <div class="empty-desc">Share the request link to invite candidates!</div>
          </div>
          <transition-group name="fade" tag="div" class="candidates-list" v-else>
            <div v-for="user in registrants" :key="user.id" class="candidate-card">
              <Avatar
                :image="user.avatar"
                :label="getInitial(user.fullName || user.username)"
                shape="circle"
                size="xlarge"
                class="candidate-avatar"
              />
              <div class="candidate-info">
                <div class="candidate-name">
                  {{ user.fullName || user.username }}
                  <span v-if="user.verified" class="badge verified">Verified</span>
                </div>
                <div class="candidate-email">
                  <i class="pi pi-envelope"></i>
                  <a :href="`mailto:${user.email}`">{{ user.email }}</a>
                </div>
                <div v-if="user.phone" class="candidate-phone">
                  <i class="pi pi-phone"></i>
                  <a :href="`tel:${user.phone}`">{{ user.phone }}</a>
                </div>
              </div>
              <div class="candidate-actions">
                <Button
                  :label="approvingUser === user.id ? 'Approving...' : 'Approve'"
                  :icon="approvingUser === user.id ? 'pi pi-spinner pi-spin' : 'pi pi-check'"
                  :disabled="approvingUser !== null"
                  class="approve-btn"
                  @click="approveRegistrant(user.id)"
                />
              </div>
            </div>
          </transition-group>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import Sidebar from '../components/Sidebar.vue';
import Footer from '../components/AppFooter.vue';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import axiosInstance from '../api';
import { authService } from '../services/auth.service';

interface UserInfo {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
}

const route = useRoute();
const router = useRouter();
const registrants = ref<UserInfo[]>([]);
const loading = ref(false);
const approvingUser = ref<number | null>(null);

function getInitial(name: string | undefined) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function goBack() {
  router.back();
}

async function approveRegistrant(userId: number) {
  if (approvingUser.value !== null) return;

  approvingUser.value = userId;
  try {
    const requestId = route.params.requestId;
    const response = await axiosInstance.post(`/requests/${requestId}/approve/${userId}`);

    if (response.data && response.data.approvalUrl) {
      // Mở link PayPal trong tab mới
      window.open(response.data.approvalUrl, '_blank');

      // Hiển thị thông báo thành công
      alert('Registrant approved successfully! PayPal payment link has been opened.');

      // Có thể redirect về trang request detail hoặc refresh danh sách
      router.push(`/requests/${requestId}/detail`);
    }
  } catch (error: any) {
    console.error('Error approving registrant:', error);
    const errorMessage = error.response?.data?.message || 'Failed to approve registrant';
    alert(`Error: ${errorMessage}`);
  } finally {
    approvingUser.value = null;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const user = await authService.getCurrentUser();
    const requestId = route.params.requestId;
    const res = await axiosInstance.get(`/requests/${requestId}/registrants`);
    if (Array.isArray(res.data)) {
      registrants.value = res.data;
    } else if (res.data && Array.isArray(res.data.registrants)) {
      registrants.value = res.data.registrants;
    } else if (res.data && Array.isArray(res.data.data)) {
      registrants.value = res.data.data;
    } else {
      registrants.value = [];
    }
  } catch (e) {
    registrants.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.registrants-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9f9fb;
}
.main-content {
  flex: 1;
  display: flex;
  margin-left: 220px;
}
.content {
  flex: 1;
  padding: 32px 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 32px;
  margin-top: 12px;
  min-width: 320px;
  width: 100%;
  max-width: 900px;
}
.info-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(59,130,246,0.08);
  padding: 48px 32px 32px 32px;
  margin-bottom: 0;
  max-width: 600px;
  width: 100%;
  min-width: 340px;
  align-self: flex-start;
}
.info-card-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 28px;
  text-align: center;
}
.loading {
  font-size: 16px;
  color: #64748b;
  margin: 40px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spinner {
  border: 3px solid #e0e7ff;
  border-top: 3px solid #2563eb;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 10px;
  vertical-align: middle;
}
@keyframes spin {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #64748b;
  font-size: 16px;
  margin: 40px 0;
}
.empty-img {
  width: 120px;
  margin-bottom: 16px;
  opacity: 0.7;
}
.empty-title {
  font-weight: 700;
  font-size: 18px;
  margin-bottom: 6px;
}
.empty-desc {
  font-size: 15px;
  color: #94a3b8;
}
.candidates-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
  margin-bottom: 24px;
  align-items: center;
  justify-content: center;
}
.candidate-card {
  display: flex;
  align-items: center;
  gap: 24px;
  background: #f4f7fe;
  border-radius: 16px;
  padding: 22px 32px;
  box-shadow: 0 2px 12px rgba(59,130,246,0.10);
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
  min-width: 340px;
  max-width: 520px;
  width: 100%;
}
.candidate-card:hover {
  transform: translateY(-4px) scale(1.03);
  background: #e0e7ff;
  box-shadow: 0 8px 32px rgba(59,130,246,0.18);
}
.candidate-avatar {
  width: 72px;
  height: 72px;
  font-size: 32px;
  border: 3px solid #2563eb;
  background: #e0e7ff;
  color: #2563eb;
}
.candidate-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.candidate-name {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge.verified {
  background: #22c55e;
  color: #fff;
  font-size: 12px;
  border-radius: 8px;
  padding: 2px 8px;
  margin-left: 8px;
  vertical-align: middle;
}
.candidate-email, .candidate-phone {
  font-size: 15px;
  color: #2563eb;
  display: flex;
  align-items: center;
  gap: 8px;
}
.candidate-email i, .candidate-phone i {
  color: #64748b;
}
.candidate-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.approve-btn {
  background: #22c55e !important;
  border: none !important;
  color: white !important;
  padding: 8px 16px !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  transition: all 0.2s !important;
  min-width: 100px !important;
}
.approve-btn:hover:not(:disabled) {
  background: #16a34a !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
}
.approve-btn:disabled {
  background: #94a3b8 !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow: none !important;
}
.page-title {
  font-size: 28px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}
.page-desc {
  font-size: 15px;
  color: #64748b;
  margin-top: 4px;
}
.back-btn {
  position: static;
  background: #f1f5f9;
  color: #2563eb;
  border: none;
  border-radius: 50px;
  padding: 8px 18px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.back-btn:hover {
  background: #2563eb;
  color: #fff;
}
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
@media (max-width: 900px) {
  .content {
    align-items: stretch;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 100vw;
  }
  .info-card {
    max-width: 98vw;
    min-width: unset;
    padding: 32px 8px 24px 8px;
  }
  .candidate-card {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 24px 20px;
  }
  .candidate-actions {
    width: 100%;
    justify-content: center;
  }
  .approve-btn {
    width: 100%;
    max-width: 200px;
  }
}
</style>
