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
import { ProjectGroupEntity, UserEntity, ProjectEntity } from '#LocalProject/Entities';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { CommonHttpServiceImpl } from '#LocalProject/Utils/common-http-service.impl';
import { NotificationManagerService } from '#LocalProject/Managers/service/notification-manager.service';

@Injectable()
export class GroupManagerService extends CommonHttpServiceImpl {
  protected override readonly logger = new Logger(GroupManagerService.name);

  constructor(
    @InjectRepository(ProjectGroupEntity)
    private readonly projectGroupRepository: Repository<ProjectGroupEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly projectManager: ProjectManagerService,
    private readonly notificationService: NotificationManagerService
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

      // Send notification to all group members
      try {
        const groupWithMembers = await this.projectGroupRepository.findOne({
          where: { id: BigInt(groupId) },
          relations: ['members', 'project'],
        });

        if (groupWithMembers && groupWithMembers.members) {
          for (const member of groupWithMembers.members) {
            await this.notificationService.createNotification({
              type: 'GROUP_UPDATED',
              message: `Group ${groupWithMembers.name} has been updated in project ${groupWithMembers.project.name}`,
              userId: member.id,
            });
          }
        }
      } catch (error) {
        this.logger.error('Failed to send group update notification:', error);
      }

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
      // Get group members before deleting
      const groupWithMembers = await this.projectGroupRepository.findOne({
        where: { id: BigInt(groupId) },
        relations: ['members', 'project'],
      });

      await this.projectGroupRepository.remove(group);
      this.logger.debug(
        `Project group deleted successfully with ID: ${group.id}`
      );

      // Send notification to all former group members
      try {
        if (groupWithMembers && groupWithMembers.members) {
          for (const member of groupWithMembers.members) {
            await this.notificationService.createNotification({
              type: 'GROUP_DELETED',
              message: `Group ${groupWithMembers.name} has been deleted from project ${groupWithMembers.project.name}`,
              userId: member.id,
            });
          }
        }
      } catch (error) {
        this.logger.error('Failed to send group deletion notification:', error);
      }

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

    this.logger.debug(`[DEBUG] addUsersToGroup: Searching for users with IDs:`, searchIds);
    this.logger.debug(`[DEBUG] addUsersToGroup: Project ID:`, projectId);

    const usersToAdd = await this.userRepository.findBy({
      id: In(searchIds),
      projects: { id: BigInt(projectId) },
    });

    this.logger.debug(`[DEBUG] addUsersToGroup: Found users:`, usersToAdd.map(u => ({ id: u.id, email: u.email })));
    this.logger.debug(`[DEBUG] addUsersToGroup: Expected count: ${toAddSet.size}, Found count: ${usersToAdd.length}`);

    if (usersToAdd.length !== toAddSet.size) {
      const missingIds = searchIds.filter((id) => !usersToAdd.some(u => u.id === id));
      this.logger.debug(`[DEBUG] addUsersToGroup: Missing user IDs:`, missingIds);

      // Kiểm tra xem có phải project owner không
      const project = await this.projectRepository.findOne({
        where: { id: BigInt(projectId) },
        relations: ['createdBy', 'members'],
      });

      if (project && project.createdBy) {
        const ownerId = project.createdBy.id;
        const missingOwner = missingIds.some(id => id === ownerId);

        if (missingOwner) {
          // Thêm project owner vào members nếu chưa có
          const owner = await this.userRepository.findOne({
            where: { id: ownerId },
          });

          if (owner) {
            project.members = project.members || [];
            if (!project.members.some((m: any) => m.id === ownerId)) {
              project.members.push(owner);
              await this.projectRepository.save(project);

              // Thử lại query
              const updatedUsersToAdd = await this.userRepository.findBy({
                id: In(searchIds),
                projects: { id: BigInt(projectId) },
              });

              if (updatedUsersToAdd.length === toAddSet.size) {
                // Nếu bây giờ tìm thấy tất cả, sử dụng kết quả mới
                usersToAdd.length = 0;
                usersToAdd.push(...updatedUsersToAdd);
              } else {
                // Nếu vẫn còn thiếu, throw error
                const stillMissingIds = searchIds.filter(id => !updatedUsersToAdd.some((u: any) => u.id === id));
                throw new BadRequestException({
                  message: `Some users do not exist in the project`,
                  data: stillMissingIds.map(id => id.toString()),
                });
              }
            }
          }
        }
      }

      // Nếu vẫn còn thiếu user khác
      if (usersToAdd.length !== toAddSet.size) {
        const stillMissingIds = searchIds.filter(id => !usersToAdd.some((u: any) => u.id === id));
        throw new BadRequestException({
          message: `Some users do not exist in the project`,
          data: stillMissingIds.map(id => id.toString()),
        });
      }
    }

    group.members = [...(group.members || []), ...usersToAdd];

    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Users added to group successfully`, { updatedGroup });

      // Send notification to added users
      try {
        const groupWithProject = await this.projectGroupRepository.findOne({
          where: { id: BigInt(groupId) },
          relations: ['project'],
        });

        if (groupWithProject) {
          for (const user of usersToAdd) {
            await this.notificationService.createNotification({
              type: 'USER_ADDED_TO_GROUP',
              message: `You have been added to group ${groupWithProject.name} in project ${groupWithProject.project.name}`,
              userId: user.id,
            });
          }
        }
      } catch (error) {
        this.logger.error('Failed to send user added to group notification:', error);
      }

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

    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException(`Unknown group`);
    }

    const toRemoveSet = new Set(userIds.map((id) => BigInt(id)));

    // Lọc ra những user không cần xóa
    group.members = (group.members || []).filter((member: any) => !toRemoveSet.has(member.id));

    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Users removed from group successfully`, {
        updatedGroup,
      });

