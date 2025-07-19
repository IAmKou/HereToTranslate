import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatMessage {
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
  @Prop({ type: Types.ObjectId, ref: 'ChatMessage', default: null })
  replyTo?: Types.ObjectId;
  @Prop({ type: String, required: false })
  senderUsername?: string
}
export type ChatMessageDocument = ChatMessage & Document & { _id: Types.ObjectId };

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ roomId: 1, createdAt: 1 });

