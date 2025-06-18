import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectEntity, UserEntity, ProjectRoleEntity, ProjectTagEntity } from '#LocalProject/Entities';
import { MaybeException } from '#LocalProject/Exceptions';
import { CreateProjectDto, UpdateProjectDto } from '#LocalProject/Dtos';
import { PermissionFlags, Permission } from '@here-to-translate/common';
import { Maybe } from '@here-to-translate/common/types';

@Injectable()
export class ProjectManagerService {
  private readonly logger = new Logger(ProjectManagerService.name);
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    private dataSource: DataSource
  ) { }

  async createProject(uid: bigint, data: CreateProjectDto) {
    const {
      name,
      description,
      isPublic,
      tags = [],
      categoryId
    } = data;

    this.logger.debug('Received project data:', data);

    const userExists = await this.userRepository.exists({
      where: { id: BigInt(uid) }
    });

    if (!userExists) {
      throw new BadRequestException(`Unknown user`);
    }

    const queryRunner = this.dataSource.createQueryRunner();

    if (!queryRunner) {
      throw new InternalServerErrorException('Database connection error');
    }

    this.logger.debug('Starting transaction for project creation');
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const projectTags: Array<Partial<ProjectTagEntity>> = [];
      for (const tag of tags) {
        const existingTag = await queryRunner.manager.findOne(ProjectTagEntity, { where: { name: tag } });
        if (existingTag) {
          projectTags.push({ id: existingTag.id });
        } else {
          const newTag = queryRunner.manager.create(ProjectTagEntity, { name: tag });
          const savedTag = await queryRunner.manager.save(newTag);
          projectTags.push({ id: savedTag.id });
        }
      }
      const project = this.projectRepository.create({
        name,
        description,
        createdBy: { id: BigInt(uid) },
        isPublic,
        tags: projectTags,
        createdAt: new Date(),
        category: { id: BigInt(categoryId) }
      });

      const savedProject = await queryRunner.manager.save(project);

      const projectRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        user: { id: BigInt(uid) },
        permissionFlags: new Permission(PermissionFlags.All),
        name: 'Project Owner'
      });

      await queryRunner.manager.save(projectRole);
      await queryRunner.commitTransaction();

      this.logger.debug(`Project created successfully with ID: ${savedProject.id}`);
      return {
        message: 'Project created successfully',
        projectId: savedProject.id,
      };
    } catch (error) {
      this.logger.debug('Rolling back transaction');
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create project: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to create project');
    } finally {
      this.logger.debug('Project creation transaction released');
      await queryRunner.release();
    }
  }

  async fetchProject(uid: Maybe<bigint>, projectId: bigint) {
    this.logger.debug(`Fetching project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['isPublic']
    });

    if (!project) {
      this.logger.debug(`Project with ID ${projectId} not found`);
      throw new BadRequestException(`Unknown project`);
    }

    const userCanViewProject =
      (typeof uid !== 'undefined')
      && await this.projectRoleRepository.createQueryBuilder('role')
        .innerJoin('role.user', 'user')
        .where('role.project = :projectId', { projectId })
        .andWhere('user.id = :userId', { userId: uid })
        .select([
          `MAX((role.permissionFlags & ${PermissionFlags.ViewProject}) = ${PermissionFlags.ViewProject}) as canViewProject`,
        ])
        .getRawOne<{ canViewProject: boolean }>()
        .then(result => Number(result?.canViewProject) !== 0);

    if (!userCanViewProject && !project.isPublic) {
      this.logger.debug(`User with ID ${uid} does not have access to project with ID ${projectId}`);
      throw new BadRequestException(`You do not have access to this project`);
    }

    const projectQueryBuilder = this.projectRepository.createQueryBuilder('project')
    const projectMetadataQuery = projectQueryBuilder
      .select([
        'project.id',
        'project.name',
        'project.description',
        'project.isPublic',
        'project.createdAt',
        'createdBy.id',
        'createdBy.username',
        'createdBy.fullName',
        'tags'
      ])
      .where('project.id = :projectId', { projectId })
      .leftJoin('project.createdBy', 'createdBy')
      .leftJoin('project.tags', 'tags')

    if (!userCanViewProject) {
      this.logger.debug(`Project with ID ${projectId} is public, allowing metadata access`);
      return projectMetadataQuery.getOne();
    }

    this.logger.debug(`User with ID ${uid} has access to project with ID ${projectId}, fetching full project data`);
    const fullProject = await projectMetadataQuery
      .leftJoinAndSelect('project.projectRoles', 'projectRoles')
      .getOne();

    return fullProject;
  }

  async updateProject(projectId: bigint, updateData: Partial<UpdateProjectDto>) {
    this.logger.debug(`Updating project with ID: ${projectId}`, updateData);

    const queryRunner = this.dataSource.createQueryRunner();
    if (!queryRunner) {
      this.logger.error('Database connection error');
      throw new InternalServerErrorException('Database connection error');
    }

    this.logger.debug('Starting transaction for project update');
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(
        ProjectEntity,
        {
          where: { id: projectId },
          relations: ['tags']
        }
      );
      if (!project) {
        this.logger.debug(`Project with ID ${projectId} not found`);
        throw new BadRequestException(`Unknown project`);
      }

      const newTags = new Map<bigint, string>(project.tags.map(tag => [tag.id, tag.name]));
      for (const toAdd of updateData.addTags ?? []) {
        const existingTag = await queryRunner.manager.findOne(
          ProjectTagEntity, { where: { name: toAdd }, select: ['id', 'name'] });
        if (existingTag) {
          newTags.set(existingTag.id, existingTag.name);
        } else {
          const newTag = queryRunner.manager.create(ProjectTagEntity, { name: toAdd });
          const savedTag = await queryRunner.manager.save(newTag);
          newTags.set(savedTag.id, savedTag.name);
        }
      }
      for (const toRemove of updateData.removeTags ?? []) {
        const existingTag = await queryRunner.manager.findOne(
          ProjectTagEntity, { where: { name: toRemove }, select: ['id'] });
        if (existingTag) {
          newTags.delete(existingTag.id);
        }
      }

      delete updateData.addTags;
      delete updateData.removeTags;

      Object.assign(
        project,
        updateData,
        {
          tags: Array.from(newTags.entries()).map(([id, name]) => ({ id, name }))
        }
      );

      const updatedProject = await queryRunner.manager.save(project);
      await queryRunner.commitTransaction();
      this.logger.debug(`Project updated successfully with ID: ${updatedProject.id}`);
      return updatedProject;
    }
    catch (error) {
      this.logger.debug('Rolling back transaction');
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update project: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to update project');
    } finally {
      this.logger.debug('Project update transaction released');
      await queryRunner.release();
    }
  }

  async deleteProject(projectId: bigint) {
    this.logger.debug(`Deleting project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      this.logger.debug(`Project with ID ${projectId} not found`);
      throw new BadRequestException(`Project with ID ${projectId} not found`);
    }

    await this.projectRepository.remove(project);
  }

  addRoles;
  fetchRoles;
  updateRoles;
  deleteRoles;

  groupRoles;
  group

  assignRoles

  join

}
