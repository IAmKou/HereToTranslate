<script setup lang="ts">
import { ref, onMounted, watch, defineProps, defineEmits, computed } from 'vue';
import axiosInstance from '../api';
import { useToast } from "primevue/usetoast";
import Toast from 'primevue/toast';
import { useAuthStore } from '../store/auth';
import { useProjectPermission } from '../composables/useProjectPermission';
import { projectInvitationService, type ProjectInvitation } from '../services/project-invitation.service';

const emit = defineEmits<{
  (e: 'update-role-count', count: number): void
}>();

const toast = useToast();
const modalToast = useToast();

interface Role {
  id: string;
  name: string;
  permissionFlags?: string | number;
  permissions?: string[];
  isProjectRole?: boolean;
  users?: User[];
}

interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  roles?: Role[];
  selectedRole?: string;
}

interface Member extends User {
  roles: Role[];
  selectedRole: string;
}

interface Project {
  id: string;
  createdBy?: {
    id: string;
  };
}

interface MemberMap {
  [key: string]: Member;
}

const props = defineProps<{
  project: Project;
  members?: Member[];
  currentUser?: any;
}>();

// State với type annotations
const roles = ref<Role[]>([]);
const loading = ref(false);
const error = ref('');
const showCreateRole = ref(false);
const newRoleName = ref('');
const newRolePermissions = ref<string[]>([]);
const creating = ref(false);
const deletingRoleId = ref<string | null>(null);
const roleNameError = ref('');
const permissionsError = ref('');
const showAllPermissionsModal = ref(false);
const selectedRoleForPermissions = ref<Role | null>(null);

// Member management state
const members = ref<Member[]>([]);
const membersLoading = ref(false);
const membersError = ref('');
const removingMember = ref<string | null>(null);
const userSearch = ref({
  identifier: '',
  loading: false,
  error: '',
  results: [] as User[],
  addingId: null as string | null,
});
const showAddUserSection = ref(false);
const showFullRoles = ref<string | null>(null);

// State cho modal assign role
const showAssignRoleModal = ref(false);
const userToAssignRole = ref<User | null>(null);
const selectedRoleId = ref('');
const assigningRole = ref(false);
const hasAttemptedSubmit = ref(false);

// State cho remove role
const removingRoleId = ref<string | null>(null);

// Thêm state cho modal hiển thị tất cả roles
const showAllRolesModal = ref(false);
const selectedMemberForRoles = ref<Member | null>(null);

// Thêm state cho multiple selection
const selectedRoleIds = ref<string[]>([]);

const availablePermissions = [
  { value: 'ProjectAdmin', label: 'Project Admin', bit: 63n },
  { value: 'ManageRoles', label: 'Manage Roles', bit: 60n },
  { value: 'ManageMembers', label: 'Manage Members', bit: 62n },
  { value: 'ManageBranches', label: 'Manage Branches', bit: 61n },
  { value: 'ManageGroups', label: 'Manage Groups', bit: 58n },
  { value: 'ManageProjectMetadata', label: 'Manage Project Metadata', bit: 57n },
  { value: 'ManageWorkspaces', label: 'Manage Workspaces', bit: 59n },
  { value: 'ManageDiscussions', label: 'Manage Discussions', bit: 56n },
  { value: 'ViewAudit', label: 'View Audit', bit: 55n },
  { value: 'ReviewCommit', label: 'Review Commit', bit: 53n },
  { value: 'PushCommit', label: 'Push Commit', bit: 52n },
  { value: 'ReviewRequests', label: 'Review Requests', bit: 40n },
  { value: 'ViewRequest', label: 'View Request', bit: 39n },
  { value: 'ManageWorkspaceMetadata', label: 'Manage Workspace Metadata', bit: 27n },
  { value: 'ViewWorkspace', label: 'View Workspace', bit: 26n },
  { value: 'ViewProject', label: 'View Project', bit: 25n },
  { value: 'ManageComments', label: 'Manage Comments', bit: 15n },
  { value: 'PostComment', label: 'Post Comment', bit: 14n },
  { value: 'Vote', label: 'Vote', bit: 10n },
  { value: 'AttachFiles', label: 'Attach Files', bit: 9n },
  { value: 'ViewThread', label: 'View Thread', bit: 8n },
];

function parsePermissionFlags(bitmask: string | number | bigint | undefined | any): string[] {
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

    const permissions = availablePermissions
      .filter(perm => {
        const mask = BigInt(1) << perm.bit;
        return (flags & mask) !== BigInt(0);
      })
      .map(p => p.value);

    console.log('parsed permissions:', permissions);
    return permissions;
  } catch (e) {
    console.error('Invalid permissionFlags:', actualBitmask, e);
    return [];
  }
}

// Sửa lại các hàm với type annotations
const fetchRoles = async () => {
  if (!props.project?.id) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await axiosInstance.get<Role[]>(
      `/projects/${props.project.id}/roles`
    );
    // KHÔNG filter bỏ Everyone ở đây, giữ lại tất cả roles
    const projectRoles = Array.isArray(data) ? data : [];
    // Filter out duplicate roles based on role ID and name
    const uniqueRoles: Role[] = [];
    const seenRoleIds = new Set<string>();
    const seenRoleNames = new Set<string>();
    projectRoles.forEach(role => {
      const roleKey = `${role.id}-${role.name}`;
      if (!seenRoleIds.has(role.id) && !seenRoleNames.has(role.name.toLowerCase())) {
        seenRoleIds.add(role.id);
        seenRoleNames.add(role.name.toLowerCase());
        uniqueRoles.push(role);
      }
    });
    roles.value = uniqueRoles;
  } catch (err: any) {
    error.value = err.message || 'Failed to load roles.';
  } finally {
    loading.value = false;
  }
};

const loadMembers = async () => {
  if (!props.project) return;
  membersLoading.value = true;
  membersError.value = '';
  try {
    const { data } = await axiosInstance.get(`/projects/${props.project.id}/members`);
    console.log('🔍 Raw members data from backend:', data);
    console.log('🔍 Members array:', data.members);
    console.log('🔍 Sample member avatarUrl:', data.members?.[0]?.avatarUrl);

    const memberMap: MemberMap = {};

    if (data.members) {
      for (const m of data.members) {
        let memberRoles: Role[] = [];
        if (Array.isArray(m.roles)) {
          const uniqueRoles = new Set<string>();
          m.roles.forEach((role: Role) => {
            if (role && role.id && role.name) {
              const roleKey = `${role.id}-${role.name}`;
              if (!uniqueRoles.has(roleKey)) {
                uniqueRoles.add(roleKey);
                // Nếu role có permissionFlags mà chưa có permissions, parse ra permissions
                let permissions = role.permissions;
                if ((!permissions || permissions.length === 0) && role.permissionFlags) {
                  permissions = parsePermissionFlags(role.permissionFlags);
                }
                memberRoles.push({ ...role, permissions });
              }
            }
          });
        }
        memberMap[m.id] = { ...m, roles: memberRoles, selectedRole: '' };
      }
    }

    if (data.projectRoles) {
      for (const role of data.projectRoles) {
        if (role.users) {
          for (const user of role.users) {
            if (!memberMap[user.id]) {
              memberMap[user.id] = { ...user, roles: [], selectedRole: '' };
            }
            const hasRole = memberMap[user.id].roles.some(r => r.id === role.id);
            if (!hasRole) {
              memberMap[user.id].roles.push({ id: role.id, name: role.name });
            }
          }
        }
      }
    }

    // Add Project Owner role with all permissions for project owner
    if (props.project?.createdBy?.id) {
      const ownerId = String(props.project.createdBy.id);
      if (memberMap[ownerId]) {
        const hasProjectOwnerRole = memberMap[ownerId].roles.some(r => r.name === 'Project Owner');
        if (!hasProjectOwnerRole && String(memberMap[ownerId].id) === ownerId) {
          console.log('[DEBUG] Gán role Project Owner cho user:', memberMap[ownerId]);
          memberMap[ownerId].roles.push({
            id: 'project-owner',
            name: 'Project Owner',
            isProjectRole: true,
            permissions: availablePermissions.map(p => p.value)
          });
        }
      }
    }

    members.value = Object.values(memberMap);

    // Sort members so project owner is always first
    members.value.sort((a, b) => {
      const aIsOwner = a.id === props.project?.createdBy?.id;
      const bIsOwner = b.id === props.project?.createdBy?.id;

      if (aIsOwner && !bIsOwner) return -1;
      if (!aIsOwner && bIsOwner) return 1;

      return (a.fullName || a.username || '').localeCompare(b.fullName || b.username || '');
    });
  } catch (err) {
    const error = err as Error;
    membersError.value = error.message || 'Failed to load members.';
  } finally {
    membersLoading.value = false;
  }
};

// User search
const searchUser = async () => {
  if (!props.project) return;
  userSearch.value.loading = true;
  userSearch.value.error = '';
  userSearch.value.results = [];
  try {
    console.log('Searching for:', userSearch.value.identifier);
    const { data } = await axiosInstance.post(
      `/projects/${props.project.id}/search-user`,
      { identifier: userSearch.value.identifier }
    );
    console.log('Raw response:', data);

    let rawResults = [];

    // Handle different response formats
    if (data && Array.isArray(data)) {
      rawResults = data;
    } else if (data && data.user && Array.isArray(data.user)) {
      rawResults = data.user;
    } else if (data && data.user && typeof data.user === 'object') {
      rawResults = [data.user];
    } else if (data && data.users && Array.isArray(data.users)) {
      rawResults = data.users;
    } else if (data && typeof data === 'object' && data.id) {
      rawResults = [data];
    } else {
      console.log('No valid results found in response');
      userSearch.value.error = 'No user found.';
    }

    console.log('Processed results:', rawResults);

    // Map backend fields to frontend fields
    userSearch.value.results = rawResults.map(u => ({
      id: u.user_id || u.id || u.userId,
      email: u.user_email || u.email || u.userEmail,
      phone: u.user_phone || u.phone || u.userPhone,
      fullName: u.user_fullName || u.fullName || u.userFullName || u.name,
      username: u.user_username || u.username || u.userUsername,
    }));

    console.log('Final search results:', JSON.stringify(userSearch.value.results, null, 2));

    if (userSearch.value.results.length === 0) {
      userSearch.value.error = 'No user found.';
    }
  } catch (err) {
    console.error('Search error:', err);
    userSearch.value.error = err.message || 'Failed to search user.';
  } finally {
    userSearch.value.loading = false;
  }
};

