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
              <div class="user-avatar-container">
                <div class="user-avatar">
                  {{ currentUser.username[0]?.toUpperCase() || '?' }}
                  <div class="online-indicator"></div>
                </div>
              </div>
              <div class="user-info">
                <h2 class="username">
                  {{ currentUser.username }}
                </h2>
                <span class="user-email">{{ currentUser.email }}</span>
                <div class="user-status">Online</div>
              </div>
            </div>

            <!-- Search Section -->
            <div class="search-section">
              <div class="search-container">
                <div class="search-input-wrapper">
                  <span class="search-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="21 21l-4.35-4.35"></path>
                    </svg>
                  </span>
                  <input
                    v-model="searchQuery"
                    placeholder="Search users by name or email..."
                    class="search-input"
                    @keyup.enter="searchAndStartChat"
                  >
                  <div v-if="searchLoading" class="search-loading">
                    <div class="loading-spinner-small"></div>
                  </div>
                </div>
                <button
                  class="search-button"
                  :disabled="!searchQuery.trim() || searchLoading"
                  @click="searchAndStartChat"
                >
                  <span v-if="!searchLoading">Start Chat</span>
                  <div v-else class="loading-spinner-small"></div>
                </button>
              </div>
              <Transition name="slide-down">
                <div v-if="searchError" class="error-message">
                  <span class="error-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </span>
                  {{ searchError }}
                </div>
              </Transition>
            </div>

            <!-- Chat Rooms List -->
            <div class="rooms-section">
              <div class="rooms-header">
                <h3>Your Chats</h3>
                <div class="header-actions">
                  <span class="room-count">{{ chatRooms.length }}</span>
                  <button
                    class="create-group-btn"
                    @click="showCreateGroupModal = true"
                    title="Create group chat"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Create Group Modal -->
              <Transition name="modal">
                <div
                  v-if="showCreateGroupModal"
                  class="modal-overlay"
                  @click="closeCreateGroupModal"
                >
                  <div class="modal-content" @click.stop>
                    <div class="modal-header">
                      <h3>Create Group Chat</h3>
                      <button class="modal-close" @click="closeCreateGroupModal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>

                    <div class="modal-body">
                      <div class="form-group">
                        <label>Group Name</label>
                        <input
                          v-model="groupName"
                          class="form-input"
                          placeholder="Enter group name..."
                        >
                      </div>

                      <div class="form-group">
                        <label>Add Members</label>
                        <div class="member-search">
                          <input
                            v-model="memberQuery"
                            class="form-input"
                            placeholder="Enter email or username..."
                            @keyup.enter="searchMember"
                          >
                          <button
                            class="search-member-btn"
                            @click="searchMember"
                            :disabled="!memberQuery.trim()"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="11" cy="11" r="8"></circle>
                              <path d="21 21l-4.35-4.35"></path>
                            </svg>
                          </button>
                        </div>
                        <Transition name="fade">
                          <p v-if="memberSearchError" class="error-text">
                            {{ memberSearchError }}
                          </p>
                        </Transition>
                      </div>

                      <div v-if="selectedMembers.length > 0" class="selected-members">
                        <label>Selected Members ({{ selectedMembers.length }})</label>
                        <div class="member-tags">
                          <div
                            v-for="member in selectedMembers"
                            :key="member.id"
                            class="member-tag"
                          >
                            <span class="member-avatar">{{ member.username[0]?.toUpperCase() }}</span>
                            <span class="member-name">{{ member.username }}</span>
                            <button class="remove-member" @click="removeMember(member.id)">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="modal-footer">
                      <button class="btn-secondary" @click="closeCreateGroupModal">
                        Cancel
                      </button>
                      <button
                        class="btn-primary"
                        :disabled="!canCreateGroup"
                        @click="handleCreateGroup"
                      >
                        Create Group
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- Room List -->
              <div v-if="chatRooms.length > 0" class="room-list">
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
                  <div class="room-avatar-container">
                    <div class="room-avatar" :class="{ 'is-group': room.isGroupChat }">
                      {{ room.name[0]?.toUpperCase() || '?' }}
                    </div>
                    <div v-if="!room.isGroupChat" class="online-indicator-small"></div>
                  </div>

                  <div class="room-info">
                    <div class="room-header">
                      <span class="room-name">{{ room.name }}</span>
                      <span class="room-time">2m</span>
                    </div>
                    <div class="room-preview">
                      <span v-if="room.isGroupChat" class="member-count">
                        {{ room.members?.length || 0 }} members
                      </span>
                      <span v-else class="last-message">
                        Last message preview...
                      </span>
                    </div>
                    <div v-if="room.isGroupChat" class="room-type-badge">
                      Group
                    </div>
                  </div>

                  <div class="room-actions">
                    <button
                      class="action-button edit"
                      :title="'Rename ' + room.name"
                      @click.stop="renameRoom(room)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                    </button>
                    <button
                      class="action-button delete"
                      :title="'Delete ' + room.name"
                      @click.stop="confirmDeleteRoom(room)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <div class="empty-illustration">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h4>No conversations yet</h4>
                <p>Search for users above to start your first chat</p>
              </div>
            </div>
          </div>

          <!-- Delete Room Modal -->
          <Transition name="modal">
            <div
              v-if="showRoomDeleteModal"
              class="modal-overlay"
              @click="cancelDeleteRoom"
            >
              <div class="modal-content delete-modal" @click.stop>
                <div class="modal-header">
                  <h3>Delete Chat?</h3>
                </div>
                <div class="modal-body">
                  <p>Are you sure you want to delete <strong>{{ roomToDelete?.name }}</strong>? This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                  <button class="btn-secondary" @click="cancelDeleteRoom">
                    Cancel
                  </button>
                  <button class="btn-danger" @click="handleDeleteRoom">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </Transition>

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
            <div v-else class="welcome-screen">
              <div class="welcome-content">
                <div class="welcome-illustration">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <path d="M13 8H7"></path>
                    <path d="M17 12H7"></path>
                  </svg>
                </div>
                <h2>Welcome to Chat</h2>
                <p>Select a conversation or start a new one to begin messaging</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue';
