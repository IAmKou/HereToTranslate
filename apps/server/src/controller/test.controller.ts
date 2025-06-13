import { TestService } from '../service/test.service';
import { Controller, Post, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { CreateUpdateDTO } from '#LocalProject/Dtos';

@Controller('test')
export class TestController{
  constructor(private readonly service : TestService) {
  }

  @Post()
  create(@Body() dto : CreateUpdateDTO){
    return this.service.create(dto);
  }

  @Get()
  findAll(){
    return this.service.findAll();
  }

  @Put(':id')
    update(@Param('id') id : number, @Body() dto : CreateUpdateDTO) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id : number){
    return this.service.remove(id);
  }
}
