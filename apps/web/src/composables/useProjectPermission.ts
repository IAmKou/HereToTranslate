import { computed, isRef } from 'vue';
import { useAuthStore } from '../store/auth';

/**
 * Helper composable để kiểm tra quyền của user hiện tại trong 1 project.
 * @param project - object project (phải có createdBy.id) hoặc ref
 * @param members - ref array các member (phải có roles, mỗi role có permissions: string[])
 */
export function useProjectPermission(
  project: any,
  members: { value: Array<{ id: string | number; roles?: Array<{ permissions?: string[] }> }> },
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

  // Helper để chuẩn hóa tên permission (bỏ dấu cách, về chữ thường)
  function normalizePermission(p: string) {
    return p.replace(/\s+/g, '').toLowerCase();
  }

  // Lấy tất cả quyền của user hiện tại (dạng Set)
  const allPerms = computed(() => {
    const set = new Set<string>();
    (currentMember.value?.roles || []).forEach((r: { permissions?: string[], name?: string }) => {
      if (r.name === 'Project Owner') {
        (r.permissions || []).forEach((p: string) => set.add(p));
      } else {
        (r.permissions || []).forEach((p: string) => {
          if (p !== 'ProjectAdmin') set.add(p);
        });
      }
    });
    return set;
  });

  // Check có quyền cụ thể không
  function hasPermission(permission: string) {
    // Debug log chi tiết
    const normPerm = normalizePermission(permission);
    const allPermsArr = Array.from(allPerms.value);
    const normalizedAllPerms = allPermsArr.map(p => typeof p === 'string' ? normalizePermission(p) : p);
    console.log('[useProjectPermission] hasPermission check:', {
      permission,
      normPerm,
      allPerms: allPermsArr,
      normalizedAllPerms,
      match: normalizedAllPerms.includes(normPerm),
      authUser: authStore.user,
      currentUserId: currentUserId.value,
      projectOwnerId: getProject.value?.createdBy?.id,
      isProjectOwner: isProjectOwner.value,
      currentMember: currentMember.value,
      members: members.value,
      project: getProject.value
    });
    // Project Owner luôn có mọi quyền (trừ xóa project, remove owner)
    if (isProjectOwner.value) return true;
    // Project Admin có mọi quyền trừ xóa project, remove owner
    if (isProjectAdmin.value)
      return normPerm !== 'deleteproject' && normPerm !== 'removeowner';
    // So sánh permission đã normalize
    return normalizedAllPerms.includes(normPerm);
  }

  // Có phải Project Owner không
  const isProjectOwner = computed(() => {
    return (
      getProject.value?.createdBy?.id &&
      String(currentUserId.value) === String(getProject.value.createdBy.id)
    );
  });

  // Có phải Project Admin không
  const isProjectAdmin = computed(() =>
    Array.from(allPerms.value).some(
      p => typeof p === 'string' && normalizePermission(p) === 'projectadmin'
    )
  );

  return {
    hasPermission,
    isProjectOwner,
    isProjectAdmin,
    currentMember,
    currentUserId,
  };
}
