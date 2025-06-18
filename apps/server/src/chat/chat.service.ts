import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatRoom } from '../db/mongo/schema/chat-room.schema';
import { ChatMessage } from '../db/mongo/schema/chat-message.schema';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatService {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoom>,
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessage>,
  ) {}

  async createChatRoom(
    name: string,
    participants: number[],
    createdBy: number,
    isGroupChat: boolean,
  ): Promise<ChatRoom> {
    if (!isGroupChat && participants.length !== 2) {
      throw new Error('Direct messages must have exactly 2 participants');
    }

    if (isGroupChat && !name.trim()) {
      throw new Error('Group chat name cannot be empty');
    }

    const chatName = isGroupChat ? name : `DM-${participants.sort().join('-')}`;

    const chatRoom = new this.chatRoomModel({
      name: chatName,
      participants,
      createdBy,
      isGroupChat,
    });

    return chatRoom.save();
  }

  async sendMessage(
    roomId: string,
    senderId: number,
    message: string,
  ): Promise<ChatMessage> {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    const chatMessage = new this.chatMessageModel({
      roomId: new Types.ObjectId(roomId),
      senderId,
      message,
    });

    const savedMessage = await chatMessage.save();
    
    this.server.to(roomId).emit('newMessage', savedMessage);
    
    return savedMessage;
  }

  async addParticipants(roomId: string, newParticipants: number[]): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomModel.findById(roomId);
    if (!chatRoom) {
      throw new Error('Chat room not found');
    }

    if (!chatRoom.isGroupChat) {
      throw new Error('Cannot add participants to a direct message chat');
    }

    chatRoom.participants = [...new Set([...chatRoom.participants, ...newParticipants])];
    return chatRoom.save();
  }

  async removeParticipant(roomId: string, participantId: number): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomModel.findById(roomId);
    if (!chatRoom) {
      throw new Error('Chat room not found');
    }

    if (!chatRoom.isGroupChat) {
      throw new Error('Cannot remove participants from a direct message chat');
    }

    chatRoom.participants = chatRoom.participants.filter(id => id !== participantId);
    return chatRoom.save();
  }

  async getChatRooms(userId: number): Promise<ChatRoom[]> {
    return this.chatRoomModel.find({ participants: userId }).exec();
  }

  async getChatMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    return this.chatMessageModel
      .find({ roomId: new Types.ObjectId(roomId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}

