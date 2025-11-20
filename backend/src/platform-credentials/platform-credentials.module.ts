import { Module } from '@nestjs/common';
import { PlatformCredentialsService } from './platform-credentials.service';
import { PlatformCredentialsController } from './platform-credentials.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EncryptionService } from '../common/security/encryption.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformCredentialsController],
  providers: [PlatformCredentialsService, EncryptionService],
  exports: [PlatformCredentialsService],
})
export class PlatformCredentialsModule {}
