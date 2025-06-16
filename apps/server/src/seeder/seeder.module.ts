import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from 'src/seeder/seeder.service';
import { RoleEntity, UserEntity } from '#LocalProject/Entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, UserEntity]),
  ],
  providers: [SeederService],
})
export class SeederModule { }
