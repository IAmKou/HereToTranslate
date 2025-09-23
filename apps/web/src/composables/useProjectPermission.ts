import { computed, isRef } from 'vue';
import { useAuthStore } from '../store/auth';
import { PermissionFlags } from '../utils/permissions';
import { resolveNames } from '../utils/permissions';

/**
 * Helper composable để kiểm tra quyền của user hiện tại trong 1 project.
 * @param project - object project (phải có createdBy.id) hoặc ref
 * @param members - ref array các member (phải có roles, mỗi role có permissions: string[])
 */
export function useProjectPermission(
  project: any,
  members: { value: Array<{ id: string | number; roles?: Array<{ permissions?: string[]; permissionFlags?: any }> }> },
  currentUser?: { value: any }
) {
  const authStore = useAuthStore();
  const currentUserId = computed(() => {
    if (currentUser && currentUser.value && currentUser.value.id) return String(currentUser.value.id);
    return authStore.user?.id ? String(authStore.user.id) : undefined;
  });

  // Always unwrap project (ref or object)
  const getProject = computed(() => isRef(project) ? project.value : project);

  // Lấy member hiện tại
  const currentMember = computed(() =>
    members.value.find((m: { id: string | number }) => String(m.id) === String(currentUserId.value))
  );

  // Lấy tất cả quyền của user hiện tại (dạng Set)
  const allPerms = computed(() => {
    const set = new Set<string>();
    (currentMember.value?.roles || []).forEach((r: { permissionFlags?: string }) => {
      const perms = resolveNames(BigInt(r.permissionFlags || '0'));
      perms.forEach(p => set.add(p));
    });
    return set;
  });

  // Lấy tất cả permission flags của user hiện tại
  const allPermissionFlags = computed(() => {
    let flags = BigInt(0);
    (currentMember.value?.roles || []).forEach((r: { permissionFlags?: any }) => {
      if (r.permissionFlags) {
        // Handle Permission object from backend
        let value = r.permissionFlags;
        if (value && typeof value === 'object') {
          if ('value' in value) {
            value = value.value;
          } else if ('permissionFlags' in value) {
            value = value.permissionFlags;
          }
        }
        flags = flags | BigInt(value);
      }
    });
    return flags;
  });

  // Check có quyền cụ thể không
  function hasPermission(permission: string) {
    // Debug log chi tiết
    const allPermsArr = Array.from(allPerms.value);
    // Thêm log toàn bộ roles và permissionFlags của currentMember
    console.log('[useProjectPermission] DEBUG currentMember:', {
      currentMember: currentMember.value,
      roles: currentMember.value?.roles,
      permissionFlags: (currentMember.value?.roles || []).map(r => r.permissionFlags),
      parsedPermissions: (currentMember.value?.roles || []).map(r => r.permissions),
    });
    console.log('[useProjectPermission] hasPermission check:', {
      permission,
      allPerms: allPermsArr,
      match: allPermsArr.includes(permission),
      authUser: authStore.user,
      currentUserId: currentUserId.value,
      projectOwnerId: getProject.value?.createdBy?.id,
      isProjectOwner: isProjectOwner.value,
      currentMember: currentMember.value,
      members: members.value,
      project: getProject.value,
      allPermissionFlags: allPermissionFlags.value.toString()
    });
    // Project Owner luôn có mọi quyền (trừ xóa project, remove owner)
    if (isProjectOwner.value) return true;
    // Project Admin có mọi quyền trừ xóa project, remove owner
    if (isProjectAdmin.value)
      return permission !== 'DeleteProject' && permission !== 'RemoveOwner';
    // Nếu user có AttachFiles, coi như có mọi quyền trên tab Files
    const fileRelatedPermissions = [
      'ManageFiles', 'ViewFiles', 'AttachFiles', // thêm các quyền khác nếu có
    ];
    if (
      permission &&
      fileRelatedPermissions.includes(permission) &&
      allPermsArr.includes('AttachFiles')
    ) {
      return true;
    }
    // So sánh permission trực tiếp
    return allPermsArr.includes(permission);
  }

  // Có phải Project Owner không
  const isProjectOwner = computed(() => {
    return (
      getProject.value?.createdBy?.id &&
      String(currentUserId.value) === String(getProject.value.createdBy.id)
    );
  });

  // Có phải Project Admin không - check bằng bit mask
  const isProjectAdmin = computed(() => {
    const flags = allPermissionFlags.value;
    return (flags & PermissionFlags.ProjectAdmin) === PermissionFlags.ProjectAdmin;
  });

  return {
    hasPermission,
    isProjectOwner,
    isProjectAdmin,
    currentMember,
    currentUserId,
  };
}
