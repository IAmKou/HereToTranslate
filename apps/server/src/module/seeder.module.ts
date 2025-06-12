import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from '#LocalProject/Services/seeder.service';
import { RoleEntity, UserEntity } from '#LocalProject/Entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, UserEntity]),
  ],
  providers: [SeederService],
})
export class SeederModule {}
