import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GoodwillService } from './goodwill.service';
import { GoodwillManifestDto } from './dto/goodwill-manifest.dto';
import { GoodwillCredentialService } from './goodwill-credential.service';
import { UpdateGoodwillCredentialDto } from './dto/goodwill-credential.dto';
import { GoodwillSyncService } from './goodwill-sync.service';

@ApiTags('Integrations / Goodwill')
@Controller('integrations/goodwill')
export class GoodwillController {
  constructor(
    private readonly goodwillService: GoodwillService,
    private readonly credentialService: GoodwillCredentialService,
    private readonly syncService: GoodwillSyncService,
  ) {}

  @Post('manifests')
  importManifest(@Body() dto: GoodwillManifestDto) {
    return this.goodwillService.ingestManifest(dto);
  }

  @Get('credential')
  getCredential() {
    return this.credentialService.getCredential();
  }

  @Post('credential')
  upsertCredential(@Body() dto: UpdateGoodwillCredentialDto) {
    return this.credentialService.upsertCredential(dto);
  }

  @Post('sync')
  triggerSync() {
    return this.syncService.sync();
  }
}
