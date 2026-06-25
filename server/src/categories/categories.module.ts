import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { Module } from '@nestjs/common';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
