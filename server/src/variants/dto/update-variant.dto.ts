import { CreateVariantDto } from './create-variant.dto.js';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
