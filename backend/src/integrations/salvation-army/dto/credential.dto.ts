import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSalvationArmyCredentialDto {
  @ApiProperty()
  @IsString()
  username!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  autoSyncEnabled = true;
}

export class SalvationArmyCredentialResponseDto {
  username?: string;
  autoSyncEnabled: boolean;
  lastSyncedAt?: Date | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
  isConfigured: boolean;
}
