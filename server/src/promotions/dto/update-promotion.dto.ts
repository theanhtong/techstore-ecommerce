import { CreatePromotionDto } from './create-promotion.dto.js';
import { PartialType } from '@nestjs/mapped-types';

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
