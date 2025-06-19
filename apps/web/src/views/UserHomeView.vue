<script setup lang="ts">
import { authService } from '../services/auth.service';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import Button from 'primevue/button';
import { ref, onMounted } from 'vue';
import { userService, UserProfile } from '../services/user.service';

const router = useRouter();

const user = ref<UserProfile | null>(null);
const isLoadingUser = ref(false);

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

onMounted(() => {
  fetchUserData();
});

const projects = ref([
  {
    id: 1,
    name: 'cryo',
    private: true,
    updated: '1 day ago',
    members: 1,
    words: '6,000',
    languages: 1,
    issues: 4,
    timers: 1,
  },
  {
    id: 2,
    name: 'maop',
    private: false,
    updated: '3 days ago',
    members: 2,
    words: null,
    languages: null,
    issues: null,
    timers: null,
  },
  {
    id: 3,
    name: 'notion-clone',
    private: false,
    updated: '5 days ago',
    members: 5,
    words: '12,500',
    languages: 3,
    issues: 2,
    timers: 2,
  },
  {
    id: 4,
    name: 'translateX',
    private: true,
    updated: '2 hours ago',
    members: 3,
    words: '2,000',
    languages: 2,
    issues: 0,
    timers: 1,
  },
  {
    id: 5,
    name: 'amharic-viet',
    private: false,
    updated: '10 days ago',
    members: 4,
    words: '8,000',
    languages: 2,
    issues: 1,
    timers: 0,
  },
]);

const recentProjects = ref([
  {
    id: 1,
    name: 'cryo',
    startDate: '01/06/2024',
    status: 'Đang dịch',
  },
  {
    id: 2,
    name: 'maop',
    startDate: '28/05/2024',
    status: 'Đã hoàn thành',
  },
  {
    id: 3,
    name: 'notion-clone',
    startDate: '20/05/2024',
    status: 'Đang dịch',
  },
  {
    id: 4,
    name: 'translateX',
    startDate: '15/05/2024',
    status: 'Đã hoàn thành',
  },
  {
    id: 5,
    name: 'amharic-viet',
    startDate: '10/05/2024',
    status: 'Đang dịch',
  },
]);

const lastUpdated = '14:30 - 01/06/2024';

function getStatusColor(status: string) {
  if (status === 'Đang dịch') return '#2563eb'; // xanh dương
  if (status === 'Đã hoàn thành') return '#22c55e'; // xanh lá
  return '#6b7280'; // xám
}

