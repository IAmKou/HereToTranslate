<template>
  <div id="chat-app">
    <div class="chat-container">
      <!-- Sidebar -->
      <div class="chat-sidebar">
        <h2 class="welcome">Welcome, {{ currentUser.username }}</h2>

        <!-- 🔍 Start Chat -->
        <div class="search-user">
          <input v-model="searchQuery" placeholder="Enter username or email" />
          <button @click="searchAndStartChat">Start Chat</button>
        </div>
        <p v-if="searchError" class="error">{{ searchError }}</p>

        <!-- 🧾 Chat Rooms -->
        <div class="room-list">
          <h3>Your Chat Rooms</h3>
          <ul>
            <li
              v-for="room in chatRooms"
              :key="getRoomId(room)"
              :class="{ active: selectedRoom && getRoomId(selectedRoom) === getRoomId(room) }"
            >
              <div class="room-item" @click="openRoom(room)">
                <span class="room-name">{{ room.name }}</span>
                <span class="room-type">{{ room.isGroupChat ? 'Group' : 'DM' }}</span>
              </div>
              <div class="room-actions">
                <button @click.stop="renameRoom(room)">✏️</button>
                <button @click.stop="deleteRoom(room)">🗑️</button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Chat Room -->
      <div class="chat-main">
        <ChatRoom
          v-if="selectedRoom && selectedRoom._id"
          :roomId="getRoomId(selectedRoom)"
          :currentUserId="currentUser.id"
          :currentUsername="currentUser.username"
        />
        <div v-else class="chat-placeholder">
          Select a chat room to start messaging.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toRaw } from 'vue';
import axios from 'axios';
import ChatRoom from '../components/ChatRoom.vue';

interface ChatRoomInfo {
  _id: string;
  name: string;
  isGroupChat: boolean;
  members: any[];
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
}

const accessToken = localStorage.getItem('accessToken');

const currentUser = ref<UserInfo>({ id: 0, username: '', email: '' });
const chatRooms = ref<ChatRoomInfo[]>([]);
const selectedRoom = ref<(ChatRoomInfo & { _id: string }) | null>(null);
const searchQuery = ref('');
const searchError = ref('');

function getRoomId(room: any): string {
  const rawRoom = toRaw(room);
  const id = rawRoom._id;
  return typeof id === 'string' ? id : id?.toString?.() || '';
}

function normalizeRoomId(room: any): ChatRoomInfo {
  const rawId = getRoomId(room);
  return { ...room, _id: rawId };
}

const fetchCurrentUser = async () => {
  const res = await axios.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  currentUser.value = {
    id: Number(res.data.id),
    username: res.data.username,
    email: res.data.email,
  };
};

const loadChatRooms = async () => {
  const res = await axios.get(`/api/chat/rooms/${currentUser.value.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  chatRooms.value = (res.data as ChatRoomInfo[]).map(normalizeRoomId);
};

const openRoom = (room: ChatRoomInfo) => {
  const id = getRoomId(room);
  if (id && id.length === 24) {
    selectedRoom.value = { ...room, _id: id };
  }
};

const searchAndStartChat = async () => {
  searchError.value = '';
  const target = searchQuery.value.trim();
  if (!target) return;

  if (target === currentUser.value.username || target === currentUser.value.email) {
    searchError.value = "You can't chat with yourself.";
    return;
  }

  try {
    const res = await axios.post(
      '/api/chat/open-dm',
      { targetIdentifier: target },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const room = res.data as ChatRoomInfo;
    if (room && String(room._id).length === 24) {
      const normalized = normalizeRoomId(room);
      selectedRoom.value = normalized;
      if (!chatRooms.value.find(r => String(r._id) === String(normalized._id))) {
        chatRooms.value.unshift(normalized);
      }
      searchQuery.value = '';
    } else {
      searchError.value = 'Failed to start chat — invalid room';
    }
  } catch (err: any) {
    searchError.value = err.response?.data?.message || 'User not found';
  }
};

/* ✏️ Rename chat room */
const renameRoom = async (room: ChatRoomInfo) => {
  const newName = prompt('Enter new name for this room:', room.name);
  if (!newName || newName.trim() === '' || newName === room.name) return;

  try {
    await axios.patch(
      `/api/chat/rooms/${getRoomId(room)}`,
      { name: newName.trim() },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    room.name = newName.trim();
  } catch (err) {
    alert('Failed to rename room');
    console.error(err);
  }
};

/* 🗑️ Delete chat room */
const deleteRoom = async (room: ChatRoomInfo) => {
  if (!confirm(`Are you sure you want to delete "${room.name}"?`)) return;
  try {
    await axios.delete(`/api/chat/rooms/${getRoomId(room)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    chatRooms.value = chatRooms.value.filter(r => getRoomId(r) !== getRoomId(room));
    if (selectedRoom.value && getRoomId(selectedRoom.value) === getRoomId(room)) {
      selectedRoom.value = null;
    }
  } catch (err) {
    alert('Failed to delete room');
    console.error(err);
  }
};

onMounted(async () => {
  await fetchCurrentUser();
  await loadChatRooms();
});
</script>

<style scoped>
#chat-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.chat-container {
  flex: 1;
  display: flex;
  height: 100%;
  border-top: 1px solid #ddd;
  overflow: hidden;
}

/* Sidebar */
.chat-sidebar {
  background: #f8f8f8;
  border-right: 1px solid #ddd;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.welcome {
  font-size: 16px;
  margin-bottom: 12px;
  font-weight: 600;
}

.search-user {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-user input {
  flex: 1;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.search-user button {
  padding: 6px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
}

.search-user button:hover {
  background-color: #0056b3;
}

.room-list {
  flex: 1;
  overflow-y: auto;
}

.room-list h3 {
  margin-bottom: 8px;
  font-size: 14px;
}

.room-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.room-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  font-size: 14px;
}

.room-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.room-actions {
  display: flex;
  gap: 4px;
}

.room-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.room-actions button:hover {
  color: #007bff;
}

.room-list li.active {
  background-color: #e6f0ff;
  font-weight: bold;
}

.room-list li:hover {
  background-color: #f0f0f0;
}

.room-name {
  font-weight: 500;
}

.room-type {
  font-size: 12px;
  color: #777;
}

.chat-main {
  flex: 1;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 1px solid #eee;
  border-right: 1px solid #eee;
}

.chat-placeholder {
  margin: auto;
  color: #aaa;
  font-size: 16px;
  text-align: center;
  padding: 20px;
}

.error {
  color: red;
  font-size: 13px;
  margin-top: 6px;
}
</style>
