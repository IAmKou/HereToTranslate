import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TranslationDocument = Translation & Document;

@Schema({ timestamps: true })
export class Translation {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true })
  fileId: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  sourceText: string;

  @Prop()
  translatedText?: string;

  @Prop({ default: 'en' })
  sourceLang: string;

  @Prop({ default: 'vi' })
  targetLang: string;
}

export const TranslationSchema = SchemaFactory.createForClass(Translation);
