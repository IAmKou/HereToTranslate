import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatRoom {
  @Prop({ type: [Number], required: true })
  participants: number[];

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Boolean, default: false })
  isGroupChat: boolean;

  @Prop({ type: Number, required: true })
  createdBy: number;

  @Prop()
  createdAt?: Date;
}
export type ChatRoomDocument = ChatRoom & Document & { _id: Types.ObjectId };

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

// Indexes
ChatRoomSchema.index({ participants: 1 });
ChatRoomSchema.index({ name: 1 });
