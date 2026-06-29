import { GhnAddressProvider } from './ghn.address-provider.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GhnSandboxAddressProvider extends GhnAddressProvider {
  protected readonly apiUrl =
    'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data';
}
