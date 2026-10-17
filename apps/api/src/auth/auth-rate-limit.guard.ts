import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AuthRequest } from './auth.guard';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number; until: number }>();

  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    for (const [ip, entry] of this.attempts) if (entry.until <= now) this.attempts.delete(ip);
    // Use the socket address, never an untrusted forwarding header.
    const ip = context.switchToHttp().getRequest<AuthRequest>().socket.remoteAddress ?? 'unknown';
    let entry = this.attempts.get(ip);
    if (!entry) {
      if (this.attempts.size >= 10000) throw new HttpException('Try again later', HttpStatus.TOO_MANY_REQUESTS);
      entry = { count: 0, until: now + 60000 };
      this.attempts.set(ip, entry);
    }
    if (++entry.count > 10) throw new HttpException('Too many authentication attempts; retry later', HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
