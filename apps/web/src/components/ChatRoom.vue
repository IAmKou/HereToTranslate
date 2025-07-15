<template>
  <div class="chat-window">
    <div class="messages" ref="messageContainer">
      <div
        class="message"
        v-for="(message, index) in messages"
        :key="message._id"
        :class="{ mine: message.senderId === currentUserId, theirs: message.senderId !== currentUserId }"
        @mouseenter="hoveredMessageId = message._id"
        @mouseleave="hoveredMessageId = null"
      >
        <div class="bubble" :title="formatFullTime(message.createdAt)">
          <!-- Show username only when sender changes -->
          <div
            class="username"
            v-if="index === 0 || messages[index - 1]?.senderId !== message.senderId"
          >
            {{ message.senderId === currentUserId ? 'You' : message.senderUsername || 'Unknown' }}
          </div>

          <!-- Editing state -->
          <div v-if="editingMessageId === message._id" class="edit-container">
            <input
              v-model="editingText"
              @keyup.enter="confirmEdit(message)"
              class="edit-input"
            />
            <button class="save-btn" @click="confirmEdit(message)">💾</button>
            <button class="cancel-btn" @click="cancelEdit">✖️</button>
          </div>
          <div v-else class="message-text">
            {{ message.message }}
            <span v-if="message.isEdited" class="edited-tag">(edited)</span>
          </div>

          <div class="meta" @click="toggleTimestamp(message._id)">
            <span class="timestamp">{{ formatTime(message.createdAt, message._id) }}</span>
          </div>
        </div>

        <!-- Toolbar -->
        <div v-if="hoveredMessageId === message._id" class="toolbar">
          <button class="toolbar-btn" @click="handleReply(message)">💬</button>
          <button
            v-if="message.senderId === currentUserId"
            class="toolbar-btn"
            @click="startEdit(message)"
          >✏️</button>
          <button
            v-if="message.senderId === currentUserId"
            class="toolbar-btn delete"
            @click="handleDelete(message)"
          >🗑️</button>
        </div>
      </div>
    </div>

    <form class="input-container" @submit.prevent="sendMessage">
      <input type="text" v-model="msg" placeholder="Type a message..." />
      <button :disabled="!msg">Send</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, nextTick } from 'vue'
import { io, type Socket } from 'socket.io-client'
import axios from 'axios'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

const props = defineProps<{
  roomId: string
  currentUserId: number
  currentUsername: string
}>()

interface ChatMessage {
  _id: string
  roomId: string
  senderId: number
  senderUsername?: string
  message: string
  createdAt: string
  isEdited?: boolean
  updatedAt?: string
}

const messages = ref<ChatMessage[]>([])
const msg = ref('')
const socket = ref<Socket | null>(null)
const messageContainer = ref<HTMLElement | null>(null)

const hoveredMessageId = ref<string | null>(null)
const editingMessageId = ref<string | null>(null)
const editingText = ref('')

// ✅ Start editing
const startEdit = (message: ChatMessage) => {
  editingMessageId.value = message._id
  editingText.value = message.message
}

// ✅ Cancel editing
const cancelEdit = () => {
  editingMessageId.value = null
  editingText.value = ''
}

// ✅ Confirm editing
const confirmEdit = async (message: ChatMessage) => {
  try {
    const id = String(message._id)
    const { data } = await axios.patch(`/api/chat/messages/${id}`, {
      message: editingText.value
    })
    const idx = messages.value.findIndex(m => String(m._id) === id)
    if (idx !== -1) {
      messages.value[idx].message = data.message
      messages.value[idx].isEdited = true
    }
    cancelEdit()
  } catch (err) {
    console.error('❌ Edit failed:', err)
  }
}

// ✅ Delete message
const handleDelete = async (message: ChatMessage) => {
  if (!confirm('Delete this message?')) return
  try {
    await axios.delete(`/api/chat/messages/${message._id}`)
    messages.value = messages.value.filter(m => m._id !== message._id)
  } catch (err) {
    console.error('❌ Delete failed:', err)
  }
}

// ✅ Reply (customize as needed)
const handleReply = (message: ChatMessage) => {
  alert(`Reply to: ${message.message}`)
}

// ✅ Format times
const formatFullTime = (timestamp: string): string => {
  const parsed = dayjs(timestamp)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : 'Invalid Date'
}

