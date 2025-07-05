import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessageSchema } from './schema/chat-message.schema';
import { ChatRoomSchema } from './schema/chat-room.schema';
import { TranslationStringSchema } from './schema/translation.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ChatMessage', schema: ChatMessageSchema },
      { name: 'ChatRoom', schema: ChatRoomSchema },
      { name: 'TranslationString', schema: TranslationStringSchema },
    ])
  ],
  exports: [MongooseModule]
})
export class MongoModule {}
