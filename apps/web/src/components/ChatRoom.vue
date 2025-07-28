<template>
  <div class="chat-window">
    <!-- ✅ Notification -->
    <Transition name="notification">
      <div
        v-if="showNotification && notification"
        class="notification"
        :class="notification.type"
      >
        <div class="notification-content">
          <span class="notification-icon">
            <svg
              v-if="notification.type === 'success'"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
            <svg
              v-else-if="notification.type === 'error'"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="15"
                y1="9"
                x2="9"
                y2="15"
              />
              <line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
              />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="12"
                y1="16"
                x2="12"
                y2="12"
              />
              <line
                x1="12"
                y1="8"
                x2="12.01"
                y2="8"
              />
            </svg>
          </span>
          {{ notification.message }}
        </div>
      </div>
    </Transition>

    <!-- ✅ Header with Add Member Panel -->
    <div class="header-container">
      <header class="chat-header">
        <div class="room-info">
          <div class="avatar-container">
            <div class="avatar">
              {{ roomName[0]?.toUpperCase() || '💬' }}
            </div>
            <div class="online-indicator" />
          </div>
          <div class="room-details">
            <h2 class="room-name">
              {{ roomName }}
            </h2>
            <span class="online-status">
              <span class="status-dot" />
              {{ participants.length }} member{{ participants.length !== 1 ? 's' : '' }} online
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="action-btn"
            :class="{ active: showAddMemberInput }"
            title="Add member"
            @click.stop="showAddMemberInput = !showAddMemberInput"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle
                cx="9"
                cy="7"
                r="4"
              />
              <line
                x1="19"
                y1="8"
                x2="19"
                y2="14"
              />
              <line
                x1="22"
                y1="11"
                x2="16"
                y2="11"
              />
            </svg>
          </button>
          <button
            class="action-btn"
            :class="{ active: showInfo }"
            title="Room info"
            @click.stop="toggleInfoPanel"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="12"
                y1="16"
                x2="12"
                y2="12"
              />
              <line
                x1="12"
                y1="8"
                x2="12.01"
                y2="8"
              />
            </svg>
          </button>
        </div>
      </header>

      <!-- ✅ Add Member Panel -->
      <div
        v-if="showAddMemberInput"
        class="add-member-panel"
        @click.stop
      >
        <div class="panel-content">
          <div class="input-group">
            <div class="input-wrapper">
              <svg
                class="input-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                v-model="newMemberUsernameOrEmail"
                placeholder="Enter username or email..."
                class="member-input"
                @keyup.enter="addMember"
              >
            </div>
            <div class="button-group">
              <button
                class="btn-primary"
                @click.stop="addMember"
              >
                Add Member
              </button>
              <button
                class="btn-secondary"
                @click.stop="showAddMemberInput = false"
              >
                Cancel
              </button>
            </div>
          </div>
          <Transition name="fade">
            <div
              v-if="addMemberError"
              class="error-message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <line
                  x1="15"
                  y1="9"
                  x2="9"
                  y2="15"
                />
                <line
                  x1="9"
                  y1="9"
                  x2="15"
                  y2="15"
                />
              </svg>
              {{ addMemberError }}
            </div>
          </Transition>
        </div>
      </div>
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
        @scroll="handleScroll"
      >
        <!-- Loading & error states -->
        <div
          v-if="isLoading"
          class="loading-overlay"
        >
          <div class="loading-content">
            <div class="loading-spinner" />
            <span>Loading messages...</span>
          </div>
        </div>

        <div
          v-if="error"
          class="error-overlay"
        >
          <div class="error-content">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="15"
                y1="9"
                x2="9"
                y2="15"
              />
              <line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
              />
            </svg>
            <p>{{ error }}</p>
            <button
              class="retry-btn"
              @click="loadMessages"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="23,4 23,10 17,10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Retry
            </button>
          </div>
        </div>

        <div
          v-if="isConnecting"
          class="connecting-overlay"
        >
          <div class="connecting-content">
            <div class="loading-spinner" />
            <span>Connecting to chat server...</span>
          </div>
        </div>

        <!-- Message groups -->
        <div class="message-stream">
          <template
            v-for="(group, gIndex) in messageGroups"
            :key="gIndex"
          >
            <div
              v-if="group.showDate"
              class="date-separator"
            >
              <span class="date-text">{{ group.date }}</span>
            </div>

            <div
              v-if="group.showTime"
              class="time-separator"
            >
              <span class="time-text">{{ group.time }}</span>
            </div>

            <div
              v-for="message in group.messages"
              :key="message._id"
              class="message-container"
              :class="{ 'message-mine': message.senderId === currentUserId }"
            >
              <!-- Reply reference -->
              <div
                v-if="message.replyTo"
                class="reply-reference"
              >
                <div class="reply-line" />
                <div class="reply-content">
                  <span class="reply-author">{{ message.replyTo.senderUsername }}</span>
                  <span class="reply-text">{{ message.replyTo.message }}</span>
                </div>
              </div>

              <!-- Message bubble -->
              <div
                class="message-bubble"
                @mouseenter="hoveredMessageId = message._id"
                @mouseleave="hoveredMessageId = null"
              >
                <!-- Message header for group messages -->
                <div
                  v-if="message.senderId !== currentUserId"
                  class="message-author"
                >
                  <span class="author-name">{{ message.senderUsername }}</span>
                  <span
                    class="message-timestamp"
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
                    class="edit-textarea"
                    @keydown.enter.prevent="confirmEdit(message)"
                    @keydown.escape="cancelEdit"
                  />
                  <div class="edit-actions">
                    <button
                      class="edit-save"
                      @click="confirmEdit(message)"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                      Save
                    </button>
                    <button
                      class="edit-cancel"
                      @click="cancelEdit"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <line
                          x1="18"
                          y1="6"
                          x2="6"
                          y2="18"
                        />
                        <line
                          x1="6"
                          y1="6"
                          x2="18"
                          y2="18"
                        />
                      </svg>
                      Cancel
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
                    @load="scrollToBottom"
                  >
                  <div
                    v-else
                    class="text-content"
                  >
                    {{ message.message }}
                    <span
                      v-if="message.isEdited"
                      class="edited-indicator"
                    >
                      (edited)
                    </span>
                  </div>

                  <!-- Timestamp for own messages -->
                  <div
                    v-if="message.senderId === currentUserId"
                    class="message-time"
                  >
                    {{ formatMessageTime(message.createdAt) }}
                  </div>
                </div>

                <!-- Message actions -->
                <Transition name="fade">
                  <div
                    v-if="hoveredMessageId === message._id && editingMessageId !== message._id"
                    class="message-actions"
                  >
                    <button
                      class="action-item"
                      title="Reply"
                      @click="handleReply(message)"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="9,17 4,12 9,7" />
                        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                      </svg>
                    </button>
                    <button
                      v-if="message.senderId === currentUserId"
                      class="action-item"
                      title="Edit"
                      @click="startEdit(message)"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      v-if="message.senderId === currentUserId"
                      class="action-item delete"
                      title="Delete"
                      @click="confirmDelete(message)"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Delete Message Modal -->
      <Transition name="modal">
        <div
          v-if="showDeleteModal"
          class="modal-overlay"
          @click="cancelDelete"
        >
          <div
            class="modal-content delete-modal"
            @click.stop
          >
            <div class="modal-header">
              <h3>Delete Message?</h3>
            </div>
            <div class="modal-body">
              <p>Are you sure you want to delete this message? This action cannot be undone.</p>
            </div>
            <div class="modal-footer">
              <button
                class="btn-secondary"
                @click="cancelDelete"
              >
                Cancel
              </button>
              <button
                class="btn-danger"
                @click="performDelete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Participants panel -->
      <Transition name="slide-left">
        <aside
          v-if="showInfo"
          class="info-panel"
          @click.stop
        >
          <div class="panel-header">
            <h3>Participants</h3>
            <span class="participant-count">{{ participants.length }}</span>
            <button class="close-panel-btn" @click="showInfo = false">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="participants-list">
            <div
              v-for="user in participants"
              :key="user.id"
              class="participant-item"
              :class="{ admin: user.id === props.createdById }"
            >
              <div class="participant-avatar">
                {{ user.username[0]?.toUpperCase() }}
              </div>
              <div class="participant-info">
                <span class="participant-name">{{ user.username }}</span>
                <span
                  v-if="user.id === props.createdById"
                  class="admin-badge"
                >
                  Admin
                </span>
                <span
                  v-else
                  class="member-badge"
                >Member</span>
              </div>
              <button
                v-if="canManageUser(user)"
                class="remove-btn"
                :title="user.id === props.currentUserId ? 'Leave room' : 'Remove member'"
                @click.stop="kickMember(user.id)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      </Transition>
    </main>

    <!-- ✅ Reply bar -->
    <Transition name="slide-up">
      <div
        v-if="replyingTo"
        class="reply-bar"
      >
        <div class="reply-content">
          <div class="reply-indicator">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="9,17 4,12 9,7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
          <div class="reply-details">
            <span class="reply-label">Đang trả lời {{ replyingTo.senderUsername }}</span>
            <span class="reply-preview">{{ replyingTo.message }}</span>
          </div>
        </div>
        <button
          class="cancel-reply"
          @click="replyingTo = null"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
            />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- ✅ Input -->
    <footer class="input-footer">
      <div class="input-container">
        <div class="message-input-wrapper">
          <textarea
            ref="messageInput"
            v-model="msg"
            placeholder="Type a message..."
            class="message-textarea"
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown.enter.shift.exact="msg += '\n'"
            @input="autoResize"
          />

          <!-- Input actions -->
          <div class="input-actions">
            <!-- Emoji picker -->
            <div class="emoji-wrapper">
              <button
                type="button"
                class="input-action-btn emoji-btn"
                :class="{ active: showEmojiPicker }"
                title="Add emoji"
                @click.stop="showEmojiPicker = !showEmojiPicker"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line
                    x1="9"
                    y1="9"
                    x2="9.01"
                    y2="9"
                  />
                  <line
                    x1="15"
                    y1="9"
                    x2="15.01"
                    y2="9"
                  />
                </svg>
              </button>

              <!-- Enhanced Emoji Picker -->
              <Transition name="scale">
                <div
                  v-if="showEmojiPicker"
                  class="emoji-picker"
                  @click.stop
                >
                  <div class="emoji-header">
                    <div class="emoji-search-wrapper">
                      <svg
                        class="search-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle
                          cx="11"
                          cy="11"
                          r="8"
                        />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <input
                        v-model="emojiSearch"
                        type="text"
                        placeholder="Search emojis..."
                        class="emoji-search"
                      >
                    </div>
                  </div>

                  <div class="emoji-tabs">
                    <button
                      v-for="tab in emojiTabs"
                      :key="tab.key"
                      class="emoji-tab"
                      :class="{ active: activeTab === tab.key }"
                      :title="tab.key"
                      @click="activeTab = tab.key"
                    >
                      {{ tab.icon }}
                    </button>
                  </div>

                  <div class="emoji-grid">
                    <button
                      v-for="emoji in filteredEmojis"
                      :key="emoji"
                      class="emoji-item"
                      :title="emoji"
                      @click="addEmoji(emoji)"
                    >
                      {{ emoji }}
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- File upload -->
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileUpload"
            >
            <button
              type="button"
              class="input-action-btn"
              title="Attach file"
              @click="fileInput?.click()"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
              </svg>
            </button>

            <!-- Send button -->
            <button
              type="button"
              class="send-button"
              :disabled="!msg || !msg.replace(/\s/g, '') || isConnecting"
              @click="sendMessage"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line
                  x1="22"
                  y1="2"
                  x2="11"
                  y2="13"
                />
                <polygon points="22,2 15,22 11,13 2,9 22,2" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Upload progress -->
        <Transition name="slide-up">
          <div
            v-if="isUploading"
            class="upload-progress"
          >
            <div class="progress-content">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
              </svg>
              <span>Uploading...</span>
              <span class="progress-percent">{{ uploadProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: uploadProgress + '%' }"
              />
            </div>
          </div>
        </Transition>
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
import { getChatConfig, getSocketIOConfig } from '../utils/chat-config'

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

  messages.value.forEach((m: ChatMessage, i: number) => {
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

  // Use chat config utility for better RadVPN support
  const config = getChatConfig()
  const socketConfig = getSocketIOConfig(config)

  console.log('🔌 Chat Config:', config)
  console.log('🔌 Connecting to chat server:', config.serverUrl + '/chat')

  socket.value = io(config.serverUrl + '/chat', socketConfig)

  socket.value.on('connect', () => {
    console.log('✅ Socket connected successfully')
    isConnecting.value = false
    error.value = null
    socket.value?.emit('join_room', props.roomId)
  })

  socket.value.on('joined_room', (roomId: string) => {
    console.log('✅ Successfully joined room:', roomId)
  })

  socket.value.on('new_message', (message: ChatMessage) => {
    console.log('📩 Received new message:', message)
    messages.value.push(message)
    scrollToBottom()
    emit('message-received', message)
  })

  socket.value.on('message_edited', (updated: ChatMessage) => {
    console.log('✏️ Message edited:', updated)
    const idx = messages.value.findIndex((m: ChatMessage) => m._id === updated._id)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], ...updated, isEdited: true }
      emit('message-updated', updated)
    }
  })

  socket.value.on('message_deleted', (deletedId: string) => {
    console.log('🗑️ Message deleted:', deletedId)
    messages.value = messages.value.filter((m: ChatMessage) => m._id !== deletedId)
    emit('message-deleted', deletedId)
  })

  socket.value.on('disconnect', (reason: string) => {
    console.log('🔌 Socket disconnected:', reason)
    isConnecting.value = true
    error.value = `Disconnected: ${reason}`
  })

  socket.value.on('connect_error', (err: any) => {
    console.error('❌ Socket connect error:', err)
    isConnecting.value = false

    // Handle specific error types
    if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      error.value = 'Authentication failed. JWT token may have expired. Please refresh the page.'
    } else if (err.message?.includes('CORS')) {
      error.value = 'CORS error. Server may not allow connections from your IP.'
    } else {
      error.value = `Connection failed: ${err.message || 'Unknown error'}`
    }
  })

  socket.value.on('reconnect', (attemptNumber: number) => {
    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts')
    error.value = null
  })

  socket.value.on('reconnect_error', (err: any) => {
    console.error('🔄❌ Reconnect failed:', err)
    error.value = `Reconnection failed: ${err.message || 'Unknown error'}`
  })
}

