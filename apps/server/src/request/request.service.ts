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

  async getMyRegisteredRequests(uid: bigint) {
    console.log('🔍 getMyRegisteredRequests called with uid:', uid);

    // First, let's check if there are any registrations in the join table
    const rawQuery = `
      SELECT COUNT(*) as count
      FROM request_registrants
      WHERE user_id = ?
    `;
    const registrationCount = await this.requestRepo.query(rawQuery, [uid.toString()]);
    console.log('🔍 Registration count in join table:', registrationCount);

    // Now let's try a simpler approach first
    const requests = await this.requestRepo
      .createQueryBuilder('requests')
      .leftJoinAndSelect('requests.registrants', 'registrants')
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.category', 'category')
      .leftJoinAndSelect('requests.tags', 'tags')
      .getMany();

    console.log('🔍 All requests with registrants:', requests.map(r => ({
      id: r.id,
      title: r.title,
      registrantsCount: r.registrants?.length || 0,
      registrantIds: r.registrants?.map(reg => reg.id) || []
    })));

    // Filter requests where the user is a registrant
    const myRegisteredRequests = requests.filter(request =>
      request.registrants?.some(registrant => registrant.id.toString() === uid.toString())
    );

    console.log('🔍 My registered requests after filtering:', myRegisteredRequests.map(r => ({
      id: r.id,
      title: r.title
    })));

    return myRegisteredRequests;
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
