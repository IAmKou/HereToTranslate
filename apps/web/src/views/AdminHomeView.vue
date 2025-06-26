<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import { authService } from '../services/auth.service';
import { userService, UserProfile, User } from '../services/user.service';
import axiosInstance from '../api';

// Interfaces
interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  pendingRequests: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  lastBackup: string;
  diskUsage: number;
  memoryUsage: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'project_created' | 'user_login' | 'system_alert' | 'backup_completed';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    id: string;
    username: string;
    fullName?: string;
  };
  severity?: 'info' | 'warning' | 'error' | 'success';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

const router = useRouter();

// Reactive data
const user = ref<UserProfile | null>(null);
const users = ref<User[]>([]);
const isLoadingUser = ref(false);
const isLoadingUsers = ref(false);
const systemStats = ref<SystemStats>({
  totalUsers: 0,
  activeUsers: 0,
  totalProjects: 0,
  pendingRequests: 0,
  systemHealth: 'good',
  lastBackup: '',
  diskUsage: 0,
  memoryUsage: 0
});
const recentActivities = ref<RecentActivity[]>([]);
const isLoadingStats = ref(false);
const isLoadingActivities = ref(false);

// Quick actions
const quickActions = ref<QuickAction[]>([
  {
    id: 'user-management',
    title: 'User Management',
    description: 'Manage user accounts and permissions',
    icon: 'pi pi-users',
    route: '/admin/users',
    color: '#2563eb'
  },
  {
    id: 'system-settings',
    title: 'System Settings',
    description: 'Configure system preferences',
    icon: 'pi pi-cog',
    route: '/admin/settings',
    color: '#7c3aed'
  },
  {
    id: 'backup-restore',
    title: 'Backup & Restore',
    description: 'Manage system backups',
    icon: 'pi pi-database',
    route: '/admin/backup',
    color: '#059669'
  },
  {
    id: 'logs',
    title: 'System Logs',
    description: 'View system activity logs',
    icon: 'pi pi-file-text',
    route: '/admin/logs',
    color: '#dc2626'
  }
]);

const fetchUserData = async () => {
  try {
    isLoadingUser.value = true;
    user.value = await userService.getUserProfile();
  } catch (error) {
    console.error('Error fetching user data:', error);
  } finally {
    isLoadingUser.value = false;
  }
};

const fetchUsers = async () => {
  try {
    isLoadingUsers.value = true;
    const allUsers = await userService.getAllUsers();
    users.value = allUsers;

    // Update system stats with real user data
    systemStats.value.totalUsers = allUsers.length;
    systemStats.value.activeUsers = allUsers.filter(user => user.isActive).length;

    // Calculate system health based on active users percentage
    const activePercentage = (systemStats.value.activeUsers / systemStats.value.totalUsers) * 100;
    if (activePercentage >= 90) {
      systemStats.value.systemHealth = 'excellent';
    } else if (activePercentage >= 70) {
      systemStats.value.systemHealth = 'good';
    } else if (activePercentage >= 50) {
      systemStats.value.systemHealth = 'warning';
    } else {
      systemStats.value.systemHealth = 'critical';
    }

  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    isLoadingUsers.value = false;
  }
};

const fetchSystemStats = async () => {
  try {
    isLoadingStats.value = true;
    // Fetch projects count using the new admin endpoint
    try {
      const { data: projectsResponse } = await axiosInstance.get('/projects/admin/count');
      systemStats.value.totalProjects = projectsResponse.count || 0;
    } catch (error) {
      console.error('Error fetching projects count:', error);
      systemStats.value.totalProjects = 0;
    }
    // Fetch pending requests count
    try {
      const { data: requestsResponse } = await axiosInstance.get('/requests/pending/count');
      systemStats.value.pendingRequests = requestsResponse.count || 0;
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
      systemStats.value.pendingRequests = 0;
    }
    // Mock system metrics (replace with real API calls when available)
    systemStats.value.lastBackup = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    systemStats.value.diskUsage = Math.floor(Math.random() * 30) + 50; // 50-80%
    systemStats.value.memoryUsage = Math.floor(Math.random() * 40) + 30; // 30-70%
  } catch (error) {
    console.error('Error fetching system stats:', error);
  } finally {
    isLoadingStats.value = false;
  }
};

