<template>
  <div>
    <Button label="Save" icon="pi pi-save" />
    <InputText v-model="name" placeholder="Enter your name" />
  </div>
</template>

<script setup>
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { ref } from 'vue'

const name = ref('')
</script>
