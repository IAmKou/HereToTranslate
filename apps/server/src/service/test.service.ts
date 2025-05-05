import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MysqlTest } from '../entity/test.entity';
import { Repository } from 'typeorm';
import { CreateUpdateDTO } from '../dto/test.dto';

@Injectable()
export class TestService{
  constructor(
    @InjectRepository(MysqlTest)
    private readonly repo : Repository<MysqlTest>
  ) {}

  create(dto : CreateUpdateDTO){
    return this.repo.save(dto);
  }

  findAll(){
    return this.repo.find();
  }

  update(id: number, dto : CreateUpdateDTO){
    return this.repo.update(id,dto);
  }

  remove(id: number){
    return this.repo.remove(id);
  }
}
