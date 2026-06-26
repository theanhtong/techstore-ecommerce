import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateImageDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsInt()
  order?: number = 0;
}