const handleLogout = async () => {
  try {
    // Call logout service
    await authService.logout();
    // Redirect to login page
    router.push('/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
</script>

<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <main class="userhome-main">
          <!-- Greeting -->
          <div class="greeting-row">
            <span class="greeting-emoji">👋</span>
            <h1 class="greeting-title">
              Hello, <span class="greeting-name">{{ user?.fullName || '' }}</span>! This is your dashboard.
            </h1>
          </div>
          <!-- Cards -->
          <div class="stats-row">
            <div class="stat-card stat-blue">
              <div class="stat-icon"><i class="pi pi-refresh"></i></div>
              <div>
                <div class="stat-number">3</div>
                <div class="stat-label">In Progress</div>
              </div>
            </div>
            <div class="stat-card stat-green">
              <div class="stat-icon"><i class="pi pi-check"></i></div>
              <div>
                <div class="stat-number">7</div>
                <div class="stat-label">Completed</div>
              </div>
            </div>
            <div class="stat-card stat-yellow">
              <div class="stat-icon"><i class="pi pi-box"></i></div>
              <div>
                <div class="stat-number">10</div>
                <div class="stat-label">Total Projects</div>
              </div>
            </div>
          </div>
          <!-- Project Table -->
          <div class="project-table-wrap">
            <table class="project-table">
              <thead>
              <tr>
                <th>Project</th>
                <th>Source Words</th>
                <th>Language</th>
                <th>Issues</th>
                <th>Timers</th>
                <th>Star</th>
                <th>More</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="project in [
                  { id: 1, name: 'cryo', private: true, updated: '1 day ago', members: 1, words: '6,000', languages: 1, issues: 4, timers: 1 },
                  { id: 2, name: 'maop', private: false, updated: '3 days ago', members: 2, words: null, languages: null, issues: null, timers: null },
                  { id: 3, name: 'notion-clone', private: false, updated: '5 days ago', members: 5, words: '12,500', languages: 3, issues: 2, timers: 2 },
                  { id: 4, name: 'translateX', private: true, updated: '2 hours ago', members: 3, words: '2,000', languages: 2, issues: 0, timers: 1 },
                  { id: 5, name: 'amharic-viet', private: false, updated: '10 days ago', members: 4, words: '8,000', languages: 2, issues: 1, timers: 0 }
                ]" :key="project.id">
                <td>
                  <div class="project-name">
                    <a :href="`/projects/${project.id}`" class="project-link">{{ project.name }}</a>
                    <i v-if="project.private" class="pi pi-lock project-lock"></i>
                  </div>
                  <div class="project-meta">
                    Updated {{ project.updated }} • {{ project.members }} member{{ project.members > 1 ? 's' : '' }}
                  </div>
                </td>
                <td class="text-center">
                  <span v-if="project.words" class="project-value">{{ project.words }}</span>
                  <span v-else class="project-empty">No source words</span>
                </td>
                <td class="text-center">
                  <span v-if="project.languages" class="project-value">{{ project.languages }}</span>
                  <span v-else class="project-empty">No languages</span>
                </td>
                <td class="text-center">
                  <i v-if="project.issues" class="pi pi-exclamation-triangle text-yellow-400"></i>
                  <span v-if="project.issues" class="project-value ml-1">{{ project.issues }}</span>
                </td>
                <td class="text-center">
                  <i v-if="project.timers" class="pi pi-clock text-blue-400"></i>
                  <span v-if="project.timers" class="project-value ml-1">{{ project.timers }}</span>
                </td>
                <td class="text-center">
                  <i class="pi pi-star text-gray-400"></i>
                </td>
                <td class="text-center">
                  <i class="pi pi-ellipsis-v text-gray-400"></i>
                </td>
              </tr>
              </tbody>
            </table>
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
}

.content {
  flex: 1;
  padding: 20px;
}

.user-home {
  padding: 20px;
  text-align: center;
}

.logout-btn {
  padding: 10px 20px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
}

.logout-btn:hover {
  background-color: #c82333;
}

.userhome-main {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 16px 0 rgba(60,60,60,0.08);
  max-width: 1100px;
  margin: 32px auto 0 auto;
  padding: 32px 32px 40px 32px;
}

.userhome-greeting {
  margin-bottom: 32px;
}

.userhome-greeting h1 {
  font-size: 2rem;
  font-weight: bold;
  color: #23272f;
  display: flex;
  align-items: center;
  gap: 12px;
}

.userhome-cards {
  display: flex;
  gap: 24px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.userhome-card {
  flex: 1 1 0;
  min-width: 220px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s;
  cursor: pointer;
  background: #f9fafb;
}

.userhome-card:hover {
  box-shadow: 0 4px 24px 0 rgba(60,60,60,0.12);
}

.userhome-card-content {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 0;
}

.userhome-card-icon {
  border-radius: 50%;
  padding: 14px;
  font-size: 2em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.userhome-card-icon-blue { background: #e0edff; color: #2563eb; }
.userhome-card-icon-green { background: #e6fbe7; color: #22c55e; }
.userhome-card-icon-gray { background: #e5e7eb; color: #6b7280; }

.userhome-card-number {
  font-size: 2.2em;
  font-weight: 800;
  line-height: 1;
}

.userhome-card-number-blue { color: #2563eb; }
.userhome-card-number-green { color: #22c55e; }
.userhome-card-number-gray { color: #6b7280; }

.userhome-card-label {
  font-size: 1em;
  color: #6b7280;
  margin-top: 2px;
}

.userhome-tablebox {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px 0 rgba(60,60,60,0.07);
  border: 1px solid #e5e7eb;
  padding: 28px 20px 20px 20px;
  margin-top: 8px;
}

.userhome-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.userhome-link {
  color: #2563eb;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
}

.userhome-link:hover {
  color: #1d4ed8;
}

.userhome-table-updated {
  font-size: 0.95em;
  color: #6b7280;
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
th, td {
  border-bottom: 1px solid #353945;
}
th {
  background: #23272f;
}
tr:last-child td {
  border-bottom: none;
}

.greeting-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 32px;
}
.greeting-emoji {
  font-size: 2.8rem;
}
.greeting-title {
  font-size: 2.1rem;
  font-weight: 800;
  color: #23272f;
}
.greeting-name {
  color: #2563eb;
}
.stats-row {
  display: flex;
  gap: 32px;
  margin-bottom: 36px;
  flex-wrap: wrap;
}
.stat-card {
  flex: 1 1 0;
  min-width: 220px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px 0 rgba(60,60,60,0.07);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px 28px;
  transition: box-shadow 0.2s;
}
.stat-card:hover {
  box-shadow: 0 6px 24px 0 rgba(60,60,60,0.13);
}
.stat-icon {
  border-radius: 50%;
  padding: 18px;
  font-size: 2.2em;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-blue { border-left: 6px solid #2563eb; }
.stat-blue .stat-icon { background: #e0edff; color: #2563eb; }
.stat-green { border-left: 6px solid #22c55e; }
.stat-green .stat-icon { background: #e6fbe7; color: #22c55e; }
.stat-yellow { border-left: 6px solid #eab308; }
.stat-yellow .stat-icon { background: #fef9c3; color: #eab308; }
.stat-number {
  font-size: 2.3em;
  font-weight: 800;
  line-height: 1;
}
.stat-label {
  font-size: 1.1em;
  color: #6b7280;
  margin-top: 2px;
}
.project-table-wrap {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px 0 rgba(60,60,60,0.07);
  border: 1px solid #e5e7eb;
  padding: 0;
  margin-top: 18px;
  overflow-x: auto;
}
.project-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.project-table thead tr {
  background: #23272f;
}
.project-table th, .project-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 1em;
}
.project-table th {
  color: #fff;
  font-weight: 700;
  text-align: left;
}
.project-table td {
  background: #fff;
  color: #23272f;
}
.project-table tr:last-child td {
  border-bottom: none;
}
.project-name {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
}
.project-link {
  color: #2563eb;
  text-decoration: none;
}
.project-link:hover {
  text-decoration: underline;
}
.project-lock {
  font-size: 1em;
  color: #6b7280;
}
.project-meta {
  font-size: 0.95em;
  color: #6b7280;
  margin-top: 2px;
}
.project-value {
  color: #23272f;
  font-weight: 500;
}
.project-empty {
  color: #b0b0b0;
  font-style: italic;
}
.text-center {
  text-align: center;
}
</style>
