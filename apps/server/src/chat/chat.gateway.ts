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

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Joining room: ${roomId}`);
    client.join(roomId);
    client.emit('joined_room', roomId);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('[GATEWAY] Received payload:', payload);

    const message = await this.chatService.createMessage(payload);

    this.server.in(payload.roomId).emit('new_message', message);

    return message;
  }
}
