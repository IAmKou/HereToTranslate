import { CreateDiscussionDto, PostCommentDto, UpdateDiscussionDto } from "#LocalProject/Dtos";
import { DiscussionAccessPolicyEntity, ProjectDiscussionCommentEntity, ProjectDiscussionThreadEntity, ProjectRoleEntity } from "#LocalProject/Entities";
import { Maybe } from "@here-to-translate/common/types";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, DeepPartial, Repository } from "typeorm";
import { ManagerService } from "./manager-service.base";
import { Permission, PermissionFlags } from "@here-to-translate/common";

@Injectable()
export class DiscussionManagerService extends ManagerService {
  protected override readonly logger = new Logger(DiscussionManagerService.name);

  constructor(
    @InjectRepository(ProjectDiscussionThreadEntity)
    private readonly discussionThreadRepository: Repository<ProjectDiscussionThreadEntity>,
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    @InjectRepository(ProjectDiscussionCommentEntity)
    private readonly discussionCommentRepository: Repository<ProjectDiscussionCommentEntity>,
    @InjectRepository(DiscussionAccessPolicyEntity)
    private readonly discussionAccessPolicyRepository: Repository<DiscussionAccessPolicyEntity>,
    private readonly dataSource: DataSource
  ) {
    super();
  }

  async getUserPermissionForThread(uid: Maybe<bigint>, threadId: bigint) {
    const userRoles = await this.projectRoleRepository.findBy({
      user: { id: uid },
      project: { discussions: { id: threadId } }
    });
    let resultPermission = new Permission(PermissionFlags.None);
    for (const role of userRoles) {
      const overrides = await this.discussionAccessPolicyRepository.findOne({
        where: {
          thread: { id: threadId },
          role: { id: role.id }
        }
      });
      if (overrides) {
        resultPermission = this.applyAccessPolicyOverrides(resultPermission, overrides);
      }
    }
    return resultPermission;
  }

