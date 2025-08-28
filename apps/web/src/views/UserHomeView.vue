<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import { ref, onMounted, computed } from 'vue';
import { UserProfile } from '../services/user.service';
import axiosInstance from '../api';
import axios from 'axios'; // Thêm import axios trực tiếp

// Sidebar state
const sidebarCollapsed = ref(false);

// Interfaces
interface Project {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  tags?: Array<{ id: string; name: string }>;
  status?: string;
}

interface Wallet {
  id: number | string;
  balance: number;
  totalDeposits: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  holdAmount: number;
  user?: {
    fullName?: string;
    username?: string;
    email?: string;
    phone?: string;
    status?: string;
    avatar?: string;
  };
  latestTransaction?: {
    id: number;
    type: 'Deposit' | 'Withdrawal' | 'Transfer';
    amount: number;
    status: 'Pending' | 'Completed' | 'Failed' | 'HOLD' | 'WAITING_APPROVAL' | 'IN_PROGRESS';
    createdAt: string;
  };
}

interface RecentActivity {
  id: string;
  type: 'project_created' | 'project_updated' | 'request_created' | 'payment_received' | 'task_completed';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

const user = ref<UserProfile | null>(null);
const wallet = ref<Wallet | null>(null);
const isLoadingUser = ref(false);
const isLoadingWallet = ref(false);
const projects = ref<Project[]>([]);
const isLoadingProjects = ref(false);
const projectsError = ref<string | null>(null);
const recentActivities = ref<RecentActivity[]>([]);

const fetchUserData = async () => {
  try {
    isLoadingUser.value = true;
    const { data } = await axiosInstance.get('/auth/me');
    user.value = data;
  } catch (error) {
    console.error('Error fetching user data:', error);
  } finally {
    isLoadingUser.value = false;
  }
};

const fetchWalletData = async () => {
  try {
    isLoadingWallet.value = true;
    // Sử dụng axios trực tiếp như WalletView
    const res = await axios.get('/api/wallet');
    wallet.value = res.data;
    console.log('Wallet data fetched successfully:', res.data);
  } catch (error: any) {
    console.error('Error fetching wallet data:', error);
    console.error('Error response:', error?.response?.data);
    console.error('Error status:', error?.response?.status);
    // Don't set mock data, let it be null
    wallet.value = null;
  } finally {
    isLoadingWallet.value = false;
  }
};

const fetchProjects = async () => {
  try {
    isLoadingProjects.value = true;
    projectsError.value = null;

    // Fetch both projects and requests data
    const [projectsResponse, requestsResponse] = await Promise.all([
      axiosInstance.get('/projects/me/projects'),
      axiosInstance.get('/requests/myRegistrations')
    ]);

    const projectsData = projectsResponse.data || [];
    const requestsData = requestsResponse.data || [];

    // Create a map of request data by title for easy lookup
    const requestsMap = new Map();
    requestsData.forEach((req: any) => {
      requestsMap.set(req.title, req);
    });

    // Merge projects with request status data
    const mergedProjects = projectsData.map((project: any) => {
      const requestData = requestsMap.get(project.name);
      if (requestData) {
        return {
          ...project,
          status: requestData.status || requestData.registrationStatus || project.status
        };
      }
      return project;
    });

    projects.value = mergedProjects;
  } catch (err: any) {
    projectsError.value = 'Failed to load your projects.';
    console.error('Error fetching projects:', err);
  } finally {
    isLoadingProjects.value = false;
  }
};

// Fetch recent activities from API
const fetchRecentActivities = async () => {
  try {
    // TODO: Replace with real API endpoint when available
    // const { data } = await axiosInstance.get('/activities/recent');
    // recentActivities.value = data;

    // For now, fetch from projects to show recent project activities
    if (projects.value.length > 0) {
      const projectActivities: RecentActivity[] = projects.value.slice(0, 3).map((project, index) => ({
        id: `project-${project.id}`,
        type: 'project_created' as const,
        title: 'Project Created',
        description: `Project "${project.name}" was created`,
        timestamp: project.createdAt,
        icon: 'pi pi-folder-plus',
        color: '#10B981'
      }));
      recentActivities.value = projectActivities;
    } else {
      recentActivities.value = [];
    }
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    recentActivities.value = [];
  }
};

// Computed properties for stats
const inProgressProjects = computed(() => {
  return projects.value.filter((p: Project) => {
    // Consider a project "in progress" if:
    // 1. Status is 'in_progress' or 'incompleted' (ongoing work)
    // 2. No status (fallback for backward compatibility)
    // 3. Any status that indicates active work
    const status = p.status?.toLowerCase();
    return status === 'in_progress' ||
      status === 'incompleted' ||
      status === 'approved' ||
      !status;
  }).length;
});

const completedProjects = computed(() => {
  return projects.value.filter((p: Project) => {
    const status = p.status?.toLowerCase();
    return status === 'completed';
  }).length;
});

const totalProjects = computed(() => {
  return projects.value.length;
});

// Filter projects to only show "Incompleted" and "Completed" statuses
const filteredProjects = computed(() => {
  return projects.value.filter((project: Project) => {
    const status = project.status?.toLowerCase();
    return status === 'incompleted' || status === 'completed';
  });
});

const pendingRequests = computed(() => {
  // TODO: Fetch from API when available
  // const { data } = await axiosInstance.get('/requests/pending');
  // return data.length;
  return 0;
});

// Sửa lại totalEarnings để chính xác hơn
const totalEarnings = computed(() => {
  // Total Earnings = Tổng thu nhập từ dự án hoàn thành
  // Giả sử user đã hoàn thành một số dự án và kiếm được tiền
  if (!wallet.value) return 0;
  // Nếu balance là $67 và withdrawn là $0, có thể total earnings là $67
  // Nhưng để thực tế hơn, có thể là balance + một số tiền đã rút trước đó
  return (wallet.value.balance || 0) + (wallet.value.totalWithdrawn || 0);
});

// Thêm computed property cho total deposits (tiền đã nạp vào hệ thống)
const totalDeposits = computed(() => {
  if (!wallet.value) return 0;
  // Total Deposits = Balance + Withdrawn (tổng tiền đã có trong hệ thống)
  return (wallet.value.balance || 0) + (wallet.value.totalWithdrawn || 0);
});

// Format date helper
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Get time ago helper
const getTimeAgo = (date: string) => {
  const now = new Date();
  const projectDate = new Date(date);
  const diffInMs = now.getTime() - projectDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Helper to get project status class
const getProjectStatusClass = (status?: string) => {
  if (!status) return 'in-progress'; // Default to in-progress if no status
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'completed':
      return 'completed';
    case 'in_progress':
    case 'incompleted':
      return 'in-progress';
    case 'pending':
      return 'pending';
    case 'cancelled':
      return 'cancelled';
    case 'rejected':
      return 'rejected';
    default:
      return 'in-progress'; // Default to in-progress for unknown statuses
  }
};

// Helper to format project status
const formatProjectStatus = (status?: string) => {
  if (!status) return 'In Progress'; // Default to In Progress if no status
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'incompleted':
      return 'Incompleted';
    case 'pending':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    case 'rejected':
      return 'Rejected';
    default:
      return 'In Progress'; // Default to In Progress for unknown statuses
  }
};

