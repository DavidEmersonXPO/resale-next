import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EbayAuthService } from './ebay-auth.service';
import type { EbayCredential } from '@prisma/client';

interface EbayListingPayload {
  sku: string;
  title: string;
  description?: string;
  quantity: number;
  price: number;
  condition: string;
  categoryId?: string;
  imageUrls: string[];
  paymentPolicyId?: string;
  fulfillmentPolicyId?: string;
  returnPolicyId?: string;
}

@Injectable()
export class EbayListingService {
  private readonly logger = new Logger(EbayListingService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly ebayAuthService: EbayAuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get config() {
    return this.configService.get('ebay');
  }

  async createListing(
    payload: EbayListingPayload,
    context?: { jobId?: string },
  ) {
    const sku = payload.sku;
    const credential = await this.ebayAuthService.getActiveCredentialAsync();
    await this.createInventoryItem(sku, payload, context);
    const offerId = await this.createOffer(
      sku,
      payload,
      credential ?? undefined,
      context,
    );
    const listingId = await this.publishOffer(offerId, context);

    const url = `https://www.ebay.com/itm/${listingId}`;
    return {
      sku,
      offerId,
      listingId,
      listingUrl: url,
    };
  }

  private get baseUrl() {
    const env =
      this.config.environment === 'Production'
        ? this.config.production
        : this.config.sandbox;
    return env.apiBaseUrl;
  }

  private get marketplaceId() {
    return this.config.marketplaceId ?? 'EBAY_US';
  }

  private async createInventoryItem(
    sku: string,
    payload: EbayListingPayload,
    context?: { jobId?: string },
  ) {
    const url = `${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`;
    const body = {
      sku,
      condition: payload.condition,
      availability: {
        shipToLocationAvailability: {
          quantity: payload.quantity,
        },
      },
      product: {
        title: payload.title,
        description: payload.description ?? '',
        imageUrls: payload.imageUrls,
        aspects: {},
      },
    };
    await this.callApi(
      url,
      'PUT',
      body,
      payload.quantity,
      'CreateInventoryItem',
      context,
    );
  }

  private buildListingPolicies(
    payload: EbayListingPayload,
    credential?: EbayCredential | null,
  ) {
    return {
      paymentPolicyId:
        payload.paymentPolicyId ??
        credential?.defaultPaymentPolicyId ??
        (this.config.paymentPolicyId as string | undefined),
      fulfillmentPolicyId:
        payload.fulfillmentPolicyId ??
        credential?.defaultFulfillmentPolicyId ??
        (this.config.fulfillmentPolicyId as string | undefined),
      returnPolicyId:
        payload.returnPolicyId ??
        credential?.defaultReturnPolicyId ??
        (this.config.returnPolicyId as string | undefined),
    };
  }

  private async createOffer(
    sku: string,
    payload: EbayListingPayload,
    credential?: EbayCredential,
    context?: { jobId?: string },
  ) {
    const url = `${this.baseUrl}/sell/inventory/v1/offer`;
    const data = {
      sku,
      marketplaceId: this.marketplaceId,
      format: 'FIXED_PRICE',
      availableQuantity: payload.quantity,
      listingDescription: payload.description ?? payload.title,
      categoryId:
        payload.categoryId ?? credential?.defaultCategoryId ?? undefined,
      listingPolicies: this.buildListingPolicies(payload, credential),
      pricingSummary: {
        price: {
          currency: 'USD',
          value: payload.price.toFixed(2),
        },
      },
      merchantLocationKey: 'DEFAULT',
    };
    const response = (await this.callApi(
      url,
      'POST',
      data,
      payload.price,
      'CreateOffer',
      context,
    )) as {
      offerId?: string;
    };
    const offerId = response.offerId;
    if (!offerId) {
      throw new Error('eBay offer creation failed');
    }
    return offerId;
  }

  private async publishOffer(
    offerId: string,
    context?: { jobId?: string },
  ) {
    const url = `${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`;
    const response = (await this.callApi(
      url,
      'POST',
      {},
      0,
      'PublishOffer',
      context,
    )) as {
      listingId?: string;
    };
    const listingId = response.listingId;
    if (!listingId) {
      throw new Error('eBay listing publish failed');
    }
    return listingId;
  }

  private async callApi(
    url: string,
    method: 'POST' | 'PUT',
    data: any,
    value: number,
    action: string,
    context?: { jobId?: string },
  ) {
    const accessToken = await this.ebayAuthService.getValidAccessTokenAsync();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Language': 'en-US',
    };

    const startTime = Date.now();
    try {
      const axiosResponse = await firstValueFrom(
        this.httpService.request<AxiosResponse<any>>({
          method,
          url,
          data,
          headers,
        }),
      );
      const responseData = axiosResponse.data;
      const statusCode = axiosResponse.status;
      await this.logSync({
        entityType: 'Ebay',
        action,
        status: statusCode >= 200 && statusCode < 300 ? 'Success' : 'Failed',
        requestUrl: url,
        requestMethod: method,
        requestData: JSON.stringify(data),
        responseCode: statusCode,
        responseData: JSON.stringify(responseData),
        durationMs: Date.now() - startTime,
        jobId: context?.jobId,
      });
      return responseData;
    } catch (error: any) {
      await this.logSync({
        entityType: 'Ebay',
        action,
        status: 'Failed',
        requestUrl: url,
        requestMethod: method,
        requestData: JSON.stringify(data),
        responseCode: error?.response?.status,
        responseData: error?.response
          ? JSON.stringify(error.response.data)
          : undefined,
        errorMessage: error?.message,
        durationMs: Date.now() - startTime,
        jobId: context?.jobId,
      });
      this.logger.error(`eBay ${action} failed`, error);
      throw error;
    }
  }

  private async logSync(payload: {
    entityType: string;
    action: string;
    status: string;
    requestUrl?: string;
    requestMethod?: string;
    requestData?: string;
    responseCode?: number;
    responseData?: string;
    errorMessage?: string;
    durationMs?: number;
    jobId?: string | null;
  }) {
    await this.prisma.ebaySyncLog.create({
      data: {
        entityType: payload.entityType,
        action: payload.action,
        status: payload.status,
        requestUrl: payload.requestUrl,
        requestMethod: payload.requestMethod,
        requestData: payload.requestData,
        responseCode: payload.responseCode,
        responseData: payload.responseData,
        errorMessage: payload.errorMessage,
        durationMs: payload.durationMs,
        jobId: payload.jobId ?? null,
      },
    });
  }
}
