import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/security/encryption.service';
import {
  UpdateSalvationArmyCredentialDto,
  SalvationArmyCredentialResponseDto,
} from './dto/credential.dto';

@Injectable()
export class SalvationArmyCredentialService {
  constructor(private readonly prisma: PrismaService, private readonly encryption: EncryptionService) {}

  async get(): Promise<SalvationArmyCredentialResponseDto> {
    const entity = await this.prisma.salvationArmyCredential.findFirst();
    if (!entity) {
      return { autoSyncEnabled: true, isConfigured: false };
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

  async upsert(dto: UpdateSalvationArmyCredentialDto) {
    const existing = await this.prisma.salvationArmyCredential.findFirst();
    const passwordEncrypted = dto.password ? this.encryption.encrypt(dto.password) : undefined;

    if (!existing) {
      if (!passwordEncrypted) {
        throw new NotFoundException('Password required to configure Salvation Army credentials.');
      }
      await this.prisma.salvationArmyCredential.create({
        data: {
          username: dto.username.trim(),
          passwordEncrypted,
          autoSyncEnabled: dto.autoSyncEnabled,
          lastSyncStatus: 'Created',
          lastSyncMessage: 'Credentials created',
        },
      });
      return;
    }

    await this.prisma.salvationArmyCredential.update({
      where: { id: existing.id },
      data: {
        username: dto.username.trim(),
        autoSyncEnabled: dto.autoSyncEnabled,
        passwordEncrypted: passwordEncrypted ?? existing.passwordEncrypted,
        lastSyncStatus: 'Updated',
        lastSyncMessage: passwordEncrypted ? 'Username/password updated' : 'Username updated',
      },
    });
  }

  async getDecrypted() {
    const entity = await this.prisma.salvationArmyCredential.findFirst();
    if (!entity) {
      throw new NotFoundException('Salvation Army credentials not configured.');
    }
    const password = this.encryption.decrypt(entity.passwordEncrypted);
    if (!password) {
      throw new NotFoundException('Salvation Army password missing.');
    }
    return { username: entity.username, password, autoSyncEnabled: entity.autoSyncEnabled, entity };
  }

  async updateStatus(entityId: string, status: string, message?: string, imported = 0) {
    await this.prisma.salvationArmyCredential.update({
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
