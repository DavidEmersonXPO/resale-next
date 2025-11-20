import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SalvationArmyService } from './salvation-army.service';
import { SalvationInvoiceDto } from './dto/salvation-invoice.dto';
import { SalvationArmyCredentialService } from './salvation-army-credential.service';
import {
  UpdateSalvationArmyCredentialDto,
  SalvationArmyCredentialResponseDto,
} from './dto/credential.dto';
import { SalvationArmySyncService } from './salvation-army-sync.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Integrations / Salvation Army')
@Controller('integrations/salvation-army')
export class SalvationArmyController {
  constructor(
    private readonly salvationArmyService: SalvationArmyService,
    private readonly credentialService: SalvationArmyCredentialService,
    private readonly syncService: SalvationArmySyncService,
    private readonly prisma: PrismaService,
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

  @Post('sync')
  triggerSync() {
    return this.syncService.sync();
  }

  @Get('sync/logs')
  listSyncLogs(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    const bounded = parsed && parsed > 0 ? Math.min(parsed, 100) : 20;
    return this.prisma.salvationArmySyncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: bounded,
    });
  }
}
