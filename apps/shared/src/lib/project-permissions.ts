export class PermissionFlags {
  // 1 unused bit, since MySql is quirky and implicitly treats bigint as signed
  static readonly All = BigInt.asUintN(64, -1n) >> 1n;
  static readonly ProjectAdmin = 1n << 63n;
  static readonly ManageMembers = 1n << 62n;
  static readonly ManageBranches = 1n << 61n;
  static readonly ManageRoles = 1n << 60n;
  static readonly ManageWorkspaces = 1n << 59n;
  static readonly ManageGroups = 1n << 58n;
  static readonly ViewAudit = 1n << 55n;

  static readonly ReviewCommit = 1n << 53n;
  static readonly PushCommit = 1n << 52n;

  static readonly ReviewRequests = 1n << 40n;
  static readonly ViewRequest = 1n << 39n;

  static readonly ManageWorkspaceMetadata = 1n << 27n;
  static readonly ViewWorkspace = 1n << 26n;

  static readonly ManageComments = 1n << 15n;
  static readonly PostComment = 1n << 14n;
  static readonly ViewDiscussion = 1n << 13n;
  static readonly ViewProject = 1n;
}

export class Permission {
  private _value: bigint;
  constructor(value: bigint | boolean | string | number) {
    this._value = BigInt.asUintN(64, BigInt(value));
  }

  /** Returns the permission value as a 64-bit unsigned bigint. */
  get value(): bigint {
    return  BigInt.asUintN(64, this._value);
  }

  resolvePermission(perm: ProjectPermissionsTypes | bigint | string | number): bigint {
    if (typeof perm === 'string') {
      if (!(perm in PermissionFlags)) {
        throw new Error(`Unknown permission string: ${perm}`);
      }
      return PermissionFlags[perm as ProjectPermissionsTypes] as bigint;
    } else if (typeof perm === 'bigint' || typeof perm === 'number') {
      return BigInt(perm);
    } else {
      throw new Error(`Invalid permission type: ${typeof perm}`);
    }
  }

  from(...permissions: Array<ProjectPermissionsTypes | bigint | string | number>): Permission {
    for (const perm of permissions) {
      this._value |= this.resolvePermission(perm);
    }
    return this;
  }

  add(...permissions: Array<ProjectPermissionsTypes | bigint | string | number>): Permission {
    for (const perm of permissions) {
      this._value |= this.resolvePermission(perm);
    }
    return this;
  }

  remove(...permissions: Array<ProjectPermissionsTypes | bigint | string | number>): Permission {
    for (const perm of permissions) {
      this._value &= ~this.resolvePermission(perm);
    }
    return this;
  }

  has(...permissions: Array<ProjectPermissionsTypes | bigint | string | number>): boolean {
    for (const perm of permissions) {
      const resolvedPerm = this.resolvePermission(perm);
      if ((this._value & resolvedPerm) !== resolvedPerm) {
        return false;
      }
    }
    return true;
  }

  hasAny(...permissions: Array<ProjectPermissionsTypes | bigint | string | number>): boolean {
    for (const perm of permissions) {
      const resolvedPerm = this.resolvePermission(perm);
      if ((this._value & resolvedPerm) === resolvedPerm) {
        return true;
      }
    }
    return false;
  }
}

export type ProjectPermissionsTypes = keyof typeof PermissionFlags;

export function hasPermission(
  value: bigint,
  against: Array<ProjectPermissionsTypes | bigint | string | number>
): boolean {
  for (const perm of against) {
    let resolvedPerm: bigint;
    if (typeof perm === 'string') {
      if (!(perm in PermissionFlags)) {
        throw new Error(`Unknown permission string: ${perm}`);
      }
      resolvedPerm = PermissionFlags[perm as ProjectPermissionsTypes] as bigint;
    }
    else {
      resolvedPerm = BigInt(perm)
    }
    if ((value & resolvedPerm) !== resolvedPerm) {
      return false;
    }
  }
  return true;
}
