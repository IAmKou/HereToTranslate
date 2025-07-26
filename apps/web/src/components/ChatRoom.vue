<template>
  <div class="chat-window">
    <!-- ✅ Notification -->
    <Transition name="fade">
      <div
        v-if="showNotification && notification"
        class="notification"
        :class="notification.type"
      >
        {{ notification.message }}
      </div>
    </Transition>

    <!-- ✅ Header -->
    <header class="chat-header">
      <div class="room-info">
        <div class="avatar">
          {{ roomName[0]?.toUpperCase() || '💬' }}
        </div>
        <div class="room-details">
          <h2 class="room-name">
            {{ roomName }}
          </h2>
          <span class="online-status">
            {{ participants.length }} member{{ participants.length !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button
          class="icon-button"
          :class="{ active: showInfo }"
          title="Room info"
          @click="toggleInfoPanel"
        >
          ℹ️
        </button>
        <button
          class="icon-button"
          title="Add member"
          @click="showAddMemberInput = !showAddMemberInput"
        >
          👥
        </button>
      </div>
    </header>

    <!-- ✅ Add Member Panel -->
    <div
      v-if="showAddMemberInput"
      class="add-member-panel"
    >
      <div class="input-group">
        <input
          v-model="newMemberUsernameOrEmail"
          placeholder="Enter username or email"
          @keyup.enter="addMember"
        >
        <div class="button-group">
          <button
            class="primary"
            @click="addMember"
          >
            Add
          </button>
          <button
            class="secondary"
            @click="showAddMemberInput = false"
          >
            Cancel
          </button>
        </div>
      </div>
      <p
        v-if="addMemberError"
        class="error-text"
      >
        {{ addMemberError }}
      </p>
    </div>

    <!-- ✅ Main chat body -->
    <main
      class="chat-body"
      :class="{ 'with-info': showInfo }"
    >
      <!-- Messages -->
      <div
        ref="messageContainer"
        class="messages"
      >
        <!-- Loading & error states -->
        <div
          v-if="isLoading"
          class="loading-overlay"
        >
          <div class="loading-spinner" />
          <span>Loading messages...</span>
        </div>
        <div
          v-if="error"
          class="error-message"
        >
          {{ error }}
          <button @click="loadMessages">
            Retry
          </button>
        </div>
        <div
          v-if="isConnecting"
          class="connecting-message"
        >
          <div class="loading-spinner" />
          <span>Connecting to chat server...</span>
        </div>

        <!-- Message groups -->
        <template
          v-for="(group, gIndex) in messageGroups"
          :key="gIndex"
        >
          <div
            v-if="group.showDate"
            class="date-separator"
          >
            {{ group.date }}
          </div>
          <div
            v-if="group.showTime"
            class="time-separator"
          >
            {{ group.time }}
          </div>

          <div
            v-for="message in group.messages"
            :key="message._id"
            class="message-wrapper"
            :class="{ mine: message.senderId === currentUserId }"
          >
            <!-- Reply reference -->
            <div
              v-if="message.replyTo"
              class="reply-preview-bubble"
            >
              ↪ {{ message.replyTo.senderUsername }}: "{{ message.replyTo.message }}"
            </div>

            <!-- Message bubble -->
            <div
              class="message-bubble"
              @mouseenter="hoveredMessageId = message._id"
              @mouseleave="hoveredMessageId = null"
            >
              <div class="message-header">
                <span
                  class="sender-name"
                  :class="{ mine: message.senderId === currentUserId }"
                >
                  {{ message.senderId === currentUserId ? 'You' : message.senderUsername }}
                </span>
                <span
                  class="message-time"
                  :class="{ mine: message.senderId === currentUserId }"
                  :title="formatFullTime(message.createdAt)"
                >
                  {{ formatMessageTime(message.createdAt) }}
                </span>
              </div>

              <!-- Edit mode -->
              <div
                v-if="editingMessageId === message._id"
                class="edit-container"
              >
                <textarea
                  v-model="editingText"
                  class="edit-input"
                  @keydown.enter.prevent="confirmEdit(message)"
                />
                <div class="edit-actions">
                  <button @click="confirmEdit(message)">
                    💾 Save
                  </button>
                  <button @click="cancelEdit">
                    ✖️ Cancel
                  </button>
                </div>
              </div>

              <!-- Normal message -->
              <div
                v-else
                class="message-content"
              >
                <img
                  v-if="message.fileUrl"
                  :src="message.fileUrl"
                  :alt="message.fileName || 'Image'"
                  class="message-image"
                >
                <span v-else>
                  {{ message.message }}
                  <span
                    v-if="message.isEdited"
                    class="edited-indicator"
                  >(edited)</span>
                </span>
              </div>

              <!-- Actions -->
              <div
                class="message-bubble"
                @mouseenter="hoveredMessageId = message._id"
                @mouseleave="hoveredMessageId = null"
              >
                <!-- header, content… -->
                <div
                  v-if="hoveredMessageId === message._id && editingMessageId !== message._id"
                  class="message-actions"
                >
                  <button
                    title="Reply"
                    @click="handleReply(message)"
                  >
                    ↩️
                  </button>
                  <button
                    v-if="message.senderId === currentUserId"
                    title="Edit"
                    @click="startEdit(message)"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="message.senderId === currentUserId"
                    title="Delete"
                    @click="confirmDelete(message)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
      <!-- ✅ Place this near the bottom of your template, OUTSIDE v-for -->
      <Transition name="fade">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div class="bg-white rounded-xl shadow-lg p-6 w-80">
            <h3 class="text-lg font-semibold mb-4">
              Delete Message?
            </h3>
            <p class="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this message?
            </p>
            <div class="flex justify-end space-x-3">
              <button
                class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                @click="cancelDelete"
              >
                Cancel
              </button>
              <button
                class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                @click="performDelete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>


      <!-- Participants panel -->
      <aside
        v-if="showInfo"
        class="info-panel"
      >
        <h3>Participants</h3>
        <ul>
          <li
            v-for="user in participants"
            :key="user.id"
            :class="{ admin: user.id === props.createdById }"
          >
            <span class="participant-name">{{ user.username }}</span>
            <span
              v-if="user.id === props.createdById"
              class="admin-badge"
            >Admin</span>
            <button
              v-if="canManageUser(user)"
              @click="kickMember(user.id)"
            >
              Remove
            </button>
          </li>
        </ul>
      </aside>
    </main>

    <!-- ✅ Reply bar -->
    <div
      v-if="replyingTo"
      class="reply-bar"
    >
      <div class="reply-info">
        <span class="reply-label">Replying to</span>
        <span class="reply-name">{{ replyingTo.senderUsername }}</span>
        <span class="reply-text">{{ replyingTo.message }}</span>
      </div>
      <button
        class="cancel-reply"
        @click="replyingTo = null"
      >
        ×
      </button>
    </div>

    <!-- ✅ Input -->
    <footer class="input-footer">
      <div class="input-wrapper">
        <textarea
          v-model="msg"
          placeholder="Type a message..."
          class="message-textarea"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="msg += '\n'"
        />
        <div class="input-actions">
          <div class="emoji-wrapper">
            <button
              type="button"
              class="icon-button large"
              title="Insert emoji"
              @click.stop="showEmojiPicker = !showEmojiPicker"
            >
              😊
            </button>
            <!-- Emoji Picker -->
            <div
              v-if="showEmojiPicker"
              class="emoji-board"
              @click.stop
            >
              <!-- Search bar -->
              <div class="emoji-search">
                <input
                  v-model="emojiSearch"
                  type="text"
                  placeholder="Tìm kiếm biểu tượng cảm xúc"
                >
              </div>
              <!-- Tabs -->
              <div class="emoji-tabs">
                <button
                  v-for="tab in emojiTabs"
                  :key="tab.key"
                  :class="{ active: activeTab === tab.key }"
                  @click="activeTab = tab.key"
                >
                  {{ tab.icon }}
                </button>
              </div>
              <!-- Emoji Grid -->
              <div class="emoji-grid">
                <button
                  v-for="emoji in filteredEmojis"
                  :key="emoji"
                  class="emoji-btn"
                  @click="addEmoji(emoji)"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleFileUpload"
          >
          <button
            type="button"
            class="icon-button large"
            title="Attach file"
            @click="fileInput?.click()"
          >
            📎
          </button>
          <button
            type="button"
            class="send-button"
            :disabled="!msg || !msg.replace(/\s/g, '') || isConnecting"
            @click="sendMessage"
          >
            Send
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>


<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import axios from 'axios'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

// ======================== Props & Emits ========================
const props = defineProps<{
  roomId: string
  currentUserId: number
  currentUsername: string
  roomName: string
  createdById: number
}>()

const emit = defineEmits<{
  (e: 'message-received', message: ChatMessage): void
  (e: 'message-updated', message: ChatMessage): void
  (e: 'message-deleted', messageId: string): void
}>()

// ======================== Interfaces ===========================
interface ChatMessage {
  _id: string
  roomId: string
  senderId: number
  senderUsername?: string
  message: string
  createdAt: string
  updatedAt?: string
  isEdited?: boolean
  fileUrl?: string
  fileName?: string
  replyTo?: {
    _id: string
    senderId: number
    senderUsername?: string
    message: string
  }
}

interface Participant {
  id: number
  username: string
  email: string
  phone: string
}

// ======================== State ================================
const messages = ref<ChatMessage[]>([])
const participants = ref<Participant[]>([])
const adminUser = ref<Participant | null>(null)

const msg = ref('')
const replyingTo = ref<ChatMessage | null>(null)

const hoveredMessageId = ref<string | null>(null)
const editingMessageId = ref<string | null>(null)
const editingText = ref('')

const showInfo = ref(false)
const showAddMemberInput = ref(false)
const newMemberUsernameOrEmail = ref('')
const addMemberError = ref('')

// Socket and status
const socket = ref<Socket | null>(null)
const isConnecting = ref(true)
const isLoading = ref(true)
const error = ref<string | null>(null)

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const uploadProgress = ref(0)

// Notification
const notification = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
const showNotification = ref(false)

// ================== EMOJI BOARD ==================
const showEmojiPicker = ref(false)
const emojiSearch = ref('')

// Tabs and emojis
const emojiTabs = [
  { key: 'smileys', icon: '😊', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎'] },
  { key: 'gestures', icon: '👍', emojis: ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','🖖','👋','👏','🙌','👐','🤲','🙏','✍️','💪','🦾'] },
  { key: 'hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { key: 'objects', icon: '🎁', emojis: ['🎁','🎈','🎉','🎊','🎃','🎄','🎆','🎇','✨','🎩','🧢','👑','💍','🎤','🎧','🎸','🎹','🎺','🥁','⚽','🏀','🏈','⚾','🎾','🏐'] },
]

const activeTab = ref('smileys')

const filteredEmojis = computed(() => {
  const tab = emojiTabs.find(t => t.key === activeTab.value)
  if (!tab) return []
  if (!emojiSearch.value.trim()) return tab.emojis
  return tab.emojis.filter(e => e.includes(emojiSearch.value.trim()))
})

const addEmoji = (emoji: string) => {
  msg.value += emoji
}

// ======================== Helpers ==============================
const displayNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  notification.value = { message, type }
  showNotification.value = true
  setTimeout(() => (showNotification.value = false), 3000)
}

// Group messages by sender & date
const messageGroups = computed(() => {
  const groups: {
    showDate?: boolean;
    date?: string;
    showTime?: boolean;
    time?: string;
    messages: ChatMessage[];
  }[] = []

  let currentGroup: any = null
  let lastMessageTime: dayjs.Dayjs | null = null

  messages.value.forEach((m, i) => {
    const mTime = dayjs(m.createdAt)
    const prev = messages.value[i - 1]

    const newDay = !prev || !dayjs(m.createdAt).isSame(prev.createdAt, 'day')
    const gapMinutes = lastMessageTime ? mTime.diff(lastMessageTime, 'minute') : Infinity
    const needNewGroup =
      !prev ||
      newDay ||
      m.senderId !== prev.senderId ||
      mTime.diff(dayjs(prev.createdAt), 'minute') > 5

    // ✅ show time separator if gap > 10 minutes and not a new day
    const showTime = gapMinutes > 10 && !newDay && i !== 0
    if (showTime) {
      groups.push({ messages: [], showTime: true, time: mTime.format('HH:mm') })
    }

    if (needNewGroup) {
      currentGroup = {
        messages: [m],
        showDate: newDay,
        date: mTime.format('MMMM D, YYYY')
      }
      groups.push(currentGroup)
    } else {
      currentGroup?.messages.push(m)
    }

    lastMessageTime = mTime
  })

  return groups
})


// ======================== Socket Handling ======================
const connectSocket = () => {
  if (socket.value?.connected) return
  isConnecting.value = true
  error.value = null
  const baseUrl = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3000`

  socket.value = io(baseUrl + '/chat', {
    withCredentials: true,
    path: '/api/chat/socket.io',
    transports: ['websocket', 'polling'], // ✅ allow fallback
  })

  socket.value.on('connect', () => {
    isConnecting.value = false
    socket.value?.emit('join_room', props.roomId)
  })

  socket.value.on('new_message', (message: ChatMessage) => {
    messages.value.push(message)
    scrollToBottom()
    emit('message-received', message)
  })

  socket.value.on('message_edited', (updated: ChatMessage) => {
    const idx = messages.value.findIndex(m => m._id === updated._id)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], ...updated, isEdited: true }
      emit('message-updated', updated)
    }
  })

  socket.value.on('message_deleted', (deletedId: string) => {
    messages.value = messages.value.filter(m => m._id !== deletedId)
    emit('message-deleted', deletedId)
  })

  socket.value.on('disconnect', () => {
    isConnecting.value = true
  })

  socket.value.on('connect_error', (err) => {
    console.error('❌ Socket connect error:', err)
    error.value = 'Connection error'
  })
}

// ======================== Message Actions ======================
const sendMessage = () => {
  const text = msg.value
  if ((!text || text.replace(/\s/g, '') === '') && !replyingTo.value) {
    return // nothing to send
  }
  if (!msg.value.trim() || !socket.value?.connected) return
  socket.value.emit('send_message', {
    roomId: props.roomId,
    senderId: props.currentUserId,
    senderUsername: props.currentUsername,
    message: msg.value.trim(),
    replyToId: replyingTo.value?._id
  })
  msg.value = ''
  replyingTo.value = null
}

const startEdit = (m: ChatMessage) => {
  editingMessageId.value = m._id
  editingText.value = m.message
}

const cancelEdit = () => {
  editingMessageId.value = null
  editingText.value = ''
}

const confirmEdit = async (m: ChatMessage) => {
  if (!editingText.value.trim()) return cancelEdit()
  try {
    await axios.patch(`/api/chat/messages/${m._id}`, { message: editingText.value.trim() })
    const idx = messages.value.findIndex(x => x._id === m._id)
    if (idx !== -1) messages.value[idx].message = editingText.value.trim()
    messages.value[idx].isEdited = true
    displayNotification('Message edited', 'success')
  } catch {
    displayNotification('Edit failed', 'error')
  }
  cancelEdit()
}

// State for delete confirmation modal
const showDeleteModal = ref(false)
const messageToDelete = ref<ChatMessage | null>(null)

const confirmDelete = (message: ChatMessage) => {
  messageToDelete.value = message
  showDeleteModal.value = true
}

const cancelDelete = () => {
  showDeleteModal.value = false
  messageToDelete.value = null
}

const performDelete = () => {
  if (!messageToDelete.value || !socket.value) return;
  socket.value.emit('delete_message', {
    messageId: messageToDelete.value._id,
    roomId: props.roomId
  });
  showDeleteModal.value = false;
  messageToDelete.value = null;
}


const handleReply = (m: ChatMessage) => {
  replyingTo.value = m
}

const handleFileUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]

  if (!file.type.startsWith('image/')) return displayNotification('Only images allowed', 'error')
  if (file.size > 5 * 1024 * 1024) return displayNotification('Max file size 5MB', 'error')

  isUploading.value = true
  const form = new FormData()
  form.append('file', file)

  try {
    const res = await axios.post('/api/chat/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (e.total) uploadProgress.value = Math.round((e.loaded * 100) / e.total)
      }
    })
    socket.value?.emit('send_message', {
      roomId: props.roomId,
      senderId: props.currentUserId,
      senderUsername: props.currentUsername,
      message: '',
      fileUrl: res.data.url,
      fileName: file.name
    })
    displayNotification('File uploaded', 'success')
  } catch {
    displayNotification('Upload failed', 'error')
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
    if (fileInput.value) fileInput.value.value = ''
  }
}

// ======================== Participants =========================
const loadParticipants = async () => {
  try {
    const res = await axios.get(`/api/chat/rooms/${props.roomId}/participants`)
    participants.value = res.data.participants
    adminUser.value = participants.value.find(u => u.id === props.createdById) || null
  } catch {
    participants.value = []
  }
}

const addMember = async (): Promise<void> => {
  addMemberError.value = '';

  const target = newMemberUsernameOrEmail.value.trim();
  if (!target) {
    // no-op, just exit
    return;
  }

  if (target === props.currentUsername) {
    addMemberError.value = "❌ You can't add yourself.";
    return;
  }

  try {
    const res = await axios.get('/api/chat/search', {
      params: { q: target },
    });

    const targetUser = res.data;
    if (!targetUser || !targetUser.id) {
      addMemberError.value = '❌ User not found.';
      return;
    }

    await axios.patch(`/api/chat/rooms/${props.roomId}/add-member`, {
      userId: targetUser.id,
    });

    newMemberUsernameOrEmail.value = '';
    showAddMemberInput.value = false;
    await loadParticipants();

    displayNotification(`✅ Added ${targetUser.username} to this room!`, 'success');
  } catch (err: any) {
    console.error(err);
    const message = err.response?.data?.message;
    if (message?.includes('already') || message?.includes('Cannot invite')) {
      addMemberError.value = '❌ This user is already in the chat room.';
    } else {
      addMemberError.value = message || '❌ Failed to add member.';
    }
    return;
  }
};

const kickMember = async (id: number) => {
  if (!confirm(id === props.currentUserId ? 'Leave this room?' : 'Remove member?')) return
  try {
    await axios.patch(`/api/chat/rooms/${props.roomId}/remove-member`, { userId: id })
    if (id === props.currentUserId) location.reload()
    else await loadParticipants()
    displayNotification('Member updated', 'success')
  } catch {
    displayNotification('Failed to remove member', 'error')
  }
}

const canManageUser = (user: Participant) =>
  props.currentUserId === props.createdById || user.id === props.currentUserId

const toggleInfoPanel = () => (showInfo.value = !showInfo.value)

// ======================== Utility ==============================
const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

const formatMessageTime = (t: string) =>
  dayjs(t).isValid() ? dayjs(t).fromNow() : 'Invalid'
const formatFullTime = (timestamp: string): string => {
  const parsed = dayjs(timestamp)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : 'Invalid Date'
}
// ======================== Lifecycle ============================
const messageContainer = ref<HTMLElement | null>(null)

const loadMessages = async () => {
  isLoading.value = true
  try {
    const res = await axios.get(`/api/chat/messages/${props.roomId}`)
    messages.value = res.data
    scrollToBottom()
  } catch {
    error.value = 'Failed to load messages'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.roomId,
  async (newRoomId) => {
    if (newRoomId) {
      await loadParticipants() // ✅ load participants whenever room changes
      await loadMessages()
      socket.value?.emit('join_room', newRoomId)
    }
  },
  { immediate: true }
)

onMounted(() => {
  connectSocket()
  loadParticipants()
  loadMessages()
  document.addEventListener('click', () => (showEmojiPicker.value = false))
})

onUnmounted(() => {
  socket.value?.disconnect()
  if (socket.value) socket.value = null
})
</script>


<style lang="scss" scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f9fafb;
  font-family: system-ui, sans-serif;
}

/* HEADER */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;

  .room-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .avatar {
      width: 40px;
      height: 40px;
      background: #4f46e5;
      color: #fff;
      border-radius: 50%;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .room-details {
      display: flex;
      flex-direction: column;

      .room-name {
        font-weight: 600;
        font-size: 1.1rem;
        margin: 0;
      }

      .online-status {
        font-size: 0.85rem;
        color: #6b7280;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;

    .icon-button {
      border: none;
      background: #f3f4f6;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #e5e7eb;
      }

      &.active {
        background: #e0e7ff;
        color: #4338ca;
      }
    }
  }
}

/* ADD MEMBER PANEL */
.add-member-panel {
  background: #ffffff;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;

  .input-group {
    display: flex;
    gap: 8px;

    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.95rem;

      &:focus {
        border-color: #6366f1;
        outline: none;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
      }
    }

    .button-group {
      display: flex;
      gap: 6px;

      .primary {
        background: #4f46e5;
        color: #fff;
        border: none;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s;
        &:hover {
          background: #4338ca;
        }
      }

      .secondary {
        background: #e5e7eb;
        color: #374151;
        border: none;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        &:hover {
          background: #d1d5db;
        }
      }
    }
  }

  .error-text {
    margin-top: 6px;
    font-size: 0.85rem;
    color: #dc2626;
  }
}

/* CHAT BODY */
.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;

  &.with-info .messages {
    width: 70%;
  }
}

.messages {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 4px;
  }
}

/* DATE SEPARATOR */
.date-separator {
  text-align: center;
  color: #6b7280;
  font-size: 0.8rem;
  margin: 12px 0;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #e5e7eb;
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }
}

/* MESSAGE */
.message-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  margin-bottom: 6px;

  &:not(.mine) {
    align-self: flex-start;
    .message-bubble {
      background: #f3f4f6; /* light gray */
      color: #111827;
      border-radius: 16px 16px 16px 0;
    }
  }

  /* Outgoing message */
  &.mine {
    align-self: flex-end;
    .message-bubble {
      background: #4f46e5; /* soft indigo */
      color: #fff;
      border-radius: 16px 16px 0 16px;
    }
  }

  .message-bubble {
    position: relative;
    padding: 8px 12px;
    font-size: 0.95rem;
    line-height: 1.4;
    word-break: break-word;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);


    .message-header {
      display: flex;
      flex-direction: column;
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .sender-name {
      font-weight: 500;
      color: #000000;
      align-items: flex-start;

      &.mine {
        color: #ffffff;
        align-items: flex-end;
      }
    }

    .message-time {
      font-size: 0.7rem;
      opacity: 0.8;
      color: #000000;
      align-items: flex-start;

      &.mine {
        color: #ffffff;
        align-items: flex-end;
      }
    }



    .message-content {
      font-size: 0.95rem;
      line-height: 1.4;
      word-wrap: break-word;

      .edited-indicator {
        font-size: 0.75rem;
        margin-left: 4px;
        opacity: 0.7;
      }
    }

    .message-actions {
      display: flex;
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

      button {
        background: none;
        border: none;
        padding: 4px 8px;
        font-size: 0.85rem;
        cursor: pointer;
        color: #495057;
        border-radius: 4px;

        &:hover {
          background: #f3f4f6;
        }
        &.delete:hover {
          background: #ffe3e3;
          color: #e03131;
        }
      }
    }

    &:hover .message-actions {
      opacity: 1;
      pointer-events: all;
    }
  }

  .reply-preview-bubble {
    font-size: 0.8rem;
    background: #f3f4f6;
    border-left: 3px solid #4f46e5;
    padding: 4px 6px;
    border-radius: 6px;
    margin-bottom: 4px;
    color: #374151;
  }
}

/* INFO PANEL */
.info-panel {
  width: 30%;
  border-left: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 12px;
  overflow-y: auto;

  h3 {
    margin: 0 0 8px;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      padding: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 6px;
      &:hover {
        background: #f3f4f6;
      }

      .admin-badge {
        background: #4f46e5;
        color: #fff;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        margin-left: 8px;
      }

      button {
        background: #fee2e2;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        &:hover {
          background: #fecaca;
        }
      }
    }
  }
}

/* INPUT FOOTER */
.input-footer {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;

  .input-wrapper {
    display: flex;
    align-items: flex-end;
    background: #f3f4f6;
    border-radius: 12px;
    padding: 6px 8px;
    gap: 8px;

    textarea {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.95rem;
      resize: none;
      line-height: 1.4;
      padding: 8px;
      &:focus {
        outline: none;
      }
    }

    .input-actions {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .icon-button {
      background: #e5e7eb;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      transition: background 0.2s;

      &:hover {
        background: #d1d5db;
      }
    }

    .send-button {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      &:hover {
        background: #4338ca;
      }
      &:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }
    }
  }
}

/* NOTIFICATION */
.notification {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 8px;
  color: #fff;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &.success {
    background: #22c55e;
  }

  &.error {
    background: #ef4444;
  }

  &.info {
    background: #3b82f6;
  }
}

/* LOADING SPINNER */
.loading-overlay,
.connecting-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.emoji-board {
  position: absolute;
  bottom: 60px;
  right: 60px;
  width: 320px;
  background: #242526;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  padding: 8px;
  z-index: 999;
}

.emoji-search {
  margin-bottom: 6px;
  input {
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 6px;
    background: #3a3b3c;
    color: #fff;
    font-size: 0.9rem;
    &::placeholder {
      color: #aaa;
    }
    &:focus {
      outline: none;
      background: #4a4b4d;
    }
  }
}

.emoji-tabs {
  display: flex;
  justify-content: space-around;
  margin-bottom: 6px;
  button {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.2rem;
    padding: 4px;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.2s;
    &:hover {
      background: #3a3b3c;
    }
    &.active {
      background: #4f46e5;
    }
  }
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
}

.emoji-btn {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #3a3b3c;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .info-panel {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    z-index: 20;
  }
  .messages {
    width: 100% !important;
  }
}

.time-separator {
  text-align: center;
  color: #6b7280;
  font-size: 0.8rem;
  margin: 8px 0;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #e5e7eb;
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }
}
.message-image {
  max-width: 300px;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}

</style>