// ======================== Message Actions ======================
const sendMessage = () => {
  const text = msg.value
  if ((!text || text.replace(/\s/g, '') === '') && !replyingTo.value) {
    return // nothing to send
  }
  if (!msg.value.trim()) return

  if (!socket.value?.connected) {
    console.warn('⚠️ Socket not connected, attempting to reconnect...')
    connectSocket()
    return
  }

  console.log('📤 Sending message:', msg.value.trim())
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

const manualReconnect = () => {
  console.log('🔄 Manual reconnect triggered')
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
  setTimeout(() => {
    connectSocket()
  }, 1000)
}

const debugConnection = () => {
  console.log('=== CHAT DEBUG INFO ===')
  console.log('Socket connected:', socket.value?.connected)
  console.log('Socket ID:', socket.value?.id)
  console.log('Is connecting:', isConnecting.value)
  console.log('Error:', error.value)
  console.log('Room ID:', props.roomId)
  console.log('Current user:', props.currentUserId, props.currentUsername)
  console.log('Messages count:', messages.value.length)
  console.log('Participants count:', participants.value.length)
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
    const idx = messages.value.findIndex((x: ChatMessage) => x._id === m._id)
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
      onUploadProgress: (e: any) => {
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
    adminUser.value = participants.value.find((u: Participant) => u.id === props.createdById) || null
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

const autoResize = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

const handleScroll = () => {
  // Add scroll handling logic if needed for infinite loading
  // This can be used for loading older messages when scrolling to top
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
  async (newRoomId: string) => {
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

  // Only close emoji picker when clicking outside of it
  document.addEventListener('click', (event) => {
    const emojiPicker = document.querySelector('.emoji-picker')
    const emojiButton = document.querySelector('.emoji-btn')

    if (showEmojiPicker.value &&
      emojiPicker &&
      !emojiPicker.contains(event.target as Node) &&
      emojiButton &&
      !emojiButton.contains(event.target as Node)) {
      showEmojiPicker.value = false
    }
  })
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
  background: #ffffff;
  font-family: system-ui, sans-serif;
  overflow: hidden; /* Prevent overall scroll */
}

/* HEADER CONTAINER */
.header-container {
  position: relative;
  background: #ffffff;
  border-bottom: 1px solid #e4e6ea;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* HEADER */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 12px 16px;

  .room-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .avatar-container {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      background: #0084ff;
      color: #fff;
      border-radius: 50%;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .online-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      background: #22c55e; /* Green for online */
      border-radius: 50%;
      border: 2px solid #fff;
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
        display: flex;
        align-items: center;
        gap: 4px;

        .status-dot {
          width: 8px;
          height: 8px;
          background: #22c55e; /* Green for online */
          border-radius: 50%;
        }
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;

    .action-btn {
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
  border-bottom: 1px solid #e4e6ea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 0 0 8px 8px;

  .panel-content {
    padding: 16px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;

      .input-icon {
        position: absolute;
        left: 12px;
        color: #65676b;
        z-index: 1;
      }

      .member-input {
        width: 100%;
        padding: 12px 12px 12px 40px;
        border: 1px solid #e4e6ea;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        background: #f0f2f5;

        &:focus {
          border-color: #0084ff;
          box-shadow: 0 0 0 2px rgba(0, 132, 255, 0.2);
          background: #ffffff;
        }

        &::placeholder {
          color: #65676b;
        }
      }
    }

    .button-group {
      display: flex;
      gap: 8px;
      justify-content: flex-end;

      .btn-primary {
        background: #0084ff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 14px;

        &:hover {
          background: #0066cc;
        }
      }

      .btn-secondary {
        background: #e4e6ea;
        color: #1c1e21;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 14px;

        &:hover {
          background: #d0d2d6;
        }
      }
    }
  }

  .error-message {
    color: #ff4757;
    font-size: 14px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #ffe6e6;
    border-radius: 8px;
    border: 1px solid #ffcccb;
  }
}

/* CHAT BODY */
.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  min-height: 0; /* Important for flex child */

  &.with-info .messages {
    width: 70%;
  }
}

.messages {
  flex: 1;
  padding: 8px 16px;
  overflow-y: auto; /* Only messages can scroll */
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
  min-height: 0; /* Important for scrolling */

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #c1c7cd;
    border-radius: 3px;
    &:hover {
      background: #a8b0b9;
    }
  }
}

/* DATE SEPARATOR */
.date-separator {
  text-align: center;
  color: #65676b;
  font-size: 0.75rem;
  margin: 16px 0;
  position: relative;

  .date-text {
    background: #ffffff;
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: 500;
    color: #65676b;
    display: inline-block;
  }
}

/* TIME SEPARATOR */
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

  .time-text {
    background: #f9fafb;
    padding: 4px 10px;
    border-radius: 8px;
    font-weight: 600;
    color: #374151;
  }
}

/* MESSAGE */
.message-container {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  margin-bottom: 8px;
  align-self: flex-start; /* Default: left side */

  &.message-mine {
    align-self: flex-end; /* My messages: right side */
    align-items: flex-end; /* Align content to right */
    margin-left: auto; /* Push completely to right */
    margin-right: 0;

    .message-bubble {
      background: #0084ff;
      color: #ffffff;

      .message-author {
        color: rgba(255, 255, 255, 0.9);
        text-align: right;
      }

      .message-timestamp {
        color: rgba(255, 255, 255, 0.8);
        text-align: right;
      }

      .message-time {
        color: rgba(255, 255, 255, 0.8);
        text-align: right;
      }

      .text-content {
        text-align: left; /* Keep message text left-aligned even in right bubble */
      }
    }

    .reply-reference {
      align-self: flex-end;
      text-align: right;
    }
  }
}

/* Remove complex animations for messenger-like simplicity */

.message-bubble {
  position: relative;
  padding: 8px 12px;
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-word;
  border-radius: 18px;
  background: #f0f2f5;
  color: #1c1e21;
  max-width: fit-content;
  width: auto;
  display: inline-block; /* Ensure proper sizing */

  .message-author {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 0.75rem;
    color: #6b7280;
    width: 100%;
  }

  .author-name {
    font-weight: 500;
    color: #000000;
  }

  .message-timestamp {
    font-size: 0.7rem;
    opacity: 0.8;
    color: #000000;
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

  .message-image {
    max-width: 300px;
    max-height: 300px;
    object-fit: contain;
    border-radius: 8px;
  }

  .text-content {
    // No specific styles needed here, text-content is the default for normal messages
  }

  .message-time {
    font-size: 0.7rem;
    opacity: 0.8;
    color: #000000;
    margin-top: 4px;
    text-align: right;
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

    .action-item {
      background: none;
      border: none;
      padding: 4px 8px;
      font-size: 0.85rem;
      cursor: pointer;
      color: #495057;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;

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

.reply-reference {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  padding: 4px 6px;
  background: #f3f4f6;
  border-left: 3px solid #4f46e5;
  border-radius: 6px;
  color: #374151;
  font-size: 0.8rem;

  .reply-line {
    width: 10px;
    height: 1px;
    background: #4f46e5;
  }

  .reply-content {
    display: flex;
    flex-direction: column;
  }

  .reply-author {
    font-weight: 500;
    color: #000000;
  }

  .reply-text {
    font-style: italic;
    color: #6b7280;
  }
}

/* INFO PANEL */
.info-panel {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #e4e6ea;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  &.slide-left-enter-active,
  &.slide-left-leave-active {
    transition: transform 0.3s ease-out;
  }

  &.slide-left-enter-from,
  &.slide-left-leave-to {
    transform: translateX(100%);
  }

  &.slide-left-enter-to,
  &.slide-left-leave-from {
    transform: translateX(0);
  }

  .panel-header {
    padding: 16px;
    border-bottom: 1px solid #e4e6ea;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;

    h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #1c1e21;
      font-weight: 600;
    }

    .participant-count {
      color: #65676b;
      font-size: 0.9rem;
      background: #f0f2f5;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .close-panel-btn {
      background: none;
      border: none;
      color: #65676b;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;

      &:hover {
        background: #f0f2f5;
        color: #1c1e21;
      }
    }
  }

  .participants-list {
    flex: 1;
    padding: 8px;
    overflow-y: auto;

    .participant-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 4px;
      transition: background-color 0.2s;

      &:hover {
        background: #f0f2f5;
      }

      &.admin {
        background: #e3f2fd;
        border: 1px solid #2196f3;

        .participant-avatar {
          background: #2196f3;
        }
      }

      .participant-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #0084ff;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        margin-right: 12px;
        font-size: 14px;
      }

      .participant-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .participant-name {
          font-weight: 500;
          color: #1c1e21;
          font-size: 14px;
        }

        .admin-badge {
          font-size: 12px;
          color: #2196f3;
          background: #e3f2fd;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
          width: fit-content;
        }

        .member-badge {
          font-size: 12px;
          color: #65676b;
          font-weight: 400;
        }
      }

      .remove-btn {
        background: #ff4757;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #ff3742;
          transform: scale(1.05);
        }
      }

      &:hover .remove-btn {
        opacity: 1;
      }
    }
  }
}

/* INPUT FOOTER */
.input-footer {
  padding: 8px 16px;
  border-top: 1px solid #e4e6ea;
  background: #ffffff;

  &.slide-up-enter-active,
  &.slide-up-leave-active {
    transition: transform 0.3s ease-out;
  }

  &.slide-up-enter-from,
  &.slide-up-leave-to {
    transform: translateY(100%);
  }

  &.slide-up-enter-to,
  &.slide-up-leave-from {
    transform: translateY(0);
  }

  .input-container {
    display: flex;
    align-items: flex-end;
    background: #f0f2f5;
    border-radius: 20px;
    padding: 6px 8px;
    gap: 8px;

    &:focus-within {
      background: #e4e6ea;
    }
  }

  .message-input-wrapper {
    flex: 1;
    display: flex;
    align-items: flex-end;
  }

  .message-textarea {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.9rem;
    resize: none;
    line-height: 1.4;
    padding: 8px 12px;
    color: #1c1e21;
    &:focus {
      outline: none;
    }
    &::placeholder {
      color: #65676b;
    }
  }

  .input-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .emoji-wrapper {
    position: relative;
  }

  .emoji-btn {
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

    &.active {
      background: #e0e7ff;
      color: #4338ca;
    }
  }

  .emoji-picker {
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

  .emoji-header {
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: #3a3b3c;
    border-radius: 6px;

    .search-icon {
      color: #aaa;
    }

    .emoji-search {
      flex: 1;
      border: none;
      background: transparent;
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

  .emoji-item {
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

  .input-action-btn {
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
    background: #0084ff;
    color: #fff;
    border: none;
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;

    &:hover:not(:disabled) {
      background: #0066cc;
    }

    &:disabled {
      background: #bcc0c4;
      cursor: not-allowed;
    }
  }

  .upload-progress {
    position: absolute;
    bottom: 80px; /* Adjust based on input height */
    left: 50%;
    transform: translateX(-50%);
    background: #f3f4f6;
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: #495057;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .progress-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .progress-percent {
      font-weight: 600;
      color: #4f46e5;
    }

    .progress-bar {
      flex: 1;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #4f46e5;
      border-radius: 3px;
      transition: width 0.3s ease-in-out;
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
  display: flex;
  align-items: center;
  gap: 8px;

  &.notification-enter-active,
  &.notification-leave-active {
    transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
  }

  &.notification-enter-from,
  &.notification-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }

  &.notification-enter-to,
  &.notification-leave-from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notification-icon {
    color: #22c55e; /* Green for success */
  }

  &.error .notification-icon {
    color: #ef4444; /* Red for error */
  }

  &.info .notification-icon {
    color: #3b82f6; /* Blue for info */
  }
}

/* LOADING SPINNER */
.loading-overlay,
.connecting-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.9rem;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  flex-direction: column;

  .loading-content,
  .connecting-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 3px solid #e5e7eb;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

.error-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 15px 20px;
  font-size: 0.9rem;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  flex-direction: column;

  .error-content {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #dc2626;
  }

  .error-icon {
    color: #dc2626;
  }

  .retry-btn {
    background: #4f46e5;
    color: #fff;
    border: none;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.2s;

    &:hover {
      background: #4338ca;
    }
  }
}

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
  z-index: 999;

  &.modal-enter-active,
  &.modal-leave-active {
    transition: opacity 0.3s ease-in-out;
  }

  &.modal-enter-from,
  &.modal-leave-to {
    opacity: 0;
  }

  &.modal-enter-to,
  &.modal-leave-from {
    opacity: 1;
  }

  .modal-content {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 400px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #374151;
      }
    }

    .modal-body {
      p {
        margin: 0 0 10px;
        font-size: 0.9rem;
        color: #6b7280;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;

      .btn-secondary {
        background: #e5e7eb;
        color: #374151;
        border: none;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s;
        &:hover {
          background: #d1d5db;
        }
      }

      .btn-danger {
        background: #ef4444;
        color: #fff;
        border: none;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s;
        &:hover {
          background: #dc2626;
        }
      }
    }
  }
}

.reply-bar {
  background: #f0f2f5;
  border-top: 1px solid #e4e6ea;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0;
  border-radius: 0;

  &.slide-up-enter-active,
  &.slide-up-leave-active {
    transition: all 0.3s ease-out;
  }

  &.slide-up-enter-from,
  &.slide-up-leave-to {
    opacity: 0;
    transform: translateY(10px);
  }

  &.slide-up-enter-to,
  &.slide-up-leave-from {
    opacity: 1;
    transform: translateY(0);
  }

  .reply-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .reply-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0084ff;
  }

  .reply-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .reply-label {
    font-size: 0.75rem;
    color: #65676b;
    font-weight: 500;
  }

  .reply-preview {
    font-size: 0.875rem;
    color: #1c1e21;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cancel-reply {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #65676b;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: #e4e6ea;
      color: #1c1e21;
    }
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

</style>

