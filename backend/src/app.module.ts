import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { PurchasesModule } from './purchases/purchases.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ListingsModule } from './listings/listings.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MediaModule } from './media/media.module';
import { ListingTemplatesModule } from './listing-templates/listing-templates.module';
import { PlatformCredentialsModule } from './platform-credentials/platform-credentials.module';
import { EbayModule } from './ebay/ebay.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const storagePath =
          config.get<string>('media.storagePath') ?? './storage/media';
        return [
          {
            rootPath: join(process.cwd(), storagePath),
            serveRoot: '/media',
          },
        ];
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redis = config.get<{
          url: string | null;
          host: string;
          port: number;
          username?: string;
          password?: string;
          tls?: boolean;
        }>('queue.redis');
        const prefix = config.get<string>('queue.prefix') ?? 'resale';
        if (redis?.url) {
          return {
            connection: { url: redis.url },
            prefix,
          };
        }
        return {
          connection: {
            host: redis?.host ?? '127.0.0.1',
            port: redis?.port ?? 6379,
            username: redis?.username,
            password: redis?.password,
            tls: redis?.tls ? {} : undefined,
          },
          prefix,
        };
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    PurchasesModule,
    UsersModule,
    AuthModule,
    ListingsModule,
    IntegrationsModule,
    MediaModule,
    ListingTemplatesModule,
    PlatformCredentialsModule,
    EbayModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
