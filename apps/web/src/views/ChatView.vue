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
          <p v-if="searchError" class="error">{{ searchError }}</p>
        </div>

        <!-- 🧾 Chat Rooms -->
        <div class="room-list">
          <h3>Your Chat Rooms</h3>
          <ul>
            <li
              v-for="room in chatRooms"
              :key="getRoomId(room)"
              :class="{ active: selectedRoom && getRoomId(selectedRoom) === getRoomId(room) }"
              @click="openRoom(room)"
            >
              {{ room.name }} ({{ room.isGroupChat ? 'Group' : 'DM' }})
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

const currentUser = ref<UserInfo>({
  id: 0,
  username: '',
  email: '',
});

const chatRooms = ref<ChatRoomInfo[]>([]);
const selectedRoom = ref<(ChatRoomInfo & { _id: string }) | null>(null);
const searchQuery = ref('');
const searchError = ref('');

// ✅ Normalize _id for consistent string use
function getRoomId(room: any): string {
  const rawRoom = toRaw(room);
  const id = rawRoom._id;
  return typeof id === 'string' ? id : id?.toString?.() || '';
}

function normalizeRoomId(room: any): ChatRoomInfo {
  const rawId = getRoomId(room);
  if (typeof rawId !== 'string' || rawId.length !== 24) {
    console.warn('⚠️ normalizeRoomId(): invalid _id received:', room._id);
  }
  return {
    ...room,
    _id: rawId,
  };
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
  console.log('✅ Rooms loaded:', chatRooms.value);
};

const openRoom = (room: ChatRoomInfo) => {
  try {
    const id = getRoomId(room);
    if (!id || id.length !== 24) {
      console.warn('❌ Invalid room ID:', id, room);
      return;
    }

    console.log('🟢 Opening room:', id);
    selectedRoom.value = { ...room, _id: id };
  } catch (e) {
    console.error('💥 openRoom error:', e);
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
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const room = res.data as ChatRoomInfo;

    if (room && String(room._id).length === 24) {
      const normalized = normalizeRoomId(room);
      selectedRoom.value = normalized;

      const exists = chatRooms.value.find(
        (r) => String(r._id) === String(normalized._id)
      );
      if (!exists) chatRooms.value.unshift(normalized);

      searchQuery.value = '';
    }
    else {
      console.warn('⚠️ Invalid room received from server:', res.data);
      searchError.value = 'Failed to start chat — invalid room';
    }
  } catch (err: any) {
    console.error('❌ Failed to open chat:', err);
    searchError.value = err.response?.data?.message || 'User not found';
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

.chat-sidebar {
  width: 300px;
  background: #f8f8f8;
  border-right: 1px solid #ddd;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.welcome {
  font-size: 18px;
  margin-bottom: 12px;
}

.search-user {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-user input {
  flex: 1;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.search-user button {
  padding: 6px 12px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.search-user button:hover {
  background-color: #0056b3;
}

.room-list {
  flex: 1;
  overflow-y: auto;
}

.room-list h3 {
  margin-bottom: 10px;
}

.room-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.room-list li {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  transition: background 0.2s;
}

.room-list li.active {
  background-color: #e6f0ff;
  font-weight: bold;
}

.room-list li:hover {
  background-color: #f0f0f0;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.chat-placeholder {
  margin: auto;
  color: #aaa;
  font-size: 16px;
}

.error {
  color: red;
  font-size: 13px;
  margin-top: 6px;
}
</style>

