import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessage, ChatMessageSchema } from '../db/mongo/schema/chat-message.schema';
import { ChatRoom, ChatRoomSchema } from '../db/mongo/schema/chat-room.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: ChatRoom.name, schema: ChatRoomSchema },
    ]),
  ],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
