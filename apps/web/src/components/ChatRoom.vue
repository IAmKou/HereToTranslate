<template>
  <div class="chat-window">
    <!-- ✅ Header -->
    <div class="chat-header">
      <div class="opposite-user">
        <span class="avatar">💬</span>
        <span class="room-name">{{ roomName }}</span>
      </div>
      <div class="header-actions">
        <button class="info-btn" @click="toggleInfoPanel">ℹ️</button>
        <button class="add-member-btn" @click="showAddMemberInput = !showAddMemberInput">
          ➕ Add Member
        </button>
      </div>
    </div>

    <!-- ✅ Add Member Input -->
    <div v-if="showAddMemberInput" class="add-member-panel">
      <input v-model="newMemberUsernameOrEmail" placeholder="Enter username or email" />
      <button @click="addMember">Add</button>
      <button @click="showAddMemberInput = false">Cancel</button>
    </div>

    <p v-if="addMemberError" class="error">{{ addMemberError }}</p>

    <!-- ✅ Main chat body -->
    <div class="chat-body">
      <div class="messages" ref="messageContainer" :class="{ 'info-open': showInfo }">
        <!-- messages loop -->
        <div
          v-for="(message, index) in messages"
          :key="message._id"
          class="message"
          :class="{ mine: message.senderId === currentUserId, theirs: message.senderId !== currentUserId }"
          @mouseenter="hoveredMessageId = message._id"
          @mouseleave="hoveredMessageId = null"
        >
          <div class="bubble" :title="formatFullTime(message.createdAt)">
            <div
              class="username"
              v-if="index === 0 || messages[index - 1]?.senderId !== message.senderId"
            >
              {{ message.senderId === currentUserId ? 'You' : message.senderUsername || 'Unknown' }}
            </div>

            <!-- edit mode -->
            <div v-if="editingMessageId === message._id" class="edit-container">
              <input v-model="editingText" @keyup.enter="confirmEdit(message)" class="edit-input" />
              <button class="save-btn" @click="confirmEdit(message)">💾</button>
              <button class="cancel-btn" @click="cancelEdit">✖️</button>
            </div>

            <!-- normal mode -->
            <div v-else class="message-content">
              <div v-if="message.replyTo" class="reply-ref">
                ↪ {{ message.replyTo.senderId === currentUserId ? 'You' : message.replyTo.senderUsername || 'Unknown' }}:
                "{{ message.replyTo.message }}"
              </div>
              <div class="message-text">
                {{ message.message }}
                <span v-if="message.isEdited" class="edited-tag">(edited)</span>
              </div>
              <div class="meta" @click="toggleTimestamp(message._id)">
                <span class="timestamp">{{ formatTime(message.createdAt, message._id) }}</span>
              </div>
            </div>
          </div>

          <!-- toolbar -->
          <div v-if="hoveredMessageId === message._id" class="toolbar">
            <button class="toolbar-btn" @click="handleReply(message)">💬</button>
            <button v-if="message.senderId === currentUserId" class="toolbar-btn" @click="startEdit(message)">✏️</button>
            <button v-if="message.senderId === currentUserId" class="toolbar-btn delete" @click="handleDelete(message)">🗑️</button>
          </div>
        </div>
      </div>

      <!-- ✅ Participants panel -->
      <div v-if="showInfo" class="chat-info-panel">
        <h3>Participants</h3>
        <ul class="participants-list">
          <li v-for="user in participants" :key="user.id" class="participant-item">
            <div class="participant-header" @click="toggleUserDetail(user)">
              👤 {{ user.username }}
            </div>
            <div v-if="selectedUser && selectedUser.id === user.id" class="user-detail">
              <p><strong>Name:</strong> {{ selectedUser.username }}</p>
              <p><strong>Email:</strong> {{ selectedUser.email }}</p>
              <p><strong>Phone:</strong> {{ selectedUser.phone }}</p>
              <button @click="selectedUser = null">Close</button>
            </div>
          </li>
        </ul>
      </div>
    </div> <!-- ✅ CLOSE chat-body -->

    <!-- ✅ Reply preview below chat body but above input -->
    <div v-if="replyingTo" class="reply-preview">
      Replying to: {{ replyingTo.senderUsername || 'Unknown' }} - "{{ replyingTo.message }}"
      <button @click="replyingTo = null">Cancel</button>
    </div>

    <!-- ✅ Input pinned at bottom -->
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
  roomId: string;
  currentUserId: number;
  currentUsername: string;
  roomName: string;
}>();

interface ChatMessage {
  _id: string;
  roomId: string;
  senderId: number;
  senderUsername?: string;
  message: string;
  createdAt: string;
  isEdited?: boolean;
  updatedAt?: string;
  replyTo?: {
    _id: string;
    senderId: number;
    senderUsername?: string;
    message: string;
  };
}

const messages = ref<ChatMessage[]>([])
const msg = ref('')
const socket = ref<Socket | null>(null)
const messageContainer = ref<HTMLElement | null>(null)

const hoveredMessageId = ref<string | null>(null)
const editingMessageId = ref<string | null>(null)
const editingText = ref('')
const replyingTo = ref<ChatMessage | null>(null);
const participants = ref<{ id:number; username:string; email:string; phone:string }[]>([]);
const selectedUser = ref<{ id:number; username:string; email:string; phone:string } | null>(null);
const newMemberUsernameOrEmail = ref('');
const addMemberError = ref('');
const showAddMemberInput = ref(false);

