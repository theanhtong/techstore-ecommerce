import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
