import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosRequestConfig } from 'axios';
import { Prisma, EbayPolicyType } from '@prisma/client';
import type { EbayCredential } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EbayAuthService } from './ebay-auth.service';
import { MetricsService } from '../metrics/metrics.service';

type PolicyDescriptor = {
  collectionKey: string;
  idKey: string;
  defaultKey: string;
  path: string;
};

const POLICY_DESCRIPTORS: Record<EbayPolicyType, PolicyDescriptor> = {
  [EbayPolicyType.PAYMENT]: {
    collectionKey: 'paymentPolicies',
    idKey: 'paymentPolicyId',
    defaultKey: 'defaultPaymentPolicy',
    path: 'payment_policy',
  },
  [EbayPolicyType.FULFILLMENT]: {
    collectionKey: 'fulfillmentPolicies',
    idKey: 'fulfillmentPolicyId',
    defaultKey: 'defaultFulfillmentPolicy',
    path: 'fulfillment_policy',
  },
  [EbayPolicyType.RETURN]: {
    collectionKey: 'returnPolicies',
    idKey: 'returnPolicyId',
    defaultKey: 'defaultReturnPolicy',
    path: 'return_policy',
  },
};

interface UpdateDefaultsOptions {
  categoryId?: string | null;
  paymentPolicyId?: string | null;
  fulfillmentPolicyId?: string | null;
  returnPolicyId?: string | null;
}

@Injectable()
export class EbayPoliciesService {
  private readonly logger = new Logger(EbayPoliciesService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ebayAuthService: EbayAuthService,
    private readonly metrics: MetricsService,
  ) {}

  async listPolicies() {
    const marketplaceId = this.marketplaceId;
    const policies = await this.prisma.ebaySellerPolicy.findMany({
      where: { marketplaceId },
      orderBy: { name: 'asc' },
    });

    const defaults = await this.resolveDefaults();

    return {
      marketplaceId,
      paymentPolicies: policies.filter(
        (policy) => policy.type === EbayPolicyType.PAYMENT,
      ),
      fulfillmentPolicies: policies.filter(
        (policy) => policy.type === EbayPolicyType.FULFILLMENT,
      ),
      returnPolicies: policies.filter(
        (policy) => policy.type === EbayPolicyType.RETURN,
      ),
      lastSyncedAt: this.resolveLastSyncedAt(policies),
      defaults,
    };
  }

