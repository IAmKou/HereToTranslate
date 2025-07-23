<template>
  <div class="chat-window">
    <!-- ✅ Header -->
    <div class="chat-header">
      <div class="room-info">
        <div class="avatar">
          {{ roomName[0]?.toUpperCase() || '💬' }}
        </div>
        <div class="room-details">
          <h2 class="room-name">{{ roomName }}</h2>
          <span class="online-status" v-if="participants.length">
            {{ participants.length }} member{{ participants.length !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-button" @click="toggleInfoPanel" :class="{ active: showInfo }">
          <span class="icon">ℹ️</span>
        </button>
        <button class="icon-button" @click="showAddMemberInput = !showAddMemberInput">
          <span class="icon">👥</span>
        </button>
      </div>
    </div>

    <!-- ✅ Add Member Panel -->
    <div v-if="showAddMemberInput" class="add-member-panel">
      <div class="input-group">
        <input
          v-model="newMemberUsernameOrEmail"
          placeholder="Enter username or email"
          @keyup.enter="addMember"
        />
        <div class="button-group">
          <button class="primary" @click="addMember">Add</button>
          <button class="secondary" @click="showAddMemberInput = false">Cancel</button>
        </div>
      </div>
      <p v-if="addMemberError" class="error-text">{{ addMemberError }}</p>
    </div>

    <!-- ✅ Main chat body -->
    <div class="chat-body" :class="{ 'with-info': showInfo }">
      <!-- Messages panel -->
      <div class="messages" ref="messageContainer">
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <span>Loading messages...</span>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
          <button @click="loadMessages">Retry</button>
        </div>

        <div v-if="isConnecting" class="connecting-message">
          <div class="loading-spinner"></div>
          <span>Connecting to chat server...</span>
        </div>

        <!-- Message groups -->
        <template v-for="(group, index) in messageGroups" :key="index">
          <!-- Date separator -->
          <div v-if="group.showDate" class="date-separator">
            {{ formatDate(group.messages[0].createdAt) }}
          </div>

          <!-- Messages in group -->
          <div
            v-for="message in group.messages"
            :key="message._id"
            class="message-wrapper"
            :class="{
              'mine': message.senderId === currentUserId,
              'theirs': message.senderId !== currentUserId,
              'first-in-group': message === group.messages[0],
              'last-in-group': message === group.messages[group.messages.length - 1]
            }"
          >
            <!-- Reply preview if message is a reply -->
            <div v-if="message.replyTo" class="reply-preview-bubble">
              <span class="reply-sender">{{ message.replyTo.senderUsername }}</span>
              <p class="reply-content">{{ message.replyTo.message }}</p>
            </div>

            <!-- Main message bubble -->
            <div
              class="message-bubble"
              @mouseenter="hoveredMessageId = message._id"
              @mouseleave="hoveredMessageId = null"
            >
              <!-- Message header -->
              <div class="message-header" v-if="message === group.messages[0]">
                <span class="sender-name">
                  {{ message.senderId === currentUserId ? 'You' : message.senderUsername }}
                </span>
                <span class="message-time" :title="formatFullTime(message.createdAt)">
                  {{ formatMessageTime(message.createdAt) }}
                </span>
              </div>

              <!-- Message content -->
              <div class="message-content">
                {{ message.message }}
                <span v-if="message.isEdited" class="edited-indicator">(edited)</span>
              </div>

              <!-- Message actions -->
              <div
                class="message-actions"
                v-if="hoveredMessageId === message._id"
              >
                <button class="action-button" @click="() => handleReply(message)">
                  ↩️ Reply
                </button>
                <button
                  v-if="message.senderId === currentUserId"
                  class="action-button"
                  @click="() => startEdit(message)"
                >
                  ✏️ Edit
                </button>
                <button
                  v-if="message.senderId === currentUserId"
                  class="action-button delete"
                  @click="() => handleDelete(message)"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Info panel -->
      <div v-if="showInfo" class="info-panel">
        <div class="info-header">
          <h3>Chat Members</h3>
          <button class="close-button" @click="showInfo = false">×</button>
        </div>
        <div class="participants-list">
          <div
            v-for="user in participants"
            :key="user.id"
            class="participant-item"
            @click="toggleUserDetail(user)"
          >
            <div class="participant-avatar">
              {{ user.username[0]?.toUpperCase() || '?' }}
            </div>
            <div class="participant-info">
              <span class="participant-name">{{ user.username }}</span>
              <span class="participant-role" v-if="user.id === props.createdById">Admin</span>
            </div>
            <button
              v-if="canManageUser(user)"
              class="kick-button"
              @click.stop="kickMember(user.id)"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ Reply preview -->
    <div v-if="replyingTo" class="reply-bar">
      <div class="reply-info">
        <span class="reply-label">Replying to</span>
        <span class="reply-name">{{ replyingTo.senderUsername }}</span>
        <span class="reply-text">{{ replyingTo.message }}</span>
      </div>
      <button class="cancel-reply" @click="replyingTo = null">×</button>
    </div>

    <!-- ✅ Message input -->
    <form class="message-input" @submit.prevent="sendMessage">
      <div class="input-container">
        <textarea
          v-model="msg"
          placeholder="Type a message..."
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="msg += '\n'"
          :rows="Math.min(5, (msg.match(/\n/g) || []).length + 1)"
        ></textarea>
        <div class="input-actions">
          <button
            type="submit"
            class="send-button"
            :disabled="!msg.trim() || isConnecting"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  </div>
</template>


<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, nextTick, computed } from 'vue'
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
  createdById: number;
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