// State cho modal invite user
const showInviteUserModal = ref(false);
const inviteForm = ref({
  emails: '',
  message: '',
  expiresIn: 7 // Default 7 days
});
const invitingUsers = ref(false);

const sendProjectInvitation = async (user: User) => {
  if (!props.project || !user) return;
  userSearch.value.addingId = user.id;
  try {
    console.log('Sending project invitation:', {
      projectId: props.project.id,
      userId: user.id,
      user: user
    });

    // Send invitation to user
    await projectInvitationService.createInvitation(props.project.id, {
      invitedUserId: user.id.toString()
    });

    // Clear search results and identifier
    userSearch.value.results = userSearch.value.results.filter(u => u.id !== user.id);
    userSearch.value.identifier = '';

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Project invitation sent successfully',
      life: 3000
    });
  } catch (err: any) {
    console.error('Send invitation error:', err);
    let errorMsg = 'Failed to send invitation';
    if (err.response?.data?.message) {
      errorMsg = err.response.data.message;
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMsg,
      life: 5000
    });
  } finally {
    userSearch.value.addingId = null;
  }
};

// Function to open invite user modal
const openInviteUserModal = () => {
  inviteForm.value = {
    emails: '',
    message: `You're invited to join the project ${props.project?.name || 'this project'}.`,
    expiresIn: 7 // Default 7 days
  };
  showInviteUserModal.value = true;
};

