import { GhnAddressProvider } from './ghn.address-provider.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GhnProductionAddressProvider extends GhnAddressProvider {
  protected readonly apiUrl =
    'https://online-gateway.ghn.vn/shiip/public-api/master-data';
}
