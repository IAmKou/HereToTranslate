import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { RequestManagerService } from '../service/request-manager.service';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { PaypalService } from '#LocalProject/Managers/service/payment-manager.service';

@Controller('requests')
@UseInterceptors(JsonSerializerInterceptor)
export class RequestController {
  constructor(
    private readonly requests: RequestManagerService,
    private readonly paymentService: PaypalService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createRequest(
    @Body(ValidationPipe) body: CreateRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.createRequest(body, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('myRequests')
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.requests.getMyRequests(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllRequests(@Req() req: AuthenticatedRequest) {
    return this.requests.fetchRequests(BigInt(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  async getAllPrivateRequests(@Req() req: AuthenticatedRequest) {
    return this.requests.fetchPrivateRequests(req.user.id);
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
    return this.paymentService.acceptPrivateRequest(requestId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':requesterId/decline')
  async declinePrivateRequest(
    @Param('requestId', BigIntTransformPipe) requestId: bigint) {
    return this.requests.declinePrivateRequest(requestId);
  }

}
