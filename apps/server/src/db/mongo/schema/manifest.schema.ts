import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ManifestDocument = Manifest & Document;

interface ManifestEntry {
  id: string; // unique id for this text block
  originalText: string;
  font?: string;
  position?: { x: number; y: number };
  style?: any; // bold, italic, size, etc.
  layoutInfo?: any; // page number, order, etc.
}

@Schema({ timestamps: true })
export class Manifest {
  @Prop({ required: true }) fileId: string;
  @Prop({ required: true }) entries: ManifestEntry[];
}
export const ManifestSchema = SchemaFactory.createForClass(Manifest);
