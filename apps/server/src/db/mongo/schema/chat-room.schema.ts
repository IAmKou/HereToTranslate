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

  @Prop({ type: String })
  avatar?: string;

  @Prop({ type: String })
  description?: string;

  @Prop()
  updatedAt?: Date;

}

export type ChatRoomDocument = ChatRoom & Document & { _id: Types.ObjectId };
export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

ChatRoomSchema.index(
  { participants: 1, isGroupChat: 1 },
  { unique: true, partialFilterExpression: { isGroupChat: false } }
);
