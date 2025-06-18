import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Controller('chat')
@WebSocketGateway()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  async createChatRoom(
    @Body() body: { name: string; participants: number[]; createdBy: number; isGroupChat?: boolean },
  ) {
    return this.chatService.createChatRoom(
      body.name,
      body.participants,
      body.createdBy,
      body.isGroupChat ?? true,
    );
  }

  @Get('rooms/:userId')
  async getChatRooms(@Param('userId') userId: number) {
    return this.chatService.getChatRooms(userId);
  }

  @Get('messages/:roomId')
  async getChatMessages(@Param('roomId') roomId: string) {
    return this.chatService.getChatMessages(roomId);
  }

  @Post('rooms/:roomId/participants')
  async addParticipants(
    @Param('roomId') roomId: string,
    @Body() body: { participants: number[] },
  ) {
    return this.chatService.addParticipants(roomId, body.participants);
  }

  @Post('rooms/:roomId/participants/:participantId/remove')
  async removeParticipant(
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: number,
  ) {
    return this.chatService.removeParticipant(roomId, participantId);
  }

  // WebSocket event handlers
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ) {
    client.join(roomId);
    return { event: 'joinRoom', data: { roomId } };
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ) {
    client.leave(roomId);
    return { event: 'leaveRoom', data: { roomId } };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { roomId: string; senderId: number; message: string },
  ) {
    return this.chatService.sendMessage(
      data.roomId,
      data.senderId,
      data.message,
    );
  }
}

