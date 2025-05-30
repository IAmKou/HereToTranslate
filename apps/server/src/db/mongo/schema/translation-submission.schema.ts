import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: false, updatedAt: false } })
export class TranslationSubmission extends Document {
  @Prop({ type: Number, required: true, index: true }) // MySQL project ID
  projectId: number;

  @Prop({ type: Number, required: true, index: true }) // MySQL file ID
  fileId: number;

  @Prop({ type: String, required: true, index: true })
  language: string;

  @Prop({ type: String })
  content: string;

  @Prop({ type: Number, required: true, index: true }) // MySQL user ID
  submittedBy: number;

  @Prop({ type: String, default: 'Submitted' })
  status: string;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;
}

export const TranslationSubmissionSchema = SchemaFactory.createForClass(TranslationSubmission);

// Additional compound index
TranslationSubmissionSchema.index({ projectId: 1, language: 1 });