// Add new function to calculate real growth percentages
const calculateGrowthPercentage = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Add reactive data for previous month stats
const previousMonthStats = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalProjects: 0,
  pendingRequests: 0
});

// Fetch previous month stats for comparison
const fetchPreviousMonthStats = async () => {
  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get users created before 30 days ago
    const oldUsers = users.value.filter(user =>
      new Date(user.createdAt) < thirtyDaysAgo
    );

    previousMonthStats.value.totalUsers = oldUsers.length;
    previousMonthStats.value.activeUsers = oldUsers.filter(user => user.isActive).length;

    // For projects, we'll use a simple calculation based on current data
    // In a real system, you'd fetch this from a historical data table
    previousMonthStats.value.totalProjects = Math.max(0, systemStats.value.totalProjects - Math.floor(systemStats.value.totalProjects * 0.15));
    previousMonthStats.value.pendingRequests = Math.max(0, systemStats.value.pendingRequests - 5);

  } catch (error) {
    console.error('Error calculating previous month stats:', error);
  }
};

// Computed properties for growth percentages
const userGrowthPercentage = computed(() => {
  return calculateGrowthPercentage(systemStats.value.totalUsers, previousMonthStats.value.totalUsers);
});

const activeUserGrowthPercentage = computed(() => {
  return calculateGrowthPercentage(systemStats.value.activeUsers, previousMonthStats.value.activeUsers);
});

const projectGrowthPercentage = computed(() => {
  return calculateGrowthPercentage(systemStats.value.totalProjects, previousMonthStats.value.totalProjects);
});

const requestChangePercentage = computed(() => {
  const change = systemStats.value.pendingRequests - previousMonthStats.value.pendingRequests;
  return change;
});

// Update fetchRecentActivities to include more real data
const fetchRecentActivities = async () => {
  try {
    isLoadingActivities.value = true;

    // Generate activities based on real user data
    const activities: RecentActivity[] = [];

    // Get recent users (last 5)
    const recentUsers = users.value
      .sort((a: User, b: User) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Add user registration activities
    recentUsers.forEach((user: User, index: number) => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_registration',
        title: 'New User Registration',
        description: `${user.fullName || user.username} registered a new account`,
        timestamp: user.createdAt.toISOString(),
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName
        },
        severity: 'info'
      });
    });

    // Add project creation activities if we have project data
    if (systemStats.value.totalProjects > 0) {
      // Simulate recent project creation based on total projects
      const recentProjectCount = Math.min(3, Math.floor(systemStats.value.totalProjects * 0.1));
      for (let i = 0; i < recentProjectCount; i++) {
        activities.push({
          id: `project-${i}`,
          type: 'project_created',
          title: 'New Project Created',
          description: `Translation project was created by system`,
          timestamp: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString(),
          severity: 'success'
        });
      }
    }

    // Add system activities (mock for now)
    activities.push({
      id: 'backup-1',
      type: 'backup_completed',
      title: 'Backup Completed',
      description: 'Daily system backup completed successfully',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      severity: 'success'
    });

    // Add system health alert if needed
    if (systemStats.value.systemHealth === 'warning' || systemStats.value.systemHealth === 'critical') {
      activities.push({
        id: 'alert-1',
        type: 'system_alert',
        title: 'System Alert',
        description: `System health is ${systemStats.value.systemHealth}. Please check system resources.`,
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        severity: systemStats.value.systemHealth === 'critical' ? 'error' : 'warning'
      });
    }

    // Add disk usage alert if high
    if (systemStats.value.diskUsage > 80) {
      activities.push({
        id: 'disk-alert',
        type: 'system_alert',
        title: 'High Disk Usage',
        description: `Disk usage is at ${systemStats.value.diskUsage}%. Consider cleanup.`,
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        severity: 'warning'
      });
    }

    // Add memory usage alert if high
    if (systemStats.value.memoryUsage > 80) {
      activities.push({
        id: 'memory-alert',
        type: 'system_alert',
        title: 'High Memory Usage',
        description: `Memory usage is at ${systemStats.value.memoryUsage}%. Consider optimization.`,
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        severity: 'warning'
      });
    }

    // Sort activities by timestamp (newest first)
    activities.sort((a: RecentActivity, b: RecentActivity) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    recentActivities.value = activities.slice(0, 10); // Keep only 10 most recent

  } catch (error) {
    console.error('Error fetching recent activities:', error);
  } finally {
    isLoadingActivities.value = false;
  }
};

