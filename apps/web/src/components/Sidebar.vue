<template>
  <aside class="layout-sidebar"
         :class="{
           'layout-sidebar-active': visible,
           'layout-sidebar-collapsed': isCollapsed
         }"
         :style="{ width: sidebarWidth }">
    <div class="layout-sidebar-header">
      <PButton class="p-button-text collapse-button" @click="toggleSidebar">
        <i class="pi pi-bars"></i>
      </PButton>
    </div>

    <div class="layout-sidebar-content">
      <div class="layout-sidebar-menu">
        <div v-for="(item, index) in menuItems"
             :key="index"
             class="menu-section">
          <div class="menu-header"
               :class="{ 'active': activeMenu === item.label }"
               @click="handleMenuClick(item.label)">
            <i :class="[item.icon, 'menu-icon']"></i>
            <span v-if="showLabels" class="menu-label">{{ item.label }}</span>
            <i v-if="showLabels"
               :class="[
                 'pi',
                 activeMenu === item.label ? 'pi-angle-down' : 'pi-angle-right',
                 'menu-arrow'
               ]"></i>
          </div>

          <div v-if="showLabels && activeMenu === item.label"
               class="menu-items">
            <div v-for="(subItem, subIndex) in item.items"
                 :key="subIndex"
                 class="menu-item"
                 @click="navigate(subItem.to)">
              <i :class="[subItem.icon, 'menu-icon']"></i>
              <span class="menu-label">{{ subItem.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="layout-sidebar-footer">
        <div v-if="showLabels" class="language-section">
          <span class="text-sm font-medium mb-2 block">Language</span>
          <Dropdown v-model="selectedLanguage"
                    :options="languages"
                    optionLabel="name"
                    class="w-full language-dropdown" />
        </div>
        <div v-else class="language-section-collapsed">
          <i class="pi pi-globe text-xl"></i>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Dropdown from 'primevue/dropdown';
import PButton from 'primevue/button';

const props = defineProps<{
  visible: boolean;
}>();

const router = useRouter();
const isCollapsed = ref(false);
const activeMenu = ref('');

const languages = ref([
  { name: 'English', code: 'en' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Japanese', code: 'ja' }
]);

const selectedLanguage = ref(languages.value[0]);

const menuItems = ref([
  {
    label: 'Projects',
    icon: 'pi pi-folder',
    items: [
      {
        label: 'All Projects',
        icon: 'pi pi-list',
        to: '/projects'
      },
      {
        label: 'Create New',
        icon: 'pi pi-plus',
        to: '/projects/new'
      }
    ]
  },
  {
    label: 'Strings',
    icon: 'pi pi-list',
    items: [
      {
        label: 'All Strings',
        icon: 'pi pi-list',
        to: '/strings'
      },
      {
        label: 'Import',
        icon: 'pi pi-upload',
        to: '/strings/import'
      }
    ]
  },
  {
    label: 'Glossary',
    icon: 'pi pi-book',
    items: [
      {
        label: 'All Terms',
        icon: 'pi pi-list',
        to: '/glossary'
      },
      {
        label: 'Import Terms',
        icon: 'pi pi-upload',
        to: '/glossary/import'
      }
    ]
  },
  {
    label: 'Reports',
    icon: 'pi pi-chart-bar',
    items: [
      {
        label: 'Overview',
        icon: 'pi pi-chart-line',
        to: '/reports/overview'
      },
      {
        label: 'Detailed',
        icon: 'pi pi-chart-bar',
        to: '/reports/detailed'
      }
    ]
  }
]);

const sidebarWidth = computed(() => isCollapsed.value ? '4rem' : '14rem');
const showLabels = computed(() => !isCollapsed.value);

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const navigate = (path: string) => {
  router.push(path);
};

const handleMenuClick = (menu: string) => {
  activeMenu.value = activeMenu.value === menu ? '' : menu;
};
</script>

<style scoped>
.layout-sidebar {
  position: fixed;
  top: 4rem;
  left: 0;
  height: calc(100vh - 4rem);
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.layout-sidebar-active {
  transform: translateX(0);
}

.layout-sidebar-collapsed {
  width: 4rem;
}

.layout-sidebar-header {
  padding: 0.875rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  background: #ffffff;
  height: 4rem;
}

.collapse-button {
  width: 3rem;
  height: 3rem;
  border-radius: 0.625rem;
  color: #6b7280;
  transition: all 0.2s ease;
}

.collapse-button:hover {
  background: #f3f4f6;
  color: #374151;
  transform: translateY(-1px);
}

.layout-sidebar-content {
  display: flex;
  flex-direction: column;
  height: calc(100% - 4rem);
  overflow: hidden;
}

.layout-sidebar-menu {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.menu-section {
  margin-bottom: 0.5rem;
}

.menu-header {
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: #374151;
  font-size: 1rem;
  border-radius: 0.625rem;
  margin: 0 0.75rem;
}

.menu-header:hover {
  background: #f9fafb;
  transform: translateX(4px);
}

.menu-header.active {
  background: #f3f4f6;
  color: #2563eb;
  font-weight: 600;
}

.menu-icon {
  font-size: 1.125rem;
  margin-right: 1rem;
  color: #6b7280;
  transition: all 0.2s ease;
}

.menu-header:hover .menu-icon,
.menu-header.active .menu-icon {
  color: inherit;
  transform: scale(1.1);
}

.menu-label {
  font-size: 1rem;
  font-weight: 500;
  flex: 1;
}

.menu-arrow {
  font-size: 0.875rem;
  transition: transform 0.2s ease;
  color: #9ca3af;
}

.menu-header.active .menu-arrow {
  transform: rotate(180deg);
  color: #2563eb;
}

.menu-items {
  background: #ffffff;
  padding: 0.5rem 0;
  margin: 0.375rem 0.75rem;
  border-radius: 0.625rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.menu-item {
  padding: 0.75rem 1.25rem 0.75rem 3rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #4b5563;
  font-size: 1rem;
  border-radius: 0.5rem;
  margin: 0.25rem 0.5rem;
}

.menu-item:hover {
  background: #f9fafb;
  color: #2563eb;
  transform: translateX(4px);
}

.menu-item .menu-icon {
  font-size: 1rem;
  margin-right: 1rem;
}

.layout-sidebar-footer {
  padding: 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.language-section {
  transition: all 0.2s ease;
}

.language-section-collapsed {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
}

.language-section-collapsed:hover {
  color: #2563eb;
  transform: scale(1.1);
}

.language-dropdown {
  :deep(.p-dropdown) {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.625rem;
    padding: 0.625rem 1rem;
    transition: all 0.2s ease;
  }

  :deep(.p-dropdown:hover) {
    border-color: #d1d5db;
    transform: translateY(-1px);
  }

  :deep(.p-dropdown-label) {
    font-size: 1rem;
    color: #374151;
    font-weight: 500;
  }

  :deep(.p-dropdown-trigger) {
    color: #6b7280;
  }
}

/* Scrollbar Styling */
.layout-sidebar-menu::-webkit-scrollbar {
  width: 6px;
}

.layout-sidebar-menu::-webkit-scrollbar-track {
  background: transparent;
}

.layout-sidebar-menu::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.layout-sidebar-menu::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

@media (max-width: 991px) {
  .layout-sidebar {
    transform: translateX(-100%);
  }

  .layout-sidebar-active {
    transform: translateX(0);
  }

  .layout-sidebar-collapsed {
    width: 4rem;
  }
}
</style>
