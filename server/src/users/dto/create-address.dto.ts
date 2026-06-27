import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  addressLine!: string;

  @IsInt()
  provinceId!: number;

  @IsString()
  provinceName!: string;

  @IsInt()
  districtId!: number;

  @IsString()
  districtName!: string;

  @IsString()
  wardCode!: string;

  @IsString()
  wardName!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
