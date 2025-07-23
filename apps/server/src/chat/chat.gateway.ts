import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateMessageDto } from '#LocalProject/Dtos';
import { UserManagerService } from '#LocalProject/Managers/service/user-manager.service';
import { ChatMessageDocument } from '../db/mongo/schema/chat-message.schema';

@WebSocketGateway({
  namespace: '/chat',
  path: '/api/chat/socket.io',
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['http://localhost:4200']
      : true, // Allow all origins in development
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserManagerService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`✅ Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`👥 Client ${client.id} joining room: ${roomId}`);
    client.join(roomId);
    client.emit('joined_room', roomId);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: CreateMessageDto & { replyToId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[GATEWAY] 📩 Received payload:', payload);
    const savedDoc: ChatMessageDocument = await this.chatService.createMessage(payload);

    let senderUsername = 'Unknown';
    try {
      const users = await this.userService.findUsersByIds([payload.senderId]);
      if (users && users.length > 0) {
        senderUsername = users[0].username;
      }
    } catch (err) {
      console.error('⚠️ Failed to fetch username:', err);
    }

    const plain = savedDoc.toObject();
    let replyToData = null;

    if (plain.replyTo) {
      const repliedDoc = await this.chatService.findMessageById(plain.replyTo.toString());
      if (repliedDoc) {
        replyToData = {
          _id: repliedDoc._id.toString(),
          message: repliedDoc.message,
          senderId: repliedDoc.senderId,
          senderUsername: repliedDoc.senderUsername,
        };
      }
    }

    const messageWithUsername = {
      _id: plain._id.toString(),
      roomId: plain.roomId.toString(),
      senderId: plain.senderId,
      message: plain.message,
      createdAt: plain.createdAt,
      isEdited: plain.isEdited ?? false,
      senderUsername,
      replyTo: replyToData,
    };

    this.server.to(payload.roomId).emit('new_message', messageWithUsername);
    return messageWithUsername;
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; newContent: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[GATEWAY] ✏️ Edit request:', data);
    const updated = await this.chatService.editMessage(data.messageId, data.newContent);
    // Broadcast the edited message to all clients in the room
    this.server.to(updated.roomId.toString()).emit('message_edited', {
      _id: updated._id.toString(),
      roomId: updated.roomId.toString(),
      message: updated.message,
      isEdited: true,
      senderId: updated.senderId,
      createdAt: updated.createdAt
    });
    return updated;
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[GATEWAY] 🗑️ Delete request:', data);
    await this.chatService.deleteMessage(data.messageId);

    // Broadcast deleted message ID to everyone in the room
    this.server.to(data.roomId).emit('message_deleted', data.messageId);
    return { deleted: true, _id: data.messageId };
  }

}
