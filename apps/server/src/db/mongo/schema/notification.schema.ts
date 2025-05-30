import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification extends Document {
  @Prop({ type: Number, required: true }) // MySQL user ID
  userId: number;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Boolean, default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Compound index for efficient lookups
NotificationSchema.index({ userId: 1, read: 1 });
