import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ProjectActivity, ActivityType } from '../../db/mysql/entity/project-activity.entity';
import { UserEntity } from '#LocalProject/Entities';

export interface CreateActivityDto {
  projectId: number;
  userId: number;
  branchId?: number;
  type: ActivityType;
  details?: Record<string, any>;
  canUndo?: boolean;
  undoData?: Record<string, any>;
}

export interface GetActivitiesDto {
  projectId: number;
  page?: number;
  limit?: number;
  timeRange?: string;
  userId?: number;
  types?: string[];
}

@Injectable()
export class ActivityManagerService {
  constructor(
    @InjectRepository(ProjectActivity)
    private activityRepository: Repository<ProjectActivity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async createActivity(data: CreateActivityDto): Promise<ProjectActivity> {
    const activity = this.activityRepository.create({
      projectId: data.projectId,
      userId: data.userId,
      branchId: data.branchId,
      type: data.type,
      details: data.details || {},
      canUndo: data.canUndo || false,
      undoData: data.undoData || {},
    });

    return await this.activityRepository.save(activity);
  }

  async getActivities(data: GetActivitiesDto) {
    const { projectId, page = 1, limit = 20, timeRange, userId, types } = data;
    const offset = (page - 1) * limit;

    // Build query without user join for now
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.projectId = :projectId', { projectId })
      .orderBy('activity.createdAt', 'DESC');

    // Add user filter
    if (userId) {
      queryBuilder.andWhere('activity.userId = :userId', { userId });
    }

    // Add type filter
    if (types && types.length > 0) {
      queryBuilder.andWhere('activity.type IN (:...types)', { types });
    }

    // Add time range filter
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      queryBuilder.andWhere('activity.createdAt >= :startDate', { startDate });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const activities = await queryBuilder.getMany();

    // Transform activities to include real user information
    const transformedActivities = await Promise.all(
      activities.map(async (activity) => {
        let userInfo = {
          id: activity.userId,
          username: `User ${activity.userId}`,
          fullName: `User ${activity.userId}`,
          avatarUrl: null
        };

        // Fetch real user information
        if (activity.userId) {
          try {
            const user = await this.userRepository.findOne({
              where: { id: activity.userId },
              select: ['id', 'username', 'fullName', 'avatarUrl']
            });
            if (user) {
              userInfo = {
                id: user.id,
                username: user.username,
                fullName: user.fullName || user.username, // Use fullName if available, fallback to username
                avatarUrl: user.avatarUrl
              };
            }
          } catch (error) {
            console.error('Error fetching user info:', error);
          }
        }

        return {
          id: activity.id,
          type: activity.type,
          details: activity.details,
          canUndo: activity.canUndo,
          createdAt: activity.createdAt.toISOString(),
          user: userInfo
        };
      })
    );

    return {
      activities: transformedActivities,
      total,
      hasMore: offset + limit < total,
      page,
      limit,
    };
  }

  async undoActivity(activityId: string, projectId: number): Promise<boolean> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId, projectId }
      });

      if (!activity || !activity.canUndo) {
        return false;
      }

      // Implement undo logic based on activity type
      // This would typically involve reverting the action
      console.log(`Undoing activity ${activityId} of type ${activity.type}`);

      // For now, just mark as undone or delete
      await this.activityRepository.remove(activity);

      return true;
    } catch (error) {
      console.error('Error undoing activity:', error);
      return false;
    }
  }

  // Helper methods for creating specific types of activities
  async logFileUpload(projectId: number, userId: number, fileName: string, stringCount: number, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.FILE_UPLOAD,
      details: {
        fileName,
        stringCount,
      },
      canUndo: true,
      undoData: {
        fileName,
      },
    });
  }

  async logFileDelete(projectId: number, userId: number, fileName: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.FILE_DELETE,
      details: {
        fileName,
      },
    });
  }

  async logTranslationAdd(projectId: number, userId: number, translation: string, language: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.TRANSLATION_ADD,
      details: {
        translation,
        language,
      },
      canUndo: true,
    });
  }

  async logTranslationEdit(projectId: number, userId: number, translation: string, language: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.TRANSLATION_EDIT,
      details: {
        translation,
        language,
      },
      canUndo: true,
    });
  }

  async logMemberAdd(projectId: number, userId: number, memberName: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.MEMBER_ADD,
      details: {
        memberName,
      },
      canUndo: true,
    });
  }

  async logMemberRemove(projectId: number, userId: number, memberName: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.MEMBER_REMOVE,
      details: {
        memberName,
      },
      canUndo: true,
    });
  }

  async logProjectUpdate(projectId: number, userId: number, projectName: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.PROJECT_UPDATE,
      details: {
        projectName,
      },
      canUndo: false,
    });
  }

  async logDiscussionCreate(projectId: number, userId: number, discussionTitle: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.DISCUSSION_CREATE,
      details: {
        discussionTitle,
      },
      canUndo: true,
    });
  }

  async logDiscussionReply(projectId: number, userId: number, discussionTitle: string, content: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.DISCUSSION_REPLY,
      details: {
        discussionTitle,
        content,
      },
      canUndo: true,
    });
  }

  async logCommitCreate(projectId: number, userId: number, commitMessage: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.COMMIT_CREATE,
      details: {
        commitMessage,
      },
      canUndo: false,
    });
  }

  async logBranchCreate(projectId: number, userId: number, branchName: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.BRANCH_CREATE,
      details: {
        branchName,
      },
      canUndo: true,
    });
  }

  async logMemberJoin(projectId: number, userId: number, memberName: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.MEMBER_JOIN,
      details: {
        memberName,
      },
      canUndo: false,
    });
  }

  async logTaskCreate(projectId: number, userId: number, taskName: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.TASK_CREATE,
      details: {
        taskName,
      },
      canUndo: true,
    });
  }

  async logTaskStatusChange(projectId: number, userId: number, taskCount: number, language: string, branchId?: number) {
    return await this.createActivity({
      projectId,
      userId,
      branchId,
      type: ActivityType.TASK_STATUS_CHANGE,
      details: {
        taskCount,
        language,
      },
    });
  }

  async logRoleChange(projectId: number, userId: number, memberName: string, newRole: string) {
    return await this.createActivity({
      projectId,
      userId,
      type: ActivityType.ROLE_CHANGE,
      details: {
        memberName,
        newRole,
      },
    });
  }

  async logProjectUpdate(projectId: number, userId: number) {
    return await this.createActivity({
      projectId,
      userId,
      type: ActivityType.PROJECT_UPDATE,
      details: {},
    });
  }
}
