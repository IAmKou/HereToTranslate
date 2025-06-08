import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectGroupEntity } from '../db/mysql/entity/projectGroup.entity';
import { GroupMemberEntity } from '../db/mysql/entity/groupMember.entity';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { ProjectEntity } from '../db/mysql/entity/project.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { 
  ProjectGroupResponseDto, 
  GroupMemberResponseDto,
  UserResponseDto,
  ProjectResponseDto 
} from './dto/group-response.dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(ProjectGroupEntity)
    private projectGroupRepository: Repository<ProjectGroupEntity>,
    @InjectRepository(GroupMemberEntity)
    private groupMemberRepository: Repository<GroupMemberEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
  ) {}

  private mapGroupEntityToDto(entity: ProjectGroupEntity): ProjectGroupResponseDto {
    const dto = new ProjectGroupResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.projectId = entity.projectId;
    
    if (entity.project) {
      dto.project = {
        id: entity.project.id.toString(),
        name: entity.project.name,
        description: entity.project.description
      };
    }
    
    if (entity.members) {
      dto.members = entity.members.map(member => this.mapMemberEntityToDto(member));
    }
    
    return dto;
  }
  
  private mapMemberEntityToDto(entity: GroupMemberEntity): GroupMemberResponseDto {
    const dto = new GroupMemberResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId.toString();
    dto.groupId = entity.groupId;
    
    if (entity.user) {
      dto.user = {
        id: entity.user.id.toString(),
        username: entity.user.username,
        email: entity.user.email
      };
    }
    
    return dto;
  }

  async create(createGroupDto: CreateGroupDto): Promise<ProjectGroupResponseDto> {
    const project = await this.projectRepository.findOne({ 
      where: { id: BigInt(createGroupDto.project_id) } 
    });
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${createGroupDto.project_id} not found`);
    }

    const newGroup = this.projectGroupRepository.create({
      name: createGroupDto.name,
      projectId: createGroupDto.project_id
    });

    const savedEntity = await this.projectGroupRepository.save(newGroup);
    return this.mapGroupEntityToDto(savedEntity);
  }

  async findAll(projectId?: number): Promise<ProjectGroupResponseDto[]> {
    const queryOptions = projectId ? { where: { projectId } } : {};
    const entities = await this.projectGroupRepository.find({
      ...queryOptions,
      relations: ['project', 'members', 'members.user']
    });
    
    return entities.map(entity => this.mapGroupEntityToDto(entity));
  }

  async findOne(id: number): Promise<ProjectGroupResponseDto> {
    const group = await this.projectGroupRepository.findOne({
      where: { id },
      relations: ['project', 'members', 'members.user']
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return this.mapGroupEntityToDto(group);
  }

  async update(id: number, updateGroupDto: UpdateGroupDto): Promise<ProjectGroupResponseDto> {
    const group = await this.projectGroupRepository.findOne({
      where: { id },
      relations: ['project', 'members', 'members.user']
    });
    
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    
    group.name = updateGroupDto.name;
    const updatedEntity = await this.projectGroupRepository.save(group);
    return this.mapGroupEntityToDto(updatedEntity);
  }

  async remove(id: number): Promise<void> {
    const group = await this.projectGroupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    await this.projectGroupRepository.remove(group);
  }

  async addMember(groupId: number, addMemberDto: AddMemberDto): Promise<GroupMemberResponseDto> {
    const group = await this.projectGroupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }
    
    const user = await this.userRepository.findOne({
      where: { id: BigInt(addMemberDto.userId) }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${addMemberDto.userId} not found`);
    }

    // Check if user is already a member
    const existingMembership = await this.groupMemberRepository.findOne({
      where: {
        groupId,
        userId: addMemberDto.userId
      }
    });

    if (existingMembership) {
      throw new ConflictException(`User with ID ${addMemberDto.userId} is already a member of this group`);
    }

    const newMember = this.groupMemberRepository.create({
      groupId,
      userId: addMemberDto.userId
    });

    const savedEntity = await this.groupMemberRepository.save(newMember);
    return this.mapMemberEntityToDto(savedEntity);
  }

  async removeMember(groupId: number, userId: number): Promise<void> {
    const membership = await this.groupMemberRepository.findOne({
      where: {
        groupId,
        userId
      }
    });

    if (!membership) {
      throw new NotFoundException(`Member not found in group`);
    }

    await this.groupMemberRepository.remove(membership);
  }

  async getGroupMembers(groupId: number): Promise<GroupMemberResponseDto[]> {
    const members = await this.groupMemberRepository.find({
      where: { groupId },
      relations: ['user']
    });
    
    return members.map(member => this.mapMemberEntityToDto(member));
  }
}