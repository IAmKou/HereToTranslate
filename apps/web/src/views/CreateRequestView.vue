<template>
  <Card class="create-request-card">
    <template #title>
      <h2>Tạo Request mới</h2>
    </template>
    <template #content>
      <CreateRequestForm @success="onSuccess" @cancel="onCancel" />
    </template>
  </Card>
</template>

<script setup>
import CreateRequestForm from '../components/CreateRequestForm.vue'

function onSuccess() {
  setTimeout(() => {
    window.location.href = '/requests'
  }, 2000)
}
function onCancel() {
  window.history.back()
}
</script>

<style scoped lang="scss">
.create-request-card {
  width: 100%;
  max-width: 500px;
  margin: 2rem auto;
  padding: 2.5rem 2rem 2rem 2rem;
  border-radius: 18px;
  box-shadow: 0 8px 40px rgba(25, 118, 210, 0.16);
  background: #fff;
  border: 1.5px solid #e3eafc;
}
</style>
