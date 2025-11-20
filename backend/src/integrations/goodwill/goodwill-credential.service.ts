import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/security/encryption.service';
import {
  UpdateGoodwillCredentialDto,
  GoodwillCredentialResponseDto,
} from './dto/goodwill-credential.dto';

@Injectable()
export class GoodwillCredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async getCredential(): Promise<GoodwillCredentialResponseDto> {
    const entity = await this.prisma.goodwillCredential.findFirst();
    if (!entity) {
      return {
        autoSyncEnabled: true,
        isConfigured: false,
      };
    }

    return {
      username: entity.username,
      autoSyncEnabled: entity.autoSyncEnabled,
      lastSyncedAt: entity.lastSyncedAt,
      lastSyncStatus: entity.lastSyncStatus,
      lastSyncMessage: entity.lastSyncMessage,
      isConfigured: true,
    };
  }

  async upsertCredential(dto: UpdateGoodwillCredentialDto) {
    const existing = await this.prisma.goodwillCredential.findFirst();
    const passwordEncrypted = dto.password
      ? this.encryption.encrypt(dto.password)
      : undefined;

    if (!existing) {
      if (!passwordEncrypted) {
        throw new NotFoundException(
          'Password required for initial Goodwill credential setup.',
        );
      }
      await this.prisma.goodwillCredential.create({
        data: {
          username: dto.username.trim(),
          passwordEncrypted,
          autoSyncEnabled: dto.autoSyncEnabled,
          lastSyncStatus: 'Created',
          lastSyncMessage: 'Credential created',
        },
      });
      return;
    }

    await this.prisma.goodwillCredential.update({
      where: { id: existing.id },
      data: {
        username: dto.username.trim(),
        autoSyncEnabled: dto.autoSyncEnabled,
        passwordEncrypted: passwordEncrypted ?? existing.passwordEncrypted,
        lastSyncStatus: 'Updated',
        lastSyncMessage: passwordEncrypted
          ? 'Username/password updated'
          : 'Username updated',
      },
    });
  }

  async getDecryptedCredential() {
    const entity = await this.prisma.goodwillCredential.findFirst();
    if (!entity) {
      throw new NotFoundException('Goodwill credentials not configured.');
    }
    const password = this.encryption.decrypt(entity.passwordEncrypted);
    if (!password) {
      throw new NotFoundException('Goodwill password missing.');
    }
    return {
      username: entity.username,
      password,
      autoSyncEnabled: entity.autoSyncEnabled,
      entity,
    };
  }

  async updateSyncStatus(
    entityId: string,
    status: string,
    message?: string,
    imported = 0,
  ) {
    await this.prisma.goodwillCredential.update({
      where: { id: entityId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncAttemptAt: new Date(),
        lastSyncStatus: status,
        lastSyncMessage: message,
        lastImportedCount: imported,
      },
    });
  }
}
