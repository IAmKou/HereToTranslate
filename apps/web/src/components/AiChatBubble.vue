<template>
  <div class="ai-chat-bubble-container">
    <!-- Floating bubble icon -->
    <div
      class="ai-chat-bubble"
      @click="toggleChat"
      :class="{ 'bubble-active': isOpen }"
    >
      <i class="pi pi-comments"></i>
      <div class="bubble-pulse" v-if="!isOpen"></div>
    </div>

    <!-- Chat window -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="ai-chat-window">
        <div class="chat-header">
          <div class="chat-title">
            <i class="pi pi-robot"></i>
            <span>AI Assistant</span>
          </div>
          <button class="close-btn" @click="toggleChat">
            <i class="pi pi-times-circle"></i>
          </button>
        </div>

        <div class="chat-messages" ref="messagesContainer">
          <div
            v-for="(message, index) in messages"
            :key="index"
            class="message"
            :class="message.type"
          >
            <div class="message-avatar">
              <i :class="message.type === 'user' ? 'pi pi-user' : 'pi pi-robot'"></i>
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(message.text)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="isTyping" class="message ai">
            <div class="message-avatar">
              <i class="pi pi-robot"></i>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input">
          <div class="input-container">
            <textarea
              v-model="inputMessage"
              @keydown.enter.prevent="sendMessage"
              @keydown.enter.shift.exact="sendMessage"
              placeholder="Type your message..."
              class="message-input"
              rows="1"
              ref="messageInput"
            ></textarea>
            <button
              @click="sendMessage"
              class="send-btn"
              :disabled="!inputMessage.trim() || isTyping"
            >
              <i class="pi pi-send"></i>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import axiosInstance from '../utils/axios'

const isOpen = ref(false)
const inputMessage = ref('')
const messages = ref([])
const isTyping = ref(false)
const messagesContainer = ref(null)
const messageInput = ref(null)
const toast = useToast()

// Initialize with welcome message
onMounted(() => {
  messages.value = [
    {
      type: 'ai',
      text: 'Hello! 👋 I\'m your AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]
})

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      scrollToBottom()
      messageInput.value?.focus()
    })
  }
}

const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isTyping.value) return

  // Add user message
  messages.value.push({
    type: 'user',
    text: message,
    timestamp: new Date()
  })

  inputMessage.value = ''
  isTyping.value = true

  await nextTick()
  scrollToBottom()

  try {
    const response = await axiosInstance.post('/ai/chat', {
      message: message
    })

    // Add AI response
    messages.value.push({
      type: 'ai',
      text: response.data.response || 'Sorry, I couldn\'t process your request.',
      timestamp: new Date()
    })
  } catch (error) {
    console.error('AI Chat error:', error)
    messages.value.push({
      type: 'ai',
      text: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
      timestamp: new Date()
    })

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to send message to AI assistant',
      life: 3000
    })
  } finally {
    isTyping.value = false
    await nextTick()
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const formatMessage = (text) => {
  // Convert markdown-like formatting to HTML
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Auto-resize textarea
watch(inputMessage, () => {
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.style.height = 'auto'
      messageInput.value.style.height = messageInput.value.scrollHeight + 'px'
    }
  })
})
</script>

<style scoped lang="scss">
.ai-chat-bubble-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  font-family: 'Inter', sans-serif;
}

.ai-chat-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
  }

  &.bubble-active {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  i {
    color: white;
    font-size: 24px;
  }
}

.bubble-pulse {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff4757;
  animation: pulse 2s infinite;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #ff4757;
    animation: pulse 2s infinite 0.5s;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.ai-chat-window {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 380px;
  height: 500px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e1e5e9;
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .chat-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 16px;

    i {
      font-size: 18px;
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    i {
      font-size: 16px;
    }
  }
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
}

.message {
  display: flex;
  gap: 8px;
  max-width: 85%;

  &.user {
    align-self: flex-end;
    flex-direction: row-reverse;

    .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 18px 18px 4px 18px;
    }

    .message-time {
      text-align: right;
      color: #666;
    }
  }

  &.ai {
    align-self: flex-start;

    .message-content {
      background: #f8f9fa;
      color: #333;
      border-radius: 18px 18px 18px 4px;
    }

    .message-time {
      color: #666;
    }
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 14px;
    color: #6c757d;
  }
}

.message-content {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.4;

  .message-text {
    margin-bottom: 4px;

    :deep(code) {
      background: rgba(0, 0, 0, 0.1);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
    }
  }

  .message-time {
    font-size: 11px;
    opacity: 0.7;
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c1c1c1;
    animation: typing 1.4s infinite ease-in-out;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  border: 1px solid #e1e5e9;
  border-radius: 20px;
  padding: 12px 16px;
  font-size: 14px;
  resize: none;
  max-height: 100px;
  overflow: hidden; /* hide scrollbar while auto-resizing */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #667eea;
  }

  &::placeholder {
    color: #6c757d;
  }

  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari */
  }
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  i {
    font-size: 14px;
  }
}

.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

// Responsive design
@media (max-width: 480px) {
  .ai-chat-window {
    width: calc(100vw - 40px);
    right: -10px;
  }

  .ai-chat-bubble {
    width: 50px;
    height: 50px;

    i {
      font-size: 20px;
    }
  }
}
</style>
