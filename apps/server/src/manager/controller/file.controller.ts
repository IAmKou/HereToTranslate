import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { fileService } from '#LocalProject/Managers/service/file-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FileController {
  constructor(private readonly fileService: fileService) {
  }


  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: {
    projectId: bigint,
    branchId: bigint
  }, @Req() req: AuthenticatedRequest) {
    return this.fileService.handleUpload(file, req.user.id, body.projectId, body.branchId);
  }
}