const toggleUserDetail = (user: { id:number; username:string; email:string; phone:string }) => {
  // if the same user is clicked again, close it
  if (selectedUser.value && selectedUser.value.id === user.id) {
    selectedUser.value = null;
  } else {
    selectedUser.value = user;
  }
};

const handleReply = (message: ChatMessage) => {
  replyingTo.value = message;
};

const toggleInfoPanel = async () => {
  showInfo.value = !showInfo.value
  if (showInfo.value) {
    const res = await axios.get(`/api/chat/rooms/${props.roomId}/participants`)
    participants.value = res.data
  }
}

const loadParticipants = async () => {
  try {
    const res = await axios.get(`/api/chat/rooms/${props.roomId}/participants`);
    participants.value = res.data;
  } catch (err) {
    console.error('❌ Failed to load participants:', err);
  }
};

// Call when mounted or roomId changes:
watch(
  () => props.roomId,
  async newRoomId => {
    if (newRoomId) {
      await loadParticipants();
    }
  },
  { immediate: true }
);

const addMember = async () => {
  addMemberError.value = '';
  const target = newMemberUsernameOrEmail.value.trim();
  if (!target) return;

  // Prevent adding yourself
  if (target === props.currentUsername) {
    addMemberError.value = "❌ You can't add yourself.";
    return;
  }

  try {
    const res = await axios.get('/api/users/search', {
      params: { q: target },
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });

    const targetUser = res.data;
    if (!targetUser || !targetUser.id) {
      addMemberError.value = '❌ User not found.';
      return;
    }

    await axios.patch(
      `/api/chat/rooms/${props.roomId}/add-member`,
      { userId: targetUser.id },
      { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
    );
    newMemberUsernameOrEmail.value = '';
    showAddMemberInput.value = false;
    await loadParticipants();

    alert(`✅ Added ${targetUser.username} to this room!`);
  } catch (err: any) {
    console.error(err);
    const message = err.response?.data?.message;
    if (message?.includes('already') || message?.includes('Cannot invite')) {
      addMemberError.value = '❌ This user is already in the chat room.';
    } else {
      addMemberError.value = message || '❌ Failed to add member.';
    }
  }
};


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

const showInfo = ref(false)

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
  socket.value = io('http://26.19.116.244:3000/chat', {
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

const sendMessage = () => {
  const text = msg.value.trim();
  if (!text || !socket.value?.connected) return;

  const payload: any = {
    roomId: props.roomId,
    senderId: props.currentUserId,
    senderUsername: props.currentUsername,
    message: text,
  };

  if (replyingTo.value) {
    payload.replyToId = replyingTo.value._id;
  }

  socket.value.emit('send_message', payload);
  msg.value = '';
  replyingTo.value = null;
};

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
/* ====== Header Bar ====== */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #ddd;
  padding: 10px 14px;
}
.opposite-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.opposite-user .avatar {
  width: 32px;
  height: 32px;
  background: #007bff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.opposite-user .username {
  font-weight: bold;
}

.info-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;

    &:hover {
      color: #007bff;
    }
  }

/* ====== Chat body with optional info panel ====== */
.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: width 0.3s ease;
}
.messages.info-open {
  width: 70%;
}
.message.mine {
  align-items: flex-end;
  text-align: right;
}

/* info panel */
.chat-info-panel {
  width: 30%;
  background: #f7f7f7;
  border-left: 1px solid #ddd;
  padding: 12px;
  box-sizing: border-box;
  overflow-y: auto;

  h3 {
    font-size: 16px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  p {
    margin: 6px 0;
    font-size: 14px;
    color: #333;

    strong {
      font-weight: 600;
    }
  }
}
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #ddd;
  padding: 8px;
  background: #fff;
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
  font-size: 12px;
  color: #10192d;
  margin-top: 4px;
  align-self: flex-end;
  cursor: pointer;
}

.edited-tag {
  font-size: 10px;
  color: #100f0f;
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
  pointer-events: all;
}

.message.mine .toolbar {
  right: 100%;
}

.message.theirs .toolbar {
  left: 100%;
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
  .reply-preview {
    background: #eef3ff;
    padding: 6px 10px;
    border-left: 3px solid #007bff;
    margin: 6px 0;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 4px;

    button {
      background: transparent;
      border: none;
      color: #007bff;
      cursor: pointer;
    }
  }
  .reply-ref {
    font-size: 12px;
    color: #444;
    border-left: 2px solid #ccc;
    padding-left: 6px;
    margin-bottom: 4px;
  }
}
.reply-ref {
  font-size: 12px;
  color: #100f0f;
  background: rgba(0,0,0,0.05);
  border-left: 3px solid #007bff;
  padding: 4px 6px;
  margin-bottom: 4px;
  border-radius: 4px;
}

.reply-preview {
  background: #f1f1f1;
  padding: 4px 8px;
  margin-bottom: 6px;
  border-left: 3px solid #007bff;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.room-name {
  font-weight: bold;
  font-size: 16px;
}

.participant-item {
  margin-bottom: 8px;
  .participant-header {
    cursor: pointer;
    padding: 4px 0;
    &:hover {
      color: #007bff;
    }
  }
  .user-detail {
    margin-top: 4px;
    padding: 6px 10px;
    background: #f8f9fa;
    border-radius: 4px;
    font-size: 13px;
    border-left: 3px solid #007bff;
  }
}
.error {
  color: red;
  font-size: 13px;
  margin: 6px 0 0 0;
}
</style>

