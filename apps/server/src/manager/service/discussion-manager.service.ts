import {
  CreateDiscussionDto,
  PostCommentDto,
  UpdateCommentDto,
  UpdateDiscussionDto,
} from '#LocalProject/Dtos';
import {
  DiscussionAccessPolicyEntity,
  ProjectDiscussionCommentEntity,
  ProjectDiscussionThreadEntity,
  ProjectRoleEntity,
} from '#LocalProject/Entities';
import { Maybe } from '@here-to-translate/common/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { CommonHttpServiceImpl } from '#LocalProject/Utils/common-http-service.impl';
import { Permission, PermissionFlags } from '@here-to-translate/common';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';

@Injectable()
export class DiscussionManagerService extends CommonHttpServiceImpl {
  protected override readonly logger = new Logger(
    DiscussionManagerService.name
  );

  constructor(
    @InjectRepository(ProjectDiscussionThreadEntity)
    private readonly discussionThreadRepository: Repository<ProjectDiscussionThreadEntity>,
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    @InjectRepository(ProjectDiscussionCommentEntity)
    private readonly discussionCommentRepository: Repository<ProjectDiscussionCommentEntity>,
    @InjectRepository(DiscussionAccessPolicyEntity)
    private readonly discussionAccessPolicyRepository: Repository<DiscussionAccessPolicyEntity>,
    private readonly dataSource: DataSource,
    private readonly projectManager: ProjectManagerService
  ) {
    super();
  }

  /**
   * Get the user's permissions for a specific discussion thread.
   * This method aggregates permissions from all roles the user has in the project,
   * including the 'Everyone' role, and applies any access policy overrides defined for the thread.
   * @param uid The user's ID. If empty it's equivalent to an anonymous user.
   * @param threadId The ID of the discussion thread to check permissions for.
   * @returns A `Permission` object representing the user's permissions for the thread.
   */
  async getUserPermissionForThread(uid: Maybe<bigint>, threadId: bigint) {
    // First, get the project ID for this thread
    const thread = await this.discussionThreadRepository.findOne({
      where: { id: threadId },
      select: ['project'],
      relations: ['project'],
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const projectId = thread.project.id;

    // Get all user roles for this project
    const userRoles = await this.projectRoleRepository.find({
      where: {
        users: { id: uid },
        project: { id: projectId },
      },
      relations: ['users'],
    });

    // Get the Everyone role for this project
    const everyoneRole = await this.projectRoleRepository.findOne({
      where: {
        name: 'Everyone',
        project: { id: projectId }
      },
      select: ['id', 'permissionFlags'],
    });

    if (!everyoneRole) {
      throw new NotFoundException(
        'Everyone role not found for this project'
      );
    }

    // Add Everyone role to the list if user is not already in it
    const userHasEveryoneRole = userRoles.some(role => role.id === everyoneRole.id);
    if (!userHasEveryoneRole) {
      userRoles.unshift(everyoneRole);
    }

    let resultPermission = new Permission(PermissionFlags.None);

    for (const role of userRoles) {
      // Start with the role's base permissions
      let rolePermission = role.permissionFlags || new Permission(PermissionFlags.None);

      // Check for access policy overrides
      const overrides = await this.discussionAccessPolicyRepository.findOne({
        where: {
          thread: { id: threadId },
          role: { id: role.id },
        },
      });

      if (overrides) {
        // Apply overrides: add allowOverrides, remove denyOverrides
        rolePermission = rolePermission
          .add(overrides.allowOverrides ?? PermissionFlags.None)
          .remove(overrides.denyOverrides ?? PermissionFlags.None);
      }

      // Combine with overall result
      resultPermission = resultPermission.add(rolePermission);
    }

    // If user has ViewProject permission, they should also have ViewThread permission
    if (resultPermission.has(PermissionFlags.ViewProject)) {
      resultPermission = resultPermission.add(PermissionFlags.ViewThread);
    }

    return resultPermission;
  }

  async fetchDiscussion(
    uid: Maybe<bigint>,
    projectId: bigint,
    threadId: bigint
  ) {
    const threadAccessPolicy = await this.discussionThreadRepository.findOne({
      where: { id: threadId, project: { id: projectId } },
      select: ['accessPolicies'],
      relations: ['accessPolicies'],
    });

    if (!threadAccessPolicy) {
      throw new NotFoundException('Unknown discussion thread');
    }

    const resultPermission = await this.getUserPermissionForThread(
      uid,
      threadId
    );
    if (!resultPermission.has(PermissionFlags.ViewThread)) {
      throw new ForbiddenException(
        'You do not have permission to view this discussion'
      );
    }

    // Sửa: Không dùng select để tránh loại bỏ các trường author trong comments
    return await this.discussionThreadRepository.findOne({
      where: { id: threadId, project: { id: projectId } },
      relations: [
        'comments',
        'comments.author',
        'comments.upvotes',
        'comments.downvotes',
      ],
      // Bỏ select để trả về đầy đủ thông tin author
    });
  }
  async fetchDiscussions(uid: Maybe<bigint>, projectId: bigint) {
    const threads = await this.discussionThreadRepository.find({
      where: { project: { id: projectId } },
      select: ['id', 'title', 'description', 'isArchived'],
    });
    if (!threads || threads.length === 0) {
      return [];
    }
    try {
      return (
        await Promise.all(
          threads.map(async (thread) => {
            const commentsCount = await this.discussionCommentRepository.count({
              where: { thread: { id: thread.id } },
            });
            return Object.assign(thread, {
              userPermission: await this.getUserPermissionForThread(uid, thread.id),
              commentsCount,
            });
          })
        )
      ).filter((thread) =>
        thread.userPermission.has(PermissionFlags.ViewThread)
      );
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to fetch discussions');
    }
  }
  async createDiscussion(
    uid: bigint,
    projectId: bigint,
    discussionData: CreateDiscussionDto
  ) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageDiscussions
    );
    const { title, description } = discussionData;

    const discussion = this.discussionThreadRepository.create({
      project: { id: projectId },
      title,
      description,
    });
    await this.discussionThreadRepository.save(discussion);

    const everyoneRole = await this.projectRoleRepository.findOne({
      where: { name: 'Everyone', project: { id: projectId } },
    });
    if (!everyoneRole) {
      throw new NotFoundException('Everyone role not found for this project');
    }

    const existingPolicy = await this.discussionAccessPolicyRepository.findOne({
      where: {
        thread: { id: discussion.id },
        role: { id: everyoneRole.id },
      },
    });
    let accessPolicy;
    if (!existingPolicy) {
      accessPolicy = this.discussionAccessPolicyRepository.create({
        role: everyoneRole,
        thread: discussion,
        allowOverrides: new Permission(PermissionFlags.None),
        denyOverrides: new Permission(PermissionFlags.None),
      });
      await this.discussionAccessPolicyRepository.save(accessPolicy);
    } else {
      accessPolicy = existingPolicy;
    }
    discussion.accessPolicies = [accessPolicy];
    return discussion;
  }

