import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  validate(
    @CurrentUser() user: { id: string },
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponsService.validate(user.id, dto);
  }
}
