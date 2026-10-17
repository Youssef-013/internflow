import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export const AUTH_SECRET = Symbol('AUTH_SECRET');
export const TOKEN_LIFETIME_SECONDS = 900;
const ISSUER = 'internflow-api';
const AUDIENCE = 'internflow-web';

export function readAuthSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32 || /^(replace|change|your[-_])/i.test(secret)) {
    throw new Error('JWT_SECRET must be a private random value of at least 32 bytes');
  }
  return secret;
}

@Injectable()
export class TokenService {
  constructor(@Inject(AUTH_SECRET) private readonly secret: string) {}

  sign(userId: string): string {
    return jwt.sign({}, this.secret, {
      algorithm: 'HS256', subject: userId, issuer: ISSUER,
      audience: AUDIENCE, expiresIn: TOKEN_LIFETIME_SECONDS,
    });
  }

  verify(token: string): string {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, maxAge: TOKEN_LIFETIME_SECONDS,
      });
      if (typeof payload === 'string' || typeof payload.sub !== 'string' || !payload.sub ||
          typeof payload.exp !== 'number' || typeof payload.iat !== 'number' ||
          payload.exp - payload.iat > TOKEN_LIFETIME_SECONDS) throw new Error('Invalid claims');
      return payload.sub;
    } catch { throw new UnauthorizedException('Invalid or expired access token'); }
  }
}
