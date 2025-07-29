import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { Buffer } from 'buffer';

export type TranslationStringDocument = TranslationString & Document;

@Schema({ timestamps: true })
export class TranslationString {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true })
  fileId: string;

  @Prop({ required: true })
  manifestEntryId: string;

  @Prop({ required: true })
  originalText: string;

  @Prop()
  translatedText?: string;

  @Prop({ required: true, index: true })
  language: string;

  @Prop({ type: Number, default: 0 })
  filePart: number;

  @Prop()
  font?: string;

  @Prop({ type: Object })
  style?: Record<string, any>;

  @Prop({ type: Object })
  position?: {
    x: number;
    y: number;
    page?: number;
  };

  @Prop({ type: Boolean, default: false })
  obsolete?: boolean;
}

export const TranslationStringSchema = SchemaFactory.createForClass(TranslationString);
TranslationStringSchema.index({ manifestEntryId: 1 });
TranslationStringSchema.index({ fileId: 1, language: 1, originalText: 1 });
