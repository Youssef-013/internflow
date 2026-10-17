import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

@Injectable()
export class PasswordService {
  static readonly DUMMY_HASH = `scrypt-v1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
  private active = 0;

  private async derive(password: string, salt: string): Promise<Buffer> {
    // Bound memory usage: each scrypt operation uses about 128 MiB.
    if (this.active >= 2) throw new ServiceUnavailableException('Authentication busy; retry shortly');
    this.active++;
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => {
          if (error) reject(error); else resolve(key);
        });
      });
    } finally { this.active--; }
  }

  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    return `scrypt-v1$${salt}$${(await this.derive(password, salt)).toString('hex')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const valid = /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored);
    const [, salt, hash] = (valid ? stored : PasswordService.DUMMY_HASH).split('$');
    const actual = await this.derive(password, salt);
    return timingSafeEqual(actual, Buffer.from(hash, 'hex')) && valid;
  }
}
