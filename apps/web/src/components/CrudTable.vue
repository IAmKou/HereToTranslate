<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, CrudItem } from '../api';

const props = defineProps<{
  type: 'test' | 'mongo';
}>();

const items = ref<CrudItem[]>([]);
const form = ref<{ _id?: string; _name: string }>({ _name: '' });
const editId = ref<number | string | null>(null);

const load = async () => {
  items.value = await api.getAll(props.type);
};

const onSubmit = async () => {
  if (editId.value) {
    await api.update(props.type, editId.value, form.value);
  } else {
    await api.create(props.type, { _name: form.value._name });
  }
  form.value = { _name: '' };
  editId.value = null;
  await load();
};

const edit = (item: CrudItem) => {
  form.value = {
    _id: item._id,      // Keep _id for Mongo
    _name: item._name,
  };
  editId.value = item.id ?? item._id!;
};

const cancelEdit = () => {
  form.value = { _name: '' };
  editId.value = null;
};

const remove = async (id: number | string) => {
  await api.remove(props.type, id);
  await load();
};

onMounted(load);
</script>


<template>
  <div>
    <h2 class="text-lg font-bold mb-2">{{ type.toUpperCase() }} Items</h2>
    <form @submit.prevent="onSubmit" class="mb-4">
      <input v-model="form._name" placeholder="Name" class="border p-1 mr-1" />
      <button class="bg-blue-500 text-white px-3 py-1">
        {{ editId ? 'Update' : 'Add' }}
      </button>
      <button v-if="editId" type="button" @click="cancelEdit" class="ml-2 text-red-500">
        Cancel
      </button>
    </form>
    <ul>
      <li v-for="item in items" :key="item.id || item._id" class="mb-1">
        {{ item._name }}
        <button @click="edit(item)" class="ml-2 text-blue-600">Edit</button>
        <button @click="remove(item.id || item._id)" class="ml-2 text-red-600">Delete</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* Optional styling */
</style>
