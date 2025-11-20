import { Module } from '@nestjs/common';
import { SalvationArmyService } from './salvation-army.service';
import { SalvationArmyController } from './salvation-army.controller';
import { PurchasesModule } from '../../purchases/purchases.module';
import { EncryptionService } from '../../common/security/encryption.service';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { SalvationArmyHttpService } from './salvation-army-http.service';
import { SalvationArmySyncService } from './salvation-army-sync.service';
import { SalvationArmySyncScheduler } from './salvation-army-sync.scheduler';
import { InvoiceHtmlParserService } from './invoice-html-parser.service';

@Module({
  imports: [PurchasesModule],
  providers: [
    SalvationArmyService,
    SalvationArmyCredentialService,
    SalvationArmyHttpService,
    SalvationArmySyncService,
    SalvationArmySyncScheduler,
    InvoiceHtmlParserService,
    EncryptionService,
  ],
  controllers: [SalvationArmyController],
})
export class SalvationArmyModule {}
