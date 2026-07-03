import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockHash = jest.fn<() => Promise<string>>();
const mockCompare = jest.fn<() => Promise<boolean>>();

jest.unstable_mockModule('bcrypt', () => ({
  __esModule: true,
  hash: mockHash,
  compare: mockCompare,
}));

const { AuthService } = await import('./auth.service.js');
const { JwtService } = await import('@nestjs/jwt');
const { MailService } = await import('../mail/mail.service.js');
const { PrismaService } = await import('../prisma/prisma.service.js');

describe('AuthService', () => {
  let service: any;

  const mockPrismaService: Record<string, any> = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    emailVerification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService: Record<string, any> = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockMailService: Record<string, any> = {
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<any>(AuthService);

    jest.clearAllMocks();

    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create user, verification token, and send email on success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed_password');
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-v7-id',
        ...registerDto,
      });
      mockPrismaService.emailVerification.create.mockResolvedValue({});
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.emailVerification.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result).toEqual({
        message:
          'Registration successful. Please check your email to verify your account.',
      });
    });
  });

  describe('verifyEmail', () => {
    it('should throw NotFoundException if token is invalid', async () => {
      mockPrismaService.emailVerification.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if token has expired', async () => {
      mockPrismaService.emailVerification.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update user and delete token on successful verification', async () => {
      mockPrismaService.emailVerification.findUnique.mockResolvedValue({
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.emailVerification.delete.mockResolvedValue({});

      const result = await service.verifyEmail('valid-token');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-id' } }),
      );
      expect(mockPrismaService.emailVerification.delete).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
      });
      expect(result.message).toContain('Email verified successfully');
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        password: 'hashed_password',
      });
      mockCompare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return access and refresh tokens on valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'USER',
        password: 'hashed_password',
        isActive: true,
        emailVerifiedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});

      const result = await service.login(loginDto, '127.0.0.1', 'Mozilla');

      expect(mockPrismaService.session.create).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });
  });

  describe('refresh', () => {
    const token = 'valid-refresh-token';
    const mockPayload = {
      sub: 'user-id',
      email: 'test@example.com',
      role: 'USER',
    };

    it('should throw UnauthorizedException if token verification fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Jwt error');
      });

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if session is not found', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.session.findFirst.mockResolvedValue(null);

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token does not match hashed session token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.session.findFirst.mockResolvedValue({
        id: 'sess-1',
        token: 'hashed-old-rt',
      });
      mockCompare.mockResolvedValue(false);

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete old session and generate new tokens upon successful refresh', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.session.findFirst.mockResolvedValue({
        id: 'sess-1',
        token: 'hashed-rt',
      });
      mockCompare.mockResolvedValue(true);
      mockPrismaService.session.delete.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('new-mock-token');
      mockPrismaService.session.create.mockResolvedValue({});

      const result = await service.refresh(token);

      expect(mockPrismaService.session.delete).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
      });
      expect(mockPrismaService.session.create).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'new-mock-token',
        refreshToken: 'new-mock-token',
      });
    });
  });

  describe('logout', () => {
    it('should delete all active sessions belonging to the user', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({
        count: 1,
      });

      await service.logout('user-id');

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
    });
  });
});
