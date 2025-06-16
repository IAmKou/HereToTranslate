import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectEntity, UserEntity, ProjectRoleEntity, ProjectTagEntity } from '#LocalProject/Entities';
import { MaybeException } from '#LocalProject/Exceptions';
import { CreateProjectDto } from '#LocalProject/Dtos';
import { ProjectPermissions, UserPermission } from '@here-to-translate/common';

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
  ) {}

  async create(uid: bigint, data: CreateProjectDto) {
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
      const projectTags: ProjectTagEntity[] = [];
      for (const tag of tags) {
        const existingTag = await queryRunner.manager.findOne(ProjectTagEntity, {
          where: { name: tag }
        });
        if (existingTag) {
          projectTags.push(existingTag);
        }
        else {
          const newTag = queryRunner.manager.create(ProjectTagEntity, { name: tag });
          const savedTag = await queryRunner.manager.save(newTag);
          projectTags.push(savedTag);
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

      const projectRole = this.projectRoleRepository.create({
        project: savedProject,
        user: { id: BigInt(uid) },
        permissions: new UserPermission(ProjectPermissions.All),
        name: 'Project Owner'
      });

      await this.projectRoleRepository.save(projectRole);
      await queryRunner.commitTransaction();

      this.logger.debug(`Project created successfully with ID: ${savedProject.id}`);
      return savedProject;
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

  async fetchProject(projectId: bigint) {
    this.logger.debug(`Fetching project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['createdBy', 'projectRoles', 'projectRoles.user']
    });

    if (!project) {
      this.logger.debug(`Project with ID ${projectId} not found`);
      throw new BadRequestException(`Unknown project`);
    }

    return project;
  }

  async updateProject(projectId: bigint, updateData: Partial<CreateProjectDto>) {
    this.logger.debug(`Updating project with ID: ${projectId}`, updateData);

    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      this.logger.debug(`Project with ID ${projectId} not found`);
      throw new BadRequestException(`Unknown project`);
    }

    Object.assign(project, updateData);
    return this.projectRepository.save(project);
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
}