      // Send notification to removed users
      try {
        const groupWithProject = await this.projectGroupRepository.findOne({
          where: { id: BigInt(groupId) },
          relations: ['project'],
        });

        if (groupWithProject) {
          const removedUsers = await this.userRepository.findBy({
            id: In(userIds.map(id => BigInt(id))),
          });

          for (const user of removedUsers) {
            await this.notificationService.createNotification({
              type: 'USER_REMOVED_FROM_GROUP',
              message: `You have been removed from group ${groupWithProject.name} in project ${groupWithProject.project.name}`,
              userId: user.id,
            });
          }
        }
      } catch (error) {
        this.logger.error('Failed to send user removed from group notification:', error);
      }

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
    const numericUserIds = userIds.map(id => BigInt(id));
    const users = await this.userRepository.findBy({
      id: In(numericUserIds),
      projects: { id: BigInt(projectId) },
    });

    // Nếu có user không tìm thấy, có thể là project owner chưa được thêm vào members
    if (users.length !== userIds.length) {
      const missingIds = userIds.filter(id => !users.some(u => u.id === BigInt(id)));

      // Kiểm tra xem có phải project owner không
      const project = await this.projectRepository.findOne({
        where: { id: BigInt(projectId) },
        relations: ['createdBy', 'members'],
      });

      if (project && project.createdBy) {
        const ownerId = project.createdBy.id;
        const missingOwner = missingIds.some(id => BigInt(id) === ownerId);

        if (missingOwner) {
          // Thêm project owner vào members nếu chưa có
          const owner = await this.userRepository.findOne({
            where: { id: ownerId },
          });

          if (owner) {
            project.members = project.members || [];
            if (!project.members.some((m: any) => m.id === ownerId)) {
              project.members.push(owner);
              await this.projectRepository.save(project);

              // Thử lại query
              const updatedUsers = await this.userRepository.findBy({
                id: In(numericUserIds),
                projects: { id: BigInt(projectId) },
              });

              if (updatedUsers.length === userIds.length) {
                // Nếu bây giờ tìm thấy tất cả, sử dụng kết quả mới
                users.length = 0;
                users.push(...updatedUsers);
              } else {
                // Nếu vẫn còn thiếu, throw error
                const stillMissingIds = userIds.filter(id => !updatedUsers.some((u: any) => u.id === BigInt(id)));
                throw new BadRequestException({
                  message: 'Some users do not exist in the project',
                  data: stillMissingIds.map(id => id.toString())
                });
              }
            }
          }
        }
      }

      // Nếu vẫn còn thiếu user khác
      if (users.length !== userIds.length) {
        const stillMissingIds = userIds.filter(id => !users.some((u: any) => u.id === BigInt(id)));
        throw new BadRequestException({
          message: 'Some users do not exist in the project',
          data: stillMissingIds.map(id => id.toString())
        });
      }
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
