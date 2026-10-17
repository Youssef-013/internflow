import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { AUTH_SECRET, readAuthSecret, TokenService } from './token.service';

@Module({
  imports: [DatabaseModule], controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, AuthRateLimitGuard,
    { provide: AUTH_SECRET, useFactory: readAuthSecret },
    { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
