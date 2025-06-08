export class UserResponseDto {
  id: string;
  username: string;
  email: string;
}

export class ProjectResponseDto {
  id: string;
  name: string;
  description: string;
}

export class GroupMemberResponseDto {
  id: number;
  userId: string;
  groupId: number;
  user?: UserResponseDto;
}

export class ProjectGroupResponseDto {
  id: number;
  name: string;
  projectId: number;
  project?: ProjectResponseDto;
  members?: GroupMemberResponseDto[];
}