// Computed properties
const systemHealthColor = computed(() => {
  const colors: Record<string, string> = {
    excellent: '#059669',
    good: '#2563eb',
    warning: '#d97706',
    critical: '#dc2626'
  };
  return colors[systemStats.value.systemHealth] || '#6b7280';
});

const systemHealthIcon = computed(() => {
  const icons: Record<string, string> = {
    excellent: 'pi pi-check-circle',
    good: 'pi pi-check',
    warning: 'pi pi-exclamation-triangle',
    critical: 'pi pi-times-circle'
  };
  return icons[systemStats.value.systemHealth] || 'pi pi-info-circle';
});

// Helper functions
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTimeAgo = (date: string) => {
  const now = new Date();
  const activityDate = new Date(date);
  const diffInMs = now.getTime() - activityDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${diffInDays}d ago`;
};

const getActivityIcon = (type: string) => {
  const icons = {
    user_registration: 'pi pi-user-plus',
    project_created: 'pi pi-folder-plus',
    user_login: 'pi pi-sign-in',
    system_alert: 'pi pi-exclamation-triangle',
    backup_completed: 'pi pi-database'
  };
  return icons[type as keyof typeof icons] || 'pi pi-info-circle';
};

const getSeverityColor = (severity: string) => {
  const colors = {
    info: '#2563eb',
    warning: '#d97706',
    error: '#dc2626',
    success: '#059669'
  };
  return colors[severity as keyof typeof colors] || '#6b7280';
};

const handleQuickAction = (action: QuickAction) => {
  router.push(action.route);
};

onMounted(async () => {
  await fetchUserData();
  await fetchUsers(); // This will also update system stats
  await fetchSystemStats();
  await fetchPreviousMonthStats(); // Calculate growth percentages
  await fetchRecentActivities();
});
</script>

<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <main class="admin-home-main">
          <!-- Header Section -->
          <div class="header-section">
            <div class="header-content">
              <div class="header-left">
                <span class="welcome-emoji">👨‍💼</span>
                <h1 class="welcome-title">
                  Welcome back, <span class="admin-name">{{ user?.fullName || 'Admin' }}</span>!
                </h1>
                <p class="welcome-subtitle">Here's what's happening with your system today</p>
              </div>
              <div class="header-right">
                <div class="system-health-indicator" :style="{ borderColor: systemHealthColor }">
                  <i :class="systemHealthIcon" :style="{ color: systemHealthColor }"></i>
                  <span class="health-label">{{ systemStats.systemHealth.toUpperCase() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="stats-section">
            <div class="stats-grid">
              <div class="stat-card stat-users">
                <div class="stat-icon">
                  <i class="pi pi-users"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ systemStats.totalUsers.toLocaleString() }}</div>
                  <div class="stat-label">Total Users</div>
                  <div class="stat-change" :class="userGrowthPercentage >= 0 ? 'positive' : 'negative'">
                    <i :class="userGrowthPercentage >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
                    <span>{{ userGrowthPercentage >= 0 ? '+' : '' }}{{ userGrowthPercentage }}% from last month</span>
                  </div>
                </div>
              </div>

              <div class="stat-card stat-active">
                <div class="stat-icon">
                  <i class="pi pi-check-circle"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ systemStats.activeUsers.toLocaleString() }}</div>
                  <div class="stat-label">Active Users</div>
                  <div class="stat-change" :class="activeUserGrowthPercentage >= 0 ? 'positive' : 'negative'">
                    <i :class="activeUserGrowthPercentage >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
                    <span>{{ activeUserGrowthPercentage >= 0 ? '+' : '' }}{{ activeUserGrowthPercentage }}% from last week</span>
                  </div>
                </div>
              </div>

              <div class="stat-card stat-projects">
                <div class="stat-icon">
                  <i class="pi pi-folder"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ systemStats.totalProjects.toLocaleString() }}</div>
                  <div class="stat-label">Total Projects</div>
                  <div class="stat-change" :class="projectGrowthPercentage >= 0 ? 'positive' : 'negative'">
                    <i :class="projectGrowthPercentage >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
                    <span>{{ projectGrowthPercentage >= 0 ? '+' : '' }}{{ projectGrowthPercentage }}% from last month</span>
                  </div>
                </div>
              </div>

              <div class="stat-card stat-requests">
                <div class="stat-icon">
                  <i class="pi pi-clock"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ systemStats.pendingRequests }}</div>
                  <div class="stat-label">Pending Requests</div>
                  <div class="stat-change" :class="requestChangePercentage <= 0 ? 'positive' : 'negative'">
                    <i :class="requestChangePercentage <= 0 ? 'pi pi-arrow-down' : 'pi pi-arrow-up'"></i>
                    <span>{{ requestChangePercentage > 0 ? '+' : '' }}{{ requestChangePercentage }} from yesterday</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content Grid -->
          <div class="content-grid">
            <!-- Quick Actions -->
            <div class="quick-actions-section">
              <div class="section-header">
                <h2>Quick Actions</h2>
                <p>Common administrative tasks</p>
              </div>
              <div class="actions-grid">
                <div
                  v-for="action in quickActions"
                  :key="action.id"
                  class="action-card"
                  :style="{ borderLeftColor: action.color }"
                  @click="handleQuickAction(action)"
                >
                  <div class="action-icon" :style="{ backgroundColor: action.color }">
                    <i :class="action.icon"></i>
                  </div>
                  <div class="action-content">
                    <h3>{{ action.title }}</h3>
                    <p>{{ action.description }}</p>
                  </div>
                  <div class="action-arrow">
                    <i class="pi pi-arrow-right"></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- System Overview -->
            <div class="system-overview-section">
              <div class="section-header">
                <h2>System Overview</h2>
                <p>Current system status and resources</p>
              </div>
              <div class="system-metrics">
                <div class="metric-card">
                  <div class="metric-header">
                    <h3>Disk Usage</h3>
                    <span class="metric-value">{{ systemStats.diskUsage }}%</span>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: `${systemStats.diskUsage}%`, backgroundColor: systemStats.diskUsage > 80 ? '#dc2626' : systemStats.diskUsage > 60 ? '#d97706' : '#2563eb' }"
                    ></div>
                  </div>
                  <p class="metric-description">Used space on main storage</p>
                </div>

                <div class="metric-card">
                  <div class="metric-header">
                    <h3>Memory Usage</h3>
                    <span class="metric-value">{{ systemStats.memoryUsage }}%</span>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: `${systemStats.memoryUsage}%`, backgroundColor: systemStats.memoryUsage > 80 ? '#dc2626' : systemStats.memoryUsage > 60 ? '#d97706' : '#2563eb' }"
                    ></div>
                  </div>
                  <p class="metric-description">RAM utilization</p>
                </div>

                <div class="metric-card">
                  <div class="metric-header">
                    <h3>Last Backup</h3>
                    <span class="metric-value">{{ formatDate(systemStats.lastBackup) }}</span>
                  </div>
                  <div class="backup-status">
                    <i class="pi pi-check-circle" style="color: #059669;"></i>
                    <span>Backup completed successfully</span>
                  </div>
                  <p class="metric-description">Daily automated backup</p>
                </div>
              </div>
            </div>

            <!-- Recent Activities -->
            <div class="activities-section">
              <div class="section-header">
                <h2>Recent Activities</h2>
                <p>Latest system events and user actions</p>
              </div>
              <div class="activities-list">
                <div
                  v-for="activity in recentActivities"
                  :key="activity.id"
                  class="activity-item"
                  :style="{ borderLeftColor: getSeverityColor(activity.severity || 'info') }"
                >
                  <div class="activity-icon" :style="{ backgroundColor: getSeverityColor(activity.severity || 'info') }">
                    <i :class="getActivityIcon(activity.type)"></i>
                  </div>
                  <div class="activity-content">
                    <div class="activity-header">
                      <h4>{{ activity.title }}</h4>
                      <span class="activity-time">{{ getTimeAgo(activity.timestamp) }}</span>
                    </div>
                    <p class="activity-description">{{ activity.description }}</p>
                    <div v-if="activity.user" class="activity-user">
                      <i class="pi pi-user"></i>
                      <span>{{ activity.user.fullName || activity.user.username }}</span>
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
  margin-right: 0;
}

.content {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 20px;
  margin-left: 0;
  max-width: none;
  width: 100%;
}

.admin-home-main {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 16px 0 rgba(60,60,60,0.08);
  max-width: 1400px;
  width: 100%;
  margin-left: 13rem;
  padding: 32px 32px 40px 32px;
}

/* Header Section */
.header-section {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
}

.welcome-emoji {
  font-size: 2.8rem;
}

.welcome-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #23272f;
  margin: 0;
}

.admin-name {
  color: #2563eb;
}

.welcome-subtitle {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 8px 0 0 0;
}

.system-health-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid;
  border-radius: 12px;
  background: #f9fafb;
}

.health-label {
  font-weight: 600;
  font-size: 0.9rem;
}

/* Stats Section */
.stats-section {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(60,60,60,0.07);
  border: 1px solid #e5e7eb;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 6px 24px 0 rgba(60,60,60,0.13);
  transform: translateY(-2px);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
}

.stat-users .stat-icon { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
.stat-active .stat-icon { background: linear-gradient(135deg, #059669, #047857); }
.stat-projects .stat-icon { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
.stat-requests .stat-icon { background: linear-gradient(135deg, #d97706, #b45309); }

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 800;
  color: #23272f;
  line-height: 1;
}

.stat-label,
.stat-change,
.metric-value,
.metric-header h3 {
  font-size: 0.95rem;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-change.positive {
  color: #059669;
}

.stat-change.negative {
  color: #dc2626;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

/* Section Headers */
.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #23272f;
  margin: 0 0 4px 0;
}

.section-header p {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

/* Quick Actions */
.quick-actions-section {
  grid-column: 1;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  border-left: 4px solid;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-card:hover {
  box-shadow: 0 4px 16px 0 rgba(60,60,60,0.1);
  transform: translateX(4px);
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
}

.action-content {
  flex: 1;
}

.action-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #23272f;
  margin: 0 0 4px 0;
}

.action-content p {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
}

.action-arrow {
  color: #9ca3af;
  font-size: 1.1rem;
}

/* System Overview */
.system-overview-section {
  grid-column: 2;
}

.system-metrics {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.metric-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 14px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.metric-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #23272f;
  margin: 0;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #23272f;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metric-description {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
}

.backup-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #059669;
  font-weight: 500;
}

/* Recent Activities */
.activities-section {
  grid-column: 1 / -1;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  border-left: 4px solid;
  padding: 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: all 0.2s ease;
}

.activity-item:hover {
  box-shadow: 0 4px 16px 0 rgba(60,60,60,0.1);
}

.activity-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.activity-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #23272f;
  margin: 0;
}

.activity-time {
  font-size: 0.85rem;
  color: #6b7280;
  white-space: nowrap;
}

.activity-description {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.activity-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #6b7280;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions-section,
  .system-overview-section {
    grid-column: 1;
  }
}

@media (max-width: 768px) {
  .admin-home-main {
    padding: 20px;
    margin: 16px auto 0 auto;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .welcome-title {
    font-size: 1.8rem;
  }

  .stat-card {
    padding: 20px;
  }

  .stat-number {
    font-size: 1.8rem;
  }
}
</style>
