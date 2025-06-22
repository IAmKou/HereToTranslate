import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateMessageDto } from '#LocalProject/Dtos';

@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.join(roomId);
    client.emit('joined_room', roomId);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.chatService.createMessage(payload);
    client.to(payload.roomId).emit('new_message', message);
    return message;
  }
}
