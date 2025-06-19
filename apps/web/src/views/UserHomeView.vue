<script setup lang="ts">
import { authService } from '../services/auth.service';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopNavbar from '../components/Navbar.vue';
import Footer from '../components/AppFooter.vue';
import Button from 'primevue/button';

const router = useRouter();

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

const user = {
  avatar: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=256&h=256',
  name: 'Tú Hoàng',
  username: 'richchoi6',
  languages: [
    { name: 'Vietnamese', note: '(native)' },
    { name: 'Amharic', note: '' }
  ]
};

const projects = [
  {
    id: 1,
    name: 'cryo',
    private: true,
    updated: '1 day ago',
    members: 1,
    words: '6k',
    languages: 1,
    issues: 4,
    timers: 1,
  },
  {
    id: 2,
    name: 'maop',
    private: true,
    updated: '3 days ago',
    members: 1,
    words: null,
    languages: null,
    issues: null,
    timers: null,
  },
];
</script>

<template>
  <div class="layout-wrapper">
    <TopNavbar />
    <div class="main-content">
      <Sidebar />
      <div class="content">
        <main class="flex gap-8 px-8 py-10 max-w-7xl mx-auto w-full">
          <!-- Panel trái (profile) -->
          <aside class="w-80 shrink-0 bg-[#23272f] rounded-2xl shadow p-7 flex flex-col items-center border border-[#353945]">
            <img
              :src="user.avatar"
              alt="avatar"
              class="w-28 h-28 rounded-full object-cover border-4 border-[#353945] mb-5"
            />
            <div class="text-2xl font-bold mb-1 text-white text-center">{{ user.name }}</div>
            <div class="text-gray-400 mb-5 text-center">{{ user.username }}</div>
            <button class="w-full border border-[#353945] rounded-lg py-2 mb-7 font-medium text-white hover:bg-[#353945] transition">
              Upgrade Account
            </button>
            <div class="w-full">
              <div class="text-sm font-semibold mb-2 text-white">Preferred Languages</div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="lang in user.languages"
                  :key="lang.name"
                  class="bg-[#353945] text-white px-3 py-1 rounded-full text-xs font-medium"
                >
                  {{ lang.name }} <span v-if="lang.note" class="text-gray-400">{{ lang.note }}</span>
                </span>
              </div>
            </div>
            <div class="border-t border-[#353945] w-full mt-7"></div>
          </aside>

          <!-- Panel phải (project list) -->
          <section class="flex-1 flex flex-col min-w-0">
            <!-- Thanh tìm kiếm và action -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
              <div class="flex gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Search projects"
                  class="w-full md:w-96 px-4 py-2 rounded-lg border border-[#353945] bg-[#23272f] text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <Button icon="pi pi-filter" class="p-button-text p-button-rounded" />
                <Button icon="pi pi-sort-alt" class="p-button-text p-button-rounded" />
              </div>
              <Button label="Create Project" icon="pi pi-plus" class="p-button-success px-5 py-2 rounded-lg font-semibold text-base" />
            </div>

            <!-- Tabs (Own/Shared) -->
            <div class="flex items-center gap-4 mb-2">
              <span class="font-semibold text-base text-white">Own</span>
              <span class="text-gray-400 text-sm">2</span>
            </div>

            <!-- Danh sách project -->
            <div class="bg-[#23272f] rounded-xl shadow border border-[#353945] overflow-x-auto">
              <div class="divide-y divide-[#353945]">
                <div
                  v-for="project in projects"
                  :key="project.id"
                  class="flex items-center px-6 py-4 hover:bg-[#262b34] transition min-w-[700px]"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <a href="#" class="text-green-400 font-semibold hover:underline">{{ project.name }}</a>
                      <i v-if="project.private" class="pi pi-lock text-xs text-gray-400"></i>
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                      Updated {{ project.updated }} • {{ project.members }} member{{ project.members > 1 ? 's' : '' }}
                    </div>
                  </div>
                  <div class="w-24 text-center">
                    <span v-if="project.words" class="text-sm font-medium text-gray-200">{{ project.words }}</span>
                    <span v-else class="text-xs text-gray-400">No source words</span>
                    <div class="text-xs text-gray-400">source words</div>
                  </div>
                  <div class="w-20 text-center">
                    <span v-if="project.languages" class="text-sm font-medium text-gray-200">{{ project.languages }}</span>
                    <span v-else class="text-xs text-gray-400">No languages</span>
                    <div class="text-xs text-gray-400">Language</div>
                  </div>
                  <div class="flex items-center gap-2 w-24 justify-center">
                    <i v-if="project.issues" class="pi pi-exclamation-triangle text-yellow-500"></i>
                    <span v-if="project.issues" class="text-xs text-gray-400">{{ project.issues }}</span>
                    <i v-if="project.timers" class="pi pi-clock text-blue-500"></i>
                    <span v-if="project.timers" class="text-xs text-gray-400">{{ project.timers }}</span>
                  </div>
                  <div class="w-8 flex justify-center">
                    <i class="pi pi-star text-gray-400"></i>
                  </div>
                  <div class="w-8 flex justify-center">
                    <i class="pi pi-ellipsis-v text-gray-400"></i>
                  </div>
                </div>
              </div>
            </div>
          </section>
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
</style>
