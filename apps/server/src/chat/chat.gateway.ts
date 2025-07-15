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

@WebSocketGateway({
  namespace: '/chat',
  path: '/api/chat/socket.io',
  cors: {
    origin: 'http://localhost:4200',
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
    @MessageBody() payload: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[GATEWAY] 📩 Received payload:', payload);
    const saved = await this.chatService.createMessage(payload);

    let senderUsername = 'Unknown';
    try {
      const users = await this.userService.findUsersByIds([payload.senderId]);
      if (users && users.length > 0) {
        senderUsername = users[0].username;
      }
    } catch (err) {
      console.error('⚠️ Failed to fetch username:', err);
    }
    const messageWithUsername = {
      ...saved.toObject(),
      senderUsername,
    };
    this.server.to(payload.roomId).emit('new_message', messageWithUsername);
    return messageWithUsername;
  }
}
