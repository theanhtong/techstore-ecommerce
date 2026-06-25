import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
