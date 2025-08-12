<template>
  <div class="p-4">
    <h1 class="text-xl font-bold mb-4">Scanner Cron Control Panel</h1>

    <!-- Status -->
    <button @click="getStatus" class="btn">Get Status</button>
    <pre>{{ status }}</pre>

    <!-- Trigger manual scan -->
    <button @click="triggerScan" class="btn">Trigger Manual Scan</button>
    <pre>{{ triggerMessage }}</pre>

    <!-- Available intervals -->
    <button @click="getIntervals" class="btn">Get Available Intervals</button>
    <pre>{{ intervals }}</pre>

    <!-- Update config -->
    <h2 class="mt-4 font-semibold">Update Config</h2>
    <label>
      Interval:
      <input v-model="config.interval" placeholder="e.g. 5m" />
    </label>
    <label>
      Rest Time:
      <input type="number" v-model.number="config.restTime" placeholder="Seconds" />
    </label>
    <button @click="updateConfig" class="btn">Update Config</button>
    <pre>{{ updateMessage }}</pre>

    <!-- Stop/Start -->
    <div class="mt-4">
      <button @click="stopCron" class="btn bg-red-500">Stop Cron</button>
      <button @click="startCron" class="btn bg-green-500">Start Cron</button>
    </div>
    <pre>{{ jobMessage }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const API_BASE = 'http://localhost:3000/scanner-cron'
const token = 'YOUR_JWT_TOKEN' // Replace with your actual token

const status = ref('')
const triggerMessage = ref('')
const intervals = ref('')
const updateMessage = ref('')
const jobMessage = ref('')
const config = ref({ interval: '', restTime: null })

async function request(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(url, options)
  return res.json()
}

async function getStatus() {
  status.value = await request(`${API_BASE}/status`)
}

async function triggerScan() {
  triggerMessage.value = await request(`${API_BASE}/trigger`, 'POST')
}

async function getIntervals() {
  intervals.value = await request(`${API_BASE}/intervals`)
}

async function updateConfig() {
  updateMessage.value = await request(`${API_BASE}/config`, 'PUT', config.value)
}

async function stopCron() {
  jobMessage.value = await request(`${API_BASE}/stop`, 'POST')
}

async function startCron() {
  jobMessage.value = await request(`${API_BASE}/start`, 'POST')
}
</script>

<style scoped>
.btn {
  @apply bg-blue-500 text-white px-3 py-1 rounded m-1 hover:bg-blue-600;
}
input {
  @apply border px-2 py-1 m-1;
}
pre {
  background: #f3f3f3;
  padding: 0.5rem;
  margin-top: 0.5rem;
}
</style>
