<template>
  <div class="env-switcher" v-if="showSwitcher">
    <div class="env-switcher-content">
      <h4>🔧 Environment Settings</h4>
      <div class="current-config">
        <strong>Current:</strong> {{ currentConfig.networkType }}
        ({{ currentConfig.apiUrl }})
      </div>

      <div class="env-options">
        <button
          @click="switchTo('localhost')"
          :class="['env-btn', { active: isLocalhost }]"
        >
          🏠 Localhost
        </button>
        <button
          @click="switchTo('radVPN')"
          :class="['env-btn', { active: isRadVPN }]"
        >
          🌐 RadVPN
        </button>
        <button
          @click="switchTo('auto')"
          :class="['env-btn', { active: isAuto }]"
        >
          🤖 Auto-detect
        </button>
      </div>

      <div class="manual-config" v-if="showManual">
        <input
          v-model="manualApiUrl"
          placeholder="Custom API URL (e.g., http://192.168.1.100:3000/api)"
          class="manual-input"
        >
        <button @click="applyManualConfig" class="apply-btn">Apply</button>
      </div>

      <div class="env-actions">
        <button @click="showManual = !showManual" class="toggle-btn">
          {{ showManual ? 'Hide' : 'Show' }} Manual Config
        </button>
        <button @click="resetConfig" class="reset-btn">Reset</button>
        <button @click="showSwitcher = false" class="close-btn">×</button>
      </div>
    </div>
  </div>

  <!-- Toggle button -->
  <button
    @click="showSwitcher = !showSwitcher"
    class="env-toggle-btn"
    :title="`Current: ${currentConfig.networkType}`"
  >
    🔧
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getEnvironmentConfig, logEnvironmentInfo } from '../utils/environment'

const showSwitcher = ref(false)
const showManual = ref(false)
const manualApiUrl = ref('')
const currentConfig = ref(getEnvironmentConfig())

// Check current environment
const isLocalhost = computed(() => currentConfig.value.apiUrl.includes('localhost'))
const isRadVPN = computed(() => currentConfig.value.apiUrl.includes('26.82.216.'))
const isAuto = computed(() => !localStorage.getItem('FORCE_API_URL'))

function switchTo(env: 'localhost' | 'radVPN' | 'auto') {
  switch (env) {
    case 'localhost':
      localStorage.setItem('FORCE_API_URL', 'http://localhost:3000/api')
      localStorage.setItem('FORCE_SERVER_URL', 'http://localhost:3000')
      break
    case 'radVPN':
      localStorage.setItem('FORCE_API_URL', 'http://26.82.216.71:3000/api')
      localStorage.setItem('FORCE_SERVER_URL', 'http://26.82.216.71:3000')
      break
    case 'auto':
      localStorage.removeItem('FORCE_API_URL')
      localStorage.removeItem('FORCE_SERVER_URL')
      break
  }

  // Update current config
  currentConfig.value = getEnvironmentConfig()
  logEnvironmentInfo()

  // Reload page to apply changes
  setTimeout(() => {
    location.reload()
  }, 500)
}

function applyManualConfig() {
  if (manualApiUrl.value.trim()) {
    const apiUrl = manualApiUrl.value.trim()
    const serverUrl = apiUrl.replace('/api', '')

    localStorage.setItem('FORCE_API_URL', apiUrl)
    localStorage.setItem('FORCE_SERVER_URL', serverUrl)

    currentConfig.value = getEnvironmentConfig()

    setTimeout(() => {
      location.reload()
    }, 500)
  }
}

function resetConfig() {
  localStorage.removeItem('FORCE_API_URL')
  localStorage.removeItem('FORCE_SERVER_URL')
  manualApiUrl.value = ''
  currentConfig.value = getEnvironmentConfig()

  setTimeout(() => {
    location.reload()
  }, 500)
}

onMounted(() => {
  // Auto-show switcher if there are connection issues
  const hasConnectionIssues = localStorage.getItem('CONNECTION_ISSUES')
  if (hasConnectionIssues) {
    showSwitcher.value = true
    localStorage.removeItem('CONNECTION_ISSUES')
  }
})
</script>

<style scoped>
.env-toggle-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 18px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
}

.env-toggle-btn:hover {
  background: #2563eb;
  transform: scale(1.1);
}

.env-switcher {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.env-switcher-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  min-width: 400px;
  max-width: 90vw;
}

.env-switcher-content h4 {
  margin: 0 0 1rem 0;
  color: #1f2937;
}

.current-config {
  background: #f3f4f6;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-family: monospace;
  font-size: 0.9rem;
}

.env-options {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.env-btn {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.env-btn:hover {
  border-color: #3b82f6;
}

.env-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.manual-config {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.manual-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: monospace;
}

.apply-btn {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.env-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: center;
}

.toggle-btn, .reset-btn {
  padding: 0.5rem 1rem;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.toggle-btn:hover, .reset-btn:hover {
  background: #4b5563;
}

.close-btn:hover {
  background: #dc2626;
}
</style>
