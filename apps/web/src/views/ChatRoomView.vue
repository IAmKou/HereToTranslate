<template>
  <div class="chat-room">
    <v-card class="chat-container">
      <!-- Chat Header -->
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <span>{{ chatRoom?.name }}</span>
          <v-chip
            v-if="chatRoom?.isGroupChat"
            small
            class="ml-2"
            color="primary"
          >
            Group Chat
          </v-chip>
        </div>
        <v-menu v-if="chatRoom?.isGroupChat">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              v-bind="attrs"
              v-on="on"
            >
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="showAddParticipantsDialog = true">
              <v-list-item-title>Add Participants</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-card-title>

      <!-- Messages Area -->
      <v-card-text class="messages-container">
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
      </v-card-text>

      <!-- Message Input -->
      <v-card-actions class="message-input">
        <v-text-field
          v-model="newMessage"
          placeholder="Type a message..."
          @keyup.enter="sendMessage"
          :rules="[(v: string) => !!v.trim() || 'Message cannot be empty']"
          hide-details
          outlined
          dense
        >
          <template v-slot:append>
            <v-btn
              icon
              @click="sendMessage"
              :disabled="!newMessage.trim()"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </template>
        </v-text-field>
      </v-card-actions>
    </v-card>

    <!-- Add Participants Dialog -->
    <v-dialog v-model="showAddParticipantsDialog" max-width="500px">
      <v-card>
        <v-card-title>Add Participants</v-card-title>
        <v-card-text>
          <v-autocomplete
            v-model="selectedNewParticipants"
            :items="availableUsers"
            label="Select Users"
            multiple
            chips
          ></v-autocomplete>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showAddParticipantsDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="addParticipants"
            :disabled="!selectedNewParticipants.length"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
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
  data() {
    return {
      socket: null as any,
      chatRoom: null as ChatRoom | null,
      messages: [] as ChatMessage[],
      newMessage: '',
      currentUserId: Number(localStorage.getItem('userId')) || 0,
      showAddParticipantsDialog: false,
      selectedNewParticipants: [] as number[],
      availableUsers: [] as User[],
    };
  },
  created() {
    if (!this.currentUserId) {
      this.$router.push('/login');
      return;
    }
    this.connectSocket();
    this.fetchChatRoom();
    this.fetchMessages();
    this.fetchAvailableUsers();
  },
  beforeUnmount() {
    this.socket?.disconnect();
  },
  methods: {
    connectSocket() {
      this.socket = io('http://localhost:3000');
      
      this.socket.on('connect', () => {
        console.log('Connected to WebSocket');
        this.socket?.emit('joinRoom', this.$route.params.id);
      });

      this.socket.on('newMessage', (message: ChatMessage) => {
        this.messages.push(message);
      });
    },
    async fetchChatRoom() {
      try {
        const response = await fetch(`/api/chat/rooms/${this.$route.params.id}`);
        this.chatRoom = await response.json();
      } catch (error) {
        console.error('Error fetching chat room:', error);
      }
    },
    async fetchMessages() {
      try {
        const response = await fetch(`/api/chat/messages/${this.$route.params.id}`);
        this.messages = await response.json();
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    },
    async fetchAvailableUsers() {
      try {
        const response = await fetch('/api/users');
        this.availableUsers = await response.json();
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    async sendMessage() {
      if (!this.newMessage.trim()) return;

      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: this.$route.params.id,
            senderId: this.currentUserId,
            message: this.newMessage,
          }),
        });

        const message = await response.json();
        this.messages.push(message);
        this.newMessage = '';
      } catch (error) {
        console.error('Error sending message:', error);
      }
    },
    async addParticipants() {
      try {
        await fetch(`/api/chat/rooms/${this.$route.params.id}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participants: this.selectedNewParticipants,
          }),
        });

        this.showAddParticipantsDialog = false;
        this.selectedNewParticipants = [];
        await this.fetchChatRoom();
      } catch (error) {
        console.error('Error adding participants:', error);
      }
    },
    formatTime(date: string) {
      return format(new Date(date), 'HH:mm');
    },
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
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 12px;
  position: relative;
}

.message-sent {
  align-self: flex-end;
  background-color: #1976d2;
  color: white;
}

.message-received {
  align-self: flex-start;
  background-color: #f5f5f5;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 4px;
}

.message-input {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}
</style> 