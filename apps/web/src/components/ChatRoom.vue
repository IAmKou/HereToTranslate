<template>
  <div class="chat-window">
    <div class="messages" ref="messageContainer">
      <div
        class="message"
        v-for="(message, index) in messages"
        :key="message._id"
        :class="{ mine: message.senderId === currentUserId, theirs: message.senderId !== currentUserId }"
      >
        <div class="bubble" :title="formatFullTime(message.createdAt)">
          <div
            class="username"
            v-if="index === 0 || messages[index - 1]?.senderId !== message.senderId"
          >
            {{ message.senderId === currentUserId ? 'You' : message.senderUsername || 'Unknown' }}
          </div>
          <div class="message-text">{{ message.message }}</div>
          <div class="meta" @click="toggleTimestamp(message._id)">
            <span class="timestamp">{{ formatTime(message.createdAt, message._id) }}</span>
          </div>
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
import { ref, watch, onUnmounted, onMounted, nextTick } from 'vue';
import { io, type Socket } from 'socket.io-client';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);


const props = defineProps({
  roomId: { type: String, required: true },
  currentUserId: Number,
  currentUsername: String,
});

interface ChatMessage {
  _id: string;
  roomId: string;
  senderId: number;
  senderUsername?: string;
  message: string;
  createdAt: string;
}

const messages = ref<ChatMessage[]>([]);
const msg = ref('');
const socket = ref<Socket | null>(null);
const messageContainer = ref<HTMLElement | null>(null);
const formatFullTime = (timestamp: string): string => {
  const parsed = dayjs(timestamp);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : 'Invalid Date';
};
const expandedMessages = ref<Set<string>>(new Set());

const toggleTimestamp = (id: string) => {
  if (expandedMessages.value.has(id)) {
    expandedMessages.value.delete(id);
  } else {
    expandedMessages.value.add(id);
  }
};

const isExpanded = (id: string) => expandedMessages.value.has(id);

const formatTime = (timestamp: string, id: string): string => {
  const parsed = dayjs(timestamp);
  if (!parsed.isValid()) return 'Invalid Date';
  return isExpanded(id)
    ? parsed.format('YYYY-MM-DD HH:mm:ss')
    : parsed.fromNow();
};


const scrollToBottom = () => {
  nextTick(() => {
    const container = messageContainer.value;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
};

const loadMessages = async () => {
  try {
    const res = await axios.get(`/api/chat/messages/${props.roomId}`);
    messages.value = res.data;
    scrollToBottom();
  } catch (err: any) {
    console.error('Failed to load messages:', err.message);
  }
};

const connectSocket = () => {
  if (socket.value && socket.value.connected) return;

  socket.value = io('http://localhost:3000/chat', {
    withCredentials: true,
    path: '/api/chat/socket.io',
    transports: ['websocket'],
  });

  socket.value.on('connect', () => {
    socket.value?.emit('join_room', props.roomId);
    console.log('[SOCKET] Joined room:', props.roomId);
  });

  socket.value.on('new_message', (message: ChatMessage) => {
    messages.value.push(message);
    scrollToBottom();
  });

  socket.value.on('connect_error', (err) => {
    console.error('[SOCKET] Connection error:', err);
  });
};

const sendMessage = () => {
  const text = msg.value.trim();
  if (!text || !socket.value?.connected) return;

  const payload = {
    roomId: props.roomId,
    senderId: props.currentUserId!,
    senderUsername: props.currentUsername,
    message: text,
  };
  socket.value.emit('send_message', payload);
  msg.value = '';
};

watch(
  () => props.roomId,
  async (newRoomId) => {
    if (newRoomId && newRoomId.length === 24) {
      await loadMessages();
      socket.value?.connected ? socket.value.emit('join_room', newRoomId) : connectSocket();
    }
  },
  { immediate: true }
);

onMounted(connectSocket);
onUnmounted(() => {
  socket.value?.disconnect();
  socket.value = null;
});
</script>

<style lang="scss" scoped>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f9f9f9;
  box-shadow: 1px 1px 6px rgba(0, 0, 0, 0.15);
  height: 100%;
}

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .message {
    display: flex;
    flex-direction: column;

    &.mine {
      align-items: flex-end;

      .bubble {
        background-color: #d1e7dd;
        color: #0f5132;
        border-radius: 15px 15px 0 15px;
        text-align: right;
        align-self: flex-end;
      }
    }

    &.theirs {
      align-items: flex-start;

      .bubble {
        background-color: #f1f1f1;
        color: #333;
        border-radius: 15px 15px 15px 0;
        text-align: left;
        align-self: flex-start;
      }
    }

    .bubble {
      padding: 10px 14px;
      max-width: 70%;
      word-wrap: break-word;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: background-color 0.2s ease;
      cursor: default;
    }

    .username {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .meta {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .input-container {
    display: flex;
    border-top: 1px solid #ddd;

    input {
      flex: 1;
      height: 40px;
      font-size: 16px;
      padding: 0 10px;
      box-sizing: border-box;
      border: none;
      outline: none;
    }

    button {
      width: 75px;
      height: 40px;
      border: none;
      background-color: #007bff;
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  }
  .timestamp {
    display: inline;
    color: #666;
    font-size: 11px;
  }
</style>
