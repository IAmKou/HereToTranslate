import { Injectable } from '@nestjs/common';
import { ChatMessage } from '../db/mongo/schema/chat-message.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from '#LocalProject/Dtos';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessage>
  ) {}

  async createMessage(data: CreateMessageDto): Promise<ChatMessage> {
    const msg = new this.chatMessageModel(data);
    return msg.save();
  }

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    return this.chatMessageModel.find({ roomId }).sort({ createdAt: -1 }).exec();
  }
}
