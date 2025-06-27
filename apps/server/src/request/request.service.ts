import { Injectable, UnauthorizedException, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { RequestEntity } from '../db/mysql/entity/request.entity';
import { CreateRequestDto, UpdateRequestDto, ReviewRequestDto, } from '../db/dto/request.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,
  ) {}

  async create(
    dto: CreateRequestDto,
    userId: number,
    file?: any | undefined,
  ): Promise<RequestEntity> {
    let fileUrl: string | undefined;

    if (file) {
      const uploadDir = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      fileUrl = `/uploads/${fileName}`;
    }

    const requestData: DeepPartial<RequestEntity> = {
      title: dto.title,
      description: dto.description,
      deal_amount: dto.dealAmount,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      file_url: fileUrl ?? dto.fileUrl,
      requester: { id: BigInt(userId) },
      project:
        dto.projectId !== undefined
          ? { id: BigInt(dto.projectId) }
          : undefined,
    };

    const request = this.requestRepo.create(requestData);
    return this.requestRepo.save(request);
  }

  async update(dto: UpdateRequestDto, userId: number): Promise<RequestEntity> {
    const request = await this.requestRepo.findOne({
      where: { id: BigInt(dto.id) },
      relations: ['requester'],
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.requester?.id !== BigInt(userId)) {
      throw new UnauthorizedException('You cannot edit this request');
    }

    Object.assign(request, {
      title: dto.title ?? request.title,
      description: dto.description ?? request.description,
      dealAmount: dto.dealAmount ?? request.deal_amount,
      deadline: dto.deadline ? new Date(dto.deadline) : request.deadline,
      fileUrl: dto.fileUrl ?? request.file_url,
    });

    return this.requestRepo.save(request);
  }

  async review(dto: ReviewRequestDto, Id: number): Promise<RequestEntity> {
    const request = await this.requestRepo.findOne({ where: { id: BigInt(dto.id) } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    request.status = dto.status;
    return this.requestRepo.save(request);
  }

  async findAll(): Promise<RequestEntity[]> {
    return this.requestRepo.find({ relations: ['project', 'requester'] });
  }

  async findOne(id: number): Promise<RequestEntity> {
    const request = await this.requestRepo.findOne({
      where: { id: BigInt(id) },
      relations: ['project', 'requester'],
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    return request;
  }

  async remove(id: number, userId: number): Promise<RequestEntity> {
    const request = await this.requestRepo.findOne({
      where: { id: BigInt(id)},
      relations: ['requester'],
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.requester?.id !== BigInt(userId)) {
      throw new UnauthorizedException('You cannot delete this request');
    }
    return this.requestRepo.remove(request);
  }
}