// Add this type for messageGroups
interface MessageGroup {
  showDate: boolean;
  messages: ChatMessage[];
}

const messages = ref<ChatMessage[]>([])
const msg = ref('')
const socket = ref<Socket | null>(null)
const messageContainer = ref<HTMLElement | null>(null)
const isConnecting = ref(true);
const isLoading = ref(true);
const error = ref<string | null>(null);

const hoveredMessageId = ref<string | null>(null)
const editingMessageId = ref<string | null>(null)
const editingText = ref('')
const replyingTo = ref<ChatMessage | null>(null);
const participants = ref<{ id:number; username:string; email:string; phone:string }[]>([]);
const selectedUser = ref<{ id:number; username:string; email:string; phone:string } | null>(null);
const newMemberUsernameOrEmail = ref('');
const addMemberError = ref('');
const showAddMemberInput = ref(false);
const adminUser = ref<{ id:number; username:string } | null>(null);

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

const toggleInfoPanel = () => {
  showInfo.value = !showInfo.value;
};

const loadParticipants = async () => {
  try {
    const res = await axios.get(`/api/chat/rooms/${props.roomId}/participants`);
    console.log('Participants API response:', res.data);
    const data = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.participants)
        ? res.data.participants
        : [];

    participants.value = data;
    if (props.createdById) {
      const admin = participants.value.find(
        u => String(u.id) === String(props.createdById)
      );
      adminUser.value = admin || null;
    } else {
      adminUser.value = null;
    }
  } catch (err) {
    console.error('❌ Failed to load participants:', err);
    participants.value = []; // reset on error
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

  if (target === props.currentUsername) {
    addMemberError.value = "❌ You can't add yourself.";
    return;
  }

  try {
    const res = await axios.get('/api/chat/search', {
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
const kickMember = async (userId: number) => {
  if (!confirm(userId === props.currentUserId ? 'Leave this room?' : 'Kick this member?')) return;
  try {
    await axios.patch(`/api/chat/rooms/${props.roomId}/remove-member`, {
      creatorId: props.currentUserId,
      userId: userId,
    }, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });

    if (userId === props.currentUserId) {
      alert('✅ You left the chat room.');
      location.reload();
    } else {
      await loadParticipants();
      alert('✅ Member removed.');
    }
  } catch (err: any) {
    alert(err.response?.data?.message || '❌ Failed to remove member.');
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

// ✅ Socket connect with dynamic host
const connectSocket = () => {
  if (socket.value && socket.value.connected) return;

  isConnecting.value = true;
  error.value = null;

  // Get the base URL from the current window location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = import.meta.env.PROD ? window.location.port : '3000';
  const wsUrl = `${protocol}//${host}${port ? `:${port}` : ''}`;

  console.log('Connecting to WebSocket at:', wsUrl + '/chat');

  socket.value = io(wsUrl + '/chat', {
    withCredentials: true,
    path: '/api/chat/socket.io',
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  // Connection event handlers
  socket.value.on('connect', () => {
    console.log('✅ Connected to socket');
    isConnecting.value = false;
    error.value = null;
    socket.value?.emit('join_room', props.roomId);
  });

  socket.value.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err);
    error.value = 'Failed to connect to chat server. Retrying...';
  });

  socket.value.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    isConnecting.value = true;
    error.value = 'Disconnected from chat server. Reconnecting...';
  });

  socket.value.on('reconnect', (attemptNumber) => {
    console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
    isConnecting.value = false;
    error.value = null;
    socket.value?.emit('join_room', props.roomId);
  });

  // Message event handlers
  socket.value.on('new_message', (message: ChatMessage) => {
    console.log('📥 new_message received', message);
    messages.value.push(message);
    scrollToBottom();
  });

  socket.value.on('message_edited', (updatedMessage: ChatMessage) => {
    const idx = messages.value.findIndex(m => m._id === updatedMessage._id);
    if (idx !== -1) {
      messages.value[idx] = {
        ...messages.value[idx],
        ...updatedMessage,
        isEdited: true
      };
    }
  });

  socket.value.on('message_deleted', (deletedMessageId: string) => {
    messages.value = messages.value.filter(m => m._id !== deletedMessageId);
  });
};

// ✅ Load messages with error handling
const loadMessages = async () => {
  error.value = null;
  isLoading.value = true;
  try {
    const res = await axios.get(`/api/chat/messages/${props.roomId}`);
    messages.value = res.data;
    scrollToBottom();
  } catch (err: any) {
    console.error('Load failed:', err.message);
    error.value = 'Failed to load messages. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

// ✅ Send message with error handling
const sendMessage = () => {
  const text = msg.value.trim();
  if (!text) return;

  if (!socket.value?.connected) {
    error.value = 'Not connected to chat server. Please wait or refresh the page.';
    return;
  }

  const payload: any = {
    roomId: props.roomId,
    senderId: props.currentUserId,
    senderUsername: props.currentUsername,
    message: text,
  };

  if (replyingTo.value) {
    payload.replyToId = replyingTo.value._id;
  }

  try {
    socket.value.emit('send_message', payload);
    msg.value = '';
    replyingTo.value = null;
    error.value = null;
  } catch (err) {
    console.error('Failed to send message:', err);
    error.value = 'Failed to send message. Please try again.';
  }
};

// Watch for room changes and reconnect
watch(
  () => props.roomId,
  async (newRoomId) => {
    if (newRoomId && newRoomId.length === 24) {
      await loadParticipants();
      await loadMessages();

      if (socket.value?.connected) {
        socket.value.emit('join_room', newRoomId);
      } else {
        connectSocket();
      }
    }
  },
  { immediate: true }
);

// Auto-reconnect on mount
onMounted(() => {
  connectSocket();
});

// Clean up on unmount
onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
    socket.value = null;
  }
});

// Add computed property for message grouping
const messageGroups = computed(() => {
  const groups: MessageGroup[] = [];
  let currentGroup: ChatMessage[] = [];
  let lastDate = '';
  let lastSender: number | null = null;
  let lastTimestamp = 0;

  messages.value.forEach((message, index) => {
    const messageDate = new Date(message.createdAt).toLocaleDateString();
    const messageTimestamp = new Date(message.createdAt).getTime();
    const timeDiff = messageTimestamp - lastTimestamp;

    // Start a new group if:
    // 1. Different date
    // 2. Different sender
    // 3. More than 5 minutes between messages
    if (
      messageDate !== lastDate ||
      message.senderId !== lastSender ||
      timeDiff > 5 * 60 * 1000
    ) {
      if (currentGroup.length > 0) {
        groups.push({
          showDate: messageDate !== lastDate,
          messages: [...currentGroup]
        });
      }
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }

    // Push the last group
    if (index === messages.value.length - 1) {
      groups.push({
        showDate: messageDate !== lastDate,
        messages: [...currentGroup]
      });
    }

    lastDate = messageDate;
    lastSender = message.senderId;
    lastTimestamp = messageTimestamp;
  });

  return groups;
});

// Add helper functions for date formatting
const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

const formatMessageTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Add function to check if user can be managed
const canManageUser = (user: { id: number }) => {
  return (
    props.currentUserId === props.createdById && // Current user is admin
    user.id !== props.createdById && // Target is not admin
    user.id !== props.currentUserId // Not trying to manage self
  );
};
</script>

<style lang="scss" scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
}

