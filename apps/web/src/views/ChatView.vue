<template>
  <div class="page-wrapper">
    <Navbar />
    <div class="page-body">
      <Sidebar
        :collapsed="isCollapsed"
        @update:collapsed="isCollapsed = $event"
      />
      <div
        class="page-content"
        :class="{ collapsed: isCollapsed }"
      >
        <div class="chat-layout">
        <div class="chat-sidebar">
          <!-- User Profile Section -->
          <div class="user-profile">
            <div class="user-avatar">
              {{ currentUser.username[0]?.toUpperCase() || '?' }}
            </div>
            <div class="user-info">
              <h2 class="username">
                {{ currentUser.username }}
              </h2>
              <span class="user-email">{{ currentUser.email }}</span>
            </div>
          </div>

          <!-- Search Section -->
          <div class="search-section">
            <div class="search-container">
              <span class="search-icon">🔍</span>
              <input
                v-model="searchQuery"
                placeholder="Search users by name or email"
                @keyup.enter="searchAndStartChat"
              >
            </div>
            <button
              class="search-button"
              :disabled="!searchQuery.trim()"
              @click="searchAndStartChat"
            >
              Start Chat
            </button>
            <p
              v-if="searchError"
              class="error-message"
            >
              <span class="error-icon">⚠️</span>
              {{ searchError }}
            </p>
          </div>

          <!-- Chat Rooms List -->
          <div class="rooms-section">
            <div class="rooms-header">
              <h3>Your Chats</h3>
              <span class="room-count">{{ chatRooms.length }}</span>
            </div>

            <button
              class="create-group-button"
              @click="showCreateGroupModal = true"
            >
              ➕ Create group
            </button>
            <Transition name="fade">
              <div
                v-if="showCreateGroupModal"
                class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
              >
                <div class="bg-white rounded-xl shadow-lg p-6 w-96">
                  <h3 class="text-lg font-semibold mb-4">
                    Creat group chat
                  </h3>

                  <input
                    v-model="groupName"
                    class="w-full border rounded p-2 mb-3"
                    placeholder="Group name"
                  >

                  <!-- Search and add members -->
                  <div class="flex mb-3 gap-2">
                    <input
                      v-model="memberQuery"
                      class="flex-1 border rounded p-2"
                      placeholder="Enter email/username"
                      @keyup.enter="searchMember"
                    >
                    <button
                      class="px-3 py-2 bg-indigo-500 text-white rounded"
                      @click="searchMember"
                    >
                      🔍
                    </button>
                  </div>
                  <p
                    v-if="memberSearchError"
                    class="text-sm text-red-500 mb-2"
                  >
                    {{ memberSearchError }}
                  </p>

                  <!-- Selected members -->
                  <div class="flex flex-wrap gap-2 mb-3">
                    <span
                      v-for="m in selectedMembers"
                      :key="m.id"
                      class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded flex items-center gap-1"
                    >
                      {{ m.username }}
                      <button
                        class="text-red-500"
                        @click="removeMember(m.id)"
                      >✖</button>
                    </span>
                  </div>

                  <div class="flex justify-end gap-3">
                    <button
                      class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                      @click="closeCreateGroupModal"
                    >
                      Cancel
                    </button>
                    <button
                      class="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      :disabled="!canCreateGroup"
                      @click="handleCreateGroup"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </Transition>

            <div
              v-if="chatRooms.length > 0"
              class="room-list"
            >
              <div
                v-for="room in chatRooms"
                :key="getRoomId(room)"
                class="room-item"
                :class="{
                  active: selectedRoom && getRoomId(selectedRoom) === getRoomId(room),
                  'is-group': room.isGroupChat
                }"
                @click="openRoom(room)"
              >
                <!-- Room Avatar -->
                <div
                  class="room-avatar"
                  :class="{ 'is-group': room.isGroupChat }"
                >
                  {{ room.name[0]?.toUpperCase() || '?' }}
                </div>

                <!-- Room Info -->
                <div class="room-info">
                  <div class="room-name-container">
                    <span class="room-name">{{ room.name }}</span>
                    <span
                      v-if="room.isGroupChat"
                      class="room-type"
                    >Group</span>
                  </div>
                  <span
                    v-if="room.isGroupChat"
                    class="member-count"
                  >
                    {{ room.members?.length || 0 }} members
                  </span>
                </div>

                <!-- Room Actions -->
                <div class="room-actions">
                  <button
                    class="action-button edit"
                    :title="'Rename ' + room.name"
                    @click.stop="renameRoom(room)"
                  >
                    ✏️
                  </button>
                  <button
                    class="action-button delete"
                    :title="'Delete ' + room.name"
                    @click.stop="confirmDeleteRoom(room)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else
              class="empty-state"
            >
              <div class="empty-icon">
                💬
              </div>
              <p>No chats yet</p>
              <span>Search for users to start chatting</span>
            </div>
          </div>
        </div>
        <Transition name="fade">
          <div
            v-if="showRoomDeleteModal"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          >
            <div class="bg-white rounded-xl shadow-lg p-6 w-80">
              <h3 class="text-lg font-semibold mb-4">
                Delete Room?
              </h3>
              <p class="text-sm text-gray-600 mb-6">
                Are you sure you want to delete
                <strong>{{ roomToDelete?.name }}</strong>?
              </p>
              <div class="flex justify-end space-x-3">
                <button
                  class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  @click="cancelDeleteRoom"
                >
                  Cancel
                </button>
                <button
                  class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  @click="handleDeleteRoom"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Transition>
        </div>
        <!-- Main Chat Area -->
        <div class="chat-main">
          <ChatRoom
            v-if="selectedRoom && selectedRoom._id"
            :room-id="getRoomId(selectedRoom)"
            :current-user-id="currentUser.id"
            :current-username="currentUser.username"
            :room-name="selectedRoom.name"
            :created-by-id="selectedRoom.createdBy"
          />
          <div
            v-else
            class="welcome-screen"
          >
            <div class="welcome-content">
              <div class="welcome-icon">
                👋
              </div>
              <h2>Welcome to Chat</h2>
              <p>Select a chat or start a new conversation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue';
