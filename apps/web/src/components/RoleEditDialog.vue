<template>
  <Dialog
    :visible="true"
    modal
    :closable="false"
    :draggable="false"
    class="role-edit-dialog pro"
    :style="{ width: '560px', maxWidth: '96vw', minWidth: '380px', borderRadius: '18px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }"
  >
    <div class="dialog-header-pro">
      <span class="header-icon">🛡️</span>
      <span class="header-title">Edit User Role</span>
      <button class="close-x" @click="$emit('close')" aria-label="Close">
        <i class="pi pi-times"></i>
      </button>
    </div>
    <div class="dialog-content-pro">
      <div class="user-info-pro">
        <div class="avatar-wrapper">
          <Avatar :label="getInitials(props.user?.fullName)" :image="props.user?.avatarUrl" shape="circle" size="large" class="user-avatar-pro" />
        </div>
        <div class="user-details-pro">
          <div class="user-name-pro">{{ props.user?.fullName }}</div>
          <div class="user-email-pro">{{ props.user?.email }}</div>
          <div class="user-current-role-pro" v-tooltip="roleDescription(props.user?.role.name)">
            <Tag :value="props.user?.role.name.toUpperCase()" class="current-role-tag-pro">
              <template #icon>
                <span>{{ getRoleIcon(props.user?.role.name) }}</span>
              </template>
              {{ props.user?.role.name.toUpperCase() }}
            </Tag>
          </div>
        </div>
      </div>
      <div class="role-select-section-pro">
        <label for="role-select" class="role-label-pro">Select New Role</label>
        <Dropdown
          id="role-select"
          ref="roleDropdownRef"
          v-model="selectedRoleId"
          :options="filteredRoleOptions"
          optionLabel="name"
          optionValue="id"
          placeholder="Choose role"
          class="role-dropdown-pro custom-dropdown-pro"
          :disabled="props.loading"
          :item-disabled="isCurrentRole"
          :optionTooltip="roleDescription"
        >
          <template #option="{ option }">
            <div class="dropdown-option-pro">
              <span class="dropdown-role-icon-pro">{{ getRoleIcon(option.name) }}</span>
              <span class="dropdown-role-name-pro">{{ option.name }}</span>
              <span class="dropdown-role-desc-pro">{{ roleDescription(option.name) }}</span>
            </div>
          </template>
        </Dropdown>
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="cancel-btn-pro" @click="$emit('close')" :disabled="props.loading" v-tooltip="'Cancel editing'" />
      <Button label="Confirm" icon="pi pi-check" class="confirm-btn-pro" :loading="props.loading" :disabled="!canConfirm" @click="onConfirm" v-tooltip="'Confirm role change'" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';

const props = defineProps({
  user: { type: Object, required: true },
  roleOptions: { type: Array, required: true },
  loading: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'confirm']);

const selectedRoleId = ref(props.user?.role.id);
const roleDropdownRef = ref();

watch(() => props.user, (newUser: any) => {
  selectedRoleId.value = newUser?.role.id;
});

const canConfirm = computed(() => selectedRoleId.value !== props.user?.role.id && !props.loading);

type Role = { id: string | number; name: string; [key: string]: any };
const filteredRoleOptions = computed(() =>
  (props.roleOptions as Role[]).map((role: Role) => ({ ...role, disabled: role.id === props.user?.role.id }))
);

function isCurrentRole(option: any) {
  return option.id === props.user?.role.id;
}

function onConfirm() {
  if (canConfirm.value) emit('confirm', selectedRoleId.value);
}

