import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SalvationArmyService } from './salvation-army.service';
import { SalvationInvoiceDto } from './dto/salvation-invoice.dto';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import { UpdateSalvationArmyCredentialDto, SalvationArmyCredentialResponseDto } from './dto/credential.dto';

@ApiTags('Integrations / Salvation Army')
@Controller('integrations/salvation-army')
export class SalvationArmyController {
  constructor(
    private readonly salvationArmyService: SalvationArmyService,
    private readonly credentialService: SalvationArmyCredentialService,
  ) {}

  @Post('invoices')
  importInvoice(@Body() dto: SalvationInvoiceDto) {
    return this.salvationArmyService.ingestInvoice(dto);
  }

  @Get('credential')
  getCredential(): Promise<SalvationArmyCredentialResponseDto> {
    return this.credentialService.get();
  }

  @Post('credential')
  upsertCredential(@Body() dto: UpdateSalvationArmyCredentialDto) {
    return this.credentialService.upsert(dto);
  }
}
