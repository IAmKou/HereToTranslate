import { In, Repository } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionFlags } from '@here-to-translate/common';
import {
  CreateProjectGroupDto,
  UpdateProjectGroupDto,
} from '#LocalProject/Dtos';
import { ProjectGroupEntity, UserEntity } from '#LocalProject/Entities';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { CommonHttpServiceImpl } from '#LocalProject/Utils/common-http-service.impl';

@Injectable()
export class GroupManagerService extends CommonHttpServiceImpl {
  protected override readonly logger = new Logger(GroupManagerService.name);

  constructor(
    @InjectRepository(ProjectGroupEntity)
    private readonly projectGroupRepository: Repository<ProjectGroupEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly projectManager: ProjectManagerService
  ) {
    super();
  }

  async createProjectGroup(
    uid: bigint,
    projectId: bigint,
    data: CreateProjectGroupDto
  ) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageGroups
    );
    const group = this.projectGroupRepository.create({
      project: { id: BigInt(projectId) },
      name: data.name,
    });

    try {
      const savedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(
        `Project group created successfully with ID: ${savedGroup.id}`
      );
      return savedGroup;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to create project group');
    }
  }

  async fetchAllProjectGroups(uid: bigint, projectId: bigint) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ViewProject
    );
    this.logger.debug(`Fetching all project groups for project [${projectId}]`);

    const groups = await this.projectGroupRepository.find({
      where: { project: { id: BigInt(projectId) } },
      relations: ['members'],
    });

    this.logger.debug(`[DEBUG] fetchAllProjectGroups: Số group: ${groups.length}`);
    groups.forEach((g) => {
      this.logger.debug(`[DEBUG] Group ${g.id} - ${g.name}: members = [${(g.members || []).map(m => m.id).join(', ')}]`);
    });

    if (!groups.length) {
      this.logger.debug(`No groups found for project [${projectId}]`);
      return [];
    }

    return groups;
  }

  async fetchProjectGroup(uid: bigint, projectId: bigint, groupId?: bigint) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ViewProject
    );
    this.logger.debug(`Fetching project groups for project [${projectId}]`, {
      groupId: groupId ?? 'All',
    });

    const query = this.projectGroupRepository
      .createQueryBuilder('group')
      .where('group.project = :projectId', { projectId })
      .select(['group.id', 'group.name', 'group.permissionFlags']);
    if (typeof groupId === 'bigint') {
      return await query.andWhere('group.id = :groupId', { groupId }).getOne();
    }
    return await query.getMany();
  }

  async updateProjectGroupMetadata(
    uid: bigint,
    projectId: bigint,
    groupId: bigint,
    updateData: UpdateProjectGroupDto
  ) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageGroups
    );
    this.logger.debug(
      `Updating project group [${groupId}] for project [${projectId}]`,
      updateData
    );
    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
    });
    if (!group) {
      this.logger.debug(
        `Group [${groupId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown group`);
    }

    if (updateData.name) {
      group.name = updateData.name;
    }

    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(
        `Project group updated successfully with ID: ${updatedGroup.id}`
      );
      return updatedGroup;
    } catch (error) {
      this.unknownErrorHanlder(
        error,
        'Failed to update project group metadata'
      );
    }
  }

  async deleteProjectGroup(uid: bigint, projectId: bigint, groupId: bigint) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageGroups
    );
    this.logger.debug(
      `Deleting project group [${groupId}] for project [${projectId}]`
    );
    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
    });
    if (!group) {
      this.logger.debug(
        `Group [${groupId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown group`);
    }

    try {
      await this.projectGroupRepository.remove(group);
      this.logger.debug(
        `Project group deleted successfully with ID: ${group.id}`
      );
      return { message: `Project group deleted successfully` };
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to delete project group');
    }
  }

  async addUsersToGroup(
    uid: bigint,
    projectId: bigint,
    groupId: bigint,
    userIds: bigint[]
  ) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );
    this.logger.debug(
      `Adding users to group [${groupId}] in project [${projectId}]`,
      { userIds }
    );
    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
    });
    if (!group) {
      this.logger.debug(
        `Group [${groupId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown group`);
    }

    const toAddSet = new Set(userIds.map((id) => BigInt(id)));
    const searchIds = Array.from(toAddSet);

    const usersToAdd = await this.userRepository.findBy({
      id: In(searchIds),
      projects: { id: BigInt(projectId) },
    });
    if (usersToAdd.length !== toAddSet.size) {
      const missingIds = searchIds.filter((id) => !toAddSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the project`,
        data: missingIds,
      });
    }

    group.members = [...(group.members || []), ...usersToAdd];

    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Users added to group successfully`, { updatedGroup });
      return updatedGroup;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to add users to group');
    }
  }

  async removeUsersFromGroup(
    uid: bigint,
    projectId: bigint,
    groupId: bigint,
    userIds: bigint[]
  ) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageGroups
    );
    this.logger.debug(
      `Removing users from group [${groupId}] in project [${projectId}]`,
      { userIds }
    );
    const toRemoveSet = new Set(userIds.map((id) => BigInt(id)));
    const searchIds = Array.from(toRemoveSet);

    const affectedUsersCount = await this.projectGroupRepository.countBy({
      id: groupId,
      project: { id: projectId },
      members: { id: In(searchIds) },
    });

    if (affectedUsersCount !== toRemoveSet.size) {
      const missingIds = searchIds.filter((id) => !toRemoveSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the group`,
        data: missingIds,
      });
    }

    try {
      const updatedGroup = await this.projectGroupRepository.delete({
        id: groupId,
        project: { id: projectId },
        members: { id: In(searchIds) },
      });
      this.logger.debug(`Users removed from group successfully`, {
        updatedGroup,
      });
      return updatedGroup;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to remove users from group');
    }
  }

  async setUsersForGroup(
    uid: bigint,
    projectId: bigint,
    groupId: bigint,
    userIds: bigint[]
  ) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );
    this.logger.debug(
      `[DEBUG] setUsersForGroup: Đặt lại toàn bộ thành viên cho group [${groupId}] trong project [${projectId}]`,
      { userIds }
    );
    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
      relations: ['members'],
    });
    if (!group) {
      this.logger.debug(
        `Group [${groupId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown group`);
    }
    // Lấy danh sách user hợp lệ
    const users = await this.userRepository.findBy({
      id: In(userIds),
      projects: { id: BigInt(projectId) },
    });
    if (users.length !== userIds.length) {
      throw new BadRequestException('Some users do not exist in the project');
    }
    group.members = users;
    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`[DEBUG] setUsersForGroup: Đã cập nhật group.members = [${users.map(u => u.id).join(', ')}]`);
      return updatedGroup;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to set users for group');
    }
  }
}