import axios from 'axios';
import ChatRoom from '../components/ChatRoom.vue';
import Navbar from '../components/Navbar.vue'
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
const searchLoading = ref(false);
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
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e4e6ea;
  background: #ffffff;
}

.user-avatar-container {
  position: relative;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: #0084ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #42b883;
  border-radius: 50%;
  border: 2px solid white;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.username {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1c1e21;
}

.user-email {
  font-size: 0.875rem;
  color: #65676b;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.user-status {
  font-size: 0.75rem;
  color: #42b883;
  margin-top: 0.25rem;
}

/* Search Section */
.search-section {
  padding: 8px 16px;
  border-bottom: 1px solid #e4e6ea;
}

.search-container {
  position: relative;
  margin-bottom: 0.5rem;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #adb5bd;
  font-size: 0.875rem;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: none;
  border-radius: 20px;
  background: #f0f2f5;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    background: #e4e6ea;
  }

  &::placeholder {
    color: #65676b;
  }
}

.search-loading {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 2px solid #adb5bd;
  border-top-color: #4263eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

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

.error-icon {
  color: #e03131;
}

/* Rooms Section */
.rooms-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; /* Important for flex child scrolling */
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-count {
  background: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.create-group-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background: #f1f3f5;
  }

  svg {
    color: #4263eb;
  }
}

.room-list {
  flex: 1;
  overflow-y: auto; /* Only room list can scroll */
  padding: 4px 0;
  min-height: 0; /* Important for scrolling */
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
  margin: 0 8px 2px;

  &:hover {
    background: #f0f2f5;
  }

  &.active {
    background: #e7f3ff;

    .room-name {
      color: #0084ff;
      font-weight: 600;
    }
  }

  &.is-group {
    .room-avatar {
      background: #42b883;
    }
  }
}

.room-avatar-container {
  position: relative;
}

.room-avatar {
  width: 56px;
  height: 56px;
  background: #0084ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  flex-shrink: 0;

  &.is-group {
    background: #42b883;
  }
}

.online-indicator-small {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: #4263eb;
  border-radius: 50%;
  border: 1px solid white;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.room-name {
  font-weight: 500;
  color: #1c1e21;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  font-size: 0.9rem;
}

.room-time {
  font-size: 0.75rem;
  color: #65676b;
  margin-left: auto;
}

.room-preview {
  font-size: 0.8rem;
  color: #65676b;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-top: 2px;
}

.room-type-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  background: #e9ecef;
  color: #495057;
  border-radius: 1rem;
  font-weight: 500;
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

  svg {
    color: #868e96;
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

.empty-illustration {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h4 {
  margin: 0 0 0.5rem;
  font-weight: 500;
  color: #495057;
}

.empty-state p {
  margin: 0 0 0.5rem;
  color: #868e96;
}

/* Welcome Screen */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.welcome-content {
  text-align: center;
  color: #65676b;

  h2 {
    color: #1c1e21;
    margin-bottom: 8px;
  }

  p {
    color: #65676b;
  }
}

.welcome-illustration {
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 500px;
  max-height: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #495057;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background: #f1f3f5;
  }

  svg {
    color: #868e96;
  }
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: #495057;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #4263eb;
    box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.1);
  }
}

.member-search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-member-btn {
  background: #4263eb;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: #364fc7;
  }

  &:disabled {
    background: #adb5bd;
    cursor: not-allowed;
  }

  svg {
    color: white;
  }
}

.error-text {
  color: #e03131;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-members {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.selected-members label {
  display: block;
  font-size: 0.875rem;
  color: #495057;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.member-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #e9ecef;
  border-radius: 12px;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #495057;
}

