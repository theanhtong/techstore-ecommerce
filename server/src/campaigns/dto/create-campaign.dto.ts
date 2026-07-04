import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
