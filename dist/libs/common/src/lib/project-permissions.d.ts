import { IntoBigInt } from "./types";
/**
 * Bit flags representing project and workspace permissions.
 */
export declare const PermissionFlags: Readonly<{
    /** Project owner. No one else in the project can have this permission. */
    Owner: -1n;
    /** Project administrator permission, equivalent to all permissions. */
    ProjectAdmin: bigint;
    /** Can manage members (add/remove users) in the project, as well as assign roles to them. */
    ManageMembers: bigint;
    /** Can manage project branches, including creating, deleting, and modifying branches' metadata. */
    ManageBranches: bigint;
    /** Can manage roles in the project, including creating, deleting, and modifying roles' metadata. */
    ManageRoles: bigint;
    /** Permission to manage workspaces within the project. */
    ManageWorkspaces: bigint;
    /** Permission to manage project groups. */
    ManageGroups: bigint;
    /** Permission to manage project metadata. */
    ManageProjectMetadata: bigint;
    /** Permission to manage threads in the project. */
    ManageDiscussions: bigint;
    /** Permission to view the audit log. */
    ViewAudit: bigint;
    /** Permission to manage project files (upload, rename, delete). */
    ManageFiles: bigint;
    /** Permission to view and download project files. */
    ViewFiles: bigint;
    /** Permission to review commits in a workspace. */
    ReviewCommit: bigint;
    /** Permission to push commits to a workspace. */
    PushCommit: bigint;
    /** Permission to review requests in a workspace. */
    ReviewRequests: bigint;
    /** Permission to view requests in a workspace. */
    ViewRequest: bigint;
    /** Permission to manage workspace metadata. */
    ManageWorkspaceMetadata: bigint;
    /** Permission to view a workspace. */
    ViewWorkspace: bigint;
    /** Permission to edit and save translations. */
    ManageTranslation: bigint;
    /** Permission to manage comments in threads. */
    ManageComments: bigint;
    /** Permission to post comments in threads. */
    PostComment: bigint;
    /** Permission to vote in threads. */
    Vote: bigint;
    /** Permission to attach files in threads. */
    AttachFiles: bigint;
    /** Permission to view threads. */
    ViewThread: bigint;
    /** Permission to view the project's metadata. */
    ViewProject: 1n;
    /** Default value. */
    None: 0n;
}>;
export declare const ThreadPermissionsMask: bigint;
export type PermissionStrings = keyof typeof PermissionFlags;
export type IntoPermission = bigint | Permission | PermissionStrings | number;
/**
 * Represents a set of permissions for a project or workspace.
 */
export declare class Permission implements IntoBigInt {
    private _value;
    constructor(value: IntoPermission);
    /** Returns the permission value as a 64-bit unsigned bigint. */
    get value(): bigint;
    /** Returns the permission value as a bigint. */
    toBigInt(): bigint;
    resolveNames(): PermissionStrings[];
    [Symbol.toStringTag](): string;
    /**
     * Resolves a permission identifier to its bigint value.
     * @param perm - The permission to resolve (string, number, or bigint).
     * @returns The resolved permission as a bigint.
     * @throws {Error} If the permission string is unknown or the type is invalid.
     */
    resolvePermission(perm: IntoPermission): bigint;
    /**
     * Creates a new `Permission` instance from the specified permissions.
     * @param permissions - Permissions to include, can be strings, numbers, or bigint.
     * @return A new `Permission` instance with the specified permissions added.
     */
    static from(...permissions: Array<IntoPermission>): Permission;
    /** Adds permissions to the current permission set.
     * @param permissions - Permissions to add, can be strings, numbers, or bigint.
     * @return The updated `Permission` instance.
     */
    add(...permissions: Array<IntoPermission>): this;
    /**
     * Removes the specified permissions from the current permission set.
     * @param permissions - Permissions to remove, can be strings, numbers, or bigint.
     * @returns The updated `Permission` instance.
     */
    remove(...permissions: Array<IntoPermission>): this;
    /**
     * Checks if all specified permissions are present in the current permission set.
     * @param permissions - Permissions to check, can be strings, numbers, or bigint.
     * @returns `true` if all permissions are present, otherwise `false`.
     */
    has(...permissions: Array<IntoPermission>): boolean;
    /**
     * Checks if any of the specified permissions are present in the current permission set.
     * @param permissions - Permissions to check, can be strings, numbers, or bigint.
     * @returns `true` if any permission is present, otherwise `false`.
     */
    hasAny(...permissions: Array<IntoPermission>): boolean;
    /**
     * Applies a mask to the current permission set, keeping only the bits present in the mask.
     * @param mask - The mask to apply, as a bigint or `Permission` instance.
     * @returns The updated `Permission` instance.
     */
    applyMask(mask: bigint | Permission): this;
}
//# sourceMappingURL=project-permissions.d.ts.map