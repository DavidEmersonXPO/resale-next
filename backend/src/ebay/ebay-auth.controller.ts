import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Logger,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { EbayAuthService } from './ebay-auth.service';
import { EbayStateService } from './ebay-state.service';

@Controller('ebay')
export class EbayAuthController {
  private readonly logger = new Logger(EbayAuthController.name);

  constructor(
    private readonly ebayAuthService: EbayAuthService,
    private readonly stateService: EbayStateService,
    private readonly configService: ConfigService,
  ) {}

  @Get('auth/url')
  getAuthorizationUrl() {
    const state = this.stateService.createState();
    const url = this.ebayAuthService.getAuthorizationUrl(state);
    return { url };
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const ebayConfig = this.configService.get('ebay');
    const successRedirect =
      ebayConfig?.successRedirect ??
      'http://localhost:5173/settings/platform-credentials?ebay_connected=true';
    const failureRedirect =
      ebayConfig?.failureRedirect ??
      'http://localhost:5173/settings/platform-credentials?ebay_error=connection_failed';

    if (error) {
      this.logger.warn(`eBay OAuth error: ${error}`);
      return res.redirect(failureRedirect);
    }

    if (!state || !this.stateService.validate(state)) {
      this.logger.warn('Invalid or missing OAuth state');
      return res.redirect(`${failureRedirect}`);
    }

    if (!code) {
      this.logger.warn('Missing authorization code from eBay');
      return res.redirect(`${failureRedirect}`);
    }

    try {
      await this.ebayAuthService.exchangeCodeForTokenAsync(code);
      return res.redirect(successRedirect);
    } catch (error: any) {
      this.logger.error('eBay OAuth callback failed', error);
      return res.redirect(failureRedirect);
    }
  }

  @Get('connection/status')
  async connectionStatus() {
    const credential = await this.ebayAuthService.getActiveCredentialAsync();
    if (!credential) {
      return {
        connected: false,
        message: 'No active eBay connection',
      };
    }

    const now = new Date();
    return {
      connected: true,
      tokenValid: credential.tokenExpiresAt > now,
      refreshTokenValid: credential.refreshTokenExpiresAt > now,
      tokenExpiresAt: credential.tokenExpiresAt,
      refreshTokenExpiresAt: credential.refreshTokenExpiresAt,
      environment: credential.environment,
      ebayUserId: credential.ebayUserId,
      connectedAt: credential.createdAt,
    };
  }

  @Post('connection/disconnect')
  @HttpCode(200)
  async disconnect() {
    await this.ebayAuthService.disconnectAsync();
    return { message: 'Disconnected' };
  }
}
