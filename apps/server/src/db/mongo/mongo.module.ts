import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessageSchema } from './schema/chat-message.schema';
import { ChatRoomSchema } from './schema/chat-room.schema';
import { TranslationStringSchema } from './schema/translation.schema';
import { ManifestSchema } from './schema/manifest.schema';
import { PdfTextSchema } from './schema/pdf-details.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ChatMessage', schema: ChatMessageSchema },
      { name: 'ChatRoom', schema: ChatRoomSchema },
      { name: 'TranslationString', schema: TranslationStringSchema },
      { name: 'Manifest', schema: ManifestSchema },
      { name: 'PdfTextDetails', schema: PdfTextSchema },
    ])
  ],
  exports: [MongooseModule]
})
export class MongoModule {}
