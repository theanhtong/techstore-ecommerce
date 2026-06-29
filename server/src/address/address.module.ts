import { ADDRESS_PROVIDER } from './interfaces/address-provider.interface.js';
import { AddressController } from './address.controller.js';
import { AddressService } from './address.service.js';
import { GhnProductionAddressProvider } from './providers/ghn-production.address-provider.js';
import { GhnSandboxAddressProvider } from './providers/ghn-sandbox.address-provider.js';
import { Module } from '@nestjs/common';

@Module({
  controllers: [AddressController],
  providers: [
    AddressService,
    {
      provide: ADDRESS_PROVIDER,
      useFactory: () => {
        return process.env.ADDRESS_PROVIDER === 'ghn'
          ? new GhnProductionAddressProvider()
          : new GhnSandboxAddressProvider();
      },
    },
  ],
  exports: [AddressService],
})
export class AddressModule {}
