import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRoom, ChatRoomSchema } from '../db/mongo/schema/chat-room.schema';
import { ChatMessage, ChatMessageSchema } from '../db/mongo/schema/chat-message.schema';
import { UserManagerService } from '../manager/service/user-manager.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '#LocalProject/Entities';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [ChatController],
  providers: [ChatService, UserManagerService],
  exports: [ChatService],
})
export class ChatModule {}

