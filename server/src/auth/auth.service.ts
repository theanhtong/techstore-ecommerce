import * as bcrypt from 'bcrypt';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthResponse } from './interfaces/auth-response.interface.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { randomBytes, createHash } from 'crypto';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailService: MailService,
  ) { }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await this.prisma.user.deleteMany({
      where: {
        emailVerifiedAt: null,
        createdAt: { lt: threshold },
      },
    });

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.emailVerifiedAt) {
        throw new ConflictException('Email already exists');
      }
      const lastVerification = await this.prisma.emailVerification.findFirst({
        where: { userId: existing.id },
        orderBy: { createdAt: 'desc' },
      });

      if (lastVerification && Date.now() - lastVerification.createdAt.getTime() < 60 * 1000) {
        throw new BadRequestException('Vui lòng đợi ít nhất 60 giây giữa các lần đăng ký/gửi mã.');
      }

      const hashed = await bcrypt.hash(dto.password, 10);
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashed,
          name: dto.name,
        },
      });

      await this.prisma.emailVerification.deleteMany({
        where: { userId: existing.id },
      });

      const token = randomBytes(32).toString('hex');
      await this.prisma.emailVerification.create({
        data: {
          id: uuidv7(),
          userId: existing.id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });

      await this.mailService.sendVerificationEmail(existing.email, dto.name, token);

      return {
        message: 'Mã xác thực mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.',
      };
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        id: uuidv7(),
        email: dto.email,
        password: hashed,
        name: dto.name,
      },
    });

    const token = randomBytes(32).toString('hex');

    await this.prisma.emailVerification.create({
      data: {
        id: uuidv7(),
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    await this.mailService.sendVerificationEmail(user.email, user.name, token);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!record) throw new NotFoundException('Mã xác thực không hợp lệ hoặc đã hết hạn.');
    if (record.expiresAt < new Date())
      throw new BadRequestException('Mã xác thực đã hết hạn.');

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });

    try {
      await this.prisma.emailVerification.delete({ where: { token } });
    } catch (err: any) {
      if (err.code !== 'P2025') {
        throw err;
      }
    }

    return { message: 'Xác thực email thành công. Bạn đã có thể đăng nhập.' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Thực hành bảo mật: không tiết lộ sự tồn tại của email
    if (!user) {
      return { message: 'Nếu email tồn tại và chưa được xác thực, hệ thống đã gửi liên kết mới.' };
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email đã được xác thực trước đó.');
    }

    const lastVerification = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (lastVerification && Date.now() - lastVerification.createdAt.getTime() < 60 * 1000) {
      throw new BadRequestException('Vui lòng đợi ít nhất 60 giây giữa các lần yêu cầu gửi lại email.');
    }

    await this.prisma.emailVerification.deleteMany({
      where: { userId: user.id },
    });

    const token = randomBytes(32).toString('hex');
    await this.prisma.emailVerification.create({
      data: {
        id: uuidv7(),
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    await this.mailService.sendVerificationEmail(user.email, user.name, token);

    return { message: 'Mã xác thực mới đã được gửi tới email của bạn.' };
  }

  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    if (!user.emailVerifiedAt)
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );

    return this.generateTokens(user.id, user.email, user.role, ip, userAgent);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.jti },
    });
    if (!session) throw new UnauthorizedException('Session not found');

    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const valid = session.token === hash;
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.session.delete({ where: { id: session.id } });

    return this.generateTokens(payload.sub, payload.email, payload.role);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const sessionId = uuidv7();
    const payload: JwtPayload = { sub: userId, email, role };
    const rtPayload: JwtPayload = { ...payload, jti: sessionId };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(rtPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const hashedRt = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        token: hashedRt,
        ipAddress: ip,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
