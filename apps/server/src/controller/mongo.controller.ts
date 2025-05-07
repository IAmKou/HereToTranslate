import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { MongoService } from '../service/mongo.service';
import { CreateUpdateDTO } from '../db/dto/test.dto';

@Controller('mongo')
export class MongoController {
  constructor(private readonly service: MongoService) {
  }

  @Post()
  create(@Body() dto: CreateUpdateDTO) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateUpdateDTO) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
