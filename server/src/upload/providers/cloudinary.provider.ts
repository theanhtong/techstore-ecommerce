import type {
  IUploadProvider,
  UploadResult,
} from '../interfaces/upload-provider.interface.js';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryProvider implements IUploadProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(
    file: Express.Multer.File,
    folder = 'ecommerce',
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              reject(
                new InternalServerErrorException(
                  `Cloudinary upload failed: ${error?.message}`,
                ),
              );
              return;
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
            });
          },
        )
        .end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