/* Header styles */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  height: 64px;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #4263eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.2rem;
}

.room-details {
  display: flex;
  flex-direction: column;
}

.room-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.online-status {
  font-size: 0.85rem;
  color: #868e96;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;

  &:hover {
    background: #f1f3f5;
  }

  &.active {
    background: #e7f5ff;
    color: #339af0;
  }
}

/* Add member panel */
.add-member-panel {
  background: white;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.input-group {
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 0.95rem;

    &:focus {
      outline: none;
      border-color: #339af0;
      box-shadow: 0 0 0 3px rgba(51, 154, 240, 0.1);
    }
  }
}

.button-group {
  display: flex;
  gap: 8px;
}

/* Message container */
.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Date separator */
.date-separator {
  text-align: center;
  margin: 1rem 0;
  position: relative;
  color: #868e96;
  font-size: 0.85rem;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 100px;
    height: 1px;
    background: #dee2e6;
  }

  &::before {
    right: calc(50% + 1rem);
  }

  &::after {
    left: calc(50% + 1rem);
  }
}

/* Message styles */
.message-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  gap: 4px;
  margin: 2px 0;

  &.mine {
    align-self: flex-end;

    .message-bubble {
      background: #4263eb;
      color: white;
      border-radius: 16px 16px 4px 16px;

      .message-time {
        color: rgba(255, 255, 255, 0.7);
      }
    }
  }

  &.theirs {
    align-self: flex-start;

    .message-bubble {
      background: white;
      border-radius: 16px 16px 16px 4px;
    }
  }
}

