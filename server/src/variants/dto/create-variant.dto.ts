import {
  IsBoolean,
  IsDecimal,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MaxLength(100)
  sku!: string;

  @IsDecimal({ decimal_digits: '0,2' })
  price!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  weight?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  connectivity?: string;

  @IsOptional() @IsString() cpu?: string;
  @IsOptional() @IsString() ram?: string;
  @IsOptional() @IsString() storage?: string;
  @IsOptional() @IsString() display?: string;
  @IsOptional() @IsString() gpu?: string;
  @IsOptional() @IsString() os?: string;
  @IsOptional() @IsString() battery?: string;

  @IsOptional() @IsString() switchType?: string;
  @IsOptional() @IsString() layout?: string;
  @IsOptional() @IsString() formFactor?: string;

  @IsOptional() @IsInt() @Min(0) dpi?: number;
  @IsOptional() @IsInt() @Min(0) buttons?: number;
  @IsOptional() @IsString() sensor?: string;

  @IsOptional() @IsString() driverSize?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsBoolean() microphone?: boolean;

  @IsOptional()
  @IsObject()
  extras?: any;
}
