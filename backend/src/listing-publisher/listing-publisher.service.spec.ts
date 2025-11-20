import { Test } from '@nestjs/testing';
import { ListingPublisherService } from './listing-publisher.service';
import { LISTING_ADAPTERS } from './listing-publisher.tokens';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlatformCredentialsService } from '../platform-credentials/platform-credentials.service';
import { ListingPlatform } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

const mockListing = {
  id: 'listing-1',
  platform: ListingPlatform.EBAY,
  platformCredentialId: 'cred-1',
  media: [{ id: 'm1', url: 'https://example.com/photo.jpg' }],
  purchaseItem: null,
};

describe('ListingPublisherService', () => {
  const prisma = {
    listing: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;
  const platformCredentials = {
    getDecryptedCredential: jest.fn(),
  } as unknown as PlatformCredentialsService;

  const adapter = {
    supports: jest.fn(() => true),
    validate: jest.fn(() => ({ success: true })),
    publish: jest.fn(() =>
      Promise.resolve({
        platform: ListingPlatform.EBAY,
        success: true,
        status: 'draft',
      }),
    ),
    updateStatus: jest.fn(() => Promise.resolve()),
  };

  let service: ListingPublisherService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.listing.findUnique = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ListingPublisherService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlatformCredentialsService, useValue: platformCredentials },
        { provide: LISTING_ADAPTERS, useValue: [adapter] },
      ],
    }).compile();

    service = moduleRef.get(ListingPublisherService);
  });

  it('throws if listing not found', async () => {
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.publishListing('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('publishes listing via adapter', async () => {
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
    (platformCredentials.getDecryptedCredential as jest.Mock).mockResolvedValue(
      {
        id: 'cred-1',
        secret: 'token',
      },
    );

    const result = await service.publishListing(mockListing.id);

    expect(result.results).toHaveLength(1);
    expect(adapter.publish).toHaveBeenCalledTimes(1);
    expect(adapter.updateStatus).toHaveBeenCalledTimes(1);
  });

  it('returns validation failure when adapter rejects data', async () => {
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
    (adapter.validate as jest.Mock).mockReturnValue({
      success: false,
      message: 'Missing data',
    });

    const result = await service.publishListing(mockListing.id);

    expect(result.results[0].success).toBe(false);
    expect(result.results[0].status).toBe('validation_failed');
    expect(adapter.publish).not.toHaveBeenCalled();
  });
});
