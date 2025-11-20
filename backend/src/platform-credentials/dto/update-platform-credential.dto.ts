import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformCredentialDto } from './create-platform-credential.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePlatformCredentialDto extends PartialType(
  CreatePlatformCredentialDto,
) {
  @ApiPropertyOptional({ description: 'Rotate credential secret' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
