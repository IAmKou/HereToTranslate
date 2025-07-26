<template>
  <div class="fixed bottom-4 right-4 z-50">
    <!-- Toggle Button when closed -->
    <button
      v-if="!isOpen"
      @click="toggleChat"
      class="rounded-full shadow-lg p-3 bg-blue-600 text-white hover:bg-blue-700"
    >
      💬
    </button>

    <!-- Chat Box -->
    <div
      v-else
      class="w-80 h-96 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200"
    >
      <!-- Header -->
      <div class="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-2xl">
        <span class="font-semibold">AI Chat</span>
        <button @click="toggleChat" class="text-white hover:text-gray-200">✖</button>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-xs p-2 rounded-lg"
            :class="msg.role === 'user'
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-800 rounded-bl-none'"
          >
            <p class="text-sm whitespace-pre-line">{{ msg.content }}</p>
          </div>
        </div>
        <div v-if="loading" class="text-gray-400 text-sm">AI is typing...</div>
      </div>

      <!-- Input -->
      <form @submit.prevent="sendMessage" class="p-3 border-t border-gray-200">
        <div class="flex items-center space-x-2">
          <input
            v-model="input"
            type="text"
            placeholder="Type your message..."
            class="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring focus:ring-blue-300"
          />
          <button
            type="submit"
            :disabled="!input || loading"
            class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
const BASE_URL = 'http://localhost:3000/api';

const isOpen = ref(false)
const input = ref('')
const messages = ref<ChatMessage[]>([])
const loading = ref(false)

function toggleChat() {
  isOpen.value = !isOpen.value
}

async function sendMessage() {
  const question = input.value.trim()
  if (!question) return

  // add user message
  messages.value.push({ role: 'user', content: question })
  input.value = ''
  loading.value = true

  try {
    const res = await axios.post(`${BASE_URL}/ai/ask`, { question })
    const answer = res.data.answer || 'No response'
    messages.value.push({ role: 'assistant', content: answer })
  } catch (e: any) {
    messages.value.push({ role: 'assistant', content: '⚠️ Error: ' + e.message })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
</style>
