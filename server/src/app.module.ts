import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { BrandsModule } from './brands/brands.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [BrandsModule],
})
export class AppModule {}
