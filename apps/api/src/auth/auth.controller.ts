import { Body, Controller, Get, Header, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRequest, Public } from './auth.guard';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { CredentialsDto } from './credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  @Header('Cache-Control', 'no-store')
  register(@Body() credentials: CredentialsDto) { return this.auth.register(credentials); }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() credentials: CredentialsDto) { return this.auth.login(credentials); }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AuthRequest) { return request.user; }
}
