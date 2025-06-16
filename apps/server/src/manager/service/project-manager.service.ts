import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity, UserEntity, ProjectRole, ProjectRoleEntity } from '#LocalProject/Entities';
import { MaybeException } from '#LocalProject/Exceptions';
import { CreateProjectDto } from '#LocalProject/Dtos';

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
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    this.logger.debug('Received project data:', createProjectDto);

    try {
      const creator = await this.userRepository.findOne({
        where: { id: BigInt(createProjectDto.createdBy) }
      });

      if (!creator) {
        throw new BadRequestException(`User with ID ${createProjectDto.createdBy} not found`);
      }

      const project = this.projectRepository.create({
        name: createProjectDto.name,
        description: createProjectDto.description,
        createdBy: creator
      });

      const savedProject = await this.projectRepository.save(project);

      const projectRole = this.projectRoleRepository.create({
        project: savedProject,
        user: creator,
        role: ProjectRole.Owner
      });

      await this.projectRoleRepository.save(projectRole);

      return savedProject;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating project:', error);
      throw new BadRequestException('Failed to create project: ' + ((error as MaybeException)?.message || 'Unknown error'));
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
      throw new BadRequestException(`Project with ID ${projectId} not found`);
    }

    return project;
  }

  async updateProject(projectId: bigint, updateData: Partial<CreateProjectDto>) {
    this.logger.debug(`Updating project with ID: ${projectId}`, updateData);

    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      this.logger.debug(`Project with ID ${projectId} not found`);
      throw new BadRequestException(`Project with ID ${projectId} not found`);
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
    return { message: `Project with ID ${projectId} deleted successfully` };
  }
}
