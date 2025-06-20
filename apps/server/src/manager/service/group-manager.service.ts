import { CreateProjectGroupDto, UpdateProjectGroupDto } from "#LocalProject/Dtos";
import { ProjectGroupEntity, UserEntity } from "#LocalProject/Entities";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ManagerService } from "./manager-service.base";

@Injectable()
export class GroupManagerService extends ManagerService {
  protected override readonly logger = new Logger(GroupManagerService.name);

  constructor(
    @InjectRepository(ProjectGroupEntity)
    private readonly projectGroupRepository: Repository<ProjectGroupEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {
    super();
  }

  async createProjectGroup(projectId: bigint, data: CreateProjectGroupDto) {
    const group = this.projectGroupRepository.create({
      project: { id: BigInt(projectId) },
      name: data.name
    });

    try {
      const savedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Project group created successfully with ID: ${savedGroup.id}`);
      return savedGroup;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to create project group');
    }
  }

  async fetchProjectGroup(projectId: bigint, groupId?: bigint) {
    const query = this.projectGroupRepository.createQueryBuilder('group')
      .where('group.project = :projectId', { projectId })
      .select([
        'group.id',
        'group.name',
        'group.permissionFlags',
      ]);
    if (typeof groupId === 'bigint') {
      return await query
        .andWhere('group.id = :groupId', { groupId })
        .getOne();
    }
    return await query.getMany();
  }

  async updateProjectGroupMetadata(projectId: bigint, groupId: bigint, updateData: UpdateProjectGroupDto) {
    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } }
    });
    if (!group) {
      this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown group`);
    }

    if (updateData.name) {
      group.name = updateData.name;
    }

    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Project group updated successfully with ID: ${updatedGroup.id}`);
      return updatedGroup;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to update project group metadata');
    }
  }

  async deleteProjectGroup(projectId: bigint, groupId: bigint) {
    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } }
    });
    if (!group) {
      this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown group`);
    }

    try {
      await this.projectGroupRepository.remove(group);
      this.logger.debug(`Project group deleted successfully with ID: ${group.id}`);
      return { message: `Project group deleted successfully` };
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to delete project group');
    }
  }

  async addUsersToGroup(projectId: bigint, groupId: bigint, userIds: bigint[]) {
    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } }
    });
    if (!group) {
      this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown group`);
    }

    const toAddSet = new Set(userIds.map(id => BigInt(id)));
    const searchIds = Array.from(toAddSet);

    const usersToAdd = await this.userRepository.findBy({
      id: In(searchIds),
      projects: { id: BigInt(projectId) }
    });
    if (usersToAdd.length !== toAddSet.size) {
      const missingIds = searchIds.filter(id => !toAddSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the project`,
        data: missingIds
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

  async removeUsersFromGroup(projectId: bigint, groupId: bigint, userIds: bigint[]) {
    const toRemoveSet = new Set(userIds.map(id => BigInt(id)));
    const searchIds = Array.from(toRemoveSet);

    const affectedUsersCount = await this.projectGroupRepository.countBy({
      id: groupId,
      project: { id: projectId },
      members: { id: In(searchIds) }
    })

    if (affectedUsersCount !== toRemoveSet.size) {
      const missingIds = searchIds.filter(id => !toRemoveSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the group`,
        data: missingIds
      });
    }

    try {
      const updatedGroup = await this.projectGroupRepository.delete({
        id: groupId,
        project: { id: projectId },
        members: { id: In(searchIds) }
      });
      this.logger.debug(`Users removed from group successfully`, { updatedGroup });
      return updatedGroup;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to remove users from group');
    }
  }
}
