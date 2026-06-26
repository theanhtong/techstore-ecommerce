import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateVariantDto } from '../variants/dto/create-variant.dto.js';
import { UpdateVariantDto } from '../variants/dto/update-variant.dto.js';
import { CreateImageDto } from '../images/dto/create-image.dto.js';
import { UpdateInventoryDto } from '../inventories/dto/update-inventory.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  @Post(':id/variants')
  createVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(id, dto);
  }

  @Patch(':id/variants/:vid')
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(id, vid, dto);
  }

  @Delete(':id/variants/:vid')
  removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
  ) {
    return this.productsService.removeVariant(id, vid);
  }

  @Post(':id/variants/:vid/images')
  createImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: CreateImageDto,
  ) {
    return this.productsService.createImage(id, vid, dto);
  }

  @Delete(':id/variants/:vid/images/:iid')
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Param('iid', ParseUUIDPipe) iid: string,
  ) {
    return this.productsService.removeImage(id, vid, iid);
  }

  @Patch(':id/variants/:vid/inventory')
  updateInventory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.productsService.updateInventory(id, vid, dto);
  }
}
