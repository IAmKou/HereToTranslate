import { JwtAuthGuard } from "#LocalProject/Auth/guards/jwt.guard";
import type { AuthenticatedRequest } from "#LocalProject/Auth/types";
import { CreateRequestDto, ReviewRequestDto, UpdateRequestDto } from "#LocalProject/Dtos";
import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { RequestManagerService } from "../service/request-manager.service";

@Controller('requests')
export class RequestController {
  constructor(
    private readonly requests: RequestManagerService
  ) {}
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createRequest(@Body() body: CreateRequestDto, @Req() req: AuthenticatedRequest) {
    const { user } = req;
    return this.requests.createRequest(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('myRequests')
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    const { user } = req;
    return this.requests.getMyRequests(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  async updateRequest(@Param('id') requestId: string, @Body() body: UpdateRequestDto, @Req() req: AuthenticatedRequest) {
    const { user } = req;
    return this.requests.updateRequest(user.id, BigInt(requestId), body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/review')
  async reviewRequest(@Param('id') requestId: string, @Body() body: ReviewRequestDto, @Req() req: AuthenticatedRequest) {
    const { user } = req;
    return this.requests.reviewRequest(user.id, BigInt(requestId), body.status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancelRequest(@Param('id') requestId: string, @Req() req: AuthenticatedRequest) {
    const { user } = req;
    return this.requests.cancelRequest(user.id, BigInt(requestId));
  }
}
