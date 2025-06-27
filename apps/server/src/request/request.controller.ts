import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestService } from './request.service';
import {
  CreateRequestDto,
  UpdateRequestDto,
  ReviewRequestDto,
} from '../db/dto/request.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreateRequestDto,
    @UploadedFile() file: any | undefined,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.requestService.create(dto, userId ,file);
  }


  @UseGuards(JwtAuthGuard)
  @Patch()
  async update(@Body() dto: UpdateRequestDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.requestService.update(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('review')
  async review(@Body() dto: ReviewRequestDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.requestService.review(dto, userId);
  }

  @Get()
  async findAll() {
    return this.requestService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.requestService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number, @Req() req: any) {
    const userId = req.user?.id;
    return this.requestService.remove(id, userId);
  }
}
