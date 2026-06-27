import { CreateAddressDto } from './create-address.dto.js';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
