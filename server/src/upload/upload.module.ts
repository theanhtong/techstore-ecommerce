import { Global, Module } from '@nestjs/common';

import { CloudinaryProvider } from './providers/cloudinary.provider.js';
import { UPLOAD_PROVIDER } from './interfaces/upload-provider.interface.js';
import { UploadService } from './upload.service.js';

@Global()
@Module({
  providers: [
    UploadService,
    {
      provide: UPLOAD_PROVIDER,
      useClass: CloudinaryProvider,
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
