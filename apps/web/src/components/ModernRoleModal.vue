<template>
  <teleport to="body">
    <div v-if="visible" class="mr-overlay" @click.self="emit('close')">
      <div class="mr-modal" role="dialog" aria-modal="true">
        <div class="mr-header">
          <div class="mr-badge">
            <i class="pi pi-shield"></i>
          </div>
          <h3 class="mr-title">Edit User Role</h3>
          <button class="mr-close" @click="emit('close')" aria-label="Close"><i class="pi pi-times"></i></button>
        </div>

        <div class="mr-body">
          <div class="mr-user">
            <img v-if="avatarUrl" :src="avatarUrl" class="mr-avatar" @error="onImgErr" />
            <div v-else class="mr-avatar-fallback">{{ initials }}</div>
            <div class="mr-user-meta">
              <div class="mr-name">{{ user?.fullName }}</div>
              <div class="mr-email">{{ user?.email }}</div>
              <div class="mr-role-tag">
                <i class="pi pi-user"></i>
                {{ user?.role?.name?.toUpperCase() }}
              </div>
            </div>
          </div>

          <div class="mr-section">
            <label class="mr-label">Select New Role</label>
            <div class="mr-select">
              <select v-model="selectedRoleId" :disabled="loading">
                <option v-for="r in roleOptions" :key="r.id" :value="r.id" :disabled="r.id === user?.role?.id">
                  {{ r.name }}
                </option>
              </select>
              <i class="pi pi-chevron-down"></i>
            </div>
          </div>
        </div>

        <div class="mr-footer">
          <button class="mr-btn mr-btn-secondary" @click="emit('close')" :disabled="loading">
            <i class="pi pi-times"></i>
            Cancel
          </button>
          <button class="mr-btn mr-btn-primary" @click="onConfirm" :disabled="!canConfirm || loading">
            <i class="pi pi-check"></i>
            Confirm
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getEnvironmentConfig } from '../utils/environment'

interface Role { id: number | string; name: string }
interface UserLike {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  role?: { id: number | string; name: string }
}

const props = defineProps<{ visible: boolean; user: UserLike | null; roleOptions: Role[]; loading?: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', roleId: number | string): void }>()

const selectedRoleId = ref<number | string | null>(props.user?.role?.id ?? null)
watch(() => props.user, u => { selectedRoleId.value = u?.role?.id ?? null })

const canConfirm = computed(() => selectedRoleId.value != null && selectedRoleId.value !== props.user?.role?.id)

const initials = computed(() => {
  const name = props.user?.fullName ?? ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
})

const avatarUrl = computed(() => {
  const raw = props.user?.avatarUrl as string | undefined
  if (!raw) return ''
  if (raw.startsWith('http')) return raw
  const env = getEnvironmentConfig()
  const apiBase = env.apiUrl.replace(/\/$/, '') // includes /api
  const hostBase = apiBase.replace(/\/api$/, '')
  let path = raw.startsWith('/') ? raw : `/${raw}`
  if (path.startsWith('/api/')) return hostBase + path
  if (path.startsWith('/uploads/')) path = `/users${path}`
  return apiBase + path
})

function onImgErr(e: Event) {
  const el = e.target as HTMLImageElement
  if (el) el.style.display = 'none'
}

function onConfirm() {
  if (canConfirm.value && selectedRoleId.value != null) emit('confirm', selectedRoleId.value)
}
</script>

<style scoped>
.mr-overlay { position: fixed; inset: 0; background: rgba(2,8,23,.55); display:flex; align-items:center; justify-content:center; z-index:10000; }
.mr-modal { width: 720px; max-width: 94vw; background:#fff; border-radius: 16px; box-shadow: 0 24px 64px rgba(2,8,23,.28); overflow:hidden; animation: pop .18s ease-out; }
.mr-header { display:flex; align-items:center; justify-content:center; position:relative; padding: 14px 16px; background: linear-gradient(90deg,#eef2ff,#f8fafc); border-bottom:1px solid #e5e7eb; }
.mr-badge { position:absolute; left:16px; width:36px; height:36px; border-radius:10px; background:#e0e7ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; }
.mr-badge i { font-size: 18px; }
.mr-title { margin:0; font-size:20px; font-weight:800; color:#111827; }
.mr-close { position:absolute; right:10px; top:10px; width:36px; height:36px; border:none; background:transparent; border-radius:10px; cursor:pointer; }
.mr-close:hover { background:#eef2ff; }

.mr-body { padding: 18px 20px 8px 20px; }
.mr-user { display:flex; align-items:center; gap:14px; margin-bottom: 14px; }
.mr-avatar { width:64px; height:64px; border-radius:50%; border:3px solid #fff; box-shadow: 0 4px 16px rgba(79,70,229,.18); object-fit:cover; }
.mr-avatar-fallback { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#eef2ff; color:#4f46e5; font-weight:800; }
.mr-user-meta { display:flex; flex-direction:column; gap:4px; }
.mr-name { font-weight:800; font-size:18px; color:#111827; }
.mr-email { color:#6b7280; font-size:14px; }
.mr-role-tag { margin-top:4px; display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#2563eb; border-radius:999px; padding:4px 10px; font-weight:700; font-size:12px; }

.mr-section { margin-top: 10px; }
.mr-label { display:block; font-weight:700; color:#334155; margin-bottom:6px; }
.mr-select { position:relative; }
.mr-select select { appearance:none; width:100%; padding: 12px 40px 12px 14px; border:2px solid #c7d2fe; border-radius:12px; font-size:15px; font-weight:600; color:#111827; background:#fff; }
.mr-select i { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:#64748b; }

.mr-footer { display:flex; justify-content:flex-end; gap:10px; padding: 14px 16px 16px 16px; border-top:1px solid #f1f5f9; }
.mr-btn { display:inline-flex; align-items:center; gap:8px; border:none; border-radius:12px; padding:10px 16px; font-weight:800; cursor:pointer; font-size:14px; }
.mr-btn:disabled { opacity:.6; cursor:not-allowed; }
.mr-btn-secondary { background:#e5e7eb; color:#111827; }
.mr-btn-secondary:hover:not(:disabled) { filter: brightness(0.97); }
.mr-btn-primary { background: linear-gradient(90deg,#16a34a,#2563eb); color:#fff; }
.mr-btn-primary:hover:not(:disabled) { filter: brightness(1.05); }

@keyframes pop { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>