.member-avatar {
  width: 20px;
  height: 20px;
  background: #4263eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.member-name {
  font-weight: 500;
  color: #495057;
}

.remove-member {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background: #ffe3e3;
  }

  svg {
    color: #e03131;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #dee2e6;
  }

  &:disabled {
    background: #adb5bd;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: #4263eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
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

.btn-danger {
  background: #e03131;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #c92a2a;
  }

  &:disabled {
    background: #e03131;
    cursor: not-allowed;
  }
}

.delete-modal .modal-header {
  background: #fff5f5;
  border-bottom: 1px solid #ffe3e3;
}

.delete-modal .modal-header h3 {
  color: #e03131;
}

.delete-modal .modal-body p {
  color: #868e96;
  font-size: 0.9rem;
}

.delete-modal .modal-footer {
  background: #fff5f5;
  border-top: 1px solid #ffe3e3;
}

.delete-modal .btn-secondary {
  background: #ffe3e3;
  color: #e03131;
}

.delete-modal .btn-danger {
  background: #e03131;
  color: white;
}

.delete-modal .btn-danger:hover:not(:disabled) {
  background: #c92a2a;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .chat-sidebar {
    width: 280px;
  }

  .modal-content {
    width: 95%;
    max-width: 450px;
  }
}

@media (max-width: 768px) {
  .chat-sidebar {
    width: 100%;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);

    &.mobile-open {
      transform: translateX(0);
    }
  }

  .chat-main {
    width: 100%;
  }

  .user-profile {
    padding: 1rem;
    border-bottom: 2px solid #e9ecef;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .search-section {
    padding: 0.75rem;
  }

  .room-item {
    padding: 0.75rem;
    margin-bottom: 0.25rem;
    border-radius: 12px;
  }

  .room-avatar {
    width: 36px;
    height: 36px;
  }

  .modal-content {
    width: 95%;
    margin: 1rem;
    max-height: 85vh;
  }

  .modal-body {
    max-height: 60vh;
    overflow-y: auto;
  }

  .member-tags {
    max-height: 120px;
    overflow-y: auto;
  }
}

@media (max-width: 640px) {
  .page-content {
    padding: 0;
  }

  .chat-layout {
    height: calc(100vh - 64px);
    overflow: hidden;
  }

  .user-profile {
    padding: 0.75rem;
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .user-info {
    text-align: center;
  }

  .search-section {
    padding: 0.5rem;
  }

  .search-container {
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-button {
    width: 100%;
    padding: 0.875rem;
  }

  .rooms-header {
    padding: 0.75rem;
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .room-item {
    padding: 0.625rem;
  }

  .room-info {
    min-width: 0;
  }

  .room-name {
    font-size: 0.9rem;
  }

  .room-preview {
    font-size: 0.8rem;
  }

  .empty-state {
    padding: 1.5rem 1rem;
  }

  .empty-illustration svg {
    width: 48px;
    height: 48px;
  }

  .welcome-illustration svg {
    width: 80px;
    height: 80px;
    color: #65676b;
  }

  .modal-content {
    margin: 0.5rem;
    border-radius: 16px;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    padding: 1rem;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    width: 100%;
    padding: 0.875rem;
  }
}

@media (max-width: 480px) {
  .user-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }

  .username {
    font-size: 1rem;
  }

  .user-email {
    font-size: 0.8rem;
  }

  .room-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
  }

  .room-item {
    padding: 0.5rem;
  }

  .room-actions {
    display: none; /* Hide actions on very small screens */
  }

  .room-item:active .room-actions {
    display: flex; /* Show on touch */
  }
}

/* Touch improvements */
@media (hover: none) and (pointer: coarse) {
  .room-item {
    -webkit-tap-highlight-color: rgba(66, 99, 235, 0.1);
  }

  .action-button,
  .btn-primary,
  .btn-secondary {
    min-height: 44px; /* Apple's recommended minimum touch target */
    min-width: 44px;
  }

  .search-button {
    min-height: 48px;
  }
}

/* Animation transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  height: calc(100vh - 64px); /* Fixed height */
  overflow: hidden; /* Prevent scrolling */

  &.collapsed {
    margin-left: 0;
  }
}

.chat-layout {
  display: flex;
  flex: 1;
  height: 100%;
  margin-left: 250px; /* Space for main sidebar */
  transition: margin-left 0.3s ease;
  overflow: hidden; /* Prevent scrolling */
}

.page-content.collapsed .chat-layout {
  margin-left: 80px; /* Space for collapsed sidebar */
}

.chat-sidebar {
  flex: 0 0 320px;
  background: #ffffff;
  border-right: 1px solid #e4e6ea;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent overall scroll */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.chat-main {
  flex: 1;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent overall scroll */
  height: 100%;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}
.slide-down-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}
.slide-down-enter-to {
  transform: translateY(0);
  opacity: 1;
}
.slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.modal-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.modal-enter-to {
  opacity: 1;
  transform: scale(1);
}
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

</style>
