import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../db/mysql/entity/project.entity';
import { CreateProjectDto } from '../db/dto/project.dto';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { ProjectRoleEntity } from '../db/mysql/entity/projectRole.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    console.log('Received project data:', createProjectDto);

    if (!createProjectDto.name) {
      throw new BadRequestException('Project name is required');
    }

    if (!createProjectDto.createdBy) {
      throw new BadRequestException('createdBy is required');
    }

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
        role: 'OWNER'
      });

      await this.projectRoleRepository.save(projectRole);

      return savedProject;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating project:', error);
      throw new BadRequestException('Failed to create project: ' + (error?.message || 'Unknown error'));
    }
  }
}
