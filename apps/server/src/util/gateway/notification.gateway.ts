import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationEntity } from '#LocalProject/Entities';

interface NotificationPayload {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
  isGlobal?: boolean;
}

@WebSocketGateway({
  namespace: '/notifications',
  path: '/api/notifications/socket.io',
  cors: {
    origin: [
      'http://localhost:4200',  // Always allow localhost for development
      process.env.CLIENT_URL || 'http://localhost:4200',
      process.env.PRODUCTION_URL || 'https://htt-ekpa.onrender.com',
      /^http:\/\/26\.82\.216\.\d+:4200$/  // Allow any IP in RadVPN range
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  handleConnection(client: Socket) {
    this.logger.log(`✅ Notification client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Notification client disconnected: ${client.id}`);
// Remove socket from user mapping
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const index = socketIds.indexOf(client.id);
      if (index > -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('join_user_room')
  async handleJoinUserRoom(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`👤 Client ${client.id} joining user room: ${userId}`);

    // Join user-specific room
    client.join(`user_${userId}`);

    // Track socket for this user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)?.push(client.id);

    client.emit('joined_user_room', userId);
  }

// Send notification to specific user
  emitToUser(userId: bigint, notification: NotificationPayload) {
    const userIdStr = userId.toString();
    this.logger.log(`📤 Sending notification to user ${userIdStr}: ${notification.message}`);
    this.server.to(`user_${userIdStr}`).emit('new_notification', notification);
  }

// Send notification to all connected users (global notification)
  emitToAll(notification: NotificationPayload) {
    this.logger.log(`📢 Broadcasting global notification: ${notification.message}`);
    this.server.emit('global_notification', notification);
  }

// Send deletion notification to specific user
  emitDeletionToUser(userId: bigint, notificationId: string) {
    const userIdStr = userId.toString();
    this.logger.log(`🗑️ Sending deletion notification to user ${userIdStr}: ${notificationId}`);
    this.server.to(`user_${userIdStr}`).emit('notification_deleted', { id: notificationId });
  }

// Send deletion notification to all users (global notification)
  emitDeletionToAll(notificationId: string) {
    this.logger.log(`🗑️ Broadcasting global deletion notification: ${notificationId}`);
    this.server.emit('notification_deleted', { id: notificationId });
  }

// Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

// Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
