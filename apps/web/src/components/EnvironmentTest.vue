<template>
  <div class="env-test" v-if="showTest">
    <div class="env-test-content">
      <h4>🌍 Environment Test</h4>
      <div class="env-info">
        <div><strong>Current URL:</strong> {{ currentUrl }}</div>
        <div><strong>API URL:</strong> {{ config.apiUrl }}</div>
        <div><strong>Server URL:</strong> {{ config.serverUrl }}</div>
        <div><strong>Environment:</strong> {{ config.isDevelopment ? 'Development' : 'Production' }}</div>
        <div><strong>Domain Type:</strong> {{ getDomainType() }}</div>
      </div>
      <div class="test-buttons">
        <button @click="testApiConnection" :disabled="testing">
          {{ testing ? 'Testing...' : 'Test API Connection' }}
        </button>
        <button @click="testWebSocket" :disabled="testingWs">
          {{ testingWs ? 'Testing...' : 'Test WebSocket' }}
        </button>
      </div>
      <div class="test-results" v-if="testResults.length > 0">
        <h5>Test Results:</h5>
        <div v-for="result in testResults" :key="result.id" :class="['test-result', result.status]">
          {{ result.message }}
        </div>
      </div>
      <button @click="showTest = false" class="close-btn">Close</button>
    </div>
  </div>
  <button @click="showTest = !showTest" class="env-test-toggle-btn" title="Environment Test">
    🧪
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { getEnvironmentConfig } from '../utils/environment';

const showTest = ref(false);
const testing = ref(false);
const testingWs = ref(false);
const testResults = ref<Array<{id: number, message: string, status: 'success' | 'error'}>>([]);

const config = computed(() => getEnvironmentConfig());
const currentUrl = computed(() => window.location.href);

const getDomainType = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'Localhost';
  if (hostname === 'heretotranslate.onrender.com') return 'Frontend Domain';
  if (hostname === 'htt-ekpa.onrender.com') return 'Backend Domain';
  if (hostname.startsWith('26.82.216.')) return 'RadVPN';
  return 'Other';
};

const testApiConnection = async () => {
  testing.value = true;
  testResults.value = [];

  try {
    const response = await fetch(config.value.apiUrl + '/auth/me', {
      credentials: 'include'
    });

    if (response.ok) {
      testResults.value.push({
        id: Date.now(),
        message: `✅ API Connection: ${response.status} ${response.statusText}`,
        status: 'success'
      });
    } else {
      testResults.value.push({
        id: Date.now(),
        message: `❌ API Connection: ${response.status} ${response.statusText}`,
        status: 'error'
      });
    }
  } catch (error) {
    testResults.value.push({
      id: Date.now(),
      message: `❌ API Connection Failed: ${error}`,
      status: 'error'
    });
  } finally {
    testing.value = false;
  }
};

const testWebSocket = async () => {
  testingWs.value = true;
  testResults.value = [];

  try {
    const ws = new WebSocket(config.value.serverUrl.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket');

    ws.onopen = () => {
      testResults.value.push({
        id: Date.now(),
        message: '✅ WebSocket Connection: Connected successfully',
        status: 'success'
      });
      ws.close();
    };

    ws.onerror = (error) => {
      testResults.value.push({
        id: Date.now(),
        message: `❌ WebSocket Connection Failed: ${error}`,
        status: 'error'
      });
    };

    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        testResults.value.push({
          id: Date.now(),
          message: '❌ WebSocket Connection: Timeout',
          status: 'error'
        });
        ws.close();
      }
    }, 5000);

  } catch (error) {
    testResults.value.push({
      id: Date.now(),
      message: `❌ WebSocket Test Failed: ${error}`,
      status: 'error'
    });
  } finally {
    testingWs.value = false;
  }
};
</script>

<style scoped>
.env-test {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.env-test-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.env-info {
  margin: 15px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.env-info > div {
  margin: 5px 0;
}

.test-buttons {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.test-buttons button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
}

.test-buttons button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.test-results {
  margin: 15px 0;
}

.test-result {
  padding: 8px;
  margin: 5px 0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.test-result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.test-result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.close-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #6c757d;
  color: white;
  cursor: pointer;
  margin-top: 10px;
}

.env-test-toggle-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: #007bff;
  color: white;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  z-index: 9998;
}
</style> 