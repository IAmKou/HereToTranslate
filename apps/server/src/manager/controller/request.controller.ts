import { JwtAuthGuard } from "#LocalProject/Auth/guards/jwt.guard";
import type { AuthenticatedRequest } from "#LocalProject/Auth/types";
import { CreateRequestDto, ReviewRequestDto, UpdateRequestDto } from "#LocalProject/Dtos";
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
    const { user } = req;
    return this.requests.createRequest(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('myRequests')
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.requests.getMyRequests(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  async updateRequest(
    @Param('id', BigIntTransformPipe) requestId: bigint,
    @Body(ValidationPipe) body: UpdateRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.updateRequest(req.user.id, requestId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/review')
  async reviewRequest(
    @Param('id', BigIntTransformPipe) requestId: bigint,
    @Body(ValidationPipe) body: ReviewRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.reviewRequest(req.user.id, requestId, body.status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancelRequest(
    @Param('id', BigIntTransformPipe) requestId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.requests.cancelRequest(req.user.id, requestId);
  }
}
