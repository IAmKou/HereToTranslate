export const PermissionFlags = {
  ProjectAdmin: 1n << 63n,
  ManageMembers: 1n << 62n,
  ManageBranches: 1n << 61n,
  ManageRoles: 1n << 60n,
  ManageWorkspaces: 1n << 59n,
  ManageGroups: 1n << 58n,
  ManageProjectMetadata: 1n << 57n,
  ManageDiscussions: 1n << 56n,
  ViewAudit: 1n << 55n,
  ReviewCommit: 1n << 53n,
  PushCommit: 1n << 52n,
  ReviewRequests: 1n << 40n,
  ViewRequest: 1n << 39n,
  ManageWorkspaceMetadata: 1n << 27n,
  ViewWorkspace: 1n << 26n,
  ManageFiles: 1n << 25n,
  ViewFiles: 1n << 24n,
  ManageComments: 1n << 15n,
  PostComment: 1n << 14n,
  Vote: 1n << 10n,
  AttachFiles: 1n << 9n,
  ViewThread: 1n << 8n,
  ViewProject: 1n,
  None: 0n,
  ManageTranslation: 1n << 23n,
  
} as const; 

export function parsePermissionFlags(bitmask: string | number | bigint | undefined | any): string[] {
  console.log('parsePermissionFlags input:', bitmask, typeof bitmask);

  if (bitmask === undefined || bitmask === null) {
    console.log('bitmask is undefined/null');
    return [];
  }

  // Handle Vue Proxy objects - extract the actual value
  let actualBitmask = bitmask;
  if (typeof bitmask === 'object' && bitmask !== null) {
    // Try to get the actual value from the proxy
    actualBitmask = bitmask.value || bitmask.permissionFlags || bitmask.flags || bitmask;
    console.log('extracted from proxy:', actualBitmask);

    // If the extracted value is still an object, try to get its value
    if (typeof actualBitmask === 'object' && actualBitmask !== null) {
      actualBitmask = actualBitmask.value || actualBitmask._value || actualBitmask.toString();
      console.log('further extracted:', actualBitmask);
    }
  }

  let flags: bigint;

  try {
    if (typeof actualBitmask === 'bigint') {
      flags = actualBitmask;
    } else if (typeof actualBitmask === 'string') {
      flags = BigInt(actualBitmask);
    } else if (typeof actualBitmask === 'number') {
      flags = BigInt(actualBitmask);
    } else {
      console.log('actualBitmask is not a valid type:', typeof actualBitmask, actualBitmask);
      return [];
    }

    console.log('parsed flags:', flags.toString());

    // Sửa: Dùng phép toán bit để xác định quyền
    const permissions = Object.entries(PermissionFlags)
      .filter(([key, value]) => {
        if (key === 'None') return false;
        if (typeof value !== 'bigint') return false;
        return (flags & value) === value && value !== 0n;
      })
      .map(([key]) => key);

    console.log('parsed permissions:', permissions);
    return permissions;
  } catch (e) {
    console.error('Invalid permissionFlags:', actualBitmask, e);
    return [];
  }
}

export function calculatePermissionFlags(permissions: string[]): bigint {
  return permissions.reduce((acc, perm) => {
    const flag = PermissionFlags[perm as keyof typeof PermissionFlags];
    if (flag) {
      return acc | flag;
    }
    return acc;
  }, PermissionFlags.None);
}

export function resolveNames(value: bigint): string[] {
  return (Object.keys(PermissionFlags))
    .filter(key => {
      const flag = PermissionFlags[key as keyof typeof PermissionFlags];
      return (typeof flag === 'bigint')
      && (value & flag) === flag
    }
    );
}

export function normalizePermission(p: string) {
  return typeof p === 'string' ? p.replace(/\s+/g, '').toLowerCase() : '';
}
