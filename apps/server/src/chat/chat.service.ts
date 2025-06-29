import { Injectable } from '@nestjs/common';
import { ChatMessage } from '../db/mongo/schema/chat-message.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from '#LocalProject/Dtos';
import { ChatRoom } from '../db/mongo/schema/chat-room.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessage>,
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoom>
  ) {}

  async createMessage(data: CreateMessageDto): Promise<ChatMessage> {
    const msg = new this.chatMessageModel(data);
    return msg.save();
  }

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    return this.chatMessageModel
      .find({ roomId })
      .sort({ createdAt: -1 })
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
      .exec();

    if (!room) {
      room = new this.chatRoomModel({
        participants: participantIds,
        name: `${userA.username}-${userB.username}`,
        isGroupChat: false,
        createdBy: userA.id,
      });
      await room.save();
    }

    return room;
  }
}
