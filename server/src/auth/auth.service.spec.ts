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
      deleteMany: jest.fn(),
    },
    emailVerification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((val: any) => {
      if (typeof val === 'function') {
        return val(mockPrismaService);
      }
      return Promise.all(val);
    }),
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

    it('should throw ConflictException if user exists and is already verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        emailVerifiedAt: new Date(),
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if existing user not verified but verification requested < 60s ago', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        emailVerifiedAt: null,
      });
      mockPrismaService.emailVerification.findFirst.mockResolvedValue({
        createdAt: new Date(),
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should re-request verification if user exists, not verified and last request > 60s ago', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        emailVerifiedAt: null,
      });
      mockPrismaService.emailVerification.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 70 * 1000),
      });
      mockHash.mockResolvedValue('hashed_password');
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.emailVerification.deleteMany.mockResolvedValue({});
      mockPrismaService.emailVerification.create.mockResolvedValue({});
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.emailVerification.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.emailVerification.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result.message).toContain('A new verification code has been sent');
    });

    it('should create user, verification token, and send email for new user on success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed_password');
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-v7-id',
        ...registerDto,
      });
      mockPrismaService.emailVerification.create.mockResolvedValue({});
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.emailVerification.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result.message).toContain('Registration successful');
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

    it('should ignore P2025 errors on token deletion', async () => {
      mockPrismaService.emailVerification.findUnique.mockResolvedValue({
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.emailVerification.delete.mockRejectedValue({
        code: 'P2025',
      });

      const result = await service.verifyEmail('valid-token');
      expect(result.message).toContain('Email verified successfully');
    });

    it('should propagate other errors on token deletion', async () => {
      mockPrismaService.emailVerification.findUnique.mockResolvedValue({
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.emailVerification.delete.mockRejectedValue(
        new Error('Db connection error'),
      );

      await expect(service.verifyEmail('valid-token')).rejects.toThrow(
        'Db connection error',
      );
    });
  });

  describe('resendVerification', () => {
    const email = 'test@example.com';

    it('should return security message if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerification(email);
      expect(result.message).toContain('a new link has been sent');
    });

    it('should throw BadRequestException if user is already verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        emailVerifiedAt: new Date(),
      });

      await expect(service.resendVerification(email)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if last verification requested < 60s ago', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        emailVerifiedAt: null,
      });
      mockPrismaService.emailVerification.findFirst.mockResolvedValue({
        createdAt: new Date(),
      });

      await expect(service.resendVerification(email)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should recreate verification token and send verification email on success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        emailVerifiedAt: null,
      });
      mockPrismaService.emailVerification.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 70000),
      });
      mockPrismaService.emailVerification.deleteMany.mockResolvedValue({});
      mockPrismaService.emailVerification.create.mockResolvedValue({});
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.resendVerification(email);

      expect(mockPrismaService.emailVerification.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.emailVerification.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result.message).toContain('A new verification link has been sent');
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

    it('should throw UnauthorizedException if user has no password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        password: null,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on invalid password match', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        password: 'hashed_password',
      });
      mockCompare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user account is disabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        password: 'hashed_password',
        isActive: false,
      });
      mockCompare.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user has not verified email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        password: 'hashed_password',
        isActive: true,
        emailVerifiedAt: null,
      });
      mockCompare.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return access and refresh tokens and save session on valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'CUSTOMER',
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
      role: 'CUSTOMER',
    };

    it('should throw UnauthorizedException if token verification fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Jwt error');
      });

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token jti is missing', async () => {
      mockJwtService.verify.mockReturnValue({ ...mockPayload });

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if session is not found', async () => {
      mockJwtService.verify.mockReturnValue({ ...mockPayload, jti: 'sess-1' });
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token does not match hashed session token', async () => {
      mockJwtService.verify.mockReturnValue({ ...mockPayload, jti: 'sess-1' });
      mockPrismaService.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        token: 'hashed-old-rt',
      });

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if session has already been refreshed (concurrent delete throws P2025)', async () => {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update(token).digest('hex');

      mockJwtService.verify.mockReturnValue({ ...mockPayload, jti: 'sess-1' });
      mockPrismaService.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        token: hash,
      });
      mockPrismaService.session.delete.mockRejectedValue({
        code: 'P2025',
      });

      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete old session and generate new tokens upon successful refresh', async () => {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update(token).digest('hex');

      mockJwtService.verify.mockReturnValue({ ...mockPayload, jti: 'sess-1' });
      mockPrismaService.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        token: hash,
      });
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