  async refreshPolicies() {
    const marketplaceId = this.marketplaceId;
    try {
      const accessToken =
        await this.ebayAuthService.getValidAccessTokenAsync();

      const [paymentPolicies, fulfillmentPolicies, returnPolicies] =
        await Promise.all([
          this.fetchPolicyCollection(
            EbayPolicyType.PAYMENT,
            accessToken,
            marketplaceId,
          ),
          this.fetchPolicyCollection(
            EbayPolicyType.FULFILLMENT,
            accessToken,
            marketplaceId,
          ),
          this.fetchPolicyCollection(
            EbayPolicyType.RETURN,
            accessToken,
            marketplaceId,
          ),
        ]);

      const defaults = await this.resolveDefaults();
      await this.logRefreshResult(
        'success',
        `${marketplaceId}: payment=${paymentPolicies.length}, fulfillment=${fulfillmentPolicies.length}, return=${returnPolicies.length}`,
      );

      this.metrics.recordPolicyRefresh('success');

      return {
        marketplaceId,
        paymentPolicies,
        fulfillmentPolicies,
        returnPolicies,
        lastSyncedAt: this.resolveLastSyncedAt([
          ...paymentPolicies,
          ...fulfillmentPolicies,
          ...returnPolicies,
        ]),
        defaults,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      await this.logRefreshResult('failure', `${marketplaceId}: ${message}`);
      this.metrics.recordPolicyRefresh('failure');
      throw error;
    }
  }

  async updateDefaults(options: UpdateDefaultsOptions) {
    const credential = await this.ebayAuthService.getActiveCredentialAsync();
    if (!credential) {
      throw new Error(
        'No active eBay credential configured. Connect an account before saving defaults.',
      );
    }

    const updates: Prisma.EbayCredentialUpdateInput = {};

    if (options.categoryId !== undefined) {
      updates.defaultCategoryId = options.categoryId?.trim()
        ? options.categoryId.trim()
        : null;
    }

    if (options.paymentPolicyId !== undefined) {
      const policyId = this.normalizeId(options.paymentPolicyId);
      if (policyId) {
        await this.ensurePolicyExists(EbayPolicyType.PAYMENT, policyId);
      }
      updates.defaultPaymentPolicyId = policyId ?? null;
    }

    if (options.fulfillmentPolicyId !== undefined) {
      const policyId = this.normalizeId(options.fulfillmentPolicyId);
      if (policyId) {
        await this.ensurePolicyExists(EbayPolicyType.FULFILLMENT, policyId);
      }
      updates.defaultFulfillmentPolicyId = policyId ?? null;
    }

    if (options.returnPolicyId !== undefined) {
      const policyId = this.normalizeId(options.returnPolicyId);
      if (policyId) {
        await this.ensurePolicyExists(EbayPolicyType.RETURN, policyId);
      }
      updates.defaultReturnPolicyId = policyId ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return {
        credential,
        defaults: await this.resolveDefaults(credential),
      };
    }

    const updatedCredential = await this.prisma.ebayCredential.update({
      where: { id: credential.id },
      data: updates,
    });

    return {
      credential: updatedCredential,
      defaults: await this.resolveDefaults(updatedCredential),
    };
  }

  private resolveLastSyncedAt(policies: Array<{ fetchedAt: Date }>) {
    if (!policies.length) {
      return null;
    }
    return policies.reduce(
      (latest, policy) =>
        policy.fetchedAt > latest ? policy.fetchedAt : latest,
      policies[0].fetchedAt,
    );
  }

  private get marketplaceId(): string {
    const config = this.configService.get('ebay');
    return config?.marketplaceId ?? 'EBAY_US';
  }

  private get apiBaseUrl(): string {
    const config = this.configService.get('ebay');
    const env =
      config?.environment === 'Production'
        ? config?.production
        : config?.sandbox;
    return env?.apiBaseUrl ?? 'https://api.sandbox.ebay.com';
  }

  private normalizeId(value: string | null | undefined) {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private async ensurePolicyExists(type: EbayPolicyType, policyId: string) {
    const marketplaceId = this.marketplaceId;
    const existing = await this.prisma.ebaySellerPolicy.findUnique({
      where: { type_marketplaceId_policyId: { type, marketplaceId, policyId } },
    });
    if (existing) {
      return existing;
    }

    const accessToken = await this.ebayAuthService.getValidAccessTokenAsync();
    const descriptor = POLICY_DESCRIPTORS[type];
    const url = `${this.apiBaseUrl}/sell/account/v1/${descriptor.path}/${policyId}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      await this.upsertPolicyRecord(type, data, marketplaceId);
      return data;
    } catch (error: any) {
      this.logger.error(
        `Failed to validate eBay ${type.toLowerCase()} policy ${policyId}`,
        error,
      );
      throw new Error(
        `Policy ${policyId} is not valid for marketplace ${marketplaceId}`,
      );
    }
  }

  private async fetchPolicyCollection(
    type: EbayPolicyType,
    accessToken: string,
    marketplaceId: string,
  ) {
    const descriptor = POLICY_DESCRIPTORS[type];
    const url = `${this.apiBaseUrl}/sell/account/v1/${descriptor.path}?marketplace_id=${marketplaceId}`;

    const requestConfig: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, requestConfig),
      );
      const collection = response.data?.[descriptor.collectionKey] ?? [];
      const policyIds: string[] = [];

      const records = await this.prisma.$transaction(async (tx) => {
        const items = await Promise.all(
          collection.map(async (policy: Record<string, any>) => {
            const record = await this.upsertPolicyRecord(
              type,
              policy,
              marketplaceId,
              tx,
            );
            policyIds.push(record.policyId);
            return record;
          }),
        );

        await tx.ebaySellerPolicy.deleteMany({
          where: {
            marketplaceId,
            type,
            policyId: { notIn: policyIds.length ? policyIds : ['__none__'] },
          },
        });

        return items;
      });

      return records;
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh eBay ${type.toLowerCase()} policies`,
        error,
      );
      throw new Error(
        `Unable to refresh ${type.toLowerCase()} policies. Check credentials and try again.`,
      );
    }
  }

  private async upsertPolicyRecord(
    type: EbayPolicyType,
    policy: Record<string, any>,
    marketplaceId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const descriptor = POLICY_DESCRIPTORS[type];
    const policyId = String(policy[descriptor.idKey]);
    const isDefaultRaw = policy[descriptor.defaultKey];
    const isDefault =
      typeof isDefaultRaw === 'boolean' ? isDefaultRaw : undefined;
    const name = String(policy.name ?? policy.title ?? policyId);

    return tx.ebaySellerPolicy.upsert({
      where: { type_marketplaceId_policyId: { type, marketplaceId, policyId } },
      update: {
        name,
        isDefault,
        policyData: policy,
        fetchedAt: new Date(),
      },
      create: {
        policyId,
        name,
        marketplaceId,
        type,
        isDefault,
        policyData: policy,
      },
    });
  }

  private async resolveDefaults(
    credential?: Pick<
      EbayCredential,
      | 'defaultCategoryId'
      | 'defaultPaymentPolicyId'
      | 'defaultFulfillmentPolicyId'
      | 'defaultReturnPolicyId'
    >,
  ) {
    const activeCredential =
      credential ?? (await this.ebayAuthService.getActiveCredentialAsync());
    return {
      categoryId: activeCredential?.defaultCategoryId ?? null,
      paymentPolicyId: activeCredential?.defaultPaymentPolicyId ?? null,
      fulfillmentPolicyId: activeCredential?.defaultFulfillmentPolicyId ?? null,
      returnPolicyId: activeCredential?.defaultReturnPolicyId ?? null,
    };
  }

  async logRefreshResult(result: 'success' | 'failure', message?: string) {
    await this.prisma.ebayPolicyRefreshLog.create({
      data: {
        result,
        message,
      },
    });
  }

  async listRefreshLogs(limit = 20) {
    return this.prisma.ebayPolicyRefreshLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
