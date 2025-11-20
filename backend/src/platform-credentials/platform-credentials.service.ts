import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/security/encryption.service';
import { CreatePlatformCredentialDto } from './dto/create-platform-credential.dto';
import { UpdatePlatformCredentialDto } from './dto/update-platform-credential.dto';

export interface DecryptedPlatformCredential {
  id: string;
  platform: string;
  accountName: string;
  encryptedSecret: string;
  metadata?: Prisma.JsonValue | null;
  isActive: boolean;
  lastVerifiedAt: Date | null;
  ownerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  secret: string;
}

@Injectable()
export class PlatformCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(dto: CreatePlatformCredentialDto) {
    const credential = await this.prisma.platformCredential.create({
      data: {
        platform: dto.platform,
        accountName: dto.accountName.trim(),
        encryptedSecret: this.encryption.encrypt(dto.secret),
        metadata: (dto.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        owner: dto.ownerId
          ? {
              connect: { id: dto.ownerId },
            }
          : undefined,
        isActive: dto.isActive ?? true,
        lastVerifiedAt: new Date(),
      },
    });
    return this.sanitize(credential);
  }

  async findAll() {
    const credentials = await this.prisma.platformCredential.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return credentials.map((credential) => this.sanitize(credential));
  }

  async findOne(id: string) {
    const credential = await this.prisma.platformCredential.findUnique({
      where: { id },
    });
    if (!credential) {
      throw new NotFoundException('Platform credential not found');
    }
    return this.sanitize(credential);
  }

  async update(id: string, dto: UpdatePlatformCredentialDto) {
    const data: Prisma.PlatformCredentialUpdateInput = {
      platform: dto.platform ?? undefined,
      accountName: dto.accountName?.trim(),
      metadata: dto.metadata
        ? (dto.metadata as Prisma.InputJsonValue)
        : undefined,
      owner: dto.ownerId
        ? {
            connect: { id: dto.ownerId },
          }
        : undefined,
      isActive: dto.isActive,
    };

    if (dto.secret) {
      data.encryptedSecret = this.encryption.encrypt(dto.secret);
      data.lastVerifiedAt = new Date();
    }

    const credential = await this.prisma.platformCredential.update({
      where: { id },
      data,
    });
    return this.sanitize(credential);
  }

  async remove(id: string) {
    await this.prisma.platformCredential.delete({ where: { id } });
    return { id };
  }

  async getDecryptedCredential(id: string) {
    const credential = await this.prisma.platformCredential.findUnique({
      where: { id },
    });
    if (!credential) {
      throw new NotFoundException('Platform credential not found');
    }
    const secret = this.encryption.decrypt(credential.encryptedSecret);
    if (!secret) {
      throw new NotFoundException(
        'Platform credential secret not available. Rotate the credential.',
      );
    }
    return { ...credential, secret };
  }

  private sanitize<T extends { encryptedSecret: string }>(credential: T) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedSecret, ...rest } = credential;
    return rest;
  }
}
