import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
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
        const storagePath = config.get<string>('media.storagePath') ?? './storage/media';
        return [
          {
            rootPath: join(process.cwd(), storagePath),
            serveRoot: '/media',
          },
        ];
      },
    }),
    PrismaModule,
    HealthModule,
    PurchasesModule,
    UsersModule,
    AuthModule,
    ListingsModule,
    IntegrationsModule,
    MediaModule,
    ListingTemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
