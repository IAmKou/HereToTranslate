import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatMessage extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ChatRoom', required: true })
  roomId: Types.ObjectId;

  @Prop({ type: Number, required: true }) // Store MySQL user ID
  senderId: number;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

   @Prop()
   createdAt: Date;
}
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ roomId: 1, createdAt: -1 });
