import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MysqlTest } from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import { CreateUpdateDTO } from '#LocalProject/Dtos';

@Injectable()
export class TestService{
  constructor(
    @InjectRepository(MysqlTest)
    private readonly repo : Repository<MysqlTest>
  ) {}

 async create(dto : CreateUpdateDTO){
    return await this.repo.save(dto);
    // return this.repo.save(dto);
  }

  findAll(){
    return this.repo.find();
  }

  update(id: number, dto : CreateUpdateDTO){
    return this.repo.update(id, dto);
  }

  remove(id: number){
    return this.repo.delete(id);
  }
}
