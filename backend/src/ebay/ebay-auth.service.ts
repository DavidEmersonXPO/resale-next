import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import axios from 'axios';

interface EbayIntegrationConfig {
  environment: 'Sandbox' | 'Production' | string;
  scopes: string[];
  successRedirect: string;
  failureRedirect: string;
  sandbox: EbayEnvironmentSettings;
  production: EbayEnvironmentSettings;
}

interface EbayEnvironmentSettings {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

interface EbayTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  ebay_user_id?: string;
  ebay_user_email?: string;
}

@Injectable()
export class EbayAuthService {
  private readonly logger = new Logger(EbayAuthService.name);
  private readonly config: EbayIntegrationConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.config = this.configService.get<EbayIntegrationConfig>('ebay', {
      environment: 'Sandbox',
      scopes: [],
      successRedirect:
        'http://localhost:5173/settings/platform-credentials?ebay_connected=true',
      failureRedirect:
        'http://localhost:5173/settings/platform-credentials?ebay_error=connection_failed',
      sandbox: {
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        authUrl: 'https://auth.sandbox.ebay.com/oauth2/authorize',
        tokenUrl: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
        apiBaseUrl: 'https://api.sandbox.ebay.com',
      },
      production: {
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        authUrl: 'https://auth.ebay.com/oauth2/authorize',
        tokenUrl: 'https://api.ebay.com/identity/v1/oauth2/token',
        apiBaseUrl: 'https://api.ebay.com',
      },
    });
  }

  getAuthorizationUrl(state: string) {
    const env = this.activeEnvironment;
    if (!env.clientId || !env.redirectUri) {
      throw new Error(
        'eBay OAuth is not configured. Provide client ID and redirect URI.',
      );
    }

    const query = new URLSearchParams({
      client_id: env.clientId,
      response_type: 'code',
      redirect_uri: env.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });

    return `${env.authUrl}?${query.toString()}`;
  }

  async exchangeCodeForTokenAsync(code: string) {
    const env = this.activeEnvironment;
    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.redirectUri,
    });

    const authHeader = Buffer.from(
      `${env.clientId}:${env.clientSecret}`,
    ).toString('base64');
    const startTime = Date.now();
    let responseData: string | undefined;

    try {
      const response = await axios.post(env.tokenUrl, requestBody.toString(), {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      responseData = JSON.stringify(response.data);
      const duration = Date.now() - startTime;

      await this.logSync({
        entityType: 'Token',
        action: 'ExchangeCode',
        status:
          response.status >= 200 && response.status < 300
            ? 'Success'
            : 'Failed',
        requestUrl: env.tokenUrl,
        requestMethod: 'POST',
        requestData: requestBody.toString(),
        responseCode: response.status,
        responseData,
        durationMs: duration,
      });

      const payload = response.data as EbayTokenResponse;
      await this.deactivateExistingCredentials();

      const credential = await this.prisma.ebayCredential.create({
        data: {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          tokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000),
          refreshTokenExpiresAt: new Date(
            Date.now() + payload.refresh_token_expires_in * 1000,
          ),
          ebayUserId: payload.ebay_user_id,
          ebayUserEmail: payload.ebay_user_email,
          environment: this.config.environment,
          isActive: true,
        },
      });

      this.logger.log('Exchanged eBay authorization code for tokens');
      return credential;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await this.logSync({
        entityType: 'Token',
        action: 'ExchangeCode',
        status: 'Failed',
        requestUrl: env.tokenUrl,
        requestMethod: 'POST',
        requestData: requestBody.toString(),
        responseCode: error?.response?.status,
        responseData,
        errorMessage: error?.message,
        durationMs: duration,
      });
      this.logger.error('Failed to exchange eBay authorization code', error);
      throw error;
    }
  }

  async getActiveCredentialAsync() {
    return this.prisma.ebayCredential.findFirst({
      where: {
        isActive: true,
        environment: this.config.environment,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getValidAccessTokenAsync() {
    const credential = await this.getActiveCredentialAsync();
    if (!credential) {
      throw new Error('No active eBay credential found');
    }

    if (credential.tokenExpiresAt <= new Date(Date.now() + 5 * 60 * 1000)) {
      await this.refreshTokenAsync(credential);
      return this.getValidAccessTokenAsync();
    }

    return credential.accessToken;
  }

  async refreshTokenAsync(
    credential: Awaited<
      ReturnType<EbayAuthService['getActiveCredentialAsync']>
    >,
  ) {
    if (!credential) {
      throw new Error('No eBay credential available for refresh');
    }
    if (credential.refreshTokenExpiresAt <= new Date()) {
      await this.prisma.ebayCredential.update({
        where: { id: credential.id },
        data: { isActive: false },
      });
      throw new Error(
        'Refresh token expired. Please reconnect your eBay account.',
      );
    }

    const env = this.activeEnvironment;
    const requestBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credential.refreshToken,
      scope: this.config.scopes.join(' '),
    });
    const authHeader = Buffer.from(
      `${env.clientId}:${env.clientSecret}`,
    ).toString('base64');
    const startTime = Date.now();

    try {
      const response = await axios.post(env.tokenUrl, requestBody.toString(), {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const payload = response.data as EbayTokenResponse;
      await this.logSync({
        entityType: 'Token',
        action: 'RefreshToken',
        status:
          response.status >= 200 && response.status < 300
            ? 'Success'
            : 'Failed',
        requestUrl: env.tokenUrl,
        requestMethod: 'POST',
        requestData: requestBody.toString(),
        responseCode: response.status,
        responseData: JSON.stringify(response.data),
        durationMs: Date.now() - startTime,
      });

      await this.prisma.ebayCredential.update({
        where: { id: credential.id },
        data: {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          tokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000),
          refreshTokenExpiresAt: new Date(
            Date.now() + payload.refresh_token_expires_in * 1000,
          ),
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      await this.logSync({
        entityType: 'Token',
        action: 'RefreshToken',
        status: 'Failed',
        requestUrl: env.tokenUrl,
        requestMethod: 'POST',
        requestData: requestBody.toString(),
        responseCode: error?.response?.status,
        responseData: error?.response
          ? JSON.stringify(error.response.data)
          : undefined,
        errorMessage: error?.message,
        durationMs: Date.now() - startTime,
      });
      this.logger.error('Failed to refresh eBay token', error);
      throw error;
    }
  }

  async disconnectAsync() {
    await this.prisma.ebayCredential.updateMany({
      where: { isActive: true },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  private async deactivateExistingCredentials() {
    await this.prisma.ebayCredential.updateMany({
      where: { isActive: true },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  private async logSync(payload: {
    entityType: string;
    entityId?: string | number | null;
    action: string;
    status: string;
    requestUrl?: string | null;
    requestMethod?: string | null;
    requestData?: string | null;
    responseCode?: number | null;
    responseData?: string | null;
    errorMessage?: string | null;
    durationMs?: number;
  }) {
    await this.prisma.ebaySyncLog.create({
      data: {
        entityType: payload.entityType,
        entityId: payload.entityId ? String(payload.entityId) : null,
        action: payload.action,
        status: payload.status,
        requestUrl: payload.requestUrl,
        requestMethod: payload.requestMethod,
        requestData: payload.requestData,
        responseCode: payload.responseCode,
        responseData: payload.responseData,
        errorMessage: payload.errorMessage,
        durationMs: payload.durationMs,
      },
    });
  }

  private get activeEnvironment(): EbayEnvironmentSettings {
    return this.config.environment === 'Production'
      ? this.config.production
      : this.config.sandbox;
  }
}
