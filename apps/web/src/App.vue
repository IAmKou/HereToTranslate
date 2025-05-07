<template>
  <div class="p-4 container">
    <h1>CRUD App (MySQL & Mongo)</h1>
    <CrudTable type="test" />
    <hr class="my-4" />
    <CrudTable type="mongo" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CrudTable from './components/CrudTable.vue';

export default defineComponent({
  name: 'App',
  components: {
    CrudTable,
  },
});
</script>

<style>
.container {
  max-width: 600px;
  margin: 2rem auto;
  text-align: center;
  font-family: Arial, sans-serif;
}
button {
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
}
</style>
