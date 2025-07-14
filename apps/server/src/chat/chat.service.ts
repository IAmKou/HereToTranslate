import { ChatMessage } from '../db/mongo/schema/chat-message.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from '#LocalProject/Dtos';
import { ChatRoom } from '../db/mongo/schema/chat-room.schema';
import { Injectable } from '@nestjs/common';
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
      .lean();

    const senderIds = [...new Set(messages.map((msg) => msg.senderId))];

    // ✅ Use UserManagerService instead of userModel
    const users = await this.userService.findUsersByIds(senderIds);

    const userMap = new Map<number, string>();
    for (const user of users) {
      userMap.set(Number(user.id), user.username);
    }

    return messages.map((msg) => ({
      ...msg,
      senderUsername: userMap.get(msg.senderId) || 'Unknown',
      createdAt: new Date(msg.createdAt).toISOString(),
    }));
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
}
