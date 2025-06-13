<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="layout-footer">
    <div class="layout-footer-content">
      <div class="layout-footer-left">
        <span class="text-sm text-600">© {{ currentYear }} Your Company. All rights reserved.</span>
      </div>
      <div class="layout-footer-right">
        <a href="#" class="p-link text-sm">Terms of Service</a>
        <a href="#" class="p-link text-sm">Privacy Policy</a>
        <a href="#" class="p-link text-sm">Help Center</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.layout-footer {
  background: var(--surface-card);
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--surface-border);
}

.layout-footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layout-footer-left {
  color: var(--text-color-secondary);
}

.layout-footer-right {
  display: flex;
  gap: 2rem;
}

.layout-footer-right .p-link {
  color: var(--text-color-secondary);
  text-decoration: none;
  transition: color 0.2s;
}

.layout-footer-right .p-link:hover {
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .layout-footer {
    padding: 1rem;
  }

  .layout-footer-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .layout-footer-right {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
