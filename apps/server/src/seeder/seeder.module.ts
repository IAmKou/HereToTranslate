import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from 'src/seeder/seeder.service';
import { UserTypeEntity, UserEntity } from '#LocalProject/Entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserTypeEntity, UserEntity]),
  ],
  providers: [SeederService],
})
export class SeederModule { }
