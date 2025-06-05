<template>
  <footer class="footer">
    <div class="footer-content">
      <span>© {{ new Date().getFullYear() }} HereToTranslate. All rights reserved.</span>
    </div>
  </footer>
</template>

<script setup>
// Layout only
</script>

<style scoped>

@import url('https://fonts.googleapis.com/css?family=Inter:400,500,600,700&display=swap');
.footer {
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  padding: 16px 0;
  color: #6b7280;
  font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
  font-size: 14px;
}
</style>