const expandedMessages = ref<Set<string>>(new Set())
const toggleTimestamp = (id: string) => {
  expandedMessages.value.has(id)
    ? expandedMessages.value.delete(id)
    : expandedMessages.value.add(id)
}
const isExpanded = (id: string) => expandedMessages.value.has(id)
const formatTime = (timestamp: string, id: string): string => {
  const parsed = dayjs(timestamp)
  return !parsed.isValid()
    ? 'Invalid Date'
    : isExpanded(id)
      ? parsed.format('YYYY-MM-DD HH:mm:ss')
      : parsed.fromNow()
}

// ✅ Scroll helper
const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

// ✅ Load messages
const loadMessages = async () => {
  try {
    const res = await axios.get(`/api/chat/messages/${props.roomId}`)
    messages.value = res.data
    scrollToBottom()
  } catch (err: any) {
    console.error('Load failed:', err.message)
  }
}

// ✅ Socket connect
const connectSocket = () => {
  if (socket.value && socket.value.connected) return
  socket.value = io('http://localhost:3000/chat', {
    withCredentials: true,
    path: '/api/chat/socket.io',
    transports: ['websocket']
  })
  socket.value.on('connect', () => {
    socket.value?.emit('join_room', props.roomId)
  })
  socket.value.on('new_message', (message: ChatMessage) => {
    messages.value.push(message)
    scrollToBottom()
  })
}

// ✅ Send new message
const sendMessage = () => {
  const text = msg.value.trim()
  if (!text || !socket.value?.connected) return
  const payload = {
    roomId: props.roomId,
    senderId: props.currentUserId,
    senderUsername: props.currentUsername,
    message: text
  }
  socket.value.emit('send_message', payload)
  msg.value = ''
}

// ✅ Watch room change
watch(
  () => props.roomId,
  async (newRoomId) => {
    if (newRoomId && newRoomId.length === 24) {
      await loadMessages()
      socket.value?.connected ? socket.value.emit('join_room', newRoomId) : connectSocket()
    }
  },
  { immediate: true }
)

onMounted(connectSocket)
onUnmounted(() => {
  socket.value?.disconnect()
  socket.value = null
})
</script>

<style lang="scss" scoped>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  height: 100%;
  padding: 12px;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== Bubble ===== */
.message {
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: 70%;

  &.mine {
    align-self: flex-end;
    .bubble {
      background: #0084ff;
      color: #fff;
      border-radius: 18px 18px 0 18px;
      padding: 8px 12px;
    }
  }

  &.theirs {
    align-self: flex-start;
    .bubble {
      background: #e4e6eb;
      color: #050505;
      border-radius: 18px 18px 18px 0;
      padding: 8px 12px;
    }
  }
}

.username {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
}

.message-text {
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.4;
}

.meta {
  font-size: 11px;
  color: #65676b;
  margin-top: 4px;
  align-self: flex-end;
  cursor: pointer;
}

.edited-tag {
  font-size: 10px;
  color: #999;
  margin-left: 4px;
}

/* ===== Toolbar ===== */
.toolbar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.message:hover .toolbar {
  opacity: 1;
  pointer-events: auto;
}

/* ôm sát bubble */
.message.mine .toolbar {
  right: 100px;
}

.message.theirs .toolbar {
  left: 100px;
}

.toolbar-btn {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  transition: background 0.2s;

  &:hover {
    background: #f0f0f0;
  }
}
.toolbar-btn.delete {
  color: #ff4d4f;
}

/* ===== Edit container ===== */
.edit-container {
  display: flex;
  align-items: center;
  gap: 4px;

  .edit-input {
    flex: 1;
    padding: 4px 6px;
    font-size: 14px;
    border: 1px solid #ccc;
    border-radius: 6px;
  }
  .save-btn,
  .cancel-btn {
    padding: 4px 6px;
    cursor: pointer;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
}

/* ===== Input ===== */
.input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #ddd;
  padding: 8px;

  input {
    flex: 1;
    height: 38px;
    border-radius: 20px;
    border: 1px solid #ccc;
    padding: 0 14px;
    font-size: 14px;
    outline: none;
  }

  button {
    border-radius: 20px;
    height: 38px;
    padding: 0 18px;
    background: #0084ff;
    color: #fff;
    font-weight: 600;
    border: none;
    cursor: pointer;

    &:disabled {
      background: #ccc;
    }
  }
}
</style>

