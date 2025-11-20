import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    const registry = this.metrics.getRegistry();
    const content = await registry.metrics();
    res.setHeader('Content-Type', registry.contentType);
    res.send(content);
  }
}
