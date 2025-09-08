import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TranslationString,
  TranslationStringDocument,
} from '../../db/mongo/schema/translation.schema';
import { FileEntity } from '#LocalProject/Entities';

@Injectable()
export class ManifestService {
  constructor(
    @InjectModel(TranslationString.name)
    private readonly translationModel: Model<TranslationStringDocument>,
  ) {}

  async generateManifest(file: FileEntity): Promise<void> {}
}
  



