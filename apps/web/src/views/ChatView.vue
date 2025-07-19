<template>
  <div class="chat-layout">
    <!-- Sidebar -->
    <div class="chat-sidebar">
      <h2 class="welcome">Welcome, {{ currentUser.username }}</h2>

      <div class="search-user">
        <input v-model="searchQuery" placeholder="Enter username or email" />
        <button @click="searchAndStartChat">Start Chat</button>
      </div>
      <p v-if="searchError" class="error">{{ searchError }}</p>

      <div class="room-list">
        <h3>Your Chat Rooms</h3>
        <ul>
          <li
            v-for="room in chatRooms"
            :key="getRoomId(room)"
            :class="{ active: selectedRoom && getRoomId(selectedRoom) === getRoomId(room) }"
            @click="openRoom(room)"
          >
            <div class="room-item">
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

    <!-- Main chat area -->
    <div class="chat-main">
      <ChatRoom
        v-if="selectedRoom && selectedRoom._id"
        :roomId="getRoomId(selectedRoom)"
        :currentUserId="currentUser.id"
        :currentUsername="currentUser.username"
        :roomName="selectedRoom.name"
        :createdById="selectedRoom.createdBy"
      />
      <div v-else class="chat-placeholder">
        Select a chat room to start messaging.
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
  createdBy: number;
  oppositeUser?: { id: number; username: string };
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
  return { ...room, _id: getRoomId(room) };
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
    selectedRoom.value = {
      ...room,
      _id: room._id,
      createdBy: room.createdBy ?? 0,
      oppositeUser: room.oppositeUser,
    };
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
      const normalized = { ...normalizeRoomId(room), oppositeUser: room.oppositeUser };
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
  }
};

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
  }
};

onMounted(async () => {
  await fetchCurrentUser();
  await loadChatRooms();
});
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background: #fff;
  overflow: hidden;
}

/* Sidebar */
.chat-sidebar {
  width: 260px;
  background: #f8f8f8;
  border-right: 1px solid #ddd;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.welcome {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
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
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-user button:hover {
  background: #0056b3;
}

.room-list {
  flex: 1;
  overflow-y: auto;
}

.room-list h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

.room-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.room-list li {
  display: flex;
  justify-content: space-between;
  padding: 6px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  font-size: 14px;
}

.room-list li.active {
  background: #e6f0ff;
  font-weight: bold;
}

.room-list li:hover {
  background: #f0f0f0;
}

.room-item {
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

.room-name {
  font-weight: 500;
}

.room-type {
  font-size: 12px;
  color: #777;
}

/* Main chat area */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
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
