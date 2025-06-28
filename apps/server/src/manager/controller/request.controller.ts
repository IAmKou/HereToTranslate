import { JwtAuthGuard } from "#LocalProject/Auth/guards/jwt.guard";
import type { AuthenticatedRequest } from "#LocalProject/Auth/types";
import { CreateRequestDto, UpdateRequestDto } from "#LocalProject/Dtos";
import { Body, Controller, Get, Param, Post, Req, UseGuards, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { RequestManagerService } from "../service/request-manager.service";
import { BigIntTransformPipe } from "#LocalProject/Utils/pipes/bigint-transform.pipe";
import { JsonSerializerInterceptor } from "#LocalProject/Utils/json-serializer.interceptor";

@Controller('requests')
@UseInterceptors(JsonSerializerInterceptor)
export class RequestController {
  constructor(
    private readonly requests: RequestManagerService
  ) {}


  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createRequest(
    @Body(ValidationPipe) body: CreateRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.createRequest(body,req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('myRequests')
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.requests.getMyRequests(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllRequests() {
    return this.requests.fetchRequests();
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  async getAllPrivateRequests() {
    return this.requests.fetchPrivateRequests();
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

  // @UseGuards(JwtAuthGuard)
  // @Post(':requestId/review')
  // async reviewRequest(
  //   @Param('requestId', BigIntTransformPipe) requestId: bigint,
  //   @Param('projectId', BigIntTransformPipe) projectId: bigint,
  //   @Body(ValidationPipe) body: ReviewRequestDto,
  //   @Req() req: AuthenticatedRequest
  // ) {
  //   return this.requests.reviewRequest(req.user.id, projectId, requestId, body.status);
  // }

  @UseGuards(JwtAuthGuard)
  @Post(':requestId/cancel')
  async cancelRequest(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.cancelRequest(req.user.id, requestId);
  }
}
