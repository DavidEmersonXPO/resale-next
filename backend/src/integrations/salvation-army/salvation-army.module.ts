import { Module } from '@nestjs/common';
import { SalvationArmyService } from './salvation-army.service';
import { SalvationArmyController } from './salvation-army.controller';
import { PurchasesModule } from '../../purchases/purchases.module';
import { EncryptionService } from '../../common/security/encryption.service';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { SalvationArmyHttpService } from './salvation-army-http.service';

@Module({
  imports: [PurchasesModule],
  providers: [SalvationArmyService, SalvationArmyCredentialService, SalvationArmyHttpService, EncryptionService],
  controllers: [SalvationArmyController],
})
export class SalvationArmyModule {}
