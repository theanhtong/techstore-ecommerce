import { CreateCouponDto } from './create-coupon.dto.js';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}
