import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { OrderStatus } from '../../generated/prisma/enums.js';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
