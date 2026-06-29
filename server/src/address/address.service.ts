import { Inject, Injectable } from '@nestjs/common';
import {
  type IAddressProvider,
  ADDRESS_PROVIDER,
} from './interfaces/address-provider.interface.js';

@Injectable()
export class AddressService {
  constructor(
    @Inject(ADDRESS_PROVIDER) private readonly provider: IAddressProvider,
  ) {}

  getProvinces() {
    return this.provider.getProvinces();
  }

  getDistricts(provinceId: number) {
    return this.provider.getDistricts(provinceId);
  }

  getWards(districtId: number) {
    return this.provider.getWards(districtId);
  }
}
