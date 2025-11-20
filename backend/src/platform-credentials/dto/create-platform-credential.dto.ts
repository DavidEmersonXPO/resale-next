import { ApiProperty } from '@nestjs/swagger';
import { ListingPlatform } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlatformCredentialDto {
  @ApiProperty({ enum: ListingPlatform })
  @IsEnum(ListingPlatform)
  platform!: ListingPlatform;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  accountName!: string;

  @ApiProperty({ description: 'API token, password, or auth payload' })
  @IsString()
  @MinLength(4)
  secret!: string;

  @ApiProperty({
    required: false,
    description: 'Additional metadata such as default shipping profiles',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
