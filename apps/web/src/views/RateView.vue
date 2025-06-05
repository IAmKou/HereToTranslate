<template>
  <div class="post-actions">
    <!-- Rating Section -->
    <div class="stars">
      <span
        v-for="n in 5"
        :key="n"
        class="star"
        :class="{ filled: n <= selectedRating }"
        @click="selectedRating = n"
      >★</span>
    </div>

    <textarea v-model="commentText" placeholder="Write a comment..."></textarea>
    <button @click="submitComment">Comment</button>

    <div v-for="comment in comments" :key="comment.id" class="comment-box">
      <p><strong>{{ comment.user.fullName }}</strong>: {{ comment.content }}</p>
      <div v-if="comment.user.id === currentUserId">
        <input v-model="comment.editContent" placeholder="Edit..." />
        <button @click="updateComment(comment)">Update</button>
        <button @click="deleteComment(comment.id)">Delete</button>
      </div>
      <button @click="reportComment(comment.id)">Report</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  postId: Number,
  token: String,
  currentUserId: Number,
});

const selectedRating = ref(0);
const commentText = ref('');
const comments = ref([]);

const headers = {
  Authorization: `Bearer ${props.token}`,
};

const submitComment = async () => {
  if (!commentText.value.trim()) return;
  await axios.post('http://localhost:3000/api/post/comment', {
    postId: props.postId,
    content: commentText.value,
  }, { headers });
  commentText.value = '';
  await loadComments();
};

const updateComment = async (comment) => {
  await axios.patch(`/api/post/comment/${comment.id}`, {
    content: comment.editContent,
  }, { headers });
  await loadComments();
};

const deleteComment = async (id) => {
  await axios.delete(`/api/post/comment/${id}`, { headers });
  await loadComments();
};

const reportComment = async (id) => {
  const reason = prompt('Why are you reporting this comment?');
  if (reason) {
    await axios.post('/api/post/comment/report', {
      commentId: id,
      reason,
    }, { headers });
    alert('Reported!');
  }
};

const loadComments = async () => {
  const res = await axios.get(`/api/post/${props.postId}/comments`);
  comments.value = res.data.map(c => ({ ...c, editContent: c.content }));
};

onMounted(loadComments);
</script>

<style scoped>
.stars {
  font-size: 2rem;
  color: #ccc;
}
.star.filled {
  color: gold;
  cursor: pointer;
}
textarea {
  width: 100%;
  height: 70px;
  margin-top: 0.5rem;
}
.comment-box {
  background: #f9f9f9;
  margin-top: 10px;
  padding: 8px;
  border-radius: 6px;
}
</style>
