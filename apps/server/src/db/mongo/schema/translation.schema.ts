import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
  originalText: string;

  @Prop()
  translatedText?: string;

  @Prop({ type: Number, default: 0 })
  filePart: number;
}

export const TranslationStringSchema = SchemaFactory.createForClass(TranslationString);
