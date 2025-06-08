import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../db/mysql/entity/project.entity';
import { ProjectResponseDto } from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
  ) {}

  async findAll(): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.find();
    
    return projects.map(project => this.mapProjectEntityToDto(project));
  }

  private mapProjectEntityToDto(entity: ProjectEntity): ProjectResponseDto {
    return {
      id: Number(entity.id), // Convert BigInt to Number
      name: entity.name,
      description: entity.description,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}