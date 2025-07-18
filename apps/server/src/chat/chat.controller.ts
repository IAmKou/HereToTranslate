import {
  BadRequestException,
  Body,
  Controller, Delete,
  Get,
  NotFoundException,
  Param, Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { UserManagerService } from '#LocalProject/Managers/service/user-manager.service';
import { Types } from 'mongoose';

@Controller('chat')
  export class ChatController {
  constructor(private readonly chatService: ChatService,
              private readonly userService: UserManagerService) {
  }

  @Get('rooms/:userId')
  async getRoomsForUser(@Param('userId') userId: number) {
    const rooms = await this.chatService.getChatRoomsForUser(userId);
    return rooms.map((room) => ({
      ...room,
      _id: room._id.toString(), // ✅ Force ObjectId to string
    }));
  }

  @Post('open-dm')
  @UseGuards(JwtAuthGuard)
  async openDirectChat(
    @Req() req: AuthenticatedRequest,
    @Body('targetIdentifier') targetIdentifier: string,
  ) {
    const sender = req.user;
    const target = await this.userService.searchByEmailOrUsername(targetIdentifier);
    if (!target) throw new NotFoundException('Target user not found');

    const room = await this.chatService.openChatBetween(
      {
        id: Number(sender.id),
        username: sender.username,
      },
      {
        id: Number(target.id),
        username: target.username,
      }
    );
    if (!room) {
      throw new NotFoundException('Chat room could not be created');
    }

    return {
      ...room,
      _id: room._id!.toString(),
    };
  }
  @Get('messages/:roomId')
  async getMessages(@Param('roomId') roomId: string) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw new BadRequestException('Invalid room ID');
    }

    const objectId = new Types.ObjectId(roomId);
    return this.chatService.getMessages(objectId);
  }
  @Patch('rooms/:id')
  async renameRoom(@Param('id') id: string, @Body() body: { name: string }) {
    return this.chatService.renameRoom(id, body.name);
  }

  @Delete('rooms/:id')
  async deleteRoom(@Param('id') id: string) {
    return this.chatService.deleteRoom(id);
  }

  @Patch('messages/:id')
  async updateMessage(@Param('id') id: string, @Body() body: { message: string }) {
    return this.chatService.editMessage(id, body.message);
  }

// DELETE /api/chat/messages/:id
  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    return this.chatService.deleteMessage(id);
  }
  @Patch('rooms/:id/add-member')
  async addMember(
    @Param('id') roomId: string,
    @Body('userId') userId: number,
  ) {
    return this.chatService.addMemberToRoom(roomId, userId);
  }
  @Get('rooms/:roomId/participants')
  async getRoomParticipants(@Param('roomId') roomId: string) {
    return this.chatService.getParticipants(roomId);
  }
}

