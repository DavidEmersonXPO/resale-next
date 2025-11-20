import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { load } from 'cheerio';
import {
  GoodwillCsvParser,
  GoodwillOrderRecord,
  GoodwillOrderStatus,
} from './goodwill-csv.parser';
import { encryptToUrlSafeBase64 } from './shopgoodwill-crypto';
import {
  GoodwillAuthError,
  GoodwillConfigurationError,
  GoodwillDownloadError,
} from './errors';

export interface GoodwillOptions {
  baseUrl: string;
  buyerApiBaseUrl: string;
  loginPagePath?: string;
  loginPath: string;
  loginMethod: string;
  loginContentType: string;
  loginAppVersion?: string;
  loginUserAgent?: string;
  loginRememberMe?: boolean;
  loginEncryptionKey?: string;
  usernameField: string;
  passwordField: string;
  loginAdditionalFields: Record<string, unknown>;
  loginHeaders: Record<string, string>;
  openOrdersCsvPath?: string;
  shippedOrdersCsvPath?: string;
  requestTimeoutSeconds: number;
  maxRetries: number;
}

@Injectable()
export class GoodwillHttpService {
  private readonly logger = new Logger(GoodwillHttpService.name);
  private readonly parser = new GoodwillCsvParser();
  private readonly options: GoodwillOptions;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get('integrations.goodwill') ?? {};
    this.options = {
      baseUrl: config.baseUrl,
      buyerApiBaseUrl: config.buyerApiBaseUrl ?? config.baseUrl,
      loginPagePath: config.loginPagePath,
      loginPath: config.loginPath ?? '/api/SignIn/Login',
      loginMethod: config.loginMethod ?? 'POST',
      loginContentType: config.loginContentType ?? 'application/json',
      loginAppVersion: config.loginAppVersion,
      loginUserAgent: config.loginUserAgent,
      loginRememberMe: config.loginRememberMe ?? false,
      loginEncryptionKey: config.loginEncryptionKey,
      usernameField: config.usernameField ?? 'userName',
      passwordField: config.passwordField ?? 'password',
      loginAdditionalFields: config.loginAdditionalFields ?? {},
      loginHeaders: config.loginHeaders ?? {},
      openOrdersCsvPath: config.openOrdersCsvPath,
      shippedOrdersCsvPath: config.shippedOrdersCsvPath,
      requestTimeoutSeconds: config.requestTimeoutSeconds ?? 60,
      maxRetries: config.requestMaxRetries ?? 3,
    };
  }

  async fetchRemoteOrders(
    username: string,
    password: string,
  ): Promise<GoodwillOrderRecord[]> {
    if (!this.options.openOrdersCsvPath && !this.options.shippedOrdersCsvPath) {
      throw new GoodwillConfigurationError(
        'Goodwill CSV paths are not configured.',
      );
    }

    const client = await this.createAuthenticatedClient(username, password);

    try {
      const records: GoodwillOrderRecord[] = [];
      if (this.options.openOrdersCsvPath) {
        const csv = await this.executeWithRetry(
          () => this.downloadCsv(client, this.options.openOrdersCsvPath!),
          'open orders CSV',
        );
        records.push(...this.parser.parse(csv, GoodwillOrderStatus.OPEN));
      }
      if (this.options.shippedOrdersCsvPath) {
        const csv = await this.executeWithRetry(
          () => this.downloadCsv(client, this.options.shippedOrdersCsvPath!),
          'shipped orders CSV',
        );
        records.push(...this.parser.parse(csv, GoodwillOrderStatus.SHIPPED));
      }
      return records;
    } catch (error) {
      throw new GoodwillDownloadError(
        error instanceof Error ? error.message : 'Unknown download failure',
      );
    } finally {
      client.defaults.headers.common.Authorization = undefined;
    }
  }

  private async createAuthenticatedClient(
    username: string,
    password: string,
  ): Promise<AxiosInstance> {
    if (!this.options.loginPath) {
      throw new GoodwillConfigurationError('Goodwill login path not configured');
    }

    const client = axios.create({
      baseURL: this.options.buyerApiBaseUrl ?? this.options.baseUrl,
      timeout: (this.options.requestTimeoutSeconds ?? 60) * 1000,
      headers: {
        'User-Agent': this.options.loginUserAgent ?? 'ResaleTracker/1.0',
        Accept: 'application/json, text/plain, */*',
      },
      withCredentials: true,
      maxRedirects: 5,
    });

    try {
      const hiddenFields = await this.prefetchLoginPage(client);
      const payload = this.buildLoginPayload(username, password, hiddenFields);

      const response = await client.request({
        url: this.options.loginPath,
        method: this.options.loginMethod ?? 'POST',
        headers: {
          'Content-Type': this.options.loginContentType ?? 'application/json',
          ...this.options.loginHeaders,
        },
        data:
          this.options.loginContentType === 'application/x-www-form-urlencoded'
            ? new URLSearchParams(payload as Record<string, string>).toString()
            : payload,
      });

      if (response.status >= 400) {
        throw new GoodwillAuthError(
          `ShopGoodwill login failed with status ${response.status}`,
        );
      }

      const accessToken =
        response.data?.accessToken ?? response.data?.AccessToken;
      if (!accessToken) {
        throw new GoodwillAuthError(
          'ShopGoodwill login did not return an access token',
        );
      }

      client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      return client;
    } catch (error) {
      this.logger.error(
        'Goodwill login workflow failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new GoodwillAuthError(
        error instanceof Error ? error.message : 'Unknown login error',
      );
    }
  }

  private async prefetchLoginPage(client: AxiosInstance) {
    if (!this.options.loginPagePath) {
      return {};
    }
    try {
      const response = await client.get(this.options.loginPagePath, {
        baseURL: this.options.baseUrl,
        responseType: 'text',
      });
      const $ = load(response.data);
      const hiddenInputs: Record<string, string> = {};
      $('input[type=hidden]').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value');
        if (name) {
          hiddenInputs[name] = value ?? '';
        }
      });
      return hiddenInputs;
    } catch (error) {
      this.logger.debug(
        `Failed to prefetch Goodwill login page: ${(error as Error).message}`,
      );
      return {};
    }
  }

  private buildLoginPayload(
    username: string,
    password: string,
    hiddenFields: Record<string, string>,
  ) {
    const encryptedUsername = this.options.loginEncryptionKey
      ? encryptToUrlSafeBase64(username, this.options.loginEncryptionKey)
      : username;
    const encryptedPassword = this.options.loginEncryptionKey
      ? encryptToUrlSafeBase64(password, this.options.loginEncryptionKey)
      : password;

    const payload: Record<string, unknown> = {
      ...hiddenFields,
      ...this.options.loginAdditionalFields,
      [this.options.usernameField]: encryptedUsername,
      [this.options.passwordField]: encryptedPassword,
      remember: this.options.loginRememberMe ?? false,
    };

    if (this.options.loginAppVersion) {
      payload.appVersion = this.options.loginAppVersion;
    }

    return payload;
  }

  private async downloadCsv(client: AxiosInstance, path: string) {
    const response = await client.get(path, { responseType: 'text' });
    return response.data ?? '';
  }

  private async executeWithRetry<T>(
    action: () => Promise<T>,
    description: string,
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;
    while (attempt < Math.max(1, this.options.maxRetries)) {
      attempt += 1;
      try {
        return await action();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Goodwill ${description} attempt ${attempt} failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        if (attempt >= this.options.maxRetries) {
          break;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, attempt * 1000),
        );
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to fetch ${description}`);
  }
}
