import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EbayPoliciesService } from './ebay-policies.service';
import { UpdateEbayDefaultsDto } from './dto/update-ebay-defaults.dto';

@ApiTags('eBay Policies')
@Controller('ebay/policies')
export class EbayPoliciesController {
  constructor(private readonly ebayPoliciesService: EbayPoliciesService) {}

  @Get()
  listPolicies() {
    return this.ebayPoliciesService.listPolicies();
  }

  @Post('refresh')
  refreshPolicies() {
    return this.ebayPoliciesService.refreshPolicies();
  }

  @Post('defaults')
  @HttpCode(200)
  updateDefaults(@Body() dto: UpdateEbayDefaultsDto) {
    return this.ebayPoliciesService.updateDefaults(dto);
  }

  @Get('refresh/logs')
  listRefreshLogs(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    const bounded = parsed && parsed > 0 ? Math.min(parsed, 100) : 20;
    return this.ebayPoliciesService.listRefreshLogs(bounded);
  }
}
