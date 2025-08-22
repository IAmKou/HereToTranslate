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

  // Deterministic key for DM uniqueness: sorted participants joined by ':'
  @Prop({ type: String })
  participantsKey?: string;
}

export type ChatRoomDocument = ChatRoom & Document & { _id: Types.ObjectId };
export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

// Remove the old unique index on participants for DMs and use a deterministic key instead
// Old (problematic):
// ChatRoomSchema.index(
//   { participants: 1, isGroupChat: 1 },
//   { unique: true, partialFilterExpression: { isGroupChat: false } }
// );

// New: unique on participantsKey only for non-group chats
ChatRoomSchema.index(
  { participantsKey: 1 },
  { unique: true, partialFilterExpression: { isGroupChat: false } }
);

// Pre-save to compute participantsKey for non-group chats
ChatRoomSchema.pre('save', function(next) {
  const doc: any = this as any;
  if (doc && doc.isGroupChat === false && Array.isArray(doc.participants) && doc.participants.length === 2) {
    const [a, b] = doc.participants.map((n: number) => Number(n)).sort((x: number, y: number) => x - y);
    doc.participantsKey = `${a}:${b}`;
  } else if (doc && doc.isGroupChat === true) {
    doc.participantsKey = undefined;
  }
  next();
});
