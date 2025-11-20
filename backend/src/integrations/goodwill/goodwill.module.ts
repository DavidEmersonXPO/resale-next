import { Module } from '@nestjs/common';
import { GoodwillService } from './goodwill.service';
import { GoodwillController } from './goodwill.controller';
import { PurchasesModule } from '../../purchases/purchases.module';
import { GoodwillCredentialService } from './goodwill-credential.service';
import { GoodwillSyncService } from './goodwill-sync.service';
import { GoodwillHttpService } from './goodwill-http.service';
import { EncryptionService } from '../../common/security/encryption.service';
import { GoodwillSyncScheduler } from './goodwill-sync.scheduler';

@Module({
  imports: [PurchasesModule],
  providers: [
    GoodwillService,
    GoodwillCredentialService,
    GoodwillSyncService,
    GoodwillHttpService,
    EncryptionService,
    GoodwillSyncScheduler,
  ],
  controllers: [GoodwillController],
})
export class GoodwillModule {}
