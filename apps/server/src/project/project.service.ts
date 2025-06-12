import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity, UserEntity, ProjectRole, ProjectRoleEntity } from '#LocalProject/Entities';
import { MaybeException } from '#LocalProject/Exceptions';
import { CreateProjectDto } from '#LocalProject/Dtos';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
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
}
