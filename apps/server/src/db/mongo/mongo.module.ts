import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessageSchema } from './schema/chat-message.schema';
import { ChatRoomSchema } from './schema/chat-room.schema';
import { TranslationStringSchema } from './schema/translation.schema';
import { ManifestSchema } from './schema/manifest.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ChatMessage', schema: ChatMessageSchema },
      { name: 'ChatRoom', schema: ChatRoomSchema },
      { name: 'TranslationString', schema: TranslationStringSchema },
      { name: 'Manifest', schema: ManifestSchema },
    ])
  ],
  exports: [MongooseModule]
})
export class MongoModule {}
