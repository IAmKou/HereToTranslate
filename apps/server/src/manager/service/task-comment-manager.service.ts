import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskCommentEntity } from '../../db/mysql/entity/task-comment.entity';
import { TaskEntity } from '../../db/mysql/entity/task.entity';
import { UserEntity } from '../../db/mysql/entity/user.entity';
import { CreateTCommentDto, UpdateTCommentDto } from '../../dto/task-comment.dto';
import { TaskGateway } from '../../util/gateway/task.gateway';

@Injectable()
export class TaskCommentManagerService {
  constructor(
    @InjectRepository(TaskCommentEntity)
    private readonly taskCommentRepository: Repository<TaskCommentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly taskGateway: TaskGateway,
  ) {}

  async getTaskComments(taskId: string) {
    const comments = await this.taskCommentRepository.find({
      where: { task: { id: BigInt(taskId) } },
      relations: ['author', 'task'],
      order: { createdAt: 'DESC' },
    });

    return comments.map(comment => ({
      id: comment.id.toString(),
      content: comment.content,
      taskId: comment.task.id.toString(),
      author: {
        id: comment.author.id.toString(),
        username: comment.author.username,
        fullName: comment.author.fullName,
        avatarUrl: comment.author.avatarUrl,
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isEdited: comment.isEdited,
      attachments: comment.attachments,
      mentions: comment.mentions,
    }));
  }

  async addTaskComment(taskId: string, dto: CreateTCommentDto, userId: string) {
    // Verify task exists
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(taskId) },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: BigInt(userId) },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create comment
    const comment = this.taskCommentRepository.create({
      content: dto.content,
      task: { id: BigInt(taskId) },
      author: { id: BigInt(userId) },
      parentComment: dto.parentCommentId ? { id: BigInt(dto.parentCommentId) } : undefined,
      attachments: dto.attachments,
      mentions: dto.mentions,
    });

    const savedComment = await this.taskCommentRepository.save(comment);

    // Return with relations
    const commentWithRelations = await this.taskCommentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author', 'task'],
    });

    // Emit WebSocket event
    this.taskGateway.emitCommentAdded(commentWithRelations);

    return {
      id: commentWithRelations.id.toString(),
      content: commentWithRelations.content,
      taskId: commentWithRelations.task.id.toString(),
      author: {
        id: commentWithRelations.author.id.toString(),
        username: commentWithRelations.author.username,
        fullName: commentWithRelations.author.fullName,
        avatarUrl: commentWithRelations.author.avatarUrl,
      },
      createdAt: commentWithRelations.createdAt,
      updatedAt: commentWithRelations.updatedAt,
      isEdited: commentWithRelations.isEdited,
      attachments: commentWithRelations.attachments,
      mentions: commentWithRelations.mentions,
    };
  }

  async updateTaskComment(commentId: string, dto: UpdateTCommentDto, userId: string) {
    // Find comment with author relation
    const comment = await this.taskCommentRepository.findOne({
      where: { id: BigInt(commentId) },
      relations: ['author', 'task'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author
    if (comment.author.id.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Update comment
    comment.content = dto.content;
    comment.isEdited = true;
    comment.attachments = dto.attachments;
    comment.mentions = dto.mentions;

    const updatedComment = await this.taskCommentRepository.save(comment);

    // Emit WebSocket event
    this.taskGateway.emitCommentUpdated(updatedComment);

    return {
      id: updatedComment.id.toString(),
      content: updatedComment.content,
      taskId: updatedComment.task.id.toString(),
      author: {
        id: updatedComment.author.id.toString(),
        username: updatedComment.author.username,
        fullName: updatedComment.author.fullName,
        avatarUrl: updatedComment.author.avatarUrl,
      },
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
      isEdited: updatedComment.isEdited,
      attachments: updatedComment.attachments,
      mentions: updatedComment.mentions,
    };
  }

  async deleteTaskComment(commentId: string, userId: string) {
    // Find comment with author and task relations
    const comment = await this.taskCommentRepository.findOne({
      where: { id: BigInt(commentId) },
      relations: ['author', 'task'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author
    if (comment.author.id.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const taskId = comment.task.id.toString();
    const commentIdToDelete = comment.id.toString();

    await this.taskCommentRepository.remove(comment);

    // Emit WebSocket event
    this.taskGateway.emitCommentDeleted(commentIdToDelete, taskId);

    return { message: 'Comment deleted successfully' };
  }
}