  async fetchDiscussion(uid: Maybe<bigint>, projectId: bigint, threadId: bigint) {
    const threadAccessPolicy = await this.discussionThreadRepository.findOne({
      where: { id: threadId, project: { id: projectId } },
      select: ['accessPolicy'],
      relations: ['accessPolicy']
    });

    if (!threadAccessPolicy) {
      throw new NotFoundException('Unknown discussion thread');
    }

    const resultPermission = await this.getUserPermissionForThread(uid, threadId);
    if (!resultPermission.has(PermissionFlags.ViewThread)) {
      throw new ForbiddenException('You do not have permission to view this discussion');
    }

    const thread = await this.discussionThreadRepository.findOne({
      where: { id: threadId, project: { id: projectId } },
      relations: ['comments', 'comments.author', 'comments.upvotes', 'comments.downvotes'],
      select: ['id', 'title', 'description', 'comments', 'isArchived']
    });

    return thread;
  }
  fetchDiscussions(uid: Maybe<bigint>, projectId: bigint) {
    throw new Error('Method not implemented.');
  }
  async createDiscussion(projectId: bigint, discussionData: CreateDiscussionDto) {
    const { title, description } = discussionData;
    const discussion = this.discussionThreadRepository.create({
      project: { id: projectId },
      title,
      description
    });

    try {
      const savedDiscussion = await this.discussionThreadRepository.save(discussion);
      return savedDiscussion;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to create discussion');
    }

  }
  async updateDiscussionMetadata(threadId: bigint, discussionUpdateData: UpdateDiscussionDto) {
    const { title, description, accessPolicyOverrides: accessPolicy } = discussionUpdateData;

    const updateData: DeepPartial<ProjectDiscussionThreadEntity> = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (accessPolicy) updateData.accessPolicy = accessPolicy.map(policy => {
      const transformedPolicy: DeepPartial<DiscussionAccessPolicyEntity> = {
        role: { id: BigInt(policy.roleId) },
      }
      if (typeof policy.allowOverrides === 'bigint') {
        transformedPolicy.allowOverrides = new Permission(policy.allowOverrides);
      }
      if (typeof policy.denyOverrides === 'bigint') {
        transformedPolicy.denyOverrides = new Permission(policy.denyOverrides);
      }
      return transformedPolicy;
    });

    try {
      const updatedDiscussion = await this.discussionThreadRepository.save({
        id: threadId,
        ...updateData
      });
      return updatedDiscussion;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to update discussion metadata');
    }

  }
  async archiveDiscussion(threadId: bigint) {
    try {
      const updatedDiscussion = await this.discussionThreadRepository.save({
        id: threadId,
        isArchived: true
      });
      return updatedDiscussion;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to archive discussion');
    }
  }
  async postComment(uid: bigint, threadId: bigint, commentData: PostCommentDto) {
    const { content } = commentData;
    const resultPermission = await this.getUserPermissionForThread(uid, threadId);
    if (!resultPermission.has(PermissionFlags.PostComment)) {
      throw new ForbiddenException('You do not have permission to post comments in this discussion');
    }
    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true }
    });
    if (isArchived) {
      throw new ForbiddenException('Cannot post comments in an archived discussion');
    }
    const comment = this.discussionCommentRepository.create({
      thread: { id: threadId },
      content
    });
    try {
      const savedComment = await this.discussionCommentRepository.save(comment);
      return savedComment;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to post comment');
    }
  }
  async updateDiscussionComment(uid: bigint, threadId: bigint, commentId: bigint, commentUpdateData: any) {
    const comment = await this.discussionCommentRepository.findOne({
      where: { id: commentId, thread: { id: threadId } },
      select: ['author']
    });
    if (!comment) {
      throw new NotFoundException('Unknown comment');
    }

    const { content } = commentUpdateData;
    const resultPermission = await this.getUserPermissionForThread(uid, threadId);
    if (!resultPermission.has(PermissionFlags.PostComment)) {
      throw new ForbiddenException('You do not have permission to edit comments in this discussion');
    }

    if (comment.author.id !== uid) {
      throw new ForbiddenException('You are not the author of this comment');
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true }
    });
    if (isArchived) {
      throw new BadRequestException('Cannot edit comments in an archived discussion');
    }

    return await this.discussionCommentRepository.save({
      id: commentId,
      content,
      isEdited: true
    });
  }
  async deleteDiscussionComment(uid: bigint, threadId: bigint, commentId: bigint) {
    const commentExists = await this.discussionCommentRepository.exists({
      where: { id: commentId, thread: { id: threadId } },
    });
    if (!commentExists) {
      throw new NotFoundException('Unknown comment');
    }

    const resultPermission = await this.getUserPermissionForThread(uid, threadId);
    if (!resultPermission.has(PermissionFlags.ManageComments)) {
      throw new ForbiddenException('You do not have permission to delete comments in this discussion');
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true }
    });
    if (isArchived) {
      throw new BadRequestException('Cannot delete comments in an archived discussion');
    }
    try {
      await this.discussionCommentRepository.delete({ id: commentId });
      return { message: 'Comment deleted successfully' };
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to delete comment');
    }
  }
  async upvoteDiscussionComment(uid: bigint, threadId: bigint, commentId: bigint) {
    const commentExists = await this.discussionCommentRepository.exists({
      where: { id: commentId, thread: { id: threadId } },
    });
    if (!commentExists) {
      throw new NotFoundException('Unknown comment');
    }

    const resultPermission = await this.getUserPermissionForThread(uid, threadId);
    if (!resultPermission.has(PermissionFlags.Vote)) {
      throw new ForbiddenException('You do not have permission to upvote comments in this discussion');
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true }
    });
    if (isArchived) {
      throw new BadRequestException('Cannot upvote comments in an archived discussion');
    }

    const upvoted = await this.discussionCommentRepository.exists({
      where: { id: commentId, upvotes: { id: uid } },
      relations: ['upvotes']
    });

    if (upvoted) {
      throw new BadRequestException('You have already upvoted this comment');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const downvoted = await this.discussionCommentRepository.exists({
        where: { id: commentId, downvotes: { id: uid } },
        relations: ['downvotes']
      });
      if (downvoted) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(ProjectDiscussionCommentEntity, 'downvotes')
          .of(commentId)
          .remove(uid);
      }
      await queryRunner.manager
        .createQueryBuilder()
        .relation(ProjectDiscussionCommentEntity, 'upvotes')
        .of(commentId)
        .add(uid);
      await queryRunner.commitTransaction();
      return { message: 'Comment upvoted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.unknownErrorHanlder(error, 'Failed to upvote comment');
    } finally {
      await queryRunner.release();
    }
  }
  async downvoteDiscussionComment(uid: bigint, threadId: bigint, commentId: bigint) {
    const commentExists = await this.discussionCommentRepository.exists({
      where: { id: commentId, thread: { id: threadId } },
    });
    if (!commentExists) {
      throw new NotFoundException('Unknown comment');
    }

    const resultPermission = await this.getUserPermissionForThread(uid, threadId);
    if (!resultPermission.has(PermissionFlags.Vote)) {
      throw new ForbiddenException('You do not have permission to downvote comments in this discussion');
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true }
    });
    if (isArchived) {
      throw new BadRequestException('Cannot downvote comments in an archived discussion');
    }

    const downvoted = await this.discussionCommentRepository.exists({
      where: { id: commentId, downvotes: { id: uid } },
      relations: ['downvotes']
    });

    if (downvoted) {
      throw new BadRequestException('You have already downvoted this comment');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const upvoted = await this.discussionCommentRepository.exists({
        where: { id: commentId, upvotes: { id: uid } },
        relations: ['upvotes']
      });
      if (upvoted) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(ProjectDiscussionCommentEntity, 'upvotes')
          .of(commentId)
          .remove(uid);
      }
      await queryRunner.manager
        .createQueryBuilder()
        .relation(ProjectDiscussionCommentEntity, 'downvotes')
        .of(commentId)
        .add(uid);
      await queryRunner.commitTransaction();
      return { message: 'Comment downvoted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.unknownErrorHanlder(error, 'Failed to downvote comment');
    } finally {
      await queryRunner.release();
    }
  }
}
