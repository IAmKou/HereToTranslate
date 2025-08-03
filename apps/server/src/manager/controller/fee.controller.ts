import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { FeeService } from '../service/fee-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { ForRoles } from '#LocalProject/Auth/decorators/for-role.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  @Patch('fee')
  @ForRoles(2, 1)
  async updateFee(@Body('fee') fee: number) {
    const updated = await this.feeService.setDefaultFee(fee);
    return { success: true, fee: updated.value };
  }
}
