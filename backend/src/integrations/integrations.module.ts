import { Module } from '@nestjs/common';
import { GoodwillModule } from './goodwill/goodwill.module';
import { SalvationArmyModule } from './salvation-army/salvation-army.module';

@Module({
  imports: [GoodwillModule, SalvationArmyModule]
})
export class IntegrationsModule {}
