import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AddressService } from './address.service.js';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('provinces')
  getProvinces() {
    return this.addressService.getProvinces();
  }

  @Get('districts')
  getDistricts(@Query('provinceId', ParseIntPipe) provinceId: number) {
    return this.addressService.getDistricts(provinceId);
  }

  @Get('wards')
  getWards(@Query('districtId', ParseIntPipe) districtId: number) {
    return this.addressService.getWards(districtId);
  }
}
