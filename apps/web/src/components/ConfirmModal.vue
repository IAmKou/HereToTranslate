<template>
  <teleport to="body">
    <div v-if="visible" class="cm-overlay" @click.self="onCancel">
      <div class="cm-modal" role="dialog" aria-modal="true" :aria-labelledby="id + '-title'">
        <div class="cm-header">
          <h3 :id="id + '-title'" class="cm-title">{{ title }}</h3>
          <button class="cm-close" @click="onCancel" aria-label="Close">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="cm-content">
          <i :class="['pi', icon, 'cm-icon', type]" aria-hidden="true"></i>
          <div class="cm-message">{{ message }}</div>
        </div>
        <div class="cm-footer">
          <button class="cm-btn cm-btn-cancel" @click="onCancel">
            <i class="pi pi-times-circle"></i>
            {{ cancelText }}
          </button>
          <button class="cm-btn cm-btn-accept" @click="onConfirm">
            <i class="pi pi-check-circle"></i>
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'info' | 'success' | 'danger'
}>(), {
  title: 'Confirmation',
  confirmText: 'Yes',
  cancelText: 'No',
  type: 'warning',
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const id = Math.random().toString(36).slice(2)
const icon = computed(() => {
  switch (props.type) {
    case 'success': return 'pi-check-circle'
    case 'danger': return 'pi-exclamation-triangle'
    case 'info': return 'pi-info-circle'
    default: return 'pi-star'
  }
})

function onCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function onConfirm() {
  emit('update:visible', false)
  emit('confirm')
}
</script>

<style scoped>
.cm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.cm-modal {
  background: #fff;
  width: 680px;
  max-width: 92vw;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.25);
  overflow: hidden;
  animation: cm-pop 160ms ease-out;
}

.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.cm-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #1f2937;
}

.cm-close {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
}
.cm-close:hover { background: #eef2ff; }

.cm-content {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px 6px 20px;
}

.cm-icon {
  font-size: 34px;
}
.cm-icon.warning { color: #f59e0b; }
.cm-icon.success { color: #22c55e; }
.cm-icon.danger { color: #ef4444; }
.cm-icon.info { color: #3b82f6; }

.cm-message {
  font-size: 16px;
  color: #111827;
}

.cm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 18px 18px 18px;
}

.cm-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.cm-btn-accept {
  background: linear-gradient(90deg, #16a34a, #2563eb);
  color: #fff;
}
.cm-btn-accept:hover { filter: brightness(1.05); }

.cm-btn-cancel {
  background: #ef4444;
  color: #fff;
}
.cm-btn-cancel:hover { filter: brightness(0.95); }

@keyframes cm-pop {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>


