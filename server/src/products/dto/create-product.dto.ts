import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { ProductStatus } from '../../generated/prisma/enums.js';

export class CreateProductDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(200)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus = ProductStatus.DRAFT;
}
