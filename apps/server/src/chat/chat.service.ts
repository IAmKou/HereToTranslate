import { ChatMessage } from '../db/mongo/schema/chat-message.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from '#LocalProject/Dtos';
import { ChatRoom } from '../db/mongo/schema/chat-room.schema';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserManagerService } from '#LocalProject/Managers/service/user-manager.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessage>,

    @InjectModel(ChatRoom.name)
    private chatRoomModel: Model<ChatRoom>,

    private readonly userService: UserManagerService // ✅ Injected properly
  ) {}

  async createMessage(data: CreateMessageDto): Promise<ChatMessage> {
    const msg = new this.chatMessageModel({
      roomId: new Types.ObjectId(data.roomId),
      senderId: data.senderId,
      message: data.message,
  });

    return msg.save();
  }

  async getMessages(roomId: Types.ObjectId): Promise<any[]> {
    const messages = await this.chatMessageModel
      .find({ roomId })
      .sort({ createdAt: 1 })
      .lean(); // Lean trả về plain object

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
    }));
  }
  async renameRoom(id: string, name: string) {
    return this.chatRoomModel.findByIdAndUpdate(id, { name }, { new: true });
  }

  async deleteRoom(id: string) {
    return this.chatRoomModel.findByIdAndDelete(id);
  }

  async getChatRoomsForUser(userId: number) {
    return this.chatRoomModel
      .find({ participants: userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async openChatBetween(
    userA: { id: number; username: string },
    userB: { id: number; username: string }
  ) {
    const participantIds = [userA.id, userB.id].sort((a, b) => a - b);

    let room = await this.chatRoomModel
      .findOne({
        participants: participantIds,
        isGroupChat: false,
      })
      .lean()
      .exec();

    if (!room) {
      const createdRoom = await this.chatRoomModel.create({
        participants: participantIds,
        name: `${userA.username}-${userB.username}`,
        isGroupChat: false,
        createdBy: userA.id,
      });

      room = await this.chatRoomModel.findById(createdRoom._id).lean().exec();
    }
    return room;
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

}
