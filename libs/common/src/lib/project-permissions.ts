import { IntoBigInt } from "./types";

/**
 * Bit flags representing project and workspace permissions.
 */
export const PermissionFlags = Object.freeze({
  /** Project owner. No one else in the project can have this permission. */
  Owner: -1n,

  /** Project administrator permission, equivalent to all permissions. */
  ProjectAdmin: 1n << 63n,

  /** Can manage members (add/remove users) in the project, as well as assign roles to them. */
  ManageMembers: 1n << 62n,

  /** Can manage project branches, including creating, deleting, and modifying branches' metadata. */
  ManageBranches: 1n << 61n,

  /** Can manage roles in the project, including creating, deleting, and modifying roles' metadata. */
  ManageRoles: 1n << 60n,

  /** Permission to manage workspaces within the project. */
  ManageWorkspaces: 1n << 59n,

  /** Permission to manage project groups. */
  ManageGroups: 1n << 58n,

  /** Permission to manage project metadata. */
  ManageProjectMetadata: 1n << 57n,

  /** Permission to manage threads in the project. */
  ManageDiscussions: 1n << 56n,

  /** Permission to view the audit log. */
  ViewAudit: 1n << 55n,

  /** Permission to manage project files (upload, rename, delete). */
  ManageFiles: 1n << 54n,

  /** Permission to view and download project files. */
  ViewFiles: 1n << 53n,

  /** Permission to review commits in a workspace. */
  ReviewCommit: 1n << 52n,

  /** Permission to push commits to a workspace. */
  PushCommit: 1n << 51n,

  /** Permission to review requests in a workspace. */
  ReviewRequests: 1n << 40n,

  /** Permission to view requests in a workspace. */
  ViewRequest: 1n << 39n,

  /** Permission to manage workspace metadata. */
  ManageWorkspaceMetadata: 1n << 27n,

  /** Permission to view a workspace. */
  ViewWorkspace: 1n << 26n,

  // Thread posting permissions
  /** Permission to manage comments in threads. */
  ManageComments: 1n << 15n,

  /** Permission to post comments in threads. */
  PostComment: 1n << 14n,

  /** Permission to vote in threads. */
  Vote: 1n << 10n,

  /** Permission to attach files in threads. */
  AttachFiles: 1n << 9n,

  /** Permission to view threads. */
  ViewThread: 1n << 8n,

  /** Permission to view the project's metadata. */
  ViewProject: 1n,

  /** Default value. */
  None: 0n,
});

export const ThreadPermissionsMask = BigInt(
  PermissionFlags.ManageComments |
  PermissionFlags.PostComment |
  PermissionFlags.Vote |
  PermissionFlags.AttachFiles |
  PermissionFlags.ViewThread
);

export type PermissionStrings = keyof typeof PermissionFlags;

export type IntoPermission = bigint | Permission | PermissionStrings | number;

/**
 * Represents a set of permissions for a project or workspace.
 */
export class Permission implements IntoBigInt {
  private _value: bigint;
  constructor(value: IntoPermission) {
    this._value = this.resolvePermission(value);
  }

  /** Returns the permission value as a 64-bit unsigned bigint. */
  get value(): bigint {
    return BigInt.asUintN(64, this._value);
  }

  /** Returns the permission value as a bigint. */
  toBigInt(): bigint {
    return this.value;
  }

  resolveNames(): PermissionStrings[] {
    return (Object.keys(PermissionFlags) as PermissionStrings[])
      .filter(key =>
        typeof PermissionFlags[key] === 'bigint'
        && (this._value & PermissionFlags[key]) === PermissionFlags[key]
      );
  }

  [Symbol.toStringTag](): string {
    return `Permission(${this._value.toString()})`;
  }

  /**
   * Resolves a permission identifier to its bigint value.
   * @param perm - The permission to resolve (string, number, or bigint).
   * @returns The resolved permission as a bigint.
   * @throws {Error} If the permission string is unknown or the type is invalid.
   */
  resolvePermission(perm: IntoPermission): bigint {
    if (perm instanceof Permission) {
      return perm.value;
    } else if (typeof perm === 'string') {
      if (perm in PermissionFlags) {
        return PermissionFlags[perm];
      }
      if (/\d+n?/.test(perm)) {
        return BigInt(perm);
      }
      throw new Error(`Unknown permission string: ${perm}`);
    }
    return BigInt(perm);
  }

  /**
   * Creates a new `Permission` instance from the specified permissions.
   * @param permissions - Permissions to include, can be strings, numbers, or bigint.
   * @return A new `Permission` instance with the specified permissions added.
   */
  static from(...permissions: Array<IntoPermission>): Permission {
    const perms = new Permission(PermissionFlags.None);
    for (const perm of permissions) {
      perms.add(perm);
    }
    return perms;
  }

  /** Adds permissions to the current permission set.
   * @param permissions - Permissions to add, can be strings, numbers, or bigint.
   * @return The updated `Permission` instance.
   */
  add(...permissions: Array<IntoPermission>): this {
    for (const perm of permissions) {
      this._value |= this.resolvePermission(perm);
    }
    return this;
  }

  /**
   * Removes the specified permissions from the current permission set.
   * @param permissions - Permissions to remove, can be strings, numbers, or bigint.
   * @returns The updated `Permission` instance.
   */
  remove(...permissions: Array<IntoPermission>): this {
    for (const perm of permissions) {
      this._value &= ~this.resolvePermission(perm);
    }
    return this;
  }

  /**
   * Checks if all specified permissions are present in the current permission set.
   * @param permissions - Permissions to check, can be strings, numbers, or bigint.
   * @returns `true` if all permissions are present, otherwise `false`.
   */
  has(...permissions: Array<IntoPermission>): boolean {
    // Convert current value to binary string
    const binaryStr = this._value.toString(2).padStart(64, '0');

    for (const perm of permissions) {
      const resolvedPerm = this.resolvePermission(perm);
      if (resolvedPerm === PermissionFlags.None) continue;

      // Get the bit position from the permission value
      const bitPos = resolvedPerm === 1n ? 0 : resolvedPerm.toString(2).length - 1;

      // Check if that specific bit is set
      if (binaryStr[63 - bitPos] !== '1') {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if any of the specified permissions are present in the current permission set.
   * @param permissions - Permissions to check, can be strings, numbers, or bigint.
   * @returns `true` if any permission is present, otherwise `false`.
   */
  hasAny(...permissions: Array<IntoPermission>): boolean {
    // Convert current value to binary string
    const binaryStr = this._value.toString(2).padStart(64, '0');

    for (const perm of permissions) {
      const resolvedPerm = this.resolvePermission(perm);
      if (resolvedPerm === PermissionFlags.None) continue;

      // Get the bit position from the permission value
      const bitPos = resolvedPerm === 1n ? 0 : resolvedPerm.toString(2).length - 1;

      // Check if that specific bit is set
      if (binaryStr[63 - bitPos] === '1') {
        return true;
      }
    }
    return false;
  }

  /**
   * Applies a mask to the current permission set, keeping only the bits present in the mask.
   * @param mask - The mask to apply, as a bigint or `Permission` instance.
   * @returns The updated `Permission` instance.
   */
  applyMask(mask: bigint | Permission): this {
    const maskValue = mask instanceof Permission ? mask.value : BigInt(mask);
    this._value &= maskValue;
    return this;
  }
}