.message-bubble {
  padding: 8px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sender-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.message-time {
  font-size: 0.75rem;
  color: #868e96;
}

.message-content {
  font-size: 0.95rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.edited-indicator {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-left: 4px;
}

/* Message actions */
.message-actions {
  position: absolute;
  top: -30px;
  right: 0;
  display: flex;
  gap: 4px;
  background: white;
  padding: 4px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.action-button {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #495057;
  border-radius: 4px;

  &:hover {
    background: #f1f3f5;
  }

  &.delete:hover {
    background: #ffe3e3;
    color: #e03131;
  }
}

/* Reply styles */
.reply-bar {
  background: white;
  padding: 8px 12px;
  border-top: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reply-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.reply-label {
  color: #868e96;
}

.reply-name {
  font-weight: 500;
}

.reply-text {
  color: #495057;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.cancel-reply {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  color: #868e96;

  &:hover {
    color: #495057;
  }
}

/* Input area */
.message-input {
  background: white;
  padding: 1rem;
  border-top: 1px solid #e9ecef;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.4;
  max-height: 150px;

  &:focus {
    outline: none;
    border-color: #339af0;
    box-shadow: 0 0 0 3px rgba(51, 154, 240, 0.1);
  }
}

.send-button {
  background: #4263eb;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #364fc7;
  }

  &:disabled {
    background: #adb5bd;
    cursor: not-allowed;
  }
}

/* Info panel */
.info-panel {
  width: 280px;
  background: white;
  border-left: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.info-header {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.participants-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #f8f9fa;
  }
}

.participant-avatar {
  width: 32px;
  height: 32px;
  background: #4263eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.participant-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.participant-name {
  font-weight: 500;
}

.participant-role {
  font-size: 0.8rem;
  color: #868e96;
}

.kick-button {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 0.85rem;
  color: #e03131;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background: #ffe3e3;
  }
}

/* Loading and error states */
.loading-overlay,
.connecting-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e9ecef;
  border-top-color: #4263eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  background: #fff5f5;
  color: #e03131;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0.5rem;

  button {
    background: #e03131;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #c92a2a;
    }
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .message-wrapper {
    max-width: 85%;
  }

  .info-panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 10;
  }

  .date-separator {
    &::before,
    &::after {
      width: 50px;
    }
  }
}

@media (max-width: 480px) {
  .message-wrapper {
    max-width: 95%;
  }

  .room-name {
    font-size: 1rem;
  }

  .input-container {
    flex-direction: column;
    align-items: stretch;
  }

  .send-button {
    height: 40px;
  }
}
</style>

