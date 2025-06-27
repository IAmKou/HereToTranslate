import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTagEntity } from '#LocalProject/Entities';
import { validateName, sanitizeName } from '#LocalProject/Utils/validation';

interface DatabaseError extends Error {
  code?: string;
}

interface CreateProjectTagDto {
  name: string;
}

interface UpdateProjectTagDto {
  name: string;
}

@Injectable()
export class ProjectTagManagerService {
  constructor(
    @InjectRepository(ProjectTagEntity)
    private readonly projectTagRepository: Repository<ProjectTagEntity>
  ) {}

  async getProjectTags() {
    return this.projectTagRepository.find();
  }

  async createProjectTag(data: CreateProjectTagDto) {
    if (!data.name) {
      throw new BadRequestException('Tag name is required');
    }

    if (!validateName(data.name)) {
      throw new BadRequestException('Tag name contains invalid characters or is empty after trimming');
    }

    try {
      const newTag = this.projectTagRepository.create({
        name: sanitizeName(data.name)
      });
      return this.projectTagRepository.save(newTag);
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('A tag with this name already exists');
      }
      console.error('Error creating project tag:', error);
      throw new InternalServerErrorException('Failed to create project tag');
    }
  }

  async updateProjectTag(id: string, data: UpdateProjectTagDto) {
    if (!data.name) {
      throw new BadRequestException('Tag name is required');
    }

    if (!validateName(data.name)) {
      throw new BadRequestException('Tag name contains invalid characters or is empty after trimming');
    }

    try {
      const sanitizedName = sanitizeName(data.name);
      await this.projectTagRepository.update(id, { name: sanitizedName });
      return this.projectTagRepository.findOne({ where: { id: BigInt(id) } });
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('A tag with this name already exists');
      }
      console.error('Error updating project tag:', error);
      throw new InternalServerErrorException('Failed to update project tag');
    }
  }

  async deleteProjectTag(id: string) {
    try {
      return this.projectTagRepository.delete(id);
    } catch (error) {
      console.error('Error deleting project tag:', error);
      throw new InternalServerErrorException('Failed to delete project tag');
    }
  }


}
