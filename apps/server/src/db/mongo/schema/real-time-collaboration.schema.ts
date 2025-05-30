import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: { updatedAt: true, createdAt: false } })
export class CollabDoc extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true, index: true })
  documentId: Types.ObjectId;

  @Prop()
  content: string;

  @Prop({ type: Number, default: 1 })
  version: number;

  // updatedAt is automatically managed by the `timestamps` option
}

export const CollabDocSchema = SchemaFactory.createForClass(CollabDoc);

// Compound index: (documentId, version) for fast version tracking
CollabDocSchema.index({ documentId: 1, version: -1 });
