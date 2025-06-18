<template>
  <div class="chat-room">
    <Card class="chat-container">
      <!-- Chat Header -->
      <template #title>
        <div class="flex justify-content-between align-items-center">
          <div class="flex align-items-center">
            <span>{{ chatRoom?.name }}</span>
            <Chip
              v-if="chatRoom?.isGroupChat"
              label="Group Chat"
              class="ml-2"
            />
          </div>
          <Menu v-if="chatRoom?.isGroupChat" ref="menu" :model="menuItems" :popup="true" />
          <Button
            v-if="chatRoom?.isGroupChat"
            icon="pi pi-ellipsis-v"
            @click="menu.toggle($event)"
            class="p-button-text"
          />
        </div>
      </template>

      <!-- Messages Area -->
      <template #content>
        <div class="messages-container">
          <div
            v-for="message in messages"
            :key="message._id"
            :class="['message', message.senderId === currentUserId ? 'message-sent' : 'message-received']"
          >
            <div class="message-content">
              {{ message.message }}
            </div>
            <div class="message-time">
              {{ formatTime(message.createdAt) }}
            </div>
          </div>
        </div>
      </template>

      <!-- Message Input -->
      <template #footer>
        <div class="message-input">
          <div class="p-inputgroup">
            <InputText
              v-model="newMessage"
              placeholder="Type a message..."
              @keyup.enter="sendMessage"
              :class="{ 'p-invalid': submitted && !newMessage.trim() }"
            />
            <Button
              icon="pi pi-send"
              @click="sendMessage"
              :disabled="!newMessage.trim()"
            />
          </div>
          <small class="p-error" v-if="submitted && !newMessage.trim()">Message cannot be empty</small>
        </div>
      </template>
    </Card>

    <!-- Add Participants Dialog -->
    <Dialog
      v-model:visible="showAddParticipantsDialog"
      modal
      header="Add Participants"
      :style="{ width: '500px' }"
    >
      <div class="p-fluid">
        <div class="field">
          <label for="participants">Select Users</label>
          <MultiSelect
            id="participants"
            v-model="selectedNewParticipants"
            :options="availableUsers"
            optionLabel="name"
            optionValue="id"
            placeholder="Select users"
            :filter="true"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="showAddParticipantsDialog = false" />
        <Button
          label="Add"
          icon="pi pi-check"
          @click="addParticipants"
          :disabled="!selectedNewParticipants.length"
        />
      </template>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { io } from 'socket.io-client';
import { format } from 'date-fns';

interface ChatRoom {
  _id: string;
  name: string;
  participants: number[];
  isGroupChat: boolean;
}

interface ChatMessage {
  _id: string;
  roomId: string;
  senderId: number;
  message: string;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
}

export default defineComponent({
  name: 'ChatRoomView',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const socket = ref<any>(null);
    const chatRoom = ref<ChatRoom | null>(null);
    const messages = ref<ChatMessage[]>([]);
    const newMessage = ref('');
    const currentUserId = Number(localStorage.getItem('userId')) || 0;
    const showAddParticipantsDialog = ref(false);
    const selectedNewParticipants = ref<number[]>([]);
    const availableUsers = ref<User[]>([]);
    const submitted = ref(false);
    const menu = ref();

    const menuItems = [
      {
        label: 'Add Participants',
        icon: 'pi pi-users',
        command: () => {
          showAddParticipantsDialog.value = true;
        }
      }
    ];

    const connectSocket = () => {
      socket.value = io('http://localhost:3000');
      
      socket.value.on('connect', () => {
        console.log('Connected to WebSocket');
        socket.value?.emit('joinRoom', route.params.id);
      });

      socket.value.on('newMessage', (message: ChatMessage) => {
        messages.value.push(message);
      });
    };

    const fetchChatRoom = async () => {
      try {
        const response = await fetch(`/api/chat/rooms/${route.params.id}`);
        chatRoom.value = await response.json();
      } catch (error) {
        console.error('Error fetching chat room:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages/${route.params.id}`);
        messages.value = await response.json();
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    const fetchAvailableUsers = async () => {
      try {
        const response = await fetch('/api/users');
        availableUsers.value = await response.json();
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const sendMessage = async () => {
      submitted.value = true;
      if (!newMessage.value.trim()) return;

      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: route.params.id,
            senderId: currentUserId,
            message: newMessage.value,
          }),
        });

        const message = await response.json();
        messages.value.push(message);
        newMessage.value = '';
        submitted.value = false;
      } catch (error) {
        console.error('Error sending message:', error);
      }
    };

    const addParticipants = async () => {
      try {
        await fetch(`/api/chat/rooms/${route.params.id}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participants: selectedNewParticipants.value,
          }),
        });

        showAddParticipantsDialog.value = false;
        selectedNewParticipants.value = [];
        await fetchChatRoom();
      } catch (error) {
        console.error('Error adding participants:', error);
      }
    };

    const formatTime = (date: string) => {
      return format(new Date(date), 'HH:mm');
    };

    onMounted(() => {
      if (!currentUserId) {
        router.push('/login');
        return;
      }
      connectSocket();
      fetchChatRoom();
      fetchMessages();
      fetchAvailableUsers();
    });

    onBeforeUnmount(() => {
      socket.value?.disconnect();
    });

    return {
      socket,
      chatRoom,
      messages,
      newMessage,
      currentUserId,
      showAddParticipantsDialog,
      selectedNewParticipants,
      availableUsers,
      submitted,
      menu,
      menuItems,
      connectSocket,
      fetchChatRoom,
      fetchMessages,
      fetchAvailableUsers,
      sendMessage,
      addParticipants,
      formatTime,
    };
  },
});
</script>

<style scoped>
.chat-room {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message {
  max-width: 70%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  position: relative;
}

.message-sent {
  align-self: flex-end;
  background-color: var(--primary-color);
  color: var(--primary-color-text);
}

.message-received {
  align-self: flex-start;
  background-color: var(--surface-200);
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}

.message-input {
  padding: 1rem;
  border-top: 1px solid var(--surface-border);
}
</style> 