<template>
  <div class="p-4 rounded shadow-lg border bg-white">
    <h3 class="text-xl font-bold mb-2">{{ request.title }}</h3>
    <p class="mb-2">{{ request.description }}</p>

    <div class="text-sm text-gray-600 mb-2">
      <div><strong>Project:</strong> {{ request.project?.name || '-' }}</div>
      <div><strong>Category:</strong> {{ request.category?.name || '-' }}</div>
      <div><strong>Status:</strong> {{ request.status }}</div>
      <div><strong>Deal Amount:</strong> {{ request.dealAmount ?? 'N/A' }}</div>
      <div><strong>Deadline:</strong> {{ formattedDeadline }}</div>
      <div><strong>Status:</strong> {{ request.status }}</div>
      <div><strong>Deal Amount:</strong> {{ request.dealAmount ?? 'N/A' }}</div>
      <div><strong>Deadline:</strong> {{ formattedDeadline }}</div>
      <div v-if="request.fileUrl">
        <strong>Attachment:</strong>
        <a
          :href="request.fileUrl"
          class="text-blue-600 underline"
          target="_blank"
          >View File</a
        >
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        @click="$emit('approve', request.id)"
      >
        Approve
      </button>
      <button
        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        @click="confirmAction('reject')"
      >
        Reject
      </button>
      <button
        class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        @click="$emit('edit', request)"
      >
        Edit
      </button>
      <button
        class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        @click="$emit('view', request.id)"
      >
        View
      </button>
      <button
        class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        @click="confirmAction('cancel')"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: ['request'],
  computed: {
    formattedDeadline() {
      return this.request.deadline
        ? new Date(this.request.deadline).toLocaleDateString()
        : 'None';
    },
  },
  methods: {
    confirmAction(action) {
      const actionText = action === 'reject' ? 'reject' : 'cancel';
      const confirmed = confirm(
        `Are you sure you want to ${actionText} this request?`
      );
      if (confirmed) {
        this.$emit(action, this.request.id);
      }
    },
  },
};
</script>
