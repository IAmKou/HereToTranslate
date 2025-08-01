import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { JwtFallthroughGuard } from '#LocalProject/Auth/guards/jwt-fallthrough.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req, UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { RequestManagerService } from '../service/request-manager.service';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators/is-public-endpoint.decorator';

@Controller('requests')
@UseInterceptors(JsonSerializerInterceptor)
export class RequestController {
  constructor(
    private readonly requests: RequestManagerService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  @UseInterceptors(FilesInterceptor('files'))
  async createRequest(
    @Body(ValidationPipe) body: CreateRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.createRequest(body, req.user.id, files);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create/private')
  @UseInterceptors(FilesInterceptor('files'))
  async createPrivateRequest(
    @Body(ValidationPipe) body: CreateRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.createPrivateRequest(body, req.user.id, files);
  }

  @UseGuards(JwtAuthGuard)
  @Get('myRequests')
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.requests.getMyRequests(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @IsPublicEndpoint()
  @Get('all')
  async getAllRequests(@Req() req?: AuthenticatedRequest) {
    // If user is authenticated, pass their ID, otherwise pass a special value (0)
    // that won't match any real user ID
    const userId = req?.user?.id ? BigInt(req.user.id) : BigInt(0);
    console.log('🔍 getAllRequests - req.user:', req?.user);
    console.log('🔍 getAllRequests - userId:', userId);
    return this.requests.fetchRequests(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  async getAllPrivateRequests(@Req() req: AuthenticatedRequest) {
    return this.requests.fetchPrivateRequests(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pending/count')
  async getPendingRequestsCount(@Req() req: AuthenticatedRequest) {
    const count = await this.requests.getPendingRequestsCount();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':requestId/update')
  async updateRequest(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @Body(ValidationPipe) body: UpdateRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.updateRequest(req.user.id, requestId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':requestId/cancel')
  async cancelRequest(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.cancelRequest(req.user.id, requestId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':requestId/register')
  async registerRequest(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.registerForPublicRequest(
      requestId,
      Number(req.user.id)
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':requestId/registrants')
  async getRegistrants(
    @Param('requestId', BigIntTransformPipe) requestId: bigint
  ) {
    return this.requests.getRequestRegistrants(requestId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':requestId/approve/:userId')
  async approveRegistrant(
    @Param('requestId', BigIntTransformPipe) requestId: number,
    @Param('userId', BigIntTransformPipe) userId: number
  ) {
    return this.requests.approveRegistrant(requestId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchUsers(
    @Query('keyword') keyword: string,
    @Req() req: AuthenticatedRequest
  ) {
    const uid = req.user.id;
    return this.requests.searchUsers(keyword, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':requestId/detail')
  async getDetail(
    @Param('requestId', BigIntTransformPipe) requestId: number,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.fetchRequestDetails(
      BigInt(requestId),
      BigInt(req.user.id)
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':requestId/private')
  async acceptPrivateRequest(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.acceptPrivateRequest(requestId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':requestId/decline')
  async declinePrivateRequest(
    @Param('requestId', BigIntTransformPipe) requestId: bigint) {
    return this.requests.declinePrivateRequest(requestId);
  }

}