function getInitials(name: string | undefined) {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function roleDescription(roleName: string) {
  if (!roleName) return '';
  if (roleName === 'ADMIN') return 'Admin: Full system management permissions.';
  if (roleName === 'MEMBER') return 'Member: Can use basic features.';
  if (roleName === 'SUPER_ADMIN' || roleName === 'SUPERADMIN') return 'Super Admin: All permissions, including admin management.';
  return 'Special or custom permissions.';
}

function getRoleIcon(roleName: string) {
  if (!roleName) return '🔑';
  const name = roleName.toLowerCase();
  if (name === 'super_admin' || name === 'superadmin') return '🛡️';
  if (name === 'admin') return '🧑‍💼';
  if (name === 'member') return '👤';
  return '🔑';
}

onMounted(() => {
  nextTick(() => {
    if (roleDropdownRef.value && roleDropdownRef.value.$el) {
      roleDropdownRef.value.$el.focus();
    }
  });
});

defineExpose({
  getInitials,
  roleDescription,
  getRoleIcon,
  selectedRoleId,
  filteredRoleOptions,
  isCurrentRole,
  canConfirm,
  onConfirm
});
</script>

<style scoped>
.role-edit-dialog.pro :deep(.p-dialog) {
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  overflow: visible;
}
.dialog-header-pro {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 1rem 0.7rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.2rem;
  position: relative;
}
.header-icon {
  font-size: 2.1rem;
  margin-bottom: 0.1rem;
}
.header-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.01em;
}
.close-x {
  position: absolute;
  right: 10px;
  top: 10px;
  border: none;
  background: transparent;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.close-x:hover { background: #eef2ff; }
.dialog-content-pro {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding: 1.2rem 1.7rem 0.8rem 1.7rem;
  align-items: center;
}
.user-info-pro {
  display: flex;
  align-items: center;
  gap: 2.1rem;
  justify-content: center;
  width: 100%;
}
.avatar-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-avatar-pro {
  width: 4.2rem;
  height: 4.2rem;
  font-size: 1.5rem;
  font-weight: 700;
  background: #f1f5f9;
  color: #3b82f6;
  border: 2.5px solid #3b82f6;
  box-shadow: 0 2px 10px rgba(59,130,246,0.13);
}
.user-details-pro {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.user-name-pro {
  font-weight: 800;
  font-size: 1.18rem;
  color: #1e293b;
}
.user-email-pro {
  color: #64748b;
  font-size: 1.01rem;
}
.user-current-role-pro {
  margin-top: 0.3rem;
  font-size: 1rem;
  display: inline-block;
  font-weight: 600;
}
.current-role-tag-pro {
  background: linear-gradient(90deg, #3b82f6 60%, #2563eb 100%);
  color: #fff;
  font-weight: 700;
  margin-left: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.13rem 0.9rem 0.13rem 0.6rem;
  font-size: 0.99rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 1px 4px rgba(59,130,246,0.10);
}
.role-select-section-pro {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  width: 100%;
  align-items: center;
}
.role-label-pro {
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.2rem;
  font-size: 1.01rem;
}
.role-dropdown-pro {
  min-width: 260px;
  font-size: 1rem;
  width: 100%;
  border-radius: 0.7rem;
  box-shadow: 0 1px 4px rgba(59,130,246,0.07);
}
.confirm-btn-pro {
  margin-left: 1.2rem;
  background: linear-gradient(90deg, #22c55e 60%, #16a34a 100%);
  border: none;
  color: #fff;
  font-weight: 700;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(34,197,94,0.13);
  padding: 0.7rem 2.2rem;
  font-size: 1.08rem;
  transition: background 0.2s, box-shadow 0.2s;
}
.confirm-btn-pro:hover:not(:disabled) {
  background: linear-gradient(90deg, #16a34a 60%, #22c55e 100%);
  box-shadow: 0 4px 16px rgba(34,197,94,0.18);
}
.cancel-btn-pro {
  color: #64748b;
  font-weight: 600;
  background: #fff;
  border: 2px solid #e2e8f0;
  margin-right: 1.2rem;
  border-radius: 12px;
  padding: 0.7rem 1.8rem;
  font-size: 1.08rem;
  transition: border 0.2s, background 0.2s, color 0.2s;
}
.cancel-btn-pro:hover:not(:disabled) {
  background: #e2e8f0;
  color: #334155;
  border: 2px solid #cbd5e1;
}
.p-button[disabled], .p-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
@media (max-width: 600px) {
  .role-edit-dialog.pro :deep(.p-dialog) {
    min-width: 98vw !important;
    width: 98vw !important;
    max-width: 98vw !important;
  }
  .dialog-content-pro {
    padding: 0.7rem 0.2rem 0.2rem 0.2rem;
  }
  .role-dropdown-pro {
    min-width: 0;
    width: 100%;
  }
}
.custom-dropdown-pro :deep(.p-dropdown-label) {
  font-size: 1.08rem;
  font-weight: 600;
  color: #1e293b;
  padding: 0.7rem 1.1rem;
}
.custom-dropdown-pro :deep(.p-dropdown-panel) {
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(59,130,246,0.13);
  padding: 0.2rem 0;
  animation: dropdownFadeIn 0.18s;
}
@keyframes dropdownFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.custom-dropdown-pro :deep(.p-dropdown-item) {
  padding: 0.7rem 1.2rem 0.5rem 1.2rem;
  border-radius: 8px;
  font-size: 1.07rem;
  font-weight: 500;
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-height: 2.7rem;
  transition: background 0.18s;
}
.custom-dropdown-pro :deep(.p-dropdown-item.p-highlight),
.custom-dropdown-pro :deep(.p-dropdown-item:hover) {
  background: #f1f5f9;
  color: #2563eb;
}
.dropdown-option-pro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
}
.dropdown-role-icon-pro {
  font-size: 1.18rem;
  margin-right: 0.5rem;
}
.dropdown-role-name-pro {
  font-weight: 700;
  font-size: 1.07rem;
  color: #1e293b;
}
.dropdown-role-desc-pro {
  font-size: 0.97rem;
  color: #64748b;
  margin-top: 0.05rem;
  margin-left: 1.7rem;
}
</style>