import axios from 'axios';
import ChatRoom from '../components/ChatRoom.vue';
import Navbar from '../components/Navbar.vue'
import AppFooter from '../components/AppFooter.vue';
import Sidebar from '../components/Sidebar.vue';
const isCollapsed = ref(false);
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
const showCreateGroupModal = ref(false)
const groupName = ref('')
const memberQuery = ref('')
const selectedMembers = ref<UserInfo[]>([])
const memberSearchError = ref('')

const canCreateGroup = computed(() => {
  const total = selectedMembers.value.length + 1 // +1 là người tạo
  return groupName.value.trim() !== '' && total >= 3
})

const closeCreateGroupModal = () => {
  showCreateGroupModal.value = false
  groupName.value = ''
  memberQuery.value = ''
  selectedMembers.value = []
  memberSearchError.value = ''
}

const searchMember = async () => {
  if (!memberQuery.value.trim()) return
  try {
    const res = await axios.get('/api/chat/search', {
      params: { q: memberQuery.value.trim() },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const user = res.data
    if (user.id === currentUser.value.id) {
      memberSearchError.value = '❌ Không thể thêm chính bạn'
      return
    }
    if (selectedMembers.value.find(m => m.id === user.id)) {
      memberSearchError.value = '❌ Đã thêm người này'
      return
    }
    selectedMembers.value.push(user)
    memberQuery.value = ''
    memberSearchError.value = ''
  } catch (err: any) {
    memberSearchError.value = err.response?.data?.message || '❌ Không tìm thấy user'
  }
}

const removeMember = (id: number) => {
  selectedMembers.value = selectedMembers.value.filter(m => m.id !== id)
}

const handleCreateGroup = async () => {
  try {
    const memberIds = selectedMembers.value.map(m => m.id);

    if (!memberIds.includes(currentUser.value.id)) {
      memberIds.push(currentUser.value.id);
    }
    if (memberIds.length < 3) {
      alert('❌ Cần ít nhất 3 người (bao gồm bạn) để tạo nhóm!');
      return;
    }

    const res = await axios.post('/api/chat/create-group', {
      name: groupName.value.trim(),
      memberIds,
    }, {
      headers: { Authorization: `Bearer ${accessToken}` },
      withCredentials: true,
    });

    const newRoom = {
      ...res.data,
      isGroupChat: true,
      members: res.data.participants || memberIds, // <== cập nhật số member ngay
    };

    chatRooms.value.unshift(newRoom);
    closeCreateGroupModal();
  } catch (err: any) {
    console.error(err);
    alert(err.response?.data?.message || '❌ Tạo nhóm thất bại');
  }
};



function getRoomId(room: any): string {
  const rawRoom = toRaw(room);
  const id = rawRoom._id;
  return typeof id === 'string' ? id : id?.toString?.() || '';
}

function normalizeRoomId(room: any): ChatRoomInfo {
  return { ...room, _id: getRoomId(room) };
}

const fetchCurrentUser = async () => {
  try {
    const res = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    currentUser.value = {
      id: Number(res.data.id),
      username: res.data.username,
      email: res.data.email,
    };
  } catch (err) {
    console.error('Failed to fetch user:', err);
  }
};

const loadChatRooms = async () => {
  try {
    const res = await axios.get(`/api/chat/rooms/${currentUser.value.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    chatRooms.value = (res.data as ChatRoomInfo[]).map(normalizeRoomId);

    // ✅ Fetch member list for each group room
    for (const room of chatRooms.value) {
      if (room.isGroupChat) {
        try {
          const pres = await axios.get(`/api/chat/rooms/${room._id}/participants`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          room.members = pres.data.participants;
        } catch (err) {
          console.warn(`Failed to load members for ${room._id}`);
          room.members = [];
        }
      }
    }
  } catch (err) {
    console.error('Failed to load chat rooms:', err);
  }
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
    searchError.value = "You can't chat with yourself";
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
// modal state
const showRoomDeleteModal = ref(false);
const roomToDelete = ref<ChatRoomInfo | null>(null);

const confirmDeleteRoom = (room: ChatRoomInfo) => {
  roomToDelete.value = room;
  showRoomDeleteModal.value = true;
};

const cancelDeleteRoom = () => {
  showRoomDeleteModal.value = false;
  roomToDelete.value = null;
};

const handleDeleteRoom = async () => {
  if (!roomToDelete.value) return;
  try {
    await axios.delete(`/api/chat/rooms/${roomToDelete.value._id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    chatRooms.value = chatRooms.value.filter(
      (r) => getRoomId(r) !== getRoomId(roomToDelete.value!)
    );
    if (selectedRoom.value && getRoomId(selectedRoom.value) === getRoomId(roomToDelete.value)) {
      selectedRoom.value = null;
    }
    showRoomDeleteModal.value = false;
    roomToDelete.value = null;
  } catch (err) {
    alert('Failed to delete room');
  }
};

onMounted(async () => {
  await fetchCurrentUser();
  await loadChatRooms();
});
</script>

<style lang="scss" scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background: #f8f9fa;
}

/* Sidebar Styles */
.chat-sidebar {
  width: 320px;
  background: white;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* User Profile Section */
.user-profile {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.user-avatar {
  width: 48px;
  height: 48px;
  background: #4263eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.username {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #212529;
}

.user-email {
  font-size: 0.875rem;
  color: #868e96;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

/* Search Section */
.search-section {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.search-container {
  position: relative;
  margin-bottom: 0.5rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #adb5bd;
  font-size: 0.875rem;
}

.search-container input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #4263eb;
    box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.1);
  }

  &::placeholder {
    color: #adb5bd;
  }
}

.search-button {
  width: 100%;
  padding: 0.75rem;
  background: #4263eb;
  color: white;
  border: none;
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

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fff5f5;
  border-radius: 6px;
  color: #e03131;
  font-size: 0.875rem;
}

/* Rooms Section */
.rooms-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rooms-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #495057;
  }
}

.room-count {
  background: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.room-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f8f9fa;
  }

  &.active {
    background: #e7f5ff;

    .room-name {
      color: #1971c2;
    }
  }
}

.room-avatar {
  width: 40px;
  height: 40px;
  background: #4263eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;

  &.is-group {
    background: #37b24d;
  }
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.room-name {
  font-weight: 500;
  color: #495057;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.room-type {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  background: #e9ecef;
  color: #495057;
  border-radius: 1rem;
}

.member-count {
  font-size: 0.75rem;
  color: #868e96;
}

.room-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.room-item:hover .room-actions {
  opacity: 1;
}

.action-button {
  padding: 0.375rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;

  &:hover {
    background: #e9ecef;
  }

  &.delete:hover {
    background: #ffe3e3;
    color: #e03131;
  }
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #868e96;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state p {
  margin: 0 0 0.5rem;
  font-weight: 500;
  color: #495057;
}

.empty-state span {
  font-size: 0.875rem;
}

/* Welcome Screen */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

.welcome-content {
  text-align: center;
  color: #495057;
}

.welcome-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.welcome-content h2 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.welcome-content p {
  margin: 0;
  color: #868e96;
}

/* Responsive Design */
@media (max-width: 768px) {
  .chat-sidebar {
    width: 280px;
  }

  .user-profile {
    padding: 1rem;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .room-item {
    padding: 0.5rem;
  }

  .room-avatar {
    width: 32px;
    height: 32px;
  }
}

@media (max-width: 640px) {
  .chat-layout {
    position: relative;
  }

  .chat-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 10;
    transform: translateX(-100%);
    transition: transform 0.3s ease;

    &.open {
      transform: translateX(0);
    }
  }
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
}
.create-group-button {
  margin: 0.5rem 1rem;
  padding: 0.5rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    background: #4338ca;
  }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-body {
  display: flex;
  flex: 1;
  margin-top: 64px; /* navbar height */
}

.page-content {
  flex: 1;
  display: flex;
  background: #f8f9fa;
  min-height: calc(100vh - 64px); /* adjust for Navbar height */
}

.chat-layout {
  display: flex;
  flex: 1;
  height: 100%;
}

.chat-sidebar {
  flex: 0 0 300px; /* fixed width */
  background: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.chat-main {
  flex: 1;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
}

</style>