onMounted(async () => {
  console.log('UserHomeView mounted, starting to fetch data...');

  try {
    // Fetch user data first
    await fetchUserData();
    console.log('User data fetched:', user.value);

    // Then fetch wallet data
    await fetchWalletData();
    console.log('Wallet data fetched:', wallet.value);

    // Then fetch projects
    await fetchProjects();
    console.log('Projects data fetched:', projects.value);

    // Finally fetch activities
    await fetchRecentActivities();
    console.log('Recent activities fetched:', recentActivities.value);

    console.log('All data fetched successfully');
  } catch (error) {
    console.error('Error in onMounted:', error);
  }
});
</script>

<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <TopNavbar />
    <div class="main-content">
      <Sidebar :collapsed="sidebarCollapsed" @update:collapsed="sidebarCollapsed = $event" />
      <div class="content">
        <main class="userhome-main">
          <!-- Enhanced Header -->
          <div class="dashboard-header">
            <div class="header-content">
              <div class="header-left">
                <div class="icon-circle">
                  <div class="icon-inner">
                    <i class="pi pi-home header-icon" />
                  </div>
                  <div class="icon"></div>
                </div>
                <div class="header-text">
                  <h1 class="dashboard-title">Dashboard</h1>
                  <div class="header-greeting">
                    <span class="greeting-emoji">👋</span>
                    <span class="greeting-text">
                      Welcome back, <span class="greeting-name">{{ user?.fullName || user?.username }}</span>!
                    </span>
                  </div>
                </div>
              </div>
              <div class="header-actions">
                <router-link to="/projects/create" class="btn btn-primary">
                  <i class="pi pi-plus"></i>
                  New Project
                </router-link>
                <router-link to="/requests/create" class="btn btn-secondary">
                  <i class="pi pi-file-plus"></i>
                  New Request
                </router-link>
              </div>
            </div>
          </div>

          <!-- Quick Stats Cards -->
          <div class="stats-grid">
            <div class="stat-card stat-primary">
              <div class="stat-icon">
                <i class="pi pi-folder"></i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ totalProjects }}</div>
                <div class="stat-label">Total Projects</div>
              </div>
            </div>

            <div class="stat-card stat-success">
              <div class="stat-icon">
                <i class="pi pi-check-circle"></i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ completedProjects }}</div>
                <div class="stat-label">Completed</div>
              </div>
            </div>

            <div class="stat-card stat-warning">
              <div class="stat-icon">
                <i class="pi pi-clock"></i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ inProgressProjects }}</div>
                <div class="stat-label">In Progress</div>
              </div>
            </div>

            <div class="stat-card stat-info">
              <div class="stat-icon">
                <i class="pi pi-wallet"></i>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ formatCurrency(wallet?.balance || 0) }}</div>
                <div class="stat-label">Balance</div>
              </div>
            </div>
          </div>

          <!-- Main Content Grid -->
          <div class="dashboard-grid">
            <!-- Left Column -->
            <div class="dashboard-left">
              <!-- Recent Projects -->
              <div class="dashboard-section">
                <div class="section-header">
                  <h3 class="section-title">
                    <i class="pi pi-folder section-icon"></i>
                    Recent Projects
                  </h3>
                  <router-link to="/projects" class="section-link">
                    View All <i class="pi pi-arrow-right"></i>
                  </router-link>
                </div>

                <div class="section-content">
                  <!-- Loading State -->
                  <div v-if="isLoadingProjects" class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading projects...</p>
                  </div>

                  <!-- Error State -->
                  <div v-else-if="projectsError" class="error-container">
                    <div class="error-content">
                      <div class="error-icon">
                        <i class="pi pi-exclamation-triangle"></i>
                      </div>
                      <p>{{ projectsError }}</p>
                      <button @click="fetchProjects" class="btn btn-secondary">Try Again</button>
                    </div>
                  </div>

                  <!-- Empty State -->
                  <div v-else-if="filteredProjects.length === 0" class="empty-container">
                    <div class="empty-content">
                      <div class="empty-icon">
                        <i class="pi pi-folder-open"></i>
                      </div>
                      <h4>No projects with Incompleted or Completed status</h4>
                      <p>Only projects with Incompleted or Completed status are shown here</p>
                      <router-link to="/projects/create" class="btn btn-primary">
                        <i class="pi pi-plus"></i>
                        Create Project
                      </router-link>
                    </div>
                  </div>

                  <!-- Projects List -->
                  <div v-else class="projects-list">
                    <div
                      v-for="project in filteredProjects.slice(0, 5)"
                      :key="project.id"
                      class="project-item"
                      @click="() => window.location.href = `/projects/${project.id}`"
                    >
                      <div class="project-info">
                        <div class="project-name">
                          <i class="pi pi-folder project-icon"></i>
                          <span>{{ project.name }}</span>
                          <i v-if="!project.isPrivate" class="pi pi-lock project-lock" title="Public Project"></i>
                        </div>
                        <div class="project-meta">
                          <span class="project-date">{{ formatDate(project.createdAt) }}</span>
                          <span class="project-author">by {{ project.createdBy.fullName || project.createdBy.username }}</span>
                        </div>
                      </div>
                      <div class="project-status">
                         <span class="status-badge" :class="getProjectStatusClass(project.status)">
                           {{ formatProjectStatus(project.status) }}
                         </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Recent Activities -->
              <div class="dashboard-section">
                <div class="section-header">
                  <h3 class="section-title">
                    <i class="pi pi-clock section-icon"></i>
                    Recent Activities
                  </h3>
                </div>
                <div class="section-content">
                  <!-- Loading State -->
                  <div v-if="isLoadingProjects" class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading activities...</p>
                  </div>

                  <!-- Empty State -->
                  <div v-else-if="recentActivities.length === 0" class="empty-container">
                    <div class="empty-content">
                      <div class="empty-icon">
                        <i class="pi pi-clock"></i>
                      </div>
                      <h4>No recent activities</h4>
                      <p>Your recent activities will appear here</p>
                    </div>
                  </div>

                  <!-- Activities List -->
                  <div v-else class="activities-list">
                    <div
                      v-for="activity in recentActivities"
                      :key="activity.id"
                      class="activity-item"
                    >
                      <div class="activity-icon" :style="{ backgroundColor: activity.color + '20' }">
                        <i :class="activity.icon" :style="{ color: activity.color }"></i>
                      </div>
                      <div class="activity-content">
                        <div class="activity-title">{{ activity.title }}</div>
                        <div class="activity-description">{{ activity.description }}</div>
                        <div class="activity-time">{{ getTimeAgo(activity.timestamp) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column -->
            <div class="dashboard-right">
              <!-- Wallet Summary -->
              <div class="dashboard-section wallet-section">
                <div class="section-header">
                  <h3 class="section-title">
                    <i class="pi pi-wallet section-icon"></i>
                    Financial Summary
                  </h3>
                  <router-link to="/wallet" class="section-link">
                    View Details <i class="pi pi-arrow-right"></i>
                  </router-link>
                </div>
                <div class="section-content">
                  <div v-if="isLoadingWallet" class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading wallet...</p>
                  </div>
                  <div v-else-if="wallet" class="wallet-summary">
                    <!-- Current Balance -->
                    <div class="wallet-balance">
                      <div class="balance-label">Current Balance</div>
                      <div class="balance-amount">{{ formatCurrency(wallet.balance) }}</div>
                    </div>

                    <!-- Financial Stats -->
                    <div class="wallet-stats">
                      <div class="wallet-stat">
                        <span class="stat-label">Total Deposits</span>
                        <span class="stat-value">{{ formatCurrency(totalDeposits) }}</span>
                      </div>
                      <div class="wallet-stat">
                        <span class="stat-label">Total Withdrawn</span>
                        <span class="stat-value">{{ formatCurrency(wallet.totalWithdrawn) }}</span>
                      </div>
                      <div v-if="wallet.pendingWithdrawals > 0" class="wallet-stat">
                        <span class="stat-label">Pending Withdrawals</span>
                        <span class="stat-value earnings-warning">{{ formatCurrency(wallet.pendingWithdrawals) }}</span>
                      </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="wallet-actions">
                      <router-link to="/wallet" class="btn btn-outline">
                        <i class="pi pi-eye"></i>
                        View Details
                      </router-link>
                    </div>
                  </div>
                  <div v-else class="empty-container">
                    <p>No wallet information available</p>
                    <!-- Debug info -->
                    <div v-if="!isLoadingWallet" class="debug-info" style="margin-top: 10px; font-size: 12px; color: #666;">
                      <p>Debug: Wallet data is null</p>
                      <p>Check console for error details</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
    <Footer />
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  min-width: 0;
  padding-left: 240px;
  transition: padding-left 0.2s cubic-bezier(.4,0,.2,1);
}

.layout-wrapper.sidebar-collapsed .main-content {
  padding-left: 72px;
}

.content {
  flex: 1;
  padding: 20px;
  min-width: 0;
}

.userhome-main {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #fff;
  max-width: 1400px;
  margin: 0 auto;
}

/* Dashboard Header */
.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-circle {
  position: relative;
  width: 80px;
  height: 80px;
}

.icon-inner {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.header-icon {
  font-size: 2.5rem;
  color: white;
}

.icon {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.header-text {
  flex: 1;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  color: white;
}

.header-greeting {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.2rem;
  opacity: 0.9;
}

.greeting-emoji {
  font-size: 1.5rem;
}

.greeting-name {
  font-weight: 600;
  color: #fbbf24;
}

.header-actions {
  display: flex;
  gap: 16px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: white;
}

.stat-primary .stat-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-success .stat-icon { background: linear-gradient(135deg, #10b981, #059669); }
.stat-warning .stat-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
.stat-info .stat-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 8px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #10b981;
  font-weight: 500;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.dashboard-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-icon {
  color: #6b7280;
}

.section-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s;
}

.section-link:hover {
  color: #2563eb;
}

.section-content {
  padding: 24px;
}

/* Projects List */
.projects-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #f3f4f6;
  transition: all 0.2s;
  cursor: pointer;
}

.project-item:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
  transform: translateX(4px);
}

.project-info {
  flex: 1;
}

.project-name {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.project-icon {
  color: #6b7280;
  font-size: 1.1rem;
}

.project-lock {
  color: #6b7280;
  font-size: 0.9rem;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  color: #6b7280;
}

.project-date {
  font-weight: 500;
}

.project-author {
  opacity: 0.8;
}

.project-status {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.in-progress {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.completed {
  background: #d1fae5;
  color: #059669;
}

.status-badge.pending {
  background: #e0e7ff;
  color: #4f46e5;
}

/* Wallet Section */
.wallet-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.wallet-summary {
  text-align: center;
}

.wallet-balance {
  margin-bottom: 24px;
}

.balance-label {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
}

.wallet-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.wallet-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.stat-label {
  font-size: 0.85rem;
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
  color: #1f2937;
}

/* Thêm styles cho earnings */
.earnings-positive {
  color: #059669 !important;
}

.earnings-negative {
  color: #dc2626 !important;
}

.earnings-warning {
  color: #f59e0b !important;
}

.wallet-actions {
  display: flex;
  justify-content: center;
}

/* Activities List */
.activities-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon i {
  font-size: 1.1rem;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  font-size: 0.95rem;
}

.activity-description {
  color: #6b7280;
  font-size: 0.85rem;
  margin-bottom: 6px;
  line-height: 1.4;
}

.activity-time {
  font-size: 0.8rem;
  color: #9ca3af;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-outline {
  background: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.btn-outline:hover {
  background: #3b82f6;
  color: white;
}

/* Loading, Error, and Empty States */
.loading-container,
.error-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
  padding: 20px;
}

.loading-content,
.error-content,
.empty-content {
  text-align: center;
  max-width: 300px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.error-icon {
  color: #ef4444;
}

.empty-icon {
  color: #6b7280;
}

.loading-content p,
.error-content p,
.empty-content p {
  margin: 8px 0;
  color: #6b7280;
}

.empty-content h4 {
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 8px 0;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .main-content {
    padding-left: 0;
  }

  .layout-wrapper.sidebar-collapsed .main-content {
    padding-left: 0;
  }

  .dashboard-header {
    padding: 24px;
    margin-bottom: 24px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .btn {
    flex: 1;
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .project-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .project-status {
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .content {
    padding: 16px;
  }

  .dashboard-header {
    padding: 20px;
    border-radius: 16px;
  }

  .dashboard-title {
    font-size: 2rem;
  }

  .stat-card {
    padding: 20px;
  }

  .stat-number {
    font-size: 1.8rem;
  }
}
</style>
