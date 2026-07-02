import { Inject, Injectable } from '@nestjs/common';
import {
  type IUploadProvider,
  UPLOAD_PROVIDER,
} from './interfaces/upload-provider.interface.js';

@Injectable()
export class UploadService {
  constructor(
    @Inject(UPLOAD_PROVIDER) private readonly provider: IUploadProvider,
  ) {}

  upload(file: Express.Multer.File, folder?: string) {
    return this.provider.upload(file, folder);
  }

  delete(publicId: string) {
    return this.provider.delete(publicId);
  }
}
