import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatRoom extends Document {
  @Prop({ type: [Number], required: true }) // MySQL user IDs
  participants: number[];
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
ChatRoomSchema.index({ participants: 1 });
