export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface IUploadProvider {
  upload(file: Express.Multer.File, folder?: string): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
}

export const UPLOAD_PROVIDER = 'UPLOAD_PROVIDER';
