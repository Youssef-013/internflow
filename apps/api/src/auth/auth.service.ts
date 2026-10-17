import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CredentialsDto } from './credentials.dto';
import { PasswordService } from './password.service';
import { TokenService, TOKEN_LIFETIME_SECONDS } from './token.service';

const PUBLIC_USER = { id: true, email: true, createdAt: true } as const;
export interface AuthUser { id: string; email: string; createdAt: Date; }

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly passwords: PasswordService, private readonly tokens: TokenService) {}

  private session(user: AuthUser) {
    return { accessToken: this.tokens.sign(user.id), tokenType: 'Bearer', expiresIn: TOKEN_LIFETIME_SECONDS, user };
  }

  async register(credentials: CredentialsDto) {
    const passwordHash = await this.passwords.hash(credentials.password);
    try {
      const user = await this.prisma.user.create({
        data: { email: credentials.email, passwordHash }, select: PUBLIC_USER,
      });
      return this.session(user);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Account already exists');
      }
      throw error;
    }
  }

  async login(credentials: CredentialsDto) {
    const user = await this.prisma.user.findUnique({ where: { email: credentials.email } });
    const valid = await this.passwords.verify(credentials.password, user?.passwordHash ?? PasswordService.DUMMY_HASH);
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');
    return this.session({ id: user.id, email: user.email, createdAt: user.createdAt });
  }

  async getUser(id: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER });
    if (!user) throw new UnauthorizedException('Invalid or expired access token');
    return user;
  }
}
