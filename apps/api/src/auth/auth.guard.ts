import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, AuthUser } from './auth.service';
import { TokenService } from './token.service';

const PUBLIC_ROUTE = 'internflow:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export interface AuthRequest {
  headers: { authorization?: string };
  socket: { remoteAddress?: string };
  user: AuthUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly tokens: TokenService, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    if (typeof header !== 'string' || header.length > 4096 || !/^Bearer [^\s]+$/i.test(header)) {
      throw new UnauthorizedException('Bearer access token required');
    }
    request.user = await this.auth.getUser(this.tokens.verify(header.slice(7)));
    return true;
  }
}