  async updateDiscussionMetadata(
    uid: bigint,
    projectId: bigint,
    threadId: bigint,
    discussionUpdateData: UpdateDiscussionDto
  ) {
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageDiscussions
    );
    const {
      title,
      description,
      accessPolicyOverrides: accessPolicy,
    } = discussionUpdateData;

    const updateData: DeepPartial<ProjectDiscussionThreadEntity> = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;

    if (accessPolicy) {
      for (const policy of accessPolicy) {
        const existingPolicy = await this.discussionAccessPolicyRepository.findOne({
          where: {
            thread: { id: threadId },
            role: { id: policy.roleId },
          },
        });

        if (existingPolicy) {
          await this.discussionAccessPolicyRepository.save({
            id: existingPolicy.id,
            allowOverrides: policy.allowOverrides,
            denyOverrides: policy.denyOverrides,
          });
        } else {
          await this.discussionAccessPolicyRepository.save({
            thread: { id: threadId },
            role: { id: policy.roleId },
            allowOverrides: policy.allowOverrides,
            denyOverrides: policy.denyOverrides,
          });
        }
      }
    }

    try {
      await this.discussionThreadRepository.update(String(threadId), updateData);
      return await this.discussionThreadRepository.findOne({ where: { id: threadId } });
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to update discussion metadata');
    }
  }

  async archiveDiscussion(uid: bigint, projectId: bigint, threadId: bigint) {
    const discussionExists = await this.discussionThreadRepository.exists({
      where: { id: threadId },
    });
    if (!discussionExists) {
      throw new NotFoundException('Unknown discussion thread');
    }
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageDiscussions
    );

    const discussion = await this.discussionThreadRepository.findOne({
      where: { id: threadId },
      select: ['isArchived'],
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Toggle archive status
    const newArchiveStatus = !discussion.isArchived;

    try {
      await this.discussionThreadRepository.update(String(threadId), { isArchived: newArchiveStatus });
      return await this.discussionThreadRepository.findOne({ where: { id: threadId } });
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to archive discussion');
    }
  }

  async deleteDiscussion(uid: bigint, projectId: bigint, threadId: bigint) {
    const discussionExists = await this.discussionThreadRepository.exists({
      where: { id: threadId },
    });
    if (!discussionExists) {
      throw new NotFoundException('Unknown discussion thread');
    }
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageDiscussions
    );

    try {
      await this.discussionThreadRepository.delete({ id: threadId });
      return { message: 'Discussion deleted successfully' };
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to delete discussion');
    }
  }
  async postComment(
    uid: bigint,
    threadId: bigint,
    commentData: PostCommentDto
  ) {
    const { content } = commentData;
    const resultPermission = await this.getUserPermissionForThread(
      uid,
      threadId
    );
    if (!resultPermission.has(PermissionFlags.PostComment)) {
      throw new ForbiddenException(
        'You do not have permission to post comments in this discussion'
      );
    }
    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true },
    });
    if (isArchived) {
      throw new ForbiddenException(
        'Cannot post comments in an archived discussion'
      );
    }
    const comment = this.discussionCommentRepository.create({
      thread: { id: threadId },
      content,
      author: { id: uid }, // Gán author là user hiện tại
    });
    try {
      return await this.discussionCommentRepository.save(comment);
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to post comment');
    }
  }
  async updateDiscussionComment(
    uid: bigint,
    threadId: bigint,
    commentId: bigint,
    commentUpdateData: UpdateCommentDto
  ) {
    const comment = await this.discussionCommentRepository.findOne({
      where: { id: commentId, thread: { id: threadId } },
      select: ['author'],
    });
    if (!comment) {
      throw new NotFoundException('Unknown comment');
    }

    const { content } = commentUpdateData;
    const resultPermission = await this.getUserPermissionForThread(
      uid,
      threadId
    );
    if (!resultPermission.has(PermissionFlags.PostComment)) {
      throw new ForbiddenException(
        'You do not have permission to edit comments in this discussion'
      );
    }

    if (comment.author.id !== uid) {
      throw new ForbiddenException('You are not the author of this comment');
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true },
    });
    if (isArchived) {
      throw new BadRequestException(
        'Cannot edit comments in an archived discussion'
      );
    }

    return await this.discussionCommentRepository.save({
      id: commentId,
      content,
      isEdited: true,
    });
  }
  async deleteDiscussionComment(
    uid: bigint,
    threadId: bigint,
    commentId: bigint
  ) {
    const commentExists = await this.discussionCommentRepository.exists({
      where: { id: commentId, thread: { id: threadId } },
    });
    if (!commentExists) {
      throw new NotFoundException('Unknown comment');
    }

    const resultPermission = await this.getUserPermissionForThread(
      uid,
      threadId
    );
    if (!resultPermission.has(PermissionFlags.ManageComments)) {
      throw new ForbiddenException(
        'You do not have permission to delete comments in this discussion'
      );
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true },
    });
    if (isArchived) {
      throw new BadRequestException(
        'Cannot delete comments in an archived discussion'
      );
    }
    try {
      await this.discussionCommentRepository.delete({ id: commentId });
      return { message: 'Comment deleted successfully' };
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to delete comment');
    }
  }
  async upvoteDiscussionComment(
    uid: bigint,
    threadId: bigint,
    commentId: bigint
  ) {
    const commentExists = await this.discussionCommentRepository.exists({
      where: { id: commentId, thread: { id: threadId } },
    });
    if (!commentExists) {
      throw new NotFoundException('Unknown comment');
    }

    const resultPermission = await this.getUserPermissionForThread(
      uid,
      threadId
    );
    if (!resultPermission.has(PermissionFlags.Vote)) {
      throw new ForbiddenException(
        'You do not have permission to upvote comments in this discussion'
      );
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true },
    });
    if (isArchived) {
      throw new BadRequestException(
        'Cannot upvote comments in an archived discussion'
      );
    }

    const upvoted = await this.discussionCommentRepository.exists({
      where: { id: commentId, upvotes: { id: uid } },
      relations: ['upvotes'],
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
        relations: ['downvotes'],
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
  async downvoteDiscussionComment(
    uid: bigint,
    threadId: bigint,
    commentId: bigint
  ) {
    const commentExists = await this.discussionCommentRepository.exists({
      where: { id: commentId, thread: { id: threadId } },
    });
    if (!commentExists) {
      throw new NotFoundException('Unknown comment');
    }

    const resultPermission = await this.getUserPermissionForThread(
      uid,
      threadId
    );
    if (!resultPermission.has(PermissionFlags.Vote)) {
      throw new ForbiddenException(
        'You do not have permission to downvote comments in this discussion'
      );
    }

    const isArchived = await this.discussionThreadRepository.exists({
      where: { id: threadId, isArchived: true },
    });
    if (isArchived) {
      throw new BadRequestException(
        'Cannot downvote comments in an archived discussion'
      );
    }

    const downvoted = await this.discussionCommentRepository.exists({
      where: { id: commentId, downvotes: { id: uid } },
      relations: ['downvotes'],
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
        relations: ['upvotes'],
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
