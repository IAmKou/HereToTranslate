import { computed } from 'vue';
import { useProjectPermission } from './useProjectPermission';
import { parsePermissionFlags } from '../utils/permissions';

export function useProjectMemberPermissions(
  project: any,
  members: any,
  currentUser?: any
) {
  // Parse permissions trước khi truyền vào useProjectPermission
  const normalizedMembers = computed(() => {
    if (!members.value) return [];
    return members.value.map((m: any) => ({
      ...m,
      roles: Array.isArray(m.roles)
        ? m.roles.map((r: any) => {
          let permissions = r.permissions;
          if ((!permissions || permissions.length === 0) && r.permissionFlags) {
            permissions = parsePermissionFlags(r.permissionFlags);
          }
          return { ...r, permissions };
        })
        : []
    }));
  });

  // Sử dụng useProjectPermission với members đã được parse
  return useProjectPermission(
    project,
    normalizedMembers,
    currentUser
  );
}
