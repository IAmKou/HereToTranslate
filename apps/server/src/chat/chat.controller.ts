import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { UserManagerService } from '#LocalProject/Managers/service/user-manager.service';
import { Types } from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserManagerService,
  ) {
  }

  @Get('rooms/:userId')
  @UseGuards(JwtAuthGuard)
  async getRoomsForUser(@Param('userId') userId: number) {
    try {
      const rooms = await this.chatService.getChatRoomsForUser(userId);
      return rooms.map(room => ({
        ...room,
        _id: room._id.toString(),
        createdBy: room.createdBy
      }));
    } catch (error) {
      throw new BadRequestException('Failed to fetch chat rooms');
    }
  }

  @Post('open-dm')
  @UseGuards(JwtAuthGuard)
  async openDirectChat(
    @Req() req: AuthenticatedRequest,
    @Body('targetIdentifier') targetIdentifier: string,
  ) {
    if (!targetIdentifier) {
      throw new BadRequestException('Target identifier is required');
    }

    const sender = req.user;
    const target = await this.userService.searchByEmailOrUsername(targetIdentifier);

    if (!target) {
      throw new NotFoundException('Target user not found');
    }

    if (target.id === sender.id) {
      throw new BadRequestException('Cannot open chat with yourself');
    }

    try {
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
    } catch (error: any) {
      // surface message
      const message = error?.message || 'Failed to create chat room';
      throw new BadRequestException(message);
    }
  }

  @Get('messages/:roomId')
  @UseGuards(JwtAuthGuard)
  async getMessages(@Param('roomId') roomId: string) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw new BadRequestException('Invalid room ID');
    }

    try {
      const messages = await this.chatService.getMessages(new Types.ObjectId(roomId));
      return messages;
    } catch (error) {
      throw new BadRequestException('Failed to fetch messages');
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/chat',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('❌ Only image files (jpg, png, gif, webp) are allowed.'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // Increased to 10MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: AuthenticatedRequest) {
    if (!file) {
      throw new BadRequestException('❌ No file uploaded');
    }

    // Log upload details for debugging
    console.log('📸 File upload details:', {
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/chat/${file.filename}`;

    // Verify file exists after upload
    const fs = require('fs');
    const filePath = `./uploads/chat/${file.filename}`;

    if (!fs.existsSync(filePath)) {
      console.error('❌ File was not saved properly:', filePath);
      throw new BadRequestException('❌ File upload failed - file not saved');
    }

    console.log('✅ File uploaded successfully:', fileUrl);

    return {
      url: fileUrl,
      fileName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @Post('create-group')
  @UseGuards(JwtAuthGuard)
  async createGroup(
    @Req() req: AuthenticatedRequest,
    @Body('name') name: string,
    @Body('memberIds') memberIds: number[],
  ) {
    if (!name || name.trim() === '') {
      throw new BadRequestException('Group name is required');
    }
    const creatorId = Number(req.user.id);
    const participants = Array.from(new Set([...memberIds, creatorId]));
    if (participants.length < 3) {
      throw new BadRequestException('A group chat must have at least 3 participants (including the creator).');
    }

    const room = await this.chatService.createGroupRoom(name.trim(), creatorId, participants);

    if (!room) {
      throw new BadRequestException('❌ Failed to create group room');
    }

    return {
      ...room,
      _id: room._id.toString(),
    }
  }


  @Patch('rooms/:id')
  @UseGuards(JwtAuthGuard)
  async renameRoom(
    @Param('id') id: string,
    @Body('name') name: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!name) {
      throw new BadRequestException('Room name is required');
    }

    try {
      const room = await this.chatService.renameRoom(id, name);
      if (!room) {
        throw new NotFoundException('Room not found');
      }
      return room;
    } catch (error) {
      throw new BadRequestException('Failed to rename room');
    }
  }

  @Delete('rooms/:id')
  @UseGuards(JwtAuthGuard)
  async deleteRoom(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    try {
      const room = await this.chatService.deleteRoom(id);
      if (!room) {
        throw new NotFoundException('Room not found');
      }
      return { message: 'Room deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete room');
    }
  }

  @Patch('messages/:id')
  @UseGuards(JwtAuthGuard)
  async updateMessage(
    @Param('id') id: string,
    @Body('message') message: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!message) {
      throw new BadRequestException('Message content is required');
    }

    try {
      const updatedMessage = await this.chatService.editMessage(id, message);
      if (!updatedMessage) {
        throw new NotFoundException('Message not found');
      }
      return updatedMessage;
    } catch (error) {
      throw new BadRequestException('Failed to update message');
    }
  }

  @Delete('messages/:id')
  @UseGuards(JwtAuthGuard)
  async deleteMessage(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    try {
      const result = await this.chatService.deleteMessage(id);
      if (!result) {
        throw new NotFoundException('Message not found');
      }
      return { message: 'Message deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete message');
    }
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUser(@Query('q') q: string) {
    if (!q) {
      throw new BadRequestException('Search query is required');
    }

    try {
      const user = await this.userService.searchByEmailOrUsername(q.trim());
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      };
    } catch (error) {
      throw new BadRequestException('Failed to search user');
    }
  }

  @Patch('rooms/:id/add-member')
  @UseGuards(JwtAuthGuard)
  async addMember(
    @Param('id') roomId: string,
    @Body('userId') userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    try {
      const result = await this.chatService.addMemberToRoom(roomId, userId);
      if (!result) {
        throw new NotFoundException('Room not found or user already in room');
      }
      return { message: 'Member added successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to add member to room');
    }
  }

  @Get('rooms/:roomId/participants')
  @UseGuards(JwtAuthGuard)
  async getRoomParticipants(@Param('roomId') roomId: string) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw new BadRequestException('Invalid room ID');
    }

    try {
      const participants = await this.chatService.getParticipants(roomId);
      return participants;
    } catch (error) {
      throw new BadRequestException('Failed to fetch participants');
    }
  }

  @Patch('rooms/:id/remove-member')
  @UseGuards(JwtAuthGuard)
  async removeMember(
    @Param('id') roomId: string,
    @Body('userId') userId: number,
    @Body('creatorId') creatorId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!userId || !creatorId) {
      throw new BadRequestException('User ID and creator ID are required');
    }

    try {
      const result = await this.chatService.removeMemberFromRoom(roomId, userId, creatorId);
      if (!result) {
        throw new NotFoundException('Room not found or user not in room');
      }
      return { message: 'Member removed successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to remove member from room');
    }
  }

  // Get unread message count for a specific room
  @Get('rooms/:roomId/unread-count')
  @UseGuards(JwtAuthGuard)
  async getRoomUnreadCount(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw new BadRequestException('Invalid room ID');
    }

    try {
      const count = await this.chatService.getUnreadCount(roomId, Number(req.user.id));
      return { roomId, unreadCount: count };
    } catch (error) {
      throw new BadRequestException('Failed to fetch unread count');
    }
  }

  // Mark a room as read for the current user
  @Post('rooms/:roomId/mark-read')
  @UseGuards(JwtAuthGuard)
  async markRoomAsRead(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw new BadRequestException('Invalid room ID');
    }

    try {
      await this.chatService.markRoomAsRead(roomId, Number(req.user.id));
      return { message: 'Room marked as read successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to mark room as read');
    }
  }

  // Get total unread count across all rooms for current user
  @Get('unread-count/total')
  @UseGuards(JwtAuthGuard)
  async getTotalUnreadCount(@Req() req: AuthenticatedRequest) {
    try {
      const count = await this.chatService.getTotalUnreadCount(Number(req.user.id));
      return { totalUnreadCount: count };
    } catch (error) {
      throw new BadRequestException('Failed to fetch total unread count');
    }
  }

  // Get unread counts for all rooms of current user
  @Get('unread-counts')
  @UseGuards(JwtAuthGuard)
  async getUnreadCountsForUser(@Req() req: AuthenticatedRequest) {
    try {
      const counts = await this.chatService.getUnreadCountsForUser(Number(req.user.id));
      return { unreadCounts: counts };
    } catch (error) {
      throw new BadRequestException('Failed to fetch unread counts');
    }
  }
}

