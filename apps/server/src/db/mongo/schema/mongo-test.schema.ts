import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class MongoTest extends Document {
  @Prop({ required: true })
  _name : string;

}
export const MongoTestSchema = SchemaFactory.createForClass(MongoTest);
