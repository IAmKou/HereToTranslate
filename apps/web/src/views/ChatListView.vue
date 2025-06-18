<template>
  <div class="chat-list">
    <div class="grid">
      <div class="col-12 md:col-4">
        <Card>
          <template #title>
            <div class="flex justify-content-between align-items-center">
              <span>Chats</span>
              <Button icon="pi pi-plus" @click="showNewChatDialog = true" />
            </div>
          </template>
          <template #content>
            <!-- User Search Area -->
            <div class="mb-3">
              <div class="p-inputgroup">
                <InputText
                  v-model="userSearchQuery"
                  placeholder="Search by name..."
                  class="w-full"
                  @input="onUserSearch"
                />
                <Button
                  icon="pi pi-search"
                  class="p-button-text"
                />
              </div>
              <!-- Search Results -->
              <div v-if="userSearchQuery" class="search-results mt-2">
                <div v-if="searchResults.length > 0" class="flex flex-column gap-2">
                  <div v-for="user in searchResults" :key="user.id"
                       class="p-2 surface-100 border-round cursor-pointer hover:surface-200"
                       @click="startChatWithUser(user)">
                    <div class="flex align-items-center">
                      <Avatar :label="user.fullName.charAt(0).toUpperCase()" class="mr-2" />
                      <div>
                        <div class="font-bold">{{ user.fullName }}</div>
                        <small class="text-500">@{{ user.username }}</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="p-2 text-500">
                  No users found
                </div>
              </div>
            </div>

            <Divider />

            <Listbox
              v-model="selectedRoom"
              :options="chatRooms"
              optionLabel="name"
              class="w-full"
              @change="onRoomSelect"
            >
              <template #option="slotProps">
                <div class="flex align-items-center">
                  <Avatar
                    :label="slotProps.option.isGroupChat ? 'G' : 'D'"
                    class="mr-2"
                    style="background-color: var(--primary-color)"
                  />
                  <div>
                    <div>{{ slotProps.option.name }}</div>
                    <small class="text-500">
                      {{ slotProps.option.isGroupChat ? 'Group Chat' : 'Direct Message' }}
                    </small>
                  </div>
                </div>
              </template>
            </Listbox>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-8">
        <router-view></router-view>
      </div>
    </div>

    <!-- New Chat Dialog -->
    <Dialog
      v-model:visible="showNewChatDialog"
      modal
      header="New Chat"
      :style="{ width: '500px' }"
    >
      <div class="p-fluid">
        <div class="field-checkbox mb-3">
          <Checkbox v-model="isGroupChat" :binary="true" />
          <label class="ml-2">Group Chat</label>
        </div>

        <div v-if="isGroupChat" class="field mb-3">
          <label for="chatName">Chat Name</label>
          <InputText
            id="chatName"
            v-model="chatName"
            :class="{ 'p-invalid': submitted && !chatName }"
            required
          />
          <small class="p-error" v-if="submitted && !chatName">Name is required</small>
        </div>

        <div class="field mb-3">
          <label for="participants">Participants</label>
          <MultiSelect
            id="participants"
            v-model="selectedParticipants"
            :options="users"
            optionLabel="username"
            optionValue="id"
            :class="{ 'p-invalid': submitted && !selectedParticipants.length }"
            placeholder="Search users..."
            :filter="false"
            @search="onSearch"
          />
          <small class="p-error" v-if="submitted && !selectedParticipants.length">
            Select at least {{ isGroupChat ? '1' : '2' }} participants
          </small>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="showNewChatDialog = false" />
        <Button label="Create" icon="pi pi-check" @click="createChatRoom" />
      </template>
    </Dialog>
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
  username: string;
  fullName: string;
  email: string;
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
    const selectedRoom = ref<ChatRoom | null>(null);
    const submitted = ref(false);
    const currentUserId = Number(localStorage.getItem('userId')) || 0;
    const userSearchQuery = ref('');
    const searchResults = ref<User[]>([]);

    const fetchChatRooms = async () => {
      try {
        const response = await fetch(`/api/chat/rooms/${currentUserId}`);
        const data = await response.json();
        chatRooms.value = data;
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
      }
    };

    const fetchUsers = async (search?: string) => {
      try {
        const url = new URL('/api/chat/users', window.location.origin);
        if (search) {
          url.searchParams.append('search', search);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        const data = await response.json();
        users.value = data;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const createChatRoom = async () => {
      submitted.value = true;

      if (!chatName.value || !selectedParticipants.value.length) {
        return;
      }

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

    const onRoomSelect = (event: any) => {
      if (event.value) {
        router.push(`/chat/${event.value._id}`);
      }
    };

    const onSearch = (event: { query: string }) => {
      fetchUsers(event.query);
    };

    const onUserSearch = async () => {
      if (!userSearchQuery.value.trim()) {
        searchResults.value = [];
        return;
      }
      await fetchUsers(userSearchQuery.value);
      searchResults.value = users.value;
    };

    const startChatWithUser = async (user: User) => {
      try {
        const response = await fetch('/api/chat/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            name: `DM-${[currentUserId, user.id].sort().join('-')}`,
            participants: [currentUserId, user.id],
            createdBy: currentUserId,
            isGroupChat: false,
          }),
        });

        const newRoom = await response.json();
        chatRooms.value.push(newRoom);
        userSearchQuery.value = '';
        searchResults.value = [];
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
      selectedRoom,
      submitted,
      userSearchQuery,
      searchResults,
      createChatRoom,
      onRoomSelect,
      onSearch,
      onUserSearch,
      startChatWithUser,
    };
  },
});
</script>

<style scoped>
.chat-list {
  height: 100%;
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.hover\:surface-200:hover {
  background-color: var(--surface-200);
}
</style>