// Function to send invitation via modal
const sendInvitationsFromModal = async () => {
  if (!props.project?.id || !inviteForm.value.emails.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please enter at least one email or username',
      life: 3000
    });
    return;
  }

  invitingUsers.value = true;
  try {
    // Parse emails/usernames (comma separated)
    const identifiers = inviteForm.value.emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (identifiers.length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter at least one valid email ',
        life: 3000
      });
      return;
    }

    // First, search for users by their identifiers
    const userSearchPromises = identifiers.map(async (identifier) => {
      try {
        const { data } = await axiosInstance.post(
          `/projects/${props.project.id}/search-user`,
          { identifier }
        );
        console.log(`Search result for ${identifier}:`, data);

        // The endpoint returns { users: Array<{ user_id, user_fullName, user_email, user_phone }> }
        if (data.users && data.users.length > 0) {
          const user = data.users[0];
          // Map backend fields to frontend fields
          const mappedUser = {
            id: user.user_id || user.id || user.userId,
            email: user.user_email || user.email || user.userEmail,
            phone: user.user_phone || user.phone || user.userPhone,
            fullName: user.user_fullName || user.fullName || user.userFullName || user.name,
            username: user.user_username || user.username || user.userUsername,
          };
          console.log('Mapped user:', mappedUser);
          return { success: true, identifier, user: mappedUser };
        } else {
          return { success: false, identifier, error: 'No user found' };
        }
      } catch (err) {
        console.error(`Search error for ${identifier}:`, err);
        return { success: false, identifier, error: err };
      }
    });

    const searchResults = await Promise.all(userSearchPromises);
    const foundUsers = searchResults.filter(r => r.success && r.user);
    const notFoundUsers = searchResults.filter(r => !r.success || !r.user);

    // Send invitations to found users
    const invitationPromises = foundUsers.map(async (result) => {
      try {
        console.log('Sending invitation to user:', result.user);
        console.log('Project ID:', props.project.id);
        console.log('Invitation data:', {
          invitedUserId: result.user.id.toString(),
          message: inviteForm.value.message
        });

        // Check if user is already a member
        const isAlreadyMember = members.value.some(member => member.id === result.user.id);
        console.log('Is user already a member?', isAlreadyMember);

        if (isAlreadyMember) {
          console.log('User is already a member, skipping invitation');
          return { success: false, identifier: result.identifier, error: 'User is already a member of this project' };
        }

        // Check if there's already a pending invitation (optional check)
        try {
          const existingInvitations = await projectInvitationService.getProjectInvitations(props.project.id);
          const hasPendingInvitation = existingInvitations.invitations.some(inv =>
            inv.invitedUserId === result.user.id && inv.status === 'pending'
          );
          console.log('Has pending invitation?', hasPendingInvitation);
          if (hasPendingInvitation) {
            return { success: false, identifier: result.identifier, error: 'User already has a pending invitation' };
          }
        } catch (err) {
          console.log('Could not check existing invitations:', err);
        }

        // Log the exact data being sent
        const invitationData = {
          invitedUserId: result.user.id.toString(),
          message: inviteForm.value.message,
          expiresIn: inviteForm.value.expiresIn.toString()
        };
        console.log('Sending invitation data to server:', invitationData);

        await projectInvitationService.createInvitation(props.project.id, invitationData);
        console.log('Invitation sent successfully for:', result.identifier);
        return { success: true, identifier: result.identifier, user: result.user };
      } catch (err) {
        console.error('Failed to send invitation for:', result.identifier, err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText
        });
        return { success: false, identifier: result.identifier, error: err };
      }
    });

    const invitationResults = await Promise.all(invitationPromises);
    const successful = invitationResults.filter(r => r.success);
    const failed = invitationResults.filter(r => !r.success);

    // Close modal
    showInviteUserModal.value = false;
    inviteForm.value = { emails: '', message: '', expiresIn: 7 };

    // Show results
    if (successful.length > 0) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Successfully sent ${successful.length} invitation(s)`,
        life: 3000
      });
    }

    if (notFoundUsers.length > 0) {
      const notFoundIdentifiers = notFoundUsers.map(r => r.identifier).join(', ');
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: `Could not find users: ${notFoundIdentifiers}`,
        life: 5000
      });
    }

    if (failed.length > 0) {
      // Check for specific error types and show appropriate message
      const hasPendingInvitation = failed.some(f =>
        f.error === 'User already has a pending invitation to this project' ||
        f.error?.response?.data?.message === 'User already has a pending invitation to this project'
      );

      const hasAlreadyMember = failed.some(f =>
        f.error === 'User is already a member of this project'
      );

      if (hasPendingInvitation) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'User already has a pending invitation to this project',
          life: 5000
        });
      } else if (hasAlreadyMember) {
        const memberEmails = failed
          .filter(f => f.error === 'User is already a member of this project')
          .map(f => f.identifier)
          .join(', ');
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: `Cannot send invitation to: ${memberEmails} (already a member)`,
          life: 5000
        });
      } else {
        const failedEmails = failed.map(f => f.identifier).join(', ');
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: `Cannot send invitation to: ${failedEmails}`,
          life: 5000
        });
      }
    }
  } catch (err: any) {
    console.error('Send invitations error:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to send invitations',
      life: 5000
    });
  } finally {
    invitingUsers.value = false;
  }
};

// Function to close invite user modal
const closeInviteUserModal = () => {
  showInviteUserModal.value = false;
  inviteForm.value = { emails: '', message: '', expiresIn: 7 };
  invitingUsers.value = false;
};

function displayRoles(member: Member, project: Project): Role[] {
  if (!member.roles) return [];
  return member.roles.filter(
    (role) =>
      role &&
      role.name &&
      role.name !== 'Everyone' // Chỉ ẩn Everyone ở UI
  );
}
function getRoleBadgeClass(roleName: string) {
  if (!roleName) return 'role-badge-default';
  const name = roleName.toLowerCase();
  if (name.includes('owner')) return 'role-badge-owner';
  if (name.includes('admin')) return 'role-badge-admin';
  if (name.includes('mod')) return 'role-badge-mod';
  if (name.includes('everyone')) return 'role-badge-everyone';
  return 'role-badge-default';
}
function getRoleCount(roles: Role[] | undefined) {
  return roles ? roles.length : 0;
}
function sortBy(key: 'name' | 'roles' | 'joined') {
  if (!members.value.length) return;
  members.value.sort((a, b) => {
    // Project owner should always be first
    const aIsOwner = a.id === props.project?.createdBy?.id;
    const bIsOwner = b.id === props.project?.createdBy?.id;

    if (aIsOwner && !bIsOwner) return -1;
    if (!aIsOwner && bIsOwner) return 1;

    // If both are owners or both are not owners, apply normal sorting
    if (key === 'name') {
      return (a.fullName || a.username || '').localeCompare(b.fullName || b.username || '');
    }
    if (key === 'roles') {
      return getRoleCount(b.roles) - getRoleCount(a.roles);
    }
    if (key === 'joined') {
      const aDate = getJoinedDateValue(a);
      const bDate = getJoinedDateValue(b);
      if (!aDate || !bDate) return 0;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    }
    return 0;
  });
}

// Function to get joined date display text
function getJoinedDate(member: any): string {
  const joinedDate = getJoinedDateValue(member);
  if (!joinedDate) return 'Unknown';

  const date = new Date(joinedDate);

  // Add 7 hours to fix timezone offset
  date.setHours(date.getHours() + 7);

  // Format: "Dec 15, 2024 at 14:30"
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Function to get joined date value for sorting
function getJoinedDateValue(member: any): string | null {
  console.log('🔍 getJoinedDateValue for member:', {
    id: member.id,
    name: member.fullName || member.username,
    joinedAt: member.joinedAt,
    createdAt: member.createdAt,
    projectCreatedAt: props.project?.createdAt,
    isOwner: member.id === props.project?.createdBy?.id
  });

  // Always use joinedAt from backend if available (including for project owner)
  if (member.joinedAt) {
    console.log('🔍 Using joinedAt from backend:', member.joinedAt);
    return member.joinedAt;
  }

  // For project owner without joinedAt, use project creation date
  if (member.id === props.project?.createdBy?.id) {
    console.log('🔍 Using project creation date for owner (no joinedAt)');
    return props.project?.createdAt;
  }

  // Fallback to user creation date or project creation date
  console.log('🔍 Using fallback date:', member.createdAt || props.project?.createdAt);
  return member.createdAt || props.project?.createdAt || null;
}

// Helper to get avatar text safely
function getAvatarText(user: User) {
  const name = user?.fullName || user?.username || user?.email || user?.phone || '';
  if (name) {
    // Lấy 2 ký tự đầu tiên nếu có thể
    const initials = name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
    return initials.length >= 2 ? initials.substring(0, 2) : initials;
  }
  return '?';
}

// Helper to get full avatar URL
function getFullAvatarUrl(avatarUrl?: string) {
  console.log('🔍 getFullAvatarUrl input:', avatarUrl);
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  if (avatarUrl.startsWith('data:')) return avatarUrl; // Data URL từ preview

  // Sử dụng endpoint database với prefix /api/users
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const fullUrl = base + '/users' + avatarUrl;
  console.log('🔍 getFullAvatarUrl output:', fullUrl);
  return fullUrl;
}

// Helper to get random color for avatar
function getRandomColor(seed: string): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#8b5cf6', // violet
  ];
  const index = seed.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

const permissionBitmaskMap = availablePermissions.reduce((map, perm, index) => {
  map[perm.value] = BigInt(1) << BigInt(index);
  return map;
}, {} as Record<string, bigint>);
function calculatePermissionFlags(permissions: string[]): string {
  return permissions
    .reduce((acc, perm) => {
      return acc | (permissionBitmaskMap[perm] || BigInt(0));
    }, BigInt(0))
    .toString();
}

// Thêm hàm kiểm tra trùng tên
const isRoleNameExists = (name: string) => {
  return roles.value.some(role => role.name.toLowerCase() === name.toLowerCase());
};

// Helper: kiểm tra user hiện tại có quyền tạo role không
const authStore = useAuthStore();

const canCreateRole = computed(() => {
  console.log('Current userId:', authStore.user?.id);
  console.log('Members:', members.value);
  const currentUser = members.value.find(m => String(m.id) === String(authStore.user?.id));
  console.log('Current user in members:', currentUser);
  if (!currentUser) return false;
  console.log('Current user roles:', currentUser.roles);
  const allPerms = new Set();
  (currentUser.roles || []).forEach(r => {
    (r.permissions || []).forEach(p => allPerms.add(p));
  });
  console.log('All permissions of current user:', Array.from(allPerms));
  return allPerms.has('ManageRoles') || allPerms.has('ProjectAdmin');
});

// Cập nhật hàm createRole: chặn nếu không đủ quyền
const createRole = async () => {
  console.log('==[CREATE ROLE]== canCreateRole:', canCreateRole.value, 'currentUserId:', authStore.user?.id, 'members:', members.value);
  // Chặn nếu không đủ quyền
  if (!canCreateRole.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Bạn không có quyền tạo vai trò mới',
      life: 4000
    });
    return;
  }
  // Clear previous errors
  roleNameError.value = '';
  permissionsError.value = '';

  // Validate role name
  if (!newRoleName.value.trim()) {
    roleNameError.value = 'Role name is required';
    return;
  }

  // Kiểm tra trùng tên
  if (isRoleNameExists(newRoleName.value.trim())) {
    roleNameError.value = 'Role name already exists';
    return;
  }

  if (!props.project?.id || !newRoleName.value || newRolePermissions.value.length === 0) {
    if (newRolePermissions.value.length === 0) {
      permissionsError.value = 'Please select at least one permission';
    }
    return;
  }

  creating.value = true;
  try {
    const permissionFlags = calculatePermissionFlags(newRolePermissions.value);

    console.log('Creating role with data:', {
      projectId: props.project.id,
      name: newRoleName.value,
      permissionFlags: permissionFlags,
      permissions: newRolePermissions.value
    });

    const response = await axiosInstance.post(`/projects/${props.project.id}/roles/create`, {
      name: newRoleName.value.trim(),
      permissionFlags: permissionFlags,
      permissions: newRolePermissions.value,
      permissionFlagsString: permissionFlags.toString()
    });

    console.log('Create role response:', response.data);

    showCreateRole.value = false;
    newRoleName.value = '';
    newRolePermissions.value = [];
    fetchRoles();

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Role created successfully',
      life: 3000
    });
  } catch (err: any) {
    console.error('Create role error:', err);
    console.error('Error response:', err.response?.data);

    // Display errors inline
    if (err.response?.data?.message) {
      let errorMsg = err.response.data.message;

      // Handle if message is an array
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0] || errorMsg.join(', ');
      }

      // Format error messages to be more user-friendly
      if (errorMsg.toLowerCase().includes('name')) {
        roleNameError.value = errorMsg.replace('name', 'Role name');
      } else if (errorMsg.toLowerCase().includes('permission')) {
        permissionsError.value = errorMsg.replace('permission', 'Permission');
      } else {
        roleNameError.value = errorMsg;
      }
    } else if (err.response?.data?.error) {
      let errorMsg = err.response.data.error;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0] || errorMsg.join(', ');
      }
      roleNameError.value = errorMsg.replace('name', 'Role name');
    } else if (err.message) {
      roleNameError.value = err.message;
    } else {
      roleNameError.value = 'Failed to create role';
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: roleNameError.value || 'Failed to create role',
      life: 5000
    });
  } finally {
    creating.value = false;
  }
};

// State cho modal confirm delete role
const showDeleteConfirmModal = ref(false);
const roleToDelete = ref<Role | null>(null);

// Function để xóa role
const deleteRole = async (role: Role) => {
  // Kiểm tra xem role có đang được sử dụng không
  if (isRoleInUse(role)) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Cannot delete role that is assigned to members',
      life: 3000
    });
    return;
  }

  roleToDelete.value = role;
  showDeleteConfirmModal.value = true;
};

// Thêm state cho loading
const isDeleting = ref(false);

// Function để confirm delete
const confirmDeleteRole = async () => {
  if (!roleToDelete.value) return;
  isDeleting.value = true;

  try {
    await axiosInstance.delete(`/projects/${props.project.id}/roles/${roleToDelete.value.id}`);
    await fetchRoles();
    showDeleteConfirmModal.value = false;
    roleToDelete.value = null;

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Role deleted successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Failed to delete role:', err);

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete role: ' + (err.response?.data?.message || err.message),
      life: 5000
    });
  } finally {
    isDeleting.value = false;
  }
};

// Function để cancel delete
const cancelDeleteRole = () => {
  showDeleteConfirmModal.value = false;
  roleToDelete.value = null;
};

// State cho modal confirm delete member
const showDeleteMemberConfirmModal = ref(false);
const memberToDelete = ref<Member | null>(null);

// Function để xóa member (mở modal confirm)
const removeMember = async (member: Member) => {
  if (!props.project?.id || !member.id) return;
  // Không cho phép xóa Project Owner
  if (member.roles.some(r => r.name === 'Project Owner')) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Cannot remove Project Owner',
      life: 3000
    });
    return;
  }
  // Lấy tất cả roleId mà user đang có (trừ Project Owner)
  const memberRoleIds = member.roles
    .filter(r => r.name !== 'Project Owner')
    .map(r => r.id);
  if (memberRoleIds.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'User has no removable roles',
      life: 3000
    });
    return;
  }

  memberToDelete.value = member;
  showDeleteMemberConfirmModal.value = true;
};

// Thêm state cho loading khi xóa member
const isDeletingMember = ref(false);

// Function để confirm delete member
const confirmDeleteMember = async () => {
  if (!memberToDelete.value || !props.project?.id) return;
  isDeletingMember.value = true;

  try {
    // Lấy tất cả roleId mà user đang có (trừ Project Owner)
    const memberRoleIds = memberToDelete.value.roles
      .filter(r => r.name !== 'Project Owner')
      .map(r => r.id);

    // Xóa user khỏi tất cả các role
    await Promise.all(
      memberRoleIds.map(roleId =>
        axiosInstance.post(`/projects/${props.project.id}/roles/${roleId}/users/remove`, {
          userIds: [memberToDelete.value.id]
        })
      )
    );
    // Xóa user khỏi bảng members (DB)
    await axiosInstance.post(`/projects/${props.project.id}/remove-user`, {
      userId: memberToDelete.value.id
    });
    await loadMembers();

    showDeleteMemberConfirmModal.value = false;
    memberToDelete.value = null;

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Member removed successfully',
      life: 3000
    });
  } catch (err: any) {
    console.error('Failed to remove member:', err);
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to remove member';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMsg,
      life: 5000
    });
  } finally {
    isDeletingMember.value = false;
  }
};

// Function để cancel delete member
const cancelDeleteMember = () => {
  showDeleteMemberConfirmModal.value = false;
  memberToDelete.value = null;
};

const showAllPermissions = (role: Role) => {
  selectedRoleForPermissions.value = role;
  showAllPermissionsModal.value = true;
};

// Function để mở modal assign role
const openAssignRoleModal = (user: User) => {
  userToAssignRole.value = user;
  selectedRoleId.value = '';
  hasAttemptedSubmit.value = false; // Reset submission attempt when opening modal
  showAssignRoleModal.value = true;
};

// Function để assign role
const assignRoleToUser = async () => {
  hasAttemptedSubmit.value = true;

  if (!props.project?.id) {
    console.error('Missing project ID');
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Cannot assign role: Project ID is missing',
      life: 3000
    });
    return;
  }

  if (!selectedRoleIds.value.length || !userToAssignRole.value) {
    console.log('Missing required values:', {
      selectedRoleIds: selectedRoleIds.value,
      userToAssignRole: userToAssignRole.value
    });
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select at least one role to assign',
      life: 3000
    });
    return;
  }

  assigningRole.value = true;
  try {
    // First verify user is a member
    const memberResponse = await axiosInstance.get(`/projects/${props.project.id}/members`);
    const isMember = memberResponse.data.members?.some(m => m.id === userToAssignRole.value.id);

    if (!isMember) {
      await axiosInstance.post(`/projects/${props.project.id}/members`, {
        userId: userToAssignRole.value.id,
        email: userToAssignRole.value.email,
        userName: userToAssignRole.value.fullName || userToAssignRole.value.username
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Assign all selected roles
    await Promise.all(
      selectedRoleIds.value.map(roleId =>
        axiosInstance.post(
          `/projects/${props.project.id}/roles/${roleId}/users/add`,
          { userIds: [userToAssignRole.value.id] }
        )
      )
    );

    await Promise.all([loadMembers(), fetchRoles()]);

    showAssignRoleModal.value = false;
    userToAssignRole.value = null;
    selectedRoleIds.value = [];

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Roles assigned successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Failed to assign roles:', err);
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to assign roles';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMsg,
      life: 5000
    });
  } finally {
    assigningRole.value = false;
  }
};

// Function để close assign role modal
const closeAssignRoleModal = () => {
  showAssignRoleModal.value = false;
  userToAssignRole.value = null;
  selectedRoleId.value = '';
  hasAttemptedSubmit.value = false; // Reset submission attempt when closing modal
};

onMounted(() => {
  fetchRoles();
  loadMembers();
});
watch(() => props.project?.id, () => {
  fetchRoles();
  loadMembers();
});

// Thêm computed property để lọc các roles có thể assign
const assignableRoles = computed(() => {
  if (!userToAssignRole.value) return [];

  // Tìm member hiện tại
  const currentMember = members.value.find(m => m.id === userToAssignRole.value.id);
  if (!currentMember) return roles.value;

  // Get list of role names that user already has (use name instead of id to be sure)
  const userRoleNames = new Set(currentMember.roles.map(r => r.name));

  console.log('Current member roles:', currentMember.roles);
  console.log('User role names:', Array.from(userRoleNames));
  console.log('Available roles:', roles.value);

  // Lọc ra các roles:
  // 1. Không phải Everyone và Project Owner
  // 2. User chưa có role này (so sánh bằng name)
  return roles.value.filter(role => {
    const shouldInclude =
      role.name !== 'Everyone' &&
      role.name !== 'Project Owner' &&
      !userRoleNames.has(role.name);

    console.log(`Role ${role.name}: should include = ${shouldInclude}`);
    return shouldInclude;
  });
});

// Thêm computed property để lấy thông tin member hiện tại
const currentMemberRoles = computed(() => {
  if (!userToAssignRole.value) return [];
  const member = members.value.find(m => m.id === userToAssignRole.value.id);
  // Filter out Everyone role
  return (member?.roles || []).filter(role => role.name !== 'Everyone');
});

// Thêm function để remove role
const removeRoleFromUser = async (roleId: string | number | bigint) => {
  if (!props.project?.id || !userToAssignRole.value?.id) return;

  const roleIdStr = String(roleId);
  removingRoleId.value = roleIdStr;
  try {
    console.log('Removing role:', {
      projectId: props.project.id,
      roleId: roleIdStr,
      userId: userToAssignRole.value.id,
    });

    // Optional: find role locally for logging (not mandatory)
    const role = roles.value.find((r) => String(r.id) === roleIdStr);

    // Remove the user from the role using POST method
    await axiosInstance.post(
      `/projects/${props.project.id}/roles/${roleIdStr}/users/remove`,
      {
        userIds: [String(userToAssignRole.value.id)],
      }
    );

    // Refresh member list
    await loadMembers();

    // Update the current member roles directly
    if (userToAssignRole.value) {
      const updatedMember = members.value.find(
        (m) => m.id === userToAssignRole.value.id
      );
      if (updatedMember) {
        userToAssignRole.value = { ...updatedMember };
      } else {
        const currentRoles = userToAssignRole.value.roles || [];
        userToAssignRole.value = {
          ...userToAssignRole.value,
          roles: currentRoles.filter((r) => String(r.id) !== roleIdStr),
        };
      }
    }

    // Update roles list (in case role becomes unused)
    await fetchRoles();

    showCustomToast('Role removed successfully');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to remove role';
    showCustomToast(errorMsg, 'error', 5000);
  } finally {
    removingRoleId.value = null;
  }
};

// Sửa lại hàm isRoleInUse để kiểm tra chính xác hơn
const isRoleInUse = (role: Role) => {
  // Project Owner role cannot be deleted
  if (role.name === 'Project Owner') return true;

  return members.value.some(member =>
    member.roles.some(memberRole =>
      // So sánh cả id và name để đảm bảo chính xác
      (memberRole.id === role.id || memberRole.name.toLowerCase() === role.name.toLowerCase())
    )
  );
};

// Thêm hàm để xác định class cho từng loại permission
const getPermissionClass = (permission: string) => {
  if (permission.toLowerCase().includes('admin')) return 'project-admin';
  if (permission.toLowerCase().includes('manage')) return 'manage';
  if (permission.toLowerCase().includes('view')) return 'view';
  return '';
};

// Thêm hàm để mở modal roles
const showAllMemberRoles = (member: Member) => {
  selectedMemberForRoles.value = member;
  showAllRolesModal.value = true;
};

// Thêm state cho custom toast
const customToast = ref({
  show: false,
  message: '',
  type: 'success',
  duration: 3000
});

// Thêm function hiển thị toast
const showCustomToast = (message: string, type: 'success' | 'error' = 'success', duration: number = 3000) => {
  customToast.value = {
    show: true,
    message,
    type,
    duration
  };

  setTimeout(() => {
    customToast.value.show = false;
  }, duration);
};

// Add new data for role search
const roleSearchQuery = ref('');

// Add computed property for filtered roles
const filteredAssignableRoles = computed(() => {
  if (!roleSearchQuery.value) return assignableRoles.value;
  const query = roleSearchQuery.value.toLowerCase();
  return assignableRoles.value.filter(role =>
    role.name.toLowerCase().includes(query) ||
    parsePermissionFlags(role.permissionFlags).some(perm =>
      perm.toLowerCase().includes(query)
    )
  );
});

// Add function to get role icon
function getRoleIcon(roleName) {
  const name = roleName.toLowerCase();
  if (name.includes('owner')) return '👑';
  if (name.includes('admin')) return '⚡';
  if (name.includes('manager')) return '🔧';
  if (name.includes('moderator')) return '🛡️';
  if (name.includes('editor')) return '✏️';
  if (name.includes('viewer')) return '👁️';
  return '🔹';
}

// Add computed property for role count
const roleCount = computed(() => {
  // Only count actual project roles, excluding system roles like 'Everyone'
  return roles.value.filter(role =>
    role.name !== 'Everyone' &&
    // Include roles that either:
    // 1. Have permissions
    (role.permissionFlags && role.permissionFlags !== '0') ||
    (role.permissions && role.permissions.length > 0) ||
    // 2. Are explicitly marked as project roles
    role.isProjectRole === true
  ).length;
});

// Add computed property for total roles count
const totalRoleCount = computed(() => {
  // Count all roles in the table (excluding Everyone)
  return roles.value.filter(role => role.name !== 'Everyone').length;
});

// Add watcher for roles
watch(
  () => roles.value,
  (newRoles) => {
    // Count actual roles (excluding Everyone)
    const actualCount = newRoles.filter(role => {
      // Only count custom roles (not system roles)
      return role.name !== 'Everyone';
    }).length;
    console.log('Roles:', newRoles);
    console.log('Filtered roles:', newRoles.filter(role => role.name !== 'Everyone'));
    console.log('Emitting role count:', actualCount);
    // Emit the count to parent
    emit('update-role-count', actualCount);
  },
  { immediate: true }
);



const { hasPermission, isProjectOwner, isProjectAdmin, currentMember, currentUserId } = useProjectPermission(props.project, computed(() => members.value), computed(() => props.currentUser || null));
const canManageMembers = computed(() => isProjectOwner.value || isProjectAdmin.value || hasPermission('ManageMembers'));

// Luôn đồng bộ lại members khi props.members thay đổi
watch(() => props.members, (val) => {
  if (Array.isArray(val)) {
    members.value = val.map(m => ({
      ...m,
      roles: Array.isArray(m.roles)
        ? m.roles.map(r => {
          const perms = parsePermissionFlags(r.permissionFlags);
          console.log('[DEBUG] member', m.id, m.username, 'role', r.name, 'permissionFlags', r.permissionFlags, '=> permissions', perms);
          return {
            ...r,
            permissions: perms
          };
        })
        : []
    }));
  }
}, { immediate: true });

</script>

<template>
  <div class="project-role-tab">
    <!-- Add User Section -->
    <div class="management-section user-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">📧</span>
          Invite User to Project
        </h2>
        <span :title="!canManageMembers ? 'You do not have permission to invite members' : ''">
            <button
              class="btn btn-outline btn-sm toggle-btn"
              @click="openInviteUserModal"
              :disabled="!canManageMembers"
            >
              <span class="icon">📧</span>
              Invite User
            </button>
          </span>
      </div>

    </div>

    <!-- Members Section -->
    <div class="management-section members-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">👥</span>
          Project Members
        </h2>
      </div>
      <div class="members-content">
        <div v-if="membersLoading" class="members-loading">
          <div class="loading-spinner-small"></div>
          <span>Loading members...</span>
        </div>
        <div v-else-if="membersError" class="members-error">
          <span class="error-icon">⚠️</span>
          <span>{{ membersError }}</span>
          <button class="btn btn-outline btn-sm" @click="loadMembers">Retry</button>
        </div>
        <div v-else-if="members && members.length > 0" class="members-list members-table-responsive">
          <table class="members-table">
            <thead>
            <tr>
              <th>No.</th>
              <th @click="sortBy('name')">User</th>
              <th @click="sortBy('roles')">Roles</th>
              <th @click="sortBy('joined')">Joined Date</th>
              <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(member, idx) in members" :key="member.id">
              <td>{{ idx + 1 }}</td>
              <td>
                <div :title="member.fullName + ' - ' + member.email" class="user-cell">
                  <div class="user-avatar">
                    <img
                      v-if="member.avatarUrl"
                      :src="getFullAvatarUrl(member.avatarUrl)"
                      :alt="member.fullName || member.username"
                      class="avatar-img"
                      @error="(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }"
                    />
                    <div
                      v-else
                      class="avatar-text"
                      :style="{ backgroundColor: getRandomColor(member.username || member.id) }"
                    >
                      {{ getAvatarText(member) }}
                    </div>
                  </div>
                  <div class="user-info">
                    <div class="user-name">{{ member.fullName || member.username }}</div>
                    <div class="user-email">{{ member.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="roles-display-container">
                  <span
                    class="role-badges-group"
                    @click="showAllMemberRoles(member)"
                    style="cursor:pointer;"
                  >
                    <span
                      v-for="(role, idx) in displayRoles(member, props.project).slice(0, 3)"
                      :key="role.id"
                      :class="['role-badge', getRoleBadgeClass(role.name)]"
                    >{{ role.name }}</span>
                    <span
                      v-if="getRoleCount(displayRoles(member, props.project)) > 3"
                      class="more-badge"
                    >
                      +{{ getRoleCount(displayRoles(member, props.project)) - 3 }} more
                    </span>
                  </span>
                </div>
              </td>
              <td>
                <div class="joined-date">
                  {{ getJoinedDate(member) }}
                </div>
              </td>
              <td>
                <template v-if="!member.roles.some(r => r.name === 'Project Owner')">
                  <span :title="!canManageMembers ? 'You do not have permission to remove members' : ''">
                    <button
                      class="btn btn-outline btn-sm btn-danger"
                      @click="removeMember(member)"
                      :disabled="!canManageMembers || removingMember === member.id"
                    >
                      <span v-if="removingMember === member.id" class="loading-spinner-small"></span>
                      <span v-else class="icon">❌</span>
                      Remove Member
                    </button>
                  </span>
                </template>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-members">
          <div class="empty-icon">👥</div>
          <h3>No Members</h3>
          <p>No members have been added to this project yet.</p>
        </div>
      </div>
    </div>

    <!-- Roles Section -->


    <!-- Create Role Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateRole"
        class="new-modal-overlay"
        @click.self="showCreateRole = false"
      >
        <div class="new-modal-content create-role-modal">
          <div class="new-modal-header">
            <h3>
              <span class="header-icon">🏷️</span>
              Create New Role
            </h3>
            <button class="new-modal-close" @click="showCreateRole = false">×</button>
          </div>

          <div class="new-modal-body">
            <div class="form-group">
              <label for="roleName" class="form-label">
                <span class="label-icon">🏷️</span>
                Role Name
              </label>
              <input
                id="roleName"
                v-model="newRoleName"
                placeholder="Enter role name..."
                class="form-control"
              />
              <div v-if="roleNameError" class="error-message" style="margin-top: 0.5rem;">
                <span class="error-icon">❌</span>
                <p>{{ roleNameError }}</p>
              </div>
            </div>

            <div class="permissions-section">
              <label class="form-label">
                <span class="label-icon">🛡️</span>
                Permissions
              </label>
              <div class="permissions-grid">
                <label
                  v-for="perm in availablePermissions"
                  :key="perm.value"
                  class="permission-item"
                >
                  <input
                    type="checkbox"
                    :value="perm.value"
                    v-model="newRolePermissions"
                    class="permission-checkbox"
                  />
                  <span class="permission-text">{{ perm.label }}</span>
                </label>
              </div>
              <div v-if="permissionsError" class="error-message" style="margin-top: 0.5rem;">
                <span class="error-icon">❌</span>
                <p>{{ permissionsError }}</p>
              </div>
            </div>
          </div>

          <div class="new-modal-footer">
            <button class="btn btn-text" @click="showCreateRole = false">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="createRole"
              :disabled="creating || !newRoleName || newRolePermissions.length === 0 || !canCreateRole"
            >
              <span v-if="creating" class="loading-spinner-small"></span>
              <span v-else class="icon">➕</span>
              {{ creating ? 'Creating...' : 'Create Role' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- All Permissions Modal -->
    <Teleport to="body">
      <div
        v-if="showAllPermissionsModal"
        class="new-modal-overlay"
        @click.self="showAllPermissionsModal = false"
      >
        <div class="new-modal-content">
          <div class="new-modal-header">
            <h3>{{ selectedRoleForPermissions?.name || 'All Permissions' }}</h3>
            <button class="new-modal-close" @click="showAllPermissionsModal = false">×</button>
          </div>
          <div class="new-modal-body">
            <div class="permissions-section">
              <label class="form-label">
                <span class="label-icon">🛡️</span>
                All Permissions ({{ parsePermissionFlags(selectedRoleForPermissions?.permissionFlags).length }} total)
              </label>
              <div class="permissions-grid">
                <div
                  v-for="perm in parsePermissionFlags(selectedRoleForPermissions?.permissionFlags)"
                  :key="perm"
                  class="permission-item readonly"
                >
                  <span class="permission-checkbox readonly">✓</span>
                  <span class="permission-text">{{ perm }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="new-modal-footer">
            <button class="btn btn-secondary" @click="showAllPermissionsModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Delete Role Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirmModal"
        class="delete-dialog-modal"
      >
        <div class="modal-overlay" @click="cancelDeleteRole"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Delete Role</h3>
            <button class="close-btn" @click="cancelDeleteRole">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="warning-message">
              <div class="warning-icon">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <h4>Are you sure you want to delete the role "{{ roleToDelete?.name }}"?</h4>
              <p>This action cannot be undone.</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="cancelDeleteRole" :disabled="isDeleting">
              Keep Role
            </button>
            <button
              class="btn btn-danger"
              @click="confirmDeleteRole"
              :disabled="isDeleting"
            >
              <span v-if="isDeleting" class="loading-spinner-small"></span>
              {{ isDeleting ? 'Deleting...' : 'Delete Role' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Assign Role Modal -->
    <Teleport to="body">
      <div
        v-if="showAssignRoleModal"
        class="new-modal-overlay"
        @click.self="closeAssignRoleModal"
      >
        <div class="modal-content">
          <!-- Current Roles Section -->
          <div class="header-row">
            <div class="header-left">
              <span class="header-icon">👤</span>
              <span class="header-title">Current Roles</span>
            </div>
          </div>

          <div class="current-roles-container">
            <div class="role-badge" v-for="role in currentMemberRoles" :key="role.id">
              <span class="role-dot">⬤</span>
              {{ role.name }}
              <button
                class="remove-role"
                @click="removeRoleFromUser(role.id)"
                :disabled="removingRoleId === role.id"
              >×</button>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Assign New Roles Section -->
          <div class="header-row">
            <div class="header-left">
              <span class="header-icon">🔵</span>
              <span class="header-title">Assign New Roles</span>
            </div>
          </div>

          <div class="search-container">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                v-model="roleSearchQuery"
                placeholder="Search roles..."
                class="search-input"
              />
            </div>
          </div>

          <div class="roles-list">
            <label v-for="role in filteredAssignableRoles"
                   :key="role.id"
                   class="role-item">
              <div class="role-checkbox">
                <input type="checkbox"
                       :value="role.id"
                       v-model="selectedRoleIds"
                       :disabled="assigningRole">
              </div>
              <div class="role-info">
                <div class="role-name">{{ role.name }}</div>
                <div class="role-permissions">
                  {{ parsePermissionFlags(role.permissionFlags).join(', ') }}
                </div>
              </div>
            </label>
          </div>

          <div class="divider"></div>

          <div class="modal-actions">
            <button class="cancel-btn" @click="closeAssignRoleModal">
              Cancel
            </button>
            <button
              class="assign-btn"
              @click="assignRoleToUser"
              :disabled="assigningRole || !selectedRoleIds.length"
            >
              <span v-if="assigningRole" class="loading-spinner"></span>
              <span v-else>➕</span>
              Assign Role
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Thêm modal hiển thị tất cả roles -->
    <Teleport to="body">
      <div
        v-if="showAllRolesModal"
        class="new-modal-overlay"
        @click.self="showAllRolesModal = false"
      >
        <div class="new-modal-content">
          <div class="new-modal-header">
            <h3>
              <span class="header-icon">👤</span>
              {{ selectedMemberForRoles?.fullName || selectedMemberForRoles?.username || 'User' }}'s Roles
            </h3>
            <button class="new-modal-close" @click="showAllRolesModal = false">×</button>
          </div>
          <div class="new-modal-body">
            <div class="role-section">
              <label class="form-label">
                <span class="label-icon">🛡️</span>
                All Roles ({{ displayRoles(selectedMemberForRoles, props.project).length }} total)
              </label>
              <div class="roles-grid">
                <div
                  v-for="role in displayRoles(selectedMemberForRoles, props.project)"
                  :key="role.id"
                  :class="['role-badge', getRoleBadgeClass(role.name)]"
                >
                  {{ role.name }}
                </div>
              </div>
            </div>
          </div>
          <div class="new-modal-footer">
            <button class="btn btn-secondary" @click="showAllRolesModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Cập nhật template cho toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="customToast.show"
             :class="['custom-toast', `custom-toast-${customToast.type}`]">
          <div class="custom-toast-content">
            <span class="toast-icon" v-if="customToast.type === 'success'">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/>
              </svg>
            </span>
            <span class="toast-icon" v-else>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
              </svg>
            </span>
            <div class="toast-text">
              <div class="toast-summary">{{ customToast.type === 'success' ? 'Success' : 'Error' }}</div>
              <div class="toast-detail">{{ customToast.message }}</div>
            </div>
            <button class="toast-close" @click="customToast.show = false">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Delete Member Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteMemberConfirmModal"
        class="delete-dialog-modal"
      >
        <div class="modal-overlay" @click="cancelDeleteMember"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Remove Member</h3>
            <button class="close-btn" @click="cancelDeleteMember">
              ×
            </button>
          </div>
          <div class="modal-body">
            <div class="warning-message">
              <div class="warning-icon">
                ⚠️
              </div>
              <h4>Are you sure you want to remove "{{ memberToDelete?.fullName || memberToDelete?.username }}" from this project?</h4>
              <p>This action cannot be undone. The member will lose access to all project resources and permissions.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="cancelDeleteMember" :disabled="isDeletingMember">
              Keep Member
            </button>
            <button
              class="btn btn-danger"
              @click="confirmDeleteMember"
              :disabled="isDeletingMember"
            >
              <span v-if="isDeletingMember" class="loading-spinner-small"></span>
              {{ isDeletingMember ? 'Removing...' : 'Remove Member' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Invite User Modal -->
    <Teleport to="body">
      <div
        v-if="showInviteUserModal"
        class="new-modal-overlay"
        @click.self="closeInviteUserModal"
      >
        <div class="invite-modal-content">
          <div class="invite-modal-header">
            <h3>Invite People</h3>
            <button class="invite-modal-close" @click="closeInviteUserModal">×</button>
          </div>
          <div class="invite-modal-body">
            <div class="form-group">
              <label for="emails" class="invite-form-label">
                Emails
              </label>
              <textarea
                id="emails"
                v-model="inviteForm.emails"
                placeholder=" joe@example.net, jane@example.com"
                class="invite-form-control"
                rows="2"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="message" class="invite-form-label">
                Message
              </label>
              <textarea
                id="message"
                v-model="inviteForm.message"
                placeholder="Enter a personal message"
                class="invite-form-control"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="expiresIn" class="invite-form-label">
                <span class="label-icon">⏰</span>
                Invitation Expires In
              </label>
              <select
                id="expiresIn"
                v-model="inviteForm.expiresIn"
                class="invite-form-control"
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>
          <div class="invite-modal-footer">
            <button class="invite-btn invite-btn-cancel" @click="closeInviteUserModal">
              Cancel
            </button>
            <button
              class="invite-btn invite-btn-primary"
              @click="sendInvitationsFromModal"
              :disabled="invitingUsers || !inviteForm.emails.trim()"
            >
              <span v-if="invitingUsers" class="loading-spinner-small"></span>
              {{ invitingUsers ? 'Sending...' : 'Send Invitations' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>


<style scoped>
.project-role-tab {
  padding: 0;
  margin: 0;
}

/* Management Section Styles */
.management-section {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 32px rgba(49,130,206,0.10), 0 2px 8px rgba(76,34,128,0.08);
  padding: 0.5rem 0.5rem 0.3rem 0.5rem;
  margin-bottom: 0.2rem;
  position: relative;
}

/* Bring first section closer to navigation tabs */
.management-section:first-child {
  margin-top: 0;
}

.roles-section {
  margin-bottom: 0.2rem;
}

.user-section {
  margin-bottom: 0.2rem;
}

.members-section {
  margin-top: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.3rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #2d3748;
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
}

.title-icon {
  font-size: 1.2rem;
  width: 1.6rem;
  height: 1.6rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.toggle-btn {
  margin-left: auto;
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 5px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.section-content {
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.6rem 0.6rem 0.5rem 0.6rem;
  margin-bottom: 0.6rem;
  border: 1px solid #e2e8f0;
}

/* Form Styles */
.form-row {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
}

.form-group {
  position: relative;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 0.3rem;
  font-size: 0.8rem;
}

.label-icon {
  font-size: 0.9rem;
  color: #3182ce;
}

.form-control {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66,153,225,0.10);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Button Styles */
.btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.2rem !important;
  font-weight: 600 !important;
  border-radius: 3px !important;
  border: none !important;
  padding: 0.3rem 0.7rem !important;
  font-size: 0.7rem !important;
  cursor: pointer !important;
  transition: all 0.18s !important;
  box-shadow: 0 1px 3px #3182ce11 !important;
}

.btn-primary {
  background: linear-gradient(135deg, #38b2ac 0%, #4299e1 100%) !important;
  color: #fff !important;
  box-shadow: 0 1px 4px #4299e133 !important;
  border: 1px solid #4299e1 !important;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #4299e1 0%, #38b2ac 100%) !important;
  color: #fff !important;
  border-color: #3182ce !important;
  box-shadow: 0 2px 8px #4299e133 !important;
  transform: translateY(-1px) !important;
  filter: brightness(1.02) !important;
}

.btn-outline {
  background: #fff !important;
  color: #2563eb !important;
  border: 1px solid #2563eb !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px #2563eb22 !important;
  transition: all 0.18s !important;
}

.btn-outline:hover {
  background: #2563eb !important;
  color: #fff !important;
  border-color: #1e40af !important;
  box-shadow: 0 2px 6px #2563eb33 !important;
}

.btn-sm {
  font-size: 0.65rem !important;
  padding: 0.2rem 0.4rem !important;
  border-radius: 3px !important;
}

.btn-danger {
  background: #e53e3e !important;
  color: #fff !important;
  border: 1px solid #e53e3e !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px #e53e3e22 !important;
}

.btn-danger:hover {
  background: #c53030 !important;
  color: #fff !important;
  border-color: #a02323 !important;
  box-shadow: 0 2px 6px #e53e3e33 !important;
  transform: translateY(-1px) !important;
}

.btn-secondary {
  background: #718096;
  color: #fff;
  border: 2px solid #718096;
}

.btn-secondary:hover {
  background: #4a5568;
  border-color: #4a5568;
}

/* Error and Loading Styles */
.error-message {
  color: #e53e3e;
  background: #fff5f5;
  border: 1.5px solid #e53e3e;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.error-icon {
  font-size: 1rem;
  color: #e53e3e;
}

.loading-spinner-small {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading {
  color: #3182ce;
  margin: 0.8rem 0;
  font-size: 0.9rem;
}

.error {
  color: #e53e3e;
  margin: 0.8rem 0;
  font-size: 0.9rem;
}

/* Invite Section Styles */
.invite-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  text-align: center;
  padding: 1rem;
}

.invite-description {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.info-icon {
  font-size: 1.1rem;
  color: #3182ce;
}

.invite-actions {
  display: flex;
  justify-content: center;
}

/* User Card Styles */
.found-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.8rem 1.2rem;
  margin-top: 0.8rem;
  box-shadow: 0 2px 6px #3182ce11;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8em;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 3px 12px #3182ce18;
  padding: 1rem 1.5rem;
  background: #fff;
  transition: box-shadow 0.18s, border 0.18s;
}

.user-card:hover {
  box-shadow: 0 6px 24px #3182ce33;
  border-color: #4299e1;
}

.user-card-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.big-avatar {
  width: 2.8rem;
  height: 2.8rem;
  font-size: 1.4rem;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 6px #3182ce22;
}

.user-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.user-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #2d3748;
}

.user-meta {
  margin: 0.1em 0 0 0;
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
}

.user-add-btn {
  margin-left: 1.5em;
  min-width: 110px;
  box-shadow: 0 2px 6px #3182ce11;
}

.avatar-text {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
}

/* Members Table Styles */
.members-content {
  min-height: 100px;
}

.members-list.members-table-responsive {
  overflow-x: auto;
  display: block;
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  margin-top: 0.8rem;
}

.members-table th,
.members-table td {
  border: 1px solid #e2e8f0;
  padding: 0.6rem;
  text-align: left;
  font-size: 0.7rem;
}

.members-table th {
  background: #f1f5f9;
  font-weight: 700;
  color: #2d3748;
  cursor: pointer;
  font-size: 0.75rem;
}

.members-table td {
  vertical-align: middle;
}

.members-table tr:nth-child(even) td {
  background: #f8fafc;
}

.members-table tr:hover td {
  background: #e0e7ef;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px #3182ce22;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e7ef;
}

.avatar-text {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7f53ac 0%, #4299e1 100%);
  border: 2px solid #e0e7ef;
  box-shadow: 0 2px 6px #3182ce22;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  min-width: 1.5rem;
  min-height: 1.5rem;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.85rem;
}

.user-email {
  color: #a0aec0;
  font-size: 0.65rem;
  margin-top: 0.1rem;
}

/* Role Badge Styles */
.role-badge {
  display: inline-flex;
  align-items: center;
  background: #e2e8f0;
  color: #475569;
  border-radius: 999px;
  padding: 0.12rem 0.35rem;
  font-size: 0.6rem;
  font-weight: 500;
  margin-right: 0.2rem;
  margin-bottom: 0.1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.role-badge:hover {
  background: #cbd5e1;
}

.role-badges-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
}

.joined-date {
  color: #6b7280;
  font-size: 0.65rem;
  font-weight: 500;
}

.discord-badge-group {
  position: relative;
}

.discord-more-badge {
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.discord-role-tooltip {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
  z-index: 10;
  margin-top: 0.4rem;
}

/* Empty State */
.empty-members {
  text-align: center;
  padding: 1.5em 0;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5em;
}

/* Roles Table Styles */
.roles-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.6rem;
}

.roles-table th,
.roles-table td {
  border: 1px solid #e2e8f0;
  padding: 0.5rem 0.6rem;
  text-align: left;
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  background: #e2e8f0;
  color: #4a5568;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Modal Styles */
.new-modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.6) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 9000 !important; /* Giảm z-index của modal */
  backdrop-filter: blur(4px) !important;
}

/* Đảm bảo toast luôn hiển thị trên cùng */
:global(.p-toast) {
  z-index: 9999 !important; /* Tăng z-index của toast */
}

.new-modal-content {
  position: relative;
  z-index: 10000; /* Đảm bảo content cũng có z-index cao */
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 340px;
  max-width: 90vw;
  max-height: 380px;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.new-modal-header {
  padding: 0.6rem 0.8rem; /* Giảm padding */
}

.new-modal-header h3 {
  font-size: 0.9rem; /* Giảm font size */
}

.new-modal-close {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.new-modal-close:hover {
  background: #e2e8f0;
  color: #4a5568;
}

.new-modal-body {
  padding: 0.6rem 0.8rem; /* Giảm padding */
}

.new-modal-footer {
  padding: 0.6rem 0.8rem; /* Giảm padding */
}

.new-modal-footer .btn {
  padding: 0.3rem 0.7rem; /* Giảm padding của button */
  font-size: 0.8rem; /* Giảm font size của button */
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 0.7rem;
  font-size: 1rem;
}

.label-icon {
  font-size: 1.2rem;
  color: #3182ce;
}

.form-control {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66,153,225,0.10);
}

.permissions-section {
  margin-top: 1.5rem;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.8rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  flex: 1;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.permission-item:hover {
  background: #f0f6ff;
  border-color: #4299e1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(66,153,225,0.15);
}

.permission-checkbox {
  width: 1.2rem;
  height: 1.2rem;
  accent-color: #4299e1;
  cursor: pointer;
}

.permission-text {
  font-size: 0.95rem;
  color: #2d3748;
  font-weight: 500;
  flex: 1;
}

.btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  border: none !important;
  padding: 0.8rem 1.5rem !important;
  font-size: 1rem !important;
  cursor: pointer !important;
  transition: all 0.18s !important;
  box-shadow: 0 2px 8px #3182ce11 !important;
}

.btn-primary {
  background: linear-gradient(135deg, #38b2ac 0%, #4299e1 100%) !important;
  color: #fff !important;
  box-shadow: 0 1px 4px #4299e133 !important;
  border: 1px solid #4299e1 !important;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #4299e1 0%, #38b2ac 100%) !important;
  color: #fff !important;
  border-color: #3182ce !important;
  box-shadow: 0 2px 8px #4299e133 !important;
  transform: translateY(-1px) !important;
  filter: brightness(1.02) !important;
}

.btn-outline {
  background: #fff !important;
  color: #2563eb !important;
  border: 1px solid #2563eb !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px #2563eb22 !important;
  transition: all 0.18s !important;
}

.btn-outline:hover {
  background: #2563eb !important;
  color: #fff !important;
  border-color: #1e40af !important;
  box-shadow: 0 2px 6px #2563eb33 !important;
}

.btn-sm {
  font-size: 0.7rem !important;
  padding: 0.25rem 0.5rem !important;
  border-radius: 3px !important;
}

.btn-danger {
  background: #e53e3e !important;
  color: #fff !important;
  border: 1px solid #e53e3e !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px #e53e3e22 !important;
}

.btn-danger:hover {
  background: #c53030 !important;
  color: #fff !important;
  border-color: #a02323 !important;
  box-shadow: 0 2px 6px #e53e3e33 !important;
  transform: translateY(-1px) !important;
}

.btn-secondary {
  background: #718096;
  color: #fff;
  border: 2px solid #718096;
}

.btn-secondary:hover {
  background: #4a5568;
  border-color: #4a5568;
}

.loading-spinner-small {
  width: 1.2rem;
  height: 1.2rem;
  border: 2.5px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.permissions-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.permission-badge {
  display: inline-flex;
  align-items: center;
  background: #e2e8f0;
  color: #475569;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  margin-right: 0.2rem;
}

.permission-badge:hover {
  background: #cbd5e1;
}

.more-permissions {
  color: #3182ce;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  background: #60a5fa;
  color: white;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
}

.more-permissions:hover {
  background: #3b82f6;
}

/* Thêm style cho các loại permission khác nhau */
.permission-badge.project-admin {
  background: #dbeafe;
  color: #1e40af;
}

.permission-badge.manage {
  background: #e0e7ff;
  color: #3730a3;
}

.permission-badge.view {
  background: #f3e8ff;
  color: #6b21a8;
}

.no-permissions {
  color: #a0aec0;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #f0f6ff;
  border: 1px solid #bee3f8;
}

.permission-item.readonly {
  background: #f0f6ff;
  border-color: #bee3f8;
  cursor: default;
}

.permission-item.readonly:hover {
  background: #f0f6ff;
  border-color: #bee3f8;
  transform: none;
}

.permission-checkbox.readonly {
  color: #38a169;
  font-weight: bold;
  font-size: 0.9rem;
}

/* Specific button overrides for compact design */
.section-header .btn,
.members-section .btn,
.roles-section .btn {
  font-size: 0.8rem !important;
  padding: 0.4rem 0.9rem !important;
  border-radius: 5px !important;
  gap: 0.3rem !important;
  min-height: auto !important;
  height: auto !important;
}

.section-header .btn .icon,
.members-section .btn .icon,
.roles-section .btn .icon {
  font-size: 0.85rem !important;
}

/* Make delete buttons moderately smaller */
.btn-danger {
  font-size: 0.75rem !important;
  padding: 0.3rem 0.6rem !important;
  border-radius: 4px !important;
}

/* Compact form buttons */
.add-user-form .btn,
.create-role-form .btn {
  font-size: 0.8rem !important;
  padding: 0.4rem 0.8rem !important;
  border-radius: 5px !important;
}

/* Compact modal buttons */
.modal-content .btn {
  font-size: 0.8rem !important;
  padding: 0.4rem 0.9rem !important;
  border-radius: 5px !important;
}

/* Compact table action buttons */
.members-table .btn,
.roles-table .btn {
  font-size: 0.75rem !important;
  padding: 0.3rem 0.6rem !important;
  border-radius: 4px !important;
  min-width: auto !important;
  width: auto !important;
}

/* Confirm Delete Modal Styles */
.delete-dialog-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Đảm bảo toast luôn hiển thị trên cùng */
:global(.p-toast) {
  z-index: 9999 !important;
}

:global(.p-toast-message) {
  background: white !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  margin: 0 1rem 1rem !important;
}

:global(.p-toast-top-right) {
  top: 1.5rem !important;
  right: 1.5rem !important;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.warning-message {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.warning-icon {
  font-size: 3rem;
  color: #dc2626;
  margin-bottom: 1rem;
}

.warning-message h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-size: 1.125rem;
  font-weight: 600;
}

.warning-message p {
  margin: 0;
  color: #7f1d1d;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  background: #f3f4f6 !important;
  color: #374151 !important;
  border: none !important;
  font-weight: 500 !important;
  box-shadow: none !important;
}

.btn-secondary:hover {
  background: #e5e7eb !important;
  color: #1f2937 !important;
}

.btn-danger {
  background: #dc2626 !important;
  color: white !important;
  border: none !important;
  font-weight: 500 !important;
  box-shadow: none !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  min-width: 90px !important;
  justify-content: center !important;
}

.btn-danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-danger:hover {
  background: #b91c1c !important;
  color: white !important;
}

/* Assign Role Modal Styles */
.new-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.new-modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 450px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

.new-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.new-modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
}

.new-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.new-modal-close:hover {
  background: #e2e8f0;
  color: #4a5568;
}

.new-modal-body {
  padding: 1.2rem 1.5rem;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.new-modal-footer {
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
  padding: 1.2rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* Form control for select */
select.form-control {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

select.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66,153,225,0.10);
}

select.form-control:disabled {
  background: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}

.form-control.error {
  border-color: #e53e3e;
  box-shadow: 0 0 0 1px #e53e3e;
}

.form-control.error:focus {
  border-color: #e53e3e;
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
}

.current-roles-section {
  margin-bottom: 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: none;
}

.assign-role-section {
  margin-top: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  background: #f0f9ff;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.current-roles-list {
  background: white;
  border-radius: 6px;
  padding: 0.6rem;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.role-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.no-roles {
  color: #64748b;
  font-style: italic;
  font-size: 0.9rem;
}

.role-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.8rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.role-badge-container {
  display: inline-flex;
  align-items: center;
  background: white;
  border-radius: 20px;
  padding: 2px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.role-badge-container:hover {
  border-color: #cbd5e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.role-badge {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 500;
  border-radius: 16px;
  color: #4a5568;
  background: #edf2f7;
  margin: 0;
}

.role-badge-container .role-badge {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.remove-role-btn {
  background: none;
  border: none;
  color: #718096;
  font-size: 1.2rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border-radius: 0 16px 16px 0;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
}

.remove-role-btn:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.remove-role-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.no-roles {
  color: #718096;
  font-style: italic;
  font-size: 0.95rem;
}

.divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.8rem 0;
}

.form-control {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  color: #2d3748;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}

.form-control:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 4px rgba(66,153,225,0.10);
}

.btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  padding: 0.8rem 1.5rem !important;
  font-size: 1rem !important;
  cursor: pointer !important;
  transition: all 0.2s !important;
}

.btn-primary {
  background: linear-gradient(135deg, #4299e1 0%, #667eea 100%) !important;
  color: white !important;
  border: none !important;
  box-shadow: 0 4px 6px rgba(66, 153, 225, 0.2) !important;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 8px rgba(66, 153, 225, 0.3) !important;
  filter: brightness(1.1) !important;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-text {
  background: none !important;
  border: none !important;
  color: #718096 !important;
  padding: 0.8rem !important;
}

.btn-text:hover {
  color: #4a5568 !important;
  background: #f7fafc !important;
}

.new-modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  color: #2d3748;
  font-size: 1.2rem;
  font-weight: 600;
}

.header-icon {
  font-size: 1.3rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
}

.label-icon {
  font-size: 1.1rem;
  width: 1.8rem;
  height: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.role-badge {
  padding: 0.35rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 16px;
  color: #4a5568;
  background: #edf2f7;
  margin: 0;
}

.remove-role-btn {
  background: none;
  border: none;
  color: #718096;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  border-radius: 0 16px 16px 0;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
}

.btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  padding: 0.6rem 1.2rem !important;
  font-size: 0.9rem !important;
  cursor: pointer !important;
  transition: all 0.2s !important;
}

.btn .icon {
  font-size: 0.9rem;
}

.loading-spinner-small {
  width: 10px;
  height: 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #4299e1;
  animation: spin 1s linear infinite;
  display: inline-block;
}

.role-section {
  background: #f8fafc;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.2rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.current-roles-list {
  background: white;
  border-radius: 8px;
  padding: 0.8rem;
  min-height: 50px;
  display: flex;
  align-items: center;
}

.no-roles {
  color: #718096;
  font-style: italic;
  font-size: 0.9rem;
}

.btn[title] {
  position: relative;
}

.btn[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem;
  background: #1f2937;
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 10;
  margin-bottom: 0.5rem;
}

.btn[title]:disabled:hover::after {
  background: #4b5563;
}

.btn-danger:disabled {
  background: #ef4444 !important;
  opacity: 0.5;
  cursor: not-allowed;
}

.role-in-use-text {
  color: #6b7280;
  font-size: 0.85rem;
  font-style: italic;
}

.more-badge {
  display: inline-flex;
  align-items: center;
  background: #60a5fa;
  color: white;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.more-badge:hover {
  background: #3b82f6;
}

.roles-display-container {
  position: relative;
  display: inline-block;
}

.role-badges-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
}

.roles-tooltip {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.75rem;
  min-width: 200px;
  max-width: 400px;
}

.roles-tooltip-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.roles-tooltip .role-badge {
  margin: 0;
  white-space: nowrap;
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Thêm mũi tên cho tooltip */
.roles-tooltip::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 10px;
  width: 12px;
  height: 12px;
  background: white;
  border-left: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
  transform: rotate(45deg);
}

/* Animation cho tooltip */
@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.roles-tooltip {
  animation: tooltipFadeIn 0.2s ease-out;
}

/* Cập nhật style cho role badges */
.role-badge {
  display: inline-flex;
  align-items: center;
  background: #e2e8f0;
  color: #475569;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
}

.role-badge:hover {
  background: #cbd5e1;
}

.more-badge {
  display: inline-flex;
  align-items: center;
  background: #60a5fa;
  color: white;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.more-badge:hover {
  background: #3b82f6;
}

/* Thêm styles cho roles grid */
.roles-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  min-height: 100px;
}

.roles-grid .role-badge {
  margin: 0;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  background: #e2e8f0;
  color: #475569;
  border-radius: 999px;
  transition: all 0.2s;
}

.roles-grid .role-badge:hover {
  background: #cbd5e1;
  transform: translateY(-1px);
}

/* Thêm styles */
.create-role-modal {
  width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.create-role-modal .new-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.2rem;
}

.create-role-modal .new-modal-footer {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
}

.create-role-modal .btn {
  min-width: 100px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  padding: 0 1rem;
}

.create-role-modal .btn-text {
  color: #64748b;
  background: none;
  border: none;
}

.create-role-modal .btn-text:hover {
  background: #f1f5f9;
  color: #475569;
}

.create-role-modal .btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  font-weight: 500;
}

.create-role-modal .btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}

.create-role-modal .btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.6rem;
  padding: 0.8rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-item:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.new-modal-content .p-toast,
.modal-content .p-toast {
  position: absolute !important;
  top: 1rem !important;
  right: 1rem !important;
  z-index: 9999 !important;
}

.new-modal-content .p-toast-message,
.modal-content .p-toast-message {
  margin: 0 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

/* Custom Toast Styles - PrimeVue like */
.custom-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999999;
  min-width: 350px;
  max-width: 450px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  padding: 0;
  margin: 0 0 1rem 0;
  border-width: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.custom-toast-content {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 1rem 1.5rem;
  gap: 0.75rem;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}

.custom-toast-success {
  border-left: 6px solid #4CAF50;
}

.custom-toast-success .toast-icon {
  color: #4CAF50;
}

.custom-toast-error {
  border-left: 6px solid #F44336;
}

.custom-toast-error .toast-icon {
  color: #F44336;
}

.toast-text {
  flex: 1;
  min-width: 0;
}

.toast-summary {
  font-weight: 700;
  font-size: 1rem;
  color: #2c3e50;
  margin-bottom: 0.25rem;
  line-height: 1.2;
}

.toast-detail {
  color: #4c566a;
  font-size: 0.875rem;
  line-height: 1.4;
}

.toast-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.25rem;
  border: none;
  background: none;
  color: #99A4AE;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close:hover {
  opacity: 1;
}

/* Toast Animation */
.toast-enter-active {
  transition: all 0.15s cubic-bezier(0, 0, 0.2, 1);
}

.toast-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Hover effect */
.custom-toast:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

/* Thêm style cho role checkboxes */
.roles-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
  padding: 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.role-checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s;
}

.role-checkbox-item:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
}

.role-checkbox-item input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 4px;
  border: 2px solid #cbd5e1;
  accent-color: #3b82f6;
  cursor: pointer;
}

.role-name {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.role-permissions {
  color: #64748b;
  font-size: 0.85rem;
}

.role-checkbox-item:has(input:checked) {
  background: #eff6ff;
  border-color: #3b82f6;
}

.role-checkbox-item:has(input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

.assign-role-modal {
  width: 700px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.section-divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  gap: 1rem;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider-text {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.search-box {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

.role-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-card:hover {
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.role-card.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.role-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-icon {
  font-size: 1.2rem;
}

.role-name {
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}

.role-permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-left: 2.5rem;
}

.permission-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: #f1f5f9;
  color: #475569;
  border-radius: 12px;
  white-space: nowrap;
}

.more-permissions-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: #dbeafe;
  color: #2563eb;
  border-radius: 12px;
  cursor: help;
}

.role-checkbox-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
}

.custom-checkbox {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background: white;
  border: 2px solid #cbd5e0;
  border-radius: 6px;
  transition: all 0.2s;
}

.role-card:hover .custom-checkbox {
  border-color: #3b82f6;
}

input[type="checkbox"]:checked ~ .custom-checkbox {
  background: #3b82f6;
  border-color: #3b82f6;
}

.checkmark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

input[type="checkbox"]:checked ~ .custom-checkbox .checkmark {
  opacity: 1;
}

/* Current roles section improvements */
.current-roles-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.2rem;
}

.role-badge-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
}

.role-badge-container:hover {
  border-color: #ef4444;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 16px;
}

.remove-role-btn {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border-radius: 0 16px 16px 0;
  transition: all 0.2s;
}

.remove-role-btn:hover:not(:disabled) {
  color: #ef4444;
  background: #fee2e2;
}

.remove-icon {
  font-size: 1.2rem;
  line-height: 1;
}

/* Role badge variations */
.role-badge-owner {
  background: #fef3c7;
  color: #92400e;
}

.role-badge-admin {
  background: #f3e8ff;
  color: #6b21a8;
}

.role-badge-mod {
  background: #e0f2fe;
  color: #0369a1;
}

.role-badge-default {
  background: #f1f5f9;
  color: #475569;
}

/* Button improvements */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-text {
  color: #64748b;
  background: none;
}

.btn-text:hover {
  background: #f1f5f9;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.assign-role-modal {
  width: 500px;
  max-width: 95vw;
  max-height: 90vh;
  background: white;
  border-radius: 8px;
  color: #333;
}

.modal-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.section-header h4 {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.section-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 1rem 0;
}

.search-box {
  position: relative;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #333;
}

.search-input::placeholder {
  color: #9ca3af;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.role-item:hover {
  background: #f3f4f6;
}

.role-item.selected {
  background: #e5e7eb;
}

.role-content {
  flex: 1;
}

.role-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.role-description {
  font-size: 0.85rem;
  color: #6b7280;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-text {
  background: none;
  border: none;
  color: #6b7280;
}

.btn-text:hover {
  background: #f3f4f6;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Role badge styles */
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.role-badge .role-icon {
  font-size: 0.75rem;
  color: #3b82f6;
}

.remove-role-btn {
  border: none;
  background: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0 9999px 9999px 0;
}

.remove-role-btn:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.role-checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-checkbox-wrapper input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  border: 2px solid #d1d5db;
  cursor: pointer;
}

.role-checkbox-wrapper input[type="checkbox"]:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.modal-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.section-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.section-header h4 {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.role-section {
  background: #fff;
  border-radius: 4px;
}

.current-roles-section {
  padding: 0.5rem;
}

.assign-role-section {
  padding: 0.5rem;
}

.section-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.section-title span:last-child {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
}

.role-section {
  background: #fff;
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.25rem;
}

.current-roles-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.assign-role-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 0.875rem;
  border-radius: 4px;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-assign {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-assign:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-assign:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 95vw;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.header-icon {
  font-size: 1.2rem;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  color: #333;
}

.current-roles-container {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  min-height: 40px;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  padding: 0.25rem 0.5rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  gap: 0.25rem;
}

.role-dot {
  color: #3b82f6;
  font-size: 0.75rem;
}

.remove-role {
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0 0.25rem;
  font-size: 1rem;
  line-height: 1;
}

.remove-role:hover {
  color: #ef4444;
}

.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 1.5rem 0;
}

.search-container {
  margin-bottom: 1rem;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.875rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  background: #f9fafb;
}

.roles-list {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.role-item {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  gap: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #e5e7eb;
}

.role-item:last-child {
  border-bottom: none;
}

.role-checkbox {
  padding-top: 0.25rem;
}

.role-info {
  flex: 1;
}

.role-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.role-permissions {
  font-size: 0.875rem;
  color: #6b7280;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.cancel-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 6px;
}

.cancel-btn:hover {
  background: #f3f4f6;
}

.assign-btn {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.assign-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.assign-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #fff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  font-size: 1.2rem;
}

.header-title {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
}

/* Stats Card Styles */
.stats-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: #4b5563;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
}

.stats-group {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stats-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stats-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: #f3f4f6;
  border-radius: 0.5rem;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stats-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.stats-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
}

/* Invite Modal Styles */
.invite-modal-content {
  background: white;
  border-radius: 8px;
  width: 600px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

.invite-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.invite-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.invite-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.invite-modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.invite-modal-body {
  padding: 1rem 1.5rem;
}

.invite-form-label {
  display: block;
  color: #374151;
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.invite-form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #1f2937;
  transition: all 0.2s;
  resize: vertical;
  font-family: inherit;
}

.invite-form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.invite-form-control::placeholder {
  color: #9ca3af;
}

.invite-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.invite-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.invite-btn-cancel {
  background: none;
  color: #6b7280;
}

.invite-btn-cancel:hover {
  background: #f3f4f6;
  color: #374151;
}

.invite-btn-primary {
  background: #3b82f6;
  color: white;
}

.invite-btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.invite-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Đảm bảo nút bị disable luôn mờ và không bấm được */
button:disabled,
.btn:disabled,
.btn-primary:disabled,
.btn-outline:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  filter: grayscale(0.5);
}

</style>

<!-- Thêm style global -->
<style>
.p-toast {
  z-index: 1100 !important;
}

.p-toast-message {
  margin: 0 1rem !important;
}

.p-toast-message-content {
  border-radius: 8px !important;
  padding: 1rem 1.5rem !important;
}

.p-toast-message-text {
  margin: 0 0 0 1rem !important;
}

.p-toast-message-icon {
  font-size: 1.5rem !important;
}

.p-toast-top-right {
  top: 20px !important;
  right: 20px !important;
}
</style>

<!-- Thêm style global cho toast và modal -->
<style>
/* Đảm bảo toast luôn hiển thị trên cùng */
:global(.p-toast) {
  position: fixed !important;
  z-index: 2147483647 !important; /* Max z-index to be above any overlay */
}

:global(.p-toast-message) {
  background: white !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  margin: 0 1rem 1rem !important;
  pointer-events: auto !important;
}

:global(.p-toast-top-right) {
  top: 1.5rem !important;
  right: 1.5rem !important;
  pointer-events: none !important; /* Cho phép click xuyên qua vùng trống */
}

/* Style cho modal */
.delete-dialog-modal {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  padding: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.warning-message {
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.warning-message h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.warning-message p {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.loading-spinner-small {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Style cho các modal khác */
.new-modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.6) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 9000 !important;
  backdrop-filter: blur(4px) !important;
}

.new-modal-content {
  position: relative !important;
  z-index: 9001 !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
}

/* PrimeIcons styles */
.pi {
  font-family: "PrimeIcons" !important;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.pi-times:before {
  content: "\e909";
}

.pi-exclamation-triangle:before {
  content: "\e936";
}
</style>
