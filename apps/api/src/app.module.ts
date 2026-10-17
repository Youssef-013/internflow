import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { ApplicationsModule } from './applications/applications.module';

@Module({ imports: [DatabaseModule, AuthModule, ApplicationsModule], controllers: [HealthController] })
export class AppModule {}
