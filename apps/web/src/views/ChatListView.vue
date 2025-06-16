<template>
  <div class="chat-list">
    <v-container>
      <v-row>
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <span>Chats</span>
              <v-btn
                color="primary"
                icon
                @click="showNewChatDialog = true"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-card-title>
            <v-list>
              <v-list-item
                v-for="room in chatRooms"
                :key="room._id"
                :to="`/chat/${room._id}`"
                link
              >
                <v-list-item-avatar>
                  <v-avatar color="primary">
                    <span class="white--text">
                      {{ room.isGroupChat ? 'G' : 'D' }}
                    </span>
                  </v-avatar>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title>{{ room.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ room.isGroupChat ? 'Group Chat' : 'Direct Message' }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <router-view></router-view>
        </v-col>
      </v-row>
    </v-container>

    <!-- New Chat Dialog -->
    <v-dialog v-model="showNewChatDialog" max-width="500px">
      <v-card>
        <v-card-title>New Chat</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-switch
              v-model="isGroupChat"
              label="Group Chat"
            ></v-switch>
            
            <v-text-field
              v-if="isGroupChat"
              v-model="chatName"
              label="Chat Name"
              :rules="[(v: string) => !!v || 'Name is required']"
              required
            ></v-text-field>

            <v-autocomplete
              v-model="selectedParticipants"
              :items="users"
              label="Participants"
              multiple
              chips
              :rules="[(v: number[]) => v.length >= (isGroupChat ? 1 : 2) || 'Select at least 2 participants']"
              required
            ></v-autocomplete>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showNewChatDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!valid"
            @click="createChatRoom"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface ChatRoom {
  _id: string;
  name: string;
  participants: number[];
  isGroupChat: boolean;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
}

export default defineComponent({
  name: 'ChatListView',
  setup() {
    const router = useRouter();
    const chatRooms = ref<ChatRoom[]>([]);
    const users = ref<User[]>([]);
    const showNewChatDialog = ref(false);
    const isGroupChat = ref(false);
    const chatName = ref('');
    const selectedParticipants = ref<number[]>([]);
    const valid = ref(false);
    const form = ref();

    const fetchChatRooms = async () => {
      try {
        const response = await fetch('/api/chat/rooms/1'); // TODO: Get current user ID from auth
        const data = await response.json();
        chatRooms.value = data;
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users'); // TODO: Implement user list endpoint
        const data = await response.json();
        users.value = data;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const createChatRoom = async () => {
      if (!form.value.validate()) return;

      try {
        const response = await fetch('/api/chat/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: chatName.value,
            participants: selectedParticipants.value,
            createdBy: 1, // TODO: Get from auth
            isGroupChat: isGroupChat.value,
          }),
        });

        const newRoom = await response.json();
        chatRooms.value.push(newRoom);
        showNewChatDialog.value = false;
        router.push(`/chat/${newRoom._id}`);
      } catch (error) {
        console.error('Error creating chat room:', error);
      }
    };

    onMounted(() => {
      fetchChatRooms();
      fetchUsers();
    });

    return {
      chatRooms,
      users,
      showNewChatDialog,
      isGroupChat,
      chatName,
      selectedParticipants,
      valid,
      form,
      createChatRoom,
    };
  },
});
</script>

<style scoped>
.chat-list {
  height: 100%;
}
</style> 