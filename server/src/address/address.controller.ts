import { Controller, Get, Post, Body, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AddressService } from './address.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { IsNotEmpty, IsString } from 'class-validator';

class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('provinces')
  getProvinces() {
    return this.addressService.getProvinces();
  }

  @Get('districts')
  getDistricts(@Query('provinceId', ParseIntPipe) provinceId: number) {
    return this.addressService.getDistricts(provinceId);
  }

  @Get('wards')
  getWards(@Query('districtId', ParseIntPipe) districtId: number) {
    return this.addressService.getWards(districtId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('otp/send')
  async sendOtp(
    @CurrentUser() user: { email: string },
    @Body() dto: SendOtpDto,
  ) {
    await this.addressService.sendOtp(dto.phone, user.email);
    return { message: 'Mã OTP đã được gửi thành công.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.addressService.verifyOtp(dto.phone, dto.code);
    return { message: 'Xác thực số điện thoại thành công.' };
  }
}
