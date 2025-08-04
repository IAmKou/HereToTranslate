<script setup lang="ts">
import AiChat from '../components/AiChat.vue';

function pingApi() {
  fetch('https://htt-ekpa.onrender.com/api/auth/ping', {
    credentials: 'include',
  })
    .then(res => res.json())
    .then(console.log)
    .catch(console.error);
}
</script>

<template>
  <div>
    <AiChat />
    <button @click="pingApi" style="margin-top:16px;padding:8px 16px;">
      Ping API (with credentials)
    </button>
  </div>
</template>
