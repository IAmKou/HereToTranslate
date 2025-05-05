<script setup lang="ts">

</script>

<template>
  <div>
    <h2 class="text-lg font-bold mb-2">{{ type.toUpperCase() }} Items</h2>
    <form @submit.prevent="onSubmit" class="mb-4">
      <input v-model="form.name" placeholder="Name" class="border p-1 mr-1" />
      <input v-model="form.description" placeholder="Description" class="border p-1 mr-1" />
      <button class="bg-blue-500 text-white px-3 py-1">{{ editId ? 'Update' : 'Add' }}</button>
      <button v-if="editId" type="button" @click="cancelEdit" class="ml-2 text-red-500">Cancel</button>
    </form>
    <ul>
      <li v-for="item in items" :key="item.id || item._id" class="mb-1">
        {{ item.name }} - {{ item.description }}
        <button @click="edit(item)" class="ml-2 text-blue-600">Edit</button>
        <button @click="remove(item.id || item._id)" class="ml-2 text-red-600">Delete</button>
      </li>
    </ul>
  </div>
</template>

<script>
import { api } from '../api';

export default {
  props: ['type'],
  data() {
    return {
      items: [],
      form: { name: '', description: '' },
      editId: null,
    };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.items = await api.getAll(this.type);
    },
    async onSubmit() {
      if (this.editId) {
        await api.update(this.type, this.editId, this.form);
      } else {
        await api.create(this.type, this.form);
      }
      this.form = { name: '', description: '' };
      this.editId = null;
      await this.load();
    },
    edit(item) {
      this.form = { name: item.name, description: item.description };
      this.editId = item.id || item._id;
    },
    cancelEdit() {
      this.form = { name: '', description: '' };
      this.editId = null;
    },
    async remove(id) {
      await api.remove(this.type, id);
      await this.load();
    },
  },
};
</script>


<style scoped>

</style>
