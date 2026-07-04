import { IsDecimal, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { DiscountType } from '../../generated/prisma/enums.js';

export class AddPromotionProductDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsDecimal({ decimal_digits: '0,2' })
  discountValue!: string;
}
