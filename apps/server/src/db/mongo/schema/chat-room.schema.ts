import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatRoom extends Document {
  @Prop({ type: [Number], required: true }) 
  participants: number[];

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Boolean, default: false })
  isGroupChat: boolean;

  @Prop({ type: Number, required: true })
  createdBy: number;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
ChatRoomSchema.index({ participants: 1 });
ChatRoomSchema.index({ name: 1 });
