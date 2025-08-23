import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TaskEntity } from '#LocalProject/Entities';
import { TaskCommentEntity } from '../../db/mysql/entity/task-comment.entity';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:4200',  // Always allow localhost for development
      process.env.CLIENT_URL || 'http://localhost:4200',
      process.env.PRODUCTION_URL || 'https://htt-ekpa.onrender.com',
      /^http:\/\/26\.82\.216\.\d+:4200$/  // Allow any IP in RadVPN range
    ],
    credentials: true,
  },
})
export class TaskGateway {
  @WebSocketServer()
  server: Server;

  emitTaskUpdate(task: TaskEntity) {
    this.server.emit('task-updated', {
      id: task.id,
      title: task.title,
      status: task.status,
    });
  }

  emitTaskDelete(taskId: bigint) {
    this.server.emit('task-deleted', {
      id: taskId,
    });
  }

  emitCommentAdded(comment: TaskCommentEntity) {
    this.server.emit('comment-added', {
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
    });
  }

  emitCommentUpdated(comment: TaskCommentEntity) {
    this.server.emit('comment-updated', {
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
    });
  }

  emitCommentDeleted(commentId: string, taskId: string) {
    this.server.emit('comment-deleted', {
      commentId,
      taskId,
    });
  }
}
