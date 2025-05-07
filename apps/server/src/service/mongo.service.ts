import { MongoTest } from '../db/mongo/schema/mongo-test.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { CreateUpdateDTO } from '../db/dto/test.dto';

@Injectable()
export class MongoService{
  constructor(@InjectModel(MongoTest.name)
  private readonly model : Model<MongoTest>) {}

  create (dto : CreateUpdateDTO) {
    return this.model.create(dto);
  }

  findAll(){
    return this.model.find().exec();
  }

  async update(id: string, dto: CreateUpdateDTO) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid ID format');
    }
    const updateData = { name: dto.name };
    console.log('Update data:', updateData); // Debug log
    const result = await this.model
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
    if (!result) {
      throw new Error('Document not found');
    }
    return result;
  }

  delete(id : string){
    return this.model.findByIdAndDelete(id).exec();
  }

}
