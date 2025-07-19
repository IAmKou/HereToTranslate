import { ChatMessage, ChatMessageDocument } from '../db/mongo/schema/chat-message.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from '#LocalProject/Dtos';
import { ChatRoom } from '../db/mongo/schema/chat-room.schema';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserManagerService } from '#LocalProject/Managers/service/user-manager.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessage>,

    @InjectModel(ChatRoom.name)
    private chatRoomModel: Model<ChatRoom>,

    private readonly userService: UserManagerService
  ) {}

  async createMessage(data: CreateMessageDto): Promise<ChatMessageDocument> {
    const msg = new this.chatMessageModel({
      roomId: new Types.ObjectId(data.roomId),
      senderId: data.senderId,
      message: data.message,
      replyTo: data.replyToId ? new Types.ObjectId(data.replyToId) : null, // ✅
    });
    return msg.save();
  }

  async getMessages(roomId: Types.ObjectId): Promise<any[]> {
    const messages = await this.chatMessageModel
      .find({ roomId })
      .sort({ createdAt: 1 })
      .populate('replyTo', 'message senderId')
      .lean();

    const senderIds = [...new Set(messages.map((msg) => msg.senderId))];

    const users = await this.userService.findUsersByIds(senderIds);

    const userMap = new Map<number, string>();
    for (const user of users) {
      userMap.set(Number(user.id), user.username);
    }

    return messages.map((msg: any) => ({
      _id: msg._id.toString(),
      roomId: msg.roomId.toString(),
      senderId: msg.senderId,
      senderUsername: userMap.get(msg.senderId) || 'Unknown',
      message: msg.message,
      isEdited: msg.isEdited ?? false,
      createdAt: msg.createdAt
        ? new Date(msg.createdAt).toISOString()
        : null,
      replyTo: msg.replyTo ? {
        _id: msg.replyTo._id.toString(),
        message: msg.replyTo.message,
        senderId: msg.replyTo.senderId,
      } : null,
    }));
  }
  async renameRoom(id: string, name: string) {
    return this.chatRoomModel.findByIdAndUpdate(id, { name }, { new: true });
  }

  async deleteRoom(id: string) {
    return this.chatRoomModel.findByIdAndDelete(id);
  }

  async getChatRoomsForUser(userId: number) {
    const rooms = await this.chatRoomModel
      .find({ participants: userId })
      .lean()
      .exec();

    const results = await Promise.all(
      rooms.map(async (room) => {
        let oppositeUser = null;
        if (!room.isGroupChat) {
          const otherId = room.participants.find((id: number) => id !== userId);
          if (otherId != null) {
            oppositeUser = await this.userService.findUserById(otherId);
          }
        }

        return {
          _id: room._id.toString(),
          name: room.name,
          isGroupChat: room.isGroupChat,
          participants: room.participants,
          createdBy: room.createdBy,
          oppositeUser,
        };
      }),
    );
    return results;
  }

  async openChatBetween(
    userA: { id: number; username: string },
    userB: { id: number; username: string }
  ) {
    const participantIds = [userA.id, userB.id].sort((a, b) => a - b);

    let room = await this.chatRoomModel
      .findOne({ participants: participantIds, isGroupChat: false })
      .lean()
      .exec();

    if (!room) {
      const createdRoom = await this.chatRoomModel.create({
        participants: participantIds,
        name: `${userB.username}`,
        isGroupChat: false,
        createdBy: userA.id,
      });
      room = await this.chatRoomModel.findById(createdRoom._id).lean().exec();
    }

    return {
      ...room,
      _id: room?._id?.toString(),
    };
  }

  async editMessage(id: string, newContent: string) {
    const message = await this.chatMessageModel.findById(id);
    if (!message) throw new NotFoundException('Message not found');

    message.message = newContent;
    message.isEdited = true;
    await message.save();

    return {
      _id: message._id.toString(),
      roomId: message.roomId.toString(),
      senderId: message.senderId,
      message: message.message,
      isEdited: message.isEdited,
      createdAt: message.createdAt?.toISOString?.(),
    };
  }

  async deleteMessage(id: string) {
    const result = await this.chatMessageModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Message not found');
    }
    return { deleted: true, _id: id };
  }
  async findMessageById(messageId: string) {
    const doc = await this.chatMessageModel.findById(messageId).lean();
    if (!doc) return null;
    let senderUsername = 'Unknown';
    try {
      const users = await this.userService.findUsersByIds([doc.senderId]);
      if (users && users.length > 0) {
        senderUsername = users[0].username;
      }
    } catch (err) {
      console.error('⚠️ Failed to fetch username for replyTo:', err);
    }

    return {
      _id: doc._id,
      message: doc.message,
      senderId: doc.senderId,
      senderUsername,
    };
  }

  async addMemberToRoom(roomId: string, userId: number) {
    const room = await this.chatRoomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    if (room.participants.includes(userId)) {
      throw new BadRequestException('Cannot invite invited user');
    }
    room.participants.push(userId);
    if (!room.isGroupChat && room.participants.length > 2) {
      room.isGroupChat = true;
    }

    await room.save();
    return room.toObject();
  }

  async removeMemberFromRoom(roomId: string, creatorId: number, userId: number) {
    const room = await this.chatRoomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');

    if (room.createdBy !== creatorId) {
      throw new BadRequestException('Only the room creator can remove members.');
    }

    if (userId === creatorId) {
      throw new BadRequestException('Creator cannot be removed.');
    }

    room.participants = room.participants.filter((id: number) => id !== userId);
    await room.save();
    return { success: true, removedUserId: userId };
  }


  async getParticipants(roomId: string) {
    const room = await this.chatRoomModel.findById(roomId).lean();
    if (!room) throw new NotFoundException('Room not found');

    const users = await this.userService.findUsersByIds(room.participants);

    return {
      createdBy: room.createdBy,
      participants: users.map(u => ({
        id: Number(u.id),
        username: u.username,
        email: u.email,
        phone: u.phone,
      })),
    };
  }
}
