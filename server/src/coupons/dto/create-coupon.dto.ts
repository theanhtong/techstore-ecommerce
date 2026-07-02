import {
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { DiscountType } from '../../generated/prisma/enums.js';

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsUUID()
  promotionId?: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsDecimal({ decimal_digits: '0,2' })
  discountValue!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  minOrderValue?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  maxDiscount?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
