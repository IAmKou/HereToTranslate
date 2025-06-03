import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from '../service/seeder.service';
import { RoleEntity } from '../db/mysql/entity/role.entity';
import { UserEntity } from '../db/mysql/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, UserEntity]),
  ],
  providers: [SeederService],
})
export class SeederModule {}
